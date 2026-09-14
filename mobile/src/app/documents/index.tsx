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
import { fetchDocuments } from '@/features/documents/api';
import { labelOf, statusColor, statusLabel } from '@/features/documents/format';
import { DateRangePicker } from '@/features/filters/date-range-picker';
import { FilterButton } from '@/features/filters/filter-button';
import { FilterModal } from '@/features/filters/filter-modal';
import { PaginationBar } from '@/features/filters/pagination-bar';
import { SearchBar } from '@/features/filters/search-bar';
import { StatusFilter } from '@/features/filters/status-filter';
import { useDebouncedValue } from '@/features/filters/use-debounced-value';
import { usePagedFilters } from '@/features/filters/use-paged-filters';
import {
  DOCUMENT_TYPES,
  DocumentExpiryStatus,
  DocumentListItem,
  DocumentType,
} from '@/features/documents/types';
import { ApiError } from '@/lib/api';
import { FabButton, useSafeBottomOffset } from '@/ui/fab-button';

const EXPIRY_FILTERS = ['VALID', 'EXPIRING_SOON', 'EXPIRED'] as const;

export default function DocumentsListScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const listBottom = useSafeBottomOffset(96);
  const params = useLocalSearchParams<{
    employeeId?: string | string[];
    expired?: string | string[];
    expiring?: string | string[];
  }>();
  const employeeId = first(params.employeeId);
  const initialExpiry = first(params.expired)
    ? 'EXPIRED'
    : first(params.expiring)
      ? 'EXPIRING_SOON'
      : undefined;

  const [search, setSearch] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType | undefined>();
  const [expiryStatus, setExpiryStatus] = useState<(typeof EXPIRY_FILTERS)[number] | undefined>(
    initialExpiry,
  );
  const [expiryFrom, setExpiryFrom] = useState('');
  const [expiryTo, setExpiryTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const filterKey = JSON.stringify({
    employeeId,
    search: debouncedSearch,
    documentType,
    expiryStatus,
    expiryFrom,
    expiryTo,
  });
  const { page, setPage } = usePagedFilters(filterKey);
  const filterCount = [documentType, expiryStatus, expiryFrom, expiryTo].filter(Boolean).length;

  const query = useQuery({
    queryKey: [
      'documents',
      { employeeId, search: debouncedSearch, documentType, expiryStatus, expiryFrom, expiryTo, page },
    ],
    enabled: isReady && isAuthenticated,
    queryFn: () =>
      fetchDocuments({
        employeeId,
        search: debouncedSearch.trim() || undefined,
        documentType,
        expiryStatus,
        expiryFrom: expiryFrom.trim() || undefined,
        expiryTo: expiryTo.trim() || undefined,
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
              allLabel="All expiry"
              labelOf={(option) =>
                option === 'EXPIRING_SOON' ? 'Expiring soon' : labelOf(option)
              }
              onChange={setExpiryStatus}
              options={EXPIRY_FILTERS}
              value={expiryStatus}
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
              {query.error instanceof ApiError ? query.error.message : 'Unable to load documents.'}
            </Text>
          ) : (
            <Text style={styles.empty}>No documents found</Text>
          )
        }
        ListFooterComponent={<PaginationBar onPage={setPage} page={page} totalPages={totalPages} />}
        renderItem={({ item }) => <DocumentCard record={item} />}
      />
      <FilterModal
        onApply={() => setFiltersOpen(false)}
        onClear={() => {
          setDocumentType(undefined);
          setExpiryStatus(undefined);
          setExpiryFrom('');
          setExpiryTo('');
        }}
        onClose={() => setFiltersOpen(false)}
        visible={filtersOpen}
      >
        <StatusFilter
          allLabel="All types"
          labelOf={labelOf}
          onChange={setDocumentType}
          options={DOCUMENT_TYPES}
          value={documentType}
        />
        <DateRangePicker
          from={expiryFrom}
          fromPlaceholder="Expiry from"
          onChangeFrom={setExpiryFrom}
          onChangeTo={setExpiryTo}
          to={expiryTo}
          toPlaceholder="Expiry to"
        />
      </FilterModal>
      <FabButton
        label="Upload Document"
        onPress={() =>
          router.push(
            (employeeId ? `/documents/new?employeeId=${employeeId}` : '/documents/new') as Href,
          )
        }
      />
    </View>
  );
}

function DocumentCard({ record }: { record: DocumentListItem }) {
  return (
    <Pressable onPress={() => router.push(`/documents/${record.id}` as Href)} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardBody}>
          <Text style={styles.name}>{labelOf(record.documentType)}</Text>
          <Text style={styles.meta}>{record.employee.fullName}</Text>
          <Text style={styles.meta}>{record.documentNumberMasked || 'No document number'}</Text>
          <Text style={styles.meta}>
            Issued {record.issueDate || '—'} · Expires {record.expiryDate || '—'}
          </Text>
          <Text style={styles.meta}>{record.fileName}</Text>
        </View>
        <Text style={[styles.status, { color: statusColor(record.expiryStatus as DocumentExpiryStatus) }]}>
          {statusLabel(record.expiryStatus)}
        </Text>
      </View>
    </Pressable>
  );
}

function first(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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
