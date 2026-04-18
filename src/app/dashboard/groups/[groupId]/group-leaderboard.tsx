import { Card } from "@/components/ui/card";
import Link from "next/link";

export type LeaderboardRow = {
  user_id: string;
  username: string;
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
      <Card as="section" className="p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Leaderboard
        </h2>
        <p className="mt-2 text-sm text-danger">{errorMessage}</p>
      </Card>
    );
  }

  return (
    <Card as="section" className="overflow-hidden p-0">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Leaderboard
        </h2>
        <p className="mt-1 text-xs text-muted">
          Total points (series + tournament). Tie-break: exact series length
          hits.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/50 text-muted">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Player</th>
              <th className="px-4 py-3 text-right font-medium">Pts</th>
              <th className="px-4 py-3 text-right font-medium">Exact</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const rank = idx + 1;
              const isSelf = row.user_id === currentUserId;
              return (
                <tr
                  key={row.user_id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 tabular-nums text-muted">{rank}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/groups/${groupId}/members/${row.user_id}`}
                      className="font-medium text-accent underline-offset-4 hover:underline"
                    >
                      {row.username}
                      {isSelf ? (
                        <span className="ml-2 text-xs font-normal text-muted">
                          (you)
                        </span>
                      ) : null}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                    {row.total_points}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">
                    {row.exact_hits}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
