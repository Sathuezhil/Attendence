import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { ApiError } from '@/lib/api';
import { getDb, requireUser } from '@/lib/firebase';

export type DocRecord = Record<string, unknown> & { id: string };

function isTimestamp(value: unknown): value is { toDate: () => Date } {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  );
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function asStringOrNull(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
  return String(value);
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  if (value && typeof value === 'object' && 'toNumber' in value) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function asNumberOrNull(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }
  const parsed = asNumber(value, Number.NaN);
  return Number.isNaN(parsed) ? null : parsed;
}

export function asIso(value: unknown, fallback?: string): string {
  if (!value) {
    return fallback ?? new Date().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (isTimestamp(value)) {
    return value.toDate().toISOString();
  }
  return fallback ?? new Date().toISOString();
}

export function asIsoOrNull(value: unknown): string | null {
  if (value == null || value === '') {
    return null;
  }
  return asIso(value);
}

export function asDateOnly(value: unknown): string | null {
  const iso = asIsoOrNull(value);
  return iso ? iso.slice(0, 10) : null;
}

export function asDateOnlyRequired(value: unknown, fallback?: string): string {
  return asDateOnly(value) ?? fallback ?? new Date().toISOString().slice(0, 10);
}

export function emptyToNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function includesInsensitive(haystack: unknown, needle: string): boolean {
  if (!needle) {
    return true;
  }
  if (typeof haystack !== 'string') {
    return false;
  }
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export function paginate<T>(
  rows: T[],
  page = 1,
  limit = 20,
): { data: T[]; page: number; limit: number; total: number; totalPages: number } {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const total = rows.length;
  const start = (safePage - 1) * safeLimit;
  return {
    data: rows.slice(start, start + safeLimit),
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: Math.ceil(total / safeLimit) || 0,
  };
}

export function fullName(firstName: unknown, lastName: unknown): string {
  return `${asString(firstName)} ${asString(lastName)}`.trim();
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysInclusive(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return 0;
  }
  return Math.round((end - start) / 86_400_000) + 1;
}

export async function listCollection(name: string): Promise<DocRecord[]> {
  requireUser();
  const snap = await getDocs(collection(getDb(), name));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getById(name: string, id: string): Promise<DocRecord> {
  requireUser();
  const snap = await getDoc(doc(getDb(), name, id));
  if (!snap.exists()) {
    throw new ApiError('Not found', 404);
  }
  return { id: snap.id, ...snap.data() };
}

export async function createRecord(
  name: string,
  data: Record<string, unknown>,
): Promise<DocRecord> {
  requireUser();
  const payload = {
    ...stripUndefined(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(getDb(), name), payload);
  return getById(name, ref.id);
}

export async function setRecord(
  name: string,
  id: string,
  data: Record<string, unknown>,
  merge = true,
): Promise<DocRecord> {
  requireUser();
  await setDoc(
    doc(getDb(), name, id),
    {
      ...stripUndefined(data),
      updatedAt: serverTimestamp(),
    },
    { merge },
  );
  return getById(name, id);
}

export async function updateRecord(
  name: string,
  id: string,
  data: Record<string, unknown>,
): Promise<DocRecord> {
  requireUser();
  await updateDoc(doc(getDb(), name, id), {
    ...stripUndefined(data),
    updatedAt: serverTimestamp(),
  });
  return getById(name, id);
}

export async function removeRecord(name: string, id: string): Promise<void> {
  requireUser();
  await deleteDoc(doc(getDb(), name, id));
}

export function stripUndefined(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      output[key] = value;
    }
  }
  return output;
}

export async function writeAudit(action: string, entityType: string, entityId?: string): Promise<void> {
  try {
    const actor = requireUser();
    await addDoc(collection(getDb(), 'audit_logs'), {
      action,
      entityType,
      entityId: entityId ?? null,
      actorId: actor.uid,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Audit failures should not block the main action.
  }
}
