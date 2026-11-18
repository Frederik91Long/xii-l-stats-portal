# XII-L Stats Portal v0.2 — Dark & Gold

Public-ready **Next.js App Router / TypeScript** starter for Sleeper league `1317560135530344449`.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.
Visit http://localhost:3000.

## Included
- Homepage with league KPIs, top standings, current-week matchups.
- Full standings with W/L/T, PF and PA.
- Matchups with selectable week 1–18.
- Franchise listing and individual franchise pages.
- Server-side Sleeper API proxy at `/api/league` (avoids browser CORS issues).
- Refresh buttons, loading/error states, responsive Dark & Gold styling.
- Supabase SQL schema and optional protected cron sync route.
- Vercel deployment configuration.

**No fictional scores:** real data is fetched at runtime from Sleeper. This build has not been verified against the user's live league API in the build environment. The Next.js build must be validated after installing dependencies.

## Vercel deployment
1. Create a GitHub repository containing this folder's files.
2. Import repository at https://vercel.com/new, choose Next.js framework.
3. Set environment variable `SLEEPER_LEAGUE_ID=1317560135530344449`.
4. Deploy. Vercel assigns a `*.vercel.app` public URL. Add a custom domain later if desired.
5. **Important:** `vercel.json` schedules `/api/sync` daily. It safely returns 401 until `CRON_SECRET` is set, and 503 until Supabase credentials are provided. You may remove `vercel.json` until persistence is enabled.

## Optional Supabase preparation
1. Create Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Add server-only env vars `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` in Vercel project settings.
4. Set a strong, random `CRON_SECRET`. Never prefix server secrets with `NEXT_PUBLIC_`.
5. Deploy; the protected `/api/sync` job saves one JSON snapshot per league/season/week. The public pages **still read Sleeper directly**, not the snapshots. This is a foundation for later historical statistics, not a completed production data warehouse.

## Caveats and next features
- Sleeper `settings.leg` is used as current league week; falls back to NFL state.
- Standings sorted by W + 0.5 ties, then PF. Confirm official XII-L tiebreak rules.
- Team names currently come from Sleeper owner metadata, not canonical XII-L aliases. Admin edits and branding will require auth, policies and a UI.
- Individual franchise pages currently show Sleeper player IDs rather than player names. Player directory and historical roster snapshots are next phase.
- Live points may change after score corrections; there is no verified final-status flag.
- Historical stats and all-time records require importing previous seasons and saving immutable snapshots.
- Database tables have RLS enabled and no public policies. Keep service-role credentials server-side only.
- If Vercel's cron plan doesn't permit this schedule, change it to a plan-supported interval.

## API
- `/api/league` current week
- `/api/league?week=7` selected week
- `/api/sync` cron-only; `Authorization: Bearer <CRON_SECRET>`
