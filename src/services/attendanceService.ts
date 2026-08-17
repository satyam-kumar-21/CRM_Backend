import { Attendance } from '../models/Attendance';
import { Employee } from '../models/Employee';
import { getBusinessDateString, getBusinessDayEnd, getBusinessDayStart, getBusinessMonthRange, getBusinessMonthString } from '../utils/businessDate';
import { Company } from '../models/Company';
import { AttendanceStatus } from '../constants/index';

const toDateKey = (value: Date | string) => {
  const raw = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(raw.getTime())) return '';
  return getBusinessDateString(raw);
};

const buildDateRange = (from?: string, to?: string) => {
  const today = new Date();
  const startDate = from ? new Date(from) : today;
  const endDate = to ? new Date(to) : today;

  if (from && to && startDate > endDate) {
    return { start: endDate, end: startDate };
  }

  if (!from && !to) {
    const currentMonth = getBusinessMonthString();
    const { start } = getBusinessMonthRange(currentMonth);
    return { start, end: getBusinessDayEnd(today) };
  }

  if (from && !to) {
    const monthKey = getBusinessMonthString(from);
    const currentMonth = getBusinessMonthString();
    if (monthKey === currentMonth) {
      return { start: getBusinessDayStart(from), end: getBusinessDayEnd(today) };
    }
  }

  const start = from ? getBusinessDayStart(from) : getBusinessDayStart(startDate);
  const end = to ? getBusinessDayEnd(to) : getBusinessDayEnd(endDate);
  return { start, end };
};

export class AttendanceService {
  static async list(companyId: string, employeeId?: string, filters: { employeeId?: string; from?: string; to?: string } = {}) {
    const query: Record<string, unknown> = { companyId };
    const targetEmployeeId = employeeId || filters.employeeId;
    if (targetEmployeeId) query.employeeId = targetEmployeeId;

    const company = await Company.findById(companyId).select('settings');
    const holidays = Array.isArray(company?.settings?.holidays) ? company.settings.holidays.filter(Boolean) : [];
    const holidayByKey = new Map<string, { name: string; date: Date }>();
    for (const item of holidays) {
      if (!item?.date) continue;
      holidayByKey.set(toDateKey(item.date), item as { name: string; date: Date });
    }

    const range = buildDateRange(filters.from, filters.to);
    if (filters.from || filters.to) {
      query.date = {
        ...(filters.from ? { $gte: getBusinessDayStart(filters.from) } : {}),
        ...(filters.to ? { $lt: getBusinessDayEnd(filters.to) } : {}),
      };
    } else {
      query.date = {
        $gte: range.start,
        $lt: range.end,
      };
    }

    const employeeDocs = await Employee.find({ companyId, isSuspended: false }).select('_id name employeeId role createdAt').sort({ name: 1 });
    const employeeIds = targetEmployeeId ? [targetEmployeeId] : employeeDocs.map((employee) => employee._id.toString());
    const employeeById = new Map(employeeDocs.map((employee) => [employee._id.toString(), employee]));
    const holidayDatesInRange = new Set<string>();
    for (const [dateKey] of holidayByKey.entries()) {
      const date = new Date(dateKey);
      if (!Number.isNaN(date.getTime()) && date >= range.start && date < range.end) {
        holidayDatesInRange.add(dateKey);
      }
    }

    const existingRecords: any[] = await Attendance.find(query).populate('employeeId', 'name employeeId role').sort({ date: 1, checkIn: 1 });
    const recordMap = new Map<string, any>();
    for (const record of existingRecords) {
      const employeeKey = record.employeeId ? String((record.employeeId as any)._id || record.employeeId) : String(record.employeeId);
      const dateKey = toDateKey(record.date);
      if (!employeeKey || !dateKey) continue;
      recordMap.set(`${employeeKey}:${dateKey}`, record);
    }

    const allRecords: any[] = [];
    for (const employee of employeeIds) {
      const employeeProfile = employeeById.get(employee);
      const employeeJoinDate = employeeProfile?.createdAt ? new Date(employeeProfile.createdAt) : range.start;
      const dayCursor = new Date(Math.max(range.start.getTime(), getBusinessDayStart(employeeJoinDate).getTime()));

      while (dayCursor < range.end) {
        const dateKey = toDateKey(dayCursor);
        const key = `${employee}:${dateKey}`;
        const existing = recordMap.get(key);
        const holiday = holidayByKey.get(dateKey);

        if (holiday) {
          const holidayRecord = existing || {
            _id: `${employee}-${dateKey}`,
            companyId,
            employeeId: employee,
            date: getBusinessDayStart(dateKey),
            checkIn: undefined,
            checkOut: undefined,
            status: AttendanceStatus.HOLIDAY,
            workHours: 0,
          };
          holidayRecord.status = AttendanceStatus.HOLIDAY;
          holidayRecord.checkIn = existing?.checkIn ?? undefined;
          holidayRecord.checkOut = existing?.checkOut ?? undefined;
          holidayRecord.workHours = existing?.workHours ?? 0;
          holidayRecord.employeeId = existing?.employeeId ?? employee;
          allRecords.push(holidayRecord);
        } else if (existing) {
          allRecords.push(existing);
        } else {
          allRecords.push({
            _id: `${employee}-${dateKey}`,
            companyId,
            employeeId: employee,
            date: getBusinessDayStart(dateKey),
            checkIn: undefined,
            checkOut: undefined,
            status: AttendanceStatus.ABSENT,
            workHours: 0,
          });
        }

        dayCursor.setUTCDate(dayCursor.getUTCDate() + 1);
      }
    }

    const records = allRecords.map((record) => {
      const employeeIdString = typeof record.employeeId === 'object' && record.employeeId ? String((record.employeeId as any)._id || record.employeeId) : String(record.employeeId || '');
      const employeeProfile = employeeById.get(employeeIdString);
      if (record.employeeId && typeof record.employeeId === 'object' && record.employeeId._id) {
        return record;
      }
      if (employeeProfile) {
        return { ...record, employeeId: employeeProfile.toObject ? employeeProfile.toObject() : employeeProfile };
      }
      if (record.employeeId && typeof record.employeeId === 'string') {
        return { ...record, employeeId: { _id: record.employeeId, name: '', employeeId: '', role: '' } };
      }
      return record;
    });

    records.sort((a: any, b: any) => {
      const left = new Date(a.date).getTime();
      const right = new Date(b.date).getTime();
      return right - left;
    });

    const summary = {
      totalWorkingDays: records.filter((record: any) => record.status !== AttendanceStatus.HOLIDAY).length,
      totalPresent: records.filter((record: any) => record.status === AttendanceStatus.PRESENT).length,
      totalAbsent: records.filter((record: any) => record.status === AttendanceStatus.ABSENT).length,
      totalHoliday: holidayDatesInRange.size,
      totalEmployees: employeeIds.length,
      from: range.start.toISOString(),
      to: range.end.toISOString(),
    };

    return { records, summary };
  }

  static async employees(companyId: string) {
    return Employee.find({ companyId, isSuspended: false }).select('_id name employeeId role').sort({ name: 1 });
  }
}
