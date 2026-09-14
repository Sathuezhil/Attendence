import { type Href, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { DateRangePicker } from '@/features/filters/date-range-picker';
import { FilterButton } from '@/features/filters/filter-button';
import { FilterModal } from '@/features/filters/filter-modal';
import { PaginationBar } from '@/features/filters/pagination-bar';
import { SearchBar } from '@/features/filters/search-bar';
import { StatusFilter } from '@/features/filters/status-filter';
import { useDebouncedValue } from '@/features/filters/use-debounced-value';
import { usePagedFilters } from '@/features/filters/use-paged-filters';
import { deleteEmployee, fetchEmployees } from '@/features/employees/api';
import { confirmEmployeeDelete } from '@/features/employees/confirm';
import { initials, statusLabel } from '@/features/employees/form-utils';
import { employmentStatuses } from '@/features/employees/schema';
import { Employee, EmploymentStatus } from '@/features/employees/types';
import { ApiError } from '@/lib/api';
import { FabButton, useSafeBottomOffset } from '@/ui/fab-button';

export default function EmployeesScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const listBottom = useSafeBottomOffset(96);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EmploymentStatus | undefined>();
  const [jobTitle, setJobTitle] = useState('');
  const [joiningFrom, setJoiningFrom] = useState('');
  const [joiningTo, setJoiningTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const filterKey = JSON.stringify({
    search: debouncedSearch,
    status,
    jobTitle,
    joiningFrom,
    joiningTo,
  });
  const { page, setPage } = usePagedFilters(filterKey);

  const filterCount = [status, jobTitle.trim(), joiningFrom, joiningTo].filter(Boolean).length;

  const query = useQuery({
    queryKey: ['employees', { search: debouncedSearch, status, jobTitle, joiningFrom, joiningTo, page }],
    queryFn: () =>
      fetchEmployees({
        search: debouncedSearch.trim() || undefined,
        employmentStatus: status,
        jobTitle: jobTitle.trim() || undefined,
        joiningFrom: joiningFrom.trim() || undefined,
        joiningTo: joiningTo.trim() || undefined,
        page,
        limit: 20,
      }),
    enabled: isReady && isAuthenticated,
  });

  const employees = query.data?.data ?? [];
  const totalPages = query.data?.totalPages ?? 0;
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const removeEmployee = useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  async function onDelete(employee: Employee) {
    const confirmed = await confirmEmployeeDelete(employee.employeeCode);
    if (!confirmed) {
      return;
    }

    setDeletingId(employee.id);
    try {
      await removeEmployee.mutateAsync(employee.id);
    } finally {
      setDeletingId(null);
    }
  }

  if (!isReady || !isAuthenticated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.filters}>
        <SearchBar onChange={setSearch} placeholder="Search employees" value={search} />
        <FilterButton count={filterCount} onPress={() => setFiltersOpen(true)} />
      </View>

      {query.isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : query.error ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{query.error.message}</Text>
          <Pressable onPress={() => void query.refetch()} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            employees.length === 0 ? styles.emptyList : [styles.list, { paddingBottom: listBottom }]
          }
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
          }
          ListEmptyComponent={<Text style={styles.empty}>No employees found</Text>}
          ListFooterComponent={
            <>
              {removeEmployee.error ? (
                <Text style={styles.error}>
                  {removeEmployee.error instanceof ApiError
                    ? removeEmployee.error.message
                    : 'Unable to delete this employee.'}
                </Text>
              ) : null}
              <PaginationBar onPage={setPage} page={page} totalPages={totalPages} />
            </>
          }
          renderItem={({ item }) => (
            <EmployeeRow
              deleting={deletingId === item.id}
              employee={item}
              onDelete={() => void onDelete(item)}
            />
          )}
        />
      )}

      <FilterModal
        onApply={() => {
          setPage(1);
          setFiltersOpen(false);
        }}
        onClear={() => {
          setStatus(undefined);
          setJobTitle('');
          setJoiningFrom('');
          setJoiningTo('');
        }}
        onClose={() => setFiltersOpen(false)}
        visible={filtersOpen}
      >
        <StatusFilter onChange={setStatus} options={employmentStatuses} value={status} />
        <SearchBar onChange={setJobTitle} placeholder="Job title" value={jobTitle} />
        <DateRangePicker
          from={joiningFrom}
          fromPlaceholder="Joined from"
          onChangeFrom={setJoiningFrom}
          onChangeTo={setJoiningTo}
          to={joiningTo}
          toPlaceholder="Joined to"
        />
      </FilterModal>

      <FabButton
        accessibilityLabel="Add employee"
        label="Add Employee"
        onPress={() => router.push('/employees/new' as Href)}
      />
    </View>
  );
}

function EmployeeRow({
  employee,
  deleting,
  onDelete,
}: {
  employee: Employee;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <Pressable
      onPress={() => router.push(`/employees/${employee.id}` as Href)}
      style={styles.card}
    >
      {employee.profileImageUrl ? (
        <Image source={{ uri: employee.profileImageUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(employee.fullName)}</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.name}>{employee.fullName}</Text>
        <Text style={styles.meta}>{employee.employeeCode}</Text>
        <Text style={styles.meta}>
          {employee.jobTitle || 'No role assigned'}
        </Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${employee.fullName}`}
            onPress={(event) => {
              event.stopPropagation();
              router.push(`/employees/${employee.id}/edit` as Href);
            }}
            style={styles.editButton}
          >
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${employee.fullName}`}
            disabled={deleting}
            onPress={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.status}>{statusLabel(employee.employmentStatus)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  filters: {
    padding: 16,
    gap: 10,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 96,
    gap: 10,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  meta: {
    fontSize: 13,
    color: '#6b7280',
  },
  status: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e40af',
  },
  editButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#111827',
    justifyContent: 'center',
  },
  editText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
  },
  deleteText: {
    color: '#991b1b',
    fontSize: 12,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 15,
  },
  error: {
    color: '#991b1b',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
