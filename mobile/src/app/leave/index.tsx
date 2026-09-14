import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { fetchLeaves } from '@/features/leave/api';
import { labelOf, leaveStatuses, leaveTypes, statusColor } from '@/features/leave/format';
import { LeaveRecord, LeaveStatus, LeaveType } from '@/features/leave/types';
import { ApiError } from '@/lib/api';

export default function LeaveListScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const params = useLocalSearchParams<{ employeeId?: string | string[] }>();
  const employeeId = Array.isArray(params.employeeId)
    ? params.employeeId[0]
    : params.employeeId;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeaveStatus | undefined>();
  const [leaveType, setLeaveType] = useState<LeaveType | undefined>();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const query = useQuery({
    queryKey: ['leave', { employeeId, search, status, leaveType, startDate, endDate }],
    enabled: isReady && isAuthenticated,
    queryFn: () =>
      fetchLeaves({
        employeeId,
        search: search.trim() || undefined,
        status,
        leaveType,
        startDate: startDate.trim() || undefined,
        endDate: endDate.trim() || undefined,
        limit: 50,
      }),
  });

  const records = query.data?.data ?? [];
  const statusFilters = useMemo(() => [undefined, ...leaveStatuses], []);
  const typeFilters = useMemo(() => [undefined, ...leaveTypes], []);

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
            {employeeId ? <Text style={styles.scope}>Showing one employee</Text> : null}
            <TextInput
              onChangeText={setSearch}
              placeholder="Search employee"
              placeholderTextColor="#9ca3af"
              style={styles.search}
              value={search}
            />
            <View style={styles.row}>
              <TextInput
                onChangeText={setStartDate}
                placeholder="Start YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                style={[styles.search, styles.flex]}
                value={startDate}
              />
              <TextInput
                onChangeText={setEndDate}
                placeholder="End YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                style={[styles.search, styles.flex]}
                value={endDate}
              />
            </View>
            <View style={styles.chips}>
              {statusFilters.map((option) => (
                <Pressable
                  key={option ?? 'ALL_STATUS'}
                  onPress={() => setStatus(option)}
                  style={[styles.chip, status === option ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, status === option ? styles.chipTextActive : null]}>
                    {option ? labelOf(option) : 'All status'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.chips}>
              {typeFilters.map((option) => (
                <Pressable
                  key={option ?? 'ALL_TYPE'}
                  onPress={() => setLeaveType(option)}
                  style={[styles.chip, leaveType === option ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, leaveType === option ? styles.chipTextActive : null]}>
                    {option ? labelOf(option) : 'All types'}
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
              {query.error instanceof ApiError ? query.error.message : 'Unable to load leave.'}
            </Text>
          ) : (
            <Text style={styles.empty}>No leave records found</Text>
          )
        }
        renderItem={({ item }) => <LeaveRow record={item} />}
      />
      <Pressable onPress={() => router.push('/leave/new' as Href)} style={styles.fab}>
        <Text style={styles.fabText}>Add Leave</Text>
      </Pressable>
    </View>
  );
}

function LeaveRow({ record }: { record: LeaveRecord }) {
  return (
    <Pressable onPress={() => router.push(`/leave/${record.id}` as Href)} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardBody}>
          <Text style={styles.name}>{record.employee.fullName}</Text>
          <Text style={styles.meta}>
            {labelOf(record.leaveType)} · {record.totalDays} day{record.totalDays === 1 ? '' : 's'}
          </Text>
          <Text style={styles.meta}>
            {record.startDate} → {record.endDate}
          </Text>
        </View>
        <Text style={[styles.status, { color: statusColor(record.status) }]}>
          {labelOf(record.status)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  list: {
    padding: 16,
    paddingBottom: 96,
    gap: 10,
  },
  filters: {
    gap: 10,
    marginBottom: 6,
  },
  scope: {
    color: '#1e40af',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  search: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    color: '#111827',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  meta: {
    color: '#6b7280',
    fontSize: 13,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    backgroundColor: '#111827',
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  fabText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
