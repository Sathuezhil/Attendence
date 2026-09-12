import { apiRequest } from '@/lib/api';
import { DashboardSummary, RecentActivityResponse } from './types';

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>('/dashboard/summary');
}

export function fetchRecentActivity(): Promise<RecentActivityResponse> {
  return apiRequest<RecentActivityResponse>('/dashboard/recent-activity');
}
