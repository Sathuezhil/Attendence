import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { downloadAndOpenExport } from '@/features/exports/open-file';
import { ApiError } from '@/lib/api';

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export function ReportExportBar({
  kind,
  params,
  disabled = false,
}: {
  kind: 'employees' | 'attendance' | 'leave' | 'payroll' | 'invoices' | 'documents';
  params: Record<string, string | number | undefined>;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState<'pdf' | 'csv' | 'xlsx' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportFile(format: 'pdf' | 'csv' | 'xlsx') {
    setBusy(format);
    setError(null);
    try {
      await downloadAndOpenExport(`/exports/${kind}/${format}${toQuery(params)}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to export this report.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <ExportButton
          disabled={disabled || Boolean(busy)}
          label={busy === 'pdf' ? 'Exporting…' : 'Export PDF'}
          onPress={() => void exportFile('pdf')}
        />
        <ExportButton
          disabled={disabled || Boolean(busy)}
          label={busy === 'csv' ? 'Exporting…' : 'Export CSV'}
          onPress={() => void exportFile('csv')}
        />
        <ExportButton
          disabled={disabled || Boolean(busy)}
          label={busy === 'xlsx' ? 'Exporting…' : 'Export Excel'}
          onPress={() => void exportFile('xlsx')}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function ExportButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.button, disabled ? styles.disabled : null]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 40,
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  label: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  error: { color: '#991b1b' },
});
