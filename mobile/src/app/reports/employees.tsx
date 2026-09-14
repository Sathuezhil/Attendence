import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { DateRangePicker } from '@/features/filters/date-range-picker';
import { FilterChips } from '@/features/reports/filter-chips';
import { fetchEmployeeReport } from '@/features/reports/api';
import { ReportExportBar } from '@/features/reports/export-bar';
import { HorizontalBars } from '@/features/reports/horizontal-bars';
import { ReportCards, ReportSection } from '@/features/reports/report-ui';
import { ReportScroll, ReportState } from '@/features/reports/report-state';
import { EMPLOYMENT_STATUSES } from '@/features/reports/types';

export default function EmployeeReportScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const [jobTitle, setJobTitle] = useState('');
  const [joiningFrom, setJoiningFrom] = useState('');
  const [joiningTo, setJoiningTo] = useState('');
  const [status, setStatus] = useState<(typeof EMPLOYMENT_STATUSES)[number] | undefined>();

  const query = useQuery({
    queryKey: ['reports', 'employees', { jobTitle, joiningFrom, joiningTo, status }],
    enabled: isReady && isAuthenticated,
    queryFn: () =>
      fetchEmployeeReport({
        jobTitle: jobTitle.trim() || undefined,
        joiningFrom: joiningFrom.trim() || undefined,
        joiningTo: joiningTo.trim() || undefined,
        status,
      }),
  });

  const report = query.data;

  return (
    <View style={styles.screen}>
      <ReportScroll refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
        <View style={styles.filters}>
          <TextInput onChangeText={setJobTitle} placeholder="Job title" placeholderTextColor="#9ca3af" style={styles.input} value={jobTitle} />
          <DateRangePicker
            from={joiningFrom}
            fromPlaceholder="Joined from"
            label="Joining date"
            onChangeFrom={setJoiningFrom}
            onChangeTo={setJoiningTo}
            to={joiningTo}
            toPlaceholder="Joined to"
          />
          <FilterChips allLabel="All status" onChange={setStatus} options={EMPLOYMENT_STATUSES} value={status} />
        </View>
        <ReportExportBar
          disabled={query.isPending}
          kind="employees"
          params={{
            jobTitle: jobTitle.trim() || undefined,
            joiningFrom: joiningFrom.trim() || undefined,
            joiningTo: joiningTo.trim() || undefined,
            status,
          }}
        />
        <ReportState
          empty={Boolean(report && report.total === 0)}
          emptyMessage="No employees match these filters."
          error={query.error}
          loading={query.isPending}
          onRetry={() => void query.refetch()}
        >
          {report ? (
            <>
              <ReportCards
                items={[
                  { label: 'Total', value: report.total },
                  { label: 'Active', value: report.active },
                  { label: 'Inactive', value: report.inactive },
                  { label: 'On leave', value: report.onLeave },
                ]}
              />
              <ReportSection title="Status mix">
                <HorizontalBars
                  items={[
                    { label: 'Active', value: report.active, color: '#166534' },
                    { label: 'On leave', value: report.onLeave, color: '#1d4ed8' },
                    { label: 'Inactive', value: report.inactive, color: '#92400e' },
                    { label: 'Terminated', value: report.terminated, color: '#6b7280' },
                  ]}
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
