-- Profile display names + favorite group (membership enforced in RLS).

alter table public.profiles
  add column if not exists first_name text;

alter table public.profiles
  add column if not exists last_name text;

alter table public.profiles
  add column if not exists favorite_group_id uuid references public.groups (id) on delete set null;

-- Clear favorite when user leaves that group (avoids stale pointer).
create or replace function public.clear_favorite_group_on_leave()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles p
  set favorite_group_id = null
  where p.id = old.user_id
    and p.favorite_group_id = old.group_id;
  return null;
end;
$$;

drop trigger if exists trg_clear_favorite_group_on_leave on public.group_members;
create trigger trg_clear_favorite_group_on_leave
  after delete on public.group_members
  for each row execute function public.clear_favorite_group_on_leave();

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and (
      favorite_group_id is null
      or exists (
        select 1
        from public.group_members gm
        where gm.group_id = favorite_group_id
          and gm.user_id = (select auth.uid())
      )
    )
  );

-- Leaderboard: expose optional names for UI (same member-only gate).
-- PG cannot change RETURNS TABLE columns via CREATE OR REPLACE; drop first.
drop function if exists public.group_leaderboard(uuid);

create function public.group_leaderboard(p_group_id uuid)
returns table (
  user_id uuid,
  username text,
  first_name text,
  last_name text,
  total_points bigint,
  exact_hits bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = (select auth.uid())
  ) then
    raise exception 'not a group member';
  end if;

  return query
  select
    p.id as user_id,
    p.username,
    p.first_name,
    p.last_name,
    (coalesce(b.pts, 0) + coalesce(g.pts, 0))::bigint as total_points,
    coalesce(b.exacts, 0)::bigint as exact_hits
  from public.group_members gm
  inner join public.profiles p on p.id = gm.user_id
  left join (
    select
      bb.user_id,
      sum(bb.points_awarded)::bigint as pts,
      count(*) filter (where bb.is_exact_hit is true)::bigint as exacts
    from public.bets bb
    group by bb.user_id
  ) b on b.user_id = p.id
  left join (
    select gb.user_id, sum(gb.points_awarded)::bigint as pts
    from public.global_bets gb
    group by gb.user_id
  ) g on g.user_id = p.id
  where gm.group_id = p_group_id
  order by total_points desc, exact_hits desc, p.username asc;
end;
$$;

revoke all on function public.group_leaderboard(uuid) from public;
grant execute on function public.group_leaderboard(uuid) to authenticated;
