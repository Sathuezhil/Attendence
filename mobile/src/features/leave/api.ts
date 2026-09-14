import { apiRequest } from '@/lib/api';
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

function toQuery(params: LeaveListParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export function fetchLeaves(params: LeaveListParams = {}): Promise<PaginatedLeave> {
  return apiRequest<PaginatedLeave>(`/leave${toQuery(params)}`);
}

export function fetchLeave(id: string): Promise<LeaveRecord> {
  return apiRequest<LeaveRecord>(`/leave/${id}`);
}

export function createLeave(payload: CreateLeavePayload): Promise<LeaveRecord> {
  return apiRequest<LeaveRecord>('/leave', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function approveLeave(id: string): Promise<LeaveRecord> {
  return apiRequest<LeaveRecord>(`/leave/${id}/approve`, { method: 'POST' });
}

export function rejectLeave(id: string, rejectionReason: string): Promise<LeaveRecord> {
  return apiRequest<LeaveRecord>(`/leave/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejectionReason }),
  });
}

export function cancelLeave(id: string): Promise<LeaveRecord> {
  return apiRequest<LeaveRecord>(`/leave/${id}/cancel`, { method: 'POST' });
}
