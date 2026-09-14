import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth, Persistence } from 'firebase/auth';
import {
  Firestore,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { ApiError, notifySessionExpired } from '@/lib/api';

const DEFAULT_PROJECT_ID = 'employee-management-23186';

let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

function nativePersistence(): Persistence | null {
  if (Platform.OS === 'web') {
    return null;
  }

  const authModule = require('firebase/auth') as {
    getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
  };
  return authModule.getReactNativePersistence
    ? authModule.getReactNativePersistence(AsyncStorage)
    : null;
}

export function getFirebaseWebConfig() {
  const projectId =
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() || DEFAULT_PROJECT_ID;

  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim() ?? '',
    authDomain:
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ||
      `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket:
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
      `${projectId}.appspot.com`,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim() ?? '',
  };
}

export function assertFirebaseConfigured(): void {
  if (!process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim()) {
    throw new ApiError(
      'Firebase Web API key is missing. In Firebase Console add a Web app, then put EXPO_PUBLIC_FIREBASE_API_KEY in mobile/.env and restart Expo.',
      0,
    );
  }
}

function getFirebaseApp(): FirebaseApp {
  assertFirebaseConfigured();
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(getFirebaseWebConfig());
}

export function getFirebaseAuth(): Auth {
  if (authInstance) {
    return authInstance;
  }

  const app = getFirebaseApp();
  try {
    const persistence = nativePersistence();
    authInstance = persistence
      ? initializeAuth(app, { persistence })
      : getAuth(app);
  } catch {
    authInstance = getAuth(app);
  }

  return authInstance;
}

export function getDb(): Firestore {
  if (dbInstance) {
    return dbInstance;
  }

  const app = getFirebaseApp();
  try {
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    dbInstance = getFirestore(app);
  }

  return dbInstance;
}

export function requireUser() {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    notifySessionExpired();
    throw new ApiError('Your session has expired. Please sign in again.', 401);
  }

  return user;
}

export function mapAuthError(error: unknown): ApiError {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-email':
      return new ApiError('Invalid email or password.', 401);
    case 'auth/email-already-in-use':
      return new ApiError('An admin account already exists. Sign in instead.', 403);
    case 'auth/weak-password':
      return new ApiError('Password must be at least 6 characters.', 400);
    case 'auth/too-many-requests':
      return new ApiError('Too many attempts. Try again later.', 429);
    case 'auth/network-request-failed':
      return new ApiError('Unable to connect. Check your internet connection.', 0);
    case 'auth/invalid-api-key':
      return new ApiError(
        'Firebase Web API key is invalid. Copy the Web API key from Firebase Console into mobile/.env.',
        0,
      );
    default:
      if (error instanceof ApiError) {
        return error;
      }
      return new ApiError('Unable to complete this request. Please try again.', 400);
  }
}
