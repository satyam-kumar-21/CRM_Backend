"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
const uploadRoot = node_path_1.default.resolve(__dirname, '../../uploads');
const filePath = node_path_1.default.join(uploadRoot, 'company-123', 'conversation-456', 'images', 'sample.txt');
(async () => {
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(filePath), { recursive: true });
    node_fs_1.default.writeFileSync(filePath, 'hello-local-upload');
    const exists = node_fs_1.default.existsSync(filePath);
    const text = node_fs_1.default.readFileSync(filePath, 'utf8');
    strict_1.default.equal(exists, true);
    strict_1.default.equal(text, 'hello-local-upload');
    console.log('local upload storage ok');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
