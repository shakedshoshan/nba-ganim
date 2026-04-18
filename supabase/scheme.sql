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