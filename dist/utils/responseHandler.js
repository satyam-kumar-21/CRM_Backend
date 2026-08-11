"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
class ApiResponse {
    static success(res, message, data, statusCode = 200, pagination) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            ...(pagination && { pagination }),
        });
    }
    static error(res, message, statusCode = 500, errors = null) {
        return res.status(statusCode).json({
            success: false,
            message,
            ...(errors && { errors }),
        });
    }
}
exports.ApiResponse = ApiResponse;
