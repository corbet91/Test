/**
 * End-to-end check: rows written to the `revenue` table are returned by the API exactly,
 * and the "today vs next day" comparison is computed from them.
 * Needs a migrated database (see README). Uses far-future dates and deletes them afterwards.
 */
import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

describe('Revenue API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<INestApplication['getHttpServer']>;

  // Week Mon 2031-01-06 .. Sun 2031-01-12; previous week starts 2030-12-30
  const day = (d: string) => new Date(`${d}T00:00:00.000Z`);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    http = app.getHttpServer();
    prisma = app.get(PrismaService);
    await prisma.revenue.deleteMany({ where: { date: { gte: day('2030-12-01'), lte: day('2031-02-01') } } });

    await prisma.revenue.create({
      data: { date: day('2030-12-30'), posRevenue: 1000, eatclubRevenue: 200, directRevenue: 900, labourCost: 400, covers: 80 },
    });
    for (let i = 0; i < 7; i++) {
      await prisma.revenue.create({
        data: {
          date: day(`2031-01-${String(6 + i).padStart(2, '0')}`),
          posRevenue: 1500,
          eatclubRevenue: 300,
          directRevenue: 1400,
          labourCost: 600,
          covers: 100,
          ...(i === 4 ? { negativeEvent: 'Heavy rain' } : {}),
          ...(i === 5 ? { positiveEvent: 'Live music' } : {}),
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.revenue.deleteMany({ where: { date: { gte: day('2030-12-01'), lte: day('2031-02-01') } } });
    await app.close();
  });

  it('lists rows with every field of the table', async () => {
    const res = await request(http).get('/api/revenue').query({ from: '2031-01-06', to: '2031-01-07' }).expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toEqual({
      date: '2031-01-06',
      hasData: true,
      posRevenue: 1500,
      eatclubRevenue: 300,
      directRevenue: 1400,
      totalRevenue: 1800,
      labourCost: 600,
      covers: 100,
      positiveEvent: null,
      negativeEvent: null,
    });
  });

  it('compare: a day against the next day by default', async () => {
    await prisma.revenue.update({ where: { date: day('2031-01-07') }, data: { posRevenue: 1800 } });
    const res = await request(http).get('/api/revenue/compare').query({ date: '2031-01-06' }).expect(200);

    expect(res.body.base.date).toBe('2031-01-06');
    expect(res.body.target.date).toBe('2031-01-07');
    expect(res.body.target.posRevenue).toBe(1800);
    expect(res.body.difference.posRevenue).toEqual({ value: 300, changePct: 20 });
    expect(res.body.difference.totalRevenue).toEqual({ value: 300, changePct: 16.7 });
    expect(res.body.difference.labourCost).toEqual({ value: 0, changePct: 0 });
  });

  it('compare: missing day counts as zero, no division by zero', async () => {
    const res = await request(http).get('/api/revenue/compare').query({ date: '2031-01-12' }).expect(200);
    expect(res.body.target).toMatchObject({ date: '2031-01-13', hasData: false, totalRevenue: 0 });
    expect(res.body.difference.totalRevenue).toEqual({ value: -1800, changePct: -100 });

    const back = await request(http).get('/api/revenue/compare').query({ date: '2031-01-13', compareTo: '2031-01-12' }).expect(200);
    expect(back.body.difference.totalRevenue).toEqual({ value: 1800, changePct: null });
  });

  it('compare: defaults to today and validates dates', async () => {
    const res = await request(http).get('/api/revenue/compare').expect(200);
    const d = new Date(res.body.base.date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    expect(res.body.target.date).toBe(d.toISOString().slice(0, 10));
    await request(http).get('/api/revenue/compare').query({ date: '2031-02-30' }).expect(400);
    await request(http).get('/api/revenue/compare').query({ date: 'tomorrow' }).expect(400);
  });

  it('revenue-trend: 7 days, KPI cards, markers and previous week', async () => {
    const res = await request(http).get('/api/dashboard/revenue-trend').query({ weekStart: '2031-01-08', compare: 'true' }).expect(200);

    expect(res.body.period).toEqual({ start: '2031-01-06', end: '2031-01-12' });
    expect(res.body.previousPeriod).toEqual({ start: '2030-12-30', end: '2031-01-05' });
    expect(res.body.days.map((d: { label: string }) => d.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(res.body.summary.totalRevenue.value).toBe(12900); // 6 * 1800 + (1800 + 300 raised Tue)
    expect(res.body.summary.totalRevenue.previous).toBe(1200); // only Mon 2030-12-30 has data
    expect(res.body.summary.totalCovers.value).toBe(700);
    expect(res.body.days[4].negativeEvent).toBe('Heavy rain');
    expect(res.body.days[5].positiveEvent).toBe('Live music');
    expect(res.body.days[0].previous).toMatchObject({ date: '2030-12-30', directRevenue: 900, totalRevenue: 1200, labourCost: 400 });
    expect(res.body.days[1].previous.hasData).toBe(false);
  });

  it('revenue-trend: no previous data when compare is off, and shows DB edits immediately', async () => {
    await prisma.revenue.update({ where: { date: day('2031-01-08') }, data: { eatclubRevenue: 555 } });
    const res = await request(http).get('/api/dashboard/revenue-trend').query({ weekStart: '2031-01-08' }).expect(200);
    expect(res.body.compare).toBe(false);
    expect(res.body.days[2].eatclubRevenue).toBe(555);
    expect(res.body.days[0].previous).toBeUndefined();
    expect(res.body.summary.totalRevenue.previous).toBeNull();
  });

  it('revenue-trend: the series checkboxes hide series and the totals follow', async () => {
    const res = await request(http).get('/api/dashboard/revenue-trend').query({ weekStart: '2031-01-08', series: 'pos,labour' }).expect(200);
    expect(res.body.series).toEqual(['pos', 'labour']);
    expect(res.body.days[2].posRevenue).toBe(1500);
    expect(res.body.days[2].eatclubRevenue).toBeNull();
    expect(res.body.days[2].labourCost).toBe(600);
    expect(res.body.days[2].totalRevenue).toBe(1500); // eatclub is hidden, so not counted
    expect(res.body.summary.totalRevenue.value).toBe(1500 * 6 + 1800); // Tue was raised to 1800 above

    const none = await request(http).get('/api/dashboard/revenue-trend').query({ weekStart: '2031-01-08', series: '' }).expect(200);
    expect(none.body.series).toEqual([]);
    expect(none.body.days[0]).toMatchObject({ posRevenue: null, eatclubRevenue: null, labourCost: null, totalRevenue: 0 });

    await request(http).get('/api/dashboard/revenue-trend').query({ series: 'pos,foo' }).expect(400);
  });

  it('export: the same controls return a PNG image', async () => {
    const res = await request(http)
      .get('/api/dashboard/revenue-trend/export')
      .query({ weekStart: '2031-01-08', compare: 'true', series: 'pos,eatclub,labour' })
      .expect(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['content-disposition']).toContain('revenue-trend-2031-01-06.png');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.subarray(0, 4).toString('hex')).toBe('89504e47'); // PNG signature
    expect(res.body.length).toBeGreaterThan(10_000);

    await request(http).get('/api/dashboard/revenue-trend/export').query({ series: 'nope' }).expect(400);
  });
});
