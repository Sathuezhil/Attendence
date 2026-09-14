import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { fetchInvoice, updateInvoice } from '@/features/invoices/api';
import { InvoiceForm, valuesFromInvoice } from '@/features/invoices/invoice-form';
import { InvoiceWritePayload } from '@/features/invoices/types';
import { ApiError } from '@/lib/api';

export default function EditInvoiceScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => fetchInvoice(id),
    enabled: Boolean(id) && isReady && isAuthenticated,
  });

  const initialValues = useMemo(
    () => (query.data ? valuesFromInvoice(query.data) : null),
    [query.data],
  );

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
      await updateInvoice(id, payload);
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      router.replace(`/invoices/${id}` as Href);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to update invoice.');
    } finally {
      setSaving(false);
    }
  }

  if (!isReady || !isAuthenticated || query.isPending || !initialValues) {
    return (
      <View style={styles.centered}>
        {query.error ? (
          <Text style={styles.error}>
            {query.error instanceof ApiError ? query.error.message : 'Invoice not found'}
          </Text>
        ) : (
          <ActivityIndicator size="large" color="#111827" />
        )}
      </View>
    );
  }

  return (
    <InvoiceForm
      error={error}
      initialValues={initialValues}
      onSubmit={(payload) => void onSubmit(payload)}
      saving={saving}
      submitLabel="Save invoice"
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  error: {
    color: '#991b1b',
    textAlign: 'center',
  },
});
