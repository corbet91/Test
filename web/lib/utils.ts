import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(value: number, currency = 'USD', fractionDigits = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export const formatInt = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n));

export function formatPct(p: number | null | undefined, withSign = true) {
  if (p === null || p === undefined) return '–';
  const s = withSign && p > 0 ? '+' : '';
  return `${s}${p.toFixed(1)}%`;
}
