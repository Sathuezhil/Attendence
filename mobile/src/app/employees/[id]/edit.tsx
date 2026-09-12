import { zodResolver } from '@hookform/resolvers/zod';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { fetchEmployee, updateEmployee } from '@/features/employees/api';
import { EmployeeForm } from '@/features/employees/employee-form';
import { employeeToFormValues, formValuesToPayload } from '@/features/employees/form-utils';
import { employeeFormSchema, EmployeeFormValues } from '@/features/employees/schema';
import { ApiError } from '@/lib/api';

export default function EditEmployeeScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['employees', id],
    queryFn: () => fetchEmployee(id),
    enabled: Boolean(id) && isReady && isAuthenticated,
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
          {query.error instanceof ApiError ? query.error.message : 'Employee not found'}
        </Text>
      </View>
    );
  }

  return (
    <EditEmployeeForm
      id={id}
      defaultValues={employeeToFormValues(query.data)}
      serverError={serverError}
      success={success}
      onError={setServerError}
      onSuccess={setSuccess}
      onSaved={async () => {
        await queryClient.invalidateQueries({ queryKey: ['employees'] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        router.replace(`/employees/${id}` as Href);
      }}
    />
  );
}

function EditEmployeeForm({
  id,
  defaultValues,
  serverError,
  success,
  onError,
  onSuccess,
  onSaved,
}: {
  id: string;
  defaultValues: EmployeeFormValues;
  serverError: string | null;
  success: string | null;
  onError: (message: string | null) => void;
  onSuccess: (message: string | null) => void;
  onSaved: () => Promise<void>;
}) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    onError(null);
    onSuccess(null);

    try {
      await updateEmployee(id, formValuesToPayload(values, 'update'));
      onSuccess('Employee updated');
      await onSaved();
    } catch (error) {
      onError(error instanceof ApiError ? error.message : 'Unable to update this employee.');
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <EmployeeForm control={control} errors={errors} />
        {serverError ? <Text style={styles.error}>{serverError}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}
        <Pressable
          disabled={isSubmitting}
          onPress={() => void onSubmit()}
          style={[styles.button, isSubmitting ? styles.buttonDisabled : null]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Save changes</Text>
          )}
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
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  error: {
    color: '#991b1b',
  },
  success: {
    color: '#166534',
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});
