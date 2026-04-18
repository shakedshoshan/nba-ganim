"use client";

import {
  SeriesGameLog,
  type SeriesGameLogRow,
} from "@/components/bets/series-game-log";
import { TeamLogo } from "@/components/ui/team-logo";
import { Card } from "@/components/ui/card";

export type BracketSeriesRow = {
  id: number;
  round: number;
  team_home: string;
  team_away: string;
  home_wins: number;
  away_wins: number;
  status: string;
  game_1_start_time: string | null;
};

function leadSummary(s: BracketSeriesRow): string {
  const { team_home: th, team_away: ta, home_wins: hw, away_wins: aw } = s;
  if (hw === aw) {
    return hw === 0 ? "Not started" : `Series tied ${hw}–${aw}`;
  }
  const homeLeads = hw > aw;
  const leader = homeLeads ? th : ta;
  const hi = Math.max(hw, aw);
  const lo = Math.min(hw, aw);
  return `${leader} leads ${hi}–${lo}`;
}

/** Seed ids 1001–1004 / 1005–1008 are East / West R1 in shipped seed script. */
function conferenceLabel(seriesId: number): "East" | "West" | null {
  if (seriesId >= 1001 && seriesId <= 1004) return "East";
  if (seriesId >= 1005 && seriesId <= 1008) return "West";
  return null;
}

type Props = {
  seriesList: BracketSeriesRow[];
  /** JSON-serializable map: series id string → game rows */
  gamesBySeriesId: Record<string, SeriesGameLogRow[]>;
};

export function PlayoffBracket({ seriesList, gamesBySeriesId }: Props) {
  if (!seriesList.length) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted">
          No playoff series in the database yet. Seed{" "}
          <code className="rounded bg-surface-muted px-1 font-mono text-xs">
            series
          </code>{" "}
          (see{" "}
          <code className="rounded bg-surface-muted px-1 font-mono text-xs">
            scripts/seed-playoff-series.sql
          </code>
          ) so the bracket can render.
        </p>
      </Card>
    );
  }

  const byRound = new Map<number, BracketSeriesRow[]>();
  for (const s of seriesList) {
    const list = byRound.get(s.round) ?? [];
    list.push(s);
    byRound.set(s.round, list);
  }
  for (const [, list] of byRound) {
    list.sort((a, b) => a.id - b.id);
  }

  const rounds = [...byRound.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-10">
      {rounds.map((round) => {
        const rows = byRound.get(round) ?? [];
        const r1 = round === 1 ? rows : null;
        const east = r1?.filter((s) => conferenceLabel(s.id) === "East") ?? [];
        const west = r1?.filter((s) => conferenceLabel(s.id) === "West") ?? [];
        const useSplit = east.length > 0 && west.length > 0;

        return (
          <section key={round} aria-labelledby={`bracket-round-${round}`}>
            <h2
              id={`bracket-round-${round}`}
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              {round === 4 ? "NBA Finals" : `Round ${round}`}
            </h2>
            {useSplit ? (
              <div className="mt-4 grid gap-8 lg:grid-cols-2">
                <ConferenceColumn
                  title="Eastern Conference"
                  rows={east}
                  gamesBySeriesId={gamesBySeriesId}
                />
                <ConferenceColumn
                  title="Western Conference"
                  rows={west}
                  gamesBySeriesId={gamesBySeriesId}
                />
              </div>
            ) : (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((s) => (
                  <SeriesBracketCard
                    key={s.id}
                    series={s}
                    games={gamesBySeriesId[String(s.id)] ?? []}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ConferenceColumn({
  title,
  rows,
  gamesBySeriesId,
}: {
  title: string;
  rows: BracketSeriesRow[];
  gamesBySeriesId: Record<string, SeriesGameLogRow[]>;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
        {title}
      </h3>
      <ul className="mt-3 grid gap-4">
        {rows.map((s) => (
          <SeriesBracketCard
            key={s.id}
            series={s}
            games={gamesBySeriesId[String(s.id)] ?? []}
          />
        ))}
      </ul>
    </div>
  );
}

function SeriesBracketCard({
  series,
  games,
}: {
  series: BracketSeriesRow;
  games: SeriesGameLogRow[];
}) {
  return (
    <li>
      <Card as="article" className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
            <TeamLogo abbrev={series.team_home} size={32} />
            {series.team_home}
          </span>
          <span className="text-muted">vs</span>
          <span className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
            <TeamLogo abbrev={series.team_away} size={32} />
            {series.team_away}
          </span>
        </div>
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">
            {leadSummary(series)}
          </span>
          <span className="mx-2">·</span>
          <span className="capitalize">{series.status}</span>
        </p>
        <SeriesGameLog
          bracketHome={series.team_home}
          bracketAway={series.team_away}
          games={games}
        />
      </Card>
    </li>
  );
}
