import { Types } from 'mongoose';
import { Project, IProject } from '../models/Project';
import { Employee } from '../models/Employee';

export class ProjectService {
  static async list(companyId: string, role: string, employeeId: string) {
    const query: any = { companyId };
    if (role === 'IT') {
      query.assignedEmployees = new Types.ObjectId(employeeId);
    }
    return Project.find(query).sort({ createdAt: -1 });
  }

  static async create(companyId: string, data: {
    name: string;
    description: string;
    status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
    assignedEmployeeIds: string[];
    startDate: Date;
    endDate: Date;
    progress?: number;
    createdById: string;
  }) {
    const assignedEmployees = await Employee.find({ companyId, _id: { $in: data.assignedEmployeeIds }, isSuspended: false });
    if (assignedEmployees.length !== data.assignedEmployeeIds.length) {
      throw { statusCode: 400, message: 'One or more assigned employees are invalid or unavailable.' };
    }
    const project = await Project.create({
      companyId,
      name: data.name,
      description: data.description,
      status: data.status,
      assignedEmployees: assignedEmployees.map((employee) => employee._id),
      startDate: data.startDate,
      endDate: data.endDate,
      progress: data.progress ?? 0,
      createdBy: new Types.ObjectId(data.createdById),
    });
    return project;
  }

  static async update(companyId: string, id: string, data: Partial<{
    name: string;
    description: string;
    status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
    assignedEmployeeIds: string[];
    startDate: Date;
    endDate: Date;
    progress: number;
  }>) {
    const project = await Project.findOne({ companyId, _id: id });
    if (!project) throw { statusCode: 404, message: 'Project not found.' };

    if (data.assignedEmployeeIds) {
      const assignedEmployees = await Employee.find({ companyId, _id: { $in: data.assignedEmployeeIds }, isSuspended: false });
      if (assignedEmployees.length !== data.assignedEmployeeIds.length) {
        throw { statusCode: 400, message: 'One or more assigned employees are invalid or unavailable.' };
      }
      project.assignedEmployees = assignedEmployees.map((emp) => emp._id);
    }
    if (data.name !== undefined) project.name = data.name;
    if (data.description !== undefined) project.description = data.description;
    if (data.status !== undefined) project.status = data.status;
    if (data.startDate !== undefined) project.startDate = data.startDate;
    if (data.endDate !== undefined) project.endDate = data.endDate;
    if (data.progress !== undefined) project.progress = data.progress;

    await project.save();
    return project;
  }

  static async summary(companyId: string, role: string, employeeId: string) {
    const query: any = { companyId };
    if (role === 'IT') query.assignedEmployees = new Types.ObjectId(employeeId);

    const total = await Project.countDocuments(query);
    const active = await Project.countDocuments({ ...query, status: 'IN_PROGRESS' });
    const completed = await Project.countDocuments({ ...query, status: 'COMPLETED' });
    const pending = await Project.countDocuments({ ...query, status: { $in: ['PLANNING', 'ON_HOLD'] } });
    const projects = await Project.find(query).sort({ endDate: 1 }).limit(5);
    return { total, active, completed, pending, projects };
  }
}
