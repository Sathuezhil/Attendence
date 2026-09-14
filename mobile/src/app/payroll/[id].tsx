import { type Href, router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { confirmAction } from '@/features/attendance/confirm';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { downloadAndOpenExport } from '@/features/exports/open-file';
import { cancelPayroll, fetchPayrollRecord, markPayrollPaid } from '@/features/payroll/api';
import { labelOf, money, monthLabel, statusColor } from '@/features/payroll/format';
import { ApiError } from '@/lib/api';

export default function PayrollDetailsScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['payroll', id],
    queryFn: () => fetchPayrollRecord(id),
    enabled: Boolean(id) && isReady && isAuthenticated,
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['payroll'] });
  }

  const pay = useMutation({
    mutationFn: () => markPayrollPaid(id),
    onSuccess: () => refresh(),
  });

  const cancel = useMutation({
    mutationFn: () => cancelPayroll(id),
    async onSuccess() {
      await refresh();
      router.replace('/payroll' as Href);
    },
  });

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
          {query.error instanceof ApiError ? query.error.message : 'Payroll not found'}
        </Text>
      </View>
    );
  }

  const record = query.data;
  const pending = record.paymentStatus === 'PENDING';
  const actionError = pay.error ?? cancel.error;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.name}>{record.employee.fullName}</Text>
      <Text style={styles.meta}>
        {monthLabel(record.payrollMonth)} {record.payrollYear}
      </Text>
      <Text style={[styles.status, { color: statusColor(record.paymentStatus) }]}>
        {labelOf(record.paymentStatus)}
      </Text>

      <Section title="Earnings">
        <Row label="Basic" value={money(record.basicSalary)} />
        <Row label="Allowances" value={money(record.allowances)} />
        <Row label="Overtime" value={money(record.overtimeAmount)} />
      </Section>

      <Section title="Deductions">
        <Row
          label="Unpaid leave"
          value={`${record.unpaidLeaveDays} day(s) · ${money(record.unpaidLeaveDeduction)}`}
        />
        <Row label="Other deductions" value={money(record.deductions + record.otherDeductions)} />
      </Section>

      <Section title="Summary">
        <Row label="Gross" value={money(record.grossSalary)} />
        <Row label="Net" value={money(record.netSalary)} />
      </Section>

      <Section title="Payment">
        <Row label="Status" value={labelOf(record.paymentStatus)} />
        <Row label="Payment date" value={record.paymentDate} />
        <Row label="Notes" value={record.notes} />
      </Section>

      <View style={styles.actions}>
        <Pressable
          disabled={exporting}
          onPress={async () => {
            setExporting(true);
            setExportError(null);
            try {
              await downloadAndOpenExport(`/payroll/${record.id}/payslip`);
            } catch (error) {
              setExportError(error instanceof ApiError ? error.message : 'Unable to generate this payslip.');
            } finally {
              setExporting(false);
            }
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{exporting ? 'Generating…' : 'Generate Payslip'}</Text>
        </Pressable>
        {pending ? (
          <>
            <Pressable
              disabled={pay.isPending}
              onPress={async () => {
                if (await confirmAction('Mark paid', 'Mark this payroll as paid?')) {
                  pay.mutate();
                }
              }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>{pay.isPending ? 'Updating…' : 'Mark paid'}</Text>
            </Pressable>
            <Pressable
              disabled={cancel.isPending}
              onPress={async () => {
                if (await confirmAction('Cancel payroll', 'Cancel this payroll record?')) {
                  cancel.mutate();
                }
              }}
              style={styles.dangerButton}
            >
              <Text style={styles.dangerText}>{cancel.isPending ? 'Cancelling…' : 'Cancel payroll'}</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      {exportError ? <Text style={styles.error}>{exportError}</Text> : null}
      {actionError ? (
        <Text style={styles.error}>
          {actionError instanceof ApiError ? actionError.message : 'Unable to update payroll.'}
        </Text>
      ) : null}
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
    gap: 12,
    backgroundColor: '#f4f6f8',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
