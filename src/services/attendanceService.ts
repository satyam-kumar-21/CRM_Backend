import { Attendance } from '../models/Attendance';
import { Employee } from '../models/Employee';
import { getBusinessDayEnd, getBusinessDayStart } from '../utils/businessDate';

export class AttendanceService {
  static async list(companyId: string, employeeId?: string, filters: { employeeId?: string; from?: string; to?: string } = {}) {
    const query: Record<string, unknown> = { companyId };
    if (employeeId) query.employeeId = employeeId;
    else if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.from || filters.to) {
      query.date = {
        ...(filters.from ? { $gte: getBusinessDayStart(filters.from) } : {}),
        ...(filters.to ? { $lt: getBusinessDayEnd(filters.to) } : {}),
      };
    }
    const records = await Attendance.find(query).populate('employeeId', 'name employeeId role').sort({ date: -1, checkIn: -1 });
    return records;
  }

  static async employees(companyId: string) {
    return Employee.find({ companyId, isSuspended: false }).select('_id name employeeId role').sort({ name: 1 });
  }
}
