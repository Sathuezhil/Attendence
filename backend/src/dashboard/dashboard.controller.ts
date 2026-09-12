import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { RecentActivityResponseDto } from './dto/recent-activity.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(): Promise<DashboardSummaryDto> {
    return this.dashboardService.getSummary();
  }

  @Get('recent-activity')
  getRecentActivity(): Promise<RecentActivityResponseDto> {
    return this.dashboardService.getRecentActivity();
  }
}
