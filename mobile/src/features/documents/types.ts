export const DOCUMENT_TYPES = [
  'PASSPORT',
  'VISA',
  'EMIRATES_ID',
  'WORK_PERMIT',
  'LABOUR_CONTRACT',
  'INSURANCE',
  'OTHER',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type DocumentExpiryStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY';

export interface DocumentEmployeeSummary {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

export interface DocumentListItem {
  id: string;
  employeeId: string;
  employee: DocumentEmployeeSummary;
  documentType: DocumentType;
  documentNumberMasked: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  expiryStatus: DocumentExpiryStatus;
  fileName: string;
  mimeType: string;
  fileSize: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDetail extends DocumentListItem {
  documentNumber: string | null;
}

export interface PaginatedDocuments {
  data: DocumentListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DocumentWritePayload {
  documentType: DocumentType;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
}

export interface PickedDocument {
  uri: string;
  name: string;
  mimeType: string | null;
  size?: number;
  file?: File;
}
