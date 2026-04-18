"use client";

import { TeamLogo } from "@/components/ui/team-logo";

export type SeriesGameLogRow = {
  id: number;
  game_number: number | null;
  home_team_abbrev: string | null;
  visitor_team_abbrev: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  start_time: string | null;
};

type Props = {
  bracketHome: string;
  bracketAway: string;
  games: SeriesGameLogRow[];
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "short",
      timeStyle: "short",
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function SeriesGameLog({ bracketHome, bracketAway, games }: Props) {
  if (!games.length) {
    return (
      <p className="text-sm text-muted">
        No games synced for this series yet. They appear after the sync matches
        playoff games to this matchup.
      </p>
    );
  }

  const sorted = [...games].sort((a, b) => {
    const an = a.game_number ?? 0;
    const bn = b.game_number ?? 0;
    return an - bn;
  });

  return (
    <details className="group rounded-lg border border-border bg-surface-muted/60">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
        <span>Game log</span>
        <span className="text-muted group-open:rotate-180 motion-safe:transition-transform">
          ▼
        </span>
      </summary>
      <div className="border-t border-border px-3 py-3">
        <p className="mb-3 text-xs text-muted">
          <span className="font-medium text-foreground">Bracket:</span>{" "}
          {bracketHome} vs {bracketAway}. Scores below use{" "}
          <span className="font-medium text-foreground">arena</span> home /
          visitor (may differ from bracket labels).
        </p>
        <ul className="space-y-2">
          {sorted.map((g) => {
            const vis = g.visitor_team_abbrev ?? "?";
            const home = g.home_team_abbrev ?? "?";
            const score =
              g.home_score != null && g.away_score != null
                ? `${g.away_score}–${g.home_score}`
                : "—";
            const label =
              g.game_number != null ? `Game ${g.game_number}` : `Game #${g.id}`;
            return (
              <li
                key={g.id}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-foreground">{label}</span>
                  <span className="tabular-nums text-muted">{g.status ?? "—"}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums text-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-muted">Visitor</span>
                    <TeamLogo abbrev={vis} size={28} />
                    <span>{vis}</span>
                  </span>
                  <span className="text-muted">@</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-muted">Home</span>
                    <TeamLogo abbrev={home} size={28} />
                    <span>{home}</span>
                  </span>
                  <span className="ml-auto text-muted">{score}</span>
                </div>
                <div className="mt-1 text-xs text-muted">
                  {formatWhen(g.start_time)} (your local time)
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
