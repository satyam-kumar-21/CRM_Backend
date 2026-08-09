import { Attendance } from '../models/Attendance';
import { Employee } from '../models/Employee';

export class AttendanceService {
  static async list(companyId: string, employeeId?: string, filters: { employeeId?: string; from?: string; to?: string } = {}) {
    const query: Record<string, unknown> = { companyId };
    if (employeeId) query.employeeId = employeeId;
    else if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.from || filters.to) {
      query.date = {
        ...(filters.from ? { $gte: new Date(filters.from) } : {}),
        ...(filters.to ? { $lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}),
      };
    }
    const records = await Attendance.find(query).populate('employeeId', 'name employeeId role').sort({ date: -1, checkIn: -1 });
    return records;
  }

  static async employees(companyId: string) {
    return Employee.find({ companyId, isSuspended: false }).select('_id name employeeId role').sort({ name: 1 });
  }
}
