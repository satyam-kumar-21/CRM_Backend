"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateAccessToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_ACCESS_SECRET || 'secret', {
        expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
    });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_REFRESH_SECRET || 'refresh_secret', {
        expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
    });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyAccessToken = (token) => {
    return jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET || 'secret');
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    return jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh_secret');
};
exports.verifyRefreshToken = verifyRefreshToken;
