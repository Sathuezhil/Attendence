export interface DashboardSummary {
  employees: number;
  activeEmployees: number;
  onLeaveToday: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  documentsExpired: number;
  documentsExpiringSoon: number;
}

export interface DashboardActivity {
  id: string;
  type: string;
  description: string;
  occurredAt: string;
}

export interface RecentActivityResponse {
  activities: DashboardActivity[];
}
