import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { fetchEmployees } from '@/features/employees/api';
import { DateRangePicker } from '@/features/filters/date-range-picker';
import { fetchAttendanceReport } from '@/features/reports/api';
import { ReportExportBar } from '@/features/reports/export-bar';
import { FilterChips } from '@/features/reports/filter-chips';
import { monthStart, todayDate } from '@/features/reports/format';
import { HorizontalBars } from '@/features/reports/horizontal-bars';
import { ReportCards, ReportSection } from '@/features/reports/report-ui';
import { ReportScroll, ReportState } from '@/features/reports/report-state';
import { ATTENDANCE_STATUSES } from '@/features/reports/types';

export default function AttendanceReportScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeId, setEmployeeId] = useState<string | undefined>();
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(todayDate());
  const [status, setStatus] = useState<(typeof ATTENDANCE_STATUSES)[number] | undefined>();

  const employeesQuery = useQuery({
    queryKey: ['employees', { forAttendanceReport: true }],
    enabled: isReady && isAuthenticated,
    queryFn: () => fetchEmployees({ employmentStatus: 'ACTIVE', limit: 100 }),
  });

  const employees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    const list = employeesQuery.data?.data ?? [];
    if (!term) {
      return list.slice(0, 8);
    }
    return list.filter((item) => `${item.fullName} ${item.employeeCode}`.toLowerCase().includes(term)).slice(0, 8);
  }, [employeeSearch, employeesQuery.data]);

  const query = useQuery({
    queryKey: ['reports', 'attendance', { employeeId, startDate, endDate, status }],
    enabled: isReady && isAuthenticated,
    queryFn: () =>
      fetchAttendanceReport({
        employeeId,
        startDate,
        endDate,
        status,
      }),
  });

  const report = query.data;

  return (
    <View style={styles.screen}>
      <ReportScroll refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
        <View style={styles.filters}>
          <TextInput onChangeText={setEmployeeSearch} placeholder="Search employee" placeholderTextColor="#9ca3af" style={styles.input} value={employeeSearch} />
          {employeeSearch ? (
            <View style={styles.choices}>
              <Text style={styles.choice} onPress={() => setEmployeeId(undefined)}>
                All employees
              </Text>
              {employees.map((employee) => (
                <Text
                  key={employee.id}
                  onPress={() => setEmployeeId(employee.id)}
                  style={[styles.choice, employeeId === employee.id ? styles.choiceActive : null]}
                >
                  {employee.fullName}
                </Text>
              ))}
            </View>
          ) : null}
          <DateRangePicker
            from={startDate}
            fromPlaceholder="From"
            label=""
            onChangeFrom={setStartDate}
            onChangeTo={setEndDate}
            to={endDate}
            toPlaceholder="To"
          />
          <FilterChips allLabel="All status" onChange={setStatus} options={ATTENDANCE_STATUSES} value={status} />
        </View>
        <ReportExportBar
          disabled={query.isPending}
          kind="attendance"
          params={{
            employeeId,
            startDate,
            endDate,
            status,
          }}
        />
        <ReportState
          empty={Boolean(report && report.recordedDays === 0)}
          emptyMessage="No attendance records in this period."
          error={query.error}
          loading={query.isPending}
          onRetry={() => void query.refetch()}
        >
          {report ? (
            <>
              <ReportCards
                items={[
                  { label: 'Active', value: report.present + report.late },
                  { label: 'Leave', value: report.absent + report.onLeave },
                  { label: 'Half-day', value: report.halfDay },
                  { label: 'Attendance %', value: `${report.attendancePercentage}%` },
                  { label: 'Working hours', value: report.totalWorkingHours },
                  { label: 'Late minutes', value: report.lateMinutes },
                ]}
              />
              <ReportSection title="Attendance status">
                <HorizontalBars
                  items={[
                    { label: 'Active', value: report.present + report.late, color: '#166534' },
                    { label: 'Half-day', value: report.halfDay, color: '#7c3aed' },
                    { label: 'Leave', value: report.absent + report.onLeave, color: '#1d4ed8' },
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
  choices: { gap: 6 },
  choice: { padding: 8, backgroundColor: '#e5e7eb', borderRadius: 8, color: '#111827' },
  choiceActive: { backgroundColor: '#111827', color: '#ffffff' },
});
