import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/auth-context';
import { loginSchema, type LoginFormValues } from '@/features/auth/schema';
import { ApiError } from '@/lib/api';

export default function LoginScreen() {
  const { isReady, isAuthenticated, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isReady, isAuthenticated]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isAuthenticated) {
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, [isAuthenticated]);

  if (isReady && isAuthenticated) {
    return (
      <View style={styles.safeArea}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    try {
      await login(values.email, values.password);
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
        return;
      }

      setServerError('Unable to sign in. Check your connection and try again.');
    }
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.eyebrow}>Boss / Admin</Text>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            Manage employees, attendance and documents from this admin account.
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="admin@company.com"
                    placeholderTextColor="#9ca3af"
                    style={[styles.input, errors.email ? styles.inputError : null]}
                    textContentType="username"
                    value={value}
                  />
                )}
              />
              {errors.email ? <Text style={styles.fieldError}>{errors.email.message}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      autoCapitalize="none"
                      autoComplete="password"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      placeholder="Enter your password"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showPassword}
                      style={[styles.passwordInput, errors.password ? styles.inputError : null]}
                      textContentType="password"
                      value={value}
                    />
                  )}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  onPress={() => setShowPassword((current) => !current)}
                  style={styles.showButton}
                >
                  <Text style={styles.showButtonText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
              {errors.password ? (
                <Text style={styles.fieldError}>{errors.password.message}</Text>
              ) : null}
            </View>

            {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              disabled={isSubmitting}
              onPress={() => void onSubmit()}
              style={[styles.button, isSubmitting ? styles.buttonDisabled : null]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5b6573',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 8,
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
  },
  form: {
    marginTop: 32,
    gap: 16,
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
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    fontSize: 16,
    color: '#111827',
  },
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingRight: 68,
    backgroundColor: '#ffffff',
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  showButton: {
    position: 'absolute',
    right: 12,
    height: 48,
    justifyContent: 'center',
  },
  showButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  fieldError: {
    color: '#b91c1c',
    fontSize: 13,
  },
  serverError: {
    color: '#b91c1c',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
