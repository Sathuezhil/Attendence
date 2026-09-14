import { type Href, router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { deactivateEmployee, fetchEmployee } from '@/features/employees/api';
import { initials, statusLabel } from '@/features/employees/form-utils';
import { ApiError } from '@/lib/api';

export default function EmployeeDetailsScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['employees', id],
    queryFn: () => fetchEmployee(id),
    enabled: Boolean(id) && isReady && isAuthenticated,
  });

  const deactivate = useMutation({
    mutationFn: () => deactivateEmployee(id),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.replace('/employees' as Href);
    },
  });

  function confirmDeactivate() {
    const message = 'Are you sure you want to deactivate this employee?';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        deactivate.mutate();
      }
      return;
    }

    Alert.alert('Deactivate employee', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () => deactivate.mutate(),
      },
    ]);
  }

  if (!isReady || !isAuthenticated || query.isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (query.error || !query.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>
          {query.error instanceof ApiError ? query.error.message : 'Employee not found'}
        </Text>
      </View>
    );
  }

  const employee = query.data;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        {employee.profileImageUrl ? (
          <Image source={{ uri: employee.profileImageUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(employee.fullName)}</Text>
          </View>
        )}
        <Text style={styles.name}>{employee.fullName}</Text>
        <Text style={styles.meta}>{employee.employeeCode}</Text>
        <Text style={styles.status}>{statusLabel(employee.employmentStatus)}</Text>
      </View>

      <Section title="Profile">
        <Row label="Date of birth" value={employee.dateOfBirth} />
        <Row label="Gender" value={employee.gender ? statusLabel(employee.gender) : null} />
        <Row label="Nationality" value={employee.nationality} />
        <Row label="Address" value={employee.address} />
      </Section>

      <Section title="Contact">
        <Row label="Email" value={employee.email} />
        <Row label="Phone" value={employee.phone} />
        <Row label="Alternate phone" value={employee.alternatePhone} />
      </Section>

      <Section title="Employment">
        <Row label="Job title" value={employee.jobTitle} />
        <Row label="Department" value={employee.department} />
        <Row label="Joining date" value={employee.joiningDate} />
        <Row
          label="Basic salary"
          value={employee.basicSalary === null ? null : String(employee.basicSalary)}
        />
      </Section>

      <View style={styles.actions}>
        <Pressable onPress={() => router.push(`/employees/${employee.id}/edit` as Href)} style={styles.button}>
          <Text style={styles.buttonText}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/attendance/history?employeeId=${employee.id}` as Href)}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Attendance</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/leave?employeeId=${employee.id}` as Href)}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Leave</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/documents?employeeId=${employee.id}` as Href)}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Documents</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/payroll?employeeId=${employee.id}` as Href)}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Payroll</Text>
        </Pressable>
        <Pressable
          onPress={confirmDeactivate}
          disabled={deactivate.isPending}
          style={styles.dangerButton}
        >
          <Text style={styles.dangerText}>
            {deactivate.isPending ? 'Deactivating…' : 'Deactivate'}
          </Text>
        </Pressable>
        {deactivate.error ? (
          <Text style={styles.error}>
            {deactivate.error instanceof ApiError
              ? deactivate.error.message
              : 'Unable to deactivate this employee.'}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.section}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'Not provided'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
    backgroundColor: '#f4f6f8',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  hero: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  meta: {
    color: '#6b7280',
  },
  status: {
    fontWeight: '700',
    color: '#1e40af',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  row: {
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 15,
    color: '#111827',
  },
  actions: {
    gap: 10,
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dangerButton: {
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
  },
  dangerText: {
    color: '#991b1b',
    fontWeight: '700',
  },
  error: {
    color: '#991b1b',
    textAlign: 'center',
  },
});
