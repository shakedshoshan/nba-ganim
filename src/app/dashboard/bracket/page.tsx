import { PlayoffBracket } from "@/components/bracket/playoff-bracket";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import {
  getConfiguredNbaSeasonYear,
  loadBracketWithFallbacks,
} from "@/lib/nba/bracket-fallback";
import { getBalldontlieApiKey } from "@/lib/nba/balldontlie-client";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Playoff bracket",
};

export default async function DashboardBracketPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { seriesList, gamesBySeriesId, sourceNote } =
    await loadBracketWithFallbacks(supabase);

  const seasonYear = getConfiguredNbaSeasonYear();
  const hasApiKey = Boolean(getBalldontlieApiKey());

  return (
    <main className="flex flex-1 flex-col py-8 sm:py-10">
      <PageContainer className="flex flex-col gap-8">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Playoff bracket
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            When{" "}
            <code className="rounded bg-surface-muted px-1 font-mono text-xs">
              series
            </code>{" "}
            rows exist, this view uses your database and synced{" "}
            <code className="rounded bg-surface-muted px-1 font-mono text-xs">
              games
            </code>
            . Otherwise it builds matchups from postseason{" "}
            <code className="rounded bg-surface-muted px-1 font-mono text-xs">
              league_games
            </code>{" "}
            (after{" "}
            <code className="rounded bg-surface-muted px-1 font-mono text-xs">
              /api/sync-nba-data
            </code>
            ) or directly from the{" "}
            <a
              href="https://nba.balldontlie.io/#nba-api"
              className="font-medium text-accent underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ball Dont Lie NBA API
            </a>{" "}
            (<code className="rounded bg-surface-muted px-1 font-mono text-xs">
              seasons[]={String(seasonYear)}
            </code>{" "}
            +{" "}
            <code className="rounded bg-surface-muted px-1 font-mono text-xs">
              postseason=true
            </code>
            ).
          </p>
        </div>

        {sourceNote ? (
          <Card className="border-info-bg bg-info-bg/30 p-4 text-sm text-foreground">
            <p className="font-medium">Live bracket source</p>
            <p className="mt-2 text-muted">{sourceNote}</p>
          </Card>
        ) : null}

        {seriesList.length > 0 ? (
          <PlayoffBracket
            seriesList={seriesList}
            gamesBySeriesId={gamesBySeriesId}
          />
        ) : null}

        {seriesList.length === 0 ? (
          <Card className="space-y-3 p-5 text-sm text-muted">
            <p className="font-medium text-foreground">
              Still no bracket data
            </p>
            <p>
              Season filter:{" "}
              <code className="rounded bg-surface-muted px-1 font-mono text-xs">
                NBA_SEASON_YEAR={seasonYear}
              </code>{" "}
              (set in{" "}
              <code className="rounded bg-surface-muted px-1 font-mono text-xs">
                .env
              </code>{" "}
              if needed). Run sync so{" "}
              <code className="rounded bg-surface-muted px-1 font-mono text-xs">
                league_games
              </code>{" "}
              includes playoff games, or seed{" "}
              <code className="rounded bg-surface-muted px-1 font-mono text-xs">
                series
              </code>{" "}
              via{" "}
              <code className="rounded bg-surface-muted px-1 font-mono text-xs">
                scripts/seed-playoff-series.sql
              </code>
              .
            </p>
            {!hasApiKey ? (
              <p>
                For the API fallback, add{" "}
                <code className="rounded bg-surface-muted px-1 font-mono text-xs">
                  BALLDONTLIE_API_KEY
                </code>{" "}
                to your environment (see{" "}
                <a
                  href="https://nba.balldontlie.io/#nba-api"
                  className="font-medium text-accent underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ball Dont Lie authentication
                </a>
                ).
              </p>
            ) : null}
          </Card>
        ) : null}
      </PageContainer>
    </main>
  );
}
