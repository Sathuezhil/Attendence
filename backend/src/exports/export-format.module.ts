import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { CsvService } from './csv.service';
import { ExcelService } from './excel.service';
import { PdfService } from './pdf.service';

@Module({
  imports: [SettingsModule],
  providers: [PdfService, CsvService, ExcelService],
  exports: [PdfService, CsvService, ExcelService],
})
export class ExportFormatModule {}
