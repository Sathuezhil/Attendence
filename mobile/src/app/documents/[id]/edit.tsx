import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { fetchDocument, updateDocument } from '@/features/documents/api';
import { labelOf } from '@/features/documents/format';
import { DOCUMENT_TYPES, DocumentType } from '@/features/documents/types';
import { ApiError } from '@/lib/api';
import { DateField } from '@/ui/date-field';

export default function EditDocumentScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [documentType, setDocumentType] = useState<DocumentType>('OTHER');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: ['documents', id],
    queryFn: () => fetchDocument(id),
    enabled: Boolean(id) && isReady && isAuthenticated,
  });

  useEffect(() => {
    if (!query.data) {
      return;
    }
    setDocumentType(query.data.documentType);
    setDocumentNumber(query.data.documentNumber ?? '');
    setIssueDate(query.data.issueDate ?? '');
    setExpiryDate(query.data.expiryDate ?? '');
    setNotes(query.data.notes ?? '');
  }, [query.data]);

  async function onSave() {
    setError(null);
    setSaving(true);
    try {
      await updateDocument(id, {
        documentType,
        documentNumber: documentNumber.trim() || undefined,
        issueDate: issueDate.trim() || undefined,
        expiryDate: expiryDate.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.replace(`/documents/${id}` as Href);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to update document.');
    } finally {
      setSaving(false);
    }
  }

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
          {query.error instanceof ApiError ? query.error.message : 'Document not found'}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Document type</Text>
          <View style={styles.chips}>
            {DOCUMENT_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => setDocumentType(type)}
                style={[styles.chip, documentType === type ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, documentType === type ? styles.chipTextActive : null]}>
                  {labelOf(type)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Document number</Text>
          <TextInput
            onChangeText={setDocumentNumber}
            placeholder="Document number"
            placeholderTextColor="#9ca3af"
            style={styles.input}
            value={documentNumber}
          />
          <Text style={styles.label}>Issue date</Text>
          <DateField onChange={setIssueDate} placeholder="Select issue date" value={issueDate} />
          <Text style={styles.label}>Expiry date</Text>
          <DateField onChange={setExpiryDate} placeholder="Select expiry date" value={expiryDate} />
          <Text style={styles.label}>Notes</Text>
          <TextInput
            multiline
            onChangeText={setNotes}
            placeholder="Optional notes"
            placeholderTextColor="#9ca3af"
            style={[styles.input, styles.notes]}
            value={notes}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={saving} onPress={() => void onSave()} style={styles.button}>
          <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save changes'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 8,
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#111827',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  chipTextActive: {
    color: '#ffffff',
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
  error: {
    color: '#991b1b',
    textAlign: 'center',
  },
});
