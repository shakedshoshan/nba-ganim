import { normalizeAbbrev } from "@/lib/nba/scoring";

/** Canonical key for a two-team matchup (order-independent). */
export function pairKeyFromAbbrevs(a: string, b: string): string {
  const x = normalizeAbbrev(a);
  const y = normalizeAbbrev(b);
  return x < y ? `${x}|${y}` : `${y}|${x}`;
}

/** Stable bracket slots: alphabetical abbrevs (matches `findSeriesForGame` in run-sync). */
export function bracketTeamsForPair(
  abbrevA: string,
  abbrevB: string,
): readonly [string, string] {
  const x = normalizeAbbrev(abbrevA);
  const y = normalizeAbbrev(abbrevB);
  return x < y ? [x, y] : [y, x];
}

/**
 * Deterministic `series.id` for a season + matchup. BallDontLie has no "series"
 * object (only `NBAGame.postseason` + teams); we use this id for DB rows and UI.
 * Range 12_000_000–12_799_999 avoids shipped seed ids (~1001–1008).
 */
export function stableSeriesIdFromSeasonPair(
  seasonYear: number,
  abbrevA: string,
  abbrevB: string,
): number {
  const pk = pairKeyFromAbbrevs(abbrevA, abbrevB);
  const s = `${seasonYear}|${pk}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return 12_000_000 + (Math.abs(h) % 800_000);
}
