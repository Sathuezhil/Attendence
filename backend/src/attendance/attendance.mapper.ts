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
    'id' | 'employeeCode' | 'firstName' | 'lastName' | 'jobTitle'
  >;
};

export function toPublicStatus(status: AttendanceStatus): AttendanceStatus {
  if (
    status === AttendanceStatus.LEAVE ||
    status === AttendanceStatus.ABSENT
  ) {
    return AttendanceStatus.ON_LEAVE;
  }

  if (status === AttendanceStatus.LATE) {
    return AttendanceStatus.PRESENT;
  }

  return status;
}

export function storedStatusesForPublic(
  status: AttendanceStatus,
): AttendanceStatus[] {
  if (status === AttendanceStatus.PRESENT) {
    return [AttendanceStatus.PRESENT, AttendanceStatus.LATE];
  }
  if (
    status === AttendanceStatus.ON_LEAVE ||
    status === AttendanceStatus.LEAVE ||
    status === AttendanceStatus.ABSENT
  ) {
    return [
      AttendanceStatus.ON_LEAVE,
      AttendanceStatus.LEAVE,
      AttendanceStatus.ABSENT,
    ];
  }
  return [status];
}

export function toEmployeeSummary(
  employee: Pick<
    Employee,
    'id' | 'employeeCode' | 'firstName' | 'lastName' | 'jobTitle'
  >,
): AttendanceEmployeeSummary {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    fullName: `${employee.firstName} ${employee.lastName}`.trim(),
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
      status: AttendanceStatus.ON_LEAVE,
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
