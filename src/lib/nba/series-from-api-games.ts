/**
 * The Ball Dont Lie NBA API does not expose playoff "series" as a resource.
 * `NBAGame` includes `postseason`, `home_team`, `visitor_team`, scores, and
 * times (see https://www.balldontlie.io/openapi/nba.yml). We derive one `public.series`
 * row per distinct two-team matchup in that list and upsert by stable id.
 */

import type { NBAGame } from "@/lib/nba/balldontlie-types";
import {
  bracketTeamsForPair,
  pairKeyFromAbbrevs,
  stableSeriesIdFromSeasonPair,
} from "@/lib/nba/postseason-pair-utils";
import { normalizeAbbrev } from "@/lib/nba/scoring";
import type { SupabaseClient } from "@supabase/supabase-js";

function earliestTipIso(games: NBAGame[]): string {
  let best: number | null = null;
  let isoOut: string | null = null;
  for (const g of games) {
    const raw = g.datetime ?? (g.date ? `${g.date}T17:00:00.000Z` : null);
    if (!raw) continue;
    const t = new Date(raw).getTime();
    if (Number.isNaN(t)) continue;
    if (best == null || t < best) {
      best = t;
      isoOut = new Date(t).toISOString();
    }
  }
  return isoOut ?? new Date().toISOString();
}

export async function upsertSeriesFromPostseasonGames(
  admin: SupabaseClient,
  games: NBAGame[],
  seasonYear: number,
): Promise<{ inserted: number }> {
  const postseason = games.filter((g) => g.postseason === true);
  if (!postseason.length) {
    return { inserted: 0 };
  }

  const byPair = new Map<string, NBAGame[]>();
  for (const g of postseason) {
    const ha = g.home_team?.abbreviation?.trim();
    const va = g.visitor_team?.abbreviation?.trim();
    if (!ha || !va) continue;
    if (normalizeAbbrev(ha) === normalizeAbbrev(va)) continue;
    const key = pairKeyFromAbbrevs(ha, va);
    const list = byPair.get(key) ?? [];
    list.push(g);
    byPair.set(key, list);
  }

  const rows: Record<string, unknown>[] = [];

  for (const [, pairGames] of byPair) {
    const sorted = [...pairGames].sort((a, b) => {
      const da = a.datetime ?? a.date ?? "";
      const db = b.datetime ?? b.date ?? "";
      if (da !== db) return da.localeCompare(db);
      return a.id - b.id;
    });
    const g0 = sorted[0];
    const ha0 = g0?.home_team?.abbreviation?.trim();
    const va0 = g0?.visitor_team?.abbreviation?.trim();
    if (!ha0 || !va0) continue;

    const [teamHome, teamAway] = bracketTeamsForPair(ha0, va0);
    const id = stableSeriesIdFromSeasonPair(seasonYear, teamHome, teamAway);
    const game_1_start_time = earliestTipIso(sorted);

    rows.push({
      id,
      round: 1,
      team_home: teamHome,
      team_away: teamAway,
      home_wins: 0,
      away_wins: 0,
      status: "scheduled",
      series_winner_id: null,
      game_1_start_time,
    });
  }

  if (!rows.length) {
    return { inserted: 0 };
  }

  const { data: existingRows, error: exErr } = await admin
    .from("series")
    .select("id");
  if (exErr) {
    throw new Error(`series read before API seed: ${exErr.message}`);
  }
  const existingIds = new Set(
    (existingRows ?? []).map((r) => r.id as number),
  );
  const toInsert = rows.filter((r) => !existingIds.has(r.id as number));
  if (!toInsert.length) {
    return { inserted: 0 };
  }

  const { error } = await admin.from("series").insert(toInsert);
  if (error) {
    throw new Error(`series insert from API: ${error.message}`);
  }

  return { inserted: toInsert.length };
}
