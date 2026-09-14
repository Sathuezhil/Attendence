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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/auth-context';
import {
  loginSchema,
  registerSchema,
  type LoginFormValues,
  type RegisterFormValues,
} from '@/features/auth/schema';
import { ApiError } from '@/lib/api';

export default function LoginScreen() {
  const { isReady, isAuthenticated, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
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
        <ActivityIndicator size="large" color="#0e5a72" />
      </View>
    );
  }

  const isSubmitting =
    mode === 'login' ? loginForm.formState.isSubmitting : registerForm.formState.isSubmitting;

  const onLogin = loginForm.handleSubmit(async (values) => {
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

  const onRegister = registerForm.handleSubmit(async (values) => {
    setServerError(null);

    try {
      await register(values.name, values.email, values.password);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 403) {
          setMode('login');
          setServerError('An admin account already exists. Sign in instead.');
          return;
        }
        setServerError(error.message);
        return;
      }

      setServerError('Unable to create the admin account. Check your connection and try again.');
    }
  });

  const switchMode = (next: 'login' | 'register') => {
    setServerError(null);
    setMode(next);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.heroMark} />
            <Text style={styles.eyebrow}>Boss / Admin</Text>
            <Text style={styles.title}>
              {mode === 'login' ? 'Sign in' : 'Create admin'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'login'
                ? 'Manage employees, attendance and documents from this admin account.'
                : 'First time only. This creates the boss account in Firestore.'}
            </Text>

            <View style={styles.formCard}>
              {mode === 'register' ? (
                <View style={styles.field}>
                  <Text style={styles.label}>Name</Text>
                  <Controller
                    control={registerForm.control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        autoComplete="name"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        placeholder="Your name"
                        placeholderTextColor="#9ca3af"
                        style={[
                          styles.input,
                          registerForm.formState.errors.name ? styles.inputError : null,
                        ]}
                        value={value}
                      />
                    )}
                  />
                  {registerForm.formState.errors.name ? (
                    <Text style={styles.fieldError}>
                      {registerForm.formState.errors.name.message}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <Controller
                  control={
                    (mode === 'login' ? loginForm.control : registerForm.control) as never
                  }
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
                      style={[
                        styles.input,
                        (mode === 'login'
                          ? loginForm.formState.errors.email
                          : registerForm.formState.errors.email)
                          ? styles.inputError
                          : null,
                      ]}
                      textContentType="username"
                      value={value}
                    />
                  )}
                />
                {(mode === 'login'
                  ? loginForm.formState.errors.email
                  : registerForm.formState.errors.email) ? (
                  <Text style={styles.fieldError}>
                    {(mode === 'login'
                      ? loginForm.formState.errors.email
                      : registerForm.formState.errors.email
                    )?.message}
                  </Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordRow}>
                  <Controller
                    control={
                    (mode === 'login' ? loginForm.control : registerForm.control) as never
                  }
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        autoCapitalize="none"
                        autoComplete={mode === 'login' ? 'password' : 'password-new'}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        placeholder={
                          mode === 'login'
                            ? 'Enter your password'
                            : 'At least 8 characters'
                        }
                        placeholderTextColor="#9ca3af"
                        secureTextEntry={!showPassword}
                        style={[
                          styles.passwordInput,
                          (mode === 'login'
                            ? loginForm.formState.errors.password
                            : registerForm.formState.errors.password)
                            ? styles.inputError
                            : null,
                        ]}
                        textContentType={mode === 'login' ? 'password' : 'newPassword'}
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
                {(mode === 'login'
                  ? loginForm.formState.errors.password
                  : registerForm.formState.errors.password) ? (
                  <Text style={styles.fieldError}>
                    {(mode === 'login'
                      ? loginForm.formState.errors.password
                      : registerForm.formState.errors.password
                    )?.message}
                  </Text>
                ) : null}
              </View>

              {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={mode === 'login' ? 'Sign in' : 'Create admin'}
                disabled={isSubmitting}
                onPress={() => void (mode === 'login' ? onLogin() : onRegister())}
                style={[styles.button, isSubmitting ? styles.buttonDisabled : null]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {mode === 'login' ? 'Sign in' : 'Create admin'}
                  </Text>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => switchMode(mode === 'login' ? 'register' : 'login')}
                style={styles.switchMode}
              >
                <Text style={styles.switchModeText}>
                  {mode === 'login'
                    ? 'First time? Create admin account'
                    : 'Already have an account? Sign in'}
                </Text>
              </Pressable>
            </View>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#0c4a62',
  },
  scroll: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 32,
    backgroundColor: '#eaf4f8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  heroMark: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(31, 182, 166, 0.22)',
    right: -50,
    top: -70,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1fb6a6',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 8,
    fontSize: 32,
    fontWeight: '700',
    color: '#102033',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#3d4d5c',
  },
  formCard: {
    marginTop: 28,
    gap: 16,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#d5dee8',
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
    color: '#0e5a72',
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
    color: '#0e5a72',
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
    color: '#0e5a72',
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
    backgroundColor: '#0c4a62',
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
  switchMode: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1fb6a6',
  },
});
