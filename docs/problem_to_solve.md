# Problems to solve later

We follow `docs/execution_plan.md` in order, then work through this list. Explanations stay short on purpose.

---

1. **`games` vs `league_games` — why two tables?**  
   - **`league_games`** holds the wide NBA schedule we get from the API (regular season + playoffs). We use it for sync and for the home page (“games in the next few days”).  
   - **`games`** holds only playoff games that belong to a row in **`series`**. We use those rows to update wins and to settle **series** bets.  
   - **What’s wrong today:** It’s easy to confuse the two names. Later we can make that clearer in the product or in naming/docs.

2. **Series bet can still show “Open” when the series is already playing or finished**  
   - The app and database lock use **`game_1_start_time`** vs “now”. They do **not** look at **`series.status`** (for example `in_progress` or `finished`).  
   - If the stored tip-off time is wrong, you can still see **Open** even though the score line already shows a live or finished series.  
   - **Fix later:** Treat non-scheduled status as locked, and/or drive the lock from real game times in **`games`** so the UI always matches reality.

3. **Tournament (global) bets are not auto-scored in sync**  
   - When a playoff series ends, the sync path can score **series** **`bets`**. It does **not** yet award points for **`global_bets`** (champion, MVP, conference winners, etc.) when those outcomes are known.

4. **Leaderboard, bracket, and “see other people’s picks”**  
   - The spec describes standings, a bracket view, and peer inspection after lock. None of that UI is built yet (roughly execution plan phase 5). RLS may already allow some reads after lock, but users have nowhere in the app to use it.
