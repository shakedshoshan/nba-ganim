-- Seed `public.series` so POST /api/sync-nba-data can match BallDontLie postseason games.
-- Run in Supabase Dashboard → SQL Editor against the SAME project as Vercel (production).
--
-- Team codes must match BallDontLie (e.g. BOS, LAL). Adjust rows 1001–1002 and 1005–1006
-- after the play-in (April 14–17, 2026) if placeholders no longer match the 7/8 seeds.
--
-- If you already inserted these ids, delete or edit those rows before re-running:
--   delete from public.series where id between 1001 and 1008;

insert into public.series (
  id,
  round,
  team_home,
  team_away,
  home_wins,
  away_wins,
  status,
  series_winner_id,
  game_1_start_time
)
values
  -- East 1 vs 8 (placeholder until 8 seed known)
  (1001, 1, 'DET', 'ORL', 0, 0, 'scheduled', null, '2026-04-18T23:00:00+00'),
  -- East 2 vs 7 (placeholder until 7 seed known)
  (1002, 1, 'BOS', 'PHI', 0, 0, 'scheduled', null, '2026-04-18T23:30:00+00'),
  (1003, 1, 'NYK', 'TOR', 0, 0, 'scheduled', null, '2026-04-19T00:00:00+00'),
  (1004, 1, 'CLE', 'ATL', 0, 0, 'scheduled', null, '2026-04-19T00:30:00+00'),
  -- West 1 vs 8 (placeholder)
  (1005, 1, 'OKC', 'PHX', 0, 0, 'scheduled', null, '2026-04-19T01:00:00+00'),
  -- West 2 vs 7 (placeholder)
  (1006, 1, 'SAS', 'LAC', 0, 0, 'scheduled', null, '2026-04-19T01:30:00+00'),
  (1007, 1, 'DEN', 'MIN', 0, 0, 'scheduled', null, '2026-04-19T02:00:00+00'),
  (1008, 1, 'LAL', 'HOU', 0, 0, 'scheduled', null, '2026-04-19T02:30:00+00');
