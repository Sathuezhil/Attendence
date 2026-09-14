import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
export const scriptsRoot = path.resolve(scriptsDir, '..');

export function loadEnvFiles() {
  for (const file of ['.env.production', '.env']) {
    const full = path.join(scriptsRoot, file);
    if (!existsSync(full)) {
      continue;
    }
    for (const line of readFileSync(full, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        continue;
      }
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const value = trimmed
        .slice(index + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

export function sanitizeErrorMessage(error) {
  let message = error instanceof Error ? error.message : String(error);
  const secrets = [
    process.env.FIREBASE_PRIVATE_KEY,
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
    process.env.GOOGLE_DRIVE_CLIENT_ID,
  ].filter(Boolean);

  for (const secret of secrets) {
    message = message.split(secret).join('[redacted]');
  }

  return message.slice(0, 500);
}

export function firstNonEmpty(...values) {
  for (const value of values) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
}

export function resolveGoogleDriveEnv() {
  return {
    clientId: firstNonEmpty(process.env.GOOGLE_DRIVE_CLIENT_ID),
    clientSecret: firstNonEmpty(process.env.GOOGLE_DRIVE_CLIENT_SECRET),
    refreshToken: firstNonEmpty(process.env.GOOGLE_DRIVE_REFRESH_TOKEN),
    folderId: firstNonEmpty(process.env.GOOGLE_DRIVE_FOLDER_ID),
  };
}

export function isGoogleDriveConfigured(env = resolveGoogleDriveEnv()) {
  return Boolean(
    env.clientId && env.clientSecret && env.refreshToken && env.folderId,
  );
}
