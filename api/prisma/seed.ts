/**
 * Sample data for the `revenue` table: ~10 weeks back plus next week, so the chart, "Compare to Previous"
 * and the "today vs next day" comparison all have data out of the box.
 * Safe to re-run: existing days are never overwritten, only missing ones are added.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

//                        Mon   Tue   Wed   Thu   Fri   Sat   Sun
const POS_BASE = /*    */ [1740, 1790, 1800, 1780, 1740, 2150, 2260];
const EATCLUB_BASE = /**/ [300, 320, 310, 290, 300, 640, 400];
const LABOUR_BASE = /* */ [610, 650, 880, 650, 600, 830, 1130];
const COVERS_BASE = /* */ [105, 112, 112, 110, 118, 168, 150];

const DAY_MS = 86_400_000;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Small deterministic PRNG so every run / machine produces the same sample numbers. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const n = new Date();
  const today = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
  const thisMonday = addDays(today, -((today.getUTCDay() + 6) % 7));

  const rows = [];
  for (let w = -10; w <= 1; w++) {
    const monday = addDays(thisMonday, w * 7);
    // last week a bit lower so "vs previous" shows a rise
    const growth = (1 + 0.01 * (w + 10)) * (w === -1 ? 0.94 : 1);

    for (let i = 0; i < 7; i++) {
      const date = addDays(monday, i);
      const rand = mulberry32(Math.floor(date.getTime() / DAY_MS));
      const pos = round2(POS_BASE[i] * growth * (0.93 + 0.14 * rand()));
      rows.push({
        date,
        posRevenue: pos,
        eatclubRevenue: round2(EATCLUB_BASE[i] * growth * (0.85 + 0.3 * rand())),
        directRevenue: pos, // as in the design: "Direct Revenue (Previous)" equals the POS revenue
        labourCost: round2(LABOUR_BASE[i] * (0.94 + 0.12 * rand())),
        covers: Math.round(COVERS_BASE[i] * growth * (0.92 + 0.16 * rand())),
        // chart markers: negative on Friday and positive on Saturday of the current week
        negativeEvent: w === 0 && i === 4 ? 'Heavy rain' : null,
        positiveEvent: w === 0 && i === 5 ? 'Live music night' : null,
      });
    }
  }

  const res = await prisma.revenue.createMany({ data: rows, skipDuplicates: true });
  console.log(`Seed done: ${res.count} revenue rows added (${rows.length - res.count} already existed)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
