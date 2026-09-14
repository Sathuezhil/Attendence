import { zodResolver } from '@hookform/resolvers/zod';
import { type Href, router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { updateAdminProfile } from '@/features/auth/api';
import { profileSchema, type ProfileFormValues } from '@/features/auth/schema';
import { ApiError } from '@/lib/api';
import { colors, radius, space, touch } from '@/theme';
import { LoadingState } from '@/ui/screen-state';

export default function ProfileScreen() {
  const { isReady, isAuthenticated, user, refreshProfile } = useRequireAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({ name: user.name, email: user.email });
    }
  }, [reset, user]);

  if (!isReady || !isAuthenticated || !user) {
    return <LoadingState />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    setServerError(null);
    try {
      await updateAdminProfile(values);
      await refreshProfile();
      setMessage('Profile updated');
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Unable to update profile.');
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.role}>{user.role}</Text>
          <Text style={styles.hint}>Role cannot be changed.</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                style={[styles.input, errors.name ? styles.inputError : null]}
              />
            )}
          />
          {errors.name ? <Text style={styles.error}>{errors.name.message}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                style={[styles.input, errors.email ? styles.inputError : null]}
              />
            )}
          />
          {errors.email ? <Text style={styles.error}>{errors.email.message}</Text> : null}
        </View>

        {serverError ? <Text style={styles.error}>{serverError}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}

        <Pressable disabled={isSubmitting} onPress={() => void onSubmit()} style={styles.button}>
          <Text style={styles.buttonText}>{isSubmitting ? 'Saving…' : 'Save profile'}</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/profile/security' as Href)} style={styles.secondary}>
          <Text style={styles.secondaryText}>Security</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 4,
  },
  role: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
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
  error: {
    color: colors.error,
  },
  success: {
    color: colors.success,
    fontWeight: '600',
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
  secondary: {
    minHeight: touch.minHeight,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '700',
  },
});
