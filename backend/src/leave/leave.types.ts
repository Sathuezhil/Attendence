import { LeaveRequestStatus, LeaveType } from '@prisma/client';

export interface LeaveEmployeeSummary {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  department: string | null;
  jobTitle: string | null;
}

export interface LeaveResponse {
  id: string;
  employeeId: string;
  employee: LeaveEmployeeSummary;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  status: LeaveRequestStatus;
  approvedById: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedLeave {
  data: LeaveResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
