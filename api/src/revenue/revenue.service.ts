import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Revenue } from '@prisma/client';
import { addDays, formatDateOnly, parseDateOnly, todayInTimeZone } from '../common/date.util';
import { changePct, round2, toNum } from '../common/number.util';
import { PrismaService } from '../prisma/prisma.service';

export interface RevenueDay {
  date: string;
  hasData: boolean;
  posRevenue: number;
  eatclubRevenue: number;
  directRevenue: number;
  totalRevenue: number;
  labourCost: number;
  covers: number;
  positiveEvent: string | null;
  negativeEvent: string | null;
}

/** Row -> API shape. `row` undefined = no data stored for that day (all zeros, hasData=false). */
export function toRevenueDay(date: string, row?: Revenue | null): RevenueDay {
  const pos = toNum(row?.posRevenue);
  const eat = toNum(row?.eatclubRevenue);
  return {
    date,
    hasData: !!row,
    posRevenue: pos,
    eatclubRevenue: eat,
    directRevenue: toNum(row?.directRevenue),
    totalRevenue: round2(pos + eat),
    labourCost: toNum(row?.labourCost),
    covers: row?.covers ?? 0,
    positiveEvent: row?.positiveEvent ?? null,
    negativeEvent: row?.negativeEvent ?? null,
  };
}

const COMPARED = ['posRevenue', 'eatclubRevenue', 'directRevenue', 'totalRevenue', 'labourCost', 'covers'] as const;

@Injectable()
export class RevenueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  get timeZone(): string {
    return this.config.get<string>('APP_TIMEZONE') ?? 'UTC';
  }

  async list(from?: string, to?: string): Promise<RevenueDay[]> {
    const where: Prisma.RevenueWhereInput = {};
    if (from || to) {
      where.date = {
        ...(from ? { gte: parseDateOnly(from, 'from') } : {}),
        ...(to ? { lte: parseDateOnly(to, 'to') } : {}),
      };
    }
    const rows = await this.prisma.revenue.findMany({ where, orderBy: { date: 'asc' } });
    return rows.map((r) => toRevenueDay(formatDateOnly(r.date), r));
  }

  /**
   * Compares two days. Default: `date` = today and `compareTo` = the next day.
   * difference = compareTo - date, changePct = difference relative to `date` (null when `date` is 0).
   */
  async compare(dateStr?: string, compareToStr?: string) {
    const base = dateStr ? parseDateOnly(dateStr, 'date') : todayInTimeZone(this.timeZone);
    const target = compareToStr ? parseDateOnly(compareToStr, 'compareTo') : addDays(base, 1);

    const rows = await this.prisma.revenue.findMany({ where: { date: { in: [base, target] } } });
    const byDate = new Map(rows.map((r) => [formatDateOnly(r.date), r]));

    const b = toRevenueDay(formatDateOnly(base), byDate.get(formatDateOnly(base)));
    const t = toRevenueDay(formatDateOnly(target), byDate.get(formatDateOnly(target)));

    const difference = Object.fromEntries(
      COMPARED.map((k) => [k, { value: round2(t[k] - b[k]), changePct: changePct(t[k], b[k]) }]),
    );
    return { base: b, target: t, difference };
  }
}
