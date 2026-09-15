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
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-context';
import { DashboardHeader } from '@/features/dashboard/dashboard-header';
import { DashboardSearchBar } from '@/features/dashboard/dashboard-search-bar';
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
      return;
    }
    if (isReady && user?.role === 'EMPLOYEE') {
      router.replace('/me');
    }
  }, [isReady, isAuthenticated, user?.role]);

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
        <ActivityIndicator size="large" color="#0e5a72" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.heroDecor}>
          <View style={styles.heroGlow} />
          <View style={styles.heroOrb} />
        </View>
        <DashboardHeader
          user={user}
          unreadCount={unreadQuery.data?.count ?? 0}
          onOpenNotifications={() => router.push('/notifications' as Href)}
          onOpenProfile={() => router.push('/profile' as Href)}
          onOpenSettings={() => router.push('/settings' as Href)}
          onLogout={() => void handleLogout()}
        />
        <QuickActions />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <DashboardSearchBar />
        <View style={styles.section}>
          {summaryQuery.isPending ? (
            <View style={styles.panel}>
              <ActivityIndicator color="#0e5a72" />
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
            <ActivityIndicator color="#0e5a72" />
            <Text style={styles.panelText}>Loading expiry alerts…</Text>
          </View>
        ) : null}

        {alertsQuery.error && !(alertsQuery.error instanceof ApiError && alertsQuery.error.status === 401) ? (
          <View style={styles.panel}>
            <Text style={styles.errorText}>{alertsQuery.error.message}</Text>
          </View>
        ) : null}

        {alertsQuery.data ? <ExpiryAlerts alerts={alertsQuery.data} /> : null}

        {activityQuery.isPending ? (
          <View style={styles.panel}>
            <ActivityIndicator color="#0e5a72" />
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
    backgroundColor: '#eaf4f8',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#eaf4f8',
    overflow: 'visible',
  },
  hero: {
    backgroundColor: '#0c4a62',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    zIndex: 20,
    overflow: 'visible',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroDecor: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(31, 182, 166, 0.28)',
    right: -70,
    top: -80,
  },
  heroOrb: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
    left: -40,
    bottom: -50,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    alignItems: 'flex-start',
  },
  panelText: {
    fontSize: 14,
    color: '#3d4d5c',
  },
  errorText: {
    fontSize: 14,
    color: '#9f1239',
  },
  retryButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#0e5a72',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
