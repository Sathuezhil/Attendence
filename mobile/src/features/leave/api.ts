import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ApiError } from '@/lib/api';
import {
  asDateOnlyRequired,
  asIso,
  asIsoOrNull,
  asNumber,
  asString,
  asStringOrNull,
  createRecord,
  daysInclusive,
  getById,
  includesInsensitive,
  listCollection,
  paginate,
  updateRecord,
  writeAudit,
} from '@/lib/data';
import { getDb, requireUser } from '@/lib/firebase';
import { fetchEmployee, loadEmployeeMap } from '@/features/employees/api';
import {
  CreateLeavePayload,
  LeaveRecord,
  LeaveStatus,
  LeaveType,
  PaginatedLeave,
} from './types';

export interface LeaveListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  status?: LeaveStatus;
  leaveType?: LeaveType;
  startDate?: string;
  endDate?: string;
  search?: string;
}

function mapLeave(
  row: Record<string, unknown> & { id: string },
  employee: LeaveRecord['employee'],
): LeaveRecord {
  return {
    id: row.id,
    employeeId: asString(row.employeeId),
    employee,
    leaveType: asString(row.leaveType, 'ANNUAL') as LeaveType,
    startDate: asDateOnlyRequired(row.startDate),
    endDate: asDateOnlyRequired(row.endDate),
    totalDays: asNumber(row.totalDays, daysInclusive(asDateOnlyRequired(row.startDate), asDateOnlyRequired(row.endDate))),
    reason: asStringOrNull(row.reason),
    status: asString(row.status, 'PENDING') as LeaveStatus,
    approvedById: asStringOrNull(row.approvedById),
    approvedAt: asIsoOrNull(row.approvedAt),
    rejectionReason: asStringOrNull(row.rejectionReason),
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

async function toLeave(row: Record<string, unknown> & { id: string }): Promise<LeaveRecord> {
  const employees = await loadEmployeeMap();
  const employee = employees.get(asString(row.employeeId));
  if (!employee) {
    throw new ApiError('Employee not found', 404);
  }
  return mapLeave(row, {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    fullName: employee.fullName,
    jobTitle: employee.jobTitle,
  });
}

export async function fetchLeaves(params: LeaveListParams = {}): Promise<PaginatedLeave> {
  const employees = await loadEmployeeMap();
  const search = params.search?.trim() ?? '';
  let rows = (await listCollection('leaves'))
    .map((row) => {
      const employee = employees.get(asString(row.employeeId));
      if (!employee) {
        return null;
      }
      return mapLeave(row, {
        id: employee.id,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        fullName: employee.fullName,
        jobTitle: employee.jobTitle,
      });
    })
    .filter((row): row is LeaveRecord => row !== null);

  if (params.employeeId) rows = rows.filter((row) => row.employeeId === params.employeeId);
  if (params.status) rows = rows.filter((row) => row.status === params.status);
  if (params.leaveType) rows = rows.filter((row) => row.leaveType === params.leaveType);
  if (params.startDate) rows = rows.filter((row) => row.endDate >= params.startDate!);
  if (params.endDate) rows = rows.filter((row) => row.startDate <= params.endDate!);
  if (search) {
    rows = rows.filter(
      (row) =>
        includesInsensitive(row.employee.fullName, search) ||
        includesInsensitive(row.employee.employeeCode, search),
    );
  }
  rows.sort((a, b) => b.startDate.localeCompare(a.startDate));
  return paginate(rows, params.page, params.limit);
}

export async function fetchLeave(id: string): Promise<LeaveRecord> {
  return toLeave(await getById('leaves', id));
}

export async function createLeave(payload: CreateLeavePayload): Promise<LeaveRecord> {
  await fetchEmployee(payload.employeeId);
  if (payload.endDate < payload.startDate) {
    throw new ApiError('endDate cannot be before startDate', 400);
  }
  const created = await createRecord('leaves', {
    employeeId: payload.employeeId,
    leaveType: payload.leaveType,
    startDate: payload.startDate,
    endDate: payload.endDate,
    totalDays: daysInclusive(payload.startDate, payload.endDate),
    reason: payload.reason ?? null,
    status: 'PENDING',
    approvedById: null,
    approvedAt: null,
    rejectionReason: null,
  });
  await writeAudit('create', 'leave', created.id);
  return toLeave(created);
}

async function notifyLeave(record: LeaveRecord, type: 'LEAVE_APPROVED' | 'LEAVE_REJECTED') {
  await addDoc(collection(getDb(), 'notifications'), {
    type,
    title: type === 'LEAVE_APPROVED' ? 'Leave approved' : 'Leave rejected',
    message: `${record.employee.fullName}'s leave was ${type === 'LEAVE_APPROVED' ? 'approved' : 'rejected'}.`,
    employeeId: record.employeeId,
    documentId: null,
    isRead: false,
    readAt: null,
    eventKey: `leave:${type}:${record.id}`,
    createdAt: serverTimestamp(),
  });
}

export async function approveLeave(id: string): Promise<LeaveRecord> {
  const current = await fetchLeave(id);
  if (current.status !== 'PENDING') {
    throw new ApiError('Only pending leave can be approved', 400);
  }
  const user = requireUser();
  const updated = await updateRecord('leaves', id, {
    status: 'APPROVED',
    approvedById: user.uid,
    approvedAt: new Date().toISOString(),
  });
  const mapped = await toLeave(updated);
  await notifyLeave(mapped, 'LEAVE_APPROVED');
  await writeAudit('approve', 'leave', id);
  return mapped;
}

export async function rejectLeave(id: string, rejectionReason: string): Promise<LeaveRecord> {
  const current = await fetchLeave(id);
  if (current.status !== 'PENDING') {
    throw new ApiError('Only pending leave can be rejected', 400);
  }
  const updated = await updateRecord('leaves', id, {
    status: 'REJECTED',
    rejectionReason,
    approvedById: requireUser().uid,
    approvedAt: new Date().toISOString(),
  });
  const mapped = await toLeave(updated);
  await notifyLeave(mapped, 'LEAVE_REJECTED');
  await writeAudit('reject', 'leave', id);
  return mapped;
}

export async function cancelLeave(id: string): Promise<LeaveRecord> {
  const current = await fetchLeave(id);
  if (current.status === 'CANCELLED') {
    return current;
  }
  const updated = await updateRecord('leaves', id, { status: 'CANCELLED' });
  await writeAudit('cancel', 'leave', id);
  return toLeave(updated);
}
