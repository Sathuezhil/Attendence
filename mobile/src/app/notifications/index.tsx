import { type Href, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/api';
import { AppNotification, NotificationType } from '@/features/notifications/types';
import { ApiError } from '@/lib/api';

const TYPE_FILTERS: Array<NotificationType | undefined> = [
  undefined,
  'DOCUMENT_EXPIRING',
  'DOCUMENT_EXPIRED',
];

export default function NotificationsScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [type, setType] = useState<NotificationType | undefined>();

  const query = useQuery({
    queryKey: ['notifications', { unreadOnly, type }],
    enabled: isReady && isAuthenticated,
    queryFn: () => fetchNotifications({ unreadOnly, type, limit: 50 }),
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  async function openNotification(item: AppNotification) {
    if (!item.isRead) {
      await markNotificationRead(item.id);
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }

    if (item.document?.id) {
      router.push(`/documents/${item.document.id}` as Href);
      return;
    }
    if (item.employee?.id) {
      router.push(`/employees/${item.employee.id}` as Href);
    }
  }

  const records = query.data?.data ?? [];

  if (!isReady || !isAuthenticated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
        ListHeaderComponent={
          <View style={styles.filters}>
            <View style={styles.chips}>
              <Pressable
                onPress={() => setUnreadOnly(false)}
                style={[styles.chip, !unreadOnly ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, !unreadOnly ? styles.chipTextActive : null]}>All</Text>
              </Pressable>
              <Pressable
                onPress={() => setUnreadOnly(true)}
                style={[styles.chip, unreadOnly ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, unreadOnly ? styles.chipTextActive : null]}>Unread</Text>
              </Pressable>
              <Pressable
                disabled={markAll.isPending || records.length === 0}
                onPress={() => markAll.mutate()}
                style={styles.markAll}
              >
                <Text style={styles.markAllText}>
                  {markAll.isPending ? 'Updating…' : 'Mark all read'}
                </Text>
              </Pressable>
            </View>
            <View style={styles.chips}>
              {TYPE_FILTERS.map((option) => (
                <Pressable
                  key={option ?? 'ALL_TYPE'}
                  onPress={() => setType(option)}
                  style={[styles.chip, type === option ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, type === option ? styles.chipTextActive : null]}>
                    {option ? option.replaceAll('_', ' ') : 'All types'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#111827" />
            </View>
          ) : query.error ? (
            <Text style={styles.error}>
              {query.error instanceof ApiError ? query.error.message : 'Unable to load notifications.'}
            </Text>
          ) : (
            <Text style={styles.empty}>No notifications yet</Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => void openNotification(item)}
            style={[styles.card, item.isRead ? styles.cardRead : styles.cardUnread]}
          >
            <View style={styles.cardTop}>
              <Text style={styles.title}>{item.title}</Text>
              {item.isRead ? null : <View style={styles.dot} />}
            </View>
            <Text style={styles.message}>{item.message}</Text>
            {item.employee ? <Text style={styles.meta}>{item.employee.fullName}</Text> : null}
            {item.document ? (
              <Text style={styles.meta}>
                {item.document.documentType.replaceAll('_', ' ')}
                {item.document.expiryDate ? ` · ${item.document.expiryDate}` : ''}
              </Text>
            ) : null}
            <Text style={styles.time}>{formatWhen(item.createdAt)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  list: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  filters: {
    gap: 10,
    marginBottom: 6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#111827',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  markAll: {
    marginLeft: 'auto',
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e40af',
  },
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  cardUnread: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#111827',
  },
  cardRead: {
    backgroundColor: '#ffffff',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1d4ed8',
  },
  message: {
    color: '#111827',
    fontSize: 14,
  },
  meta: {
    color: '#6b7280',
    fontSize: 13,
  },
  time: {
    color: '#9ca3af',
    fontSize: 12,
  },
  centered: {
    padding: 24,
    alignItems: 'center',
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    padding: 24,
  },
  error: {
    color: '#991b1b',
    textAlign: 'center',
  },
});
