import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { fetchPayrollReport } from '@/features/reports/api';
import { ReportExportBar } from '@/features/reports/export-bar';
import { FilterChips } from '@/features/reports/filter-chips';
import { money, monthLabel } from '@/features/reports/format';
import { HorizontalBars } from '@/features/reports/horizontal-bars';
import { ReportCards, ReportSection } from '@/features/reports/report-ui';
import { ReportScroll, ReportState } from '@/features/reports/report-state';
import { PAYMENT_STATUSES } from '@/features/reports/types';

export default function PayrollReportScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const now = new Date();
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(String(now.getFullYear()));
  const [employeeId, setEmployeeId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<(typeof PAYMENT_STATUSES)[number] | undefined>();

  const query = useQuery({
    queryKey: ['reports', 'payroll', { month, year, employeeId, paymentStatus }],
    enabled: isReady && isAuthenticated,
    queryFn: () =>
      fetchPayrollReport({
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        employeeId: employeeId.trim() || undefined,
        paymentStatus,
      }),
  });

  const report = query.data;

  return (
    <View style={styles.screen}>
      <ReportScroll refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
        <View style={styles.filters}>
          <View style={styles.row}>
            <TextInput keyboardType="number-pad" onChangeText={setMonth} placeholder="Month 1-12" placeholderTextColor="#9ca3af" style={[styles.input, styles.flex]} value={month} />
            <TextInput keyboardType="number-pad" onChangeText={setYear} placeholder="Year" placeholderTextColor="#9ca3af" style={[styles.input, styles.flex]} value={year} />
          </View>
          <TextInput onChangeText={setEmployeeId} placeholder="Employee ID (optional)" placeholderTextColor="#9ca3af" style={styles.input} value={employeeId} />
          <FilterChips allLabel="All status" onChange={setPaymentStatus} options={PAYMENT_STATUSES} value={paymentStatus} />
        </View>
        <ReportExportBar
          disabled={query.isPending}
          kind="payroll"
          params={{
            month: month ? Number(month) : undefined,
            year: year ? Number(year) : undefined,
            employeeId: employeeId.trim() || undefined,
            paymentStatus,
          }}
        />
        <ReportState
          empty={Boolean(report && report.totalPayroll === 0)}
          emptyMessage="No payroll records match these filters."
          error={query.error}
          loading={query.isPending}
          onRetry={() => void query.refetch()}
        >
          {report ? (
            <>
              <ReportCards
                items={[
                  { label: 'Records', value: report.totalPayroll },
                  { label: 'Gross', value: money(report.grossSalary) },
                  { label: 'Deductions', value: money(report.totalDeductions) },
                  { label: 'Net', value: money(report.netSalary) },
                  { label: 'Paid', value: money(report.paidAmount) },
                  { label: 'Pending', value: money(report.pendingAmount) },
                ]}
              />
              <ReportSection title="Payroll trend">
                <HorizontalBars
                  items={report.monthlyTrend.map((point) => ({
                    label: `${monthLabel(point.month)} ${point.year}`,
                    value: point.netSalary,
                    color: '#1d4ed8',
                  }))}
                />
              </ReportSection>
            </>
          ) : null}
        </ReportState>
      </ReportScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f6f8' },
  filters: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    color: '#111827',
  },
});
