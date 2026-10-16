# Revenue Dashboard API (NestJS + Prisma + PostgreSQL)

Backend of the restaurant **"Revenue Trend"** dashboard: per-day revenue, labour cost and events, and the
**comparison of each day with the previous period / with the next day**.

* One table, `revenue` (one row per day) — no users, no restaurants, no admin.
* Read-only HTTP API. Data is loaded with a seed script, a CSV import command, or directly in the database.
* **Every control of the UI is an API parameter** (see [section 5](#5-ui-control--api-call)), including *Export PNG*, which is rendered by this API.

---

## 1. Install from zero (Linux / macOS, nothing installed yet)

### Step 1 — Node.js 20+ (via nvm)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# close and reopen the terminal (or: source ~/.nvm/nvm.sh)
nvm install 22 && node -v
```
> Fresh **Ubuntu/Debian** also needs once: `sudo apt-get update && sudo apt-get install -y curl openssl ca-certificates`.
> Fresh **macOS** may ask to install "Command Line Tools" the first time you use `curl`/`git` — accept it.

### Step 2 — Docker (only to run PostgreSQL)
* **macOS:** install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or `brew install --cask docker`), **open it once** and wait until it is running.
* **Linux:** `curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker $USER`, then log out and back in.
* Check: `docker --version && docker compose version`. (No Docker? see [Option B](#option-b--native-postgresql-no-docker).)

### Step 3 — Dependencies
```bash
cd api                      # this folder
cp .env.example .env        # defaults work locally
npm install                 # also generates the Prisma client
```

### Step 4 — Database: initial setup
```bash
docker compose up -d --wait     # PostgreSQL 16 on localhost:5432, empty database "revenue_dashboard"
```

### Step 5 — Migration + sample data
```bash
npx prisma migrate deploy       # runs prisma/migrations/* -> creates the "revenue" table
npm run prisma:seed             # ~12 weeks of sample rows around today (safe to re-run)
```
(A harmless warning `package.json#prisma is deprecated` may appear — ignore it.)

### Step 6 — Start
```bash
npm run start:dev               # http://localhost:4000/api   ·   Swagger UI: http://localhost:4000/docs
```

### Step 7 — Check
```bash
curl "http://localhost:4000/api/dashboard/revenue-trend?compare=true"
curl "http://localhost:4000/api/revenue/compare"                       # today vs tomorrow
curl -o chart.png "http://localhost:4000/api/dashboard/revenue-trend/export?compare=true"   # the PNG
```

---

## 2. The `revenue` table

| Column | Type | UI element |
|---|---|---|
| `date` | `DATE`, **unique** | the day on the x axis (Mon … Sun) |
| `posRevenue` | `DECIMAL(12,2)` | **POS Revenue** (black bar) |
| `eatclubRevenue` | `DECIMAL(12,2)` | **Eatclub Revenue** (blue bar, stacked on POS) |
| `directRevenue` | `DECIMAL(12,2)` | **Direct Revenue** (grey bar of the previous period) |
| `labourCost` | `DECIMAL(12,2)` | **Labour Costs** (orange bar) |
| `positiveEvent` | `TEXT` null | **Positive Event Impact**: title of the event, green marker above the day (NULL = no marker) |
| `negativeEvent` | `TEXT` null | **Negative Event Impact**: title of the event, red marker above the day (NULL = no marker) |
| `covers` | `INT` | **Total Covers** card |
| `id`, `createdAt`, `updatedAt` | | housekeeping |

Total revenue = `posRevenue + eatclubRevenue` (calculated, not stored). Schema: `prisma/schema.prisma`; SQL: `prisma/migrations/`.

---

## 3. Getting data into the table (there is no admin)

**a) Seed** — `npm run prisma:seed` (sample data, only fills missing days).

**b) CSV import** (insert or update by date):
```bash
npm run import:csv -- data/revenue-sample.csv
```
```csv
date,posRevenue,eatclubRevenue,directRevenue,labourCost,covers,positiveEvent,negativeEvent
2026-10-09,1741.00,300.00,1741.00,601.50,117,,Heavy rain
2026-10-10,2150.00,640.00,2150.00,830.00,168,Live music night,
```
`date` is required; the other columns are optional (columns missing from the header are left unchanged on existing rows;
an empty event cell = no marker). A bad line is reported with its line number and skipped, the good lines are still imported
(exit code 1 if any line was skipped).

**c) SQL** (e.g. from `npm run prisma:studio` or psql):
```sql
INSERT INTO revenue (id, date, "posRevenue", "eatclubRevenue", "directRevenue", "labourCost", covers, "updatedAt")
VALUES (gen_random_uuid()::text, '2026-10-17', 2100, 600, 2100, 800, 160, now())
ON CONFLICT (date) DO UPDATE SET "posRevenue" = EXCLUDED."posRevenue", "updatedAt" = now();
```
Whatever is in the table is exactly what the API returns on the next request (responses are never cached: `Cache-Control: no-store`).

---

## 4. API reference

Base URL `http://localhost:4000/api` · Swagger `http://localhost:4000/docs` · dates are `YYYY-MM-DD` · weeks are Monday–Sunday.
All endpoints are public and read-only. A bad parameter returns HTTP 400 with the reason.

### `GET /dashboard/revenue-trend` — data of the Revenue Trend widget

| Query | Default | Meaning |
|---|---|---|
| `weekStart` | current week | any date inside the wanted week (snapped to Monday) |
| `compare` | `false` | `true` adds, for every day, the same weekday of the previous week (`previous`) and the `previous` / `changePct` of the KPI cards |
| `series` | all | comma-separated visible series: `pos`, `eatclub`, `labour`. Hidden series come back as `null`. Empty (`series=`) = none |

```jsonc
{
  "currency": "USD",
  "period": { "start": "2026-10-12", "end": "2026-10-18" },
  "isCurrentWeek": true,
  "compare": true,
  "previousPeriod": { "start": "2026-10-05", "end": "2026-10-11" },
  "series": ["pos", "eatclub", "labour"],
  "summary": {
    "totalRevenue":  { "value": 17199, "previous": 15811.9, "changePct": 8.8 },
    "averagePerDay": { "value": 2457,  "previous": 2258.84, "changePct": 8.8 },
    "totalCovers":   { "value": 940,   "previous": 872,     "changePct": 7.8 }
  },
  "days": [                              // always 7 items, Mon -> Sun
    {
      "label": "Fri", "date": "2026-10-16", "hasData": true,
      "posRevenue": 1843.1, "eatclubRevenue": 291.2, "directRevenue": 1843.1, "totalRevenue": 2134.3,
      "labourCost": 588.4, "covers": 121,
      "positiveEvent": null, "negativeEvent": "Heavy rain",
      "previous": {                      // only when compare=true (same fields, date one week earlier)
        "label": "Fri", "date": "2026-10-09", "hasData": true,
        "posRevenue": 1741, "eatclubRevenue": 300, "directRevenue": 1741, "totalRevenue": 2041,
        "labourCost": 601.5, "covers": 117, "positiveEvent": null, "negativeEvent": null
      }
    }
  ]
}
```
Rules: `totalRevenue` of a day counts only the visible revenue series; the KPI cards are computed from those day totals
(`averagePerDay` = total ÷ 7); `totalCovers` is never filtered; `directRevenue` follows the `pos` checkbox; days without a row are all zeros with `hasData:false`.

### `GET /dashboard/revenue-trend/export` — "Export PNG"
Same query parameters as above; returns `image/png` (`Content-Disposition: attachment`) of the same chart, KPI tiles and legend.
The PNG is drawn by the API (bundled DejaVu Sans font, no system fonts or browser needed).

### `GET /revenue/compare` — a day vs the next day
| Query | Default | Meaning |
|---|---|---|
| `date` | today (in `APP_TIMEZONE`) | the base day, "today" |
| `compareTo` | `date` + 1 day | the day to compare with, "the next day" |

```jsonc
{
  "base":   { "date": "2026-10-16", "hasData": true, "posRevenue": 1843.1, "eatclubRevenue": 291.2, "directRevenue": 1843.1,
              "totalRevenue": 2134.3, "labourCost": 588.4, "covers": 121, "positiveEvent": null, "negativeEvent": "Heavy rain" },
  "target": { "date": "2026-10-17", "hasData": true, "...": "same fields" },
  "difference": {                        // target - base, for each metric
    "posRevenue":     { "value": 400.8, "changePct": 21.7 },
    "eatclubRevenue": { "value": 350.1, "changePct": 120.2 },
    "directRevenue":  { "value": 400.8, "changePct": 21.7 },
    "totalRevenue":   { "value": 750.9, "changePct": 35.2 },
    "labourCost":     { "value": 247.6, "changePct": 42.1 },
    "covers":         { "value": 50,    "changePct": 41.3 }
  }
}
```
`changePct` = difference ÷ base value, `null` when the base value is 0. A day without a row counts as zeros (`hasData:false`).

### `GET /revenue?from=&to=` — raw rows
The rows of the table (same fields as a day above), optionally within `from`..`to`.

---

## 5. UI control → API call

Every button / checkbox of the dashboard makes the frontend call the API again with the control's value as a parameter:

| UI control | API call |
|---|---|
| page load | `GET /dashboard/revenue-trend?compare=false&series=pos,eatclub,labour` |
| **Compare to Previous** button | `GET /dashboard/revenue-trend?compare=true&series=…` |
| checkbox **POS Revenue** / **Eatclub Revenue** / **Labour Costs** | `GET /dashboard/revenue-trend?compare=…&series=<the ticked ones>` |
| **Export PNG** button | `GET /dashboard/revenue-trend/export?compare=…&series=…` (+ `weekStart`) → PNG download |
| week ◀ / ▶ / *This week* | `GET /dashboard/revenue-trend?weekStart=2026-10-05&compare=…&series=…` |
| day comparison: date field / ◀ ▶ / *Today* | `GET /revenue/compare?date=2026-10-12` |
| automatic refresh (every 10 s, on tab focus) | the same `revenue-trend` / `compare` call again |

---

## 6. Everyday commands

```bash
npm run start:dev                     # dev server with reload
npm run build && npm run start:prod   # production build (run from this folder: the PNG font lives in ./assets)
npm run test:e2e                      # end-to-end tests against the database of step 4-5 (creates and deletes rows of year 2030/31)
npm run import:csv -- file.csv        # load rows from CSV
npm run prisma:studio                 # browse/edit the table in the browser
npm run db:reset                      # DROP everything and re-run migrations (then: npm run prisma:seed)
docker compose down                   # stop DB (keeps data)   |   docker compose down -v   # stop and DELETE data
```
Changing the schema later: edit `prisma/schema.prisma`, then `npx prisma migrate dev --name what_changed`.

## Configuration (`.env`)

| Variable | Meaning |
|---|---|
| `PORT` | API port (4000) |
| `CORS_ORIGIN` | comma-separated frontend origins allowed to call the API (default `http://localhost:3000,http://localhost:5173`) |
| `DATABASE_URL` | PostgreSQL connection string (matches `docker-compose.yml`) |
| `APP_TIMEZONE` | IANA zone that decides what "today" is (default `UTC`, e.g. `Asia/Ho_Chi_Minh`) |
| `CURRENCY` | ISO 4217 code returned to the UI (default `USD`) |

## Notes and assumptions

* The list of fields you gave contained "labour cost" twice; there is **one** `labourCost` column (the previous period's labour cost is simply the previous day's row).
* `covers` was added because the UI has a **Total Covers** card. `positiveEvent` / `negativeEvent` are text (the event title), NULL meaning "no marker".
* "Compare the next day with today" = `GET /revenue/compare` (default `compareTo` = the day after `date`; both can be changed).
* `directRevenue` is stored separately; the sample data sets it equal to POS revenue, as in the design.
* The initial migration was written by hand and checked by applying it to PostgreSQL and running the tests. If a later `prisma migrate dev` reports drift, regenerate it with `prisma migrate diff`.

## Option B — native PostgreSQL (no Docker)
```bash
# macOS
brew install postgresql@16 && brew services start postgresql@16
# Ubuntu/Debian
sudo apt-get install -y postgresql && sudo service postgresql start
```
```sql
-- macOS: psql postgres        Ubuntu: sudo -u postgres psql
CREATE USER postgres WITH SUPERUSER PASSWORD 'postgres';   -- skip if it exists
CREATE DATABASE revenue_dashboard OWNER postgres;
```
Keep `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/revenue_dashboard?schema=public"` in `.env` and continue at **Step 5**.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Can't reach database server at localhost:5432` | `docker compose up -d --wait` (macOS: is Docker Desktop open?) |
| `port 5432 already allocated` | stop the other Postgres, or map `"5433:5432"` in `docker-compose.yml` and use 5433 in `DATABASE_URL` |
| `permission denied … docker.sock` (Linux) | `sudo usermod -aG docker $USER`, log out and back in |
| OpenSSL / `libssl` error from Prisma | `sudo apt-get install -y openssl` |
| Browser says "blocked by CORS policy" | add the frontend origin to `CORS_ORIGIN` and restart |
| Empty chart | no rows for that week: `npm run prisma:seed` or import a CSV |
| `The table public.revenue does not exist` although `migrate deploy` says "No pending migrations" | The Docker volume still holds a database created by an OLDER version of this project (same migration name, different tables). Reset it: `docker compose down -v && docker compose up -d --wait && npx prisma migrate deploy && npm run prisma:seed` (or `npx prisma migrate reset --force`). This deletes the database's data |
| Export PNG returns 500 | run the API from the project folder (it needs `./assets/fonts`); reinstall with `npm install` if `@resvg/resvg-js` failed to download |
