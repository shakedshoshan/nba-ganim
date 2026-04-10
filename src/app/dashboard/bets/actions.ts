"use server";

import {
  fieldNameForGlobalBet,
  GLOBAL_BET_TYPES,
  type GlobalBetType,
} from "@/lib/bets/constants";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type BetActionState = { error: string | null; ok?: boolean };

function friendlyDbError(error: { message: string; code?: string }): string {
  const msg = error.message.toLowerCase();
  if (
    msg.includes("row-level security") ||
    error.code === "42501" ||
    msg.includes("new row violates row-level security")
  ) {
    return "This pick is locked and can’t be changed.";
  }
  return error.message;
}

export async function saveSeriesBet(
  _prev: BetActionState,
  formData: FormData,
): Promise<BetActionState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/bets");
  }

  const seriesIdRaw = formData.get("seriesId");
  const winner = formData.get("predictedWinner");
  const gamesRaw = formData.get("predictedGames");

  if (typeof seriesIdRaw !== "string" || !seriesIdRaw) {
    return { error: "Missing series." };
  }
  const seriesId = Number(seriesIdRaw);
  if (!Number.isInteger(seriesId)) {
    return { error: "Invalid series." };
  }

  if (typeof winner !== "string" || !winner) {
    return { error: "Pick a winner." };
  }

  if (typeof gamesRaw !== "string" || !gamesRaw) {
    return { error: "Pick how many games the series will last." };
  }
  const predictedGames = Number(gamesRaw);
  if (![4, 5, 6, 7].includes(predictedGames)) {
    return { error: "Series length must be 4, 5, 6, or 7 games." };
  }

  const { data: series, error: seriesErr } = await supabase
    .from("series")
    .select("team_home, team_away")
    .eq("id", seriesId)
    .maybeSingle();

  if (seriesErr) {
    return { error: seriesErr.message };
  }
  if (!series) {
    return { error: "Series not found." };
  }
  if (winner !== series.team_home && winner !== series.team_away) {
    return { error: "Winner must be one of the two teams in this series." };
  }

  const { error } = await supabase.from("bets").upsert(
    {
      user_id: user.id,
      series_id: seriesId,
      predicted_winner_id: winner,
      predicted_games: predictedGames,
    },
    { onConflict: "user_id,series_id" },
  );

  if (error) {
    return { error: friendlyDbError(error) };
  }

  revalidatePath("/dashboard/bets");
  return { error: null, ok: true };
}

export async function saveGlobalBets(
  _prev: BetActionState,
  formData: FormData,
): Promise<BetActionState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/bets");
  }

  const missing: GlobalBetType[] = [];
  const rows: { user_id: string; bet_type: string; prediction: string }[] = [];

  for (const betType of GLOBAL_BET_TYPES) {
    const raw = formData.get(fieldNameForGlobalBet(betType));
    if (typeof raw !== "string" || !raw.trim()) {
      missing.push(betType);
      continue;
    }
    rows.push({
      user_id: user.id,
      bet_type: betType,
      prediction: raw.trim(),
    });
  }

  if (missing.length > 0) {
    return {
      error: `Fill in all tournament picks (${missing.join(", ")} missing).`,
    };
  }

  const { error } = await supabase.from("global_bets").upsert(rows, {
    onConflict: "user_id,bet_type",
  });

  if (error) {
    return { error: friendlyDbError(error) };
  }

  revalidatePath("/dashboard/bets");
  return { error: null, ok: true };
}
