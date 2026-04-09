-- Example: seed playoff `series` rows before sync can match BallDontLie games.
-- Team fields must use the same abbreviations as BallDontLie (e.g. BOS, LAL).
--
-- For a full Round 1 template, run in Supabase SQL Editor:
--   scripts/seed-playoff-series.sql

/*
insert into public.series (id, round, team_home, team_away, home_wins, away_wins, status, series_winner_id, game_1_start_time)
values
  (1001, 1, 'BOS', 'NYK', 0, 0, 'scheduled', null, '2026-04-18T23:00:00+00');
*/
