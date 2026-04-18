import { GlobalBetsForm } from "@/components/bets/global-bets-form";
import {
  SeriesBetCard,
  type SeriesBetCardBet,
  type SeriesBetCardSeries,
} from "@/components/bets/series-bet-card";
import type { SeriesGameLogRow } from "@/components/bets/series-game-log";
import { PageContainer } from "@/components/ui/page-container";
import type { GlobalBetType } from "@/lib/bets/constants";
import { GLOBAL_BET_TYPES } from "@/lib/bets/constants";
import {
  ACTIVE_GROUP_COOKIE,
  resolveActiveGroupId,
} from "@/lib/groups/active-group";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My bets",
};

function computeGlobalLockTime(
  rows: { game_1_start_time: string | null }[] | null,
): string | null {
  if (!rows?.length) return null;
  const times = rows
    .map((r) => r.game_1_start_time)
    .filter((t): t is string => t != null && t !== "");
  if (!times.length) return null;
  return times.reduce((a, b) => (new Date(a) < new Date(b) ? a : b));
}

function formatLockLabel(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function DashboardBetsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: seriesList, error: seriesError } = await supabase
    .from("series")
    .select(
      "id, round, team_home, team_away, home_wins, away_wins, status, game_1_start_time",
    )
    .order("round", { ascending: true })
    .order("id", { ascending: true });

  const seriesIds = (seriesList ?? []).map((s) => s.id);
  const gamesBySeries = new Map<number, SeriesGameLogRow[]>();
  if (seriesIds.length) {
    const { data: gameRows } = await supabase
      .from("games")
      .select(
        "id, series_id, game_number, home_team_abbrev, visitor_team_abbrev, home_score, away_score, status, start_time",
      )
      .in("series_id", seriesIds);
    for (const row of gameRows ?? []) {
      const sid = row.series_id as number;
      const list = gamesBySeries.get(sid) ?? [];
      list.push(row as SeriesGameLogRow);
      gamesBySeries.set(sid, list);
    }
  }

  const { data: betsRows } = await supabase
    .from("bets")
    .select("series_id, predicted_winner_id, predicted_games")
    .eq("user_id", user.id);

  const { data: globalRows } = await supabase
    .from("global_bets")
    .select("bet_type, prediction")
    .eq("user_id", user.id);

  const { data: r1Times } = await supabase
    .from("series")
    .select("game_1_start_time")
    .eq("round", 1);

  const globalLockIso = computeGlobalLockTime(r1Times ?? null);
  // eslint-disable-next-line react-hooks/purity -- intentional time boundary for bet locks
  const nowMs = Date.now();
  const globalLocked =
    globalLockIso != null && new Date(globalLockIso).getTime() <= nowMs;

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);
  const memberIds = (memberships ?? []).map((m) => m.group_id);
  let activeGroupLabel: string | null = null;
  if (memberIds.length) {
    const { data: favRow } = await supabase
      .from("profiles")
      .select("favorite_group_id")
      .eq("id", user.id)
      .maybeSingle();

    const { data: groupRows } = await supabase
      .from("groups")
      .select("id, name")
      .in("id", memberIds);
    const sorted = (groupRows ?? [])
      .filter((g): g is { id: string; name: string } => Boolean(g?.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    const orderedIds = sorted.map((g) => g.id);
    const rawCookie = cookieStore.get(ACTIVE_GROUP_COOKIE)?.value;
    const activeId = resolveActiveGroupId(
      rawCookie,
      orderedIds,
      favRow?.favorite_group_id ?? null,
    );
    activeGroupLabel =
      sorted.find((g) => g.id === activeId)?.name ??
      sorted[0]?.name ??
      null;
  }

  const betsBySeries = new Map<number, SeriesBetCardBet>();
  for (const row of betsRows ?? []) {
    betsBySeries.set(row.series_id, {
      series_id: row.series_id,
      predicted_winner_id: row.predicted_winner_id,
      predicted_games: row.predicted_games,
    });
  }

  const initialGlobal: Partial<Record<GlobalBetType, string>> = {};
  for (const row of globalRows ?? []) {
    if (GLOBAL_BET_TYPES.includes(row.bet_type as GlobalBetType)) {
      initialGlobal[row.bet_type as GlobalBetType] = row.prediction;
    }
  }

  const lockTimeLabel = formatLockLabel(globalLockIso);

  return (
    <main className="flex flex-1 flex-col py-8 sm:py-10">
      <PageContainer className="flex flex-col gap-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            My bets
          </h1>
          {activeGroupLabel ? (
            <div className="mt-3 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
              Picks are per account. Standings and peer picks use your active
              group (
              <span className="font-medium text-foreground">
                {activeGroupLabel}
              </span>
              ) on the group page. Change it from the header or{" "}
              <Link
                href="/dashboard/groups"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Groups
              </Link>
              .
            </div>
          ) : null}
        </div>

        <section aria-labelledby="tournament-heading">
          <h2 id="tournament-heading" className="sr-only">
            Tournament picks
          </h2>
          <GlobalBetsForm
            initialByType={initialGlobal}
            locked={globalLocked}
            lockTimeLabel={lockTimeLabel}
          />
        </section>

        <section aria-labelledby="series-heading">
          <h2
            id="series-heading"
            className="text-lg font-semibold text-foreground"
          >
            Playoff series
          </h2>
          <p className="mt-1 text-sm text-muted">
            Pick the winner and series length before Game 1 of each matchup.
          </p>

          {seriesError ? (
            <div
              className="mt-6 rounded-xl border border-danger-muted bg-danger-muted p-4 text-sm text-danger"
              role="alert"
            >
              <p className="font-medium">Could not load series</p>
              <p className="mt-1">{seriesError.message}</p>
            </div>
          ) : !seriesList?.length ? (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-surface-muted p-6 text-center">
              <p className="text-sm text-foreground">
                No playoff series in the database yet.
              </p>
              <p className="mt-2 text-sm text-muted">
                Seed <code className="rounded bg-surface px-1">series</code>{" "}
                (see{" "}
                <code className="rounded bg-surface px-1">
                  scripts/seed-playoff-series.sql
                </code>
                ) so matchups appear here.
              </p>
            </div>
          ) : (
            <ul className="mt-6 flex flex-col gap-6">
              {(seriesList as SeriesBetCardSeries[]).map((series) => {
                const tip = series.game_1_start_time
                  ? new Date(series.game_1_start_time).getTime()
                  : null;
                const locked =
                  tip == null || Number.isNaN(tip) || tip <= nowMs;
                return (
                  <li key={series.id}>
                    <SeriesBetCard
                      series={series}
                      existingBet={betsBySeries.get(series.id)}
                      locked={locked}
                      games={gamesBySeries.get(series.id) ?? []}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </PageContainer>
    </main>
  );
}
