import { type Href, router, useLocalSearchParams } from 'expo-router';
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
import { useQuery } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { DateRangePicker } from '@/features/filters/date-range-picker';
import { FilterButton } from '@/features/filters/filter-button';
import { FilterModal } from '@/features/filters/filter-modal';
import { PaginationBar } from '@/features/filters/pagination-bar';
import { SearchBar } from '@/features/filters/search-bar';
import { StatusFilter } from '@/features/filters/status-filter';
import { useDebouncedValue } from '@/features/filters/use-debounced-value';
import { usePagedFilters } from '@/features/filters/use-paged-filters';
import { fetchLeaves } from '@/features/leave/api';
import { labelOf, leaveStatuses, leaveTypes, statusColor } from '@/features/leave/format';
import { LeaveRecord, LeaveStatus, LeaveType } from '@/features/leave/types';
import { ApiError } from '@/lib/api';
import { FabButton, useSafeBottomOffset } from '@/ui/fab-button';

export default function LeaveListScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const listBottom = useSafeBottomOffset(96);
  const params = useLocalSearchParams<{ employeeId?: string | string[] }>();
  const employeeId = Array.isArray(params.employeeId)
    ? params.employeeId[0]
    : params.employeeId;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeaveStatus | undefined>();
  const [leaveType, setLeaveType] = useState<LeaveType | undefined>();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const filterKey = JSON.stringify({
    employeeId,
    search: debouncedSearch,
    status,
    leaveType,
    startDate,
    endDate,
  });
  const { page, setPage } = usePagedFilters(filterKey);
  const filterCount = [status, leaveType, startDate, endDate].filter(Boolean).length;

  const query = useQuery({
    queryKey: ['leave', { employeeId, search: debouncedSearch, status, leaveType, startDate, endDate, page }],
    enabled: isReady && isAuthenticated,
    queryFn: () =>
      fetchLeaves({
        employeeId,
        search: debouncedSearch.trim() || undefined,
        status,
        leaveType,
        startDate: startDate.trim() || undefined,
        endDate: endDate.trim() || undefined,
        page,
        limit: 20,
      }),
  });

  const records = query.data?.data ?? [];
  const totalPages = query.data?.totalPages ?? 0;

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
        contentContainerStyle={[styles.list, { paddingBottom: listBottom }]}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
        ListHeaderComponent={
          <View style={styles.filters}>
            {employeeId ? <Text style={styles.scope}>Showing one employee</Text> : null}
            <SearchBar onChange={setSearch} placeholder="Search employee" value={search} />
            <FilterButton count={filterCount} onPress={() => setFiltersOpen(true)} />
            <StatusFilter
              allLabel="All status"
              labelOf={labelOf}
              onChange={setStatus}
              options={leaveStatuses}
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
              {query.error instanceof ApiError ? query.error.message : 'Unable to load leave.'}
            </Text>
          ) : (
            <Text style={styles.empty}>No leave records found</Text>
          )
        }
        ListFooterComponent={<PaginationBar onPage={setPage} page={page} totalPages={totalPages} />}
        renderItem={({ item }) => <LeaveRow record={item} />}
      />
      <FilterModal
        onApply={() => setFiltersOpen(false)}
        onClear={() => {
          setStatus(undefined);
          setLeaveType(undefined);
          setStartDate('');
          setEndDate('');
        }}
        onClose={() => setFiltersOpen(false)}
        visible={filtersOpen}
      >
        <StatusFilter
          allLabel="All types"
          labelOf={labelOf}
          onChange={setLeaveType}
          options={leaveTypes}
          value={leaveType}
        />
        <DateRangePicker
          from={startDate}
          fromPlaceholder="Start"
          onChangeFrom={setStartDate}
          onChangeTo={setEndDate}
          to={endDate}
          toPlaceholder="End"
        />
      </FilterModal>
      <FabButton label="Add Leave" onPress={() => router.push('/leave/new' as Href)} />
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
});
