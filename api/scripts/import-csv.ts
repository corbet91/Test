/**
 * Load / update revenue rows from a CSV file (upsert by date).
 *
 *   npm run import:csv -- data/revenue-sample.csv
 *
 * Header (any column order, `date` is required, other columns optional):
 *   date,posRevenue,eatclubRevenue,directRevenue,labourCost,covers,positiveEvent,negativeEvent
 *
 * A bad line is reported with its line number and skipped; the good lines are still imported.
 * Columns that are absent from the header are left unchanged on existing rows.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NUMBER_COLUMNS = ['posRevenue', 'eatclubRevenue', 'directRevenue', 'labourCost'] as const;
const TEXT_COLUMNS = ['positiveEvent', 'negativeEvent'] as const;
const KNOWN = ['date', ...NUMBER_COLUMNS, 'covers', ...TEXT_COLUMNS];

/** Minimal CSV line parser: commas, "quoted, values" and "" escapes. */
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function validDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: npm run import:csv -- <file.csv>');
    process.exit(2);
  }
  const lines = readFileSync(file, 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/);

  const headerIdx = lines.findIndex((l) => l.trim() !== '');
  if (headerIdx < 0) {
    console.error('The file is empty');
    process.exit(2);
  }
  const header = parseLine(lines[headerIdx]);
  const unknown = header.filter((h) => !KNOWN.includes(h));
  if (!header.includes('date') || unknown.length) {
    console.error(!header.includes('date') ? 'Header must contain a "date" column' : `Unknown column(s): ${unknown.join(', ')}`);
    console.error(`Allowed columns: ${KNOWN.join(', ')}`);
    process.exit(2);
  }

  let ok = 0;
  const errors: string[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const lineNo = i + 1;
    const cells = parseLine(lines[i]);
    const rec: Record<string, string> = Object.fromEntries(header.map((h, k) => [h, cells[k] ?? '']));

    const date = validDate(rec.date);
    if (!date) {
      errors.push(`line ${lineNo}: invalid date "${rec.date}" (expected YYYY-MM-DD)`);
      continue;
    }

    const data: Record<string, number | string | null> = {};
    let bad: string | null = null;
    for (const col of header) {
      if (col === 'date') continue;
      const v = rec[col];
      if ((NUMBER_COLUMNS as readonly string[]).includes(col) || col === 'covers') {
        const num = v === '' ? 0 : Number(v);
        if (!Number.isFinite(num) || num < 0) bad = `${col} must be a number >= 0 (got "${v}")`;
        else if (col === 'covers' && !Number.isInteger(num)) bad = `covers must be a whole number (got "${v}")`;
        else if (col !== 'covers' && Math.abs(Math.round(num * 100) - num * 100) > 1e-6) bad = `${col} allows 2 decimals at most (got "${v}")`;
        else data[col] = num;
      } else {
        data[col] = v === '' ? null : v; // empty cell = no event marker
      }
      if (bad) break;
    }
    if (bad) {
      errors.push(`line ${lineNo}: ${bad}`);
      continue;
    }

    await prisma.revenue.upsert({ where: { date }, create: { date, ...data }, update: data });
    ok++;
  }

  console.log(`Imported ${ok} row(s) from ${file}`);
  if (errors.length) {
    console.error(`${errors.length} line(s) skipped:`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
