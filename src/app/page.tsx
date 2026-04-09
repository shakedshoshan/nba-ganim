import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";

type LeagueGameRow = {
  id: number;
  home_team_abbrev: string | null;
  visitor_team_abbrev: string | null;
  start_time: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  postseason: boolean;
};

export default async function Home() {
  const cookieStore = await cookies();
  let seriesCount: number | null = null;
  let dbMessage: string | null = null;
  let userEmail: string | null = null;
  let upcomingGames: LeagueGameRow[] = [];
  let leagueMessage: string | null = null;

  try {
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
    const { count, error } = await supabase
      .from("series")
      .select("*", { count: "exact", head: true });

    if (error) {
      dbMessage = error.message;
    } else {
      seriesCount = count ?? 0;
    }

    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 86400000);
    const { data: games, error: lgError } = await supabase
      .from("league_games")
      .select(
        "id, home_team_abbrev, visitor_team_abbrev, start_time, status, home_score, away_score, postseason",
      )
      .gte("start_time", now.toISOString())
      .lte("start_time", weekAhead.toISOString())
      .order("start_time", { ascending: true });

    if (lgError) {
      leagueMessage = lgError.message;
    } else {
      upcomingGames = (games ?? []) as LeagueGameRow[];
    }
  } catch (e) {
    dbMessage = e instanceof Error ? e.message : "Supabase configuration error";
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-4xl font-bold text-red-500">NBA Playoff Challenge</h1>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-500">
          {userEmail != null ? (
            <>
              Signed in as {userEmail} ·{" "}
              <Link
                href="/dashboard"
                className="text-red-600 hover:underline dark:text-red-400"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-red-600 hover:underline dark:text-red-400"
              >
                Log in
              </Link>
              {" · "}
              <Link
                href="/signup"
                className="text-red-600 hover:underline dark:text-red-400"
              >
                Sign up
              </Link>
            </>
          )}
        </p>
        <p className="mt-6 text-zinc-600 dark:text-zinc-400">
          {dbMessage != null
            ? `Database: ${dbMessage}`
            : `Series rows in Supabase: ${seriesCount}`}
        </p>

        <section className="mt-10 w-full border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Upcoming games (next 7 days, UTC)
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Populated by sync into <code className="text-zinc-600 dark:text-zinc-400">league_games</code>.
          </p>
          {leagueMessage != null ? (
            <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">
              Schedule: {leagueMessage}
            </p>
          ) : upcomingGames.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No games in this window. Run <code className="text-zinc-600 dark:text-zinc-400">POST /api/sync-nba-data</code>{" "}
              after applying migrations.
            </p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {upcomingGames.map((g) => {
                const when = g.start_time
                  ? new Date(g.start_time).toISOString().replace("T", " ").slice(0, 16) + " UTC"
                  : "TBD";
                const away = g.visitor_team_abbrev ?? "?";
                const home = g.home_team_abbrev ?? "?";
                const score =
                  g.home_score != null && g.away_score != null
                    ? `${g.away_score}–${g.home_score}`
                    : null;
                return (
                  <li
                    key={g.id}
                    className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    <div className="font-medium text-zinc-800 dark:text-zinc-200">
                      {away} @ {home}
                      {score != null ? (
                        <span className="ml-2 font-normal text-zinc-500">({score})</span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-zinc-500">
                      <span>{when}</span>
                      <span>{g.status}</span>
                      {g.postseason ? <span>Postseason</span> : null}
                    </div>
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
