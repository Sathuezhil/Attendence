import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { ExportDataService } from './export-data.service';
import { ExportFormatModule } from './export-format.module';
import { ExportService } from './export.service';
import { ExportsController } from './exports.controller';

@Module({
  imports: [ReportsModule, ExportFormatModule],
  controllers: [ExportsController],
  providers: [ExportService, ExportDataService],
})
export class ExportsModule {}
