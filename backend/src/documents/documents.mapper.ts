import { Document, DocumentType, Employee } from '@prisma/client';
import { toDateOnly } from '../attendance/working-hours';
import { calculateExpiryStatus, DocumentExpiryStatus } from './document-expiry';
import { maskDocumentNumber } from './document-mask';
import {
  DocumentDetail,
  DocumentEmployeeSummary,
  DocumentListItem,
} from './documents.types';

const LEGACY_TYPE_MAP: Partial<Record<DocumentType, DocumentType>> = {
  PASSPORT_SCAN: DocumentType.PASSPORT,
  VISA_SCAN: DocumentType.VISA,
  NATIONAL_ID: DocumentType.EMIRATES_ID,
  CONTRACT: DocumentType.LABOUR_CONTRACT,
};

type DocumentWithEmployee = Document & {
  employee: Pick<Employee, 'id' | 'employeeCode' | 'firstName' | 'lastName'>;
};

export function toPublicDocumentType(type: DocumentType): DocumentType {
  return LEGACY_TYPE_MAP[type] ?? type;
}

export function toEmployeeSummary(
  employee: Pick<Employee, 'id' | 'employeeCode' | 'firstName' | 'lastName'>,
): DocumentEmployeeSummary {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    fullName: `${employee.firstName} ${employee.lastName}`.trim(),
  };
}

export function toDocumentListItem(
  record: DocumentWithEmployee,
  today: Date,
  warningDays: number,
): DocumentListItem {
  const documentType = toPublicDocumentType(record.documentType);
  const expiryStatus: DocumentExpiryStatus = calculateExpiryStatus(
    record.expiryDate,
    today,
    warningDays,
  );

  return {
    id: record.id,
    employeeId: record.employeeId,
    employee: toEmployeeSummary(record.employee),
    documentType,
    documentNumberMasked: maskDocumentNumber(
      record.documentNumber,
      documentType,
    ),
    issueDate: record.issueDate ? toDateOnly(record.issueDate) : null,
    expiryDate: record.expiryDate ? toDateOnly(record.expiryDate) : null,
    expiryStatus,
    fileName: record.fileName,
    mimeType: record.mimeType,
    fileSize: record.fileSize,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toDocumentDetail(
  record: DocumentWithEmployee,
  today: Date,
  warningDays: number,
): DocumentDetail {
  return {
    ...toDocumentListItem(record, today, warningDays),
    documentNumber: record.documentNumber,
  };
}
