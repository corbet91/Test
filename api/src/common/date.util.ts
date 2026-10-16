import { BadRequestException } from '@nestjs/common';

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** "2026-10-15" -> Date at 00:00 UTC. Throws 400 on anything that is not a real calendar date. */
export function parseDateOnly(value: string, field = 'date'): Date {
  if (!DATE_REGEX.test(value)) {
    throw new BadRequestException(`${field} must be in YYYY-MM-DD format`);
  }
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || formatDateOnly(d) !== value) {
    throw new BadRequestException(`${field} is not a valid calendar date`);
  }
  return d;
}

export const formatDateOnly = (d: Date): string => d.toISOString().slice(0, 10);

export function addDays(d: Date, days: number): Date {
  const r = new Date(d.getTime());
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

/** Monday of the ISO week containing `d` (the chart runs Mon -> Sun). */
export function startOfIsoWeek(d: Date): Date {
  const dayIndexFromMonday = (d.getUTCDay() + 6) % 7;
  return addDays(d, -dayIndexFromMonday);
}

/** Today's calendar date in the given IANA time zone, as a UTC-midnight Date. */
export function todayInTimeZone(timeZone: string): Date {
  try {
    const s = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    return parseDateOnly(s);
  } catch {
    return parseDateOnly(new Date().toISOString().slice(0, 10));
  }
}
