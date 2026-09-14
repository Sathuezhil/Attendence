import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

export interface FirestoreCredentials {
  projectId: string;
  clientEmail?: string;
  privateKey?: string;
  serviceAccountJson?: string;
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim() ?? '';
    if (trimmed) {
      return trimmed;
    }
  }
  return '';
}

export function resolveFirestoreCredentials(
  env: NodeJS.ProcessEnv = process.env,
): FirestoreCredentials {
  const serviceAccountJson = firstNonEmpty(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  let jsonProjectId = '';
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson) as { project_id?: string };
      jsonProjectId = parsed.project_id ?? '';
    } catch {
      jsonProjectId = '';
    }
  }

  return {
    projectId: firstNonEmpty(env.FIREBASE_PROJECT_ID, jsonProjectId),
    clientEmail: firstNonEmpty(env.FIREBASE_CLIENT_EMAIL),
    privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    serviceAccountJson,
  };
}

export function isFirestoreConfigured(
  creds: FirestoreCredentials = resolveFirestoreCredentials(),
): boolean {
  if (process.env.FIRESTORE_EMULATOR_HOST?.trim()) {
    return Boolean(creds.projectId || process.env.FIREBASE_PROJECT_ID);
  }
  if (!creds.projectId) {
    return false;
  }
  if (creds.serviceAccountJson) {
    return true;
  }
  if (creds.clientEmail && creds.privateKey) {
    return true;
  }
  return Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim());
}

export function createFirestore(
  creds: FirestoreCredentials = resolveFirestoreCredentials(),
): Firestore | null {
  if (!isFirestoreConfigured(creds)) {
    return null;
  }

  if (getApps().length === 0) {
    const emulator = process.env.FIRESTORE_EMULATOR_HOST?.trim();
    if (emulator) {
      initializeApp({
        projectId: creds.projectId || 'employee-management-local',
      });
    } else if (creds.serviceAccountJson) {
      const serviceAccount = JSON.parse(creds.serviceAccountJson) as ServiceAccount;
      initializeApp({
        credential: cert(serviceAccount),
        projectId: creds.projectId,
      });
    } else if (creds.clientEmail && creds.privateKey) {
      initializeApp({
        credential: cert({
          projectId: creds.projectId,
          clientEmail: creds.clientEmail,
          privateKey: creds.privateKey,
        }),
        projectId: creds.projectId,
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
        projectId: creds.projectId,
      });
    }
  }

  const firestore = getFirestore();
  applyFirestoreSettings(firestore);
  return firestore;
}

let firestoreSettingsApplied = false;

function applyFirestoreSettings(firestore: Firestore): void {
  if (firestoreSettingsApplied) {
    return;
  }
  firestore.settings({ ignoreUndefinedProperties: true });
  firestoreSettingsApplied = true;
}
