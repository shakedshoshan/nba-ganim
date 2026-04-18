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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LockedBadge, OpenBadge } from "@/components/ui/badge";
import { useActionState } from "react";

const initialState: BetActionState = { error: null };

const inputClass =
  "mt-2 block w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted shadow-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring";

type Props = {
  initialByType: Partial<Record<GlobalBetType, string>>;
  locked: boolean;
  lockTimeLabel: string | null;
};

function lockCopy(lockTimeLabel: string | null, locked: boolean) {
  if (locked) {
    return lockTimeLabel
      ? `Locked at first Round 1 tip-off (${lockTimeLabel} — your local time).`
      : "Tournament picks are locked.";
  }
  return lockTimeLabel
    ? `Locks at first Round 1 tip-off (${lockTimeLabel} — your local time).`
    : "Locks when Round 1 schedule is set and the first game starts.";
}

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
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            Tournament picks
          </h2>
          <LockedBadge />
        </div>
        <p className="text-sm text-muted">{lockCopy(lockTimeLabel, true)}</p>
        <p className="text-xs text-muted">
          After lock, members of your group can see these picks on the group
          member picks page.
        </p>
        <ul className="space-y-3 text-sm">
          {GLOBAL_BET_TYPES.map((betType) => {
            const val = initialByType[betType];
            const display =
              val?.trim() && val.trim().length > 0 ? val.trim() : "No pick saved";
            return (
              <li
                key={betType}
                className="flex flex-col gap-0.5 border-b border-border pb-3 last:border-0"
              >
                <span className="font-medium text-foreground">
                  {GLOBAL_BET_LABELS[betType]}
                </span>
                <span
                  className={
                    val?.trim()
                      ? "text-muted"
                      : "text-muted italic"
                  }
                >
                  {display}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">
          Tournament picks
        </h2>
        <OpenBadge />
      </div>
      <p className="text-sm text-muted">{lockCopy(lockTimeLabel, false)}</p>
      <p className="text-xs text-muted">
        Until lock, only you can see these values. Save anytime before the first
        Round 1 game.
      </p>

      <form action={formAction} className="mt-2 space-y-4">
        {GLOBAL_BET_TYPES.map((betType) => (
          <div key={betType}>
            <label
              htmlFor={fieldNameForGlobalBet(betType)}
              className="text-sm font-medium text-foreground"
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
              className={inputClass}
            />
          </div>
        ))}

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
          {pending ? "Saving…" : "Save tournament picks"}
        </Button>
      </form>
    </Card>
  );
}
