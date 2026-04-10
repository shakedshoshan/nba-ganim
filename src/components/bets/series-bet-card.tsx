"use client";

import { useActionState } from "react";
import {
  saveSeriesBet,
  type BetActionState,
} from "@/app/dashboard/bets/actions";

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
};

function scoreLine(s: SeriesBetCardSeries) {
  return `${s.team_home} ${s.home_wins} — ${s.away_wins} ${s.team_away}`;
}

export function SeriesBetCard({ series, existingBet, locked }: Props) {
  const [state, formAction, pending] = useActionState(saveSeriesBet, initialState);

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Round {series.round}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {series.team_home} vs {series.team_away}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {scoreLine(series)}
            <span className="ml-2 text-zinc-400">· {series.status}</span>
          </p>
        </div>
        <span
          className={
            locked
              ? "shrink-0 rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              : "shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          }
        >
          {locked ? "Locked" : "Open"}
        </span>
      </div>

      {locked ? (
        <div className="mt-4 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900/60">
          {existingBet ? (
            <p className="text-sm text-zinc-800 dark:text-zinc-200">
              Your pick:{" "}
              <span className="font-medium">{existingBet.predicted_winner_id}</span>{" "}
              in{" "}
              <span className="font-medium">{existingBet.predicted_games}</span>{" "}
              games
            </p>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No pick saved before lock.
            </p>
          )}
        </div>
      ) : (
        <form action={formAction} className="mt-4 space-y-4">
          <input type="hidden" name="seriesId" value={String(series.id)} />

          <fieldset>
            <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Series winner
            </legend>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="predictedWinner"
                  value={series.team_home}
                  defaultChecked={
                    existingBet?.predicted_winner_id === series.team_home
                  }
                  required
                  className="h-4 w-4 border-zinc-300 text-zinc-900 dark:border-zinc-600"
                />
                {series.team_home}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="predictedWinner"
                  value={series.team_away}
                  defaultChecked={
                    existingBet?.predicted_winner_id === series.team_away
                  }
                  required
                  className="h-4 w-4 border-zinc-300 text-zinc-900 dark:border-zinc-600"
                />
                {series.team_away}
              </label>
            </div>
          </fieldset>

          <div>
            <label
              htmlFor={`games-${series.id}`}
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Series length (games)
            </label>
            <select
              id={`games-${series.id}`}
              name="predictedGames"
              required
              defaultValue={existingBet?.predicted_games ?? 4}
              className="mt-2 block w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value={4}>4 games</option>
              <option value={5}>5 games</option>
              <option value={6}>6 games</option>
              <option value={7}>7 games</option>
            </select>
          </div>

          {state.error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.ok ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Saved.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {pending ? "Saving…" : "Save pick"}
          </button>
        </form>
      )}
    </article>
  );
}
