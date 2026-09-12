import { apiRequest } from '@/lib/api';
import {
  Employee,
  EmployeeWritePayload,
  PaginatedEmployees,
} from './types';

export interface EmployeeListParams {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  employmentStatus?: string;
  jobTitle?: string;
}

export function fetchEmployees(params: EmployeeListParams = {}): Promise<PaginatedEmployees> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.department) query.set('department', params.department);
  if (params.employmentStatus) query.set('employmentStatus', params.employmentStatus);
  if (params.jobTitle) query.set('jobTitle', params.jobTitle);

  const suffix = query.toString();
  return apiRequest<PaginatedEmployees>(`/employees${suffix ? `?${suffix}` : ''}`);
}

export function fetchEmployee(id: string): Promise<Employee> {
  return apiRequest<Employee>(`/employees/${id}`);
}

export function createEmployee(payload: EmployeeWritePayload): Promise<Employee> {
  return apiRequest<Employee>('/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateEmployee(id: string, payload: EmployeeWritePayload): Promise<Employee> {
  return apiRequest<Employee>(`/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deactivateEmployee(id: string): Promise<Employee> {
  return apiRequest<Employee>(`/employees/${id}`, {
    method: 'DELETE',
  });
}
