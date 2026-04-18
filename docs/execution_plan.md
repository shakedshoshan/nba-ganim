# Development Roadmap: NBA Playoff Challenge (Cursor-Optimized)

## Phase 1: Environment & Core Infrastructure
**Goal:** Establish the foundation and connect the free-tier services.

* **Task 1.1: Project Initialization**
    * Initialize a Next.js 14+ project with TypeScript, Tailwind CSS, and App Router.
    * Set up the basic folder structure (`/components`, `/lib`, `/app/api`).
* **Task 1.2: Supabase Integration**
    * Configure Supabase client in `/lib/supabase.ts`.
    * Set up `.env.local` for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
* **Task 1.3: User Authentication**
    * Implement Supabase Auth (Email or Google).
    * Create `/login` and `/signup` pages.
    * Create a `middleware.ts` file to protect dashboard routes.

## Phase 2: Database & Security (The SQL Layer)
**Goal:** Build the schema and ensure user privacy for hidden bets.

* **Task 2.1: Schema Execution**
    * Run the SQL provided in `NBA_PLAYOFF_SPEC.md` within the Supabase SQL editor.
    * Ensure all tables (`profiles`, `groups`, `series`, `games`, `bets`, `global_bets`) are created.
* **Task 2.2: Row Level Security (RLS)**
    * Set up policies: Users can only see other users' bets in their `group` **IF** the current time is past the series `game_1_start_time`.
    * Users can only insert/update their own bets.
* **Task 2.3: Group & Invite Logic**
    * Create API to generate a unique `invite_code` for a group.
    * Build the `/join/[invite_code]` route to link a user to a group via the `group_members` table.

## Phase 3: Automated Data Engine (The "Sync")
**Goal:** Set up the automated updates for scores and points.

* **Task 3.1: NBA API Client**
    * Create a utility to fetch data from [BallDontLie NBA API](https://www.balldontlie.io/openapi/nba.yml) (`GET /nba/v1/games`, postseason + date/season filters, cursor pagination).
    * Implement logic to fetch results for a configurable date window (not only a single day).
* **Task 3.2: Sync API Route**
    * Build `/api/sync-nba-data`. 
    * **Logic:** Update `games` table -> Calculate `series` wins -> If series is finished (4 wins), set `series.status = 'finished'`.
* **Task 3.3: Automated Scoring Logic**
    * When a series is marked 'finished', trigger a function to calculate points for all relevant `bets`.
    * Apply the "Exact Score" bonus logic and update the `is_exact_hit` boolean.
* **Task 3.4: GitHub Action Setup**
    * Create `.github/workflows/sync-nba-data.yml` to `POST` the sync route hourly during the NBA season (secrets: `SYNC_API_URL`, `CRON_SECRET`).

## Phase 4: The Betting Experience
**Goal:** Build the interface where users interact with the game.

* **Task 4.1: Series Betting Component**
    * Create a UI for selecting a winner and the number of games (4-7).
    * Implement the "Lock" check: if `now > game_1_start_time`, disable inputs.
* **Task 4.2: Breadth Bets Form**
    * Create a specific UI for tournament-wide bets (Champion, MVP).
    * Apply the Global Lock (first game of Round 1).
* **Task 4.3: Bet History & Editing**
    * Allow users to view and update their pending bets from a central "My Bets" area.

## Phase 5: Dashboard & Social Features
**Goal:** The competitive visualization of the playoff bracket and standings.

* **Task 5.1: The Bracket**
    * Build a visual representation of the NBA Playoff bracket.
    * Show series progress (e.g., "Boston leads 2-1") pulled from the `series` table.
* **Task 5.2: Game Log View**
    * Implement an expandable section for each series showing the scores of every individual game from the `games` table.
* **Task 5.3: Group Leaderboard**
    * Build the leaderboard table. 
    * **Crucial:** Implement the tie-breaker logic (Total Points first, then count of `is_exact_hit`).
* **Task 5.4: Peer Inspection**
    * Once a series is locked, allow users to click on opponents in the leaderboard to see their specific predictions.

## Phase 6: Groups — Create & Manage
**Goal:** Let users create private groups, share them safely, and manage membership without confusion.

**Database tables (already in schema):**

| Table | Role |
|--------|------|
| **`groups`** | One row per private group: `id` (UUID, internal), `name`, **`invite_code`** (unique, for `/join/...`), `created_at`. |
| **`group_members`** | Who is in which group: composite PK **`(group_id, user_id)`**, both FKs (`groups`, `profiles`). Joining a group inserts here. |
| **`profiles`** | **`user_id`** ↔ `auth.users`; use **`username`** (and optional `avatar_url`) when listing members. |

**Related (no `group_id` on bets today):** **`bets`** and **`global_bets`** are keyed by **`user_id`** only. Competing “inside a group” is enforced by **who shares `group_members`**; a future step may add **`group_id`** to bets or a separate aggregate query for leaderboard-by-group. Phase 6 UI should make the active group explicit anyway.

* **Task 6.1: Create group (product flow)**
    * Add a clear path in the app (e.g. from the dashboard) to **create a group**: name, confirmation, then land on a “your group” view.
    * Wire to the backend (e.g. existing `POST /api/groups` + RPC) so every new group is stored with a **stable primary key** (`groups.id`) and a **human-shareable invite token**.

* **Task 6.2: Unique invite ID per group**
    * Ensure each group has a **unique** `invite_code` (or equivalent) used in `/join/[invite_code]`.
    * Define generation rules (length, character set, avoid ambiguous characters if needed) and **retry on collision** so two groups never share the same code.
    * Document how `groups.id` (internal) differs from `invite_code` (what people copy-paste).

* **Task 6.3: Invite link & sharing**
    * Show the full join URL (origin + path + code), **copy to clipboard**, and short instructions for inviting friends.
    * Optional: **regenerate** invite code (invalidates old links) with a clear warning.

* **Task 6.4: Group management**
    * **Rename** the group (owner or all members — pick one rule and enforce in RLS/API).
    * **List members** (names or emails allowed by privacy rules).
    * **Leave group** for members; optional **remove member** for the creator.

* **Task 6.5: Multi-group clarity**
    * If a user can be in several groups, add a simple **group switcher** or “current group” context so bets and leaderboard always target the right `group_id`.

## Phase 7: Optimization & Polish
**Goal:** Ensure the app feels fast and works perfectly on mobile.

* **Task 7.1: Real-time UI Updates**
    * Use Supabase Real-time or SWR to refresh the leaderboard when points are updated.
* **Task 7.2: Mobile Responsiveness**
    * Optimize the bracket view for mobile screens (vertical layout or horizontal scrolling).
* **Task 7.3: Empty States & Errors**
    * Add "No games tonight" or "Waiting for matchups" states.
    * Handle API failure gracefully (show the last cached result from the DB).