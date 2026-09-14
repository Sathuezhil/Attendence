import { type Href, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { fetchInvoices } from '@/features/invoices/api';
import { labelOf, money, statusColor } from '@/features/invoices/format';
import { INVOICE_STATUSES, Invoice, InvoiceStatus } from '@/features/invoices/types';
import { ApiError } from '@/lib/api';

const PAGE_SIZE = 20;

export default function InvoiceListScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<InvoiceStatus | undefined>();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status,
      fromDate: fromDate.trim() || undefined,
      toDate: toDate.trim() || undefined,
    }),
    [debouncedSearch, fromDate, status, toDate],
  );

  const query = useInfiniteQuery({
    queryKey: ['invoices', filters],
    enabled: isReady && isAuthenticated,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchInvoices({
        ...filters,
        page: pageParam,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });

  const invoices = query.data?.pages.flatMap((page) => page.data) ?? [];

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
        data={invoices}
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
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={styles.filters}>
            <TextInput
              onChangeText={setSearch}
              placeholder="Search invoice or customer"
              placeholderTextColor="#9ca3af"
              style={styles.search}
              value={search}
            />
            <View style={styles.row}>
              <TextInput
                onChangeText={setFromDate}
                placeholder="From YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                style={[styles.search, styles.flex]}
                value={fromDate}
              />
              <TextInput
                onChangeText={setToDate}
                placeholder="To YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                style={[styles.search, styles.flex]}
                value={toDate}
              />
            </View>
            <View style={styles.chips}>
              {[undefined, ...INVOICE_STATUSES].map((option) => (
                <Pressable
                  key={option ?? 'ALL'}
                  onPress={() => setStatus(option)}
                  style={[styles.chip, status === option ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, status === option ? styles.chipTextActive : null]}>
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
              {query.error instanceof ApiError ? query.error.message : 'Unable to load invoices.'}
            </Text>
          ) : (
            <Text style={styles.empty}>No invoices found</Text>
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator color="#111827" style={styles.footer} />
          ) : null
        }
        renderItem={({ item }) => <InvoiceRow invoice={item} />}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/invoices/new' as Href)}
        style={styles.fab}
      >
        <Text style={styles.fabText}>Create Invoice</Text>
      </Pressable>
    </View>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/invoices/${invoice.id}` as Href)} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardBody}>
          <Text style={styles.name}>{invoice.invoiceNumber}</Text>
          <Text style={styles.meta}>{invoice.customerName}</Text>
          <Text style={styles.meta}>
            {invoice.invoiceDate} · Due {invoice.dueDate}
          </Text>
          <Text style={styles.meta}>Total {money(invoice.totalAmount)}</Text>
        </View>
        <Text style={[styles.status, { color: statusColor(invoice.status) }]}>
          {labelOf(invoice.status)}
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
  footer: {
    marginVertical: 12,
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
