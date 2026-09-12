import { apiRequest } from '@/lib/api';
import {
  AttendanceRecord,
  AttendanceStatus,
  PaginatedAttendance,
  TodayAttendanceResponse,
} from './types';

export interface TodayAttendanceParams {
  date?: string;
  search?: string;
  status?: AttendanceStatus;
  department?: string;
  page?: number;
  limit?: number;
}

export interface AttendanceHistoryParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
  department?: string;
}

function toQuery(
  params: TodayAttendanceParams | AttendanceHistoryParams,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export function fetchTodayAttendance(
  params: TodayAttendanceParams = {},
): Promise<TodayAttendanceResponse> {
  return apiRequest<TodayAttendanceResponse>(`/attendance/today${toQuery(params)}`);
}

export function fetchAttendanceHistory(
  params: AttendanceHistoryParams = {},
): Promise<PaginatedAttendance> {
  return apiRequest<PaginatedAttendance>(`/attendance${toQuery(params)}`);
}

export function fetchAttendance(id: string): Promise<AttendanceRecord> {
  return apiRequest<AttendanceRecord>(`/attendance/${id}`);
}

export function checkInEmployee(employeeId: string, checkIn?: string): Promise<AttendanceRecord> {
  return apiRequest<AttendanceRecord>('/attendance/check-in', {
    method: 'POST',
    body: JSON.stringify({ employeeId, checkIn }),
  });
}

export function checkOutAttendance(id: string, checkOut?: string): Promise<AttendanceRecord> {
  return apiRequest<AttendanceRecord>(`/attendance/${id}/check-out`, {
    method: 'POST',
    body: JSON.stringify({ checkOut }),
  });
}
