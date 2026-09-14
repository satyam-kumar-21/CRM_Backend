import { AiStructuredReply } from '../types/ai';

const getAiHeaders = () => {
  const apiKey = (process.env.AI_API_KEY || '').trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
    headers['X-API-Key'] = apiKey;
  }

  return headers;
};

export interface RetrievalResult {
  content: string;
  source: string;
  score: number;
}

export class AiService {
  private static async fetchWithTimeout(input: string, init: RequestInit, timeoutMs?: number): Promise<Response> {
    const controller = new AbortController();
    const timeout = timeoutMs ?? Number(process.env.AI_REQUEST_TIMEOUT_MS || 5000);
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  static async askLocalModel(systemPrompt: string, userMessage: string, context: string[], options?: { temperature?: number; model?: string; endpoint?: string; }) {
    const endpoint = (options?.endpoint || process.env.LOCAL_LLM_ENDPOINT || 'http://localhost:11434/api/generate').trim();
    const model = options?.model || process.env.LOCAL_LLM_MODEL || 'llama3.1';
    const temperature = options?.temperature ?? Number(process.env.AI_TEMPERATURE || 0.3);

    const prompt = [
      systemPrompt,
      context.length ? `Context:\n${context.join('\n\n')}` : '',
      `User: ${userMessage}`,
    ].filter(Boolean).join('\n\n');

    const response = await this.fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: getAiHeaders(),
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Local model request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data?.response) {
      return data.response;
    }

    if (typeof data === 'string') {
      return data;
    }

    throw new Error('Invalid local model response');
  }

  static async generateEmbedding(text: string, options?: { model?: string; endpoint?: string }) {
    const endpoint = (options?.endpoint || process.env.LOCAL_EMBEDDINGS_ENDPOINT || 'http://localhost:11434/api/embeddings').trim();
    const model = options?.model || process.env.LOCAL_EMBEDDINGS_MODEL || process.env.LOCAL_LLM_MODEL || 'llama3.1';

    const response = await this.fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: getAiHeaders(),
      body: JSON.stringify({
        model,
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Local embedding request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data?.embedding)) {
      return data.embedding;
    }

    if (Array.isArray(data?.embeddings?.[0])) {
      return data.embeddings[0];
    }

    throw new Error('Invalid embedding response');
  }

  static async generateStructuredReply(payload: {
    systemPrompt: string;
    conversationContext: string[];
    userMessage: string;
    customerProfile: Record<string, any>;
    model?: string;
    endpoint?: string;
    temperature?: number;
  }): Promise<AiStructuredReply> {
    try {
      const content = await this.askLocalModel(payload.systemPrompt, payload.userMessage, payload.conversationContext, {
        model: payload.model,
        endpoint: payload.endpoint,
        temperature: payload.temperature,
      });

      const parsed = this.tryParseJson(content);
      if (parsed) {
        return {
          reply: parsed.reply || 'I am ready to help.',
          customer: parsed.customer || payload.customerProfile || {},
          lead_ready: Boolean(parsed.lead_ready),
          handoff_required: Boolean(parsed.handoff_required),
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
          knowledge_used: parsed.knowledge_used || [],
          error: parsed.error || '',
        };
      }

      return {
        reply: content,
        customer: payload.customerProfile || {},
        lead_ready: false,
        handoff_required: false,
      };
    } catch (error: any) {
      return {
        reply: 'I am temporarily unavailable. Please try again in a moment.',
        customer: payload.customerProfile || {},
        lead_ready: false,
        handoff_required: false,
        error: error.message || 'AI generation failed',
      };
    }
  }

  private static tryParseJson(text: string): any {
    try {
      const matched = text.match(/\{[\s\S]*\}/);
      if (!matched) return null;
      return JSON.parse(matched[0]);
    } catch {
      return null;
    }
  }
}
