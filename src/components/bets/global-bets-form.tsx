"use client";

import {
  saveGlobalBets,
  type BetActionState,
} from "@/app/dashboard/bets/actions";
import {
  fieldNameForGlobalBet,
  GLOBAL_BET_LABELS,
  GLOBAL_BET_TYPES,
  type GlobalBetType,
} from "@/lib/bets/constants";
import { useActionState } from "react";

const initialState: BetActionState = { error: null };

type Props = {
  initialByType: Partial<Record<GlobalBetType, string>>;
  locked: boolean;
  lockTimeLabel: string | null;
};

export function GlobalBetsForm({
  initialByType,
  locked,
  lockTimeLabel,
}: Props) {
  const [state, formAction, pending] = useActionState(
    saveGlobalBets,
    initialState,
  );

  if (locked) {
    return (
      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Tournament picks
          </h2>
          <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Locked
          </span>
        </div>
        {lockTimeLabel ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Locked at first Round 1 tip-off ({lockTimeLabel}).
          </p>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Tournament picks are locked.
          </p>
        )}
        <ul className="space-y-3 text-sm">
          {GLOBAL_BET_TYPES.map((betType) => {
            const val = initialByType[betType];
            return (
              <li
                key={betType}
                className="flex flex-col gap-0.5 border-b border-zinc-100 pb-3 last:border-0 dark:border-zinc-800"
              >
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {GLOBAL_BET_LABELS[betType]}
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  {val?.trim() ? val : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Tournament picks
        </h2>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Open
        </span>
      </div>
      {lockTimeLabel ? (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Locks at first Round 1 tip-off ({lockTimeLabel}).
        </p>
      ) : (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Locks when Round 1 schedule is set and the first game starts.
        </p>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        {GLOBAL_BET_TYPES.map((betType) => (
          <div key={betType}>
            <label
              htmlFor={fieldNameForGlobalBet(betType)}
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {GLOBAL_BET_LABELS[betType]}
            </label>
            <input
              id={fieldNameForGlobalBet(betType)}
              name={fieldNameForGlobalBet(betType)}
              type="text"
              required
              defaultValue={initialByType[betType] ?? ""}
              placeholder="e.g. BOS or player name"
              className="mt-2 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        ))}

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
          {pending ? "Saving…" : "Save tournament picks"}
        </button>
      </form>
    </div>
  );
}
