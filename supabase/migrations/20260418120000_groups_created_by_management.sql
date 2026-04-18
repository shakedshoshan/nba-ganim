-- Phase 6: group owner (creator), rename / invite / remove-member RPCs.
-- Direct UPDATE on public.groups remains disallowed for authenticated; use RPCs (security definer).

alter table public.groups
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

comment on column public.groups.created_by is 'User who created the group; controls rename, invite regeneration, and removing other members.';

-- Deterministic backfill for existing groups (smallest user_id among members).
update public.groups g
set created_by = s.user_id
from (
  select distinct on (group_id) group_id, user_id
  from public.group_members
  order by group_id, user_id asc
) s
where s.group_id = g.id
  and g.created_by is null;

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

  insert into public.groups (name, invite_code, created_by)
  values (p_name, p_invite, uid)
  returning id, invite_code into new_id, ic;

  insert into public.group_members (group_id, user_id)
  values (new_id, uid);

  return query select new_id, ic, p_name;
end;
$$;

-- Creator-only: rename
create or replace function public.rename_group(p_group_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n text := trim(p_name);
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if length(n) < 1 or length(n) > 200 then
    raise exception 'invalid name';
  end if;

  update public.groups g
  set name = n
  where g.id = p_group_id
    and g.created_by = uid
    and exists (
      select 1 from public.group_members m
      where m.group_id = g.id and m.user_id = uid
    );

  if not found then
    raise exception 'forbidden or group not found';
  end if;
end;
$$;

grant execute on function public.rename_group(uuid, text) to authenticated;

-- Creator-only: set invite code (caller generates + retries on unique violation)
create or replace function public.set_group_invite_code(p_group_id uuid, p_invite text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  update public.groups g
  set invite_code = p_invite
  where g.id = p_group_id
    and g.created_by = uid
    and exists (
      select 1 from public.group_members m
      where m.group_id = g.id and m.user_id = uid
    );

  if not found then
    raise exception 'forbidden or group not found';
  end if;
end;
$$;

grant execute on function public.set_group_invite_code(uuid, text) to authenticated;

-- Creator removes another member (leave = existing RLS delete own row)
create or replace function public.remove_group_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_user_id = uid then
    raise exception 'use leave group to remove yourself';
  end if;

  if not exists (
    select 1 from public.groups g
    where g.id = p_group_id
      and g.created_by = uid
  ) then
    raise exception 'forbidden or group not found';
  end if;

  delete from public.group_members gm
  where gm.group_id = p_group_id
    and gm.user_id = p_user_id;

  if not found then
    raise exception 'member not in group';
  end if;
end;
$$;

grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
