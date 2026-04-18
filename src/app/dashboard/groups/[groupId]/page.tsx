import {
  CopyJoinUrlButton,
  LeaveGroupForm,
  RegenerateInviteButton,
  RemoveMemberButton,
} from "@/app/dashboard/groups/[groupId]/group-client";
import {
  GroupLeaderboard,
  type LeaderboardRow,
} from "@/app/dashboard/groups/[groupId]/group-leaderboard";
import { RenameGroupForm } from "@/app/dashboard/groups/[groupId]/rename-group-form";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import { getPublicSiteOrigin } from "@/lib/site-url";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ groupId: string }> };

export default async function GroupDetailPage({ params }: PageProps) {
  const { groupId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name, invite_code, created_by")
    .eq("id", groupId)
    .maybeSingle();

  if (groupError || !group) {
    notFound();
  }

  const { data: memberRows } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  const memberIds = (memberRows ?? []).map((m) => m.user_id);
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", memberIds);

  const profileById = new Map(
    (profileRows ?? []).map((p) => [p.id, p.username] as const),
  );

  const members = memberIds
    .map((id) => ({
      userId: id,
      username: profileById.get(id) ?? id.slice(0, 8),
    }))
    .sort((a, b) => a.username.localeCompare(b.username));

  const origin = await getPublicSiteOrigin();
  const joinPath = `/join/${encodeURIComponent(group.invite_code)}`;
  const joinUrl = `${origin}${joinPath}`;

  const isCreator =
    group.created_by != null && group.created_by === user.id;

  const { data: lbData, error: lbError } = await supabase.rpc(
    "group_leaderboard",
    { p_group_id: groupId },
  );

  let leaderboardRows: LeaderboardRow[] = [];
  let leaderboardError: string | null = null;
  if (lbError) {
    leaderboardError =
      lbError.message ||
      "Could not load leaderboard. Run latest migrations (group_leaderboard).";
  } else if (lbData) {
    leaderboardRows = (lbData as unknown[]).map((raw) => {
      const r = raw as Record<string, unknown>;
      return {
        user_id: String(r.user_id),
        username: String(r.username ?? ""),
        total_points: Number(r.total_points ?? 0),
        exact_hits: Number(r.exact_hits ?? 0),
      };
    });
  }

  return (
    <main className="flex flex-1 flex-col py-8 sm:py-10">
      <PageContainer className="flex flex-col gap-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href="/dashboard/groups"
            className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            ← All groups
          </Link>
          <Link
            href="/dashboard/bracket"
            className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            Playoff bracket
          </Link>
        </div>

        <header className="flex flex-col gap-4 border-b border-border pb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {group.name}
              </h1>
              <p className="mt-2 text-sm text-muted">
                Internal id (for support):{" "}
                <span className="font-mono text-xs">{group.id}</span>. Share the
                join link below — not this id.
              </p>
            </div>
            <LeaveGroupForm groupId={group.id} />
          </div>

          {isCreator ? (
            <RenameGroupForm groupId={group.id} initialName={group.name} />
          ) : null}
        </header>

        <GroupLeaderboard
          groupId={group.id}
          rows={leaderboardRows}
          currentUserId={user.id}
          errorMessage={leaderboardError}
        />

        <Card as="section">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Invite
          </h2>
          <p className="mt-2 text-sm text-muted">
            Anyone with this link can preview the group name and join after
            signing in. Regenerating the invite invalidates old links.
          </p>
          <p className="mt-3 break-all font-mono text-sm text-foreground">
            {joinUrl}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <CopyJoinUrlButton joinUrl={joinUrl} />
            {isCreator ? (
              <RegenerateInviteButton groupId={group.id} />
            ) : null}
          </div>
          <p className="mt-3 font-mono text-xs text-muted">
            Invite code: {group.invite_code}
          </p>
        </Card>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Members ({members.length})
          </h2>
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
            {members.map((m) => (
              <li
                key={m.userId}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <span className="text-foreground">
                  {m.username}
                  {m.userId === user.id ? (
                    <span className="ml-2 text-xs text-muted">(you)</span>
                  ) : null}
                  {group.created_by === m.userId ? (
                    <span className="ml-2 text-xs font-medium text-info-fg">
                      creator
                    </span>
                  ) : null}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  {m.userId !== user.id ? (
                    <Link
                      href={`/dashboard/groups/${group.id}/members/${m.userId}`}
                      className="text-sm font-medium text-accent underline-offset-4 hover:underline"
                    >
                      Picks
                    </Link>
                  ) : null}
                  {isCreator && m.userId !== user.id ? (
                    <RemoveMemberButton
                      groupId={group.id}
                      memberUserId={m.userId}
                      username={m.username}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </PageContainer>
    </main>
  );
}
