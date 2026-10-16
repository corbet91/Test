import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Revenue } from '@prisma/client';
import { addDays, formatDateOnly, parseDateOnly, startOfIsoWeek, todayInTimeZone, WEEKDAY_LABELS } from '../common/date.util';
import { changePct, round2 } from '../common/number.util';
import { PrismaService } from '../prisma/prisma.service';
import { RevenueDay, toRevenueDay } from '../revenue/revenue.service';
import { DashboardQueryDto } from './dashboard.dto';
import { Kpi, SERIES, SeriesKey, TrendPoint, TrendResponse } from './dashboard.types';

const kpi = (value: number, previous: number | null): Kpi => ({
  value: round2(value),
  previous: previous === null ? null : round2(previous),
  changePct: previous === null ? null : changePct(value, previous),
});

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async week(start: Date): Promise<RevenueDay[]> {
    const rows = await this.prisma.revenue.findMany({ where: { date: { gte: start, lte: addDays(start, 6) } } });
    const byDate = new Map<string, Revenue>(rows.map((r) => [formatDateOnly(r.date), r]));
    return WEEKDAY_LABELS.map((_, i) => {
      const date = formatDateOnly(addDays(start, i));
      return toRevenueDay(date, byDate.get(date));
    });
  }

  /** Applies the checkboxes: a hidden series becomes null and is not counted in the total. */
  private mask(label: string, d: RevenueDay, show: Set<SeriesKey>): TrendPoint {
    const pos = show.has('pos') ? d.posRevenue : null;
    const eat = show.has('eatclub') ? d.eatclubRevenue : null;
    return {
      label,
      date: d.date,
      hasData: d.hasData,
      posRevenue: pos,
      eatclubRevenue: eat,
      directRevenue: show.has('pos') ? d.directRevenue : null, // direct revenue belongs to the POS checkbox
      totalRevenue: round2((pos ?? 0) + (eat ?? 0)),
      labourCost: show.has('labour') ? d.labourCost : null,
      covers: d.covers,
      positiveEvent: d.positiveEvent,
      negativeEvent: d.negativeEvent,
    };
  }

  private sum(points: TrendPoint[]) {
    return points.reduce((a, p) => ({ revenue: a.revenue + p.totalRevenue, covers: a.covers + p.covers }), { revenue: 0, covers: 0 });
  }

  /**
   * Everything the "Revenue Trend" widget needs for one combination of its controls:
   *   weekStart  -> the week arrows / "This week"
   *   compare    -> "Compare to Previous" button
   *   series     -> the POS / Eatclub / Labour checkboxes
   */
  async revenueTrend(q: DashboardQueryDto): Promise<TrendResponse> {
    const tz = this.config.get<string>('APP_TIMEZONE') ?? 'UTC';
    const today = todayInTimeZone(tz);
    const start = startOfIsoWeek(q.weekStart ? parseDateOnly(q.weekStart, 'weekStart') : today);
    const prevStart = addDays(start, -7);
    const compare = q.compare === true;
    const series = q.series ? SERIES.filter((s) => q.series!.includes(s)) : [...SERIES];
    const show = new Set<SeriesKey>(series);

    const [curRaw, prevRaw] = await Promise.all([this.week(start), compare ? this.week(prevStart) : Promise.resolve(null)]);
    const current = curRaw.map((d, i) => this.mask(WEEKDAY_LABELS[i], d, show));
    const previous = prevRaw ? prevRaw.map((d, i) => this.mask(WEEKDAY_LABELS[i], d, show)) : null;

    const days = current.map((d, i) => ({ ...d, ...(previous ? { previous: previous[i] } : {}) }));
    const cur = this.sum(current);
    const prev = previous ? this.sum(previous) : null;

    return {
      currency: this.config.get<string>('CURRENCY') ?? 'USD',
      period: { start: formatDateOnly(start), end: formatDateOnly(addDays(start, 6)) },
      isCurrentWeek: formatDateOnly(start) === formatDateOnly(startOfIsoWeek(today)),
      compare,
      previousPeriod: compare ? { start: formatDateOnly(prevStart), end: formatDateOnly(addDays(prevStart, 6)) } : null,
      series,
      summary: {
        totalRevenue: kpi(cur.revenue, prev ? prev.revenue : null),
        averagePerDay: kpi(cur.revenue / 7, prev ? prev.revenue / 7 : null),
        totalCovers: kpi(cur.covers, prev ? prev.covers : null),
      },
      days,
      generatedAt: new Date().toISOString(),
    };
  }
}
