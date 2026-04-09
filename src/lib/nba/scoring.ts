/** Points when predicted series winner is correct (by round). */
export const ROUND_BASE_POINTS: Record<1 | 2 | 3 | 4, number> = {
  1: 10,
  2: 20,
  3: 35,
  4: 60,
};

/** Extra points when winner is correct and predicted length matches games played. */
export const EXACT_BONUS_BY_ROUND: Record<1 | 2 | 3 | 4, number> = {
  1: 5,
  2: 10,
  3: 15,
  4: 25,
};

export function normalizeAbbrev(s: string): string {
  return s.trim().toUpperCase();
}

export function computeSeriesBetOutcome(input: {
  round: number;
  predictedWinnerAbbrev: string;
  predictedGames: number;
  seriesWinnerAbbrev: string | null;
  finishedGamesCount: number;
}): { points_awarded: number; is_exact_hit: boolean } {
  const round = input.round as 1 | 2 | 3 | 4;
  if (round < 1 || round > 4) {
    return { points_awarded: 0, is_exact_hit: false };
  }

  const winner = input.seriesWinnerAbbrev
    ? normalizeAbbrev(input.seriesWinnerAbbrev)
    : "";
  if (!winner) {
    return { points_awarded: 0, is_exact_hit: false };
  }

  const predicted = normalizeAbbrev(input.predictedWinnerAbbrev);
  const winnerCorrect = predicted === winner;
  if (!winnerCorrect) {
    return { points_awarded: 0, is_exact_hit: false };
  }

  const base = ROUND_BASE_POINTS[round];
  const gamesOk =
    input.finishedGamesCount >= 4 &&
    input.finishedGamesCount <= 7 &&
    input.predictedGames === input.finishedGamesCount;
  const exact = gamesOk;
  const bonus = exact ? EXACT_BONUS_BY_ROUND[round] : 0;

  return { points_awarded: base + bonus, is_exact_hit: exact };
}
