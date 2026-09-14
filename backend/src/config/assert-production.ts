import {
  isGoogleDriveConfigured,
  StorageSettings,
} from '../common/storage/storage-config';

export function assertProductionConfig(input: {
  nodeEnv: string;
  corsOrigins: string[];
  jwt: {
    accessSecret: string;
    refreshSecret: string;
  };
  firestore?: {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
    serviceAccountJson?: string;
  };
  storage?: Pick<
    StorageSettings,
    'clientId' | 'clientSecret' | 'refreshToken' | 'folderId'
  >;
}): void {
  if (input.nodeEnv !== 'production') {
    return;
  }

  if (!isFirestoreReady(input.firestore)) {
    throw new Error(
      'Firestore is required in production. Set FIREBASE_PROJECT_ID and a service account (FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY).',
    );
  }

  if (
    isWeakSecret(input.jwt.accessSecret) ||
    isWeakSecret(input.jwt.refreshSecret)
  ) {
    throw new Error(
      'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be strong unique values in production',
    );
  }

  if (input.jwt.accessSecret === input.jwt.refreshSecret) {
    throw new Error(
      'JWT access and refresh secrets must be different in production',
    );
  }

  if (input.corsOrigins.length === 0 || input.corsOrigins.includes('*')) {
    throw new Error(
      'CORS_ORIGIN must be an explicit allowlist in production (do not use *)',
    );
  }

  if (!input.storage || !isGoogleDriveConfigured(input.storage)) {
    throw new Error(
      'Google Drive storage is required in production. Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN, and GOOGLE_DRIVE_FOLDER_ID.',
    );
  }
}

function isFirestoreReady(firestore?: {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  serviceAccountJson?: string;
}): boolean {
  if (!firestore?.projectId?.trim()) {
    return false;
  }
  if (firestore.serviceAccountJson?.trim()) {
    return true;
  }
  return Boolean(
    firestore.clientEmail?.trim() && firestore.privateKey?.trim(),
  );
}

function isWeakSecret(value: string): boolean {
  if (!value || value.length < 32) {
    return true;
  }

  const lower = value.toLowerCase();
  return ['replace-with', 'changeme', 'dev-only'].some((marker) =>
    lower.includes(marker),
  );
}
