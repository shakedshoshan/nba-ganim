"use client";

import { SeriesGameLog, type SeriesGameLogRow } from "@/components/bets/series-game-log";
import { TeamLogo } from "@/components/ui/team-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LockedBadge, OpenBadge } from "@/components/ui/badge";
import { SegmentedGames } from "@/components/ui/segmented-games";
import { WinnerTiles } from "@/components/ui/winner-tiles";
import {
  saveSeriesBet,
  type BetActionState,
} from "@/app/dashboard/bets/actions";
import { useActionState } from "react";

const initialState: BetActionState = { error: null };

export type SeriesBetCardSeries = {
  id: number;
  round: number;
  team_home: string;
  team_away: string;
  home_wins: number;
  away_wins: number;
  status: string;
  game_1_start_time: string | null;
};

export type SeriesBetCardBet = {
  series_id: number;
  predicted_winner_id: string;
  predicted_games: number;
};

type Props = {
  series: SeriesBetCardSeries;
  existingBet: SeriesBetCardBet | undefined;
  locked: boolean;
  games: SeriesGameLogRow[];
};

function scoreLine(s: SeriesBetCardSeries) {
  return `${s.team_home} ${s.home_wins} — ${s.away_wins} ${s.team_away}`;
}

function formatSeriesLockLabel(iso: string | null): string | null {
  if (!iso) return null;
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

export function SeriesBetCard({ series, existingBet, locked, games }: Props) {
  const [state, formAction, pending] = useActionState(saveSeriesBet, initialState);
  const lockLabel = formatSeriesLockLabel(series.game_1_start_time);

  return (
    <Card as="article" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Round {series.round}
          </p>
          <h3 className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <TeamLogo abbrev={series.team_home} size={36} />
              {series.team_home}
            </span>
            <span className="text-muted">vs</span>
            <span className="inline-flex items-center gap-2">
              <TeamLogo abbrev={series.team_away} size={36} />
              {series.team_away}
            </span>
          </h3>
          <p className="mt-1 text-sm text-muted">
            <span className="tabular-nums text-foreground">{scoreLine(series)}</span>
            <span className="ml-2">· {series.status}</span>
          </p>
        </div>
        {locked ? <LockedBadge /> : <OpenBadge />}
      </div>

      <SeriesGameLog
        bracketHome={series.team_home}
        bracketAway={series.team_away}
        games={games}
      />

      {locked ? (
        <div className="rounded-lg border border-border bg-surface-muted/80 p-4">
          {lockLabel ? (
            <p className="text-xs text-muted">
              Locked at Game 1 tip-off:{" "}
              <span className="font-medium text-foreground">{lockLabel}</span>
            </p>
          ) : (
            <p className="text-xs text-muted">
              Locked — Game 1 time not set in data (picks stay closed until it
              is).
            </p>
          )}
          <p className="mt-2 text-xs text-muted">
            After tip-off, members of your group can see this pick on the group
            leaderboard and member picks pages.
          </p>
          {existingBet ? (
            <p className="mt-3 text-sm text-foreground">
              Your pick:{" "}
              <span className="font-medium">{existingBet.predicted_winner_id}</span>{" "}
              in{" "}
              <span className="tabular-nums font-medium">
                {existingBet.predicted_games}
              </span>{" "}
              games
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">No pick saved before lock.</p>
          )}
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="seriesId" value={String(series.id)} />

          {lockLabel ? (
            <p className="text-sm text-muted">
              Locks at Game 1 tip-off:{" "}
              <span className="font-medium text-foreground">{lockLabel}</span>
            </p>
          ) : null}
          <p className="text-xs text-muted">
            Until then, only you can see this pick. After tip-off, your group can
            see it.
          </p>

          <WinnerTiles
            name="predictedWinner"
            teamHome={series.team_home}
            teamAway={series.team_away}
            defaultWinner={existingBet?.predicted_winner_id}
          />

          <SegmentedGames
            name="predictedGames"
            defaultValue={existingBet?.predicted_games ?? 4}
          />

          <div aria-live="polite">
            {state.error ? (
              <p className="text-sm text-danger" role="alert">
                {state.error}
              </p>
            ) : null}
            {state.ok ? (
              <p className="text-sm text-success-fg">Saved.</p>
            ) : null}
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save pick"}
          </Button>
        </form>
      )}
    </Card>
  );
}
