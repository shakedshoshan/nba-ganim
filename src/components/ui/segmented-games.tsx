"use client";

const OPTIONS = [4, 5, 6, 7] as const;

type SegmentedGamesProps = {
  name: string;
  defaultValue?: number;
  disabled?: boolean;
};

export function SegmentedGames({
  name,
  defaultValue = 4,
  disabled = false,
}: SegmentedGamesProps) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-foreground">
        Series length (games)
      </legend>
      <div
        className="mt-2 grid grid-cols-4 gap-2"
        role="radiogroup"
        aria-label="Series length in games"
      >
        {OPTIONS.map((n) => (
          <label
            key={n}
            className={`relative flex min-h-11 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
              disabled
                ? "pointer-events-none border-border opacity-50"
                : "border-border bg-surface-muted hover:border-muted"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={String(n)}
              defaultChecked={defaultValue === n}
              disabled={disabled}
              required
              className="sr-only"
            />
            <span>{n}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
