import { useQuery } from '@tanstack/react-query';
import { fetchDashboardSummary, fetchRecentActivity } from './api';

export const dashboardSummaryQueryKey = ['dashboard', 'summary'] as const;
export const recentActivityQueryKey = ['dashboard', 'recent-activity'] as const;

export function useDashboardSummaryQuery(enabled: boolean) {
  return useQuery({
    queryKey: dashboardSummaryQueryKey,
    queryFn: fetchDashboardSummary,
    enabled,
  });
}

export function useRecentActivityQuery(enabled: boolean) {
  return useQuery({
    queryKey: recentActivityQueryKey,
    queryFn: fetchRecentActivity,
    enabled,
  });
}
