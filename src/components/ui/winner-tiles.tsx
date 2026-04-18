"use client";

import { TeamLogo } from "@/components/ui/team-logo";

type WinnerTilesProps = {
  name: string;
  teamHome: string;
  teamAway: string;
  defaultWinner?: string;
  disabled?: boolean;
};

export function WinnerTiles({
  name,
  teamHome,
  teamAway,
  defaultWinner,
  disabled = false,
}: WinnerTilesProps) {
  const tiles: { value: string; label: string }[] = [
    { value: teamHome, label: teamHome },
    { value: teamAway, label: teamAway },
  ];

  return (
    <fieldset>
      <legend className="text-sm font-medium text-foreground">
        Series winner
      </legend>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-3">
        {tiles.map(({ value, label }) => (
          <label
            key={value}
            className={`relative flex min-h-[2.75rem] flex-1 cursor-pointer items-center justify-center gap-3 rounded-xl border px-4 py-3 text-base font-semibold transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
              disabled
                ? "pointer-events-none border-border opacity-50"
                : "border-border bg-surface-muted hover:border-muted"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={value}
              defaultChecked={defaultWinner === value}
              disabled={disabled}
              required
              className="sr-only"
            />
            <TeamLogo abbrev={value} size={40} className="shrink-0" />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
