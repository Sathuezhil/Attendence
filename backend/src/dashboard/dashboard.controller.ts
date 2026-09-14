import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { ExpiryAlertsResponse } from '../notifications/notifications.types';
import { RecentActivityResponseDto } from './dto/recent-activity.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(): Promise<DashboardSummaryDto> {
    return this.dashboardService.getSummary();
  }

  @Get('expiry-alerts')
  getExpiryAlerts(): Promise<ExpiryAlertsResponse> {
    return this.dashboardService.getExpiryAlerts();
  }

  @Get('recent-activity')
  getRecentActivity(): Promise<RecentActivityResponseDto> {
    return this.dashboardService.getRecentActivity();
  }
}
