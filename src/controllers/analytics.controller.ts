import { Controller, Get, Param, Query } from '@nestjs/common';
import { AnalyticsService } from '../services/analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('account/:accountId')
  async getAccountAnalytics(
    @Param('accountId') accountId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getAccountAnalytics(accountId, start, end);
  }

  @Get('account/:accountId/period/:period')
  async getAnalyticsByPeriod(
    @Param('accountId') accountId: string,
    @Param('period') period: 'day' | 'week' | 'month',
  ) {
    return this.analyticsService.getAnalyticsByPeriod(accountId, period);
  }

  @Get('queue-stats')
  async getQueueStats(@Query('accountId') accountId?: string) {
    return this.analyticsService.getQueueStats(accountId);
  }

  @Get('account/:accountId/top-templates')
  async getTopTemplates(
    @Param('accountId') accountId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.analyticsService.getTopTemplates(accountId, limitNum);
  }
}
