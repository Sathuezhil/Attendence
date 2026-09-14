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
import { cancelInvoice, fetchInvoice, markInvoicePaid, sendInvoice } from '@/features/invoices/api';
import { labelOf, money, statusColor } from '@/features/invoices/format';
import { ApiError } from '@/lib/api';

export default function InvoiceDetailsScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => fetchInvoice(id),
    enabled: Boolean(id) && isReady && isAuthenticated,
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['invoices'] });
  }

  const send = useMutation({
    mutationFn: () => sendInvoice(id),
    onSuccess: () => refresh(),
  });
  const pay = useMutation({
    mutationFn: () => markInvoicePaid(id),
    onSuccess: () => refresh(),
  });
  const cancel = useMutation({
    mutationFn: () => cancelInvoice(id),
    onSuccess: () => refresh(),
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
          {query.error instanceof ApiError ? query.error.message : 'Invoice not found'}
        </Text>
      </View>
    );
  }

  const invoice = query.data;
  const canEdit = ['DRAFT', 'SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(invoice.status);
  const canSend = invoice.status === 'DRAFT';
  const canPay = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';
  const canCancel = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';
  const actionError = send.error ?? pay.error ?? cancel.error;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.name}>{invoice.invoiceNumber}</Text>
      <Text style={[styles.status, { color: statusColor(invoice.status) }]}>
        {labelOf(invoice.status)}
      </Text>
      <Text style={styles.meta}>
        {invoice.invoiceDate} · Due {invoice.dueDate}
      </Text>

      {invoice.company ? (
        <Section title="Company">
          <Row label="Name" value={invoice.company.name} />
          <Row label="Email" value={invoice.company.email} />
          <Row label="Phone" value={invoice.company.phone} />
          <Row label="Address" value={invoice.company.address} />
        </Section>
      ) : null}

      <Section title="Customer">
        <Row label="Name" value={invoice.customerName} />
        <Row label="Email" value={invoice.customerEmail} />
        <Row label="Phone" value={invoice.customerPhone} />
        <Row label="Address" value={invoice.customerAddress} />
      </Section>

      <Section title="Items">
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.flex]}>Description</Text>
          <Text style={styles.tableCell}>Qty</Text>
          <Text style={styles.tableCell}>Price</Text>
          <Text style={styles.tableCell}>Tax</Text>
          <Text style={styles.tableCell}>Total</Text>
        </View>
        {invoice.items.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={[styles.tableValue, styles.flex]}>{item.description}</Text>
            <Text style={styles.tableValue}>{item.quantity}</Text>
            <Text style={styles.tableValue}>{money(item.unitPrice)}</Text>
            <Text style={styles.tableValue}>{money(item.taxRate)}%</Text>
            <Text style={styles.tableValue}>{money(item.lineTotal)}</Text>
          </View>
        ))}
      </Section>

      <Section title="Summary">
        <Row label="Subtotal" value={money(invoice.subtotal)} />
        <Row label="Discount" value={money(invoice.discountAmount)} />
        <Row label="Tax" value={money(invoice.taxAmount)} />
        <Row label="Grand total" value={money(invoice.totalAmount)} />
      </Section>

      <Section title="Notes">
        <Row label="Notes" value={invoice.notes} />
      </Section>

      <View style={styles.actions}>
        {canEdit ? (
          <Pressable onPress={() => router.push(`/invoices/${invoice.id}/edit` as Href)} style={styles.button}>
            <Text style={styles.buttonText}>Edit</Text>
          </Pressable>
        ) : null}
        {canSend ? (
          <Pressable
            disabled={send.isPending}
            onPress={async () => {
              if (await confirmAction('Send invoice', 'Mark this invoice as sent?')) {
                send.mutate();
              }
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{send.isPending ? 'Updating…' : 'Send'}</Text>
          </Pressable>
        ) : null}
        {canPay ? (
          <Pressable
            disabled={pay.isPending}
            onPress={async () => {
              if (await confirmAction('Mark paid', 'Mark this invoice as paid?')) {
                pay.mutate();
              }
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{pay.isPending ? 'Updating…' : 'Mark Paid'}</Text>
          </Pressable>
        ) : null}
        <Pressable
          disabled={exporting}
          onPress={async () => {
            setExporting(true);
            setExportError(null);
            try {
              await downloadAndOpenExport(`/invoices/${invoice.id}/pdf`);
            } catch (error) {
              setExportError(error instanceof ApiError ? error.message : 'Unable to generate this invoice PDF.');
            } finally {
              setExporting(false);
            }
          }}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>{exporting ? 'Generating…' : 'Generate PDF'}</Text>
        </Pressable>
        {canCancel ? (
          <Pressable
            disabled={cancel.isPending}
            onPress={async () => {
              if (await confirmAction('Cancel invoice', 'Cancel this invoice? It will stay in history.')) {
                cancel.mutate();
              }
            }}
            style={styles.dangerButton}
          >
            <Text style={styles.dangerText}>{cancel.isPending ? 'Cancelling…' : 'Cancel'}</Text>
          </Pressable>
        ) : null}
      </View>

      {exportError ? <Text style={styles.error}>{exportError}</Text> : null}
      {actionError ? (
        <Text style={styles.error}>
          {actionError instanceof ApiError ? actionError.message : 'Unable to update invoice.'}
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
  tableHeader: {
    flexDirection: 'row',
    gap: 6,
  },
  tableRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tableCell: {
    width: 48,
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  tableValue: {
    width: 48,
    fontSize: 12,
    color: '#111827',
  },
  flex: {
    flex: 1,
    width: 'auto',
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
  secondary: {
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  secondaryText: {
    color: '#111827',
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
