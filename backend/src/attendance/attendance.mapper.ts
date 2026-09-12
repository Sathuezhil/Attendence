import { Attendance, AttendanceStatus, Employee } from '@prisma/client';
import {
  AttendanceDayRow,
  AttendanceEmployeeSummary,
  AttendanceResponse,
} from './attendance.types';
import { toDateOnly } from './working-hours';

type AttendanceWithEmployee = Attendance & {
  employee: Pick<
    Employee,
    'id' | 'employeeCode' | 'firstName' | 'lastName' | 'department' | 'jobTitle'
  >;
};

export function toPublicStatus(status: AttendanceStatus): AttendanceStatus {
  return status === AttendanceStatus.LEAVE ? AttendanceStatus.ON_LEAVE : status;
}

export function toEmployeeSummary(
  employee: Pick<
    Employee,
    'id' | 'employeeCode' | 'firstName' | 'lastName' | 'department' | 'jobTitle'
  >,
): AttendanceEmployeeSummary {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    fullName: `${employee.firstName} ${employee.lastName}`.trim(),
    department: employee.department,
    jobTitle: employee.jobTitle,
  };
}

export function toAttendanceResponse(
  record: AttendanceWithEmployee,
): AttendanceResponse {
  return {
    id: record.id,
    employeeId: record.employeeId,
    employee: toEmployeeSummary(record.employee),
    attendanceDate: toDateOnly(record.date),
    checkIn: record.checkIn?.toISOString() ?? null,
    checkOut: record.checkOut?.toISOString() ?? null,
    status: toPublicStatus(record.status),
    lateMinutes: record.lateMinutes,
    workingMinutes: record.workingMinutes,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toDayRow(
  employee: AttendanceEmployeeSummary,
  attendanceDate: string,
  record?: AttendanceWithEmployee,
): AttendanceDayRow {
  if (!record) {
    return {
      employeeId: employee.id,
      employee,
      attendanceId: null,
      attendanceDate,
      checkIn: null,
      checkOut: null,
      status: AttendanceStatus.ABSENT,
      lateMinutes: null,
      workingMinutes: null,
      notes: null,
      virtual: true,
    };
  }

  return {
    employeeId: employee.id,
    employee,
    attendanceId: record.id,
    attendanceDate,
    checkIn: record.checkIn?.toISOString() ?? null,
    checkOut: record.checkOut?.toISOString() ?? null,
    status: toPublicStatus(record.status),
    lateMinutes: record.lateMinutes,
    workingMinutes: record.workingMinutes,
    notes: record.notes,
    virtual: false,
  };
}
