export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
export const round1 = (n: number): number => Math.round((n + Number.EPSILON) * 10) / 10;

/** Prisma.Decimal | number | null -> number (money is exposed to the UI as plain numbers). */
export const toNum = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

/** Percentage change, 1 decimal. null when there is nothing to compare with. */
export function changePct(current: number, previous: number): number | null {
  if (!previous) return null;
  return round1(((current - previous) / previous) * 100);
}
