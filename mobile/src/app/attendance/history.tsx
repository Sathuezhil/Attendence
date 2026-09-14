import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchAttendanceHistory } from '@/features/attendance/api';
import {
  attendanceStatuses,
  formatDuration,
  formatTime,
  statusColor,
  statusLabel,
} from '@/features/attendance/format';
import { AttendanceRecord, AttendanceStatus } from '@/features/attendance/types';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { DateRangePicker } from '@/features/filters/date-range-picker';
import { FilterButton } from '@/features/filters/filter-button';
import { FilterModal } from '@/features/filters/filter-modal';
import { SearchBar } from '@/features/filters/search-bar';
import { StatusFilter } from '@/features/filters/status-filter';
import { useDebouncedValue } from '@/features/filters/use-debounced-value';
import { ApiError } from '@/lib/api';

export default function AttendanceHistoryScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const params = useLocalSearchParams<{ employeeId?: string | string[] }>();
  const employeeId = Array.isArray(params.employeeId)
    ? params.employeeId[0]
    : params.employeeId;
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<AttendanceStatus | undefined>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const filterCount = [startDate, endDate, status].filter(Boolean).length;

  const query = useInfiniteQuery({
    queryKey: [
      'attendance',
      'history',
      {
        employeeId,
        search: debouncedSearch,
        startDate,
        endDate,
        status,
      },
    ],
    enabled: isReady && isAuthenticated,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchAttendanceHistory({
        page: pageParam,
        limit: 20,
        employeeId,
        search: debouncedSearch.trim() || undefined,
        startDate: startDate.trim() || undefined,
        endDate: endDate.trim() || undefined,
        status,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });

  const records = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );

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
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        ListHeaderComponent={
          <View style={styles.filters}>
            {employeeId ? <Text style={styles.scope}>Showing one employee</Text> : null}
            <SearchBar onChange={setSearch} placeholder="Search employee" value={search} />
            <FilterButton count={filterCount} onPress={() => setFiltersOpen(true)} />
            <StatusFilter
              allLabel="All"
              labelOf={statusLabel}
              onChange={setStatus}
              options={attendanceStatuses}
              value={status}
            />
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#111827" />
            </View>
          ) : query.error ? (
            <Text style={styles.error}>
              {query.error instanceof ApiError ? query.error.message : 'Unable to load history.'}
            </Text>
          ) : (
            <Text style={styles.empty}>No attendance records found</Text>
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? <ActivityIndicator color="#111827" style={styles.footer} /> : null
        }
        renderItem={({ item }) => <HistoryRow record={item} hideEmployee={Boolean(employeeId)} />}
      />
      <FilterModal
        onApply={() => setFiltersOpen(false)}
        onClear={() => {
          setStartDate('');
          setEndDate('');
          setStatus(undefined);
        }}
        onClose={() => setFiltersOpen(false)}
        visible={filtersOpen}
      >
        <DateRangePicker
          from={startDate}
          onChangeFrom={setStartDate}
          onChangeTo={setEndDate}
          to={endDate}
        />
      </FilterModal>
    </View>
  );
}

function HistoryRow({
  record,
  hideEmployee,
}: {
  record: AttendanceRecord;
  hideEmployee: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.date}>{record.attendanceDate}</Text>
        <Text style={[styles.status, { color: statusColor(record.status) }]}>
          {statusLabel(record.status)}
        </Text>
      </View>
      {hideEmployee ? null : (
        <Text style={styles.name}>
          {record.employee.fullName} · {record.employee.employeeCode}
        </Text>
      )}
      <Text style={styles.meta}>
        In {formatTime(record.checkIn)} · Out {formatTime(record.checkOut)}
      </Text>
      <Text style={styles.meta}>
        Late {record.lateMinutes ?? 0}m · Worked {formatDuration(record.workingMinutes)}
      </Text>
    </View>
  );
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
  scope: {
    color: '#1e40af',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  date: {
    fontWeight: '700',
    color: '#111827',
  },
  name: {
    color: '#111827',
    fontWeight: '600',
  },
  meta: {
    color: '#6b7280',
    fontSize: 13,
  },
  status: {
    fontWeight: '700',
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
  footer: {
    marginVertical: 12,
  },
});
