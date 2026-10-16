'use client';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Download, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRange } from '@/lib/dates';
import type { Kpi, RevenueTrend, SeriesKey } from '@/lib/types';
import { cn, formatInt, formatMoney, formatPct } from '@/lib/utils';

const COLORS = {
  pos: '#2a2a2a',
  eatclub: '#5b5bf0',
  labour: '#ea6528',
  prevDirect: '#bdbdbd',
  prevTotal: '#c9c9f8',
  prevLabour: '#f8cdbb',
  up: '#16a34a',
  down: '#dc2626',
};

interface Row {
  label: string;
  date: string;
  pos: number;
  eatclub: number;
  labour: number;
  total: number;
  covers: number;
  pDirect: number;
  pExtra: number; // previous "Total Revenue" segment stacked on the direct revenue
  pTotal: number;
  pLabour: number;
  positive: string | null;
  negative: string | null;
}

interface Props {
  data?: RevenueTrend;
  loading: boolean;
  /** true while a new API response for the changed controls is on its way */
  updating: boolean;
  error?: string;
  // the controls: each change makes the parent call the API again with that parameter
  compare: boolean;
  onCompareChange: (v: boolean) => void;
  series: SeriesKey[];
  onSeriesChange: (s: SeriesKey[]) => void;
  onExport: () => void;
  exporting: boolean;
}

export function RevenueTrendCard({ data, loading, updating, error, compare, onCompareChange, series, onSeriesChange, onExport, exporting }: Props) {
  const currency = data?.currency ?? 'USD';
  // what is drawn always comes from the API response, not from local guesses
  const show = useMemo(() => new Set<SeriesKey>(data?.series ?? []), [data]);
  const comparing = !!data?.compare;

  const rows: Row[] = useMemo(
    () =>
      (data?.days ?? []).map((d) => {
        const pDirect = d.previous?.directRevenue ?? 0;
        const pTotal = d.previous?.totalRevenue ?? 0;
        return {
          label: d.label,
          date: d.date,
          pos: d.posRevenue ?? 0,
          eatclub: d.eatclubRevenue ?? 0,
          labour: d.labourCost ?? 0,
          total: d.totalRevenue,
          covers: d.covers,
          pDirect,
          pExtra: Math.max(pTotal - pDirect, 0),
          pTotal,
          pLabour: d.previous?.labourCost ?? 0,
          positive: d.positiveEvent,
          negative: d.negativeEvent,
        };
      }),
    [data],
  );

  // y axis: 4 equal steps rounded up to 250 -> 0, 0.75k, 1.5k, 2.25k, 3k like the design
  const { domainMax, ticks } = useMemo(() => {
    let max = 0;
    for (const r of rows) max = Math.max(max, r.total, r.labour, comparing ? r.pTotal : 0, comparing ? r.pLabour : 0);
    const step = Math.max(250, Math.ceil(max / 4 / 250) * 250);
    return { domainMax: step * 4, ticks: [0, step, step * 2, step * 3, step * 4] };
  }, [rows, comparing]);

  const hasAnyData = !!data?.days.some((d) => d.hasData);
  const base = !data || data.isCurrentWeek ? "This Week's Revenue Trend" : `Revenue Trend · ${formatRange(data.period.start, data.period.end)}`;
  const title = comparing ? `${base} vs Previous Period` : base;

  const toggle = (key: SeriesKey) => (checked: boolean | 'indeterminate') =>
    onSeriesChange(checked === true ? (['pos', 'eatclub', 'labour'] as SeriesKey[]).filter((s) => s === key || series.includes(s)) : series.filter((s) => s !== key));

  return (
    <Card className="p-6 sm:p-8">
      {/* header: every control below triggers a new API call */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <h2 className="flex max-w-md items-start gap-2 text-xl font-medium leading-snug">
          {title}
          {updating && <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-label="Updating" />}
        </h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {([
            ['pos', 'POS Revenue', COLORS.pos],
            ['eatclub', 'Eatclub Revenue', COLORS.eatclub],
            ['labour', 'Labour Costs', COLORS.labour],
          ] as const).map(([key, label, color]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={series.includes(key)} onCheckedChange={toggle(key)} aria-label={label} />
              <span className="h-0.5 w-3 rounded" style={{ background: color }} />
              {label}
            </label>
          ))}
          <Button
            onClick={() => onCompareChange(!compare)}
            aria-pressed={compare}
            variant={compare ? 'default' : 'outline'}
            className={cn(!compare && 'bg-secondary hover:bg-accent')}
          >
            <BarChart3 /> Compare to Previous
          </Button>
          <Button variant="secondary" onClick={onExport} disabled={exporting || !data}>
            {exporting ? <Loader2 className="animate-spin" /> : <Download />} Export PNG
          </Button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <KpiTile label="Total Revenue" kpi={data?.summary.totalRevenue} fmt={(n) => formatMoney(n, currency)} comparing={comparing} loading={loading} />
        <KpiTile label="Average per Day" kpi={data?.summary.averagePerDay} fmt={(n) => formatMoney(n, currency)} comparing={comparing} loading={loading} />
        <KpiTile label="Total Covers" kpi={data?.summary.totalCovers} fmt={formatInt} comparing={comparing} loading={loading} />
      </div>

      {/* chart */}
      <div className="relative mt-6 h-[340px] sm:h-[400px]">
        {loading && !data ? (
          <Skeleton className="h-full w-full" />
        ) : error && !data ? (
          <div className="flex h-full items-center justify-center text-sm text-destructive">{error}</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1100, height: 400 }}>
              <BarChart data={rows} margin={{ top: 34, right: 8, left: 0, bottom: 0 }} barCategoryGap="14%" barGap={4}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e4e4e7" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 13 }} />
                <YAxis
                  domain={[0, domainMax]}
                  ticks={ticks}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tick={{ fill: '#52525b', fontSize: 13 }}
                  tickFormatter={(v: number) => (v === 0 ? '0k' : `${+(v / 1000).toFixed(2)}k`)}
                />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={<ChartTooltip currency={currency} comparing={comparing} show={show} />} />

                {show.has('pos') && <Bar dataKey="pos" name="POS Revenue" stackId="cur" fill={COLORS.pos} radius={show.has('eatclub') ? [0, 0, 6, 6] : 6} />}
                {show.has('eatclub') && <Bar dataKey="eatclub" name="Eatclub Revenue" stackId="cur" fill={COLORS.eatclub} radius={show.has('pos') ? [6, 6, 0, 0] : 6} />}
                {show.has('labour') && <Bar dataKey="labour" name="Labour Costs" fill={COLORS.labour} radius={6} />}

                {comparing && show.has('pos') && <Bar dataKey="pDirect" name="Direct Revenue (Previous)" stackId="prev" fill={COLORS.prevDirect} radius={show.has('eatclub') ? [0, 0, 6, 6] : 6} />}
                {comparing && show.has('eatclub') && <Bar dataKey="pExtra" name="Total Revenue (Previous)" stackId="prev" fill={COLORS.prevTotal} radius={show.has('pos') ? [6, 6, 0, 0] : 6} />}
                {comparing && show.has('labour') && <Bar dataKey="pLabour" name="Labour Costs (Previous)" fill={COLORS.prevLabour} radius={6} />}

                {/* positive / negative event markers above the day */}
                {rows.flatMap((r) => {
                  const markers = [r.positive && { impact: 'POSITIVE' as const, title: r.positive }, r.negative && { impact: 'NEGATIVE' as const, title: r.negative }].filter(
                    Boolean,
                  ) as { impact: 'POSITIVE' | 'NEGATIVE'; title: string }[];
                  const top = Math.max(r.total, comparing ? r.pTotal : 0);
                  const y = Math.min(domainMax * 1.04, top + domainMax * 0.09);
                  return markers.map((m, i) => (
                    <ReferenceDot
                      key={`${r.date}-${m.impact}`}
                      x={r.label}
                      y={y}
                      ifOverflow="visible"
                      shape={(p: { cx?: number; cy?: number }) => (
                        <EventMarker cx={(p.cx ?? 0) + (i - (markers.length - 1) / 2) * 34} cy={p.cy ?? 0} impact={m.impact} title={`${r.label}: ${m.title}`} />
                      )}
                    />
                  ));
                })}
              </BarChart>
            </ResponsiveContainer>
            {!hasAnyData && !loading && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">No data for this week</div>
            )}
          </>
        )}
      </div>

      {/* legend (visible series only) */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-foreground/80">
        {legend(show, comparing).map(([label, color]) => (
          <span key={label} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span className="hidden h-5 w-px bg-border sm:block" />
        <span className="flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4" style={{ color: COLORS.up }} /> Positive Event Impact
        </span>
        <span className="flex items-center gap-1.5">
          <TrendingDown className="h-4 w-4" style={{ color: COLORS.down }} /> Negative Event Impact
        </span>
      </div>
    </Card>
  );
}

function legend(show: Set<SeriesKey>, comparing: boolean): [string, string][] {
  const sfx = comparing ? ' (Current)' : '';
  const out: [string, string][] = [];
  if (show.has('pos')) out.push([`POS Revenue${sfx}`, COLORS.pos]);
  if (show.has('eatclub')) out.push([`Eatclub Revenue${sfx}`, COLORS.eatclub]);
  if (show.has('labour')) out.push([`Labour Costs${sfx}`, COLORS.labour]);
  if (comparing && show.has('pos')) out.push(['Direct Revenue (Previous)', COLORS.prevDirect]);
  if (comparing && show.has('eatclub')) out.push(['Total Revenue (Previous)', COLORS.prevTotal]);
  if (comparing && show.has('labour')) out.push(['Labour Costs (Previous)', COLORS.prevLabour]);
  return out;
}

function KpiTile({ label, kpi, fmt, comparing, loading }: { label: string; kpi?: Kpi; fmt: (n: number) => string; comparing: boolean; loading: boolean }) {
  return (
    <div className="rounded-2xl bg-secondary px-4 py-3">
      <div className="text-sm text-foreground/80">{label}</div>
      {loading && !kpi ? (
        <Skeleton className="mt-1 h-8 w-28 bg-card" />
      ) : (
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <span className="text-2xl font-medium tracking-tight">{kpi ? fmt(kpi.value) : '–'}</span>
          {comparing && kpi?.previous !== null && kpi?.previous !== undefined && (
            <span className="text-sm text-muted-foreground">
              vs {fmt(kpi.previous)}{' '}
              {kpi.changePct !== null && <span className={cn('font-semibold', kpi.changePct >= 0 ? 'text-green-600' : 'text-red-600')}>({formatPct(kpi.changePct)})</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function EventMarker({ cx, cy, impact, title }: { cx: number; cy: number; impact: 'POSITIVE' | 'NEGATIVE'; title: string }) {
  const up = impact === 'POSITIVE';
  const color = up ? COLORS.up : COLORS.down;
  return (
    <g>
      <title>{title}</title>
      <circle cx={cx} cy={cy} r={14} fill={up ? '#dcfce7' : '#fee2e2'} stroke={up ? '#86efac' : '#fca5a5'} strokeWidth={1.5} />
      <g transform={`translate(${cx - 8},${cy - 8}) scale(0.667)`} fill="none" stroke={color} strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
        {up ? (
          <>
            <path d="M16 7h6v6" />
            <path d="m22 7-8.5 8.5-5-5L2 17" />
          </>
        ) : (
          <>
            <path d="M16 17h6v-6" />
            <path d="m22 17-8.5-8.5-5 5L2 7" />
          </>
        )}
      </g>
    </g>
  );
}

interface TipProps {
  active?: boolean;
  payload?: { payload: Row }[];
  currency: string;
  comparing: boolean;
  show: Set<SeriesKey>;
}

function ChartTooltip({ active, payload, currency, comparing, show }: TipProps) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  const m = (n: number) => formatMoney(n, currency);
  const line = (visible: boolean, color: string, label: string, v: number) =>
    visible && (
      <div className="flex items-center justify-between gap-6">
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <span className="font-medium tabular-nums">{m(v)}</span>
      </div>
    );
  return (
    <div className="min-w-[210px] space-y-1.5 rounded-xl border bg-card p-3 text-xs shadow-lg">
      <div className="mb-1 text-sm font-semibold">
        {r.label} <span className="font-normal text-muted-foreground">{r.date}</span>
      </div>
      {line(show.has('pos'), COLORS.pos, 'POS Revenue', r.pos)}
      {line(show.has('eatclub'), COLORS.eatclub, 'Eatclub Revenue', r.eatclub)}
      {(show.has('pos') || show.has('eatclub')) && (
        <div className="flex justify-between border-t pt-1.5 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{m(r.total)}</span>
        </div>
      )}
      {line(show.has('labour'), COLORS.labour, 'Labour Costs', r.labour)}
      <div className="flex justify-between text-muted-foreground">
        <span>Covers</span>
        <span className="tabular-nums text-foreground">{formatInt(r.covers)}</span>
      </div>
      {comparing && (
        <div className="space-y-1.5 border-t pt-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Previous</div>
          {line(show.has('pos'), COLORS.prevDirect, 'Direct revenue', r.pDirect)}
          {line(show.has('pos') || show.has('eatclub'), COLORS.prevTotal, 'Total revenue', r.pTotal)}
          {line(show.has('labour'), COLORS.prevLabour, 'Labour costs', r.pLabour)}
        </div>
      )}
      {r.positive && <div className="border-t pt-1.5 font-medium text-green-600">↗ {r.positive}</div>}
      {r.negative && <div className="border-t pt-1.5 font-medium text-red-600">↘ {r.negative}</div>}
    </div>
  );
}
