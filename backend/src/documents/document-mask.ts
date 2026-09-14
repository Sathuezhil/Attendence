const SENSITIVE_TYPES = new Set([
  'PASSPORT',
  'VISA',
  'EMIRATES_ID',
  'WORK_PERMIT',
  'NATIONAL_ID',
  'PASSPORT_SCAN',
  'VISA_SCAN',
]);

export function maskDocumentNumber(
  value: string | null | undefined,
  documentType: string,
): string | null {
  if (!value) {
    return null;
  }

  if (!SENSITIVE_TYPES.has(documentType)) {
    return value;
  }

  const compact = value.replaceAll(/\s+/g, '');
  if (compact.length <= 4) {
    return '****';
  }

  if (/^\d{3}-.+$/.test(compact)) {
    const last4 = compact.slice(-4);
    return `${compact.slice(0, 3)}-XXXX-XXXX-${last4}`;
  }

  return `${compact.slice(0, 2)}${'*'.repeat(Math.max(4, compact.length - 6))}${compact.slice(-4)}`;
}
