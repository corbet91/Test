'use client';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import type { DayCompare, RevenueTrend, SeriesKey } from '@/lib/types';

/** Re-reads the API every 10 s and when the tab regains focus, so new data shows up without a reload. */
const LIVE = { refreshInterval: 10_000, revalidateOnFocus: true, keepPreviousData: true } as const;

/**
 * Query string for the revenue-trend API. Every control of the widget maps to one parameter:
 *   week arrows / "This week"  -> weekStart
 *   "Compare to Previous"      -> compare
 *   POS / Eatclub / Labour     -> series
 * The same string is used by the "Export PNG" endpoint, so the image matches what is on screen.
 */
export function trendQuery(weekStart: string | undefined, compare: boolean, series: SeriesKey[]) {
  const p = new URLSearchParams();
  if (weekStart) p.set('weekStart', weekStart);
  p.set('compare', String(compare));
  p.set('series', series.join(',')); // empty string = every checkbox off
  return p.toString();
}

export function useRevenueTrend(weekStart: string | undefined, compare: boolean, series: SeriesKey[]) {
  return useSWR<RevenueTrend>(`dashboard/revenue-trend?${trendQuery(weekStart, compare, series)}`, fetcher, LIVE);
}

/** date undefined = today (the API default); the API compares it with the next day. */
export function useDayCompare(date: string | undefined) {
  return useSWR<DayCompare>(`revenue/compare${date ? `?date=${date}` : ''}`, fetcher, LIVE);
}
