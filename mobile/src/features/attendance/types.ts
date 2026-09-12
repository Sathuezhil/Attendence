export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY';

export interface AttendanceEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  department: string | null;
  jobTitle: string | null;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee: AttendanceEmployee;
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
  employee: AttendanceEmployee;
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

export interface WorkingHours {
  start: string;
  end: string;
  lateThresholdMinutes: number;
  halfDayMinutes: number;
  timezone: string;
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
  data: AttendanceRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
