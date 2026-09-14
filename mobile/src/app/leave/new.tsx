import { type Href, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { fetchEmployees } from '@/features/employees/api';
import { createLeave } from '@/features/leave/api';
import { calculateDisplayDays, labelOf, leaveTypes } from '@/features/leave/format';
import { LeaveType } from '@/features/leave/types';
import { ApiError } from '@/lib/api';
import { DateField } from '@/ui/date-field';

export default function NewLeaveScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveType>('ANNUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const employeesQuery = useQuery({
    queryKey: ['employees', { forLeave: true }],
    enabled: isReady && isAuthenticated,
    queryFn: () => fetchEmployees({ employmentStatus: 'ACTIVE', limit: 100 }),
  });

  const totalDays = calculateDisplayDays(startDate, endDate);
  const employees = useMemo(() => {
    const list = employeesQuery.data?.data ?? [];
    const search = employeeSearch.trim().toLowerCase();
    if (!search) {
      return list;
    }

    return list.filter((employee) =>
      `${employee.fullName} ${employee.employeeCode}`.toLowerCase().includes(search),
    );
  }, [employeeSearch, employeesQuery.data]);

  async function onSave() {
    setError(null);
    if (!employeeId) {
      setError('Select an employee');
      return;
    }
    if (!totalDays) {
      setError('Select a valid start and end date');
      return;
    }

    setSaving(true);
    try {
      await createLeave({
        employeeId,
        leaveType,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['leave'] });
      await queryClient.invalidateQueries({ queryKey: ['attendance'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.replace('/leave' as Href);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to save leave.');
    } finally {
      setSaving(false);
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
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Employee</Text>
        <TextInput
          onChangeText={setEmployeeSearch}
          placeholder="Search employee"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={employeeSearch}
        />
        <View style={styles.chips}>
          {employees.slice(0, 12).map((employee) => (
            <Pressable
              key={employee.id}
              onPress={() => setEmployeeId(employee.id)}
              style={[styles.chip, employeeId === employee.id ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, employeeId === employee.id ? styles.chipTextActive : null]}>
                {employee.fullName} · {employee.employeeCode}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Leave type</Text>
        <View style={styles.chips}>
          {leaveTypes.map((option) => (
            <Pressable
              key={option}
              onPress={() => setLeaveType(option)}
              style={[styles.chip, leaveType === option ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, leaveType === option ? styles.chipTextActive : null]}>
                {labelOf(option)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Start date</Text>
        <DateField onChange={setStartDate} placeholder="Select start date" value={startDate} />
        <Text style={styles.label}>End date</Text>
        <DateField onChange={setEndDate} placeholder="Select end date" value={endDate} />
        <Text style={styles.days}>
          Total days: {totalDays ?? 'Select a valid date range'}
        </Text>

        <Text style={styles.label}>Reason</Text>
        <TextInput
          multiline
          onChangeText={setReason}
          placeholder="Required for sick, emergency and other leave"
          placeholderTextColor="#9ca3af"
          style={[styles.input, styles.multiline]}
          value={reason}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          disabled={saving}
          onPress={() => void onSave()}
          style={[styles.button, saving ? styles.buttonDisabled : null]}
        >
          {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Save leave</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    fontSize: 16,
    color: '#111827',
  },
  multiline: {
    minHeight: 84,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  days: {
    fontWeight: '700',
    color: '#111827',
  },
  error: {
    color: '#991b1b',
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});
