import { ApiError } from '@/lib/api';
import {
  asDateOnly,
  asIso,
  asNumberOrNull,
  asString,
  asStringOrNull,
  createRecord,
  emptyToNull,
  fullName,
  includesInsensitive,
  listCollection,
  paginate,
  updateRecord,
  writeAudit,
} from '@/lib/data';
import {
  Employee,
  EmployeeWritePayload,
  EmploymentStatus,
  Gender,
  PaginatedEmployees,
} from './types';

export interface EmployeeListParams {
  page?: number;
  limit?: number;
  search?: string;
  employmentStatus?: string;
  jobTitle?: string;
  joiningFrom?: string;
  joiningTo?: string;
}

export function mapEmployee(row: Record<string, unknown> & { id: string }): Employee {
  return {
    id: row.id,
    employeeCode: asString(row.employeeCode),
    firstName: asString(row.firstName),
    lastName: asString(row.lastName),
    fullName: fullName(row.firstName, row.lastName),
    email: asStringOrNull(row.email),
    phone: asStringOrNull(row.phone),
    alternatePhone: asStringOrNull(row.alternatePhone),
    dateOfBirth: asDateOnly(row.dateOfBirth),
    gender: (asStringOrNull(row.gender) as Gender | null) ?? null,
    nationality: asStringOrNull(row.nationality),
    jobTitle: asStringOrNull(row.jobTitle),
    joiningDate: asDateOnly(row.joiningDate),
    employmentStatus: (asString(row.status, 'ACTIVE') as EmploymentStatus) || 'ACTIVE',
    basicSalary: asNumberOrNull(row.salary),
    profileImageUrl: asStringOrNull(row.profileImageUrl),
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

export function isActiveEmployee(row: Record<string, unknown>): boolean {
  return row.deletedAt == null;
}

export async function loadEmployeeRows() {
  const rows = await listCollection('employees');
  return rows.filter(isActiveEmployee);
}

export async function loadEmployeeMap() {
  const rows = await loadEmployeeRows();
  return new Map(rows.map((row) => [row.id, mapEmployee(row)]));
}

function assertDateRules(dateOfBirth?: string | null, joiningDate?: string | null): void {
  const today = new Date().toISOString().slice(0, 10);
  if (dateOfBirth && dateOfBirth >= today) {
    throw new ApiError('dateOfBirth must be in the past', 400);
  }
  if (joiningDate && dateOfBirth && joiningDate <= dateOfBirth) {
    throw new ApiError('joiningDate must be after dateOfBirth', 400);
  }
}

function toWriteData(payload: EmployeeWritePayload) {
  return {
    employeeCode: payload.employeeCode.trim(),
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    email: emptyToNull(payload.email ?? null) ?? null,
    phone: emptyToNull(payload.phone ?? null) ?? null,
    alternatePhone: emptyToNull(payload.alternatePhone ?? null) ?? null,
    dateOfBirth: payload.dateOfBirth ?? null,
    gender: payload.gender ?? null,
    nationality: emptyToNull(payload.nationality ?? null) ?? null,
    jobTitle: emptyToNull(payload.jobTitle ?? null) ?? null,
    joiningDate: payload.joiningDate ?? null,
    status: payload.employmentStatus ?? 'ACTIVE',
    salary: payload.basicSalary ?? null,
    deletedAt: null,
  };
}

export async function fetchEmployees(params: EmployeeListParams = {}): Promise<PaginatedEmployees> {
  const search = params.search?.trim() ?? '';
  let rows = (await loadEmployeeRows()).map(mapEmployee);

  if (params.employmentStatus) {
    rows = rows.filter((row) => row.employmentStatus === params.employmentStatus);
  }
  if (params.jobTitle) {
    rows = rows.filter((row) => includesInsensitive(row.jobTitle, params.jobTitle ?? ''));
  }
  if (params.joiningFrom) {
    rows = rows.filter((row) => (row.joiningDate ?? '') >= params.joiningFrom!);
  }
  if (params.joiningTo) {
    rows = rows.filter((row) => (row.joiningDate ?? '') <= params.joiningTo!);
  }
  if (search) {
    rows = rows.filter(
      (row) =>
        includesInsensitive(row.employeeCode, search) ||
        includesInsensitive(row.firstName, search) ||
        includesInsensitive(row.lastName, search) ||
        includesInsensitive(row.email, search) ||
        includesInsensitive(row.phone, search) ||
        includesInsensitive(row.jobTitle, search),
    );
  }

  rows.sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  return paginate(rows, params.page, params.limit);
}

export async function fetchEmployee(id: string): Promise<Employee> {
  const rows = await loadEmployeeRows();
  const row = rows.find((item) => item.id === id);
  if (!row) {
    throw new ApiError('Employee not found', 404);
  }
  return mapEmployee(row);
}

export async function createEmployee(payload: EmployeeWritePayload): Promise<Employee> {
  assertDateRules(payload.dateOfBirth, payload.joiningDate);
  const existing = await loadEmployeeRows();
  const code = payload.employeeCode.trim().toLowerCase();
  const email = payload.email?.trim().toLowerCase();
  if (existing.some((row) => asString(row.employeeCode).toLowerCase() === code)) {
    throw new ApiError('An employee with this code already exists', 409);
  }
  if (email && existing.some((row) => asString(row.email).toLowerCase() === email)) {
    throw new ApiError('An employee with this email already exists', 409);
  }

  const created = await createRecord('employees', toWriteData(payload));
  await writeAudit('create', 'employee', created.id);
  return mapEmployee(created);
}

export async function updateEmployee(id: string, payload: EmployeeWritePayload): Promise<Employee> {
  await fetchEmployee(id);
  assertDateRules(payload.dateOfBirth, payload.joiningDate);
  const existing = await loadEmployeeRows();
  const code = payload.employeeCode.trim().toLowerCase();
  const email = payload.email?.trim().toLowerCase();
  if (existing.some((row) => row.id !== id && asString(row.employeeCode).toLowerCase() === code)) {
    throw new ApiError('An employee with this code already exists', 409);
  }
  if (email && existing.some((row) => row.id !== id && asString(row.email).toLowerCase() === email)) {
    throw new ApiError('An employee with this email already exists', 409);
  }

  const updated = await updateRecord('employees', id, toWriteData(payload));
  await writeAudit('update', 'employee', id);
  return mapEmployee(updated);
}

export async function deleteEmployee(id: string): Promise<Employee> {
  await fetchEmployee(id);
  const updated = await updateRecord('employees', id, {
    status: 'INACTIVE',
    deletedAt: new Date().toISOString(),
  });
  await writeAudit('delete', 'employee', id);
  return mapEmployee(updated);
}
