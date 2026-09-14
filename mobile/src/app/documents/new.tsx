import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { uploadDocument } from '@/features/documents/api';
import { formatBytes, labelOf } from '@/features/documents/format';
import { isAllowedDocumentName, pickDocumentFile } from '@/features/documents/pick-file';
import { DOCUMENT_TYPES, DocumentType, PickedDocument } from '@/features/documents/types';
import { fetchEmployees } from '@/features/employees/api';
import { ApiError } from '@/lib/api';
import { DateField } from '@/ui/date-field';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export default function UploadDocumentScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ employeeId?: string | string[] }>();
  const presetEmployeeId = Array.isArray(params.employeeId) ? params.employeeId[0] : params.employeeId;

  const [employeeId, setEmployeeId] = useState(presetEmployeeId ?? '');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('PASSPORT');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<PickedDocument | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const employeesQuery = useQuery({
    queryKey: ['employees', { forDocuments: true }],
    enabled: isReady && isAuthenticated && !presetEmployeeId,
    queryFn: () => fetchEmployees({ employmentStatus: 'ACTIVE', limit: 100 }),
  });

  const employees = useMemo(() => {
    const list = employeesQuery.data?.data ?? [];
    const search = employeeSearch.trim().toLowerCase();
    if (!search) {
      return list;
    }

    return list.filter((employee) =>
      `${employee.fullName} ${employee.employeeCode}`.toLowerCase().includes(search),
    );
  }, [employeeSearch, employeesQuery.data]);

  async function onPick() {
    setError(null);
    const picked = await pickDocumentFile();
    if (!picked) {
      return;
    }
    if (!isAllowedDocumentName(picked.name)) {
      setFile(null);
      setError('Unsupported file. Upload a PDF, JPG, or PNG.');
      return;
    }
    if (picked.size && picked.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      setError('File is too large. Maximum size is 10MB.');
      return;
    }
    setFile(picked);
  }

  async function onSave() {
    setError(null);
    setSuccess(false);
    if (!employeeId) {
      setError('Select an employee');
      return;
    }
    if (!file) {
      setError('Choose a PDF, JPG, or PNG file');
      return;
    }

    setSaving(true);
    setProgress(0);
    try {
      await uploadDocument(
        employeeId,
        {
          documentType,
          documentNumber: documentNumber.trim() || undefined,
          issueDate: issueDate.trim() || undefined,
          expiryDate: expiryDate.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        file,
        setProgress,
      );
      setSuccess(true);
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.replace((presetEmployeeId ? `/documents?employeeId=${presetEmployeeId}` : '/documents') as Href);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to upload document.');
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {presetEmployeeId ? null : (
          <View style={styles.card}>
            <Text style={styles.label}>Employee</Text>
            <TextInput
              onChangeText={setEmployeeSearch}
              placeholder="Search employee"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              value={employeeSearch}
            />
            {employeesQuery.isPending ? <ActivityIndicator color="#111827" /> : null}
            {employees.map((employee) => (
              <Pressable
                key={employee.id}
                onPress={() => setEmployeeId(employee.id)}
                style={[styles.choice, employeeId === employee.id ? styles.choiceActive : null]}
              >
                <Text style={employeeId === employee.id ? styles.choiceTextActive : styles.choiceText}>
                  {employee.fullName} · {employee.employeeCode}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

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
            placeholder="Passport, visa, or ID number"
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

        <Pressable onPress={() => void onPick()} style={styles.secondary}>
          <Text style={styles.secondaryText}>{file ? 'Replace file' : 'Choose file'}</Text>
        </Pressable>
        {file ? (
          <Text style={styles.fileName}>
            {file.name}
            {file.size ? ` · ${formatBytes(file.size)}` : ''}
          </Text>
        ) : null}

        {saving ? (
          <View style={styles.progressBox}>
            <Text style={styles.progressLabel}>Uploading… {progress}%</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
        ) : null}
        {success ? <Text style={styles.success}>Document uploaded</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable disabled={saving} onPress={() => void onSave()} style={styles.button}>
          <Text style={styles.buttonText}>{saving ? 'Uploading…' : 'Upload Document'}</Text>
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
  choice: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#f3f4f6',
  },
  choiceActive: {
    backgroundColor: '#111827',
  },
  choiceText: {
    color: '#111827',
  },
  choiceTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondary: {
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryText: {
    fontWeight: '700',
    color: '#111827',
  },
  fileName: {
    color: '#374151',
  },
  progressBox: {
    gap: 6,
  },
  progressLabel: {
    fontWeight: '600',
    color: '#111827',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#111827',
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
  success: {
    color: '#166534',
    fontWeight: '700',
  },
  error: {
    color: '#991b1b',
  },
});
