import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
import { FilterButton } from '@/features/filters/filter-button';
import { FilterModal } from '@/features/filters/filter-modal';
import { PaginationBar } from '@/features/filters/pagination-bar';
import { SearchBar } from '@/features/filters/search-bar';
import { StatusFilter } from '@/features/filters/status-filter';
import { useDebouncedValue } from '@/features/filters/use-debounced-value';
import { usePagedFilters } from '@/features/filters/use-paged-filters';
import { fetchPayroll } from '@/features/payroll/api';
import { labelOf, money, monthLabel, statusColor } from '@/features/payroll/format';
import { PAYMENT_STATUSES, PaymentStatus, PayrollRecord } from '@/features/payroll/types';
import { ApiError } from '@/lib/api';
import { FabButton, useSafeBottomOffset } from '@/ui/fab-button';

export default function PayrollListScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const listBottom = useSafeBottomOffset(96);
  const params = useLocalSearchParams<{ employeeId?: string | string[] }>();
  const employeeId = Array.isArray(params.employeeId) ? params.employeeId[0] : params.employeeId;

  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | undefined>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const filterKey = JSON.stringify({
    employeeId,
    search: debouncedSearch,
    month,
    year,
    paymentStatus,
  });
  const { page, setPage } = usePagedFilters(filterKey);
  const filterCount = [month, year, paymentStatus].filter(Boolean).length;

  const query = useQuery({
    queryKey: [
      'payroll',
      { employeeId, search: debouncedSearch, month, year, paymentStatus, page },
    ],
    enabled: isReady && isAuthenticated,
    queryFn: () =>
      fetchPayroll({
        employeeId,
        search: debouncedSearch.trim() || undefined,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        paymentStatus,
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
              onChange={setPaymentStatus}
              options={PAYMENT_STATUSES}
              value={paymentStatus}
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
              {query.error instanceof ApiError ? query.error.message : 'Unable to load payroll.'}
            </Text>
          ) : (
            <Text style={styles.empty}>No payroll records found</Text>
          )
        }
        ListFooterComponent={<PaginationBar onPage={setPage} page={page} totalPages={totalPages} />}
        renderItem={({ item }) => <PayrollRow record={item} />}
      />
      <FilterModal
        onApply={() => setFiltersOpen(false)}
        onClear={() => {
          setMonth('');
          setYear('');
          setPaymentStatus(undefined);
        }}
        onClose={() => setFiltersOpen(false)}
        visible={filtersOpen}
      >
        <View style={styles.row}>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setMonth}
            placeholder="Month 1-12"
            placeholderTextColor="#9ca3af"
            style={[styles.input, styles.flex]}
            value={month}
          />
          <TextInput
            keyboardType="number-pad"
            onChangeText={setYear}
            placeholder="Year"
            placeholderTextColor="#9ca3af"
            style={[styles.input, styles.flex]}
            value={year}
          />
        </View>
      </FilterModal>
      <FabButton
        label="Add Payroll"
        onPress={() =>
          router.push((employeeId ? `/payroll/new?employeeId=${employeeId}` : '/payroll/new') as Href)
        }
      />
    </View>
  );
}

function PayrollRow({ record }: { record: PayrollRecord }) {
  return (
    <Pressable onPress={() => router.push(`/payroll/${record.id}` as Href)} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardBody}>
          <Text style={styles.name}>{record.employee.fullName}</Text>
          <Text style={styles.meta}>
            {monthLabel(record.payrollMonth)} {record.payrollYear}
          </Text>
          <Text style={styles.meta}>Net {money(record.netSalary)}</Text>
        </View>
        <Text style={[styles.status, { color: statusColor(record.paymentStatus) }]}>
          {labelOf(record.paymentStatus)}
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
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    color: '#111827',
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
