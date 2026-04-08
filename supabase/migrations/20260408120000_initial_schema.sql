-- NBA Playoff Challenge — core tables (see docs/Technical_specification.md).
-- Run via Supabase SQL editor or `supabase db push` after linking the project.
-- Row Level Security policies belong in Phase 2 (docs/execution_plan.md Task 2.2).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  avatar_url text
);

create table public.groups (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (group_id, user_id)
);

create table public.series (
  id integer primary key,
  round smallint not null check (round between 1 and 4),
  team_home text not null,
  team_away text not null,
  home_wins smallint not null default 0,
  away_wins smallint not null default 0,
  status text not null default 'scheduled',
  series_winner_id text,
  game_1_start_time timestamptz not null
);

create table public.games (
  id integer primary key,
  series_id integer not null references public.series (id) on delete cascade,
  game_number smallint not null check (game_number between 1 and 7),
  home_score smallint,
  away_score smallint,
  status text not null default 'scheduled',
  start_time timestamptz
);

create index games_series_id_idx on public.games (series_id);

create table public.bets (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.profiles (id) on delete cascade,
  series_id integer not null references public.series (id) on delete cascade,
  predicted_winner_id text not null,
  predicted_games smallint not null check (predicted_games between 4 and 7),
  is_exact_hit boolean not null default false,
  points_awarded integer not null default 0,
  unique (user_id, series_id)
);

create index bets_user_id_idx on public.bets (user_id);
create index bets_series_id_idx on public.bets (series_id);

create table public.global_bets (
  user_id uuid not null references public.profiles (id) on delete cascade,
  bet_type text not null,
  prediction text not null,
  points_awarded integer not null default 0,
  primary key (user_id, bet_type)
);
