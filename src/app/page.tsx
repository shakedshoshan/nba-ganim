import { AppTopBar } from "@/components/layout/app-top-bar";
import { PageContainer } from "@/components/ui/page-container";
import { TeamLogo } from "@/components/ui/team-logo";
import { createClient } from "@/utils/supabase/server";
import { cookies, headers } from "next/headers";

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

const UNKNOWN_DAY_KEY = "__unknown__";

async function resolveScheduleTimeZone(): Promise<string> {
  const h = await headers();
  const fromVercel = h.get("x-vercel-ip-timezone")?.trim();
  if (fromVercel) return fromVercel;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function dateKeyInTimeZone(iso: string | null, timeZone: string): string {
  if (!iso) return UNKNOWN_DAY_KEY;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return UNKNOWN_DAY_KEY;
  }
}

function formatDayHeading(iso: string | null, timeZone: string): string {
  if (!iso) return "Date TBD";
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone,
    }).format(new Date(iso));
  } catch {
    return "Date TBD";
  }
}

function formatGameWhen(iso: string | null, timeZone: string): string {
  if (!iso) return "TBD";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZoneName: "short",
      timeZone,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function groupGamesByLocalDay(
  games: LeagueGameRow[],
  timeZone: string,
): { dayKey: string; games: LeagueGameRow[] }[] {
  const map = new Map<string, LeagueGameRow[]>();
  for (const g of games) {
    const key = dateKeyInTimeZone(g.start_time, timeZone);
    const list = map.get(key);
    if (list) list.push(g);
    else map.set(key, [g]);
  }
  const keys = [...map.keys()].sort((a, b) => {
    if (a === UNKNOWN_DAY_KEY) return 1;
    if (b === UNKNOWN_DAY_KEY) return -1;
    return a.localeCompare(b);
  });
  return keys.map((dayKey) => ({ dayKey, games: map.get(dayKey)! }));
}

export default async function Home() {
  const cookieStore = await cookies();
  const scheduleTz = await resolveScheduleTimeZone();
  let upcomingGames: LeagueGameRow[] = [];
  let leagueMessage: string | null = null;

  try {
    const supabase = createClient(cookieStore);

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
    leagueMessage =
      e instanceof Error ? e.message : "Supabase configuration error";
  }

  const gamesByDay = groupGamesByLocalDay(upcomingGames, scheduleTz);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <AppTopBar current="home" />
      <main className="flex flex-1 flex-col py-8 sm:py-12">
        <PageContainer className="flex flex-1 flex-col">
          <header className="border-b border-border pb-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              NBA Playoff Challenge
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Private groups and playoff picks—scores update from real games.
            </p>
          </header>

          <section className="mt-8" aria-labelledby="schedule-heading">
            <h2 id="schedule-heading" className="text-lg font-semibold text-foreground">
              Upcoming games
            </h2>
            <p className="mt-1 text-sm text-muted">
              Next seven days (sync window). Grouped by date; tip times use{" "}
              <span className="whitespace-nowrap font-medium text-foreground">
                {scheduleTz}
              </span>
              .
            </p>
            {leagueMessage != null ? (
              <div
                className="mt-4 rounded-xl border border-border bg-danger-muted p-4 text-sm text-danger"
                role="alert"
              >
                <p className="font-medium">Schedule could not be loaded</p>
                <p className="mt-1 opacity-90">{leagueMessage}</p>
                <p className="mt-2 text-xs opacity-80">
                  Check <code className="rounded bg-surface px-1 py-0.5">.env</code> and Supabase
                  project status.
                </p>
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
              <div className="mt-6 space-y-8">
                {gamesByDay.map(({ dayKey, games }) => {
                  const dayHeading =
                    dayKey === UNKNOWN_DAY_KEY
                      ? "Date TBD"
                      : formatDayHeading(games[0]?.start_time ?? null, scheduleTz);
                  const daySlug =
                    dayKey === UNKNOWN_DAY_KEY ? "unknown" : dayKey.replaceAll("-", "");
                  return (
                    <section key={dayKey} aria-labelledby={`day-${daySlug}`}>
                      <h3
                        id={`day-${daySlug}`}
                        className="text-base font-semibold text-foreground"
                      >
                        {dayHeading}
                      </h3>
                      <ul className="mt-3 space-y-3">
                        {games.map((g) => {
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
                                      <span
                                        className="size-1.5 rounded-full bg-success-fg"
                                        aria-hidden
                                      />
                                      <span className="text-success-fg">Live</span>
                                    </>
                                  ) : isFinal ? (
                                    <span aria-hidden>Final</span>
                                  ) : (
                                    <span>{g.status}</span>
                                  )}
                                </span>
                              </div>
                              <div className="mt-2 text-xs text-muted">
                                {formatGameWhen(g.start_time, scheduleTz)}
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
                    </section>
                  );
                })}
              </div>
            )}
          </section>
        </PageContainer>
      </main>
    </div>
  );
}
