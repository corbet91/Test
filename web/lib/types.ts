export type SeriesKey = 'pos' | 'eatclub' | 'labour';
export const ALL_SERIES: SeriesKey[] = ['pos', 'eatclub', 'labour'];

export interface Kpi {
  value: number;
  previous: number | null;
  changePct: number | null;
}

/** A series whose checkbox is off comes back as null. */
export interface TrendPoint {
  label: string;
  date: string;
  hasData: boolean;
  posRevenue: number | null;
  eatclubRevenue: number | null;
  directRevenue: number | null;
  totalRevenue: number;
  labourCost: number | null;
  covers: number;
  positiveEvent: string | null;
  negativeEvent: string | null;
}

export interface TrendDay extends TrendPoint {
  previous?: TrendPoint;
}

/** GET /dashboard/revenue-trend */
export interface RevenueTrend {
  currency: string;
  period: { start: string; end: string };
  isCurrentWeek: boolean;
  compare: boolean;
  previousPeriod: { start: string; end: string } | null;
  series: SeriesKey[];
  summary: { totalRevenue: Kpi; averagePerDay: Kpi; totalCovers: Kpi };
  days: TrendDay[];
  generatedAt: string;
}

export interface DaySnapshot {
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

export interface Delta {
  value: number;
  changePct: number | null;
}

/** GET /revenue/compare */
export interface DayCompare {
  base: DaySnapshot;
  target: DaySnapshot;
  difference: Record<'posRevenue' | 'eatclubRevenue' | 'directRevenue' | 'totalRevenue' | 'labourCost' | 'covers', Delta>;
}
