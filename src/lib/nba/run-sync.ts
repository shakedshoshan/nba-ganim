import { fetchAllGames, getBalldontlieApiKey } from "./balldontlie-client";
import type { NBAGame } from "./balldontlie-types";
import { mapApiGameToDbStatus } from "./game-status";
import { computeSeriesBetOutcome, normalizeAbbrev } from "./scoring";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SyncResult = {
  ok: boolean;
  gamesUpserted: number;
  seriesUpdated: number;
  seriesFinishedSettled: number;
  betsUpdated: number;
  skippedUnmatchedGames: number;
  errors: string[];
};

type SeriesRow = {
  id: number;
  round: number;
  team_home: string;
  team_away: string;
  home_wins: number;
  away_wins: number;
  status: string;
  series_winner_id: string | null;
  game_1_start_time: string;
};

type GameRow = {
  id: number;
  series_id: number;
  game_number: number;
  home_score: number | null;
  away_score: number | null;
  status: string;
  start_time: string | null;
  home_team_abbrev: string | null;
  visitor_team_abbrev: string | null;
};

function findSeriesForGame(
  game: NBAGame,
  seriesList: SeriesRow[],
): SeriesRow | null {
  const ha = game.home_team?.abbreviation;
  const va = game.visitor_team?.abbreviation;
  const home = ha ? normalizeAbbrev(ha) : "";
  const away = va ? normalizeAbbrev(va) : "";
  if (!home || !away) return null;

  for (const s of seriesList) {
    const a = normalizeAbbrev(s.team_home);
    const b = normalizeAbbrev(s.team_away);
    if (
      (home === a && away === b) ||
      (home === b && away === a)
    ) {
      return s;
    }
  }
  return null;
}

function utcDateWindow(days: number): { startDate: string; endDate: string } {
  const now = Date.now();
  const half = Math.max(1, Math.floor(days / 2));
  const start = new Date(now - half * 86400000);
  const end = new Date(now + (days - half) * 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

function apiGameToRowDraft(
  game: NBAGame,
  seriesId: number,
): Omit<GameRow, "game_number"> {
  const homeAbbr = game.home_team?.abbreviation
    ? normalizeAbbrev(game.home_team.abbreviation)
    : null;
  const visitorAbbr = game.visitor_team?.abbreviation
    ? normalizeAbbrev(game.visitor_team.abbreviation)
    : null;

  return {
    id: game.id,
    series_id: seriesId,
    home_score: game.home_team_score ?? null,
    away_score: game.visitor_team_score ?? null,
    status: mapApiGameToDbStatus(game),
    start_time: game.datetime ?? null,
    home_team_abbrev: homeAbbr,
    visitor_team_abbrev: visitorAbbr,
  };
}

function countSeriesWins(
  series: SeriesRow,
  games: GameRow[],
): { home_wins: number; away_wins: number } {
  let home_wins = 0;
  let away_wins = 0;
  const th = normalizeAbbrev(series.team_home);
  const ta = normalizeAbbrev(series.team_away);

  for (const g of games) {
    if (g.status !== "finished") continue;
    if (
      g.home_score == null ||
      g.away_score == null ||
      !g.home_team_abbrev ||
      !g.visitor_team_abbrev
    ) {
      continue;
    }
    if (g.home_score === g.away_score) continue;

    const homeWon = g.home_score > g.away_score;
    const winnerAbbrev = homeWon
      ? normalizeAbbrev(g.home_team_abbrev)
      : normalizeAbbrev(g.visitor_team_abbrev);

    if (winnerAbbrev === th) home_wins += 1;
    else if (winnerAbbrev === ta) away_wins += 1;
  }

  return { home_wins, away_wins };
}

async function settleBetsForSeries(
  admin: SupabaseClient,
  series: SeriesRow,
  games: GameRow[],
): Promise<number> {
  if (series.status !== "finished" || !series.series_winner_id) return 0;

  const finishedGamesCount = games.filter((g) => g.status === "finished").length;

  const { data: bets, error } = await admin
    .from("bets")
    .select("id, predicted_winner_id, predicted_games")
    .eq("series_id", series.id);

  if (error) {
    throw new Error(`bets select: ${error.message}`);
  }

  const round = series.round;
  let updated = 0;

  for (const bet of bets ?? []) {
    const b = bet as {
      id: string;
      predicted_winner_id: string;
      predicted_games: number;
    };
    const { points_awarded, is_exact_hit } = computeSeriesBetOutcome({
      round,
      predictedWinnerAbbrev: b.predicted_winner_id,
      predictedGames: b.predicted_games,
      seriesWinnerAbbrev: series.series_winner_id,
      finishedGamesCount,
    });

    const { error: upErr } = await admin
      .from("bets")
      .update({ points_awarded, is_exact_hit })
      .eq("id", b.id);

    if (upErr) {
      throw new Error(`bet update ${b.id}: ${upErr.message}`);
    }
    updated += 1;
  }

  return updated;
}

async function mergeOrderAndUpsertGames(
  admin: SupabaseClient,
  seriesId: number,
  apiGamesForSeries: NBAGame[],
): Promise<number> {
  const { data: dbGames, error } = await admin
    .from("games")
    .select("*")
    .eq("series_id", seriesId);

  if (error) throw new Error(`games select: ${error.message}`);

  const byId = new Map<number, GameRow>();

  for (const row of (dbGames ?? []) as GameRow[]) {
    byId.set(row.id, { ...row });
  }

  for (const g of apiGamesForSeries) {
    const draft = apiGameToRowDraft(g, seriesId);
    const prev = byId.get(g.id);
    byId.set(g.id, {
      ...prev,
      ...draft,
      game_number: prev?.game_number ?? 0,
    });
  }

  const merged = [...byId.values()].sort((a, b) => {
    const ta = a.start_time ? new Date(a.start_time).getTime() : 0;
    const tb = b.start_time ? new Date(b.start_time).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return a.id - b.id;
  });

  let n = 0;
  for (let i = 0; i < merged.length; i++) {
    const row = merged[i];
    const game_number = i + 1;
    const { error: upErr } = await admin.from("games").upsert(
      {
        id: row.id,
        series_id: row.series_id,
        game_number,
        home_score: row.home_score,
        away_score: row.away_score,
        status: row.status,
        start_time: row.start_time,
        home_team_abbrev: row.home_team_abbrev,
        visitor_team_abbrev: row.visitor_team_abbrev,
      },
      { onConflict: "id" },
    );
    if (upErr) throw new Error(`games upsert ${row.id}: ${upErr.message}`);
    n += 1;
  }

  return n;
}

async function refreshSeriesRow(
  admin: SupabaseClient,
  series: SeriesRow,
): Promise<SeriesRow> {
  const { data: games, error } = await admin
    .from("games")
    .select("*")
    .eq("series_id", series.id);

  if (error) throw new Error(`games for series: ${error.message}`);

  const list = (games ?? []) as GameRow[];
  const { home_wins, away_wins } = countSeriesWins(series, list);

  let status = series.status;
  let series_winner_id: string | null = series.series_winner_id;

  if (home_wins >= 4 || away_wins >= 4) {
    status = "finished";
    series_winner_id =
      home_wins >= 4
        ? normalizeAbbrev(series.team_home)
        : normalizeAbbrev(series.team_away);
  } else {
    series_winner_id = null;
    if (
      list.some((g) => g.status === "live") ||
      list.some((g) => g.status === "finished")
    ) {
      status = "in_progress";
    } else {
      status = "scheduled";
    }
  }

  const { error: upErr } = await admin
    .from("series")
    .update({
      home_wins,
      away_wins,
      status,
      series_winner_id,
    })
    .eq("id", series.id);

  if (upErr) throw new Error(`series update: ${upErr.message}`);

  return {
    ...series,
    home_wins,
    away_wins,
    status,
    series_winner_id,
  };
}

export async function runNbaDataSync(admin: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = {
    ok: true,
    gamesUpserted: 0,
    seriesUpdated: 0,
    seriesFinishedSettled: 0,
    betsUpdated: 0,
    skippedUnmatchedGames: 0,
    errors: [],
  };

  const apiKey = getBalldontlieApiKey();
  if (!apiKey) {
    result.ok = false;
    result.errors.push("Missing BALLDONTLIE_API_KEY");
    return result;
  }

  const seasonYear =
    Number(process.env.NBA_SEASON_YEAR?.trim()) ||
    new Date().getFullYear() - 1;

  const windowDays = Math.min(
    14,
    Math.max(1, Number(process.env.SYNC_DATE_WINDOW_DAYS) || 4),
  );
  const { startDate, endDate } = utcDateWindow(windowDays);

  let apiGames: NBAGame[] = [];
  try {
    apiGames = await fetchAllGames(apiKey, {
      postseason: true,
      seasons: [seasonYear],
      startDate,
      endDate,
      perPage: 100,
    });
  } catch (e) {
    result.ok = false;
    result.errors.push(e instanceof Error ? e.message : String(e));
    return result;
  }

  const { data: seriesList, error: seriesErr } = await admin
    .from("series")
    .select("*");

  if (seriesErr || !seriesList?.length) {
    result.ok = false;
    result.errors.push(
      seriesErr?.message ?? "No series rows in DB (seed playoff series first).",
    );
    return result;
  }

  const seriesRows = seriesList as SeriesRow[];
  const bySeriesApi = new Map<number, NBAGame[]>();
  const affected = new Set<number>();

  for (const g of apiGames) {
    const s = findSeriesForGame(g, seriesRows);
    if (!s) {
      result.skippedUnmatchedGames += 1;
      continue;
    }
    const list = bySeriesApi.get(s.id) ?? [];
    list.push(g);
    bySeriesApi.set(s.id, list);
    affected.add(s.id);
  }

  try {
    for (const seriesId of affected) {
      const apiSlice = bySeriesApi.get(seriesId) ?? [];
      const n = await mergeOrderAndUpsertGames(admin, seriesId, apiSlice);
      result.gamesUpserted += n;
    }

    for (const seriesId of affected) {
      const series = seriesRows.find((r) => r.id === seriesId);
      if (!series) continue;

      const updated = await refreshSeriesRow(admin, series);
      result.seriesUpdated += 1;

      if (updated.status === "finished") {
        const { data: games } = await admin
          .from("games")
          .select("*")
          .eq("series_id", seriesId);
        const n = await settleBetsForSeries(
          admin,
          updated,
          (games ?? []) as GameRow[],
        );
        result.betsUpdated += n;
        result.seriesFinishedSettled += 1;
      }
    }

    const { data: otherFinished, error: finErr } = await admin
      .from("series")
      .select("*")
      .eq("status", "finished");

    if (!finErr && otherFinished?.length) {
      for (const row of otherFinished as SeriesRow[]) {
        if (affected.has(row.id)) continue;
        const { data: games } = await admin
          .from("games")
          .select("*")
          .eq("series_id", row.id);
        const n = await settleBetsForSeries(
          admin,
          row,
          (games ?? []) as GameRow[],
        );
        result.betsUpdated += n;
        result.seriesFinishedSettled += 1;
      }
    }
  } catch (e) {
    result.ok = false;
    result.errors.push(e instanceof Error ? e.message : String(e));
  }

  return result;
}
