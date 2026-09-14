import { EmployeeStatus, Gender } from '@prisma/client';

export const PUBLIC_EMPLOYMENT_STATUSES = [
  EmployeeStatus.ACTIVE,
  EmployeeStatus.INACTIVE,
  EmployeeStatus.TERMINATED,
  EmployeeStatus.ON_LEAVE,
] as const;

export type PublicEmploymentStatus =
  (typeof PUBLIC_EMPLOYMENT_STATUSES)[number];

export interface EmployeeResponse {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  nationality: string | null;
  jobTitle: string | null;
  joiningDate: string | null;
  employmentStatus: EmployeeStatus;
  basicSalary: number | null;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedEmployees {
  data: EmployeeResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
