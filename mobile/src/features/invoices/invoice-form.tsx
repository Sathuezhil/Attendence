import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { previewInvoice } from './api';
import { previewInvoiceLocally } from './calculate';
import { addDays, money, todayDate } from './format';
import { Invoice, InvoiceItemWrite, InvoicePreview, InvoiceWritePayload } from './types';

export interface InvoiceFormItem {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discount: string;
}

export interface InvoiceFormValues {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  invoiceDate: string;
  dueDate: string;
  notes: string;
  items: InvoiceFormItem[];
}

const emptyItem = (): InvoiceFormItem => ({
  description: '',
  quantity: '1',
  unitPrice: '',
  taxRate: '0',
  discount: '0',
});

export function valuesFromInvoice(invoice: Invoice): InvoiceFormValues {
  return {
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail ?? '',
    customerPhone: invoice.customerPhone ?? '',
    customerAddress: invoice.customerAddress ?? '',
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes ?? '',
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      taxRate: String(item.taxRate),
      discount: String(item.discount),
    })),
  };
}

export function emptyInvoiceValues(): InvoiceFormValues {
  const invoiceDate = todayDate();
  return {
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    invoiceDate,
    dueDate: addDays(invoiceDate, 14),
    notes: '',
    items: [emptyItem()],
  };
}

function toWriteItems(items: InvoiceFormItem[]): InvoiceItemWrite[] {
  return items
    .filter((item) => item.description.trim() && item.unitPrice !== '')
    .map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      taxRate: Number(item.taxRate) || 0,
      discount: Number(item.discount) || 0,
    }));
}

export function toWritePayload(values: InvoiceFormValues): InvoiceWritePayload {
  return {
    customerName: values.customerName.trim(),
    customerEmail: values.customerEmail.trim() || undefined,
    customerPhone: values.customerPhone.trim() || undefined,
    customerAddress: values.customerAddress.trim() || undefined,
    invoiceDate: values.invoiceDate.trim(),
    dueDate: values.dueDate.trim(),
    notes: values.notes.trim() || undefined,
    items: toWriteItems(values.items),
  };
}

export function InvoiceForm({
  initialValues,
  submitLabel,
  saving,
  error,
  onSubmit,
}: {
  initialValues: InvoiceFormValues;
  submitLabel: string;
  saving: boolean;
  error: string | null;
  onSubmit: (payload: InvoiceWritePayload) => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [preview, setPreview] = useState<InvoicePreview | null>(null);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const localPreview = useMemo(
    () => previewInvoiceLocally(toWriteItems(values.items)),
    [values.items],
  );

  useEffect(() => {
    const payload = toWritePayload(values);
    if (!payload.customerName || payload.items.length === 0) {
      setPreview(null);
      return;
    }

    const handle = setTimeout(() => {
      void previewInvoice(payload)
        .then(setPreview)
        .catch(() => setPreview(null));
    }, 400);

    return () => clearTimeout(handle);
  }, [values]);

  function update<K extends keyof InvoiceFormValues>(key: K, value: InvoiceFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function updateItem(index: number, key: keyof InvoiceFormItem, value: string) {
    setValues((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  }

  function addItem() {
    setValues((current) => ({ ...current, items: [...current.items, emptyItem()] }));
  }

  function removeItem(index: number) {
    setValues((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((_, i) => i !== index),
    }));
  }

  const shown = preview ?? localPreview;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.section}>Customer</Text>
          <Field label="Name" onChangeText={(value) => update('customerName', value)} value={values.customerName} />
          <Field label="Email" onChangeText={(value) => update('customerEmail', value)} value={values.customerEmail} />
          <Field label="Phone" onChangeText={(value) => update('customerPhone', value)} value={values.customerPhone} />
          <Field
            label="Address"
            multiline
            onChangeText={(value) => update('customerAddress', value)}
            value={values.customerAddress}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Invoice</Text>
          <Field label="Invoice date" onChangeText={(value) => update('invoiceDate', value)} value={values.invoiceDate} />
          <Field label="Due date" onChangeText={(value) => update('dueDate', value)} value={values.dueDate} />
          <Field label="Notes" multiline onChangeText={(value) => update('notes', value)} value={values.notes} />
        </View>

        {values.items.map((item, index) => (
          <View key={`item-${index}`} style={styles.card}>
            <View style={styles.itemHeader}>
              <Text style={styles.section}>Item {index + 1}</Text>
              {values.items.length > 1 ? (
                <Pressable onPress={() => removeItem(index)}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
            <Field
              label="Description"
              onChangeText={(value) => updateItem(index, 'description', value)}
              value={item.description}
            />
            <Field
              keyboardType="decimal-pad"
              label="Quantity"
              onChangeText={(value) => updateItem(index, 'quantity', value)}
              value={item.quantity}
            />
            <Field
              keyboardType="decimal-pad"
              label="Unit price"
              onChangeText={(value) => updateItem(index, 'unitPrice', value)}
              value={item.unitPrice}
            />
            <Field
              keyboardType="decimal-pad"
              label="Tax %"
              onChangeText={(value) => updateItem(index, 'taxRate', value)}
              value={item.taxRate}
            />
            <Field
              keyboardType="decimal-pad"
              label="Discount"
              onChangeText={(value) => updateItem(index, 'discount', value)}
              value={item.discount}
            />
          </View>
        ))}

        <Pressable onPress={addItem} style={styles.secondary}>
          <Text style={styles.secondaryText}>Add Item</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.section}>Preview</Text>
          <Text style={styles.hint}>Live totals. The server recalculates the saved invoice.</Text>
          <Row label="Subtotal" value={money(shown.subtotal)} />
          <Row label="Discount" value={money(shown.discountAmount)} />
          <Row label="Tax" value={money(shown.taxAmount)} />
          <Row label="Grand total" value={money(shown.totalAmount)} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={saving} onPress={() => onSubmit(toWritePayload(values))} style={styles.button}>
          <Text style={styles.buttonText}>{saving ? 'Saving…' : submitLabel}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'decimal-pad';
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholderTextColor="#9ca3af"
        style={[styles.input, multiline ? styles.notes : null]}
        value={value}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  hint: {
    color: '#6b7280',
    fontSize: 13,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remove: {
    color: '#991b1b',
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    color: '#111827',
  },
  notes: {
    minHeight: 88,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meta: {
    color: '#6b7280',
  },
  value: {
    fontWeight: '700',
    color: '#111827',
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
  error: {
    color: '#991b1b',
  },
});
