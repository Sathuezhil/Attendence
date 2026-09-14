import { existsSync, readFileSync } from 'node:fs';
import { cp, rm } from 'node:fs/promises';
import path from 'node:path';
import {
  backendRoot,
  isGoogleDriveConfigured,
  loadEnvFiles,
  resolveGoogleDriveEnv,
  sanitizeErrorMessage,
} from './lib/env.mjs';
import { createDriveClient, downloadBackupFile } from './lib/drive.mjs';
import {
  createFirestoreFromEnv,
  restoreFirestore,
} from './lib/firestore.mjs';

loadEnvFiles();

if (process.env.CONFIRM_RESTORE !== 'YES') {
  console.error(
    'Refusing to restore. Set CONFIRM_RESTORE=YES and pass BACKUP_FILE, GOOGLE_DRIVE_BACKUP_FILE_ID, GOOGLE_DRIVE_BACKUP_KEY, and/or FILES_BACKUP_DIR.',
  );
  console.error(
    'This script is for server operators only. Do not expose it over HTTP.',
  );
  process.exit(1);
}

async function resolveDatabaseBackupFile() {
  if (process.env.BACKUP_FILE) {
    return path.resolve(process.env.BACKUP_FILE);
  }

  const fileId = process.env.GOOGLE_DRIVE_BACKUP_FILE_ID?.trim();
  const storageKey = process.env.GOOGLE_DRIVE_BACKUP_KEY?.trim();
  if (!fileId && !storageKey) {
    return undefined;
  }

  if (
    storageKey &&
    (storageKey.includes('..') ||
      storageKey.startsWith('/') ||
      !storageKey.startsWith('backups/'))
  ) {
    throw new Error(
      'GOOGLE_DRIVE_BACKUP_KEY must be a private backups/ object key',
    );
  }

  const driveEnv = resolveGoogleDriveEnv();
  if (!isGoogleDriveConfigured(driveEnv)) {
    throw new Error(
      'Google Drive restore requires GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN, and GOOGLE_DRIVE_FOLDER_ID.',
    );
  }

  const destination = path.join(
    backendRoot,
    process.env.BACKUP_DIR ?? 'backups',
    'restore-tmp',
    path.basename(storageKey || fileId || 'backup.json'),
  );
  const drive = createDriveClient(driveEnv);
  console.log('Downloading database backup from Google Drive...');
  await downloadBackupFile({
    drive,
    fileId,
    storageKey,
    destination,
  });
  return destination;
}

async function restoreDatabase() {
  const full = await resolveDatabaseBackupFile();
  if (!full) {
    return;
  }
  if (!existsSync(full)) {
    throw new Error(`BACKUP_FILE not found: ${full}`);
  }
  const dump = JSON.parse(readFileSync(full, 'utf8'));
  const { db } = createFirestoreFromEnv();
  await restoreFirestore(db, dump);
  console.log('Firestore restore finished.');
}

async function restoreFiles() {
  const source = process.env.FILES_BACKUP_DIR;
  if (!source) {
    return;
  }
  const from = path.resolve(source);
  if (!existsSync(from)) {
    throw new Error(`FILES_BACKUP_DIR not found: ${from}`);
  }
  const storageDir = path.resolve(
    backendRoot,
    process.env.STORAGE_LOCAL_DIR ?? 'storage',
  );
  await rm(storageDir, { recursive: true, force: true });
  await cp(from, storageDir, { recursive: true });
  console.log('Uploaded documents restore finished.');
}

try {
  await restoreDatabase();
  await restoreFiles();
  console.log(
    'Verify the API with GET /health before returning the app to service.',
  );
  console.log(
    'Documents stored in Google Drive are served through authenticated GET /documents/:id/file.',
  );
} catch (error) {
  console.error(sanitizeErrorMessage(error));
  process.exit(1);
}
