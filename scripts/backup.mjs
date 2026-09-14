import { existsSync } from 'node:fs';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  isGoogleDriveConfigured,
  loadEnvFiles,
  resolveGoogleDriveEnv,
  sanitizeErrorMessage,
  scriptsRoot,
} from './lib/env.mjs';
import {
  createDriveClient,
  databaseBackupObjectKey,
  pruneDriveBackups,
  uploadBackupFile,
} from './lib/drive.mjs';
import { createFirestoreFromEnv, dumpFirestore } from './lib/firestore.mjs';

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
const nodeEnv = process.env.NODE_ENV ?? 'development';

async function pruneLocal(dir) {
  if (!existsSync(dir)) {
    return;
  }
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const entries = await readdir(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const info = await stat(full);
    if (info.mtimeMs < cutoff) {
      await rm(full, { recursive: true, force: true });
    }
  }
}

async function verifyLocalBackup(destination) {
  if (!existsSync(destination)) {
    throw new Error('Database backup file was not created');
  }
  const info = await stat(destination);
  if (info.size <= 0) {
    throw new Error('Database backup file is empty');
  }
  return info.size;
}

async function writeBackupLog(db, data) {
  const id = data.id ?? randomUUID();
  const now = new Date().toISOString();
  await db.collection('backup_logs').doc(id).set({
    id,
    backupType: 'DATABASE',
    createdAt: now,
    ...data,
  });
  return id;
}

async function run() {
  const dbDir = path.join(backupRoot, 'database');
  await mkdir(dbDir, { recursive: true });
  const { db, projectId } = createFirestoreFromEnv();
  const fileName = `${projectId}-${stamp}.json`;
  const destination = path.join(dbDir, fileName);
  let logId;

  try {
    logId = await writeBackupLog(db, {
      status: 'IN_PROGRESS',
      fileName,
      storageLocation: destination,
    });

    const dump = await dumpFirestore(db);
    await writeFile(destination, JSON.stringify(dump, null, 2), 'utf8');
    const localSize = await verifyLocalBackup(destination);
    const driveEnv = resolveGoogleDriveEnv();

    if (!isGoogleDriveConfigured(driveEnv)) {
      if (nodeEnv === 'production') {
        throw new Error(
          'Google Drive is required in production. Local dump was kept for recovery.',
        );
      }

      await writeBackupLog(db, {
        id: logId,
        status: 'COMPLETED',
        fileName,
        storageLocation: destination,
        completedAt: new Date().toISOString(),
      });
      await pruneLocal(dbDir);
      console.log(
        `Firestore backup written to ${destination} (${localSize} bytes)`,
      );
      console.log('Google Drive not configured — using local storage.');
      console.log(`Retention: ${retentionDays} day(s)`);
      return;
    }

    try {
      const drive = createDriveClient(driveEnv);
      const uploaded = await uploadBackupFile({
        drive,
        folderId: driveEnv.folderId,
        key: databaseBackupObjectKey(fileName),
        filePath: destination,
      });
      const removed = await pruneDriveBackups({
        drive,
        retentionDays,
      });

      await writeBackupLog(db, {
        id: logId,
        status: 'COMPLETED',
        fileName,
        storageLocation: `gdrive://${uploaded.id}`,
        completedAt: new Date().toISOString(),
      });
      await pruneLocal(dbDir);
      console.log(
        `Firestore backup written to ${destination} (${localSize} bytes)`,
      );
      console.log(`Google Drive upload verified: ${uploaded.key}`);
      console.log(
        `Retention: ${retentionDays} day(s); expired Drive backup files removed: ${removed}`,
      );
    } catch (error) {
      const message = sanitizeErrorMessage(error);
      await writeBackupLog(db, {
        id: logId,
        status: 'FAILED',
        fileName,
        storageLocation: destination,
        errorMessage: `Google Drive upload failed after local dump succeeded: ${message}`,
        completedAt: new Date().toISOString(),
      });
      console.error(
        'Firestore dump succeeded locally, but Google Drive upload failed. Backup is NOT complete.',
      );
      console.error(`Local recovery file kept at ${destination}`);
      console.error(message);
      process.exitCode = 1;
    }
  } catch (error) {
    if (logId) {
      await writeBackupLog(db, {
        id: logId,
        status: 'FAILED',
        fileName,
        storageLocation: destination,
        errorMessage: sanitizeErrorMessage(error),
        completedAt: new Date().toISOString(),
      });
    }
    console.error(
      'Firestore backup failed. Check FIREBASE_PROJECT_ID and the service account.',
    );
    console.error(sanitizeErrorMessage(error));
    process.exitCode = 1;
  }
}

await run();
