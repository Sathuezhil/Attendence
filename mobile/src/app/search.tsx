import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { DateRangePicker } from '@/features/filters/date-range-picker';
import { FilterButton } from '@/features/filters/filter-button';
import { FilterModal } from '@/features/filters/filter-modal';
import { SearchBar } from '@/features/filters/search-bar';
import { StatusFilter } from '@/features/filters/status-filter';
import { useDebouncedValue } from '@/features/filters/use-debounced-value';
import { fetchGlobalSearch } from '@/features/search/api';
import { SearchResponse } from '@/features/search/types';
import { ApiError } from '@/lib/api';

const EMPLOYEE_STATUSES = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'] as const;

export default function GlobalSearchScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const { q: initialQuery } = useLocalSearchParams<{ q?: string | string[] }>();
  const startingQuery = Array.isArray(initialQuery) ? initialQuery[0] ?? '' : initialQuery ?? '';
  const [q, setQ] = useState(startingQuery);
  const submitted = useDebouncedValue(q.trim());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [employeeStatus, setEmployeeStatus] = useState<string | undefined>();
  const [joiningFrom, setJoiningFrom] = useState('');
  const [joiningTo, setJoiningTo] = useState('');

  const filterCount = [employeeStatus, joiningFrom, joiningTo].filter(Boolean).length;

  useEffect(() => {
    setQ(startingQuery);
  }, [startingQuery]);

  const query = useQuery({
    queryKey: ['search', { submitted, employeeStatus, joiningFrom, joiningTo }],
    enabled: isReady && isAuthenticated,
    queryFn: () =>
      fetchGlobalSearch({
        q: submitted || undefined,
        employeeStatus,
        joiningFrom: joiningFrom.trim() || undefined,
        joiningTo: joiningTo.trim() || undefined,
        limit: 8,
      }),
  });

  const result = query.data;
  const empty = useMemo(() => isEmpty(result), [result]);

  if (!isReady || !isAuthenticated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <SearchBar
          onChange={setQ}
          placeholder="Search employees, leave, invoices..."
          value={q}
        />
        <FilterButton count={filterCount} onPress={() => setFiltersOpen(true)} />
      </View>

      {query.isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : query.error ? (
        <View style={styles.centered}>
          <Text style={styles.error}>
            {query.error instanceof ApiError ? query.error.message : 'Unable to search.'}
          </Text>
          <Text style={styles.retry} onPress={() => void query.refetch()}>
            Try again
          </Text>
        </View>
      ) : empty ? (
        <View style={styles.centered}>
          <Text style={styles.empty}>
            {submitted || filterCount ? 'No matching records.' : 'Type a name, code, invoice number or customer.'}
          </Text>
        </View>
      ) : result ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Section
            href="/employees"
            items={result.employees.data.map((item) => ({
              id: item.id,
              title: item.fullName,
              detail: `${item.employeeCode} · ${item.status}`,
              href: `/employees/${item.id}`,
            }))}
            title={`Employees · ${result.employees.total}`}
          />
          <Section
            href="/attendance"
            items={result.attendance.data.map((item) => ({
              id: item.id,
              title: item.fullName,
              detail: `${item.date} · ${item.status}`,
              href: '/attendance',
            }))}
            title={`Attendance · ${result.attendance.total}`}
          />
          <Section
            href="/leave"
            items={result.leave.data.map((item) => ({
              id: item.id,
              title: item.fullName,
              detail: `${item.leaveType} · ${item.status}`,
              href: '/leave',
            }))}
            title={`Leave · ${result.leave.total}`}
          />
          <Section
            href="/documents"
            items={result.documents.data.map((item) => ({
              id: item.id,
              title: item.fullName,
              detail: `${item.documentType} · ${item.expiryStatus}`,
              href: `/documents/${item.id}`,
            }))}
            title={`Documents · ${result.documents.total}`}
          />
          <Section
            href="/payroll"
            items={result.payroll.data.map((item) => ({
              id: item.id,
              title: item.fullName,
              detail: `${item.year}-${String(item.month).padStart(2, '0')} · ${item.paymentStatus}`,
              href: `/payroll/${item.id}`,
            }))}
            title={`Payroll · ${result.payroll.total}`}
          />
          <Section
            href={'/invoices' as Href}
            items={result.invoices.data.map((item) => ({
              id: item.id,
              title: item.invoiceNumber,
              detail: `${item.customerName} · ${item.status}`,
              href: `/invoices/${item.id}`,
            }))}
            title={`Invoices · ${result.invoices.total}`}
          />
        </ScrollView>
      ) : null}

      <FilterModal
        onApply={() => setFiltersOpen(false)}
        onClear={() => {
          setEmployeeStatus(undefined);
          setJoiningFrom('');
          setJoiningTo('');
        }}
        onClose={() => setFiltersOpen(false)}
        visible={filtersOpen}
      >
        <StatusFilter
          onChange={setEmployeeStatus}
          options={EMPLOYEE_STATUSES}
          value={employeeStatus as (typeof EMPLOYEE_STATUSES)[number] | undefined}
        />
        <DateRangePicker
          from={joiningFrom}
          fromPlaceholder="Joined from"
          onChangeFrom={setJoiningFrom}
          onChangeTo={setJoiningTo}
          to={joiningTo}
          toPlaceholder="Joined to"
        />
      </FilterModal>
    </View>
  );
}

function isEmpty(result?: SearchResponse) {
  if (!result) {
    return true;
  }
  return (
    result.employees.total +
      result.attendance.total +
      result.leave.total +
      result.documents.total +
      result.payroll.total +
      result.invoices.total ===
    0
  );
}

function Section({
  title,
  href,
  items,
}: {
  title: string;
  href: Href;
  items: { id: string; title: string; detail: string; href: string }[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Pressable onPress={() => router.push(href)}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </Pressable>
      {items.map((item) => (
        <Pressable key={item.id} onPress={() => router.push(item.href as Href)} style={styles.row}>
          <Text style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.rowDetail}>{item.detail}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { padding: 16, gap: 8 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  empty: { color: '#6b7280', textAlign: 'center' },
  error: { color: '#991b1b', textAlign: 'center' },
  retry: { color: '#1d4ed8', fontWeight: '700' },
  section: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, gap: 8 },
  sectionTitle: { fontWeight: '700', color: '#111827' },
  row: { gap: 2, paddingVertical: 6 },
  rowTitle: { color: '#111827', fontWeight: '600' },
  rowDetail: { color: '#6b7280', fontSize: 12 },
});
