import { maskDocumentNumber } from './document-mask';

describe('document mask', () => {
  it('masks an Emirates ID style number', () => {
    expect(maskDocumentNumber('784-1234-5678901-1234', 'EMIRATES_ID')).toBe(
      '784-XXXX-XXXX-1234',
    );
  });

  it('does not mask an OTHER document number', () => {
    expect(maskDocumentNumber('CONTRACT-22', 'OTHER')).toBe('CONTRACT-22');
  });
});
