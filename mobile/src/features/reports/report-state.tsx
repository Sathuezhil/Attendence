import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '@/lib/api';

export function ReportState({
  loading,
  error,
  empty,
  emptyMessage,
  onRetry,
  children,
}: {
  loading: boolean;
  error: unknown;
  empty: boolean;
  emptyMessage: string;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>
          {error instanceof ApiError ? error.message : 'Unable to load this report.'}
        </Text>
        <Text style={styles.retry} onPress={onRetry}>
          Try again
        </Text>
      </View>
    );
  }

  if (empty) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>{emptyMessage}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

export function ReportScroll({
  refreshing,
  onRefresh,
  children,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  centered: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  empty: {
    color: '#6b7280',
    textAlign: 'center',
  },
  error: {
    color: '#991b1b',
    textAlign: 'center',
  },
  retry: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
});
