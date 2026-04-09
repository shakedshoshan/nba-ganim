This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## NBA sync (Phase 3)

Server-only environment variables (never expose to the client):

| Variable | Purpose |
|----------|---------|
| `BALLDONTLIE_API_KEY` | [BallDontLie](https://app.balldontlie.io/) API key; sent as `Authorization` header |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role — used by `/api/sync-nba-data` to bypass RLS |
| `CRON_SECRET` | Shared secret; callers must send header `x-cron-secret` |
| `NBA_SEASON_YEAR` | Optional; season filter for playoffs (e.g. `2025` for 2025–26). Defaults to previous calendar year |
| `SYNC_DATE_WINDOW_DAYS` | Optional; date range width around today (default `4`, max `14`) |

Seed `series` rows (team abbreviations must match the API) before sync can attach games. See `scripts/seed-playoff-series.example.sql`.

Run `npm run verify:supabase` to confirm Supabase env vars and that the REST API responds (and whether `DATABASE_URL` connects for `db:apply`).

GitHub Actions: configure repository secrets `SYNC_API_URL` (full URL to `/api/sync-nba-data`) and `CRON_SECRET` — see the workflow under the repo root `.github/workflows/sync-nba-data.yml`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
