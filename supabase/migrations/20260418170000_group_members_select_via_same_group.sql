-- The previous policy still used EXISTS over group_members, which re-applies this
-- same SELECT policy to inner rows → infinite recursion.
-- Use existing SECURITY DEFINER helper `same_group` (reads membership without RLS).

drop policy if exists "group_members_select_same_group" on public.group_members;

create policy "group_members_select_same_group"
  on public.group_members for select
  to authenticated
  using (public.same_group((select auth.uid()), user_id));
