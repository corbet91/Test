'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { trendQuery, useRevenueTrend } from '@/hooks/use-dashboard';
import { apiBlob } from '@/lib/api';
import { addDaysISO, formatRange } from '@/lib/dates';
import { ALL_SERIES, type SeriesKey } from '@/lib/types';
import { DayCompareCard } from './day-compare-card';
import { RevenueTrendCard } from './revenue-trend-card';

/**
 * Holds the state of the widget's controls. Each control is part of the SWR key, so changing it
 * calls GET /dashboard/revenue-trend again with that parameter:
 *   week arrows / This week -> weekStart      Compare to Previous -> compare      checkboxes -> series
 * "Export PNG" calls GET /dashboard/revenue-trend/export with the same three parameters.
 */
export function DashboardView() {
  const [weekStart, setWeekStart] = useState<string>(); // undefined = current week
  const [compare, setCompare] = useState(false);
  const [series, setSeries] = useState<SeriesKey[]>(ALL_SERIES);
  const [exporting, setExporting] = useState(false);

  const { data, error, isLoading } = useRevenueTrend(weekStart, compare, series);
  const period = data?.period;

  // the response on screen is older than the controls: a new request is in flight
  const updating =
    !!data &&
    (data.compare !== compare ||
      data.series.join() !== series.join() ||
      (weekStart !== undefined ? weekStart !== data.period.start : !data.isCurrentWeek));

  const go = (delta: number) => period && setWeekStart(addDaysISO(period.start, delta * 7));

  async function exportPng() {
    setExporting(true);
    try {
      const blob = await apiBlob(`dashboard/revenue-trend/export?${trendQuery(weekStart, compare, series)}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-trend-${period?.start ?? 'week'}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-6">

      <RevenueTrendCard
        data={data}
        loading={isLoading}
        updating={updating}
        error={error?.message}
        compare={compare}
        onCompareChange={setCompare}
        series={series}
        onSeriesChange={setSeries}
        onExport={exportPng}
        exporting={exporting}
      />
    </main>
  );
}
