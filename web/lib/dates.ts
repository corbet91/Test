// Date helpers that work on plain "YYYY-MM-DD" strings (no time zone surprises).
const toUTC = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const toISO = (d: Date) => d.toISOString().slice(0, 10);

export function addDaysISO(iso: string, days: number): string {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

export function mondayOf(iso: string): string {
  const d = toUTC(iso);
  return addDaysISO(iso, -((d.getUTCDay() + 6) % 7));
}

/** Today's date in the browser's local zone as YYYY-MM-DD. */
export function todayISO(): string {
  const n = new Date();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${n.getFullYear()}-${m}-${d}`;
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function weekDays(mondayISO: string): { date: string; label: string }[] {
  return WEEKDAYS.map((label, i) => ({ label, date: addDaysISO(mondayISO, i) }));
}

export function formatShort(iso: string): string {
  return toUTC(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function formatRange(startISO: string, endISO: string): string {
  return `${formatShort(startISO)} – ${formatShort(endISO)}`;
}
