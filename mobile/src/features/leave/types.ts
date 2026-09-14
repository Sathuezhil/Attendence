export type LeaveType = 'ANNUAL' | 'SICK' | 'UNPAID' | 'EMERGENCY' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  department: string | null;
  jobTitle: string | null;
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  employee: LeaveEmployee;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  status: LeaveStatus;
  approvedById: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedLeave {
  data: LeaveRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateLeavePayload {
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}
