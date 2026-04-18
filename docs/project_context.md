# Project context: NBA Playoff Challenge

Use this file as the **canonical onboarding brief** for new chats and LLM sessions. It summarizes product intent, **current repo layout**, **what is implemented**, and pointers to deeper specs.

**Related docs (repo root `docs/`):** `Technical_specification.md`, `System_characterization.md`, `execution_plan.md`, **`app_design_guidelines.md`** (UI/UX rules for contributors).

**Application root:** All Next.js code lives under **`my-app/`** (not the monorepo-style `apps/` name in some templates).

**Maintenance:** Project rules require updating this file when implementation or layout changes (see `.cursor/rules/project-context-sync.mdc`). When **`my-app/supabase/scheme.sql`** changes, update the **§ Reference schema** SQL block in this file in the same change.

---

## What we are building

A **zero-cost** social web app where users join **private groups** (invite link), place **series bets** (winner + games 4–7) and **breadth bets** (champion, MVP, conference winners, etc.), and compete on a **group leaderboard**. Scores update from **real NBA data**; locks and privacy rules are **time-based** and enforced in backend/DB.

---

## Product rules (non-negotiable)

### Betting types

- **Series bets:** Per matchup (R1 → Finals): predicted winner + predicted length (4–7 games). Editable until lock.
- **Breadth bets:** Tournament-wide; locked at **global lock** (see below).

### Locks

- **Global lock:** Tip-off of the **first game of Round 1** (playoffs). Locks **all breadth bets**; no further edits.
- **Series lock:** Tip-off of **Game 1 of that series**. Locks that series bet only; users may edit other open series.

### Privacy

- **Before lock:** Other users **must not** see a member’s predictions (mask in API/RLS).
- **After lock:** Group can see each other’s predictions for that item (“peer inspection”).

### Scoring

- **Winner correct:** Points scale by **`series.round`** (R1 < semis < CF < Finals).
- **Exact bonus:** Extra points + `is_exact_hit = true` only if **winner correct** and **predicted games = actual games played**.
- **Breadth:** Fixed points when outcome is known (e.g. Finals MVP).
- **Leaderboard sort:** `SUM(points_awarded) DESC`, tie-break `COUNT(is_exact_hit WHERE true) DESC`.
- **Views:** Overall standings + optional round-scoped standings.

---

## Technical stack (as in repo)

| Layer | Choice |
|--------|--------|
| App | **Next.js 16** (App Router), **React 19**, TypeScript, **Tailwind CSS 4** |
| Host | Vercel (free) — intended |
| DB + Auth | Supabase (PostgreSQL + Auth), **`@supabase/ssr`** + **`@supabase/supabase-js`** |
| Cron | GitHub Actions → `POST /api/sync-nba-data` (`my-app/.github/workflows/sync-nba-data.yml` when repo root is `my-app/`) |
| Live scores | **[BallDontLie NBA API](https://www.balldontlie.io/openapi/nba.yml)** (`GET /nba/v1/games`); narrow date window + pagination to respect tier limits |

---

## Repository layout (ordered)

Omitting generated folders (`node_modules/`, `.next/`) and VCS internals.

```
nba-ganim/
├── .cursor/
│   └── rules/
│       └── project-context-sync.mdc   ← keep project_context.md in sync with changes
│
├── docs/
│   ├── project_context.md          ← this file
│   ├── execution_plan.md           ← phased roadmap
│   ├── Technical_specification.md
│   ├── System_characterization.md
│   └── app_design_guidelines.md    ← UI/UX design rules (mobile, locks, privacy states)
│
└── my-app/                         ← Next.js application (cd here to run npm scripts)
    ├── .github/
    │   └── workflows/
    │       └── sync-nba-data.yml   ← cron every 5h → POST deployed `/api/sync-nba-data` (GitHub repo root must be `my-app/` for this path, or copy workflow to repo-root `.github/`)
    ├── .env                        ← local secrets (not committed); Supabase URL + anon key
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    ├── next.config.ts              ← `images.remotePatterns` for `content.sportslogos.net` (fallback team marks)
    ├── next-env.d.ts
    ├── postcss.config.mjs
    ├── eslint.config.mjs
    ├── README.md
    ├── AGENTS.md                   ← optional agent notes (app-local)
    │
    ├── public/                     ← static assets
    │   ├── nba.png                 ← app / favicon mark (metadata `icons` in `app/layout.tsx`)
    │   ├── nba logos/              ← SVG team marks (filenames with spaces; URLs encoded in code)
    │   └── …                       ← default Next SVGs, etc.
    │
    ├── scripts/
    │   ├── apply-supabase-schema.mjs   ← `npm run db:apply` — all `supabase/migrations/*.sql` in sorted order
    │   ├── verify-supabase-env.mjs     ← `npm run verify:supabase` — env presence + REST/Postgres checks (no secrets logged)
    │   ├── seed-playoff-series.sql          ← Round 1 seed (run in Supabase SQL Editor on prod); required for playoff `games` matching
    │   └── seed-playoff-series.example.sql  ← minimal one-row example; see `seed-playoff-series.sql` for full bracket
    │
    ├── supabase/
    │   ├── scheme.sql                ← **reference DDL** (context only; not a migration). Keep in sync with migrations; duplicate body lives in **§ Reference schema** below
    │   └── migrations/
    │       ├── 20260408120000_initial_schema.sql    ← core tables (no RLS)
    │       ├── 20260409120000_rls_and_triggers.sql  ← profiles trigger, RLS, RPCs (create_group_with_owner, get_group_by_invite_code, helpers)
    │       ├── 20260409150000_games_team_abbrevs.sql ← `games.home_team_abbrev`, `visitor_team_abbrev` for win counting
    │       ├── 20260409160000_league_games.sql     ← `league_games` schedule mirror (RS + playoffs); RLS read for anon/auth
    │       ├── 20260410120000_bet_lock_rls.sql     ← `bets` / `global_bets` INSERT/UPDATE RLS: series lock + global lock
    │       ├── 20260418120000_groups_created_by_management.sql ← `groups.created_by`; RPCs `rename_group`, `set_group_invite_code`, `remove_group_member`; `create_group_with_owner` sets creator
    │       ├── 20260418140000_group_leaderboard.sql           ← RPC `group_leaderboard(p_group_id)` (member-only; totals + exact-hit tie-break)
    │       ├── 20260418150000_fix_create_group_invite_ambiguous.sql ← replays `create_group_with_owner`: qualify `RETURNING` so `invite_code` is not ambiguous with `RETURNS TABLE` output vars
    │       ├── 20260418160000_fix_group_members_rls_recursion.sql     ← superseded for installs that ran it; see `20260418170000`
    │       ├── 20260418170000_group_members_select_via_same_group.sql ← `group_members` SELECT uses `same_group(auth.uid(), user_id)` only (no in-policy self-scan → no recursion)
    │       └── 20260418180000_profiles_names_favorite_group.sql ← `profiles.first_name`, `last_name`, `favorite_group_id`; `profiles_update_own` WITH CHECK on favorite; trigger clear favorite on leave; `group_leaderboard` returns names
    │
    └── src/
        ├── middleware.ts           ← route protection + delegates session refresh
        │
        ├── app/                    ← App Router
        │   ├── layout.tsx          ← root metadata + **`icons`: `/nba.png`**
        │   ├── globals.css
        │   ├── favicon.ico
        │   ├── page.tsx            ← home; **`AppTopBar`** + **next 7 days** `league_games` grouped **by calendar day** (IANA tz from request / runtime), **team logos** on rows; slim hero (no DB “series count”)
        │   │
        │   ├── api/
        │   │   ├── groups/
        │   │   │   └── route.ts    ← POST: create group + invite (RPC `create_group_with_owner`)
        │   │   └── sync-nba-data/
        │   │       └── route.ts    ← POST: cron secret; `league_games` upsert + optional playoff `games` + settlement
        │   │
        │   ├── join/
        │   │   └── [invite_code]/
        │   │       ├── page.tsx    ← preview group; login/signup links with `next=`; join form if signed in
        │   │       ├── actions.ts  ← server action: insert `group_members`
        │   │       └── join-form.tsx
        │   │
        │   ├── login/
        │   │   └── page.tsx
        │   ├── signup/
        │   │   └── page.tsx
        │   ├── dashboard/
        │   │   ├── layout.tsx      ← shared shell: `DashboardTopBar` → **`AppTopBar`** (`authenticated-top-bar.tsx`: **logo + menu** below `lg`; **no** active-group UI in header; sign out)
        │   │   ├── page.tsx        ← hub; links to bracket, My bets, Groups, profile settings, create group
        │   │   ├── settings/
        │   │   │   ├── page.tsx    ← RSC: load `profiles` + memberships; profile form
        │   │   │   ├── actions.ts  ← `updateProfileSettings`, `refreshRandomAvatar`; sets `active_group_id` when favorite saved
        │   │   │   ├── profile-settings-form.tsx ← client: names, username, favorite group
        │   │   │   └── profile-avatar-block.tsx ← TestingBot random avatar preview + “New random avatar”
        │   │   ├── bracket/
        │   │   │   └── page.tsx    ← RSC: `loadBracketWithFallbacks` — DB `series`+`games`, else postseason `league_games`, else BallDontLie games (`seasons[]` + `postseason=true`)
        │   │   ├── bets/
        │   │   │   ├── page.tsx    ← RSC: series + `games` per series, user bets, global lock, active-group note, forms
        │   │   │   ├── loading.tsx ← skeleton while bets route loads
        │   │   │   └── actions.ts  ← server actions: upsert `bets` / `global_bets`, `revalidatePath`
        │   │   └── groups/
        │   │       ├── actions.ts  ← create/rename/regenerate/remove/leave/active-group server actions
        │   │       ├── page.tsx    ← list member groups
        │   │       ├── new/        ← create group form → RPC + redirect to group home
        │   │       └── [groupId]/  ← `page.tsx` (invite, members, **leaderboard**), `group-leaderboard.tsx`, `group-client.tsx`, `rename-group-form.tsx`; **`members/[userId]/page.tsx`** (peer picks, RLS-respecting)
        │   │
        │   └── auth/
        │       ├── actions.ts      ← server action: `signOut` → redirect `/login`
        │       ├── callback/
        │       │   └── route.ts    ← GET: PKCE `exchangeCodeForSession` (supports `?next=`)
        │       └── auth-code-error/
        │           └── page.tsx
        │
        ├── lib/
        │   ├── bets/
        │   │   └── constants.ts    ← global bet types/labels + `fieldNameForGlobalBet`
        │   ├── groups/
        │   │   ├── active-group.ts           ← `active_group_id` httpOnly cookie + `resolveActiveGroupId` (cookie → favorite → first group)
        │   │   ├── user-groups-for-switcher.ts ← `loadUserGroupsForSwitcher()` — group home **Active group** card (multi-membership only)
        │   │   └── invite-code.ts            ← random invite candidate (shared with API route)
        │   ├── profiles/
        │   │   ├── display-name.ts         ← `profileDisplayName` for member lists / leaderboard / peer picks title
        │   │   └── testingbot-avatar.ts    ← TestingBot `random-avatar/{size}?u=…` URL builder (https://testingbot.com/free-online-tools/free-avatar-generator)
        │   ├── site-url.ts         ← `getPublicSiteOrigin()` for shareable join URLs (`NEXT_PUBLIC_SITE_URL` or request headers)
        │   └── nba/
        │       ├── team-logos.ts          ← `TEAM_LOGO_BY_ABBREV`, `teamLogoUrl()` — maps API abbrevs → `/nba logos/…` or CDN fallbacks
        │       ├── balldontlie-client.ts  ← `fetchAllGames`, API key from env
        │       ├── balldontlie-types.ts
        │       ├── game-status.ts         ← map API status → DB enum
        │       ├── bracket-fallback.ts      ← bracket when `series` empty: `league_games` then live API (ids match `postseason-pair-utils`)
        │       ├── postseason-pair-utils.ts ← stable matchup key + `series.id` from season + two abbrevs
        │       ├── series-from-api-games.ts ← insert `public.series` from `NBAGame` postseason list (no API “series” type)
        │       ├── scoring.ts               ← round base points + exact bonus (`computeSeriesBetOutcome`)
        │       └── run-sync.ts              ← orchestration; auto-seed `series` when empty + postseason games exist
        │
        ├── assets/
        │   └── NBA-logos.ts          ← legacy nickname → relative path table (prefer `lib/nba/team-logos.ts` for abbrevs)
        │
        ├── components/
        │   ├── layout/
        │   │   ├── app-top-bar.tsx              ← RSC sticky header: **logged-out** Home / Log in / Sign up; **logged-in** → `AuthenticatedTopBar`
        │   │   └── authenticated-top-bar.tsx  ← client: below **`lg`**, logo + menu; drawer = nav + Profile + sign out (no group switcher)
        │   ├── ui/                   ← primitives: PageContainer, Card, Button, Badge, SegmentedGames, WinnerTiles, **SiteLogo**, **TeamLogo**
        │   ├── bracket/
        │   │   └── playoff-bracket.tsx ← client: rounds / East–West R1 split (seed ids), `SeriesGameLog` reuse
        │   ├── bets/
        │   │   ├── series-bet-card.tsx   ← client: tiles + segmented length, lock/privacy copy, `useActionState`
        │   │   ├── series-game-log.tsx   ← client: `<details>` game log (arena vs bracket labels)
        │   │   └── global-bets-form.tsx  ← client: tournament fields + lock UI + `OpenBadge`/`LockedBadge`
        │   ├── dashboard/
        │   │   ├── dashboard-top-bar.tsx ← re-exports **`AppTopBar`**
        │   │   └── group-switcher.tsx    ← client: `setActiveGroupId` + `router.refresh()`; used on **group home** when user has 2+ groups (not in header)
        │   └── auth/
        │       ├── login-form.tsx      ← client: sign-in; `next` query + signup link preserves `next`
        │       └── signup-form.tsx     ← client: signUp; `next` for redirect + email confirm callback
        │
        └── utils/
            └── supabase/
                ├── admin.ts        ← `createAdminClient()` service role (server-only; sync route)
                ├── client.ts       ← `createBrowserClient` (browser)
                ├── server.ts       ← `createServerClient` + `cookies()` (RSC, route handlers, actions)
                └── middleware.ts   ← `updateSession`: refresh session, returns `{ response, user }`
```

**Note:** `execution_plan.md` may mention `/lib/supabase.ts`; this project uses **`src/utils/supabase/*`**.

---

## Environment variables

Defined for local dev in **`my-app/.env`** (create from project settings; do not commit secrets).

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (or legacy `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` supported in code) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — **`/api/sync-nba-data` only**; bypasses RLS (never expose to the browser) |
| `BALLDONTLIE_API_KEY` | BallDontLie API key; header `Authorization: <key>` ([docs](https://docs.balldontlie.io/)) |
| `CRON_SECRET` | Shared secret; request header **`x-cron-secret`** must match (GitHub Action + manual triggers) |
| `NBA_SEASON_YEAR` | Optional; e.g. `2025` for 2025–26 playoffs. Defaults to **previous calendar year** if unset |
| `SYNC_DATE_WINDOW_DAYS` | Optional; **days forward** from UTC “today” for BallDontLie fetch, plus a fixed **5**-day lookback (default **7**, max **45**) |
| `NEXT_PUBLIC_SITE_URL` | Optional; canonical site origin (no trailing slash) for **join links** on the group page. If unset, derived from request headers (`host` / `x-forwarded-*`). |

**`db:apply` script** (see `scripts/apply-supabase-schema.mjs`): optional **`DATABASE_URL`** (Postgres URI) or **`SUPABASE_ACCESS_TOKEN`** + URL for applying migrations. If `DATABASE_URL` hits **ETIMEDOUT** (common on restricted Wi‑Fi), add **`SUPABASE_ACCESS_TOKEN`** — the script falls back to HTTPS (port 443). Run **`npm run verify:supabase`** to confirm URL/keys and whether `DATABASE_URL` can connect (REST can work even when Postgres ports are blocked).

**GitHub Actions:** set repository secrets **`SYNC_API_URL`** (full URL to your **deployed Next.js origin** + `/api/sync-nba-data`, not the Supabase project URL) and **`CRON_SECRET`** (same value as on the server / Vercel).

**If the workflow fails with HTTP 500 or `ok: false`:** the action prints the JSON body — read `errors[]`. Typical causes: **`BALLDONTLIE_API_KEY`** not set on the host; **`SUPABASE_SERVICE_ROLE_KEY`** / **`NEXT_PUBLIC_SUPABASE_URL`** missing (throws before sync); **`CRON_SECRET`** mismatch (401). If **`errors[]`** mentions **`home_team_abbrev`** / **`visitor_team_abbrev`** and **schema cache** on table **`games`**, the hosted DB is missing **`20260409150000_games_team_abbrevs.sql`** — run **`cd my-app && npm run db:apply`** (or paste that migration into **Supabase → SQL Editor**). Migration **`league_games`** only (`20260409160000_…`) is not enough for playoff **`games`** upserts. **`ok: true`** with **`warnings[]`** (e.g. no `series` rows) still means **`league_games`** was updated; playoff **`games`** / settlement need seeded **`series`** — run **`my-app/scripts/seed-playoff-series.sql`** for picks/sync alignment. The **bracket UI** can still show postseason **`league_games`** or live BallDontLie **`GET /nba/v1/games`** (`seasons[]` + `postseason=true`) when **`series`** is empty (see **`src/lib/nba/bracket-fallback.ts`**). After deploying the app, **`POST /api/sync-nba-data`** returns **200** with `{ ok, errors, warnings, … }` for handled outcomes; **500** is reserved for unexpected server exceptions.

---

## Data model (summary)

Aligned with `Technical_specification.md` and migration SQL:

- **`profiles`:** `id` (→ `auth.users`), `username`, `avatar_url`, optional **`first_name`** / **`last_name`**, nullable **`favorite_group_id`** (→ `groups`, must be a joined group on update — RLS + trigger clears on leave) — **row created by trigger** on new auth user (+ backfill in RLS migration).
- **`groups`:** `id`, `name`, `invite_code`, `created_at`, **`created_by`** (→ `profiles`, nullable on legacy rows; set for new groups via `create_group_with_owner`)
- **`group_members`:** (`group_id`, `user_id`) PK
- **`series`:** stable `id`, `round`, **`team_home` / `team_away`** (use **BallDontLie-style abbreviations**, e.g. `BOS`, `LAL` — must match bets and API), wins, `status`, `series_winner_id`, **`game_1_start_time`**
- **`games`:** id (BallDontLie game id), `series_id`, `game_number`, scores, `status`, `start_time`, **`home_team_abbrev`**, **`visitor_team_abbrev`** (arena home/visitor for win counting) — **playoff / bracket scope only**
- **`league_games`:** id (BallDontLie game id), `season`, `postseason`, scores, `status`, `start_time`, team abbrevs — **full schedule mirror** (regular + postseason) for sync verification and home-page “next 7 days” (UTC)
- **`bets`:** user, series, predictions, `is_exact_hit`, `points_awarded`
- **`global_bets`:** user, `bet_type`, `prediction`, `points_awarded`

**RLS (implemented):** Policies enforce own-row writes; peer **SELECT** on `bets` only for same-group members after **`series.game_1_start_time`**; **`global_bets`** peer visibility after **`global_lock_time()`** (min `game_1_start_time` for `round = 1`). **INSERT/UPDATE** on **`bets`** allowed only while **`now() < game_1_start_time`** for that series (and **`game_1_start_time` must be set** — null treats series as locked for writes). **INSERT/UPDATE** on **`global_bets`** allowed while **`global_lock_time()`** is null or **`now() < global_lock_time()`**. **`profiles` UPDATE:** own row only; **`favorite_group_id`** must be null or a **`group_members`** row for the current user. **`series`**, **`games`**, and **`league_games`** readable by **anon** (landing) and **authenticated** (read-only).

**DB RPCs (public):** `create_group_with_owner(p_name, p_invite)`, `get_group_by_invite_code(p_invite)`, **`rename_group(p_group_id, p_name)`**, **`set_group_invite_code(p_group_id, p_invite)`** (creator-only; app retries on unique `invite_code` collision), **`remove_group_member(p_group_id, p_user_id)`** (creator-only; cannot remove self — use leave), **`group_leaderboard(p_group_id)`** (member-only; `SUM(points)` across `bets` + `global_bets`, tie-break `COUNT(is_exact_hit)` on series bets; returns **`username`**, **`first_name`**, **`last_name`** for UI). See `20260409120000_rls_and_triggers.sql`, **`20260418120000_groups_created_by_management.sql`**, **`20260418140000_group_leaderboard.sql`** (body replaced by **`20260418180000_profiles_names_favorite_group.sql`** on fresh applies).

**Sync pipeline (implemented):** `POST /api/sync-nba-data` (with `x-cron-secret`) → fetch **all** games in the date window (BallDontLie — `seasons[]` + `start_date` / `end_date`; see [NBA API](https://nba.balldontlie.io/#nba-api)) → **upsert every game into `league_games`**. If **`series`** is **empty** but the API returns postseason games, sync performs an extra **`GET /nba/v1/games`** with **`postseason=true`** (same season), **inserts** one **`series`** row per distinct two-team matchup (`src/lib/nba/series-from-api-games.ts` — the OpenAPI **`NBAGame`** model has **no** `series` object). Then **playoff path**: match games to **`series`** by abbrevs → upsert **`games`**, recompute wins, settlement → **`seriesAutoInserted`** + **`warnings[]`** in the JSON body. If there are still no **`series`** rows (e.g. before playoffs), playoff path is skipped. **Breadth / `global_bets` settlement** not in this route yet.

**Interpreting a successful JSON response:** `ok: true` means no hard errors. **`leagueGamesUpserted`** counts rows written to **`league_games`**. **`apiGamesFetched`** is BallDontLie’s game count for the query. **`gamesUpserted`** / **`seriesUpdated`** move when playoff games match seeded **`series`**. If **`apiGamesFetched`** is **0**, check **`NBA_SEASON_YEAR`**, the date window, and that the API returns data for that range. Home page lists **`league_games`** with `start_time` in the **next 7 days (UTC)**.

---

## Reference schema (from [`my-app/supabase/scheme.sql`](../my-app/supabase/scheme.sql))

**Sync rule:** The file **`my-app/supabase/scheme.sql`** is the editable **reference DDL** for contributors (Supabase warns it is not meant to be run as a single script). Whenever migrations add or change **public** tables or columns, update **`scheme.sql`** and **replace the fenced block below** with the same content so this doc stays aligned (same change or immediately after — same bar as `project-context-sync` for data model drift).

```sql
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.bets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  series_id integer NOT NULL,
  predicted_winner_id text NOT NULL,
  predicted_games smallint NOT NULL CHECK (predicted_games >= 4 AND predicted_games <= 7),
  is_exact_hit boolean NOT NULL DEFAULT false,
  points_awarded integer NOT NULL DEFAULT 0,
  CONSTRAINT bets_pkey PRIMARY KEY (id),
  CONSTRAINT bets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT bets_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.series(id)
);
CREATE TABLE public.games (
  id integer NOT NULL,
  series_id integer NOT NULL,
  game_number smallint NOT NULL CHECK (game_number >= 1 AND game_number <= 7),
  home_score smallint,
  away_score smallint,
  status text NOT NULL DEFAULT 'scheduled'::text,
  start_time timestamp with time zone,
  home_team_abbrev text,
  visitor_team_abbrev text,
  CONSTRAINT games_pkey PRIMARY KEY (id),
  CONSTRAINT games_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.series(id)
);
CREATE TABLE public.global_bets (
  user_id uuid NOT NULL,
  bet_type text NOT NULL,
  prediction text NOT NULL,
  points_awarded integer NOT NULL DEFAULT 0,
  CONSTRAINT global_bets_pkey PRIMARY KEY (user_id, bet_type),
  CONSTRAINT global_bets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.group_members (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT group_members_pkey PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.league_games (
  id integer NOT NULL,
  season integer NOT NULL,
  postseason boolean NOT NULL DEFAULT false,
  start_time timestamp with time zone,
  status text NOT NULL DEFAULT 'scheduled'::text,
  home_score smallint,
  away_score smallint,
  home_team_abbrev text,
  visitor_team_abbrev text,
  CONSTRAINT league_games_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  avatar_url text,
  first_name text,
  last_name text,
  favorite_group_id uuid,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_favorite_group_id_fkey FOREIGN KEY (favorite_group_id) REFERENCES public.groups(id) ON DELETE SET NULL
);
CREATE TABLE public.series (
  id integer NOT NULL,
  round smallint NOT NULL CHECK (round >= 1 AND round <= 4),
  team_home text NOT NULL,
  team_away text NOT NULL,
  home_wins smallint NOT NULL DEFAULT 0,
  away_wins smallint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled'::text,
  series_winner_id text,
  game_1_start_time timestamp with time zone NOT NULL,
  CONSTRAINT series_pkey PRIMARY KEY (id)
);
```

---

## Authentication (current behavior)

- **Provider:** **Email + password only** (no Google/social in UI).
- **Pages:** `/login`, `/signup` (both support **`?next=`** for return URL; links between login/signup preserve `next`).
- **Session:** `@supabase/ssr`; **`middleware.ts`** calls `updateSession` so JWT refresh runs on matched routes.
- **Protection:** Routes under **`/dashboard`** require a user; otherwise redirect to **`/login?next=…`**. Signed-in users hitting **`/login`** or **`/signup`** are redirected to **`/dashboard`**. Session cookies are copied onto redirect responses when possible.
- **Email confirmation:** Signup **`emailRedirectTo`** includes **`/auth/callback?next=…`** (encoded). Callback validates `next` (must start with `/`).
- **Sign out:** Server action in **`auth/actions.ts`** clears session and redirects to **`/login`**.

**Supabase dashboard:** Enable **Email** provider; add redirect URLs for **`…/auth/callback`** for each deployed origin.

---

## Groups & invites (current behavior)

- **Identifiers:** **`groups.id`** is an internal UUID (database primary key). **`invite_code`** is the short, unique token in URLs (`/join/[invite_code]`). People share the **join link** (origin + path + code), not the UUID.
- **`POST /api/groups`** (JSON `{ "name": string }`, session required): creates group with random **`invite_code`**, sets **`created_by`**, adds creator to **`group_members`** via RPC `create_group_with_owner` (retries on invite collision).
- **In-app create:** **`/dashboard/groups/new`** — same RPC via server action; sets **`active_group_id`** cookie and redirects to **`/dashboard/groups/[groupId]`**.
- **`/dashboard/groups`:** Lists groups the user belongs to; links to each **group home**.
- **Group home** **`/dashboard/groups/[groupId]`:** **`PageContainer wide`**; **← All groups**; **Active group** **`Card`** when user is in **2+ groups** (`GroupSwitcher` + `loadUserGroupsForSwitcher`); hero **Card**; **standings** / **invite** / **members**; technical id under **`<details>`**. Header has **no** active-group control. Join URL still needs **`NEXT_PUBLIC_SITE_URL`** or correct forwarded headers in production.
- **Peer picks** **`/dashboard/groups/[groupId]/members/[userId]`:** Read-only series + tournament picks visible to the viewer under existing **RLS** (locks / same group).
- **`/join/[invite_code]`:** Resolves group via **`get_group_by_invite_code`**; invalid code → 404. Logged-out users get login/signup with **`next`** back to join URL. Logged-in users submit join → **`group_members`** insert; duplicate PK → still sets **active group** cookie and redirects to **group home**. Successful join does the same.
- **Multi-group context:** HttpOnly cookie **`active_group_id`** (must be a group the user is in). **`GroupSwitcher`** lives on **group home** only, and only when the user belongs to **more than one** group. Other routes rely on the cookie without header UI. **`/dashboard/bets`** may note the active group in copy where relevant.

---

## Implementation status vs `execution_plan.md`

| Phase | Status | Notes |
|-------|--------|--------|
| **P1 — Env & core infra** | **Done** | Next app in `my-app/`, Tailwind, Supabase clients, **email auth**, **middleware**, **`/login` / `/signup` / `/dashboard`**, auth callback + error page. |
| **P2 — DB & security** | **Done** | Migrations: schema + **RLS**, profile trigger, **`POST /api/groups`**, **`/join/[invite_code]`**, **`npm run db:apply`** runs all `migrations/*.sql` in order. |
| **P3 — Sync engine** | **Done** | BallDontLie client, **`/api/sync-nba-data`**, service-role admin client, series/game upsert + settlement, migration for game abbrevs, **`.github/workflows/sync-nba-data.yml`**. **Breadth bet auto-scoring** still future work. |
| **P4 — Betting UI** | **Done** | **`/dashboard/bets`**: tournament picks (`global_bets`: Champion, MVP, East/West conference) + per-series picks (`bets`); locks enforced in UI and **RLS** (`20260410120000_bet_lock_rls.sql`). Apply migration on hosted DB with **`npm run db:apply`**. |
| **P5 — Dashboard & social** | **Done** | **`/dashboard/bracket`** (`PlayoffBracket` + `SeriesGameLog` + **`bracket-fallback`**); group home **leaderboard** via **`group_leaderboard`**; **`/dashboard/groups/[groupId]/members/[userId]`** peer picks (RLS). Apply **`20260418140000_group_leaderboard.sql`** (`npm run db:apply`). Round-scoped standings + realtime/SWR: future. |
| **P6 — Groups (create & manage)** | **Done** | Dashboard **layout** + **`/dashboard/groups`**, **`/dashboard/groups/new`**, **`/dashboard/groups/[groupId]`**; creator **`created_by`** + RPCs rename / set invite / remove member; **active_group_id** cookie + switcher; join flow lands on group home. Apply **`20260418120000`**, **`20260418150000`**, **`20260418160000`** (optional if already applied), **`20260418170000`** (`group_members` SELECT via `same_group` — fixes infinite recursion) via `npm run db:apply`. |
| **P7 — Polish** | **Partial** | **UI redesign (2026):** semantic tokens in `globals.css`, `components/ui/*`, mobile-first home/auth/join/dashboard/groups/bets, series **game log** on My bets, inline copy feedback (no `alert` for clipboard / group switcher). **`/dashboard/settings`** profile (names, username, favorite group). Apply **`20260418180000_profiles_names_favorite_group.sql`** (`npm run db:apply`) for `profiles` columns, favorite RLS, and updated **`group_leaderboard`** signature. Realtime/SWR still future. |

---

## UX anchors (target — not all built)

- **`/dashboard/bets`:** My bets — tournament form + series cards (open/locked), empty state when no `series` rows.
- **`/dashboard/bracket`:** Playoff bracket (DB `series` preferred; else derived postseason matchups), expandable game log per series.
- **Group home:** Leaderboard + links to each member’s visible picks.
- **`/join/[invite_code]`:** join → `group_members` → group home + active group cookie.
- **Groups:** `/dashboard/groups`, create, group home with invite UX (Phase 6).
- **`/dashboard/settings`:** first name, family name, username, favorite group (and active cookie when favorite is set); optional **`avatar_url`** via TestingBot random avatars (“New random avatar”; https://testingbot.com/free-online-tools/free-avatar-generator).
- Login/signup; middleware protects **`/dashboard/*`**.
- Mobile-friendly bracket; optional realtime for leaderboard (later phases).
- **Design system:** See `docs/app_design_guidelines.md` and `my-app/src/components/ui/` + `globals.css` for tokens and primitives.
- **Brand / team marks:** `public/nba.png` (site + browser tab via `metadata.icons`), `public/nba logos/*.svg`, [`my-app/src/lib/nba/team-logos.ts`](../my-app/src/lib/nba/team-logos.ts), UI [`SiteLogo`](../my-app/src/components/ui/site-logo.tsx) / [`TeamLogo`](../my-app/src/components/ui/team-logo.tsx).

---

## Conventions for contributors / AI

- Prefer **existing** stack and tables; avoid new paid services unless explicitly agreed.
- **Respect API budget:** keep BallDontLie calls server-side; use **`SYNC_DATE_WINDOW_DAYS`** and pagination — don’t call the API from the browser.
- **Security:** Sync route (Phase 3) must be **server-only** and protected (secret header / cron secret); **service role** for DB writes that bypass RLS.
- **Spec drift:** If code and docs disagree, **fix code or docs in the same change** and note which is authoritative.
- **Working directory:** Run **`cd my-app`** before `npm run dev`, `npm run build`, or `npm run db:apply`.
- **Project context:** After changes that affect features, file layout, env vars, or phase status, **update `docs/project_context.md`** (see Cursor rule `project-context-sync`).
- **Reference DDL:** If **`public`** tables/columns change in migrations, update **`my-app/supabase/scheme.sql`** and the **§ Reference schema** SQL block in this file together.

---

*Last updated: 2026-04-18 — **Home (`/`):** schedule grouped by date; removed series-count block and redundant signed-in blurb. **Settings:** TestingBot random `avatar_url` + `profile-avatar-block`. **`/dashboard/settings`**, `profiles` names + `favorite_group_id`, `resolveActiveGroupId` uses favorite, `group_leaderboard` returns optional names. **Header:** no active-group UI. **Group home:** `GroupSwitcher` in-page when 2+ groups.*
