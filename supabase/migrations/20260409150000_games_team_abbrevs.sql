-- Store arena home/visitor abbrevs per game so series wins can be recomputed from DB alone
-- (scores are arena-relative, not series.team_home / team_away).

alter table public.games
  add column if not exists home_team_abbrev text;

alter table public.games
  add column if not exists visitor_team_abbrev text;
