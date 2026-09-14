import { Employee, Leave } from '@prisma/client';
import { toDateOnly } from '../attendance/working-hours';
import { LeaveEmployeeSummary, LeaveResponse } from './leave.types';

type LeaveWithEmployee = Leave & {
  employee: Pick<
    Employee,
    'id' | 'employeeCode' | 'firstName' | 'lastName' | 'jobTitle'
  >;
};

export function toLeaveEmployeeSummary(
  employee: Pick<
    Employee,
    'id' | 'employeeCode' | 'firstName' | 'lastName' | 'jobTitle'
  >,
): LeaveEmployeeSummary {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    fullName: `${employee.firstName} ${employee.lastName}`.trim(),
    jobTitle: employee.jobTitle,
  };
}

export function toLeaveResponse(record: LeaveWithEmployee): LeaveResponse {
  return {
    id: record.id,
    employeeId: record.employeeId,
    employee: toLeaveEmployeeSummary(record.employee),
    leaveType: record.leaveType,
    startDate: toDateOnly(record.startDate),
    endDate: toDateOnly(record.endDate),
    totalDays: record.totalDays,
    reason: record.reason,
    status: record.status,
    approvedById: record.approvedById,
    approvedAt: record.approvedAt?.toISOString() ?? null,
    rejectionReason: record.rejectionReason,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
