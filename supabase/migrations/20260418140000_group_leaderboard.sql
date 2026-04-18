-- Phase 5: group leaderboard RPC (total points + exact-hit tie-break).
-- Caller must be a member of p_group_id. Aggregates bypass per-row RLS so
-- standings match product totals (see docs/Technical_specification.md §4).

create or replace function public.group_leaderboard(p_group_id uuid)
returns table (
  user_id uuid,
  username text,
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
