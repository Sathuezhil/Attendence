import { createRequire } from 'node:module';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { resolveGoogleDriveEnv } from './env.mjs';

const require = createRequire(import.meta.url);
const { google } = require('googleapis');

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const BACKUP_KIND = 'database-backup';

function escapeDriveQuery(value) {
  return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

export function createDriveClient(env = resolveGoogleDriveEnv()) {
  if (
    !env.clientId ||
    !env.clientSecret ||
    !env.refreshToken ||
    !env.folderId
  ) {
    throw new Error('Google Drive client is missing credentials');
  }

  const auth = new google.auth.OAuth2(env.clientId, env.clientSecret);
  auth.setCredentials({ refresh_token: env.refreshToken });
  return google.drive({ version: 'v3', auth });
}

export function databaseBackupObjectKey(fileName, now = new Date()) {
  const safeName = fileName.replaceAll(/[^A-Za-z0-9._-]/g, '_');
  const date = now.toISOString().slice(0, 10);
  return `backups/${date}/${safeName}`;
}

async function findChild(drive, parentId, name, mimeType) {
  const response = await drive.files.list({
    q: `name = '${escapeDriveQuery(name)}' and mimeType = '${mimeType}' and '${parentId}' in parents and trashed = false`,
    fields: 'files(id,name)',
    pageSize: 1,
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return response.data.files?.[0]?.id;
}

async function ensureFolder(drive, parentId, name) {
  const existing = await findChild(drive, parentId, name, FOLDER_MIME);
  if (existing) {
    return existing;
  }
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  if (!created.data.id) {
    throw new Error('Google Drive folder creation failed');
  }
  return created.data.id;
}

export async function uploadBackupFile({
  drive,
  folderId,
  key,
  filePath,
}) {
  const info = await stat(filePath);
  if (info.size <= 0) {
    throw new Error('Local backup file is empty');
  }

  const parts = key.split('/').filter(Boolean);
  if (parts[0] !== 'backups' || parts.length < 3) {
    throw new Error('Invalid backup storage key');
  }
  const dateFolder = parts[1];
  const fileName = parts.slice(2).join('_');
  const backupsRoot = await ensureFolder(drive, folderId, 'backups');
  const dateRoot = await ensureFolder(drive, backupsRoot, dateFolder);

  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [dateRoot],
      mimeType: 'application/octet-stream',
      appProperties: {
        storageKey: key,
        kind: BACKUP_KIND,
      },
    },
    media: {
      mimeType: 'application/octet-stream',
      body: createReadStream(filePath),
    },
    fields: 'id,size,name',
    supportsAllDrives: true,
  });

  const fileId = created.data.id;
  if (!fileId) {
    throw new Error('Google Drive backup upload failed');
  }

  const verified = await drive.files.get({
    fileId,
    fields: 'id,size',
    supportsAllDrives: true,
  });
  const remoteSize = Number(verified.data.size ?? 0);
  if (remoteSize !== info.size) {
    throw new Error('Google Drive upload verification failed');
  }

  return { id: fileId, key, size: info.size };
}

export async function pruneDriveBackups({
  drive,
  retentionDays,
  now = new Date(),
}) {
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  let pageToken;
  let deleted = 0;

  do {
    const page = await drive.files.list({
      q: `appProperties has { key='kind' and value='${BACKUP_KIND}' } and trashed = false`,
      fields: 'nextPageToken,files(id,createdTime,appProperties)',
      pageSize: 100,
      pageToken,
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    for (const file of page.data.files ?? []) {
      if (!file.id || !file.createdTime) {
        continue;
      }
      if (new Date(file.createdTime).getTime() < cutoff) {
        await drive.files.delete({
          fileId: file.id,
          supportsAllDrives: true,
        });
        deleted += 1;
      }
    }

    pageToken = page.data.nextPageToken || undefined;
  } while (pageToken);

  return deleted;
}

export async function downloadBackupFile({
  drive,
  fileId,
  storageKey,
  destination,
}) {
  let resolvedId = fileId;
  if (!resolvedId && storageKey) {
    const found = await drive.files.list({
      q: `appProperties has { key='storageKey' and value='${escapeDriveQuery(storageKey)}' } and trashed = false`,
      fields: 'files(id,name)',
      pageSize: 1,
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    resolvedId = found.data.files?.[0]?.id;
  }
  if (!resolvedId) {
    throw new Error('Google Drive backup file was not found');
  }

  await mkdir(path.dirname(destination), { recursive: true });
  const response = await drive.files.get(
    {
      fileId: resolvedId,
      alt: 'media',
      supportsAllDrives: true,
    },
    { responseType: 'stream' },
  );

  const body = response.data;
  if (!body) {
    throw new Error('Google Drive backup download failed: empty body');
  }

  const stream =
    typeof body.pipe === 'function' ? body : Readable.from(body);
  await pipeline(stream, createWriteStream(destination));
  return resolvedId;
}
