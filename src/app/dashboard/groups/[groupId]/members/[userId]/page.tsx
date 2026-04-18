import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import {
  GLOBAL_BET_LABELS,
  GLOBAL_BET_TYPES,
  type GlobalBetType,
} from "@/lib/bets/constants";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TeamLogo } from "@/components/ui/team-logo";

type PageProps = {
  params: Promise<{ groupId: string; userId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  const name = profile?.username ?? "Player";
  return { title: `${name} — picks` };
}

type SeriesRow = {
  id: number;
  round: number;
  team_home: string;
  team_away: string;
  game_1_start_time: string | null;
};

type BetRow = {
  series_id: number;
  predicted_winner_id: string;
  predicted_games: number;
  points_awarded: number;
  is_exact_hit: boolean;
};

type GlobalBetRow = {
  bet_type: string;
  prediction: string;
  points_awarded: number;
};

export default async function GroupMemberPicksPage({ params }: PageProps) {
  const { groupId, userId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: viewerMembership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!viewerMembership) {
    notFound();
  }

  const { data: targetMembership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!targetMembership) {
    notFound();
  }

  const { data: group } = await supabase
    .from("groups")
    .select("name")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) {
    notFound();
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  const displayName = targetProfile?.username ?? userId.slice(0, 8);

  const { data: seriesList } = await supabase
    .from("series")
    .select("id, round, team_home, team_away, game_1_start_time")
    .order("round", { ascending: true })
    .order("id", { ascending: true });

  const seriesById = new Map<number, SeriesRow>();
  for (const s of seriesList ?? []) {
    seriesById.set(s.id, s as SeriesRow);
  }

  const { data: betRows } = await supabase
    .from("bets")
    .select(
      "series_id, predicted_winner_id, predicted_games, points_awarded, is_exact_hit",
    )
    .eq("user_id", userId)
    .order("series_id", { ascending: true });

  const bets = (betRows ?? []) as BetRow[];

  const { data: globalRows } = await supabase
    .from("global_bets")
    .select("bet_type, prediction, points_awarded")
    .eq("user_id", userId)
    .order("bet_type", { ascending: true });

  const globals = (globalRows ?? []) as GlobalBetRow[];

  const isSelf = userId === user.id;

  return (
    <main className="flex flex-1 flex-col py-8 sm:py-10">
      <PageContainer className="flex flex-col gap-8">
        <div>
          <Link
            href={`/dashboard/groups/${groupId}`}
            className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            ← {group.name}
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            {isSelf ? "Your picks" : `${displayName}'s picks`}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {isSelf
              ? "This is how your group sees your visible picks under lock rules."
              : "Only picks your account is allowed to see are listed (series after Game 1 tip-off, tournament picks after global lock)."}
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Series picks
          </h2>
          {bets.length === 0 ? (
            <Card className="p-4">
              <p className="text-sm text-muted">
                No visible series picks yet (or none saved).
              </p>
            </Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {bets.map((b) => {
                const s = seriesById.get(b.series_id);
                return (
                  <li key={b.series_id}>
                    <Card as="article" className="space-y-3 p-4">
                      {s ? (
                        <>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted">
                            Round {s.round}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
                            <span className="inline-flex items-center gap-2">
                              <TeamLogo abbrev={s.team_home} size={32} />
                              {s.team_home}
                            </span>
                            <span className="text-muted">vs</span>
                            <span className="inline-flex items-center gap-2">
                              <TeamLogo abbrev={s.team_away} size={32} />
                              {s.team_away}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-foreground">
                          Series #{b.series_id}
                        </p>
                      )}
                      <dl className="grid gap-1 text-sm">
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Winner</dt>
                          <dd className="font-medium text-foreground">
                            {b.predicted_winner_id}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Games</dt>
                          <dd className="tabular-nums font-medium text-foreground">
                            {b.predicted_games}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Points</dt>
                          <dd className="tabular-nums font-medium text-foreground">
                            {b.points_awarded}
                          </dd>
                        </div>
                        {b.is_exact_hit ? (
                          <p className="text-xs font-medium text-success-fg">
                            Exact length hit
                          </p>
                        ) : null}
                      </dl>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Tournament picks
          </h2>
          {globals.length === 0 ? (
            <Card className="p-4">
              <p className="text-sm text-muted">
                No visible tournament picks yet (or none saved).
              </p>
            </Card>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
              {globals.map((g) => {
                const label = GLOBAL_BET_TYPES.includes(g.bet_type as GlobalBetType)
                  ? GLOBAL_BET_LABELS[g.bet_type as GlobalBetType]
                  : g.bet_type;
                return (
                  <li
                    key={g.bet_type}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {label}
                      </p>
                      <p className="mt-0.5 text-sm text-muted">
                        {g.prediction}
                      </p>
                    </div>
                    <span className="tabular-nums text-sm font-medium text-foreground">
                      {g.points_awarded} pts
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-xs text-muted">
          Omitted rows are still private under group lock rules — they appear
          here automatically once your account is allowed to read them.
        </p>
      </PageContainer>
    </main>
  );
}
