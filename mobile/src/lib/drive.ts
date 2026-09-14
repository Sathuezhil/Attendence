import { ApiError } from '@/lib/api';
import { PickedDocument } from '@/features/documents/types';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

let cachedToken: { accessToken: string; expiresAt: number } | null = null;
const folderCache = new Map<string, string>();

function driveConfig() {
  return {
    clientId: process.env.EXPO_PUBLIC_GOOGLE_DRIVE_CLIENT_ID?.trim() ?? '',
    clientSecret: process.env.EXPO_PUBLIC_GOOGLE_DRIVE_CLIENT_SECRET?.trim() ?? '',
    refreshToken: process.env.EXPO_PUBLIC_GOOGLE_DRIVE_REFRESH_TOKEN?.trim() ?? '',
    folderId: process.env.EXPO_PUBLIC_GOOGLE_DRIVE_FOLDER_ID?.trim() ?? '',
  };
}

export function isDriveConfigured(): boolean {
  const config = driveConfig();
  return Boolean(config.clientId && config.clientSecret && config.refreshToken && config.folderId);
}

function assertDriveConfigured(): void {
  if (!isDriveConfigured()) {
    throw new ApiError(
      'Google Drive is not configured. Copy GOOGLE_DRIVE_* values into mobile/.env as EXPO_PUBLIC_GOOGLE_DRIVE_*.',
      0,
    );
  }
}

function escapeDriveQuery(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

async function getAccessToken(): Promise<string> {
  assertDriveConfigured();
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const config = driveConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!response.ok || !json.access_token) {
    throw new ApiError('Unable to connect to Google Drive. Check Drive credentials.', 0);
  }

  cachedToken = {
    accessToken: json.access_token,
    expiresAt: Date.now() + Math.max(60, json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.accessToken;
}

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

async function listFiles(query: string): Promise<Array<{ id?: string; name?: string }>> {
  const params = new URLSearchParams({
    q: query,
    fields: 'files(id,name)',
    pageSize: '1',
    spaces: 'drive',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });
  const response = await driveFetch(`${DRIVE_FILES}?${params.toString()}`);
  const json = (await response.json()) as { files?: Array<{ id?: string; name?: string }> };
  if (!response.ok) {
    throw new ApiError('Google Drive lookup failed', 0);
  }
  return json.files ?? [];
}

async function ensureChildFolder(parentId: string, name: string): Promise<string> {
  const cacheKey = `${parentId}:${name}`;
  const cached = folderCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const existing = await listFiles(
    `name = '${escapeDriveQuery(name)}' and mimeType = '${FOLDER_MIME}' and '${parentId}' in parents and trashed = false`,
  );
  if (existing[0]?.id) {
    folderCache.set(cacheKey, existing[0].id);
    return existing[0].id;
  }

  const response = await driveFetch(`${DRIVE_FILES}?supportsAllDrives=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    }),
  });
  const json = (await response.json()) as { id?: string };
  if (!response.ok || !json.id) {
    throw new ApiError('Google Drive folder creation failed', 0);
  }
  folderCache.set(cacheKey, json.id);
  return json.id;
}

async function ensurePath(segments: string[]): Promise<string> {
  let parentId = driveConfig().folderId;
  for (const name of segments) {
    parentId = await ensureChildFolder(parentId, name);
  }
  return parentId;
}

async function findFileIdByStorageKey(storageKey: string): Promise<string | undefined> {
  const files = await listFiles(
    `appProperties has { key='storageKey' and value='${escapeDriveQuery(storageKey)}' } and trashed = false`,
  );
  return files[0]?.id;
}

async function readPickedBytes(file: PickedDocument): Promise<{
  bytes: Uint8Array;
  mimeType: string;
  name: string;
}> {
  if (file.file) {
    const buffer = await file.file.arrayBuffer();
    return {
      bytes: new Uint8Array(buffer),
      mimeType: file.mimeType ?? file.file.type ?? 'application/octet-stream',
      name: file.name,
    };
  }

  const response = await fetch(file.uri);
  if (!response.ok) {
    throw new ApiError('Unable to read the selected file.', 0);
  }
  const buffer = await response.arrayBuffer();
  return {
    bytes: new Uint8Array(buffer),
    mimeType: file.mimeType ?? 'application/octet-stream',
    name: file.name,
  };
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function uploadDriveDocument(
  employeeId: string,
  storageKey: string,
  file: PickedDocument,
  onProgress?: (percent: number) => void,
): Promise<{ fileId: string; size: number; mimeType: string; fileName: string }> {
  const picked = await readPickedBytes(file);
  onProgress?.(10);
  const parentId = await ensurePath(['documents', employeeId]);
  const existingId = await findFileIdByStorageKey(storageKey);
  onProgress?.(40);

  const metadata = {
    name: picked.name,
    parents: existingId ? undefined : [parentId],
    mimeType: picked.mimeType,
    appProperties: {
      storageKey,
      kind: 'document',
    },
  };

  const boundary = `attendance_${Date.now()}`;
  const metaPart = JSON.stringify(existingId ? { name: metadata.name, mimeType: metadata.mimeType, appProperties: metadata.appProperties } : metadata);
  const preamble = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metaPart}\r\n--${boundary}\r\nContent-Type: ${picked.mimeType}\r\n\r\n`;
  const closing = `\r\n--${boundary}--`;
  const encoder = new TextEncoder();
  const head = encoder.encode(preamble);
  const tail = encoder.encode(closing);
  const body = new Uint8Array(head.length + picked.bytes.length + tail.length);
  body.set(head, 0);
  body.set(picked.bytes, head.length);
  body.set(tail, head.length + picked.bytes.length);

  const url = existingId
    ? `${DRIVE_UPLOAD}/${existingId}?uploadType=multipart&supportsAllDrives=true`
    : `${DRIVE_UPLOAD}?uploadType=multipart&supportsAllDrives=true`;

  const response = await driveFetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: toArrayBuffer(body),
  });
  const json = (await response.json()) as { id?: string };
  onProgress?.(100);
  if (!response.ok || !json.id) {
    throw new ApiError('Google Drive document upload failed', 0);
  }

  return {
    fileId: json.id,
    size: picked.bytes.length,
    mimeType: picked.mimeType,
    fileName: picked.name,
  };
}

export async function downloadDriveFile(
  fileUrl: string,
): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  assertDriveConfigured();
  const fileId = fileUrl.includes('/')
    ? await findFileIdByStorageKey(fileUrl)
    : fileUrl;
  if (!fileId) {
    throw new ApiError('Stored document was not found', 404);
  }

  const response = await driveFetch(
    `${DRIVE_FILES}/${fileId}?alt=media&supportsAllDrives=true`,
  );
  if (!response.ok) {
    throw new ApiError('Stored document was not found', 404);
  }

  return {
    bytes: await response.arrayBuffer(),
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
  };
}

export async function deleteDriveFile(fileUrl: string): Promise<void> {
  if (!isDriveConfigured() || !fileUrl) {
    return;
  }
  const fileId = fileUrl.includes('/')
    ? await findFileIdByStorageKey(fileUrl)
    : fileUrl;
  if (!fileId) {
    return;
  }
  const response = await driveFetch(`${DRIVE_FILES}/${fileId}?supportsAllDrives=true`, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 404) {
    throw new ApiError('Google Drive document delete failed', 0);
  }
}
