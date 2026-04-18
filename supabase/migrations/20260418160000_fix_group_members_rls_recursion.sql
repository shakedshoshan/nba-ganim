-- group_members SELECT policy used only EXISTS(self-join on group_members), so
-- evaluating visibility of a row required the same policy on rows inside the
-- subquery (bootstrap / recursion). Users could not reliably read their own
-- membership row → groups_select_member never saw them → empty groups reads → 404.

drop policy if exists "group_members_select_same_group" on public.group_members;

create policy "group_members_select_same_group"
  on public.group_members for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = (select auth.uid())
    )
  );
