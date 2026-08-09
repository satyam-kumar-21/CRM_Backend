"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Task = void 0;
const mongoose_1 = require("mongoose");
const index_1 = require("../constants/index");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const TaskSchema = new mongoose_1.Schema({
    projectId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    status: { type: String, enum: Object.values(index_1.TaskStatus), default: index_1.TaskStatus.TODO },
    priority: { type: String, enum: Object.values(index_1.Priority), default: index_1.Priority.MEDIUM },
    assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    assignedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    deadline: { type: Date, required: true },
}, { timestamps: true });
TaskSchema.plugin(tenantPlugin_1.tenantPlugin);
exports.Task = (0, mongoose_1.model)('Task', TaskSchema);
