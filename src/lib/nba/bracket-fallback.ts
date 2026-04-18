import type { SeriesGameLogRow } from "@/components/bets/series-game-log";
import type { BracketSeriesRow } from "@/components/bracket/playoff-bracket";
import { fetchAllGames, getBalldontlieApiKey } from "@/lib/nba/balldontlie-client";
import type { NBAGame } from "@/lib/nba/balldontlie-types";
import { mapApiGameToDbStatus } from "@/lib/nba/game-status";
import {
  bracketTeamsForPair,
  pairKeyFromAbbrevs,
  stableSeriesIdFromSeasonPair,
} from "@/lib/nba/postseason-pair-utils";
import { normalizeAbbrev } from "@/lib/nba/scoring";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getConfiguredNbaSeasonYear(): number {
  return (
    Number(process.env.NBA_SEASON_YEAR?.trim()) ||
    new Date().getUTCFullYear() - 1
  );
}

type PairGame = {
  id: number;
  home_team_abbrev: string | null;
  visitor_team_abbrev: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  start_time: string | null;
};

function leagueStatusBucket(
  status: string,
): "scheduled" | "live" | "finished" {
  const s = status.toLowerCase();
  if (s.includes("final")) return "finished";
  if (
    s.includes("progress") ||
    s.includes("half") ||
    s.includes("qtr") ||
    s.includes("period")
  ) {
    return "live";
  }
  return "scheduled";
}

/** Group playoff games by two-team matchup; stable home/away = alphabetical abbrevs. */
export function buildBracketFromPairGames(
  games: PairGame[],
  seasonYear: number,
): {
  seriesList: BracketSeriesRow[];
  gamesBySeriesId: Record<string, SeriesGameLogRow[]>;
} {
  const byPair = new Map<string, PairGame[]>();
  for (const g of games) {
    const ha = g.home_team_abbrev?.trim();
    const va = g.visitor_team_abbrev?.trim();
    if (!ha || !va) continue;
    if (normalizeAbbrev(ha) === normalizeAbbrev(va)) continue;
    const key = pairKeyFromAbbrevs(ha, va);
    const list = byPair.get(key) ?? [];
    list.push(g);
    byPair.set(key, list);
  }

  const seriesList: BracketSeriesRow[] = [];
  const gamesBySeriesId: Record<string, SeriesGameLogRow[]> = {};

  for (const [pkey, pairGames] of byPair) {
    const sorted = [...pairGames].sort((a, b) => {
      const ta = a.start_time ?? "";
      const tb = b.start_time ?? "";
      if (ta !== tb) return ta.localeCompare(tb);
      return a.id - b.id;
    });

    const g0 = sorted[0];
    const ha0 = g0?.home_team_abbrev?.trim();
    const va0 = g0?.visitor_team_abbrev?.trim();
    if (!ha0 || !va0) continue;

    const [teamHome, teamAway] = bracketTeamsForPair(ha0, va0);
    let homeWins = 0;
    let awayWins = 0;

    const logRows: SeriesGameLogRow[] = [];
    let idx = 0;
    for (const g of sorted) {
      idx += 1;
      const hs = g.home_score;
      const vs = g.away_score;
      const hta = g.home_team_abbrev?.trim();
      const vta = g.visitor_team_abbrev?.trim();
      if (
        hta &&
        vta &&
        hs != null &&
        vs != null &&
        hs !== vs
      ) {
        const winner = hs > vs ? normalizeAbbrev(hta) : normalizeAbbrev(vta);
        if (winner === normalizeAbbrev(teamHome)) homeWins += 1;
        else if (winner === normalizeAbbrev(teamAway)) awayWins += 1;
      }

      logRows.push({
        id: g.id,
        game_number: idx,
        home_team_abbrev: g.home_team_abbrev,
        visitor_team_abbrev: g.visitor_team_abbrev,
        home_score: g.home_score,
        away_score: g.away_score,
        status: g.status,
        start_time: g.start_time,
      });
    }

    const sid = stableSeriesIdFromSeasonPair(seasonYear, teamHome, teamAway);
    const game1 = sorted[0]?.start_time ?? null;

    let status = "scheduled";
    if (homeWins >= 4 || awayWins >= 4) {
      status = "finished";
    } else if (
      sorted.some((g) => leagueStatusBucket(g.status) !== "scheduled") ||
      homeWins > 0 ||
      awayWins > 0
    ) {
      status = "in_progress";
    }

    seriesList.push({
      id: sid,
      round: 1,
      team_home: teamHome,
      team_away: teamAway,
      home_wins: homeWins,
      away_wins: awayWins,
      status,
      game_1_start_time: game1,
    });
    gamesBySeriesId[String(sid)] = logRows;
  }

  seriesList.sort((a, b) => {
    const ta = a.game_1_start_time ?? "";
    const tb = b.game_1_start_time ?? "";
    if (ta !== tb) return ta.localeCompare(tb);
    return a.id - b.id;
  });

  return { seriesList, gamesBySeriesId };
}

function nbaGameToPairGame(g: NBAGame): PairGame | null {
  const ha = g.home_team?.abbreviation?.trim();
  const va = g.visitor_team?.abbreviation?.trim();
  if (!ha || !va) return null;
  const st = mapApiGameToDbStatus(g);
  return {
    id: g.id,
    home_team_abbrev: ha,
    visitor_team_abbrev: va,
    home_score: g.home_team_score ?? null,
    away_score: g.visitor_team_score ?? null,
    status: st,
    start_time: g.datetime ?? g.date ?? null,
  };
}

export type BracketLoadResult = {
  seriesList: BracketSeriesRow[];
  gamesBySeriesId: Record<string, SeriesGameLogRow[]>;
  /** Shown above the bracket when data is not from `series` + `games` tables. */
  sourceNote: string | null;
};

/**
 * Prefer DB `series` + `games`. If `series` is empty, derive matchups from
 * `league_games` (postseason rows from sync), then from BallDontLie
 * `GET /nba/v1/games` with `seasons[]` + `postseason=true` (see API docs).
 */
export async function loadBracketWithFallbacks(
  supabase: SupabaseClient,
): Promise<BracketLoadResult> {
  const { data: seriesList } = await supabase
    .from("series")
    .select(
      "id, round, team_home, team_away, home_wins, away_wins, status, game_1_start_time",
    )
    .order("round", { ascending: true })
    .order("id", { ascending: true });

  const rows = (seriesList ?? []) as BracketSeriesRow[];
  const gamesBySeries: Record<string, SeriesGameLogRow[]> = {};

  if (rows.length) {
    const seriesIds = rows.map((s) => s.id);
    const { data: gameRows } = await supabase
      .from("games")
      .select(
        "id, series_id, game_number, home_team_abbrev, visitor_team_abbrev, home_score, away_score, status, start_time",
      )
      .in("series_id", seriesIds);
    for (const row of gameRows ?? []) {
      const sid = String(row.series_id as number);
      const list = gamesBySeries[sid] ?? [];
      list.push(row as SeriesGameLogRow);
      gamesBySeries[sid] = list;
    }
    return {
      seriesList: rows,
      gamesBySeriesId: gamesBySeries,
      sourceNote: null,
    };
  }

  const seasonYear = getConfiguredNbaSeasonYear();

  const { data: leagueRows } = await supabase
    .from("league_games")
    .select(
      "id, home_team_abbrev, visitor_team_abbrev, home_score, away_score, status, start_time, postseason, season",
    )
    .eq("postseason", true)
    .eq("season", seasonYear);

  const lg = (leagueRows ?? []) as PairGame[];

  if (lg.length) {
    const derived = buildBracketFromPairGames(lg, seasonYear);
    if (derived.seriesList.length) {
      return {
        ...derived,
        sourceNote:
          "Showing postseason matchups from synced `league_games` (no `series` rows yet). After the next successful sync with postseason games, `series` may be auto-created from the API; you can still run `scripts/seed-playoff-series.sql` for fixed ids (e.g. 1001–1008).",
      };
    }
  }

  const apiKey = getBalldontlieApiKey();
  if (apiKey) {
    try {
      const apiGames = await fetchAllGames(apiKey, {
        seasons: [seasonYear],
        postseason: true,
        perPage: 100,
      });
      const pairGames = apiGames
        .filter((g) => g.postseason === true)
        .map(nbaGameToPairGame)
        .filter((g): g is PairGame => g != null);

      const derived = buildBracketFromPairGames(pairGames, seasonYear);
      if (derived.seriesList.length) {
        return {
          ...derived,
          sourceNote:
            "Showing postseason games from the Ball Dont Lie API (`seasons[]` + `postseason=true`). Sync can insert matching `series` rows automatically; optional SQL seed sets known ids for your bracket.",
        };
      }
    } catch {
      /* handled below */
    }
  }

  return { seriesList: [], gamesBySeriesId: {}, sourceNote: null };
}
