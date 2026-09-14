import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const FIRESTORE_COLLECTIONS = [
  'users',
  'refresh_tokens',
  'employees',
  'passports',
  'visas',
  'attendances',
  'leaves',
  'invoices',
  'invoice_items',
  'payroll_records',
  'documents',
  'notifications',
  'backup_logs',
  'audit_logs',
  'app_settings',
];

function firstNonEmpty(...values) {
  for (const value of values) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (trimmed) {
      return trimmed;
    }
  }
  return '';
}

function jsonValue(_key, value) {
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return value;
}

export function createFirestoreFromEnv() {
  const serviceAccountJson = firstNonEmpty(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  );
  let jsonProjectId = '';
  if (serviceAccountJson) {
    jsonProjectId = JSON.parse(serviceAccountJson).project_id ?? '';
  }
  const projectId = firstNonEmpty(
    process.env.FIREBASE_PROJECT_ID,
    jsonProjectId,
  );
  const clientEmail = firstNonEmpty(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (getApps().length === 0) {
    if (serviceAccountJson) {
      initializeApp({
        credential: cert(JSON.parse(serviceAccountJson)),
        projectId,
      });
    } else if (clientEmail && privateKey && projectId) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && projectId) {
      initializeApp({
        credential: applicationDefault(),
        projectId,
      });
    } else {
      throw new Error(
        'Firestore is not configured. Set FIREBASE_PROJECT_ID and a service account.',
      );
    }
  }

  return { db: getFirestore(), projectId: projectId || 'firestore' };
}

export async function dumpFirestore(db) {
  const collections = {};
  for (const name of FIRESTORE_COLLECTIONS) {
    const snap = await db.collection(name).get();
    collections[name] = snap.docs.map((doc) => ({
      id: doc.id,
      data: JSON.parse(JSON.stringify(doc.data(), jsonValue)),
    }));
  }
  return {
    exportedAt: new Date().toISOString(),
    collections,
  };
}

export async function restoreFirestore(db, dump) {
  const collections = dump?.collections ?? {};
  for (const name of FIRESTORE_COLLECTIONS) {
    const existing = await db.collection(name).get();
    for (const doc of existing.docs) {
      await doc.ref.delete();
    }
    for (const row of collections[name] ?? []) {
      await db.collection(name).doc(row.id).set(row.data ?? {});
    }
  }
}
