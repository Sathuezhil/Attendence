export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ON_LEAVE';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  authUid: string | null;
  phone: string | null;
  alternatePhone: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  nationality: string | null;
  jobTitle: string | null;
  joiningDate: string | null;
  employmentStatus: EmploymentStatus;
  basicSalary: number | null;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedEmployees {
  data: Employee[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EmployeeWritePayload {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  nationality?: string | null;
  jobTitle?: string | null;
  joiningDate?: string | null;
  employmentStatus?: EmploymentStatus;
  basicSalary?: number | null;
}
