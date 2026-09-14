import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { DateRangePicker } from '@/features/filters/date-range-picker';
import { fetchDocumentReport } from '@/features/reports/api';
import { ReportExportBar } from '@/features/reports/export-bar';
import { FilterChips } from '@/features/reports/filter-chips';
import { labelOf } from '@/features/reports/format';
import { HorizontalBars } from '@/features/reports/horizontal-bars';
import { ReportCards, ReportSection } from '@/features/reports/report-ui';
import { ReportScroll, ReportState } from '@/features/reports/report-state';
import { DOCUMENT_TYPES } from '@/features/reports/types';

export default function DocumentReportScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const [documentType, setDocumentType] = useState<(typeof DOCUMENT_TYPES)[number] | undefined>();
  const [employeeId, setEmployeeId] = useState('');
  const [expiryFrom, setExpiryFrom] = useState('');
  const [expiryTo, setExpiryTo] = useState('');

  const query = useQuery({
    queryKey: ['reports', 'documents', { documentType, employeeId, expiryFrom, expiryTo }],
    enabled: isReady && isAuthenticated,
    queryFn: () =>
      fetchDocumentReport({
        documentType,
        employeeId: employeeId.trim() || undefined,
        expiryFrom: expiryFrom.trim() || undefined,
        expiryTo: expiryTo.trim() || undefined,
      }),
  });

  const report = query.data;

  return (
    <View style={styles.screen}>
      <ReportScroll refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
        <View style={styles.filters}>
          <TextInput onChangeText={setEmployeeId} placeholder="Employee ID (optional)" placeholderTextColor="#9ca3af" style={styles.input} value={employeeId} />
          <DateRangePicker
            from={expiryFrom}
            fromPlaceholder="Expiry from"
            label="Expiry date"
            onChangeFrom={setExpiryFrom}
            onChangeTo={setExpiryTo}
            to={expiryTo}
            toPlaceholder="Expiry to"
          />
          <FilterChips allLabel="All types" onChange={setDocumentType} options={DOCUMENT_TYPES} value={documentType} />
        </View>
        <ReportExportBar
          disabled={query.isPending}
          kind="documents"
          params={{
            documentType,
            employeeId: employeeId.trim() || undefined,
            expiryFrom: expiryFrom.trim() || undefined,
            expiryTo: expiryTo.trim() || undefined,
          }}
        />
        <ReportState
          empty={Boolean(report && report.total === 0)}
          emptyMessage="No documents match these filters."
          error={query.error}
          loading={query.isPending}
          onRetry={() => void query.refetch()}
        >
          {report ? (
            <>
              <ReportCards
                items={[
                  { label: 'Total', value: report.total },
                  { label: 'Valid', value: report.valid },
                  { label: 'Expiring soon', value: report.expiringSoon },
                  { label: 'Expired', value: report.expired },
                ]}
              />
              <ReportSection title="By document type">
                <HorizontalBars
                  items={report.byDocumentType.map((item) => ({
                    label: labelOf(item.documentType),
                    value: item.total,
                    color: '#1d4ed8',
                  }))}
                />
                {report.byDocumentType.map((item) => (
                  <Text key={item.documentType} style={styles.rowText}>
                    {labelOf(item.documentType)}: {item.valid} valid, {item.expiringSoon} soon, {item.expired} expired
                  </Text>
                ))}
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
  rowText: { color: '#4b5563' },
});
