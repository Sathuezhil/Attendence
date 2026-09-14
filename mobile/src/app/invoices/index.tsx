import { type Href, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { DateRangePicker } from '@/features/filters/date-range-picker';
import { FilterButton } from '@/features/filters/filter-button';
import { FilterModal } from '@/features/filters/filter-modal';
import { SearchBar } from '@/features/filters/search-bar';
import { StatusFilter } from '@/features/filters/status-filter';
import { useDebouncedValue } from '@/features/filters/use-debounced-value';
import { fetchInvoices } from '@/features/invoices/api';
import { labelOf, money, statusColor } from '@/features/invoices/format';
import { INVOICE_STATUSES, Invoice, InvoiceStatus } from '@/features/invoices/types';
import { ApiError } from '@/lib/api';
import { FabButton, useSafeBottomOffset } from '@/ui/fab-button';

const PAGE_SIZE = 20;

export default function InvoiceListScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const listBottom = useSafeBottomOffset(96);
  const [search, setSearch] = useState('');
  const [customer, setCustomer] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [status, setStatus] = useState<InvoiceStatus | undefined>();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const filterCount = [
    customer.trim(),
    invoiceNumber.trim(),
    status,
    fromDate,
    toDate,
    dueFrom,
    dueTo,
  ].filter(Boolean).length;

  const filters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      customer: customer.trim() || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      status,
      fromDate: fromDate.trim() || undefined,
      toDate: toDate.trim() || undefined,
      dueFrom: dueFrom.trim() || undefined,
      dueTo: dueTo.trim() || undefined,
    }),
    [customer, debouncedSearch, dueFrom, dueTo, fromDate, invoiceNumber, status, toDate],
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
        contentContainerStyle={[styles.list, { paddingBottom: listBottom }]}
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
            <SearchBar onChange={setSearch} placeholder="Search invoice or customer" value={search} />
            <FilterButton count={filterCount} onPress={() => setFiltersOpen(true)} />
            <StatusFilter
              allLabel="All status"
              labelOf={labelOf}
              onChange={setStatus}
              options={INVOICE_STATUSES}
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
      <FilterModal
        onApply={() => setFiltersOpen(false)}
        onClear={() => {
          setCustomer('');
          setInvoiceNumber('');
          setStatus(undefined);
          setFromDate('');
          setToDate('');
          setDueFrom('');
          setDueTo('');
        }}
        onClose={() => setFiltersOpen(false)}
        visible={filtersOpen}
      >
        <SearchBar onChange={setCustomer} placeholder="Customer" value={customer} />
        <SearchBar onChange={setInvoiceNumber} placeholder="Invoice number" value={invoiceNumber} />
        <DateRangePicker
          from={fromDate}
          fromPlaceholder="From"
          label="Invoice date"
          onChangeFrom={setFromDate}
          onChangeTo={setToDate}
          to={toDate}
          toPlaceholder="To"
        />
        <DateRangePicker
          from={dueFrom}
          fromPlaceholder="From"
          label="Due date"
          onChangeFrom={setDueFrom}
          onChangeTo={setDueTo}
          to={dueTo}
          toPlaceholder="To"
        />
      </FilterModal>
      <FabButton label="Create Invoice" onPress={() => router.push('/invoices/new' as Href)} />
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
});
