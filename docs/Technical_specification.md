# Technical Specification: NBA Playoff Challenge (Zero-Cost Stack)

## 1. Tech Stack (Zero-Dollar Architecture)
* **Framework:** Next.js 16+ (App Router) with TypeScript, React 19, Tailwind CSS 4.
* **Deployment:** Vercel (Free Tier).
* **Database & Auth:** Supabase (PostgreSQL Free Tier).
* **Automation (Cron):** GitHub Actions → `POST /api/sync-nba-data` with a shared secret (schedule as configured in the repo workflow; server-side date window + pagination to respect API limits).
* **Data Source:** [BallDontLie NBA API](https://www.balldontlie.io/openapi/nba.yml) (API key; rate limits per account tier — sync uses a narrow date window + pagination).

Canonical layout, env vars, and migration filenames: **`docs/project_context.md`** (application code under **`my-app/`**).

## 2. Database Schema (PostgreSQL)

### 2.1 Table: `profiles`
* `id`: `uuid` (Primary Key, references `auth.users`).
* `username`: `text` (Unique).
* `avatar_url`: `text` (optional; app may store a [TestingBot random avatar](https://testingbot.com/free-online-tools/free-avatar-generator) URL, e.g. `https://testingbot.com/free-online-tools/random-avatar/160?u=…`).
* `first_name`, `last_name`: `text` (optional display names).
* `favorite_group_id`: `uuid` (nullable; references `groups.id` — must be a group the user belongs to; enforced in RLS on update).

### 2.2 Table: `groups`
* `id`: `uuid` (Primary Key).
* `name`: `text`.
* `invite_code`: `text` (Unique slug for joining via link).
* `created_at`: `timestamptz`.
* `created_by`: `uuid` (nullable; references `profiles.id` — group creator for rename, invite rotation, and removing other members; set by `create_group_with_owner` for new groups).

### 2.3 Table: `group_members` (Pivot Table)
* `group_id`: `uuid` (FK to `groups`).
* `user_id`: `uuid` (FK to `profiles`).
* Primary Key: (`group_id`, `user_id`).

### 2.4 Table: `series` (The Matchup)
* `id`: `int4` (Primary Key, from NBA API).
* `round`: `int2` (1-4).
* `team_home`: `text`, `team_away`: `text`.
* `home_wins`: `int2` (Default: 0).
* `away_wins`: `int2` (Default: 0).
* `status`: `text` ('scheduled', 'in_progress', 'finished').
* `series_winner_id`: `text` (null until finished).
* `game_1_start_time`: `timestamptz` (tip-off of Game 1 for this series — **series lock** trigger; must be set for open betting in the app/RLS).

### 2.5 Table: `games` (Playoff games per series)
Bracket-scoped rows only: each row is one game in a playoff **series**. Populated when sync matches BallDontLie games to a seeded **`series`** (by team abbreviations). Regular-season games are **not** stored here.

* `id`: `int4` (Primary Key — BallDontLie game id).
* `series_id`: `int4` (Foreign Key to `series`).
* `game_number`: `int2` (1-7).
* `home_score`: `int2`, `away_score`: `int2` (arena-relative).
* `status`: `text` (e.g. `'finished'`, `'live'`, `'scheduled'`).
* `start_time`: `timestamptz`.
* `home_team_abbrev`: `text`, `visitor_team_abbrev`: `text` — arena home/visitor abbreviations (used with scores to attribute wins to **`series.team_home`** / **`series.team_away`**; not redundant with series labels because “home” in the arena may differ from **`team_home`** on the bracket).

### 2.6 Table: `league_games` (Full schedule mirror)
League-wide mirror of BallDontLie games (regular season + playoffs). Upserted on every sync for schedule/scores visibility (e.g. landing page “next games”). Rows are **not** tied to **`series`**.

* `id`: `int4` (Primary Key — BallDontLie game id).
* `season`: `int4`.
* `postseason`: `boolean`.
* `start_time`: `timestamptz`.
* `status`: `text`.
* `home_score`: `int2`, `away_score`: `int2`.
* `home_team_abbrev`: `text`, `visitor_team_abbrev`: `text`.

### 2.7 Table: `bets`
* `id`: `uuid` (Primary Key).
* `user_id`: `uuid` (FK to `profiles`).
* `series_id`: `int4` (FK to `series`).
* `predicted_winner_id`: `text` (must match **`series.team_home`** or **`series.team_away`** abbreviation).
* `predicted_games`: `int2` (4-7).
* `is_exact_hit`: `boolean` (Default: false).
* `points_awarded`: `int4` (Default: 0).
* **Unique:** (`user_id`, `series_id`) — one pick per user per series.

### 2.8 Table: `global_bets` (Breadth Bets)
* `user_id`: `uuid` (FK to `profiles`).
* `bet_type`: `text` (e.g. `Champion`, `MVP`, `EastChampion`, `WestChampion` in the shipped UI).
* `prediction`: `text`.
* `points_awarded`: `int4` (Default: 0).
* **Primary Key:** (`user_id`, `bet_type`).

### 2.9 Row-level security (summary)
Implemented in Supabase migrations (see **`my-app/supabase/migrations/`**). Highlights:

* **`bets` / `global_bets`:** Users insert/update **only their own** rows. **Series bets:** writes allowed only while **`now() < series.game_1_start_time`** and **`game_1_start_time` is not null**. **Global bets:** writes allowed while **`global_lock_time()`** is null or **`now() < global_lock_time()`**, where **`global_lock_time()`** = minimum **`game_1_start_time`** among **`series`** with **`round = 1`**.
* **Peer visibility:** Others in the same group may **select** a user’s **`bets`** only after that series’ **`game_1_start_time`**; **`global_bets`** only after global lock time (same **`global_lock_time()`** rule as for visibility policies).
* **`series`**, **`games`**, **`league_games`:** readable by authenticated users; **`series`**, **`games`**, **`league_games`** also readable by **anon** for public/landing views. Sync uses the **service role** where writes bypass RLS.

## 3. Core Logic & Automation

### 3.1 Data Sync Workflow (The Cron Job)
* **Task:** A GitHub Action (or manual call) `POST`s `/api/sync-nba-data` with a shared secret header.
* **Logic (high level):**
    1.  Fetch games from BallDontLie for a configurable **UTC date window** (`seasons[]` + `start_date` / `end_date`; not postseason-filtered at the API).
    2.  **Upsert all fetched games into `league_games`** (full schedule mirror).
    3.  If **`series`** has rows, **playoff path:** match API games to **`series`** by team abbreviations → upsert **`games`**, recompute **`series.home_wins` / `series.away_wins`** from finished rows using **`home_team_abbrev` / `visitor_team_abbrev`**. If **`series`** is empty, skip this path (sync still succeeds for **`league_games`**).
    4.  If a team reaches 4 wins in a series:
        * Set `series.status = 'finished'`.
        * Set `series.series_winner_id`.
        * Run **settlement** for **`bets`** on that series (idempotent scoring).

### 3.2 Points Settlement
* When a series is 'finished':
    1.  Award base points if `bet.predicted_winner_id == series.series_winner_id`.
    2.  Award bonus points and set `is_exact_hit = true` if `bet.predicted_games == total_games_played`.
* Points are calculated based on the `series.round` multiplier.

### 3.3 Visibility & Privacy Rules
* **Strict Privacy:** Predictions of other users are hidden by RLS until the relevant lock: **`bets`** until **`series.game_1_start_time`** for that bet’s series; **`global_bets`** until **`global_lock_time()`** (minimum **`game_1_start_time`** over **`series`** where **`round = 1`**), matching product “first Round 1 tip-off.”
* **Write locks:** Same thresholds enforce **INSERT/UPDATE** on **`bets`** and **`global_bets`** (see §2.9).

## 4. Ranking & Leaderboard (SQL Logic)
The system calculates the leaderboard dynamically using:
1.  `SUM(points_awarded) DESC` (Primary) — aggregate across **`bets`** and **`global_bets`** (and any future scored entities).
2.  `COUNT(is_exact_hit) FILTER (WHERE is_exact_hit = true) DESC` (Tie-breaker) — today **`is_exact_hit`** exists on **`bets`** only; breadth rows contribute via **`points_awarded`**.
3.  **RPC `group_leaderboard(p_group_id)`** (authenticated member-only): returns each member’s **`user_id`**, **`username`**, optional **`first_name`** / **`last_name`** from **`profiles`**, plus **`total_points`** and **`exact_hits`**.

## 5. UI/UX Requirements
* **Group View:** Summary of rankings within the current group.
* **Series Card:** Displays live series score (e.g., "BOS leads 2-1") + User's own prediction.
* **Game Log:** Expandable list of all individual games and their scores within a series.
* **Join Flow:** Simple landing page for users joining via `/join/[invite_code]`.