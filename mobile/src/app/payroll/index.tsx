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
import { fetchPayroll } from '@/features/payroll/api';
import { labelOf, money, monthLabel, statusColor } from '@/features/payroll/format';
import { PAYMENT_STATUSES, PaymentStatus, PayrollRecord } from '@/features/payroll/types';
import { ApiError } from '@/lib/api';

export default function PayrollListScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const params = useLocalSearchParams<{ employeeId?: string | string[] }>();
  const employeeId = Array.isArray(params.employeeId) ? params.employeeId[0] : params.employeeId;

  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | undefined>();

  const query = useQuery({
    queryKey: ['payroll', { employeeId, month, year, paymentStatus }],
    enabled: isReady && isAuthenticated,
    queryFn: () =>
      fetchPayroll({
        employeeId,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        paymentStatus,
        limit: 50,
      }),
  });

  const records = useMemo(() => {
    const list = query.data?.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) {
      return list;
    }
    return list.filter((item) =>
      `${item.employee.fullName} ${item.employee.employeeCode}`.toLowerCase().includes(term),
    );
  }, [query.data, search]);

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
                keyboardType="number-pad"
                onChangeText={setMonth}
                placeholder="Month 1-12"
                placeholderTextColor="#9ca3af"
                style={[styles.search, styles.flex]}
                value={month}
              />
              <TextInput
                keyboardType="number-pad"
                onChangeText={setYear}
                placeholder="Year"
                placeholderTextColor="#9ca3af"
                style={[styles.search, styles.flex]}
                value={year}
              />
            </View>
            <View style={styles.chips}>
              {[undefined, ...PAYMENT_STATUSES].map((option) => (
                <Pressable
                  key={option ?? 'ALL'}
                  onPress={() => setPaymentStatus(option)}
                  style={[styles.chip, paymentStatus === option ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, paymentStatus === option ? styles.chipTextActive : null]}>
                    {option ? labelOf(option) : 'All status'}
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
              {query.error instanceof ApiError ? query.error.message : 'Unable to load payroll.'}
            </Text>
          ) : (
            <Text style={styles.empty}>No payroll records found</Text>
          )
        }
        renderItem={({ item }) => <PayrollRow record={item} />}
      />
      <Pressable
        onPress={() =>
          router.push((employeeId ? `/payroll/new?employeeId=${employeeId}` : '/payroll/new') as Href)
        }
        style={styles.fab}
      >
        <Text style={styles.fabText}>Add Payroll</Text>
      </Pressable>
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
