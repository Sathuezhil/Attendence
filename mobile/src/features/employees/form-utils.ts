import { Employee, EmployeeWritePayload } from './types';
import { EmployeeFormValues } from './schema';

export const emptyEmployeeForm: EmployeeFormValues = {
  firstName: '',
  lastName: '',
  dateOfBirth: undefined,
  gender: undefined,
  nationality: undefined,
  email: undefined,
  phone: undefined,
  alternatePhone: undefined,
  employeeCode: '',
  jobTitle: undefined,
  joiningDate: undefined,
  employmentStatus: 'ACTIVE',
  basicSalary: undefined,
};

export function employeeToFormValues(employee: Employee): EmployeeFormValues {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    dateOfBirth: employee.dateOfBirth ?? undefined,
    gender: employee.gender ?? undefined,
    nationality: employee.nationality ?? undefined,
    email: employee.email ?? undefined,
    phone: employee.phone ?? undefined,
    alternatePhone: employee.alternatePhone ?? undefined,
    employeeCode: employee.employeeCode,
    jobTitle: employee.jobTitle ?? undefined,
    joiningDate: employee.joiningDate ?? undefined,
    employmentStatus: employee.employmentStatus,
    basicSalary: employee.basicSalary === null ? undefined : String(employee.basicSalary),
  };
}

function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function formValuesToPayload(
  values: EmployeeFormValues,
  mode: 'create' | 'update' = 'create',
): EmployeeWritePayload {
  const payload: EmployeeWritePayload = {
    employeeCode: values.employeeCode.trim(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    employmentStatus: values.employmentStatus,
  };

  const email = present(values.email);
  const phone = present(values.phone);
  const alternatePhone = present(values.alternatePhone);
  const dateOfBirth = present(values.dateOfBirth);
  const nationality = present(values.nationality);
  const jobTitle = present(values.jobTitle);
  const joiningDate = present(values.joiningDate);
  const basicSalary = present(values.basicSalary);

  if (email) payload.email = email;
  else if (mode === 'update') payload.email = null;

  if (phone) payload.phone = phone;
  else if (mode === 'update') payload.phone = null;

  if (alternatePhone) payload.alternatePhone = alternatePhone;
  else if (mode === 'update') payload.alternatePhone = null;

  if (dateOfBirth) payload.dateOfBirth = dateOfBirth;
  else if (mode === 'update') payload.dateOfBirth = null;

  if (values.gender) payload.gender = values.gender;
  else if (mode === 'update') payload.gender = null;

  if (nationality) payload.nationality = nationality;
  else if (mode === 'update') payload.nationality = null;

  if (jobTitle) payload.jobTitle = jobTitle;
  else if (mode === 'update') payload.jobTitle = null;

  if (joiningDate) payload.joiningDate = joiningDate;
  else if (mode === 'update') payload.joiningDate = null;

  if (basicSalary) payload.basicSalary = Number(basicSalary);
  else if (mode === 'update') payload.basicSalary = null;

  return payload;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'E';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function statusLabel(status: string): string {
  return status.replaceAll('_', ' ');
}
