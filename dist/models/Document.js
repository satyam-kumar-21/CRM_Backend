"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentModel = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const DocumentSchema = new mongoose_1.Schema({
    uploadedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    title: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSizeMB: { type: Number, required: true },
}, { timestamps: true });
DocumentSchema.plugin(tenantPlugin_1.tenantPlugin);
exports.DocumentModel = (0, mongoose_1.model)('Document', DocumentSchema);
