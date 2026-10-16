import { Module } from '@nestjs/common';
import { ChartExportService } from './chart-export.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({ controllers: [DashboardController], providers: [DashboardService, ChartExportService] })
export class DashboardModule {}
