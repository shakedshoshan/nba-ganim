-- League-wide schedule mirror from BallDontLie (regular + postseason).
-- Populated by sync; public read for landing / schedule UI. Playoff `games` stay series-scoped.

create table if not exists public.league_games (
  id integer primary key,
  season integer not null,
  postseason boolean not null default false,
  start_time timestamptz,
  status text not null default 'scheduled',
  home_score smallint,
  away_score smallint,
  home_team_abbrev text,
  visitor_team_abbrev text
);

create index if not exists league_games_start_time_idx
  on public.league_games (start_time);

alter table public.league_games enable row level security;

drop policy if exists "league_games_select_authenticated" on public.league_games;
create policy "league_games_select_authenticated"
  on public.league_games for select
  to authenticated
  using (true);

drop policy if exists "league_games_select_anon" on public.league_games;
create policy "league_games_select_anon"
  on public.league_games for select
  to anon
  using (true);
