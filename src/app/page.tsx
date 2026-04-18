import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageContainer } from "@/components/ui/page-container";
import { TeamLogo } from "@/components/ui/team-logo";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

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

function formatGameWhen(iso: string | null): string {
  if (!iso) return "TBD";
  try {
    return (
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZoneName: "short",
      }).format(new Date(iso)) + " (your local time)"
    );
  } catch {
    return iso;
  }
}

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
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <AppTopBar current="home" />
      <main className="flex flex-1 flex-col py-8 sm:py-12">
        <PageContainer className="flex flex-1 flex-col">
          <header className="border-b border-border pb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              NBA Playoff Challenge
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted sm:text-base">
              Private groups, series picks, and tournament predictions—scores
              update from real games. Built for friends leagues, not cash stakes.
            </p>
            {userEmail != null ? (
              <p className="mt-6 text-sm text-muted">
                Signed in as{" "}
                <span className="font-medium text-foreground">{userEmail}</span>
                . Use the header to open your dashboard or picks.
              </p>
            ) : (
              <p className="mt-6 text-sm text-muted">
                New here? Use <strong className="font-medium text-foreground">Log in</strong> or{" "}
                <strong className="font-medium text-foreground">Sign up</strong> in the header
                above.
              </p>
            )}
          </header>

          <section className="mt-8" aria-labelledby="status-heading">
            <h2 id="status-heading" className="text-lg font-semibold text-foreground">
              Competition data
            </h2>
            {dbMessage != null ? (
              <div
                className="mt-4 rounded-xl border border-border bg-danger-muted p-4 text-sm text-danger"
                role="alert"
              >
                <p className="font-medium">Could not load series count</p>
                <p className="mt-1 opacity-90">{dbMessage}</p>
                <p className="mt-2 text-xs opacity-80">
                  Check <code className="rounded bg-surface px-1 py-0.5">.env</code>{" "}
                  and Supabase project status.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Playoff series rows in the database:{" "}
                <span className="tabular-nums font-medium text-foreground">
                  {seriesCount}
                </span>
              </p>
            )}
          </section>

          <section className="mt-10 border-t border-border pt-8" aria-labelledby="schedule-heading">
            <h2 id="schedule-heading" className="text-lg font-semibold text-foreground">
              Upcoming games
            </h2>
            <p className="mt-1 text-sm text-muted">
              Next 7 days from sync. Times shown in your local timezone.
            </p>
            {leagueMessage != null ? (
              <div
                className="mt-4 rounded-xl border border-border bg-surface-muted p-4 text-sm text-foreground"
                role="alert"
              >
                <p className="font-medium">Schedule could not be loaded</p>
                <p className="mt-1 text-muted">{leagueMessage}</p>
              </div>
            ) : upcomingGames.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-surface-muted p-4 text-sm text-muted">
                <p>No games in this window yet.</p>
                <p className="mt-2">
                  After migrations, run{" "}
                  <code className="rounded bg-surface px-1 py-0.5 text-foreground">
                    POST /api/sync-nba-data
                  </code>{" "}
                  to populate the schedule mirror.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {upcomingGames.map((g) => {
                  const away = g.visitor_team_abbrev ?? "?";
                  const home = g.home_team_abbrev ?? "?";
                  const score =
                    g.home_score != null && g.away_score != null
                      ? `${g.away_score}–${g.home_score}`
                      : null;
                  const isLive =
                    typeof g.status === "string" &&
                    (g.status.toLowerCase().includes("live") ||
                      g.status === "in_progress");
                  const isFinal =
                    typeof g.status === "string" &&
                    g.status.toLowerCase().includes("final");
                  return (
                    <li
                      key={g.id}
                      className="rounded-xl border border-border bg-surface p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                      <span className="inline-flex items-center gap-2">
                        <TeamLogo abbrev={away} size={32} />
                        <span className="tabular-nums">{away}</span>
                      </span>
                      <span className="text-muted">@</span>
                      <span className="inline-flex items-center gap-2">
                        <TeamLogo abbrev={home} size={32} />
                        <span className="tabular-nums">{home}</span>
                      </span>
                          {score != null ? (
                            <span className="ml-2 tabular-nums text-muted">
                              {score}
                            </span>
                          ) : null}
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                          {isLive ? (
                            <>
                              <span className="size-1.5 rounded-full bg-success-fg" aria-hidden />
                              <span className="text-success-fg">Live</span>
                            </>
                          ) : isFinal ? (
                            <>
                              <span aria-hidden>Final</span>
                            </>
                          ) : (
                            <span>{g.status}</span>
                          )}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-muted">
                        {formatGameWhen(g.start_time)}
                        {g.postseason ? (
                          <span className="ml-2 rounded bg-surface-muted px-1.5 py-0.5 text-foreground">
                            Postseason
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </PageContainer>
      </main>
    </div>
  );
}
