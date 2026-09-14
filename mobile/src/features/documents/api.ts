import { apiRequest, apiRequestBinary, apiUpload } from '@/lib/api';
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
}

function toQuery(params: DocumentListParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export function fetchDocuments(params: DocumentListParams = {}): Promise<PaginatedDocuments> {
  return apiRequest<PaginatedDocuments>(`/documents${toQuery(params)}`);
}

export function fetchEmployeeDocuments(employeeId: string): Promise<DocumentListItem[]> {
  return apiRequest<DocumentListItem[]>(`/employees/${employeeId}/documents`);
}

export function fetchDocument(id: string): Promise<DocumentDetail> {
  return apiRequest<DocumentDetail>(`/documents/${id}`);
}

export function updateDocument(id: string, payload: DocumentWritePayload): Promise<DocumentDetail> {
  return apiRequest<DocumentDetail>(`/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteDocument(id: string): Promise<{ success: true }> {
  return apiRequest<{ success: true }>(`/documents/${id}`, {
    method: 'DELETE',
  });
}

export function uploadDocument(
  employeeId: string,
  payload: DocumentWritePayload,
  file: PickedDocument,
  onProgress?: (percent: number) => void,
): Promise<DocumentDetail> {
  const formData = new FormData();
  formData.append('documentType', payload.documentType);
  if (payload.documentNumber) formData.append('documentNumber', payload.documentNumber);
  if (payload.issueDate) formData.append('issueDate', payload.issueDate);
  if (payload.expiryDate) formData.append('expiryDate', payload.expiryDate);
  if (payload.notes) formData.append('notes', payload.notes);

  if (file.file) {
    formData.append('file', file.file, file.name);
  } else {
    formData.append(
      'file',
      {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? 'application/octet-stream',
      } as unknown as Blob,
    );
  }

  return apiUpload<DocumentDetail>(`/employees/${employeeId}/documents`, formData, onProgress);
}

export function fetchDocumentFile(id: string) {
  return apiRequestBinary(`/documents/${id}/file`);
}
