import type { NBAGame } from "./balldontlie-types";

export type DbGameStatus = "scheduled" | "live" | "finished";

/** Map BallDontLie game.status / period_detail to our DB enum. */
export function mapApiGameToDbStatus(game: NBAGame): DbGameStatus {
  const raw = (game.status ?? "").toLowerCase();
  const detail = (game.period_detail ?? "").toLowerCase();

  if (raw.includes("final") || detail.includes("final")) {
    return "finished";
  }
  if (
    raw.includes("progress") ||
    raw.includes("half") ||
    raw.includes("qtr") ||
    raw.includes("period") ||
    detail.includes("half") ||
    detail.includes("qtr") ||
    detail.includes("ot")
  ) {
    return "live";
  }
  if (raw === "scheduled" || raw === "") {
    return "scheduled";
  }
  return "scheduled";
}
