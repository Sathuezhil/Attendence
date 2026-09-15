import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import {
  createSelfEmployee,
  findEmployeeByAuthUid,
  findEmployeeByEmail,
  linkEmployeeAuth,
} from '@/features/employees/api';
import { Employee } from '@/features/employees/types';
import { ApiError } from '@/lib/api';
import { asIso, asString, getByIdOrNull, peekById, setRecord } from '@/lib/data';
import {
  assertFirebaseConfigured,
  getFirebaseAuth,
  mapAuthError,
  requireUser,
} from '@/lib/firebase';
import { AuthResponse, AuthUser } from './types';

function toAdmin(
  id: string,
  data: Record<string, unknown>,
  fallbackEmail: string,
  fallbackName: string,
): AuthUser {
  return {
    id,
    name: asString(data.name, fallbackName),
    email: asString(data.email, fallbackEmail),
    role: 'ADMIN',
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
  };
}

function toEmployeeUser(uid: string, employee: Employee, fallbackEmail: string): AuthUser {
  return {
    id: uid,
    name: employee.fullName,
    email: employee.email ?? fallbackEmail,
    role: 'EMPLOYEE',
    employeeId: employee.id,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

async function tokens(): Promise<{ accessToken: string; refreshToken: string }> {
  const user = requireUser();
  return {
    accessToken: await user.getIdToken(),
    refreshToken: user.refreshToken,
  };
}

async function resolveEmployee(uid: string, email: string | null): Promise<AuthUser | null> {
  const byUid = await findEmployeeByAuthUid(uid);
  if (byUid) {
    return toEmployeeUser(uid, byUid, email ?? '');
  }
  if (!email) {
    return null;
  }
  const byEmail = await findEmployeeByEmail(email);
  if (!byEmail) {
    return null;
  }
  if (byEmail.authUid && byEmail.authUid !== uid) {
    throw new ApiError('This employee is already linked to another login.', 403);
  }
  const linked = byEmail.authUid ? byEmail : await linkEmployeeAuth(byEmail.id, uid);
  return toEmployeeUser(uid, linked, email);
}

export async function resolveSession(): Promise<AuthUser> {
  const user = requireUser();
  const adminRow = await getByIdOrNull('users', user.uid);
  if (adminRow) {
    const lock = await getByIdOrNull('app_config', 'lock');
    if (!lock) {
      try {
        await setRecord('app_config', 'lock', { createdAt: new Date().toISOString() });
      } catch {
        // Lock is best-effort so a second admin cannot be created later.
      }
    }
    return toAdmin(user.uid, adminRow, user.email ?? '', user.displayName ?? 'Admin');
  }
  const employee = await resolveEmployee(user.uid, user.email);
  if (employee) {
    return employee;
  }
  if (user.email) {
    const [firstName, ...rest] = (user.displayName ?? 'New Employee').trim().split(/\s+/);
    const created = await createSelfEmployee({
      firstName: firstName || 'New',
      lastName: rest.join(' ') || 'Employee',
      email: user.email,
    });
    return toEmployeeUser(user.uid, created, user.email);
  }
  throw new ApiError('Unable to open employee profile. Try creating an account again.', 403);
}

export async function adminAccountExists(): Promise<boolean> {
  try {
    assertFirebaseConfigured();
    return (await peekById('app_config', 'lock')) != null;
  } catch {
    return true;
  }
}

export async function loginRequest(email: string, password: string): Promise<AuthResponse> {
  assertFirebaseConfigured();
  try {
    await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    const profile = await resolveSession();
    const authTokens = await tokens();
    return { ...authTokens, user: profile };
  } catch (error) {
    if (getFirebaseAuth().currentUser) {
      await signOut(getFirebaseAuth());
    }
    throw error instanceof ApiError ? error : mapAuthError(error);
  }
}

export async function registerRequest(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  assertFirebaseConfigured();
  const email = payload.email.trim();

  try {
    const credential = await createUserWithEmailAndPassword(
      getFirebaseAuth(),
      email,
      payload.password,
    );
    await updateProfile(credential.user, { displayName: payload.name.trim() });

    const lock = await getByIdOrNull('app_config', 'lock');
    if (lock) {
      await credential.user.delete();
      throw new ApiError('An admin account already exists. Sign in instead.', 403);
    }

    const profile = await ensureUserProfile(credential.user.uid, payload.name.trim(), email);
    await setRecord('app_config', 'lock', { createdAt: new Date().toISOString() });
    const authTokens = await tokens();
    return { ...authTokens, user: profile };
  } catch (error) {
    throw error instanceof ApiError ? error : mapAuthError(error);
  }
}

export async function registerEmployeeRequest(payload: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  assertFirebaseConfigured();
  const email = payload.email.trim().toLowerCase();

  try {
    const credential = await createUserWithEmailAndPassword(
      getFirebaseAuth(),
      email,
      payload.password,
    );
    try {
      await updateProfile(credential.user, {
        displayName: `${payload.firstName.trim()} ${payload.lastName.trim()}`.trim(),
      });
      const employee = await createSelfEmployee({
        firstName: payload.firstName,
        lastName: payload.lastName,
        email,
      });
      const authTokens = await tokens();
      return { ...authTokens, user: toEmployeeUser(credential.user.uid, employee, email) };
    } catch (error) {
      try {
        await credential.user.delete();
      } catch {
        await signOut(getFirebaseAuth());
      }
      throw error;
    }
  } catch (error) {
    throw error instanceof ApiError ? error : mapAuthError(error);
  }
}

async function ensureUserProfile(uid: string, name: string, email: string): Promise<AuthUser> {
  const byId = await getByIdOrNull('users', uid);
  if (byId) {
    return toAdmin(uid, byId, email, name);
  }

  const data = {
    name,
    email,
    role: 'ADMIN',
    twoFactorEnabled: false,
  };
  const saved = await setRecord('users', uid, data);
  return toAdmin(uid, saved, email, name);
}

export async function fetchCurrentAdmin(): Promise<AuthUser> {
  const session = await resolveSession();
  if (session.role !== 'ADMIN') {
    throw new ApiError('Admin only', 403);
  }
  return session;
}

export async function updateAdminProfile(payload: {
  name?: string;
  email?: string;
}): Promise<AuthUser> {
  const user = requireUser();
  if (payload.name) {
    await updateProfile(user, { displayName: payload.name.trim() });
  }
  if (payload.email && payload.email.trim() !== user.email) {
    try {
      await updateEmail(user, payload.email.trim());
    } catch (error) {
      throw mapAuthError(error);
    }
  }
  const next = {
    ...(payload.name ? { name: payload.name.trim() } : {}),
    ...(payload.email ? { email: payload.email.trim() } : {}),
  };
  await setRecord('users', user.uid, next);
  return fetchCurrentAdmin();
}

export async function changePasswordRequest(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: true }> {
  const user = requireUser();
  if (!user.email) {
    throw new ApiError('Unable to change password.', 400);
  }
  try {
    const credential = EmailAuthProvider.credential(user.email, payload.currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, payload.newPassword);
    return { success: true };
  } catch (error) {
    throw mapAuthError(error);
  }
}

export async function logoutRequest(): Promise<{ success: true }> {
  await signOut(getFirebaseAuth());
  return { success: true };
}

export function subscribeAuth(callback: (uid: string | null) => void): () => void {
  try {
    assertFirebaseConfigured();
  } catch {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(getFirebaseAuth(), (user) => {
    callback(user?.uid ?? null);
  });
}
