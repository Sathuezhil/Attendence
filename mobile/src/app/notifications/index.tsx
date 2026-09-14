import { type Href, router } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { confirmAction } from '@/features/attendance/confirm';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/api';
import {
  AppNotification,
  NOTIFICATION_TYPES,
  NotificationType,
} from '@/features/notifications/types';
import { ApiError } from '@/lib/api';
import { colors, radius, space } from '@/theme';
import { EmptyState, ErrorState, LoadingState } from '@/ui/screen-state';

const TYPE_FILTERS: Array<NotificationType | undefined> = [undefined, ...NOTIFICATION_TYPES];

export default function NotificationsScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [type, setType] = useState<NotificationType | undefined>();
  const [message, setMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['notifications', { unreadOnly, type }],
    enabled: isReady && isAuthenticated,
    queryFn: () => fetchNotifications({ unreadOnly, type, limit: 50 }),
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    async onSuccess(result) {
      setMessage(result.count ? `Marked ${result.count} as read` : 'All notifications are already read');
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    async onSuccess() {
      setMessage('Notification deleted');
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  async function openNotification(item: AppNotification) {
    if (!item.isRead) {
      await markNotificationRead(item.id);
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }

    const href = destinationFor(item);
    if (href) {
      router.push(href);
    }
  }

  async function handleDelete(item: AppNotification) {
    const confirmed = await confirmAction(
      'Delete notification',
      'Remove this notification from your inbox?',
    );
    if (confirmed) {
      remove.mutate(item.id);
    }
  }

  const records = query.data?.data ?? [];

  if (!isReady || !isAuthenticated) {
    return <LoadingState />;
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
            {message ? <Text style={styles.success}>{message}</Text> : null}
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
            <LoadingState message="Loading notifications…" />
          ) : query.error ? (
            <ErrorState
              message={
                query.error instanceof ApiError
                  ? query.error.message
                  : 'Unable to load notifications.'
              }
              onRetry={() => void query.refetch()}
            />
          ) : (
            <EmptyState message="No notifications yet" />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => void openNotification(item)}
            onLongPress={() => void handleDelete(item)}
            style={[styles.card, item.isRead ? styles.cardRead : styles.cardUnread]}
          >
            <View style={styles.cardTop}>
              <Text style={styles.title}>{item.title}</Text>
              {item.isRead ? null : <View style={styles.dot} />}
            </View>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.meta}>{item.type.replaceAll('_', ' ')}</Text>
            {item.employee ? <Text style={styles.meta}>{item.employee.fullName}</Text> : null}
            {item.document ? (
              <Text style={styles.meta}>
                {item.document.documentType.replaceAll('_', ' ')}
                {item.document.expiryDate ? ` · ${item.document.expiryDate}` : ''}
              </Text>
            ) : null}
            <Text style={styles.time}>{formatWhen(item.createdAt)}</Text>
            <View style={styles.cardActions}>
              {item.isRead ? null : (
                <Pressable
                  onPress={() => {
                    void markNotificationRead(item.id).then(() =>
                      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
                    );
                  }}
                >
                  <Text style={styles.actionText}>Mark read</Text>
                </Pressable>
              )}
              <Pressable onPress={() => void handleDelete(item)}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function destinationFor(item: AppNotification): Href | null {
  if (item.document?.id) {
    return `/documents/${item.document.id}` as Href;
  }
  if (item.type === 'LEAVE_APPROVED' || item.type === 'LEAVE_REJECTED') {
    return '/leave' as Href;
  }
  if (item.type === 'PAYROLL_CREATED') {
    return (item.employee?.id ? `/payroll?employeeId=${item.employee.id}` : '/payroll') as Href;
  }
  if (item.type === 'INVOICE_OVERDUE') {
    return '/invoices' as Href;
  }
  if (item.employee?.id) {
    return `/employees/${item.employee.id}` as Href;
  }
  return null;
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
    backgroundColor: colors.background,
  },
  list: {
    padding: space.lg,
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
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  chipTextActive: {
    color: colors.white,
  },
  markAll: {
    marginLeft: 'auto',
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.info,
  },
  success: {
    color: colors.success,
    fontWeight: '600',
  },
  card: {
    borderRadius: radius.lg,
    padding: 14,
    gap: 4,
  },
  cardUnread: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  cardRead: {
    backgroundColor: colors.surface,
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
    color: colors.text,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1d4ed8',
  },
  message: {
    color: colors.text,
    fontSize: 14,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  time: {
    color: '#9ca3af',
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: space.lg,
    marginTop: 6,
  },
  actionText: {
    color: colors.info,
    fontWeight: '700',
    fontSize: 13,
  },
  deleteText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
});
