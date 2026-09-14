import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { useAuth } from '@/features/auth/auth-context';
import { changePasswordRequest } from '@/features/auth/api';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/features/auth/schema';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { ApiError } from '@/lib/api';
import { colors, radius, space, touch } from '@/theme';
import { LoadingState } from '@/ui/screen-state';

export default function ChangePasswordScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const { logout } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  if (!isReady || !isAuthenticated) {
    return <LoadingState />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await changePasswordRequest({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      await logout();
      router.replace('/login');
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : 'Unable to change password.',
      );
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          Use at least 10 characters with uppercase, lowercase, and a number. You will be signed out
          after a successful change.
        </Text>
        <PasswordField
          control={control}
          name="currentPassword"
          label="Current password"
          error={errors.currentPassword?.message}
          show={show}
        />
        <PasswordField
          control={control}
          name="newPassword"
          label="New password"
          error={errors.newPassword?.message}
          show={show}
        />
        <PasswordField
          control={control}
          name="confirmPassword"
          label="Confirm password"
          error={errors.confirmPassword?.message}
          show={show}
        />
        <Pressable onPress={() => setShow((current) => !current)}>
          <Text style={styles.toggle}>{show ? 'Hide passwords' : 'Show passwords'}</Text>
        </Pressable>
        {serverError ? <Text style={styles.error}>{serverError}</Text> : null}
        <Pressable disabled={isSubmitting} onPress={() => void onSubmit()} style={styles.button}>
          <Text style={styles.buttonText}>
            {isSubmitting ? 'Updating…' : 'Update password'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordField({
  control,
  name,
  label,
  error,
  show,
}: {
  control: ReturnType<typeof useForm<ChangePasswordFormValues>>['control'];
  name: keyof ChangePasswordFormValues;
  label: string;
  error?: string;
  show: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            onBlur={onBlur}
            onChangeText={onChange}
            secureTextEntry={!show}
            style={[styles.input, error ? styles.inputError : null]}
            value={value}
          />
        )}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: space.lg,
    gap: space.lg,
    paddingBottom: 40,
  },
  hint: {
    color: colors.mutedStrong,
    lineHeight: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    minHeight: touch.minHeight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
  },
  inputError: {
    borderColor: '#dc2626',
  },
  toggle: {
    color: colors.info,
    fontWeight: '700',
  },
  error: {
    color: colors.error,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: touch.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.white,
    fontWeight: '700',
  },
});
