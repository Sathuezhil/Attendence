import { ExcelService } from './excel.service';
import { ReportExportDocument } from './export.types';

describe('ExcelService', () => {
  const service = new ExcelService();

  it('creates an xlsx workbook for an empty report', async () => {
    const document: ReportExportDocument = {
      title: 'Attendance Report',
      fileStem: 'attendance-report',
      generatedAt: '2026-09-14T08:00:00Z',
      filters: [{ label: 'Status', value: 'LATE' }],
      summary: [{ label: 'Present', value: '0' }],
      table: {
        columns: [{ key: 'date', header: 'Date' }],
        rows: [],
        truncated: false,
        totalMatches: 0,
        includedRows: 0,
      },
    };

    const buffer = await service.build(document);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    expect(buffer.length).toBeGreaterThan(100);
  });
});
