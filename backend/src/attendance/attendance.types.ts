import { AttendanceStatus } from '@prisma/client';
import { WorkingHours } from './working-hours';

export const PUBLIC_ATTENDANCE_STATUSES = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.ABSENT,
  AttendanceStatus.LATE,
  AttendanceStatus.HALF_DAY,
  AttendanceStatus.ON_LEAVE,
  AttendanceStatus.HOLIDAY,
] as const;

export type PublicAttendanceStatus =
  (typeof PUBLIC_ATTENDANCE_STATUSES)[number];

export interface AttendanceEmployeeSummary {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle: string | null;
}

export interface AttendanceResponse {
  id: string;
  employeeId: string;
  employee: AttendanceEmployeeSummary;
  attendanceDate: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  lateMinutes: number | null;
  workingMinutes: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceDayRow {
  employeeId: string;
  employee: AttendanceEmployeeSummary;
  attendanceId: string | null;
  attendanceDate: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  lateMinutes: number | null;
  workingMinutes: number | null;
  notes: string | null;
  virtual: boolean;
}

export interface AttendanceSummary {
  date: string;
  totalEmployees: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
}

export interface TodayAttendanceResponse {
  summary: AttendanceSummary;
  hours: WorkingHours;
  data: AttendanceDayRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedAttendance {
  data: AttendanceResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
