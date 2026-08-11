import { Attendance } from '../models/Attendance';
import { Employee } from '../models/Employee';
import { getBusinessDayEnd, getBusinessDayStart } from '../utils/businessDate';
import { Company } from '../models/Company';
import { AttendanceStatus } from '../constants/index';

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
    const records: any[] = await Attendance.find(query).populate('employeeId', 'name employeeId role').sort({ date: -1, checkIn: -1 });

    // Handle company-configured holidays: treat them as HOLIDAY status for employee-specific queries
    const company = await Company.findById(companyId).select('settings');
    const holidays = (company && company.settings && Array.isArray(company.settings.holidays)) ? company.settings.holidays : [];

    const employeeToCheck = (employeeId || filters.employeeId) as string | undefined;
    if (employeeToCheck) {
      for (const h of holidays) {
        if (!h || !h.date) continue;
        const start = getBusinessDayStart(h.date);
        const end = getBusinessDayEnd(h.date);

        // If filters provided, skip holidays outside range
        if (filters.from && new Date(String(filters.from)) > end) continue;
        if (filters.to && new Date(String(filters.to)) < start) continue;

        const exists = records.find((r) => r.employeeId && String((r.employeeId as any)._id || r.employeeId) === employeeToCheck && r.date >= start && r.date < end);
        if (exists) {
          (exists as any).status = AttendanceStatus.HOLIDAY;
        } else {
          records.push({
            companyId: companyId as any,
            employeeId: employeeToCheck as any,
            date: start,
            checkIn: undefined,
            checkOut: undefined,
            status: AttendanceStatus.HOLIDAY,
            workHours: 0,
          } as any);
        }
      }
    }

    // sort again by date desc
    records.sort((a: any, b: any) => b.date.getTime() - a.date.getTime());

    return records;
  }

  static async employees(companyId: string) {
    return Employee.find({ companyId, isSuspended: false }).select('_id name employeeId role').sort({ name: 1 });
  }
}
