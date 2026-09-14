import { DocumentExpiryStatus, DocumentType } from './types';

export function labelOf(value: string): string {
  return value.replaceAll('_', ' ');
}

export function statusColor(status: DocumentExpiryStatus): string {
  switch (status) {
    case 'EXPIRED':
      return '#991b1b';
    case 'EXPIRING_SOON':
      return '#92400e';
    case 'VALID':
      return '#166534';
    default:
      return '#374151';
  }
}

export function statusLabel(status: DocumentExpiryStatus): string {
  switch (status) {
    case 'EXPIRING_SOON':
      return 'Expiring soon';
    case 'NO_EXPIRY':
      return 'No expiry';
    default:
      return labelOf(status);
  }
}

export const documentTypeFilters: Array<DocumentType | undefined> = [
  undefined,
  'PASSPORT',
  'VISA',
  'EMIRATES_ID',
  'WORK_PERMIT',
  'LABOUR_CONTRACT',
  'INSURANCE',
  'OTHER',
];

export function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
