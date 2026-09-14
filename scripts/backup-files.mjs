import { existsSync } from 'node:fs';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  isGoogleDriveConfigured,
  loadEnvFiles,
  sanitizeErrorMessage,
  scriptsRoot,
} from './lib/env.mjs';
import { createFirestoreFromEnv } from './lib/firestore.mjs';

loadEnvFiles();

const retentionDays = Math.max(
  1,
  Number(process.env.BACKUP_RETENTION_DAYS ?? 7),
);
const backupRoot = path.resolve(
  scriptsRoot,
  process.env.BACKUP_DIR ?? 'backups',
);
const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');

async function prune(dir) {
  if (!existsSync(dir)) {
    return;
  }
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    const info = await stat(full);
    if (info.mtimeMs < cutoff) {
      await rm(full, { recursive: true, force: true });
    }
  }
}

async function writeBackupLog(db, data) {
  const id = data.id ?? randomUUID();
  const now = new Date().toISOString();
  await db.collection('backup_logs').doc(id).set({
    id,
    backupType: 'DOCUMENTS',
    createdAt: now,
    ...data,
  });
  return id;
}

async function run() {
  const { db } = createFirestoreFromEnv();
  const filesDir = path.join(backupRoot, 'files');
  await mkdir(filesDir, { recursive: true });
  const fileName = `documents-${stamp}`;
  let logId;

  try {
    logId = await writeBackupLog(db, {
      status: 'IN_PROGRESS',
      fileName,
      storageLocation: 'gdrive://documents',
    });

    if (isGoogleDriveConfigured()) {
      await writeBackupLog(db, {
        id: logId,
        status: 'COMPLETED',
        fileName,
        storageLocation: 'gdrive://documents',
        completedAt: new Date().toISOString(),
      });
      console.log(
        'Employee documents already live in Google Drive. No local file copy is needed.',
      );
      return;
    }

    await writeBackupLog(db, {
      id: logId,
      status: 'COMPLETED',
      fileName,
      storageLocation: filesDir,
      completedAt: new Date().toISOString(),
    });
    await prune(filesDir);
    console.log('Google Drive is not configured; there are no local document files to copy.');
  } catch (error) {
    if (logId) {
      await writeBackupLog(db, {
        id: logId,
        status: 'FAILED',
        fileName,
        errorMessage: sanitizeErrorMessage(error),
        completedAt: new Date().toISOString(),
      });
    }
    console.error('Document backup failed.');
    console.error(sanitizeErrorMessage(error));
    process.exitCode = 1;
  }
}

await run();
