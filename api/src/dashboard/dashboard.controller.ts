import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ChartExportService } from './chart-export.service';
import { DashboardQueryDto } from './dashboard.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard (called by the frontend controls)')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly service: DashboardService,
    private readonly exporter: ChartExportService,
  ) {}

  @Get('revenue-trend')
  @ApiOperation({
    summary: 'Revenue Trend widget data. Every control of the widget is a query parameter',
    description:
      '`series` = POS / Eatclub / Labour checkboxes, `compare` = "Compare to Previous" button, `weekStart` = week navigation.',
  })
  revenueTrend(@Query() q: DashboardQueryDto) {
    return this.service.revenueTrend(q);
  }

  @Get('revenue-trend/export')
  @ApiProduces('image/png')
  @ApiOperation({
    summary: '"Export PNG" button: the same chart rendered as a PNG (same query parameters as revenue-trend)',
  })
  async exportPng(@Query() q: DashboardQueryDto, @Res() res: Response) {
    const trend = await this.service.revenueTrend(q);
    res
      .status(200)
      .set({
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="revenue-trend-${trend.period.start}.png"`,
        'Cache-Control': 'no-store',
      })
      .send(this.exporter.renderPng(trend));
  }
}
