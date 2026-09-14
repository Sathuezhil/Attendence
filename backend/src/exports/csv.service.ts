import { Injectable } from '@nestjs/common';
import { ReportExportDocument } from './export.types';

const BOM = '\uFEFF';

export function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

@Injectable()
export class CsvService {
  build(document: ReportExportDocument): Buffer {
    const lines: string[] = [
      this.row(['Report', document.title]),
      this.row(['Generated', document.generatedAt]),
      this.row([
        'Filters',
        document.filters.length === 0
          ? 'None'
          : document.filters
              .map((filter) => `${filter.label}: ${filter.value}`)
              .join('; '),
      ]),
      '',
      'Summary',
      ...document.summary.map((item) => this.row([item.label, item.value])),
      '',
    ];

    if (document.table.truncated) {
      lines.push(
        this.row([
          'Note',
          `Showing first ${document.table.includedRows} of ${document.table.totalMatches} matching records.`,
        ]),
        '',
      );
    }

    lines.push(this.row(document.table.columns.map((column) => column.header)));

    if (document.table.rows.length === 0) {
      lines.push(this.row(['No records match the selected filters.']));
    } else {
      for (const row of document.table.rows) {
        lines.push(
          this.row(
            document.table.columns.map((column) => row[column.key] ?? ''),
          ),
        );
      }
    }

    return Buffer.from(BOM + lines.join('\r\n'), 'utf8');
  }

  private row(values: string[]): string {
    return values.map((value) => escapeCsvField(value)).join(',');
  }
}
