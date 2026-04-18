import { Card } from "@/components/ui/card";
import { profileDisplayName } from "@/lib/profiles/display-name";
import Link from "next/link";

export type LeaderboardRow = {
  user_id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  total_points: number;
  exact_hits: number;
};

type Props = {
  groupId: string;
  rows: LeaderboardRow[];
  currentUserId: string;
  errorMessage: string | null;
};

export function GroupLeaderboard({
  groupId,
  rows,
  currentUserId,
  errorMessage,
}: Props) {
  if (errorMessage) {
    return (
      <Card as="section" className="p-5 sm:p-6">
        <h2 className="text-base font-semibold text-foreground">
          Standings
        </h2>
        <p className="mt-3 text-sm text-danger" role="alert">
          {errorMessage}
        </p>
        <p className="mt-2 text-xs text-muted">
          If this persists, ask an admin to apply the latest database migrations
          and try again.
        </p>
      </Card>
    );
  }

  return (
    <Card as="section" className="overflow-hidden p-0">
      <div className="border-b border-border px-5 py-4 sm:px-6 sm:py-5">
        <h2 className="text-base font-semibold text-foreground">Standings</h2>
        <p className="mt-1.5 text-sm text-muted">
          Total points from series picks and tournament picks. Tie-break: how
          many times someone nailed the exact series length (after picking the
          winner).
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center sm:px-6">
          <p className="text-sm font-medium text-foreground">No scores yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Points appear here as playoff games settle. Make sure everyone has
            placed picks on{" "}
            <Link
              href="/dashboard/bets"
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              My bets
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row, idx) => {
            const rank = idx + 1;
            const isSelf = row.user_id === currentUserId;
            const top = rank <= 3;
            return (
              <li key={row.user_id}>
                <Link
                  href={`/dashboard/groups/${groupId}/members/${row.user_id}`}
                  className={`flex min-h-13 items-center gap-3 px-4 py-4 transition-colors hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4 sm:px-5 ${
                    isSelf ? "bg-accent/5" : ""
                  }`}
                >
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                      top
                        ? "bg-surface-muted text-foreground ring-1 ring-border"
                        : "bg-surface-muted/70 text-muted"
                    }`}
                    aria-label={`Rank ${rank}`}
                  >
                    {rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">
                      {profileDisplayName(row)}
                      {isSelf ? (
                        <span className="ml-2 text-xs font-normal text-muted">
                          (you)
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <div className="text-lg font-semibold text-foreground sm:text-base">
                      {row.total_points}
                      <span className="ml-1 text-xs font-normal text-muted">
                        pts
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs tabular-nums text-muted">
                      {row.exact_hits} exact
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
