-- Phase 2: profiles bootstrap, helpers, RLS (see docs/execution_plan.md).
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER reads membership without RLS recursion issues)
-- ---------------------------------------------------------------------------
create or replace function public.same_group(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm1
    inner join public.group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = a and gm2.user_id = b
  );
$$;

create or replace function public.global_lock_time()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select min(s.game_1_start_time) from public.series s where s.round = 1;
$$;

-- ---------------------------------------------------------------------------
-- New auth users → profiles row (FK targets for bets, group_members, etc.)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_name text;
  final_name text;
begin
  base_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''),
    'player'
  );
  final_name := base_name || '_' || left(replace(new.id::text, '-', ''), 12);

  insert into public.profiles (id, username, avatar_url)
  values (new.id, final_name, null)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- One-time backfill for users created before this migration
insert into public.profiles (id, username, avatar_url)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'username'), ''),
    nullif(trim(split_part(coalesce(u.email, ''), '@', 1)), ''),
    'player'
  ) || '_' || left(replace(u.id::text, '-', ''), 12),
  null
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.series enable row level security;
alter table public.games enable row level security;
alter table public.bets enable row level security;
alter table public.global_bets enable row level security;

-- profiles
drop policy if exists "profiles_select_self_or_groupmate" on public.profiles;
create policy "profiles_select_self_or_groupmate"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or public.same_group((select auth.uid()), id)
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- groups
drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member"
  on public.groups for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = (select auth.uid())
    )
  );

drop policy if exists "groups_insert_authenticated" on public.groups;
create policy "groups_insert_authenticated"
  on public.groups for insert
  to authenticated
  with check (true);

-- group_members
drop policy if exists "group_members_select_same_group" on public.group_members;
create policy "group_members_select_same_group"
  on public.group_members for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = (select auth.uid())
    )
  );

drop policy if exists "group_members_insert_self" on public.group_members;
create policy "group_members_insert_self"
  on public.group_members for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "group_members_delete_self" on public.group_members;
create policy "group_members_delete_self"
  on public.group_members for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- series & games (read-only for clients; sync uses service role)
drop policy if exists "series_select_authenticated" on public.series;
create policy "series_select_authenticated"
  on public.series for select
  to authenticated
  using (true);

drop policy if exists "games_select_authenticated" on public.games;
create policy "games_select_authenticated"
  on public.games for select
  to authenticated
  using (true);

-- Public read for landing / bracket shell (no user session)
drop policy if exists "series_select_anon" on public.series;
create policy "series_select_anon"
  on public.series for select
  to anon
  using (true);

drop policy if exists "games_select_anon" on public.games;
create policy "games_select_anon"
  on public.games for select
  to anon
  using (true);

-- bets
drop policy if exists "bets_select_visible" on public.bets;
create policy "bets_select_visible"
  on public.bets for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      public.same_group((select auth.uid()), user_id)
      and exists (
        select 1 from public.series s
        where s.id = bets.series_id
          and now() >= s.game_1_start_time
      )
    )
  );

drop policy if exists "bets_insert_own" on public.bets;
create policy "bets_insert_own"
  on public.bets for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "bets_update_own" on public.bets;
create policy "bets_update_own"
  on public.bets for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- global_bets
drop policy if exists "global_bets_select_visible" on public.global_bets;
create policy "global_bets_select_visible"
  on public.global_bets for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      public.same_group((select auth.uid()), user_id)
      and public.global_lock_time() is not null
      and now() >= public.global_lock_time()
    )
  );

drop policy if exists "global_bets_insert_own" on public.global_bets;
create policy "global_bets_insert_own"
  on public.global_bets for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "global_bets_update_own" on public.global_bets;
create policy "global_bets_update_own"
  on public.global_bets for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant execute on function public.same_group(uuid, uuid) to authenticated;
grant execute on function public.global_lock_time() to authenticated;

-- Create group + membership in one transaction (avoids SELECT-before-member RLS gap)
create or replace function public.create_group_with_owner(p_name text, p_invite text)
returns table (group_id uuid, invite_code text, group_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
  ic text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.groups (name, invite_code)
  values (p_name, p_invite)
  returning id, invite_code into new_id, ic;

  insert into public.group_members (group_id, user_id)
  values (new_id, uid);

  return query select new_id, ic, p_name;
end;
$$;

grant execute on function public.create_group_with_owner(text, text) to authenticated;

-- Join landing: preview group without being a member yet (no full table scan)
create or replace function public.get_group_by_invite_code(p_invite text)
returns table (group_id uuid, group_name text)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.name
  from public.groups g
  where g.invite_code = p_invite
  limit 1;
$$;

grant execute on function public.get_group_by_invite_code(text) to anon, authenticated;
