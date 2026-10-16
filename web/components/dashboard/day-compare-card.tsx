'use client';
import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDayCompare } from '@/hooks/use-dashboard';
import { addDaysISO, formatShort } from '@/lib/dates';
import type { DayCompare } from '@/lib/types';
import { cn, formatInt, formatMoney, formatPct } from '@/lib/utils';

type Key = keyof DayCompare['difference'];
const ROWS: { key: Key; label: string; money: boolean; lowerIsBetter?: boolean }[] = [
  { key: 'posRevenue', label: 'POS revenue', money: true },
  { key: 'eatclubRevenue', label: 'Eatclub revenue', money: true },
  { key: 'directRevenue', label: 'Direct revenue', money: true },
  { key: 'totalRevenue', label: 'Total revenue', money: true },
  { key: 'labourCost', label: 'Labour cost', money: true, lowerIsBetter: true },
  { key: 'covers', label: 'Covers', money: false },
];

/** "Today vs next day". Every control (date field, ◀ ▶, Today) calls GET /revenue/compare again with `date`. */
export function DayCompareCard({ currency }: { currency: string }) {
  const [date, setDate] = useState<string>(); // undefined = today (API default)
  const { data, error, isLoading, isValidating } = useDayCompare(date);

  const fmt = (n: number, money: boolean) => (money ? formatMoney(n, currency) : formatInt(n));
  const stale = !!data && date !== undefined && data.base.date !== date;

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-xl font-medium">
          <CalendarDays className="h-5 w-5 text-amber-500" />

          {(stale || (isValidating && !data)) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Previous day" disabled={!data} onClick={() => data && setDate(addDaysISO(data.base.date, -1))}>
            <ChevronLeft />
          </Button>
          <Input type="date" className="w-40" aria-label="Day to compare with the next day" value={data?.base.date ?? ''} onChange={(e) => setDate(e.target.value || undefined)} />
          <Button variant="outline" size="icon" aria-label="Next day" disabled={!data} onClick={() => data && setDate(addDaysISO(data.base.date, 1))}>
            <ChevronRight />
          </Button>
          <Button variant={date === undefined ? 'secondary' : 'outline'} onClick={() => setDate(undefined)}>
            Today
          </Button>
        </div>
      </div>

      {isLoading && !data ? (
        <Skeleton className="mt-6 h-52" />
      ) : error && !data ? (
        <p className="mt-6 text-sm text-destructive">{error.message}</p>
      ) : data ? (
        <div className="mt-6 overflow-x-auto">
          <div className="min-w-[560px] text-sm">
            <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr] gap-3 border-b pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span />
              <span className="text-right">
                {formatShort(data.base.date)} {!data.base.hasData && '(no data)'}
              </span>
              <span className="text-right">
                {formatShort(data.target.date)} {!data.target.hasData && '(no data)'}
              </span>
              <span className="text-right">Difference</span>
              <span className="text-right">%</span>
            </div>
            {ROWS.map((r) => {
              const d = data.difference[r.key];
              const good = r.lowerIsBetter ? d.value <= 0 : d.value >= 0;
              const color = d.value === 0 ? 'text-muted-foreground' : good ? 'text-green-600' : 'text-red-600';
              return (
                <div key={r.key} className={cn('grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr] gap-3 border-b py-2.5 last:border-0', r.key === 'totalRevenue' && 'font-semibold')}>
                  <span>{r.label}</span>
                  <span className="text-right tabular-nums">{fmt(data.base[r.key], r.money)}</span>
                  <span className="text-right tabular-nums">{fmt(data.target[r.key], r.money)}</span>
                  <span className={cn('text-right tabular-nums', color)}>
                    {d.value > 0 ? '+' : ''}
                    {fmt(d.value, r.money)}
                  </span>
                  <span className={cn('text-right tabular-nums', color)}>{formatPct(d.changePct)}</span>
                </div>
              );
            })}
            {[data.base, data.target].some((s) => s.positiveEvent || s.negativeEvent) && (
              <div className="mt-3 space-y-1 text-xs">
                {[data.base, data.target].flatMap((s) => [
                  s.positiveEvent && (
                    <div key={`${s.date}p`} className="text-green-700">
                      ↗ {formatShort(s.date)}: {s.positiveEvent}
                    </div>
                  ),
                  s.negativeEvent && (
                    <div key={`${s.date}n`} className="text-red-700">
                      ↘ {formatShort(s.date)}: {s.negativeEvent}
                    </div>
                  ),
                ])}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
