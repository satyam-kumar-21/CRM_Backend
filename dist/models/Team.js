"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Team = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const TeamSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    leaderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee' },
    members: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee' }],
}, { timestamps: true });
TeamSchema.plugin(tenantPlugin_1.tenantPlugin);
exports.Team = (0, mongoose_1.model)('Team', TeamSchema);
