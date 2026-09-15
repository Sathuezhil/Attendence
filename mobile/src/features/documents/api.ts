import { ApiError } from '@/lib/api';
import {
  asDateOnly,
  asIso,
  asNumber,
  asString,
  asStringOrNull,
  createRecord,
  getById,
  includesInsensitive,
  listCollection,
  listWhere,
  paginate,
  removeRecord,
  updateRecord,
  writeAudit,
} from '@/lib/data';
import {
  calculateExpiryStatus,
  loadSettings,
  maskDocumentNumber,
  toPublicDocumentType,
} from '@/lib/domain';
import { deleteDriveFile, downloadDriveFile, uploadDriveDocument } from '@/lib/drive';
import { fetchEmployee, loadEmployeeMap } from '@/features/employees/api';
import {
  DocumentDetail,
  DocumentListItem,
  DocumentType,
  DocumentWritePayload,
  PaginatedDocuments,
  PickedDocument,
} from './types';

export interface DocumentListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  documentType?: DocumentType;
  expiringWithin?: number;
  expired?: boolean;
  search?: string;
  expiryStatus?: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  expiryFrom?: string;
  expiryTo?: string;
}

function randomKey(employeeId: string, fileName: string): string {
  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
  return `documents/${employeeId}/${Date.now()}${extension}`;
}

function mapDocument(
  row: Record<string, unknown> & { id: string },
  employee: DocumentListItem['employee'],
  warningDays: number,
  includeNumber = false,
): DocumentListItem | DocumentDetail {
  const documentType = toPublicDocumentType(asString(row.documentType, 'OTHER')) as DocumentType;
  const documentNumber = asStringOrNull(row.documentNumber);
  const item: DocumentDetail = {
    id: row.id,
    employeeId: asString(row.employeeId),
    employee,
    documentType,
    documentNumberMasked: maskDocumentNumber(documentNumber, documentType),
    issueDate: asDateOnly(row.issueDate),
    expiryDate: asDateOnly(row.expiryDate),
    expiryStatus: calculateExpiryStatus(asDateOnly(row.expiryDate), warningDays),
    fileName: asString(row.fileName, 'document'),
    mimeType: asString(row.mimeType, 'application/octet-stream'),
    fileSize: asNumber(row.fileSize, 0),
    notes: asStringOrNull(row.notes),
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
    documentNumber: includeNumber ? documentNumber : null,
  };
  if (!includeNumber) {
    const { documentNumber: _ignored, ...listItem } = item;
    return listItem;
  }
  return item;
}

async function warningDays(): Promise<number> {
  try {
    const settings = await loadSettings();
    return settings.documents.expiryWarningDays;
  } catch {
    return 30;
  }
}

function employeeSummary(employee: {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
}): DocumentListItem['employee'] {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    fullName: employee.fullName,
  };
}

export async function fetchDocuments(params: DocumentListParams = {}): Promise<PaginatedDocuments> {
  if (params.employeeId) {
    let rows = await fetchEmployeeDocuments(params.employeeId);
    const search = params.search?.trim() ?? '';
    if (params.documentType) rows = rows.filter((row) => row.documentType === params.documentType);
    if (params.expiryStatus) rows = rows.filter((row) => row.expiryStatus === params.expiryStatus);
    if (params.expired) rows = rows.filter((row) => row.expiryStatus === 'EXPIRED');
    if (params.expiringWithin) {
      rows = rows.filter((row) => row.expiryStatus === 'EXPIRING_SOON' || row.expiryStatus === 'EXPIRED');
    }
    if (params.expiryFrom) rows = rows.filter((row) => (row.expiryDate ?? '') >= params.expiryFrom!);
    if (params.expiryTo) rows = rows.filter((row) => (row.expiryDate ?? '') <= params.expiryTo!);
    if (search) {
      rows = rows.filter(
        (row) =>
          includesInsensitive(row.employee.fullName, search) ||
          includesInsensitive(row.employee.employeeCode, search) ||
          includesInsensitive(row.fileName, search),
      );
    }
    return paginate(rows, params.page, params.limit);
  }

  const employees = await loadEmployeeMap();
  const warning = await warningDays();
  const search = params.search?.trim() ?? '';
  let rows = (await listCollection('documents'))
    .map((row) => {
      const employee = employees.get(asString(row.employeeId));
      if (!employee) {
        return null;
      }
      return mapDocument(row, employeeSummary(employee), warning) as DocumentListItem;
    })
    .filter((row): row is DocumentListItem => row !== null);

  if (params.documentType) rows = rows.filter((row) => row.documentType === params.documentType);
  if (params.expiryStatus) rows = rows.filter((row) => row.expiryStatus === params.expiryStatus);
  if (params.expired) rows = rows.filter((row) => row.expiryStatus === 'EXPIRED');
  if (params.expiringWithin) {
    rows = rows.filter((row) => row.expiryStatus === 'EXPIRING_SOON' || row.expiryStatus === 'EXPIRED');
  }
  if (params.expiryFrom) rows = rows.filter((row) => (row.expiryDate ?? '') >= params.expiryFrom!);
  if (params.expiryTo) rows = rows.filter((row) => (row.expiryDate ?? '') <= params.expiryTo!);
  if (search) {
    rows = rows.filter(
      (row) =>
        includesInsensitive(row.employee.fullName, search) ||
        includesInsensitive(row.employee.employeeCode, search) ||
        includesInsensitive(row.fileName, search),
    );
  }
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return paginate(rows, params.page, params.limit);
}

export async function fetchEmployeeDocuments(employeeId: string): Promise<DocumentListItem[]> {
  const employee = await fetchEmployee(employeeId);
  const warning = await warningDays();
  return (await listWhere('documents', 'employeeId', employeeId))
    .map((row) => mapDocument(row, employeeSummary(employee), warning) as DocumentListItem)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchDocument(id: string): Promise<DocumentDetail> {
  const row = await getById('documents', id);
  const employee = await fetchEmployee(asString(row.employeeId));
  return mapDocument(row, employeeSummary(employee), await warningDays(), true) as DocumentDetail;
}

export async function updateDocument(
  id: string,
  payload: DocumentWritePayload,
): Promise<DocumentDetail> {
  await updateRecord('documents', id, {
    documentType: payload.documentType,
    documentNumber: payload.documentNumber ?? null,
    issueDate: payload.issueDate ?? null,
    expiryDate: payload.expiryDate ?? null,
    notes: payload.notes ?? null,
  });
  await writeAudit('update', 'document', id);
  return fetchDocument(id);
}

export async function deleteDocument(id: string): Promise<{ success: true }> {
  const row = await getById('documents', id);
  await deleteDriveFile(asString(row.fileUrl));
  await removeRecord('documents', id);
  await writeAudit('delete', 'document', id);
  return { success: true };
}

export async function uploadDocument(
  employeeId: string,
  payload: DocumentWritePayload,
  file: PickedDocument,
  onProgress?: (percent: number) => void,
): Promise<DocumentDetail> {
  await fetchEmployee(employeeId);
  const storageKey = randomKey(employeeId, file.name);
  const uploaded = await uploadDriveDocument(employeeId, storageKey, file, onProgress);
  const created = await createRecord('documents', {
    employeeId,
    documentType: payload.documentType,
    documentNumber: payload.documentNumber ?? null,
    issueDate: payload.issueDate ?? null,
    expiryDate: payload.expiryDate ?? null,
    fileName: uploaded.fileName,
    fileUrl: uploaded.fileId,
    storageKey,
    mimeType: uploaded.mimeType,
    fileSize: uploaded.size,
    notes: payload.notes ?? null,
  });
  await writeAudit('upload', 'document', created.id);
  return fetchDocument(created.id);
}

export async function fetchDocumentFile(id: string) {
  const row = await getById('documents', id);
  const file = await downloadDriveFile(asString(row.fileUrl) || asString(row.storageKey));
  return {
    bytes: file.bytes,
    contentType: file.contentType,
    fileName: asString(row.fileName, 'document'),
  };
}
