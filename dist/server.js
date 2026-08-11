"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables immediately before importing anything else
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const http_1 = require("http");
const socket_1 = require("./realtime/socket");
const PORT = process.env.PORT || 5000;
const startServer = async () => {
    await (0, db_1.connectDB)();
    const server = (0, http_1.createServer)(app_1.default);
    (0, socket_1.configureSocket)(server);
    server.listen(PORT, () => {
        console.log(`[Server] Enterprise CRM Engine active on port ${PORT}`);
    });
};
startServer();
