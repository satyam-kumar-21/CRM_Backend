"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTextFromFile = exports.normalizeText = void 0;
const sync_1 = require("csv-parse/sync");
const mammoth = __importStar(require("mammoth"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const XLSX = __importStar(require("xlsx"));
const normalizeText = (value) => {
    if (!value)
        return '';
    return value
        .replace(/\r/g, '\n')
        .replace(/[\t ]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};
exports.normalizeText = normalizeText;
const extractTextFromFile = async (fileBuffer, originalName) => {
    const extension = originalName.split('.').pop()?.toLowerCase();
    if (extension === 'txt' || extension === 'md' || extension === 'json') {
        return (0, exports.normalizeText)(fileBuffer.toString('utf8'));
    }
    if (extension === 'csv') {
        const parsed = (0, sync_1.parse)(fileBuffer.toString('utf8'), { columns: false, skip_empty_lines: true });
        return (0, exports.normalizeText)(parsed.map((row) => row.join(' | ')).join('\n'));
    }
    if (extension === 'xlsx' || extension === 'xls') {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheets = workbook.Sheets;
        const rows = [];
        for (const sheetName of Object.keys(sheets)) {
            const sheet = sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
            rows.push(rawRows
                .map((row) => Object.values(row).filter((value) => value !== '').join(' | '))
                .filter(Boolean)
                .join('\n'));
        }
        return (0, exports.normalizeText)(rows.join('\n'));
    }
    if (extension === 'pdf') {
        const data = await (0, pdf_parse_1.default)(fileBuffer);
        return (0, exports.normalizeText)(data.text || '');
    }
    if (extension === 'docx') {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        return (0, exports.normalizeText)(result.value || '');
    }
    return (0, exports.normalizeText)(fileBuffer.toString('utf8'));
};
exports.extractTextFromFile = extractTextFromFile;
