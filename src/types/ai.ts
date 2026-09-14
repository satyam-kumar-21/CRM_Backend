export type AiConversationStatus = 'AI_ACTIVE' | 'AI_TO_HUMAN' | 'HUMAN' | 'CLOSED';

export interface AiCustomerProfile {
  name?: string;
  country?: string;
  mobile?: string;
  email?: string;
  system?: string;
  model?: string;
  issue?: string;
  campaign?: string;
  jivoChatId?: string;
  customerId?: string;
  source?: string;
  [key: string]: any;
}

export interface AiConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface AiKnowledgeChunkDocument {
  _id?: string;
  companyId: string;
  knowledgeBaseId: string;
  fileName: string;
  sourceType: 'uploaded';
  chunkIndex: number;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface AiStructuredReply {
  reply: string;
  customer: Partial<AiCustomerProfile>;
  lead_ready: boolean;
  handoff_required: boolean;
  confidence?: number;
  knowledge_used?: string[];
  error?: string;
}

export interface AiSettingsInput {
  activeModel?: string;
  modelEndpoint?: string;
  temperature?: number;
  maxContext?: number;
  retrievalCount?: number;
  similarityThreshold?: number;
  conversationHistoryLength?: number;
  defaultSystemPrompt?: string;
  humanHandoffRules?: Record<string, any>;
  leadCompletionRules?: Record<string, any>;
  campaignOverrides?: Record<string, any>;
}
