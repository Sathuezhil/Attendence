import { Employee } from '@prisma/client';
import { EmployeeResponse } from './employees.types';

function toDateOnly(value: Date | null): string | null {
  if (!value) {
    return null;
  }

  return value.toISOString().slice(0, 10);
}

export function toEmployeeResponse(employee: Employee): EmployeeResponse {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    fullName: `${employee.firstName} ${employee.lastName}`.trim(),
    email: employee.email,
    phone: employee.phone,
    alternatePhone: employee.alternatePhone,
    dateOfBirth: toDateOnly(employee.dateOfBirth),
    gender: employee.gender,
    nationality: employee.nationality,
    jobTitle: employee.jobTitle,
    joiningDate: toDateOnly(employee.joiningDate),
    employmentStatus: employee.status,
    basicSalary: employee.salary === null ? null : Number(employee.salary),
    profileImageUrl: employee.profileImageUrl,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  };
}

export function emptyToNull(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
