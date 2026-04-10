import { signOut } from "@/app/auth/actions";
import { GlobalBetsForm } from "@/components/bets/global-bets-form";
import {
  SeriesBetCard,
  type SeriesBetCardBet,
  type SeriesBetCardSeries,
} from "@/components/bets/series-bet-card";
import type { GlobalBetType } from "@/lib/bets/constants";
import { GLOBAL_BET_TYPES } from "@/lib/bets/constants";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My bets | NBA Playoff Challenge",
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
  const nowMs = Date.now();
  const globalLocked =
    globalLockIso != null && new Date(globalLockIso).getTime() <= nowMs;

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
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            My bets
          </h1>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Dashboard
            </Link>
            <Link
              href="/"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Home
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-10">
        <GlobalBetsForm
          initialByType={initialGlobal}
          locked={globalLocked}
          lockTimeLabel={lockTimeLabel}
        />

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Playoff series
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Pick the winner and series length before Game 1 of each matchup.
          </p>

          {seriesError ? (
            <p className="mt-6 text-sm text-red-600 dark:text-red-400">
              Could not load series: {seriesError.message}
            </p>
          ) : !seriesList?.length ? (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-950">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                No playoff series in the database yet.
              </p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Seed <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">series</code>{" "}
                (see{" "}
                <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">
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
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
