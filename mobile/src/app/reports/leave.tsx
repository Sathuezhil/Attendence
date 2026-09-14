import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { DateRangePicker } from '@/features/filters/date-range-picker';
import { fetchLeaveReport } from '@/features/reports/api';
import { ReportExportBar } from '@/features/reports/export-bar';
import { FilterChips } from '@/features/reports/filter-chips';
import { labelOf, monthStart, todayDate } from '@/features/reports/format';
import { HorizontalBars } from '@/features/reports/horizontal-bars';
import { ReportCards, ReportSection } from '@/features/reports/report-ui';
import { ReportScroll, ReportState } from '@/features/reports/report-state';
import { LEAVE_STATUSES, LEAVE_TYPES } from '@/features/reports/types';

export default function LeaveReportScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState<(typeof LEAVE_TYPES)[number] | undefined>();
  const [status, setStatus] = useState<(typeof LEAVE_STATUSES)[number] | undefined>();
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(todayDate());

  const query = useQuery({
    queryKey: ['reports', 'leave', { employeeId, leaveType, status, startDate, endDate }],
    enabled: isReady && isAuthenticated,
    queryFn: () =>
      fetchLeaveReport({
        employeeId: employeeId.trim() || undefined,
        leaveType,
        status,
        startDate,
        endDate,
      }),
  });

  const report = query.data;

  return (
    <View style={styles.screen}>
      <ReportScroll refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
        <View style={styles.filters}>
          <TextInput onChangeText={setEmployeeId} placeholder="Employee ID (optional)" placeholderTextColor="#9ca3af" style={styles.input} value={employeeId} />
          <DateRangePicker
            from={startDate}
            fromPlaceholder="From"
            label=""
            onChangeFrom={setStartDate}
            onChangeTo={setEndDate}
            to={endDate}
            toPlaceholder="To"
          />
          <FilterChips allLabel="All types" onChange={setLeaveType} options={LEAVE_TYPES} value={leaveType} />
          <FilterChips allLabel="All status" onChange={setStatus} options={LEAVE_STATUSES} value={status} />
        </View>
        <ReportExportBar
          disabled={query.isPending}
          kind="leave"
          params={{
            employeeId: employeeId.trim() || undefined,
            leaveType,
            status,
            startDate,
            endDate,
          }}
        />
        <ReportState
          empty={Boolean(report && report.total === 0)}
          emptyMessage="No leave records in this period."
          error={query.error}
          loading={query.isPending}
          onRetry={() => void query.refetch()}
        >
          {report ? (
            <>
              <ReportCards
                items={[
                  { label: 'Total', value: report.total },
                  { label: 'Approved', value: report.approved },
                  { label: 'Pending', value: report.pending },
                  { label: 'Rejected', value: report.rejected },
                ]}
              />
              <ReportSection title="Days by leave type">
                <HorizontalBars
                  items={report.daysByLeaveType.map((item, index) => ({
                    label: labelOf(item.leaveType),
                    value: item.days,
                    color: ['#1d4ed8', '#166534', '#92400e', '#7c3aed', '#6b7280'][index % 5],
                  }))}
                />
              </ReportSection>
              <ReportSection title="Employee leave summary">
                {report.employeeSummaries.length === 0 ? (
                  <Text style={styles.muted}>No employee summaries</Text>
                ) : (
                  report.employeeSummaries.map((item) => (
                    <Text key={item.employeeId} style={styles.rowText}>
                      {item.fullName} · {item.days} day(s) · {item.requests} request(s)
                    </Text>
                  ))
                )}
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
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    color: '#111827',
  },
  muted: { color: '#6b7280' },
  rowText: { color: '#111827' },
});
