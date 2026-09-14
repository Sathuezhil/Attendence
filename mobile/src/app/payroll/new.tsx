import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { createPayroll, previewPayroll } from '@/features/payroll/api';
import { money } from '@/features/payroll/format';
import { PayrollPreview } from '@/features/payroll/types';
import { ApiError } from '@/lib/api';

export default function NewPayrollScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ employeeId?: string | string[] }>();
  const presetEmployeeId = Array.isArray(params.employeeId) ? params.employeeId[0] : params.employeeId;

  const now = new Date();
  const [employeeId, setEmployeeId] = useState(presetEmployeeId ?? '');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [basicSalary, setBasicSalary] = useState('');
  const [allowances, setAllowances] = useState('0');
  const [overtime, setOvertime] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<PayrollPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const employeesQuery = useQuery({
    queryKey: ['employees', { forPayroll: true }],
    enabled: isReady && isAuthenticated,
    queryFn: () => fetchEmployees({ employmentStatus: 'ACTIVE', limit: 100 }),
  });

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

  const selected = employeesQuery.data?.data.find((item) => item.id === employeeId);

  useEffect(() => {
    if (selected && !basicSalary && selected.basicSalary !== null) {
      setBasicSalary(String(selected.basicSalary));
    }
  }, [basicSalary, selected]);

  useEffect(() => {
    const monthNumber = Number(month);
    const yearNumber = Number(year);
    if (!employeeId || !monthNumber || !yearNumber) {
      setPreview(null);
      return;
    }

    const handle = setTimeout(() => {
      void previewPayroll({
        employeeId,
        payrollMonth: monthNumber,
        payrollYear: yearNumber,
        basicSalary: Number(basicSalary) || undefined,
        allowances: Number(allowances) || 0,
        overtimeAmount: Number(overtime) || 0,
        deductions: Number(deductions) || 0,
      })
        .then(setPreview)
        .catch(() => setPreview(null));
    }, 350);

    return () => clearTimeout(handle);
  }, [allowances, basicSalary, deductions, employeeId, month, overtime, year]);

  async function onSave() {
    setError(null);
    if (!employeeId) {
      setError('Select an employee');
      return;
    }
    const monthNumber = Number(month);
    const yearNumber = Number(year);
    if (monthNumber < 1 || monthNumber > 12 || !yearNumber) {
      setError('Enter a valid month and year');
      return;
    }

    setSaving(true);
    try {
      await createPayroll({
        employeeId,
        payrollMonth: monthNumber,
        payrollYear: yearNumber,
        basicSalary: Number(basicSalary) || undefined,
        allowances: Number(allowances) || 0,
        overtimeAmount: Number(overtime) || 0,
        deductions: Number(deductions) || 0,
        notes: notes.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['payroll'] });
      router.replace((presetEmployeeId ? `/payroll?employeeId=${presetEmployeeId}` : '/payroll') as Href);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to save payroll.');
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {presetEmployeeId ? null : (
          <View style={styles.card}>
            <Text style={styles.label}>Employee</Text>
            <TextInput
              onChangeText={setEmployeeSearch}
              placeholder="Search employee"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              value={employeeSearch}
            />
            {employees.map((employee) => (
              <Pressable
                key={employee.id}
                onPress={() => setEmployeeId(employee.id)}
                style={[styles.choice, employeeId === employee.id ? styles.choiceActive : null]}
              >
                <Text style={employeeId === employee.id ? styles.choiceTextActive : styles.choiceText}>
                  {employee.fullName} · {employee.employeeCode}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Field label="Month (1-12)" onChangeText={setMonth} value={month} />
          <Field label="Year" onChangeText={setYear} value={year} />
          <Field label="Basic salary" onChangeText={setBasicSalary} value={basicSalary} />
          <Field label="Allowances" onChangeText={setAllowances} value={allowances} />
          <Field label="Overtime" onChangeText={setOvertime} value={overtime} />
          <Field label="Deductions" onChangeText={setDeductions} value={deductions} />
          <Text style={styles.label}>Notes</Text>
          <TextInput
            multiline
            onChangeText={setNotes}
            placeholder="Optional notes"
            placeholderTextColor="#9ca3af"
            style={[styles.input, styles.notes]}
            value={notes}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Preview</Text>
          <Text style={styles.hint}>Final totals are calculated on the server.</Text>
          <Row label="Gross salary" value={preview ? money(preview.grossSalary) : '—'} />
          <Row
            label="Unpaid leave"
            value={
              preview
                ? `${preview.unpaidLeaveDays} day(s) · ${money(preview.unpaidLeaveDeduction)}`
                : '—'
            }
          />
          <Row label="Net salary" value={preview ? money(preview.netSalary) : '—'} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={saving} onPress={() => void onSave()} style={styles.button}>
          <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Create payroll'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={onChangeText}
        placeholderTextColor="#9ca3af"
        style={styles.input}
        value={value}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
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
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  hint: {
    color: '#6b7280',
    fontSize: 13,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    color: '#111827',
  },
  notes: {
    minHeight: 88,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  choice: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#f3f4f6',
  },
  choiceActive: {
    backgroundColor: '#111827',
  },
  choiceText: {
    color: '#111827',
  },
  choiceTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meta: {
    color: '#6b7280',
  },
  value: {
    fontWeight: '700',
    color: '#111827',
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
  error: {
    color: '#991b1b',
  },
});
