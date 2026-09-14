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
import { ApiError } from '@/lib/api';
import { asIso, asString, listCollection, setRecord } from '@/lib/data';
import {
  assertFirebaseConfigured,
  getFirebaseAuth,
  mapAuthError,
  requireUser,
} from '@/lib/firebase';
import { AuthResponse, PublicAdmin } from './types';

function toAdmin(id: string, data: Record<string, unknown>, fallbackEmail: string, fallbackName: string): PublicAdmin {
  return {
    id,
    name: asString(data.name, fallbackName),
    email: asString(data.email, fallbackEmail),
    role: 'ADMIN',
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
  };
}

async function findUserByEmail(email: string) {
  const rows = await listCollection('users');
  const needle = email.trim().toLowerCase();
  return rows.find((row) => asString(row.email).toLowerCase() === needle);
}

async function tokens(): Promise<{ accessToken: string; refreshToken: string }> {
  const user = requireUser();
  return {
    accessToken: await user.getIdToken(),
    refreshToken: user.refreshToken,
  };
}

export async function loginRequest(email: string, password: string): Promise<AuthResponse> {
  assertFirebaseConfigured();
  try {
    const credential = await signInWithEmailAndPassword(
      getFirebaseAuth(),
      email.trim(),
      password,
    );
    const profile = await ensureUserProfile(
      credential.user.uid,
      credential.user.displayName || email.split('@')[0],
      credential.user.email || email,
    );
    const authTokens = await tokens();
    return { ...authTokens, user: profile };
  } catch (error) {
    throw mapAuthError(error);
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

    const existing = await listCollection('users');
    const otherAdmins = existing.filter(
      (row) => asString(row.email).toLowerCase() !== email.toLowerCase(),
    );
    if (otherAdmins.length > 0) {
      await credential.user.delete();
      throw new ApiError('An admin account already exists. Sign in instead.', 403);
    }

    const profile = await ensureUserProfile(credential.user.uid, payload.name.trim(), email);
    const authTokens = await tokens();
    return { ...authTokens, user: profile };
  } catch (error) {
    throw mapAuthError(error);
  }
}

async function ensureUserProfile(uid: string, name: string, email: string): Promise<PublicAdmin> {
  const byId = (await listCollection('users')).find((row) => row.id === uid);
  if (byId) {
    return toAdmin(uid, byId, email, name);
  }

  const byEmail = await findUserByEmail(email);
  const data = {
    name: asString(byEmail?.name, name),
    email,
    role: 'ADMIN',
    twoFactorEnabled: false,
  };
  const saved = await setRecord('users', uid, data);
  return toAdmin(uid, saved, email, name);
}

export async function fetchCurrentAdmin(): Promise<PublicAdmin> {
  const user = requireUser();
  const rows = await listCollection('users');
  const row = rows.find((item) => item.id === user.uid) ?? (await findUserByEmail(user.email ?? ''));
  if (!row) {
    return toAdmin(user.uid, {}, user.email ?? '', user.displayName ?? 'Admin');
  }
  return toAdmin(row.id === user.uid ? user.uid : row.id, row, user.email ?? '', user.displayName ?? 'Admin');
}

export async function updateAdminProfile(payload: {
  name?: string;
  email?: string;
}): Promise<PublicAdmin> {
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
