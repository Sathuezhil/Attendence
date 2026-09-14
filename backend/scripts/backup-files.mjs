import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  backendRoot,
  isGoogleDriveConfigured,
  loadEnvFiles,
  sanitizeErrorMessage,
} from './lib/env.mjs';

loadEnvFiles();

const retentionDays = Math.max(
  1,
  Number(process.env.BACKUP_RETENTION_DAYS ?? 7),
);
const backupRoot = path.resolve(
  backendRoot,
  process.env.BACKUP_DIR ?? 'backups',
);
const storageDir = path.resolve(
  backendRoot,
  process.env.STORAGE_LOCAL_DIR ?? 'storage',
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

async function run() {
  const filesDir = path.join(backupRoot, 'files');
  await mkdir(filesDir, { recursive: true });
  const fileName = `documents-${stamp}`;
  const destination = path.join(filesDir, fileName);
  const prisma = new PrismaClient();
  let logId;

  try {
    const log = await prisma.backupLog.create({
      data: {
        backupType: 'DOCUMENTS',
        status: 'IN_PROGRESS',
        fileName,
        storageLocation: destination,
      },
    });
    logId = log.id;

    if (!existsSync(storageDir)) {
      await mkdir(destination, { recursive: true });
    } else {
      await cp(storageDir, destination, { recursive: true });
    }

    await prisma.backupLog.update({
      where: { id: logId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    await prune(filesDir);
    console.log(`Local document backup written to ${destination}`);
    if (isGoogleDriveConfigured()) {
      console.log(
        'Live employee documents are stored in Google Drive. This command only copies local fallback files.',
      );
    }
  } catch (error) {
    if (logId) {
      await prisma.backupLog.update({
        where: { id: logId },
        data: {
          status: 'FAILED',
          errorMessage: sanitizeErrorMessage(error),
          completedAt: new Date(),
        },
      });
    }
    console.error('Document backup failed.');
    console.error(sanitizeErrorMessage(error));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

await run();
