import { type Href, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { fetchEmployees } from '@/features/employees/api';
import { initials, statusLabel } from '@/features/employees/form-utils';
import { employmentStatuses } from '@/features/employees/schema';
import { Employee, EmploymentStatus } from '@/features/employees/types';

export default function EmployeesScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EmploymentStatus | undefined>();
  const [department, setDepartment] = useState('');

  const query = useQuery({
    queryKey: ['employees', { search, status, department }],
    queryFn: () =>
      fetchEmployees({
        search: search.trim() || undefined,
        employmentStatus: status,
        department: department.trim() || undefined,
        limit: 50,
      }),
    enabled: isReady && isAuthenticated,
  });

  const employees = query.data?.data ?? [];
  const statusFilters = useMemo(() => [undefined, ...employmentStatuses], []);

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
        <TextInput
          onChangeText={setSearch}
          placeholder="Search employees"
          placeholderTextColor="#9ca3af"
          style={styles.search}
          value={search}
        />
        <TextInput
          onChangeText={setDepartment}
          placeholder="Filter by department"
          placeholderTextColor="#9ca3af"
          style={styles.search}
          value={department}
        />
        <View style={styles.chips}>
          {statusFilters.map((option) => {
            const selected = status === option;
            return (
              <Pressable
                key={option ?? 'ALL'}
                onPress={() => setStatus(option)}
                style={[styles.chip, selected ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>
                  {option ? statusLabel(option) : 'All'}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
          contentContainerStyle={employees.length === 0 ? styles.emptyList : styles.list}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
          }
          ListEmptyComponent={<Text style={styles.empty}>No employees found</Text>}
          renderItem={({ item }) => <EmployeeRow employee={item} />}
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add employee"
        onPress={() => router.push('/employees/new' as Href)}
        style={styles.fab}
      >
        <Text style={styles.fabText}>Add Employee</Text>
      </Pressable>
    </View>
  );
}

function EmployeeRow({ employee }: { employee: Employee }) {
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
          {[employee.jobTitle, employee.department].filter(Boolean).join(' · ') || 'No role assigned'}
        </Text>
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
