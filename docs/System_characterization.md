# Functional Specification: NBA Playoff Series Challenge

## 1. Overview
A competitive social platform for NBA Playoff betting. Users join private groups via a shared link to predict the outcomes of playoff series and overall tournament results. The system operates autonomously, updating standings based on real-world NBA results.

**Data model (tables, RLS, sync):** See **`docs/project_context.md`** and **`docs/Technical_specification.md`** §2. In brief: playoff box scores and bracket progress live in **`games`** (per **`series`**); a separate **`league_games`** table mirrors the wider NBA schedule from the sync job for schedule/score views.

## 2. Game Structure
The competition consists of two distinct betting categories:

### 2.1 Series Bets
For every individual playoff matchup (from Round 1 through the NBA Finals), users must submit:
* **Series Winner:** The team predicted to advance to the next round.
* **Series Duration:** The exact number of games the series will last (4, 5, 6, or 7).

### 2.2 Breadth Bets (Global Predictions)
High-level predictions made once at the start of the tournament.
* **Scope:** Includes predictions such as NBA Champion, Finals MVP, and Western/Eastern Conference Winners.
* **Timeline:** These are submitted and locked before the start of the entire post-season.
* **Storage:** One row per user per **`bet_type`** in **`global_bets`** (composite primary key); the shipped app uses types such as Champion, MVP, East champion, and West champion (see **`docs/project_context.md`** / **`my-app/src/lib/bets/constants.ts`**).

## 3. Betting Windows & Locking Logic
Strict timing is enforced to maintain the integrity of the competition.

### 3.1 The Global Lock
* **Trigger (product):** The official tip-off of the **first Round 1 playoff game**.
* **Trigger (database):** The minimum **`game_1_start_time`** among all **`series`** rows with **`round = 1`** (SQL helper **`global_lock_time()`**). This matches “first Round 1 series Game 1” once those rows are seeded with tip times; it is **not** read from the **`games`** table.
* **Effect:** All **Breadth Bets** are locked. No further entries or modifications are permitted (enforced in the UI and by **RLS** on **`global_bets`**).

### 3.2 The Series Lock
* **Trigger:** The official tip-off time of **Game 1 of a specific series**, stored as **`series.game_1_start_time`**.
* **Effect:** The bet for that specific series is locked.
* **Editability:** Users can modify their predictions as many times as they want **until** the lock is triggered for that specific series (enforced in the UI and by **RLS** on **`bets`**; if **`game_1_start_time`** is missing, writes are denied so picks stay closed).

### 3.3 Privacy & Visibility
* **Pre-Lock:** A user's bet is strictly private. Other group members cannot see it (**RLS** on **`bets`** / **`global_bets`**).
* **Post-Lock:** Once a series or global item has passed its lock time, all participants' predictions for that item become visible to **other members of the same group** (not the public internet).

## 4. Scoring System
The scoring is cumulative and rewards both general accuracy and precise predictions.

### 4.1 Points per Round
The value of a correct "Winner" prediction increases each round:
* **Round 1:** Base points.
* **Conference Semifinals:** Increased points.
* **Conference Finals:** Higher points.
* **NBA Finals:** Maximum points.

### 4.2 Exact Score Bonus
Users receive additional bonus points if they correctly predict the **exact number of games** in a series, provided they also correctly identified the winning team.

### 4.3 Breadth Bet Rewards
Fixed point values are awarded for each correct global prediction upon the conclusion of the tournament (e.g., when the Finals MVP is announced).

## 5. Leaderboard & Ranking Rules
The leaderboard provides a real-time ranking of all participants in a group.

### 5.1 Sorting & Tie-Breaking
1.  **Primary Metric:** Total Cumulative Points (Series Points + Bonus Points + Breadth Points).
2.  **Tie-Breaker:** In the event of a tie in total points, the user with the **highest number of "Exact Score" hits** (correct winner + correct duration) is ranked higher.

### 5.2 Dynamic Views
The system must support:
* **Overall Standings:** Total points accumulated throughout the playoffs.
* **Round-by-Round Standings:** Points earned specifically within a selected round (Round 1, Round 2, etc.).

## 6. User Experience Flow
1.  **Joining:** User enters a group via a unique invitation link (`/join/[invite_code]`).
2.  **Betting hub:** Signed-in users manage picks from **My bets** (`/dashboard/bets`): tournament (**`global_bets`**) and per-series (**`bets`**) forms, with open/locked states driven by lock rules in §3.
3.  **Initial betting:** User completes breadth bets and any available Round 1 series bets before the global lock.
4.  **Ongoing participation:** As teams advance and new series are determined, they become open for betting until their respective Game 1 starts.
5.  **Automated updates:** When a series concludes (a team reaches 4 wins), the sync/settlement path updates **`series`**, **`games`**, and series **`bets`** scoring; leaderboard UI is planned in a later phase.