import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import { ReportExportDocument } from './export.types';

@Injectable()
export class ExcelService {
  private readonly logger = new Logger(ExcelService.name);

  async build(document: ReportExportDocument): Promise<Buffer> {
    try {
      const Excel =
        (ExcelJS as unknown as { default?: typeof ExcelJS }).default ?? ExcelJS;
      const workbook = new Excel.Workbook();
      workbook.created = new Date(document.generatedAt);
      workbook.modified = workbook.created;

      const sheet = workbook.addWorksheet('Report');
      let rowNumber = 1;

      const title = sheet.getRow(rowNumber);
      title.getCell(1).value = document.title;
      title.getCell(1).font = {
        bold: true,
        size: 16,
        color: { argb: 'FF111827' },
      };
      rowNumber += 1;

      sheet.getRow(rowNumber).getCell(1).value =
        `Generated ${document.generatedAt}`;
      rowNumber += 2;

      sheet.getRow(rowNumber).getCell(1).value = 'Filters';
      sheet.getRow(rowNumber).getCell(1).font = { bold: true };
      rowNumber += 1;

      if (document.filters.length === 0) {
        sheet.getRow(rowNumber).getCell(1).value = 'None';
        rowNumber += 1;
      } else {
        for (const filter of document.filters) {
          const row = sheet.getRow(rowNumber);
          row.getCell(1).value = filter.label;
          row.getCell(2).value = filter.value;
          rowNumber += 1;
        }
      }

      rowNumber += 1;
      sheet.getRow(rowNumber).getCell(1).value = 'Summary';
      sheet.getRow(rowNumber).getCell(1).font = { bold: true };
      rowNumber += 1;

      for (const item of document.summary) {
        const row = sheet.getRow(rowNumber);
        row.getCell(1).value = item.label;
        row.getCell(2).value = item.value;
        rowNumber += 1;
      }

      if (document.table.truncated) {
        rowNumber += 1;
        sheet.getRow(rowNumber).getCell(1).value =
          `Showing first ${document.table.includedRows} of ${document.table.totalMatches} matching records.`;
        rowNumber += 1;
      }

      rowNumber += 1;
      const header = sheet.getRow(rowNumber);
      document.table.columns.forEach((column, index) => {
        const cell = header.getCell(index + 1);
        cell.value = column.header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF111827' },
        };
        sheet.getColumn(index + 1).width = Math.max(
          column.header.length + 4,
          16,
        );
      });
      rowNumber += 1;

      if (document.table.rows.length === 0) {
        sheet.getRow(rowNumber).getCell(1).value =
          'No records match the selected filters.';
      } else {
        for (const item of document.table.rows) {
          const row = sheet.getRow(rowNumber);
          document.table.columns.forEach((column, index) => {
            row.getCell(index + 1).value = item[column.key] ?? '';
          });
          rowNumber += 1;
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch {
      this.logger.error('Excel generation failed');
      throw new InternalServerErrorException('Unable to generate Excel file');
    }
  }
}
