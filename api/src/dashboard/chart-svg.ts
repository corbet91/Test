import { TrendResponse } from './dashboard.types';

const C = {
  pos: '#2a2a2a',
  eatclub: '#5b5bf0',
  labour: '#ea6528',
  prevDirect: '#bdbdbd',
  prevTotal: '#c9c9f8',
  prevLabour: '#f8cdbb',
  up: '#16a34a',
  down: '#dc2626',
  text: '#27272a',
  muted: '#71717a',
  grid: '#d4d4d8',
  tile: '#f4f2ee',
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n: number, cur: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
const int = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n));
const pct = (p: number | null) => (p === null ? '' : `(${p > 0 ? '+' : ''}${p.toFixed(1)}%)`);
const short = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Rectangle path with an individual radius per corner [tl, tr, br, bl]. */
function rounded(x: number, y: number, w: number, h: number, r: [number, number, number, number]): string {
  const [tl, tr, br, bl] = r.map((v) => Math.min(v, w / 2, h / 2));
  return `M${x + tl},${y} H${x + w - tr} Q${x + w},${y} ${x + w},${y + tr} V${y + h - br} Q${x + w},${y + h} ${x + w - br},${y + h} H${x + bl} Q${x},${y + h} ${x},${y + h - bl} V${y + tl} Q${x},${y} ${x + tl},${y} Z`;
}

/** Draws the same card as the web UI (title, 3 KPI tiles, bars, event markers, legend) as an SVG string. */
export function buildTrendSvg(t: TrendResponse): string {
  const W = 1200;
  const H = 820;
  const FONT = `font-family="DejaVu Sans, sans-serif"`;
  const show = new Set(t.series);
  const compare = t.compare;
  const parts: string[] = [];

  // ---- title
  const base = t.isCurrentWeek ? "This Week's Revenue Trend" : `Revenue Trend · ${short(t.period.start)} – ${short(t.period.end)}`;
  parts.push(`<text x="40" y="66" ${FONT} font-size="26" fill="${C.text}">${esc(compare ? `${base} vs Previous Period` : base)}</text>`);

  // ---- KPI tiles
  const tileW = (W - 80 - 32) / 3;
  const tiles = [
    { label: 'Total Revenue', k: t.summary.totalRevenue, f: (n: number) => money(n, t.currency) },
    { label: 'Average per Day', k: t.summary.averagePerDay, f: (n: number) => money(n, t.currency) },
    { label: 'Total Covers', k: t.summary.totalCovers, f: int },
  ];
  tiles.forEach((tile, i) => {
    const x = 40 + i * (tileW + 16);
    parts.push(`<rect x="${x}" y="96" width="${tileW}" height="104" rx="18" fill="${C.tile}"/>`);
    parts.push(`<text x="${x + 18}" y="126" ${FONT} font-size="15" fill="${C.text}">${tile.label}</text>`);
    parts.push(`<text x="${x + 18}" y="165" ${FONT} font-size="30" font-weight="bold" fill="${C.text}">${esc(tile.f(tile.k.value))}</text>`);
    if (compare && tile.k.previous !== null) {
      const color = (tile.k.changePct ?? 0) >= 0 ? C.up : C.down;
      parts.push(
        `<text x="${x + 18}" y="188" ${FONT} font-size="14" fill="${C.muted}">vs ${esc(tile.f(tile.k.previous))}<tspan dx="6" fill="${color}" font-weight="bold">${esc(pct(tile.k.changePct))}</tspan></text>`,
      );
    }
  });

  // ---- scale (4 equal steps rounded up to 250, like the web chart)
  const stackOf = (p: { posRevenue: number | null; eatclubRevenue: number | null }) => (p.posRevenue ?? 0) + (p.eatclubRevenue ?? 0);
  let max = 0;
  for (const d of t.days) {
    max = Math.max(max, stackOf(d), d.labourCost ?? 0);
    if (d.previous) max = Math.max(max, d.previous.totalRevenue, d.previous.labourCost ?? 0);
  }
  const step = Math.max(250, Math.ceil(max / 4 / 250) * 250);
  const domain = step * 4;

  const px0 = 110;
  const px1 = W - 40;
  const top = 290;
  const bottom = 660;
  const plotW = px1 - px0;
  const y = (v: number) => bottom - (v / domain) * (bottom - top);
  const band = plotW / 7;

  // grid + y labels
  for (let i = 0; i <= 4; i++) {
    const v = step * i;
    parts.push(`<line x1="${px0}" y1="${y(v)}" x2="${px1}" y2="${y(v)}" stroke="${C.grid}" stroke-width="1" stroke-dasharray="4 4"/>`);
    parts.push(`<text x="${px0 - 12}" y="${y(v) + 5}" text-anchor="end" ${FONT} font-size="13" fill="${C.muted}">${v === 0 ? '0k' : `${+(v / 1000).toFixed(2)}k`}</text>`);
  }
  for (let i = 0; i <= 7; i++) {
    const x = px0 + i * band;
    parts.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="${C.grid}" stroke-width="1" stroke-dasharray="4 4"/>`);
  }

  // ---- bars: [current stack] [labour] [previous stack] [previous labour]
  const hasStack = show.has('pos') || show.has('eatclub');
  const slots = [hasStack ? 'cur' : null, show.has('labour') ? 'lab' : null, compare && hasStack ? 'pstack' : null, compare && show.has('labour') ? 'plab' : null].filter(
    Boolean,
  ) as string[];
  const gap = 4;
  const usable = band * 0.86;
  const slotW = Math.min(40, (usable - gap * (slots.length - 1)) / Math.max(slots.length, 1));
  const groupW = slotW * slots.length + gap * (slots.length - 1);

  const seg = (x: number, v: number, w: number, color: string, r: [number, number, number, number], base0: number) => {
    const h = (v / domain) * (bottom - top);
    if (h < 0.5) return { path: '', top: base0 };
    const yTop = base0 - h;
    parts.push(`<path d="${rounded(x, yTop, w, h, r)}" fill="${color}"/>`);
    return { path: '', top: yTop };
  };

  t.days.forEach((d, i) => {
    const gx = px0 + i * band + (band - groupW) / 2;
    const slotX = (name: string) => gx + slots.indexOf(name) * (slotW + gap);

    // x label
    parts.push(`<text x="${px0 + i * band + band / 2}" y="${bottom + 28}" text-anchor="middle" ${FONT} font-size="14" fill="${C.text}">${d.label}</text>`);

    if (slots.includes('cur')) {
      const hasPos = show.has('pos');
      const hasEat = show.has('eatclub');
      let yBase = bottom;
      if (hasPos) yBase = seg(slotX('cur'), d.posRevenue ?? 0, slotW, C.pos, hasEat ? [0, 0, 6, 6] : [6, 6, 6, 6], yBase).top;
      if (hasEat) seg(slotX('cur'), d.eatclubRevenue ?? 0, slotW, C.eatclub, hasPos ? [6, 6, 0, 0] : [6, 6, 6, 6], yBase);
    }
    if (slots.includes('lab')) seg(slotX('lab'), d.labourCost ?? 0, slotW, C.labour, [6, 6, 6, 6], bottom);

    if (d.previous && slots.includes('pstack')) {
      const direct = show.has('pos') ? (d.previous.directRevenue ?? 0) : 0;
      let yBase = bottom;
      if (show.has('pos')) yBase = seg(slotX('pstack'), direct, slotW, C.prevDirect, show.has('eatclub') ? [0, 0, 6, 6] : [6, 6, 6, 6], yBase).top;
      if (show.has('eatclub')) seg(slotX('pstack'), Math.max(d.previous.totalRevenue - direct, 0), slotW, C.prevTotal, show.has('pos') ? [6, 6, 0, 0] : [6, 6, 6, 6], yBase);
    }
    if (d.previous && slots.includes('plab')) seg(slotX('plab'), d.previous.labourCost ?? 0, slotW, C.prevLabour, [6, 6, 6, 6], bottom);

    // ---- event markers (positive = green up arrow, negative = red down arrow)
    const events: { up: boolean; title: string }[] = [];
    if (d.positiveEvent) events.push({ up: true, title: d.positiveEvent });
    if (d.negativeEvent) events.push({ up: false, title: d.negativeEvent });
    const topVal = Math.max(stackOf(d), d.previous ? d.previous.totalRevenue : 0);
    const cy = y(Math.min(domain * 1.04, topVal + domain * 0.09));
    events.forEach((ev, k) => {
      const cx = px0 + i * band + band / 2 + (k - (events.length - 1) / 2) * 34;
      const color = ev.up ? C.up : C.down;
      parts.push(`<circle cx="${cx}" cy="${cy}" r="14" fill="${ev.up ? '#dcfce7' : '#fee2e2'}" stroke="${ev.up ? '#86efac' : '#fca5a5'}" stroke-width="1.5"/>`);
      parts.push(
        `<g transform="translate(${cx - 8},${cy - 8}) scale(0.667)" fill="none" stroke="${color}" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round">${
          ev.up ? '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>' : '<path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/>'
        }</g>`,
      );
    });
  });

  // ---- legend (only the visible series), wrapped and centred
  type Item = { label: string; color?: string; icon?: 'up' | 'down' };
  const items: Item[] = [];
  const sfx = compare ? ' (Current)' : '';
  if (show.has('pos')) items.push({ label: `POS Revenue${sfx}`, color: C.pos });
  if (show.has('eatclub')) items.push({ label: `Eatclub Revenue${sfx}`, color: C.eatclub });
  if (show.has('labour')) items.push({ label: `Labour Costs${sfx}`, color: C.labour });
  if (compare && show.has('pos')) items.push({ label: 'Direct Revenue (Previous)', color: C.prevDirect });
  if (compare && show.has('eatclub')) items.push({ label: 'Total Revenue (Previous)', color: C.prevTotal });
  if (compare && show.has('labour')) items.push({ label: 'Labour Costs (Previous)', color: C.prevLabour });
  items.push({ label: 'Positive Event Impact', icon: 'up' }, { label: 'Negative Event Impact', icon: 'down' });

  const itemW = (it: Item) => 22 + it.label.length * 8.4 + 30;
  const rows: Item[][] = [[]];
  let rowW = 0;
  for (const it of items) {
    if (rowW + itemW(it) > W - 100 && rows[rows.length - 1].length) {
      rows.push([]);
      rowW = 0;
    }
    rows[rows.length - 1].push(it);
    rowW += itemW(it);
  }
  rows.forEach((row, r) => {
    const total = row.reduce((s, it) => s + itemW(it), 0) - 30;
    let x = (W - total) / 2;
    const ly = 725 + r * 30;
    for (const it of row) {
      if (it.color) parts.push(`<circle cx="${x + 6}" cy="${ly - 5}" r="6" fill="${it.color}"/>`);
      else {
        const up = it.icon === 'up';
        parts.push(
          `<g transform="translate(${x - 2},${ly - 15}) scale(0.7)" fill="none" stroke="${up ? C.up : C.down}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${
            up ? '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>' : '<path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/>'
          }</g>`,
        );
      }
      parts.push(`<text x="${x + 22}" y="${ly}" ${FONT} font-size="14" fill="${C.text}">${esc(it.label)}</text>`);
      x += itemW(it);
    }
  });

  parts.push(`<text x="${W - 40}" y="${H - 14}" text-anchor="end" ${FONT} font-size="11" fill="${C.muted}">${esc(`${t.period.start} – ${t.period.end} · generated ${t.generatedAt.slice(0, 19).replace('T', ' ')} UTC`)}</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${parts.join('')}</svg>`;
}
