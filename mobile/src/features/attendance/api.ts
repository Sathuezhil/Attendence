import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ApiError } from '@/lib/api';
import {
  asDateOnly,
  asDateOnlyRequired,
  asIso,
  asIsoOrNull,
  asNumberOrNull,
  asString,
  asStringOrNull,
  createRecord,
  getById,
  includesInsensitive,
  listCollection,
  paginate,
  updateRecord,
  writeAudit,
} from '@/lib/data';
import {
  calculateAttendanceMetrics,
  calendarDate,
  loadSettings,
  parseWorkingHours,
} from '@/lib/domain';
import { getDb, requireUser } from '@/lib/firebase';
import { fetchEmployee, loadEmployeeMap, loadEmployeeRows, mapEmployee } from '@/features/employees/api';
import {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceEmployee,
  PaginatedAttendance,
  TodayAttendanceResponse,
} from './types';

export interface TodayAttendanceParams {
  date?: string;
  employeeId?: string;
  search?: string;
  status?: AttendanceStatus;
  page?: number;
  limit?: number;
}

export interface AttendanceHistoryParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
  search?: string;
  lateOnly?: boolean;
  absentOnly?: boolean;
}

function toPublicStatus(status: string): AttendanceStatus {
  if (status === 'LEAVE' || status === 'ABSENT') {
    return 'ON_LEAVE';
  }
  if (status === 'LATE') {
    return 'PRESENT';
  }
  return (status as AttendanceStatus) || 'ON_LEAVE';
}

function toEmployeeSummary(employee: {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
}): AttendanceEmployee {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    fullName: `${employee.firstName} ${employee.lastName}`.trim(),
    jobTitle: employee.jobTitle,
  };
}

function mapAttendance(
  row: Record<string, unknown> & { id: string },
  employee: AttendanceEmployee,
): AttendanceRecord {
  return {
    id: row.id,
    employeeId: asString(row.employeeId),
    employee,
    attendanceDate: asDateOnlyRequired(row.date ?? row.attendanceDate),
    checkIn: asIsoOrNull(row.checkIn),
    checkOut: asIsoOrNull(row.checkOut),
    status: toPublicStatus(asString(row.status, 'ON_LEAVE')),
    lateMinutes: asNumberOrNull(row.lateMinutes),
    workingMinutes: asNumberOrNull(row.workingMinutes),
    notes: asStringOrNull(row.notes),
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

async function workingHours() {
  const settings = await loadSettings();
  return parseWorkingHours(settings.workingHours);
}

async function approvedLeaveIds(date: string): Promise<Set<string>> {
  const leaves = await listCollection('leaves');
  return new Set(
    leaves
      .filter(
        (row) =>
          asString(row.status) === 'APPROVED' &&
          asDateOnly(row.startDate) !== null &&
          asDateOnly(row.endDate) !== null &&
          asDateOnly(row.startDate)! <= date &&
          asDateOnly(row.endDate)! >= date,
      )
      .map((row) => asString(row.employeeId)),
  );
}

export async function fetchTodayAttendance(
  params: TodayAttendanceParams = {},
): Promise<TodayAttendanceResponse> {
  const hours = await workingHours();
  const date = params.date || calendarDate(hours.timezone);
  const search = params.search?.trim() ?? '';
  const employees = (await loadEmployeeRows())
    .map(mapEmployee)
    .filter((employee) => employee.employmentStatus === 'ACTIVE')
    .filter((employee) => !params.employeeId || employee.id === params.employeeId)
    .filter(
      (employee) =>
        !search ||
        includesInsensitive(employee.firstName, search) ||
        includesInsensitive(employee.lastName, search) ||
        includesInsensitive(employee.employeeCode, search),
    );

  const [records, leaveIds] = await Promise.all([
    listCollection('attendances'),
    approvedLeaveIds(date),
  ]);
  const byEmployee = new Map(
    records
      .filter((row) => asDateOnlyRequired(row.date ?? row.attendanceDate) === date)
      .map((row) => [asString(row.employeeId), row]),
  );

  let rows = employees.map((employee) => {
    const record = byEmployee.get(employee.id);
    if (!record) {
      return {
        employeeId: employee.id,
        employee: toEmployeeSummary(employee),
        attendanceId: null,
        attendanceDate: date,
        checkIn: null,
        checkOut: null,
        status: (leaveIds.has(employee.id) ? 'ON_LEAVE' : 'ON_LEAVE') as AttendanceStatus,
        lateMinutes: null,
        workingMinutes: null,
        notes: null,
        virtual: true,
      };
    }
    const mapped = mapAttendance(record, toEmployeeSummary(employee));
    return {
      employeeId: employee.id,
      employee: mapped.employee,
      attendanceId: mapped.id,
      attendanceDate: mapped.attendanceDate,
      checkIn: mapped.checkIn,
      checkOut: mapped.checkOut,
      status: mapped.status,
      lateMinutes: mapped.lateMinutes,
      workingMinutes: mapped.workingMinutes,
      notes: mapped.notes,
      virtual: false,
    };
  });

  if (params.status) {
    rows = rows.filter((row) => row.status === params.status);
  }

  const page = paginate(rows, params.page, params.limit ?? 50);
  const summaryRecords = records.filter(
    (row) => asDateOnlyRequired(row.date ?? row.attendanceDate) === date,
  );
  let present = 0;
  let halfDay = 0;
  let holiday = 0;
  for (const row of summaryRecords) {
    const status = toPublicStatus(asString(row.status));
    if (status === 'PRESENT') present += 1;
    if (status === 'HALF_DAY') halfDay += 1;
    if (status === 'HOLIDAY') holiday += 1;
  }
  const totalEmployees = employees.length;
  const onLeave = Math.max(0, totalEmployees - present - halfDay - holiday);

  return {
    summary: {
      date,
      totalEmployees,
      present,
      absent: 0,
      late: 0,
      halfDay,
      onLeave,
    },
    hours,
    ...page,
  };
}

export async function fetchAttendanceHistory(
  params: AttendanceHistoryParams = {},
): Promise<PaginatedAttendance> {
  const employees = await loadEmployeeMap();
  const search = params.search?.trim() ?? '';
  let rows = (await listCollection('attendances'))
    .map((row) => {
      const employee = employees.get(asString(row.employeeId));
      if (!employee) {
        return null;
      }
      return mapAttendance(row, toEmployeeSummary(employee));
    })
    .filter((row): row is AttendanceRecord => row !== null);

  if (params.employeeId) {
    rows = rows.filter((row) => row.employeeId === params.employeeId);
  }
  if (params.date) {
    rows = rows.filter((row) => row.attendanceDate === params.date);
  }
  if (params.startDate) {
    rows = rows.filter((row) => row.attendanceDate >= params.startDate!);
  }
  if (params.endDate) {
    rows = rows.filter((row) => row.attendanceDate <= params.endDate!);
  }
  if (params.status) {
    rows = rows.filter((row) => row.status === params.status);
  }
  if (params.lateOnly) {
    rows = rows.filter((row) => (row.lateMinutes ?? 0) > 0);
  }
  if (params.absentOnly) {
    rows = rows.filter((row) => row.status === 'ON_LEAVE' && !row.checkIn);
  }
  if (search) {
    rows = rows.filter(
      (row) =>
        includesInsensitive(row.employee.fullName, search) ||
        includesInsensitive(row.employee.employeeCode, search),
    );
  }
  rows.sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));
  return paginate(rows, params.page, params.limit);
}

export async function fetchAttendance(id: string): Promise<AttendanceRecord> {
  const row = await getById('attendances', id);
  const employee = await fetchEmployee(asString(row.employeeId));
  return mapAttendance(row, toEmployeeSummary(employee));
}

export async function checkInEmployee(employeeId: string, checkIn?: string): Promise<AttendanceRecord> {
  const employee = await fetchEmployee(employeeId);
  const hours = await workingHours();
  const date = calendarDate(hours.timezone);
  const existing = (await listCollection('attendances')).find(
    (row) => asString(row.employeeId) === employeeId && asDateOnlyRequired(row.date) === date,
  );
  if (existing) {
    throw new ApiError('Attendance for today is already recorded', 409);
  }

  const checkInAt = checkIn ? new Date(checkIn) : new Date();
  const metrics = calculateAttendanceMetrics(checkInAt, null, date, hours);
  const created = await createRecord('attendances', {
    employeeId,
    date,
    checkIn: checkInAt.toISOString(),
    checkOut: null,
    status: metrics.status,
    lateMinutes: metrics.lateMinutes,
    workingMinutes: metrics.workingMinutes,
    source: 'MANUAL',
    notes: null,
  });
  if (metrics.lateMinutes > hours.lateThresholdMinutes) {
    await addDoc(collection(getDb(), 'notifications'), {
      type: 'ATTENDANCE_ALERT',
      title: 'Late check-in',
      message: `${employee.fullName} checked in late.`,
      employeeId,
      documentId: null,
      isRead: false,
      readAt: null,
      eventKey: `attendance-late:${created.id}`,
      createdAt: serverTimestamp(),
    });
  }
  await writeAudit('check-in', 'attendance', created.id);
  return mapAttendance(created, toEmployeeSummary(employee));
}

export async function checkOutAttendance(id: string, checkOut?: string): Promise<AttendanceRecord> {
  const current = await getById('attendances', id);
  if (!current.checkIn) {
    throw new ApiError('Check-in is required before check-out', 400);
  }
  if (current.checkOut) {
    throw new ApiError('Check-out has already been recorded', 409);
  }
  const hours = await workingHours();
  const date = asDateOnlyRequired(current.date);
  const checkOutAt = checkOut ? new Date(checkOut) : new Date();
  const metrics = calculateAttendanceMetrics(new Date(asIso(current.checkIn)), checkOutAt, date, hours);
  const updated = await updateRecord('attendances', id, {
    checkOut: checkOutAt.toISOString(),
    status: metrics.status,
    lateMinutes: metrics.lateMinutes,
    workingMinutes: metrics.workingMinutes,
  });
  const employee = await fetchEmployee(asString(updated.employeeId));
  await writeAudit('check-out', 'attendance', id);
  return mapAttendance(updated, toEmployeeSummary(employee));
}

export async function markDayAttendance(
  employeeId: string,
  status: AttendanceStatus,
): Promise<AttendanceRecord> {
  const employee = await fetchEmployee(employeeId);
  const hours = await workingHours();
  const date = calendarDate(hours.timezone);
  const existing = (await listCollection('attendances')).find(
    (row) => asString(row.employeeId) === employeeId && asDateOnlyRequired(row.date) === date,
  );
  const clearsTimes = status === 'ON_LEAVE' || status === 'HOLIDAY' || status === 'ABSENT';
  const payload = {
    employeeId,
    date,
    status,
    source: 'MANUAL',
    ...(clearsTimes
      ? { checkIn: null, checkOut: null, lateMinutes: null, workingMinutes: null }
      : {}),
  };
  const saved = existing
    ? await updateRecord('attendances', existing.id, payload)
    : await createRecord('attendances', payload);
  requireUser();
  await writeAudit('mark-day', 'attendance', saved.id);
  return mapAttendance(saved, toEmployeeSummary(employee));
}
