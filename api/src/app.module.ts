import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DashboardModule } from './dashboard/dashboard.module';
import { PrismaModule } from './prisma/prisma.module';
import { RevenueModule } from './revenue/revenue.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, RevenueModule, DashboardModule],
})
export class AppModule {}
