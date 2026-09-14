import { type Href, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-context';
import { DashboardHeader } from '@/features/dashboard/dashboard-header';
import { ExpiryAlerts } from '@/features/dashboard/expiry-alerts';
import { QuickActions } from '@/features/dashboard/quick-actions';
import { RecentActivityList } from '@/features/dashboard/recent-activity-list';
import { SummaryCards } from '@/features/dashboard/summary-cards';
import {
  useDashboardSummaryQuery,
  useRecentActivityQuery,
} from '@/features/dashboard/use-dashboard-queries';
import { fetchExpiryAlerts, fetchUnreadCount } from '@/features/notifications/api';
import { ApiError } from '@/lib/api';

export default function DashboardScreen() {
  const { isReady, isAuthenticated, user, logout, refreshProfile } = useAuth();
  const canLoadDashboard = isReady && isAuthenticated;
  const summaryQuery = useDashboardSummaryQuery(canLoadDashboard);
  const activityQuery = useRecentActivityQuery(canLoadDashboard);
  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    enabled: canLoadDashboard,
  });
  const alertsQuery = useQuery({
    queryKey: ['dashboard', 'expiry-alerts'],
    queryFn: fetchExpiryAlerts,
    enabled: canLoadDashboard,
  });

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isReady, isAuthenticated]);

  const profileLoaded = useRef(false);

  useEffect(() => {
    if (!canLoadDashboard || profileLoaded.current) {
      return;
    }

    profileLoaded.current = true;
    void refreshProfile().catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        void logout().then(() => router.replace('/login'));
      }
    });
  }, [canLoadDashboard, logout, refreshProfile]);

  useEffect(() => {
    const unauthorized =
      (summaryQuery.error instanceof ApiError && summaryQuery.error.status === 401) ||
      (activityQuery.error instanceof ApiError && activityQuery.error.status === 401);

    if (unauthorized) {
      void logout().then(() => router.replace('/login'));
    }
  }, [activityQuery.error, logout, summaryQuery.error]);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  if (!isReady || !isAuthenticated || !user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DashboardHeader
          user={user}
          unreadCount={unreadQuery.data?.count ?? 0}
          onOpenNotifications={() => router.push('/notifications' as Href)}
          onLogout={() => void handleLogout()}
        />

        <View style={styles.section}>
          {summaryQuery.isPending ? (
            <View style={styles.panel}>
              <ActivityIndicator color="#111827" />
              <Text style={styles.panelText}>Loading summary…</Text>
            </View>
          ) : null}

          {summaryQuery.error && !(summaryQuery.error instanceof ApiError && summaryQuery.error.status === 401) ? (
            <View style={styles.panel}>
              <Text style={styles.errorText}>{summaryQuery.error.message}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void summaryQuery.refetch()}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {summaryQuery.data ? <SummaryCards summary={summaryQuery.data} /> : null}
        </View>

        {alertsQuery.isPending ? (
          <View style={styles.panel}>
            <ActivityIndicator color="#111827" />
            <Text style={styles.panelText}>Loading expiry alerts…</Text>
          </View>
        ) : null}

        {alertsQuery.error && !(alertsQuery.error instanceof ApiError && alertsQuery.error.status === 401) ? (
          <View style={styles.panel}>
            <Text style={styles.errorText}>{alertsQuery.error.message}</Text>
          </View>
        ) : null}

        {alertsQuery.data ? <ExpiryAlerts alerts={alertsQuery.data} /> : null}

        <QuickActions />

        {activityQuery.isPending ? (
          <View style={styles.panel}>
            <ActivityIndicator color="#111827" />
            <Text style={styles.panelText}>Loading activity…</Text>
          </View>
        ) : null}

        {activityQuery.error && !(activityQuery.error instanceof ApiError && activityQuery.error.status === 401) ? (
          <View style={styles.panel}>
            <Text style={styles.errorText}>{activityQuery.error.message}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void activityQuery.refetch()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {activityQuery.data ? (
          <RecentActivityList activities={activityQuery.data.activities} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f6f8',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    alignItems: 'flex-start',
  },
  panelText: {
    fontSize: 14,
    color: '#4b5563',
  },
  errorText: {
    fontSize: 14,
    color: '#991b1b',
  },
  retryButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
