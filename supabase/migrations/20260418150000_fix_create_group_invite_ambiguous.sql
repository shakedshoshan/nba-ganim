-- PL/pgSQL: RETURNS TABLE (..., invite_code, ...) defines an output variable
-- named invite_code, which made "RETURNING id, invite_code" ambiguous with
-- groups.invite_code. Qualify RETURNING with the insert target alias.

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

  insert into public.groups as grp (name, invite_code, created_by)
  values (p_name, p_invite, uid)
  returning grp.id, grp.invite_code into new_id, ic;

  insert into public.group_members (group_id, user_id)
  values (new_id, uid);

  return query select new_id, ic, p_name;
end;
$$;
