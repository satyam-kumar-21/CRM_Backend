"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};

Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRateLimiter = void 0;

const express_rate_limit_1 = __importDefault(require("express-rate-limit"));

exports.apiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 12 * 60 * 60 * 1000, // 12 hours
    max: 3000, // 3000 requests per IP
    message: {
        success: false,
        message: "Too many requests from this IP address. Please try again after 12 hours.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});