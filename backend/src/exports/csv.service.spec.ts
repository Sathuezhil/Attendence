import { escapeCsvField, CsvService } from './csv.service';
import { ReportExportDocument } from './export.types';

const emptyDocument: ReportExportDocument = {
  title: 'Employee Report',
  fileStem: 'employee-report',
  generatedAt: '2026-09-14T08:00:00Z',
  filters: [{ label: 'Department', value: 'HR' }],
  summary: [{ label: 'Total employees', value: '0' }],
  table: {
    columns: [{ key: 'name', header: 'Name' }],
    rows: [],
    truncated: false,
    totalMatches: 0,
    includedRows: 0,
  },
};

describe('CsvService', () => {
  const service = new CsvService();

  it('escapes quotes, commas and newlines', () => {
    expect(escapeCsvField('He said "Hi"')).toBe('"He said ""Hi"""');
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('line\nbreak')).toBe('"line\nbreak"');
  });

  it('builds a UTF-8 CSV with headers and an empty-data message', () => {
    const csv = service.build(emptyDocument).toString('utf8');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Employee Report');
    expect(csv).toContain('Department: HR');
    expect(csv).toContain('Total employees,0');
    expect(csv).toContain('Name');
    expect(csv).toContain('No records match the selected filters.');
  });

  it('includes data rows when present', () => {
    const csv = service
      .build({
        ...emptyDocument,
        table: {
          columns: [
            { key: 'code', header: 'Employee code' },
            { key: 'name', header: 'Name' },
          ],
          rows: [{ code: 'E-1', name: 'Ada, Lovelace' }],
          truncated: false,
          totalMatches: 1,
          includedRows: 1,
        },
      })
      .toString('utf8');
    expect(csv).toContain('E-1');
    expect(csv).toContain('"Ada, Lovelace"');
  });
});
