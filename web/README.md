# Revenue Dashboard Web (Next.js + shadcn/ui)

The dashboard view from the video: **"This Week's Revenue Trend"** with stacked POS + Eatclub bars, Labour bars,
3 KPI cards, *Compare to Previous*, the three series checkboxes, *Export PNG*, green/red event markers,
plus a **Today vs Next day** comparison card.

**This project contains no backend code and no business logic.** Everything comes from the NestJS API in `../api`, and
**every button, checkbox and field calls that API again with its value as a parameter.**

Stack: Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · shadcn/ui (Radix) · Recharts · SWR.

---

## 1. Run locally

**Prerequisites:** Node.js 20+, and the API running on `http://localhost:4000` (see `../api/README.md`, or the root `README.md` for the full from-zero guide).

```bash
cd web
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm install
npm run dev                       # http://localhost:3000
```
Production: `npm run build && npm run start`.

The API must allow this site's origin: `CORS_ORIGIN` in `api/.env` (default `http://localhost:3000,http://localhost:5173`).
Serving the frontend from another URL/port? Add it there and restart the API.

---

## 2. Every control calls the API

| UI control | Request sent to the NestJS API |
|---|---|
| page load | `GET /dashboard/revenue-trend?compare=false&series=pos,eatclub,labour` |
| **Compare to Previous** | `GET /dashboard/revenue-trend?compare=true&series=…` |
| checkboxes **POS Revenue / Eatclub Revenue / Labour Costs** | `GET /dashboard/revenue-trend?compare=…&series=<ticked ones>` (hidden series come back `null`, the chart is drawn from the response) |
| **Export PNG** | `GET /dashboard/revenue-trend/export?compare=…&series=…&weekStart=…` → the PNG rendered by the API is downloaded |
| week ◀ / ▶ / *This week* | `GET /dashboard/revenue-trend?weekStart=2026-10-05&compare=…&series=…` |
| day comparison: date field, ◀ ▶, *Today* | `GET /revenue/compare?date=2026-10-12` (the API compares it with the next day) |
| automatic (every 10 s, tab focus) | the same request again, so DB changes show up without a reload |

The three parameters of the widget are built in one place (`trendQuery` in `hooks/use-dashboard.ts`) and used for both the
data request and the PNG request, so the exported image always matches what is on screen. While a response for a changed control is
on its way, a small spinner appears next to the title.

---

## 3. Project structure

```
app/page.tsx                         the page
components/dashboard/
  dashboard-view.tsx                 state of the controls (weekStart, compare, series) + Export PNG
  revenue-trend-card.tsx             chart, KPI tiles, legend, checkboxes and buttons
  day-compare-card.tsx               "Today vs Next day"
components/ui/                       shadcn/ui components (button, card, checkbox, input, label, skeleton)
hooks/use-dashboard.ts               SWR hooks + trendQuery (control -> query string)
lib/api.ts, config.ts                fetch wrapper for the NestJS API, API base URL
lib/types.ts                         API response types
```
`components.json` is included, so more shadcn components can be added with `npx shadcn@latest add <name>`.

## 4. Notes

* Colours, rounded cards, yellow hover / dark pressed state of *Compare to Previous*, and the y axis (`0k / 0.75k / 1.5k …`) follow the video.
* With *Compare to Previous* on, each day shows 4 bars like the video: current POS+Eatclub stack, current Labour, previous Direct+Total stack, previous Labour.
* "Total Revenue" counts only the ticked revenue series (POS, Eatclub); "Total Covers" is never filtered.
* Checked against the real API and database (every control's request, CORS, production build, chart rendered to an image and compared with the video).
  It was **not** opened in an interactive browser during development, so do a quick visual pass in yours.

## 5. Troubleshooting

| Problem | Fix |
|---|---|
| "Cannot reach the API at …" | start the API and check `NEXT_PUBLIC_API_URL` in `.env.local` (restart `npm run dev` after changing it) |
| Browser console: "blocked by CORS policy" | add the frontend origin to `CORS_ORIGIN` in `api/.env`, restart the API |
| "No data for this week" | no rows for that week: `npm run prisma:seed` or `npm run import:csv` in `api` |
| Export PNG does nothing / error toast | the API's `/dashboard/revenue-trend/export` failed: check the API log (it needs `api/assets/fonts`) |
| `EADDRINUSE: 3000` | `PORT=3001 npm run dev` (and add `http://localhost:3001` to `CORS_ORIGIN`) |
