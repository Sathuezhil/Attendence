import { type Href, router, useLocalSearchParams } from 'expo-router';
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
import { useQuery } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { fetchDocuments } from '@/features/documents/api';
import {
  documentTypeFilters,
  labelOf,
  statusColor,
  statusLabel,
} from '@/features/documents/format';
import { DocumentExpiryStatus, DocumentListItem, DocumentType } from '@/features/documents/types';
import { ApiError } from '@/lib/api';

type ExpiryFilter = 'ALL' | 'EXPIRED' | 'EXPIRING';

export default function DocumentsListScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const params = useLocalSearchParams<{
    employeeId?: string | string[];
    expired?: string | string[];
    expiring?: string | string[];
  }>();
  const employeeId = first(params.employeeId);
  const initialExpiry: ExpiryFilter = first(params.expired)
    ? 'EXPIRED'
    : first(params.expiring)
      ? 'EXPIRING'
      : 'ALL';

  const [documentType, setDocumentType] = useState<DocumentType | undefined>();
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>(initialExpiry);

  const query = useQuery({
    queryKey: ['documents', { employeeId, documentType, expiryFilter }],
    enabled: isReady && isAuthenticated,
    queryFn: () =>
      fetchDocuments({
        employeeId,
        documentType,
        expired: expiryFilter === 'EXPIRED' ? true : undefined,
        expiringWithin: expiryFilter === 'EXPIRING' ? 30 : undefined,
        limit: 50,
      }),
  });

  const records = query.data?.data ?? [];
  const expiryFilters = useMemo(() => ['ALL', 'EXPIRED', 'EXPIRING'] as const, []);

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
            <View style={styles.chips}>
              {documentTypeFilters.map((option) => (
                <Pressable
                  key={option ?? 'ALL_TYPE'}
                  onPress={() => setDocumentType(option)}
                  style={[styles.chip, documentType === option ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, documentType === option ? styles.chipTextActive : null]}>
                    {option ? labelOf(option) : 'All types'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.chips}>
              {expiryFilters.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setExpiryFilter(option)}
                  style={[styles.chip, expiryFilter === option ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, expiryFilter === option ? styles.chipTextActive : null]}>
                    {option === 'ALL' ? 'All expiry' : option === 'EXPIRED' ? 'Expired' : 'Expiring soon'}
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
              {query.error instanceof ApiError ? query.error.message : 'Unable to load documents.'}
            </Text>
          ) : (
            <Text style={styles.empty}>No documents found</Text>
          )
        }
        renderItem={({ item }) => <DocumentCard record={item} />}
      />
      <Pressable
        onPress={() =>
          router.push(
            (employeeId ? `/documents/new?employeeId=${employeeId}` : '/documents/new') as Href,
          )
        }
        style={styles.fab}
      >
        <Text style={styles.fabText}>Upload Document</Text>
      </Pressable>
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
