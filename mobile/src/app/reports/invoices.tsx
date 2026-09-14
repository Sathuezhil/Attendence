import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { DateRangePicker } from '@/features/filters/date-range-picker';
import { fetchInvoiceReport } from '@/features/reports/api';
import { ReportExportBar } from '@/features/reports/export-bar';
import { FilterChips } from '@/features/reports/filter-chips';
import { money, monthStart, todayDate } from '@/features/reports/format';
import { HorizontalBars } from '@/features/reports/horizontal-bars';
import { ReportCards, ReportSection } from '@/features/reports/report-ui';
import { ReportScroll, ReportState } from '@/features/reports/report-state';
import { INVOICE_STATUSES } from '@/features/reports/types';

export default function InvoiceReportScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(todayDate());
  const [status, setStatus] = useState<(typeof INVOICE_STATUSES)[number] | undefined>();

  const query = useQuery({
    queryKey: ['reports', 'invoices', { startDate, endDate, status }],
    enabled: isReady && isAuthenticated,
    queryFn: () => fetchInvoiceReport({ startDate, endDate, status }),
  });

  const report = query.data;

  return (
    <View style={styles.screen}>
      <ReportScroll refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
        <View style={styles.filters}>
          <DateRangePicker
            from={startDate}
            fromPlaceholder="From"
            label=""
            onChangeFrom={setStartDate}
            onChangeTo={setEndDate}
            to={endDate}
            toPlaceholder="To"
          />
          <FilterChips allLabel="All status" onChange={setStatus} options={INVOICE_STATUSES} value={status} />
        </View>
        <ReportExportBar
          disabled={query.isPending}
          kind="invoices"
          params={{ startDate, endDate, status }}
        />
        <ReportState
          empty={Boolean(report && report.total === 0)}
          emptyMessage="No invoices in this period."
          error={query.error}
          loading={query.isPending}
          onRetry={() => void query.refetch()}
        >
          {report ? (
            <>
              <ReportCards
                items={[
                  { label: 'Total', value: report.total },
                  { label: 'Paid', value: report.paid },
                  { label: 'Pending', value: report.pending },
                  { label: 'Overdue', value: report.overdue },
                  { label: 'Cancelled', value: report.cancelled },
                  { label: 'Invoiced', value: money(report.totalInvoicedAmount) },
                  { label: 'Collected', value: money(report.totalPaidAmount) },
                  { label: 'Outstanding', value: money(report.outstandingAmount) },
                ]}
              />
              <ReportSection title="Invoice status">
                <HorizontalBars
                  items={[
                    { label: 'Paid', value: report.paid, color: '#166534' },
                    { label: 'Pending', value: report.pending, color: '#92400e' },
                    { label: 'Overdue', value: report.overdue, color: '#b91c1c' },
                    { label: 'Cancelled', value: report.cancelled, color: '#6b7280' },
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
});
