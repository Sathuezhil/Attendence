import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { fetchEmployeeDocuments, uploadDocument } from '@/features/documents/api';
import { formatBytes, labelOf, statusColor, statusLabel } from '@/features/documents/format';
import { captureDocumentPhoto, pickDocumentFile } from '@/features/documents/pick-file';
import { PickedDocument } from '@/features/documents/types';
import { fetchMyEmployee, updateMyEmployee } from '@/features/employees/api';
import { EmployeeForm } from '@/features/employees/employee-form';
import {
  employeeToFormValues,
  formValuesToPayload,
  initials,
} from '@/features/employees/form-utils';
import { employeeFormSchema, EmployeeFormValues } from '@/features/employees/schema';
import { ApiError } from '@/lib/api';
import { colors, radius, space } from '@/theme';
import { EmptyState, ErrorState, LoadingState } from '@/ui/screen-state';

export default function EmployeeHomeScreen() {
  const { isReady, isAuthenticated, user, logout, refreshProfile } = useRequireAuth({
    allowEmployee: true,
  });
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && isAuthenticated && user?.role === 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [isReady, isAuthenticated, user?.role]);

  const enabled = isReady && isAuthenticated && user?.role === 'EMPLOYEE';
  const employeeQuery = useQuery({
    queryKey: ['me', 'employee'],
    queryFn: fetchMyEmployee,
    enabled,
  });
  const documentsQuery = useQuery({
    queryKey: ['me', 'documents', employeeQuery.data?.id],
    queryFn: () => fetchEmployeeDocuments(employeeQuery.data!.id),
    enabled: enabled && Boolean(employeeQuery.data?.id),
  });

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: employeeQuery.data
      ? employeeToFormValues(employeeQuery.data)
      : {
          firstName: '',
          lastName: '',
          employeeCode: 'EMP',
          employmentStatus: 'ACTIVE',
        },
  });

  useEffect(() => {
    if (employeeQuery.data) {
      form.reset(employeeToFormValues(employeeQuery.data));
    }
  }, [employeeQuery.data, form]);

  const saveProfile = useMutation({
    mutationFn: (values: EmployeeFormValues) =>
      updateMyEmployee(formValuesToPayload(values, 'update')),
    async onSuccess() {
      setError(null);
      setMessage('Details saved. Admin can see them in Employees.');
      await queryClient.invalidateQueries({ queryKey: ['me', 'employee'] });
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await refreshProfile();
    },
    onError(err) {
      setMessage(null);
      setError(err instanceof ApiError ? err.message : 'Unable to save your details.');
    },
  });

  const upload = useMutation({
    async mutationFn(file: PickedDocument) {
      const employeeId = employeeQuery.data?.id;
      if (!employeeId) {
        throw new ApiError('Employee profile not found', 404);
      }
      return uploadDocument(employeeId, { documentType: 'EMIRATES_ID' }, file);
    },
    async onSuccess() {
      setError(null);
      setMessage('Emirates ID uploaded. Admin can see it in employee details.');
      await queryClient.invalidateQueries({ queryKey: ['me', 'documents'] });
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError(err) {
      setMessage(null);
      setError(err instanceof ApiError ? err.message : 'Unable to upload Emirates ID.');
    },
  });

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  async function addFile(picker: () => Promise<PickedDocument | null>) {
    setError(null);
    setMessage(null);
    try {
      const file = await picker();
      if (!file) {
        return;
      }
      upload.mutate(file);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to open file picker.');
    }
  }

  if (!isReady || !isAuthenticated || !user) {
    return <LoadingState message="Loading…" />;
  }

  if (user.role !== 'EMPLOYEE') {
    return <LoadingState />;
  }

  if (employeeQuery.isPending) {
    return <LoadingState message="Loading your details…" />;
  }

  if (employeeQuery.error || !employeeQuery.data) {
    return (
      <ErrorState
        message={
          employeeQuery.error instanceof ApiError
            ? employeeQuery.error.message
            : 'Your employee profile was not found.'
        }
        onRetry={() => void employeeQuery.refetch()}
      />
    );
  }

  const employee = employeeQuery.data;
  const documents = documentsQuery.data ?? [];
  const busy = saveProfile.isPending || upload.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(employee.fullName)}</Text>
            </View>
            <Text style={styles.name}>{employee.fullName}</Text>
            <Text style={styles.meta}>{employee.email}</Text>
            <Pressable onPress={() => void handleLogout()} style={styles.logout}>
              <Text style={styles.logoutText}>Sign out</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>Your details</Text>
            <Text style={styles.hint}>
              Fill your information. It is added to the admin employee list automatically.
            </Text>
            <EmployeeForm control={form.control} errors={form.formState.errors} variant="self" />
            <Pressable
              disabled={busy}
              onPress={form.handleSubmit((values) => {
                setMessage(null);
                setError(null);
                saveProfile.mutate(values);
              })}
              style={[styles.action, busy ? styles.actionDisabled : null]}
            >
              {saveProfile.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.actionText}>Save details</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>Emirates ID</Text>
            <Text style={styles.hint}>
              Scan your Emirates ID or attach a PDF. Admin sees it under your employee documents.
            </Text>
            <View style={styles.actions}>
              <Pressable
                disabled={busy}
                onPress={() => void addFile(captureDocumentPhoto)}
                style={[styles.action, busy ? styles.actionDisabled : null]}
              >
                {upload.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.actionText}>Scan ID</Text>
                )}
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => void addFile(pickDocumentFile)}
                style={[styles.actionSecondary, busy ? styles.actionDisabled : null]}
              >
                <Text style={styles.actionSecondaryText}>Upload PDF / photo</Text>
              </Pressable>
            </View>
          </View>

          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.card}>
            <Text style={styles.section}>Your documents</Text>
            {documentsQuery.isPending ? <ActivityIndicator color={colors.primary} /> : null}
            {!documentsQuery.isPending && documents.length === 0 ? (
              <EmptyState message="No documents yet. Scan or upload your Emirates ID." />
            ) : null}
            {documents.map((row) => (
              <View key={row.id} style={styles.docRow}>
                <View style={styles.docCopy}>
                  <Text style={styles.docTitle}>{labelOf(row.documentType)}</Text>
                  <Text style={styles.docMeta}>
                    {row.fileName} · {formatBytes(row.fileSize)}
                  </Text>
                </View>
                <Text style={[styles.docStatus, { color: statusColor(row.expiryStatus) }]}>
                  {statusLabel(row.expiryStatus)}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 32,
    gap: 16,
  },
  hero: {
    backgroundColor: colors.hero,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '700',
  },
  name: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  meta: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  logout: {
    marginTop: 12,
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: colors.white,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  actions: {
    gap: 10,
  },
  action: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.hero,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSecondary: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: '#e8f4f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDisabled: {
    opacity: 0.7,
  },
  actionText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  actionSecondaryText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  success: {
    marginHorizontal: 20,
    color: colors.success,
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    marginHorizontal: 20,
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  docCopy: {
    flex: 1,
    gap: 2,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  docMeta: {
    fontSize: 12,
    color: colors.muted,
  },
  docStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
});
