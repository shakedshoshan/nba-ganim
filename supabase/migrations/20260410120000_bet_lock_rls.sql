-- Enforce series lock and global lock on bet writes (Phase 4).
-- Series: editable only while now() < game_1_start_time (null start = closed).
-- Global: editable while global_lock_time() is null or now() < global_lock_time().

-- ---------------------------------------------------------------------------
-- bets: insert/update only before series Game 1 tip (and require known tip time)
-- ---------------------------------------------------------------------------
drop policy if exists "bets_insert_own" on public.bets;
create policy "bets_insert_own"
  on public.bets for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.series s
      where s.id = bets.series_id
        and s.game_1_start_time is not null
        and now() < s.game_1_start_time
    )
  );

drop policy if exists "bets_update_own" on public.bets;
create policy "bets_update_own"
  on public.bets for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.series s
      where s.id = bets.series_id
        and s.game_1_start_time is not null
        and now() < s.game_1_start_time
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.series s
      where s.id = bets.series_id
        and s.game_1_start_time is not null
        and now() < s.game_1_start_time
    )
  );

-- ---------------------------------------------------------------------------
-- global_bets: insert/update only before tournament global lock (if set)
-- ---------------------------------------------------------------------------
drop policy if exists "global_bets_insert_own" on public.global_bets;
create policy "global_bets_insert_own"
  on public.global_bets for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      public.global_lock_time() is null
      or now() < public.global_lock_time()
    )
  );

drop policy if exists "global_bets_update_own" on public.global_bets;
create policy "global_bets_update_own"
  on public.global_bets for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and (
      public.global_lock_time() is null
      or now() < public.global_lock_time()
    )
  )
  with check (
    user_id = (select auth.uid())
    and (
      public.global_lock_time() is null
      or now() < public.global_lock_time()
    )
  );
