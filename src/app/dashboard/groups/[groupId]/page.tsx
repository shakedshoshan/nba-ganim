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
import { GroupSwitcher } from "@/components/dashboard/group-switcher";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import { loadUserGroupsForSwitcher } from "@/lib/groups/user-groups-for-switcher";
import { profileDisplayName } from "@/lib/profiles/display-name";
import { getPublicSiteOrigin } from "@/lib/site-url";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ groupId: string }> };

const backLinkClass =
  "inline-flex min-h-11 w-fit items-center text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { groupId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("groups")
    .select("name")
    .eq("id", groupId)
    .maybeSingle();
  if (!data?.name) {
    return { title: "Group" };
  }
  return { title: `${data.name} · Group` };
}

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

  if (groupError) {
    throw new Error(groupError.message);
  }
  if (!group) {
    notFound();
  }

  const { data: memberRows } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  const memberIds = (memberRows ?? []).map((m) => m.user_id);
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, username, first_name, last_name")
    .in("id", memberIds);

  const profileById = new Map(
    (profileRows ?? []).map((p) => [
      p.id,
      {
        username: p.username,
        first_name: p.first_name,
        last_name: p.last_name,
      },
    ] as const),
  );

  const members = memberIds
    .map((id) => {
      const prof = profileById.get(id);
      const username = prof?.username ?? id.slice(0, 8);
      return {
        userId: id,
        username,
        displayName: prof
          ? profileDisplayName({
              first_name: prof.first_name,
              last_name: prof.last_name,
              username: prof.username,
            })
          : username,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

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
      "Could not load standings. Try again in a moment.";
  } else if (lbData) {
    leaderboardRows = (lbData as unknown[]).map((raw) => {
      const r = raw as Record<string, unknown>;
      return {
        user_id: String(r.user_id),
        username: String(r.username ?? ""),
        first_name:
          r.first_name != null && r.first_name !== ""
            ? String(r.first_name)
            : null,
        last_name:
          r.last_name != null && r.last_name !== ""
            ? String(r.last_name)
            : null,
        total_points: Number(r.total_points ?? 0),
        exact_hits: Number(r.exact_hits ?? 0),
      };
    });
  }

  const memberCount = members.length;

  const { groups: switcherGroups, activeGroupId: switcherActiveId } =
    await loadUserGroupsForSwitcher(supabase, cookieStore, user.id);

  return (
    <main className="flex flex-1 flex-col py-6 sm:py-10">
      <PageContainer wide className="flex flex-col gap-6 sm:gap-8">
        <div className="border-b border-border pb-4">
          <Link href="/dashboard/groups" className={backLinkClass}>
            ← All groups
          </Link>
        </div>

        {switcherGroups.length > 1 ? (
          <Card as="section" className="shadow-sm">
            <h2 className="text-base font-semibold text-foreground">
              Active group
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              Some screens use your active group for context. Choose which group
              that is when you belong to more than one.
            </p>
            <div className="mt-4">
              <GroupSwitcher
                groups={switcherGroups}
                activeGroupId={switcherActiveId}
              />
            </div>
          </Card>
        ) : null}

        <Card as="section" className="overflow-hidden p-0 shadow-sm">
          <div className="border-b border-border bg-surface-muted/40 px-4 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Private group
                </p>
                <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {group.name}
                </h1>
                <p className="mt-2 max-w-xl text-sm text-muted">
                  {memberCount === 1
                    ? "You are the only member so far. Share the invite link below so friends can join and compete on picks."
                    : `${memberCount} members · Share the invite link so more people can join. Points show up here as games settle.`}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {isCreator ? (
                    <Badge tone="neutral">You created this group</Badge>
                  ) : (
                    <Badge tone="neutral">Member</Badge>
                  )}
                </div>
              </div>
              <LeaveGroupForm groupId={group.id} />
            </div>
          </div>

          {isCreator ? (
            <div className="border-b border-border px-4 py-5 sm:px-6">
              <h2 className="text-sm font-semibold text-foreground">
                Name & branding
              </h2>
              <div className="mt-3">
                <RenameGroupForm groupId={group.id} initialName={group.name} />
              </div>
            </div>
          ) : null}

          <details className="border-t border-border px-4 py-3 sm:px-6">
            <summary className="cursor-pointer list-none text-sm font-medium text-muted marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="underline-offset-4 hover:underline">
                Technical details
              </span>
              <span className="ml-2 text-xs font-normal text-muted/80">
                (support only)
              </span>
            </summary>
            <p className="mt-2 break-all font-mono text-xs text-muted">
              Group id: {group.id}
            </p>
          </details>
        </Card>

        <GroupLeaderboard
          groupId={group.id}
          rows={leaderboardRows}
          currentUserId={user.id}
          errorMessage={leaderboardError}
        />

        <Card as="section" className="shadow-sm">
          <h2 className="text-base font-semibold text-foreground">
            Invite friends
          </h2>
          <p className="mt-2 text-sm text-muted">
            Anyone with the link can see the group name and join after they sign
            in. If you need a new link, use &quot;New invite link&quot; — old
            links stop working.
          </p>
          <div
            className="mt-4 rounded-lg border border-border bg-surface-muted/50 p-3 sm:p-4"
            role="region"
            aria-label="Join link"
          >
            <p className="break-all font-mono text-xs leading-relaxed text-foreground sm:text-sm">
              {joinUrl}
            </p>
          </div>
          <p className="mt-3 text-xs text-muted">
            Short code (for sharing out loud):{" "}
            <span className="font-mono font-medium text-foreground">
              {group.invite_code}
            </span>
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
            <CopyJoinUrlButton joinUrl={joinUrl} />
            {isCreator ? (
              <RegenerateInviteButton groupId={group.id} />
            ) : null}
          </div>
        </Card>

        <Card as="section" className="shadow-sm">
          <h2 className="text-base font-semibold text-foreground">
            Members
          </h2>
          <p className="mt-1 text-sm text-muted">
            Open someone&apos;s picks after games lock and privacy rules allow
            it.
          </p>
          <ul className="mt-5 flex flex-col gap-3">
            {members.map((m) => (
              <li
                key={m.userId}
                className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <span className="font-medium text-foreground">
                    {m.displayName}
                  </span>
                  {m.userId === user.id ? (
                    <span className="ml-2 text-sm text-muted">(you)</span>
                  ) : null}
                  {group.created_by === m.userId ? (
                    <Badge tone="neutral" className="ml-2 align-middle">
                      Creator
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                  {m.userId !== user.id ? (
                    <Link
                      href={`/dashboard/groups/${group.id}/members/${m.userId}`}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-accent transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
                    >
                      View picks
                    </Link>
                  ) : null}
                  {isCreator && m.userId !== user.id ? (
                    <RemoveMemberButton
                      groupId={group.id}
                      memberUserId={m.userId}
                      memberLabel={m.displayName}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </PageContainer>
    </main>
  );
}
