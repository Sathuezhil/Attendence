import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  BackHandler,
  Image,
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
  employeeRegisterSchema,
  loginSchema,
  registerSchema,
  type EmployeeRegisterFormValues,
  type LoginFormValues,
  type RegisterFormValues,
} from '@/features/auth/schema';
import { homeHref } from '@/features/auth/types';
import { adminAccountExists } from '@/features/auth/api';
import { ApiError } from '@/lib/api';

type Portal = 'ADMIN' | 'EMPLOYEE';
type Mode = 'login' | 'register';

export default function LoginScreen() {
  const { isReady, isAuthenticated, user, login, register, registerEmployee } = useAuth();
  const [portal, setPortal] = useState<Portal>('ADMIN');
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [adminExists, setAdminExists] = useState(true);

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

  const employeeRegisterForm = useForm<EmployeeRegisterFormValues>({
    resolver: zodResolver(employeeRegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace(homeHref(user?.role));
    }
  }, [isReady, isAuthenticated, user?.role]);

  useEffect(() => {
    let cancelled = false;
    void adminAccountExists().then((exists) => {
      if (!cancelled) {
        setAdminExists(exists);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (portal === 'ADMIN' && adminExists && mode === 'register') {
      setMode('login');
    }
  }, [adminExists, mode, portal]);

  useEffect(() => {
    loginForm.reset({ email: '', password: '' });
    setShowPassword(false);
    setServerError(null);
    const timer = setTimeout(() => {
      loginForm.reset({ email: '', password: '' });
    }, 500);
    return () => clearTimeout(timer);
  }, [loginForm, portal]);

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
    mode === 'login'
      ? loginForm.formState.isSubmitting
      : portal === 'ADMIN'
        ? registerForm.formState.isSubmitting
        : employeeRegisterForm.formState.isSubmitting;

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

  const onEmployeeRegister = employeeRegisterForm.handleSubmit(async (values) => {
    setServerError(null);

    try {
      await registerEmployee(values.firstName, values.lastName, values.email, values.password);
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
        return;
      }

      setServerError('Unable to create the employee account. Check your connection and try again.');
    }
  });

  const switchPortal = (next: Portal) => {
    setServerError(null);
    setPortal(next);
    setMode('login');
  };

  const switchMode = (next: Mode) => {
    setServerError(null);
    setMode(next);
  };

  const title =
    mode === 'login'
      ? 'Sign in'
      : portal === 'ADMIN'
        ? 'Create admin'
        : 'Create employee login';
  const subtitle =
    mode === 'login'
      ? portal === 'ADMIN'
        ? 'Manage employees, attendance and documents from this admin account.'
        : 'Sign in to add your details. Admin will see them automatically.'
      : portal === 'ADMIN'
        ? 'First time only. This creates the boss account in Firestore.'
        : 'Create your account. Next you can add your details and Emirates ID.';

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
            <Image
              accessibilityLabel="App logo"
              resizeMode="contain"
              source={require('../../assets/images/brand-logo.png')}
              style={styles.logo}
            />
            <Text style={styles.eyebrow}>{portal === 'ADMIN' ? 'Boss / Admin' : 'Employee'}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            <View style={styles.portalRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => switchPortal('ADMIN')}
                style={[styles.portalChip, portal === 'ADMIN' ? styles.portalChipActive : null]}
              >
                <Text style={[styles.portalText, portal === 'ADMIN' ? styles.portalTextActive : null]}>
                  Admin
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => switchPortal('EMPLOYEE')}
                style={[styles.portalChip, portal === 'EMPLOYEE' ? styles.portalChipActive : null]}
              >
                <Text style={[styles.portalText, portal === 'EMPLOYEE' ? styles.portalTextActive : null]}>
                  Employee
                </Text>
              </Pressable>
            </View>

            <View style={styles.formCard} {...(Platform.OS === 'web' ? { autoComplete: 'off' } : null)}>
              {Platform.OS === 'web' ? (
                <View pointerEvents="none" style={styles.autofillTrap}>
                  <TextInput autoComplete="username" value="" />
                  <TextInput autoComplete="current-password" secureTextEntry value="" />
                </View>
              ) : null}
              {mode === 'register' && portal === 'ADMIN' && !adminExists ? (
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

              {mode === 'register' && portal === 'EMPLOYEE' ? (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>First name</Text>
                    <Controller
                      control={employeeRegisterForm.control}
                      name="firstName"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          autoComplete="given-name"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          placeholder="First name"
                          placeholderTextColor="#9ca3af"
                          style={[
                            styles.input,
                            employeeRegisterForm.formState.errors.firstName
                              ? styles.inputError
                              : null,
                          ]}
                          value={value}
                        />
                      )}
                    />
                    {employeeRegisterForm.formState.errors.firstName ? (
                      <Text style={styles.fieldError}>
                        {employeeRegisterForm.formState.errors.firstName.message}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Last name</Text>
                    <Controller
                      control={employeeRegisterForm.control}
                      name="lastName"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          autoComplete="family-name"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          placeholder="Last name"
                          placeholderTextColor="#9ca3af"
                          style={[
                            styles.input,
                            employeeRegisterForm.formState.errors.lastName
                              ? styles.inputError
                              : null,
                          ]}
                          value={value}
                        />
                      )}
                    />
                    {employeeRegisterForm.formState.errors.lastName ? (
                      <Text style={styles.fieldError}>
                        {employeeRegisterForm.formState.errors.lastName.message}
                      </Text>
                    ) : null}
                  </View>
                </>
              ) : null}

              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <Controller
                  control={
                    (mode === 'login'
                      ? loginForm.control
                      : portal === 'ADMIN'
                        ? registerForm.control
                        : employeeRegisterForm.control) as never
                  }
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      autoCapitalize="none"
                      autoComplete="off"
                      autoCorrect={false}
                      importantForAutofill="no"
                      keyboardType="email-address"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      placeholder={
                        portal === 'ADMIN' ? 'Email' : 'you@company.com'
                      }
                      placeholderTextColor="#9ca3af"
                      style={[
                        styles.input,
                        emailError(mode, portal, loginForm, registerForm, employeeRegisterForm)
                          ? styles.inputError
                          : null,
                      ]}
                      textContentType="none"
                      value={value}
                    />
                  )}
                />
                {emailError(mode, portal, loginForm, registerForm, employeeRegisterForm) ? (
                  <Text style={styles.fieldError}>
                    {emailError(mode, portal, loginForm, registerForm, employeeRegisterForm)}
                  </Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordRow}>
                  <Controller
                    control={
                      (mode === 'login'
                        ? loginForm.control
                        : portal === 'ADMIN'
                          ? registerForm.control
                          : employeeRegisterForm.control) as never
                    }
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        autoCapitalize="none"
                        autoComplete="off"
                        importantForAutofill="no"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        placeholder={
                          mode === 'login' ? 'Enter your password' : 'At least 8 characters'
                        }
                        placeholderTextColor="#9ca3af"
                        secureTextEntry={!showPassword}
                        style={[
                          styles.passwordInput,
                          passwordError(mode, portal, loginForm, registerForm, employeeRegisterForm)
                            ? styles.inputError
                            : null,
                        ]}
                        textContentType="none"
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
                {passwordError(mode, portal, loginForm, registerForm, employeeRegisterForm) ? (
                  <Text style={styles.fieldError}>
                    {passwordError(mode, portal, loginForm, registerForm, employeeRegisterForm)}
                  </Text>
                ) : null}
              </View>

              {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={title}
                disabled={isSubmitting}
                onPress={() =>
                  void (mode === 'login'
                    ? onLogin()
                    : portal === 'ADMIN'
                      ? onRegister()
                      : onEmployeeRegister())
                }
                style={[styles.button, isSubmitting ? styles.buttonDisabled : null]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {mode === 'login'
                      ? 'Sign in'
                      : portal === 'ADMIN'
                        ? 'Create admin'
                        : 'Create employee login'}
                  </Text>
                )}
              </Pressable>

              {portal === 'ADMIN' && adminExists ? null : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => switchMode(mode === 'login' ? 'register' : 'login')}
                  style={styles.switchMode}
                >
                  <Text style={styles.switchModeText}>
                    {mode === 'login'
                      ? portal === 'ADMIN'
                        ? 'First time? Create admin account'
                        : 'First time? Create employee login'
                      : 'Already have an account? Sign in'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function emailError(
  mode: Mode,
  portal: Portal,
  loginForm: ReturnType<typeof useForm<LoginFormValues>>,
  registerForm: ReturnType<typeof useForm<RegisterFormValues>>,
  employeeRegisterForm: ReturnType<typeof useForm<EmployeeRegisterFormValues>>,
) {
  if (mode === 'login') {
    return loginForm.formState.errors.email?.message;
  }
  return portal === 'ADMIN'
    ? registerForm.formState.errors.email?.message
    : employeeRegisterForm.formState.errors.email?.message;
}

function passwordError(
  mode: Mode,
  portal: Portal,
  loginForm: ReturnType<typeof useForm<LoginFormValues>>,
  registerForm: ReturnType<typeof useForm<RegisterFormValues>>,
  employeeRegisterForm: ReturnType<typeof useForm<EmployeeRegisterFormValues>>,
) {
  if (mode === 'login') {
    return loginForm.formState.errors.password?.message;
  }
  return portal === 'ADMIN'
    ? registerForm.formState.errors.password?.message
    : employeeRegisterForm.formState.errors.password?.message;
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
  logo: {
    width: 88,
    height: 88,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    alignSelf: 'center',
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
  portalRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  portalChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d5dee8',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalChipActive: {
    backgroundColor: '#0c4a62',
    borderColor: '#0c4a62',
  },
  portalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0e5a72',
  },
  portalTextActive: {
    color: '#ffffff',
  },
  formCard: {
    marginTop: 16,
    gap: 16,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#d5dee8',
  },
  autofillTrap: {
    height: 0,
    overflow: 'hidden',
    opacity: 0,
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
