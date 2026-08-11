"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const mongoose_1 = require("mongoose");
const Project_1 = require("../models/Project");
const Employee_1 = require("../models/Employee");
class ProjectService {
    static async list(companyId, role, employeeId) {
        const query = { companyId };
        if (role === 'IT') {
            query.assignedEmployees = new mongoose_1.Types.ObjectId(employeeId);
        }
        return Project_1.Project.find(query).sort({ createdAt: -1 });
    }
    static async create(companyId, data) {
        const assignedEmployees = await Employee_1.Employee.find({ companyId, _id: { $in: data.assignedEmployeeIds }, isSuspended: false });
        if (assignedEmployees.length !== data.assignedEmployeeIds.length) {
            throw { statusCode: 400, message: 'One or more assigned employees are invalid or unavailable.' };
        }
        const project = await Project_1.Project.create({
            companyId,
            name: data.name,
            description: data.description,
            status: data.status,
            assignedEmployees: assignedEmployees.map((employee) => employee._id),
            startDate: data.startDate,
            endDate: data.endDate,
            progress: data.progress ?? 0,
            createdBy: new mongoose_1.Types.ObjectId(data.createdById),
        });
        return project;
    }
    static async update(companyId, id, data) {
        const project = await Project_1.Project.findOne({ companyId, _id: id });
        if (!project)
            throw { statusCode: 404, message: 'Project not found.' };
        if (data.assignedEmployeeIds) {
            const assignedEmployees = await Employee_1.Employee.find({ companyId, _id: { $in: data.assignedEmployeeIds }, isSuspended: false });
            if (assignedEmployees.length !== data.assignedEmployeeIds.length) {
                throw { statusCode: 400, message: 'One or more assigned employees are invalid or unavailable.' };
            }
            project.assignedEmployees = assignedEmployees.map((emp) => emp._id);
        }
        if (data.name !== undefined)
            project.name = data.name;
        if (data.description !== undefined)
            project.description = data.description;
        if (data.status !== undefined)
            project.status = data.status;
        if (data.startDate !== undefined)
            project.startDate = data.startDate;
        if (data.endDate !== undefined)
            project.endDate = data.endDate;
        if (data.progress !== undefined)
            project.progress = data.progress;
        await project.save();
        return project;
    }
    static async summary(companyId, role, employeeId) {
        const query = { companyId };
        if (role === 'IT')
            query.assignedEmployees = new mongoose_1.Types.ObjectId(employeeId);
        const total = await Project_1.Project.countDocuments(query);
        const active = await Project_1.Project.countDocuments({ ...query, status: 'IN_PROGRESS' });
        const completed = await Project_1.Project.countDocuments({ ...query, status: 'COMPLETED' });
        const pending = await Project_1.Project.countDocuments({ ...query, status: { $in: ['PLANNING', 'ON_HOLD'] } });
        const projects = await Project_1.Project.find(query).sort({ endDate: 1 }).limit(5);
        return { total, active, completed, pending, projects };
    }
}
exports.ProjectService = ProjectService;
