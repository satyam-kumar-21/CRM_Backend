"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAutomationService = void 0;
const mongoose_1 = require("mongoose");
const AiConnection_1 = require("../models/AiConnection");
const AiConversation_1 = require("../models/AiConversation");
const AiKnowledgeBase_1 = require("../models/AiKnowledgeBase");
const AiKnowledgeChunk_1 = require("../models/AiKnowledgeChunk");
const AiSettings_1 = require("../models/AiSettings");
const Employee_1 = require("../models/Employee");
const Group_1 = require("../models/Group");
const Lead_1 = require("../models/Lead");
const Notification_1 = require("../models/Notification");
const Sale_1 = require("../models/Sale");
const companySalesService_1 = require("./companySalesService");
const aiService_1 = require("./aiService");
const fileParser_1 = require("../utils/fileParser");
const crypto_1 = require("../utils/crypto");
const node_crypto_1 = __importDefault(require("node:crypto"));
const DEFAULT_SYSTEM_PROMPT = `You are a customer support and sales assistant for this campaign. Answer using only the provided knowledge base. If the answer is missing, do not invent details. Ask a clarifying question when needed and request human handoff for unsupported or escalated cases.`;
const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const getCompanyId = (companyId) => (companyId instanceof mongoose_1.Types.ObjectId ? companyId.toString() : companyId);
const pick = (obj, keys) => {
    const result = {};
    for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '')
            result[key] = obj[key];
    }
    return result;
};
const buildChunks = (text, chunkSize = 900) => {
    const normalized = (0, fileParser_1.normalizeText)(text);
    if (!normalized)
        return [];
    const paragraphs = normalized.split(/\n{2,}|\n/).map((item) => item.trim()).filter(Boolean);
    const chunks = [];
    let current = '';
    for (const paragraph of paragraphs) {
        if ((current + '\n' + paragraph).length <= chunkSize) {
            current = current ? `${current}\n${paragraph}` : paragraph;
            continue;
        }
        if (current)
            chunks.push(current);
        current = paragraph;
    }
    if (current)
        chunks.push(current);
    return chunks.filter(Boolean).map((chunk, index) => ({ chunk, index }));
};
const cosineSimilarity = (a, b) => {
    if (!a.length || !b.length || a.length !== b.length)
        return 0;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i += 1) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    const denominator = Math.sqrt(na) * Math.sqrt(nb);
    if (!denominator)
        return 0;
    return dot / denominator;
};
const makeLeadPayload = (customerProfile, companyId, conversationId) => ({
    name: normalizeString(customerProfile.name) || 'Unknown Customer',
    country: normalizeString(customerProfile.country) || 'Unknown',
    system: normalizeString(customerProfile.system) || normalizeString(customerProfile.model) || 'Unknown System',
    contactNo: normalizeString(customerProfile.mobile) || normalizeString(customerProfile.phone) || '',
    customerEmail: normalizeString(customerProfile.email) || '',
    alternateContactNo: normalizeString(customerProfile.mobile) || '',
    customerAddress: normalizeString(customerProfile.address) || '',
    issues: normalizeString(customerProfile.issue) || normalizeString(customerProfile.problem) || '',
    otherDetails: JSON.stringify({
        source: customerProfile.source || 'JivoChat',
        jivoChatId: customerProfile.jivoChatId,
        customerId: customerProfile.customerId,
        conversationId,
        campaign: customerProfile.campaign,
    }),
    connected: 'no',
    connectedBy: 'AI Automation',
    workflowMessageId: conversationId ? `jivo:${conversationId}` : undefined,
});
const toDateKey = (value) => {
    if (!value)
        return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return '';
    return date.toISOString().slice(0, 10);
};
const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value);
const buildDashboardContext = (companyId, question, leads, sales, employees) => {
    const totalLeads = leads.length;
    const connectedLeads = leads.filter((lead) => lead.connected === 'yes').length;
    const pendingLeads = leads.filter((lead) => lead.connected === 'no').length;
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.finalAmount ?? sale.amount ?? 0), 0);
    const successfulSales = sales.filter((sale) => !sale.failed).length;
    const failedSales = sales.filter((sale) => sale.failed).length;
    const salesByDate = new Map();
    const leadCountsByDate = new Map();
    for (const sale of sales) {
        const key = toDateKey(sale.saleDate || sale.businessDate || sale.createdAt);
        if (!key)
            continue;
        const existing = salesByDate.get(key) || { count: 0, revenue: 0 };
        existing.count += 1;
        existing.revenue += Number(sale.finalAmount ?? sale.amount ?? 0);
        salesByDate.set(key, existing);
    }
    for (const lead of leads) {
        const key = toDateKey(lead.createdAt);
        if (!key)
            continue;
        leadCountsByDate.set(key, (leadCountsByDate.get(key) || 0) + 1);
    }
    const topLeadDates = Array.from(leadCountsByDate.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 14)
        .map(([date, count]) => `${date}: ${count} leads`);
    const topSalesDates = Array.from(salesByDate.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 14)
        .map(([date, stats]) => `${date}: ${stats.count} sales, revenue $${formatNumber(stats.revenue)}`);
    const recentLeads = leads
        .slice(0, 12)
        .map((lead) => `${toDateKey(lead.createdAt) || 'unknown-date'} | ${lead.name} | country=${lead.country || 'N/A'} | system=${lead.system || 'N/A'} | connected=${lead.connected || 'no'} | sale=${lead.isSale || 'no'}`)
        .join('\n');
    const recentSales = sales
        .slice(0, 12)
        .map((sale) => `${toDateKey(sale.saleDate || sale.businessDate || sale.createdAt) || 'unknown-date'} | ${sale.name} | amount=$${formatNumber(Number(sale.finalAmount ?? sale.amount ?? 0))} | by=${sale.connectedBy || 'N/A'} | status=${sale.failed ? 'failed' : sale.saleStatus || 'active'}`)
        .join('\n');
    return [
        `You are analyzing company CRM data for companyId=${companyId}.`,
        `Current CRM database summary (all records available in this workspace):`,
        `- Total leads: ${totalLeads}`,
        `- Connected leads: ${connectedLeads}`,
        `- Pending leads: ${pendingLeads}`,
        `- Total sales records: ${totalSales}`,
        `- Successful sales: ${successfulSales}`,
        `- Failed sales: ${failedSales}`,
        `- Total revenue: $${formatNumber(totalRevenue)}`,
        `- Employee records: ${employees.length}`,
        `- User question: ${question}`,
        '',
        'Leads by date (latest 14 dates):',
        topLeadDates.length ? topLeadDates.join('\n') : 'No lead dates available',
        '',
        'Sales by date (latest 14 dates):',
        topSalesDates.length ? topSalesDates.join('\n') : 'No sales dates available',
        '',
        'Recent leads (latest 12):',
        recentLeads || 'No leads available',
        '',
        'Recent sales (latest 12):',
        recentSales || 'No sales available',
    ].join('\n');
};
const buildQuickAnswer = (question, leads, sales, employees) => {
    const normalizedQuestion = question.toLowerCase();
    const includesAny = (...patterns) => patterns.some((pattern) => normalizedQuestion.includes(pattern));
    const todayKey = toDateKey(new Date());
    const currentDate = new Date();
    const totalLeadsToday = leads.filter((lead) => toDateKey(lead.createdAt) === todayKey).length;
    const pendingLeads = leads.filter((lead) => !lead.connected || lead.connected === 'no' || lead.connected === 'pending').length;
    const connectedLeads = leads.filter((lead) => lead.connected === 'yes').length;
    const failedSales = sales.filter((sale) => Boolean(sale.failed)).length;
    const successfulSales = sales.filter((sale) => !sale.failed).length;
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.finalAmount ?? sale.amount ?? 0), 0);
    if (includesAny('how many employees', 'total employees', 'employee records', 'employees are in the company')) {
        return `There are ${employees.length} employees in the company.`;
    }
    if (includesAny('total leads generated today', 'leads generated today', 'how many leads generated today')) {
        return `${totalLeadsToday}`;
    }
    if (includesAny('total leads', 'how many leads')) {
        return `Total leads: ${leads.length}`;
    }
    if (includesAny('pending leads and failed sales', 'pending leads', 'failed sales')) {
        return `Pending leads: ${pendingLeads} • Failed sales: ${failedSales}`;
    }
    if (includesAny('total sales amount this month', 'sales revenue this month', 'revenue this month')) {
        const monthSales = sales.filter((sale) => {
            const saleDate = new Date(sale.saleDate || sale.businessDate || sale.createdAt);
            return !Number.isNaN(saleDate.getTime()) && saleDate.getMonth() === currentDate.getMonth() && saleDate.getFullYear() === currentDate.getFullYear();
        });
        const monthRevenue = monthSales.reduce((sum, sale) => sum + Number(sale.finalAmount ?? sale.amount ?? 0), 0);
        return `$${formatNumber(monthRevenue)}`;
    }
    if (includesAny('total sales amount', 'sales revenue', 'total revenue')) {
        return `$${formatNumber(totalRevenue)}`;
    }
    if (includesAny('successful sales', 'failed sales', 'sales count')) {
        return `Successful sales: ${successfulSales} • Failed sales: ${failedSales}`;
    }
    if (includesAny('connected leads')) {
        return `Connected leads: ${connectedLeads}`;
    }
    return null;
};
const buildEntityMatchAnswer = (question, leads, sales, employees) => {
    const normalizedQuestion = question.toLowerCase();
    const lookupTargets = [
        ...employees.map((employee) => ({ name: employee.name, type: 'employee', detail: employee.role || 'employee', source: employee })),
        ...leads.map((lead) => ({ name: lead.name, type: 'lead', detail: lead.connected === 'yes' ? 'connected lead' : 'pending lead', source: lead })),
        ...sales.map((sale) => ({ name: sale.name, type: 'sale', detail: sale.failed ? 'failed sale' : 'sale', source: sale })),
    ].filter((item) => item.name);
    const askedName = lookupTargets
        .map((item) => item.name)
        .find((name) => normalizedQuestion.includes(name.toLowerCase()));
    if (!askedName) {
        return null;
    }
    const matched = lookupTargets.find((item) => item.name.toLowerCase() === askedName.toLowerCase());
    if (!matched) {
        return null;
    }
    if (normalizedQuestion.includes('do you know')) {
        return `Yes — I found ${matched.name} in your CRM as a ${matched.type}.`;
    }
    if (normalizedQuestion.includes('who is')) {
        return `${matched.name} is in your CRM as a ${matched.type}${matched.detail ? ` (${matched.detail})` : ''}.`;
    }
    return null;
};
class AiAutomationService {
    static async getSettings(companyId) {
        const existing = await AiSettings_1.AiSettings.findOne({ companyId });
        if (existing)
            return existing.toObject();
        const created = await AiSettings_1.AiSettings.create({
            companyId,
            activeModel: process.env.LOCAL_LLM_MODEL || 'llama3.1',
            modelEndpoint: process.env.LOCAL_LLM_ENDPOINT || 'http://localhost:11434/api/generate',
            temperature: Number(process.env.AI_TEMPERATURE || 0.3),
            maxContext: Number(process.env.AI_MAX_CONTEXT || 4000),
            retrievalCount: Number(process.env.AI_RETRIEVAL_COUNT || 5),
            similarityThreshold: Number(process.env.AI_SIMILARITY_THRESHOLD || 0.2),
            conversationHistoryLength: Number(process.env.AI_CONVERSATION_HISTORY_LENGTH || 20),
            defaultSystemPrompt: DEFAULT_SYSTEM_PROMPT,
            humanHandoffRules: {},
            leadCompletionRules: {
                requiredFields: ['name', 'country', 'mobile', 'email', 'system', 'issue'],
            },
            campaignOverrides: {},
        });
        return created.toObject();
    }
    static async updateSettings(companyId, payload) {
        const settings = await AiSettings_1.AiSettings.findOne({ companyId });
        if (!settings) {
            return this.getSettings(companyId);
        }
        Object.assign(settings, payload);
        await settings.save();
        return settings.toObject();
    }
    static async listConnections(companyId) {
        const connections = await AiConnection_1.AiConnection.find({ companyId }).sort({ createdAt: -1 }).lean();
        return connections.map((connection) => ({
            ...connection,
            apiToken: connection.apiTokenEncrypted ? (0, crypto_1.decryptSecret)(connection.apiTokenEncrypted) : '',
            webhookSecret: connection.webhookSecretEncrypted ? (0, crypto_1.decryptSecret)(connection.webhookSecretEncrypted) : '',
        }));
    }
    static async createConnection(companyId, payload) {
        const cleaned = {
            companyId,
            name: normalizeString(payload.name),
            siteId: normalizeString(payload.siteId),
            channelId: normalizeString(payload.channelId),
            providerId: normalizeString(payload.providerId),
            apiEndpoint: normalizeString(payload.apiEndpoint),
            connectedCampaign: normalizeString(payload.connectedCampaign),
            campaignId: payload.campaignId ? new mongoose_1.Types.ObjectId(payload.campaignId) : undefined,
            salesGroupId: payload.salesGroupId ? new mongoose_1.Types.ObjectId(payload.salesGroupId) : undefined,
            isActive: payload.isActive !== false,
            webhookStatus: payload.webhookStatus || 'INACTIVE',
        };
        if (!cleaned.name) {
            throw { statusCode: 400, message: 'Connection name is required.' };
        }
        if (payload.apiToken) {
            cleaned.apiTokenEncrypted = (0, crypto_1.encryptSecret)(payload.apiToken);
        }
        if (payload.webhookSecret) {
            cleaned.webhookSecretEncrypted = (0, crypto_1.encryptSecret)(payload.webhookSecret);
        }
        const connection = await AiConnection_1.AiConnection.create(cleaned);
        return connection.toObject();
    }
    static async updateConnection(companyId, connectionId, payload) {
        const connection = await AiConnection_1.AiConnection.findOne({ companyId, _id: connectionId });
        if (!connection) {
            throw { statusCode: 404, message: 'Connection not found.' };
        }
        if (payload.name !== undefined)
            connection.name = normalizeString(payload.name) || connection.name;
        if (payload.siteId !== undefined)
            connection.siteId = normalizeString(payload.siteId) || undefined;
        if (payload.channelId !== undefined)
            connection.channelId = normalizeString(payload.channelId) || undefined;
        if (payload.providerId !== undefined)
            connection.providerId = normalizeString(payload.providerId) || undefined;
        if (payload.apiEndpoint !== undefined)
            connection.apiEndpoint = normalizeString(payload.apiEndpoint) || undefined;
        if (payload.connectedCampaign !== undefined)
            connection.connectedCampaign = normalizeString(payload.connectedCampaign) || undefined;
        if (payload.campaignId !== undefined)
            connection.campaignId = payload.campaignId ? new mongoose_1.Types.ObjectId(payload.campaignId) : undefined;
        if (payload.salesGroupId !== undefined)
            connection.salesGroupId = payload.salesGroupId ? new mongoose_1.Types.ObjectId(payload.salesGroupId) : undefined;
        if (payload.isActive !== undefined)
            connection.isActive = payload.isActive;
        if (payload.webhookStatus !== undefined)
            connection.webhookStatus = payload.webhookStatus;
        if (payload.apiToken) {
            connection.apiTokenEncrypted = (0, crypto_1.encryptSecret)(payload.apiToken);
        }
        if (payload.webhookSecret) {
            connection.webhookSecretEncrypted = (0, crypto_1.encryptSecret)(payload.webhookSecret);
        }
        await connection.save();
        return connection.toObject();
    }
    static async validateConnection(companyId, connectionId) {
        const connection = await AiConnection_1.AiConnection.findOne({ companyId, _id: connectionId });
        if (!connection) {
            throw { statusCode: 404, message: 'Connection not found.' };
        }
        const validationNotes = [];
        if (!connection.apiEndpoint)
            validationNotes.push('API endpoint is missing.');
        if (!connection.apiTokenEncrypted)
            validationNotes.push('API token is missing.');
        if (!connection.siteId)
            validationNotes.push('Site ID is missing.');
        if (!connection.channelId)
            validationNotes.push('Channel ID is missing.');
        if (validationNotes.length) {
            connection.status = 'PENDING';
            connection.validationNotes = validationNotes;
            connection.lastValidatedAt = new Date();
            await connection.save();
            return { valid: false, validationNotes };
        }
        try {
            const endpoint = connection.apiEndpoint || process.env.LOCAL_LLM_ENDPOINT || 'http://localhost:11434/api/generate';
            const token = (0, crypto_1.decryptSecret)(connection.apiTokenEncrypted || '');
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ test: true, siteId: connection.siteId, channelId: connection.channelId }),
            });
            connection.status = response.ok ? 'ACTIVE' : 'PENDING';
            connection.validationNotes = response.ok ? ['Connection validated successfully.'] : [`Connection validation returned ${response.status}.`];
            connection.lastValidatedAt = new Date();
            await connection.save();
            return { valid: response.ok, validationNotes: connection.validationNotes, status: connection.status };
        }
        catch (error) {
            connection.status = 'PENDING';
            connection.validationNotes = [error.message || 'Validation error.'];
            connection.lastValidatedAt = new Date();
            await connection.save();
            return { valid: false, validationNotes: connection.validationNotes };
        }
    }
    static async listKnowledgeBases(companyId) {
        return AiKnowledgeBase_1.AiKnowledgeBase.find({ companyId }).sort({ createdAt: -1 }).lean();
    }
    static async createKnowledgeBase(companyId, payload) {
        const name = normalizeString(payload.name);
        if (!name)
            throw { statusCode: 400, message: 'Knowledge base name is required.' };
        const knowledgeBase = await AiKnowledgeBase_1.AiKnowledgeBase.create({
            companyId,
            name,
            description: normalizeString(payload.description) || '',
            connectedCampaign: normalizeString(payload.connectedCampaign) || '',
            campaignId: payload.campaignId ? new mongoose_1.Types.ObjectId(payload.campaignId) : undefined,
            isActive: payload.isActive !== false,
            sourceCount: 0,
        });
        return knowledgeBase.toObject();
    }
    static async uploadKnowledgeFile(companyId, knowledgeBaseId, file) {
        const knowledgeBase = await AiKnowledgeBase_1.AiKnowledgeBase.findOne({ companyId, _id: knowledgeBaseId });
        if (!knowledgeBase) {
            throw { statusCode: 404, message: 'Knowledge base not found.' };
        }
        const text = await (0, fileParser_1.extractTextFromFile)(file.buffer, file.originalname);
        const chunks = buildChunks(text, 900);
        await AiKnowledgeChunk_1.AiKnowledgeChunk.deleteMany({ companyId, knowledgeBaseId });
        const settings = await this.getSettings(companyId);
        const embeddings = await Promise.all(chunks.map(async ({ chunk, index }) => {
            const embedding = await aiService_1.AiService.generateEmbedding(chunk, {
                model: settings.activeModel,
                endpoint: settings.modelEndpoint?.replace('/api/generate', '/api/embeddings') || process.env.LOCAL_EMBEDDINGS_ENDPOINT || 'http://localhost:11434/api/embeddings',
            });
            return {
                companyId,
                knowledgeBaseId,
                fileName: file.originalname,
                sourceType: 'uploaded',
                chunkIndex: index,
                content: chunk,
                embedding,
                metadata: { originalName: file.originalname, mimetype: file.mimetype },
            };
        }));
        await AiKnowledgeChunk_1.AiKnowledgeChunk.insertMany(embeddings);
        knowledgeBase.sourceCount = embeddings.length;
        knowledgeBase.lastIndexedAt = new Date();
        await knowledgeBase.save();
        return { knowledgeBaseId, fileName: file.originalname, chunksInserted: embeddings.length };
    }
    static async searchKnowledgeBase(companyId, knowledgeBaseId, userMessage, options) {
        const kb = await AiKnowledgeBase_1.AiKnowledgeBase.findOne({ companyId, _id: knowledgeBaseId, isActive: true });
        if (!kb) {
            throw { statusCode: 404, message: 'Knowledge base not found.' };
        }
        const settings = await this.getSettings(companyId);
        const limit = options?.limit ?? settings.retrievalCount ?? 5;
        const threshold = options?.threshold ?? settings.similarityThreshold ?? 0.2;
        const chunks = await AiKnowledgeChunk_1.AiKnowledgeChunk.find({ companyId, knowledgeBaseId }).lean();
        if (!chunks.length) {
            return [];
        }
        const queryEmbedding = await aiService_1.AiService.generateEmbedding(userMessage, {
            model: settings.activeModel,
            endpoint: settings.modelEndpoint?.replace('/api/generate', '/api/embeddings') || process.env.LOCAL_EMBEDDINGS_ENDPOINT || 'http://localhost:11434/api/embeddings',
        });
        const scored = chunks
            .map((chunk) => ({
            content: chunk.content,
            source: chunk.fileName,
            score: cosineSimilarity(queryEmbedding, chunk.embedding || []),
        }))
            .filter((item) => item.score >= threshold)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        return scored;
    }
    static async listConversations(companyId) {
        return AiConversation_1.AiConversation.find({ companyId }).sort({ createdAt: -1 }).lean();
    }
    static async getConversation(companyId, conversationId) {
        const conversation = await AiConversation_1.AiConversation.findOne({ companyId, _id: conversationId }).lean();
        if (!conversation) {
            throw { statusCode: 404, message: 'Conversation not found.' };
        }
        return conversation;
    }
    static async getDashboard(companyId) {
        const [connections, knowledgeBases, conversations, pendingLeads] = await Promise.all([
            AiConnection_1.AiConnection.countDocuments({ companyId }),
            AiKnowledgeBase_1.AiKnowledgeBase.countDocuments({ companyId }),
            AiConversation_1.AiConversation.countDocuments({ companyId }),
            AiConversation_1.AiConversation.countDocuments({ companyId, leadReady: true }),
        ]);
        const activeChats = await AiConversation_1.AiConversation.countDocuments({ companyId, status: 'AI_ACTIVE' });
        const humanHandoffs = await AiConversation_1.AiConversation.countDocuments({ companyId, status: 'AI_TO_HUMAN' });
        return {
            connections,
            knowledgeBases,
            conversations,
            activeChats,
            humanHandoffs,
            pendingLeads,
        };
    }
    static async askCompanyData(companyId, question) {
        const settings = await this.getSettings(companyId);
        const [leads, sales, employees] = await Promise.all([
            Lead_1.Lead.find({ companyId }).sort({ createdAt: -1 }).lean(),
            Sale_1.Sale.find({ companyId }).sort({ saleDate: -1, createdAt: -1 }).lean(),
            Employee_1.Employee.find({ companyId }).select('name role email').sort({ createdAt: -1 }).lean(),
        ]);
        const context = buildDashboardContext(companyId, question, leads, sales, employees);
        const quickAnswer = buildQuickAnswer(question, leads, sales, employees) || buildEntityMatchAnswer(question, leads, sales, employees);
        if (quickAnswer) {
            return {
                answer: quickAnswer,
                contextSummary: context,
            };
        }
        const systemPrompt = `You are an AI CRM analyst for this company. Answer the user's question using only the CRM data shown below. Be precise, concise, and business-friendly. Return the shortest correct answer possible: for totals, use a single number or short phrase; do not add long explanations unless the user asks for detail. When asked for totals, dates, or comparisons, calculate from the provided dataset. If you cannot determine the answer from the records, say what data is missing and suggest a related question.`;
        try {
            const answer = await aiService_1.AiService.askLocalModel(systemPrompt, question, [context], {
                model: settings.activeModel,
                endpoint: settings.modelEndpoint,
                temperature: settings.temperature,
            });
            return {
                answer,
                contextSummary: context,
            };
        }
        catch (error) {
            const fallback = 'I could not reach the local Ollama model right now. Please try again in a moment.';
            return {
                answer: fallback,
                contextSummary: context,
            };
        }
    }
    static async processIncomingJivoEvent(companyId, payload) {
        const connection = await this.resolveConnection(companyId, payload);
        const messageText = this.extractIncomingMessage(payload);
        const conversation = await this.getOrCreateConversation(companyId, connection, payload);
        const existingProfile = conversation.customerProfile || {};
        const mergedProfile = this.mergeCustomerProfile(existingProfile, payload);
        const conversationContext = conversation.messages
            .slice(-10)
            .map((message) => `${message.role === 'user' ? 'Customer' : 'Assistant'}: ${message.content}`);
        const knowledgeBase = connection.campaignId ? await AiKnowledgeBase_1.AiKnowledgeBase.findOne({ companyId, _id: connection.campaignId, isActive: true }) : null;
        const knowledgeResults = knowledgeBase
            ? await this.searchKnowledgeBase(companyId, knowledgeBase._id.toString(), messageText || 'general inquiry')
            : [];
        const settings = await this.getSettings(companyId);
        const systemPrompt = settings.defaultSystemPrompt || DEFAULT_SYSTEM_PROMPT;
        const structuredReply = await aiService_1.AiService.generateStructuredReply({
            systemPrompt,
            conversationContext,
            userMessage: messageText || 'Customer check-in',
            customerProfile: mergedProfile,
            model: settings.activeModel,
            endpoint: settings.modelEndpoint,
            temperature: settings.temperature,
        });
        if (structuredReply.reply) {
            conversation.messages.push({
                role: 'assistant',
                content: structuredReply.reply,
                timestamp: new Date(),
                metadata: {
                    knowledgeUsed: structuredReply.knowledge_used || knowledgeResults.map((item) => item.source),
                    confidence: structuredReply.confidence,
                },
            });
        }
        const finalCustomerProfile = { ...mergedProfile, ...structuredReply.customer };
        conversation.customerProfile = finalCustomerProfile;
        conversation.knowledgeUsed = [...new Set([...(conversation.knowledgeUsed || []), ...(structuredReply.knowledge_used || [])])];
        conversation.lastError = structuredReply.error || '';
        const leadReady = this.shouldCreateLead(finalCustomerProfile, settings);
        conversation.leadReady = leadReady;
        if (leadReady && !conversation.leadId) {
            const leadPayload = makeLeadPayload(finalCustomerProfile, companyId, conversation._id.toString());
            const createdLead = await companySalesService_1.CompanySalesService.createLead(companyId, leadPayload);
            conversation.leadId = createdLead._id;
            await this.notifyCampaignGroup(companyId, connection, createdLead);
        }
        if (structuredReply.handoff_required || this.shouldHandoff(finalCustomerProfile, structuredReply, settings, knowledgeResults)) {
            conversation.handoffRequired = true;
            conversation.status = 'AI_TO_HUMAN';
            await this.notifyHandoff(companyId, connection, conversation, finalCustomerProfile);
        }
        const customerFields = {
            name: finalCustomerProfile.name,
            country: finalCustomerProfile.country,
            mobile: finalCustomerProfile.mobile,
            email: finalCustomerProfile.email,
            system: finalCustomerProfile.system,
            model: finalCustomerProfile.model,
            issue: finalCustomerProfile.issue,
            campaign: finalCustomerProfile.campaign || connection.connectedCampaign,
            jivoChatId: finalCustomerProfile.jivoChatId || payload.chat?.id || payload.chatId,
            customerId: finalCustomerProfile.customerId || payload.customer?.id,
            source: finalCustomerProfile.source || 'JivoChat',
        };
        conversation.customerProfile = { ...conversation.customerProfile, ...customerFields };
        await conversation.save();
        return {
            conversationId: conversation._id.toString(),
            reply: structuredReply.reply,
            customer: customerFields,
            leadReady,
            handoffRequired: conversation.handoffRequired,
            knowledgeSources: knowledgeResults.map((item) => item.source),
            status: conversation.status,
        };
    }
    static async resolveConnection(companyId, payload) {
        const connectionFilters = [{ companyId, isActive: true }];
        const identifiers = [payload.connectionId, payload.chat?.id, payload.siteId, payload.channelId].filter(Boolean);
        if (payload.connectionId) {
            const direct = await AiConnection_1.AiConnection.findOne({ companyId, _id: payload.connectionId, isActive: true });
            if (direct)
                return direct;
        }
        if (payload.siteId || payload.channelId) {
            connectionFilters.push({ companyId, isActive: true, siteId: payload.siteId, channelId: payload.channelId });
        }
        const connection = await AiConnection_1.AiConnection.findOne({
            $or: connectionFilters,
        });
        if (!connection) {
            throw { statusCode: 404, message: 'No active Jivo connection matched the incoming event.' };
        }
        return connection;
    }
    static extractIncomingMessage(payload) {
        if (payload.message?.content)
            return normalizeString(payload.message.content);
        if (payload.message?.text)
            return normalizeString(payload.message.text);
        if (payload.chat?.lastMessage)
            return normalizeString(payload.chat.lastMessage);
        if (payload.chat?.messages?.length) {
            const last = payload.chat.messages[payload.chat.messages.length - 1];
            const content = last.text || last.content || '';
            return normalizeString(content);
        }
        return '';
    }
    static async getOrCreateConversation(companyId, connection, payload) {
        const jivoChatId = payload.chat?.id || payload.chatId || payload.id || '';
        const customerId = payload.customer?.id || payload.customerId || '';
        let conversation = await AiConversation_1.AiConversation.findOne({ companyId, jivoChatId });
        if (!conversation) {
            conversation = await AiConversation_1.AiConversation.create({
                companyId,
                connectionId: connection._id,
                campaignName: connection.connectedCampaign,
                knowledgeBaseId: connection.campaignId,
                jivoChatId,
                customerId,
                customerProfile: {
                    campaign: connection.connectedCampaign,
                    jivoChatId,
                    customerId,
                    source: 'JivoChat',
                },
                status: 'AI_ACTIVE',
                leadReady: false,
                handoffRequired: false,
                source: 'JIVO_CHAT',
            });
        }
        const profile = conversation.customerProfile || {};
        conversation.customerProfile = {
            ...profile,
            campaign: connection.connectedCampaign || profile.campaign,
            jivoChatId: jivoChatId || profile.jivoChatId,
            customerId: customerId || profile.customerId,
            source: 'JivoChat',
            ...(payload.customer || {}),
        };
        conversation.connectionId = connection._id;
        conversation.knowledgeBaseId = connection.campaignId || conversation.knowledgeBaseId;
        conversation.campaignName = connection.connectedCampaign || conversation.campaignName;
        if (conversation.status === 'CLOSED' && payload.type !== 'chat_close') {
            conversation.status = 'AI_ACTIVE';
        }
        if (payload.chat?.status) {
            if (payload.chat.status === 'closed')
                conversation.status = 'CLOSED';
        }
        const messageText = this.extractIncomingMessage(payload);
        if (messageText) {
            conversation.messages.push({
                role: 'user',
                content: messageText,
                timestamp: new Date(),
            });
        }
        await conversation.save();
        return conversation;
    }
    static mergeCustomerProfile(existingProfile, payload) {
        const incoming = {
            ...(payload.customer || {}),
            jivoChatId: payload.chat?.id || payload.chatId || existingProfile.jivoChatId,
            customerId: payload.customer?.id || payload.customerId || existingProfile.customerId,
            campaign: payload.campaign || existingProfile.campaign,
            source: 'JivoChat',
        };
        return {
            ...existingProfile,
            ...pick(incoming, ['name', 'country', 'mobile', 'email', 'system', 'model', 'issue', 'campaign', 'jivoChatId', 'customerId', 'source']),
        };
    }
    static shouldCreateLead(customerProfile, settings) {
        const far = settings.leadCompletionRules?.requiredFields || ['name', 'country', 'mobile', 'email', 'system', 'issue'];
        const requiredFields = far.map((field) => {
            if (field === 'mobile')
                return customerProfile.mobile || customerProfile.phone;
            if (field === 'email')
                return customerProfile.email;
            return customerProfile[field];
        });
        return requiredFields.every(Boolean);
    }
    static shouldHandoff(customerProfile, structuredReply, settings, knowledgeResults) {
        if (structuredReply.handoff_required)
            return true;
        const rules = settings.humanHandoffRules || {};
        const score = structuredReply.confidence ?? 0;
        const threshold = Number(rules.confidenceThreshold || 0.4);
        if (knowledgeResults.length === 0 && score < threshold)
            return true;
        const text = [customerProfile.issue, customerProfile.system, customerProfile.model].filter(Boolean).join(' ');
        const angryKeywords = ['angry', 'angry', 'upset', 'frustrated', 'hate', 'terrible', 'urgent'];
        if (angryKeywords.some((keyword) => text.toLowerCase().includes(keyword)))
            return true;
        return false;
    }
    static async notifyCampaignGroup(companyId, connection, lead) {
        if (!connection.salesGroupId)
            return;
        const group = await Group_1.Group.findOne({ companyId, _id: connection.salesGroupId });
        if (!group)
            return;
        const recipients = Array.from(new Set([group.createdBy.toString(), ...group.members.map((member) => member.toString())]));
        await Promise.all(recipients.map((recipientId) => Notification_1.Notification.create({
            companyId,
            recipientId,
            title: '🚨 NEW AI LEAD',
            message: `Customer: ${lead.name}\nCountry: ${lead.country}\nSystem: ${lead.system}\nIssue: ${lead.issues || 'N/A'}\nCampaign: ${connection.connectedCampaign || 'AI Campaign'}\nSource: JivoChat`,
            link: `/leads/${lead._id}`,
        })));
    }
    static async notifyHandoff(companyId, connection, conversation, customerProfile) {
        if (!connection.salesGroupId)
            return;
        const group = await Group_1.Group.findOne({ companyId, _id: connection.salesGroupId });
        if (!group)
            return;
        const recipients = Array.from(new Set([group.createdBy.toString(), ...group.members.map((member) => member.toString())]));
        await Promise.all(recipients.map((recipientId) => Notification_1.Notification.create({
            companyId,
            recipientId,
            title: '🤝 AI Handoff Required',
            message: `Customer ${customerProfile.name || 'Unknown'} requires human support for ${connection.connectedCampaign || 'campaign'} chat ${conversation.jivoChatId}.`,
            link: `/ai/conversations/${conversation._id}`,
        })));
    }
    static async verifyWebhookSignature(body, signature, secret) {
        const secretValue = secret || process.env.JIVO_WEBHOOK_SECRET || '';
        if (!signature || !secretValue)
            return true;
        const expected = node_crypto_1.default.createHmac('sha256', secretValue).update(JSON.stringify(body)).digest('hex');
        return node_crypto_1.default.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    }
}
exports.AiAutomationService = AiAutomationService;
