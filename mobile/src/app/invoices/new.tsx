import { type Href, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { createInvoice } from '@/features/invoices/api';
import { emptyInvoiceValues, InvoiceForm } from '@/features/invoices/invoice-form';
import { InvoiceWritePayload } from '@/features/invoices/types';
import { ApiError } from '@/lib/api';

export default function NewInvoiceScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const queryClient = useQueryClient();
  const initialValues = useMemo(() => emptyInvoiceValues(), []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(payload: InvoiceWritePayload) {
    setError(null);
    if (!payload.customerName) {
      setError('Customer name is required');
      return;
    }
    if (!payload.items.length) {
      setError('Add at least one invoice item');
      return;
    }

    setSaving(true);
    try {
      const invoice = await createInvoice(payload);
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      router.replace(`/invoices/${invoice.id}` as Href);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to save invoice.');
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
    <InvoiceForm
      error={error}
      initialValues={initialValues}
      onSubmit={(payload) => void onSubmit(payload)}
      saving={saving}
      submitLabel="Create invoice"
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
