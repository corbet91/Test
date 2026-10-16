export const SERIES = ['pos', 'eatclub', 'labour'] as const;
export type SeriesKey = (typeof SERIES)[number];

export interface Kpi {
  value: number;
  previous: number | null;
  changePct: number | null;
}

/** A series that is switched off (checkbox unticked) comes back as null. */
export interface TrendPoint {
  label: string;
  date: string;
  hasData: boolean;
  posRevenue: number | null;
  eatclubRevenue: number | null;
  directRevenue: number | null;
  /** pos + eatclub, counting only the visible series */
  totalRevenue: number;
  labourCost: number | null;
  covers: number;
  positiveEvent: string | null;
  negativeEvent: string | null;
}

export interface TrendDay extends TrendPoint {
  /** the same weekday one week earlier; only present when compare=true */
  previous?: TrendPoint;
}

export interface TrendResponse {
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
