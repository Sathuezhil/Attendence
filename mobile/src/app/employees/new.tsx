import { zodResolver } from '@hookform/resolvers/zod';
import { type Href, router } from 'expo-router';
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
import { useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { createEmployee } from '@/features/employees/api';
import { EmployeeForm } from '@/features/employees/employee-form';
import { emptyEmployeeForm, formValuesToPayload } from '@/features/employees/form-utils';
import { employeeFormSchema, EmployeeFormValues } from '@/features/employees/schema';
import { ApiError } from '@/lib/api';

export default function NewEmployeeScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: emptyEmployeeForm,
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSuccess(null);

    try {
      await createEmployee(formValuesToPayload(values));
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setSuccess('Employee created');
      router.replace('/employees' as Href);
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : 'Unable to save this employee.',
      );
    }
  });

  if (!isReady || !isAuthenticated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

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
          {isSubmitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Save employee</Text>}
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
