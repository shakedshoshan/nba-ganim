import { PageContainer } from "@/components/ui/page-container";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Groups",
};

const groupRow =
  "block rounded-xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-accent/40 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default async function GroupsListPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const ids = (memberships ?? []).map((m) => m.group_id);
  let groups: { id: string; name: string; invite_code: string }[] = [];
  if (ids.length) {
    const { data: rows } = await supabase
      .from("groups")
      .select("id, name, invite_code")
      .in("id", ids);
    groups = (rows ?? [])
      .filter((g): g is { id: string; name: string; invite_code: string } =>
        Boolean(g?.id),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <main className="flex flex-1 flex-col py-8 sm:py-10">
      <PageContainer>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Your groups
          </h1>
          <Link
            href="/dashboard/groups/new"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Create a group
          </Link>
        </div>

        {!groups.length ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-surface-muted p-6 text-sm text-muted">
            <p>You are not in any group yet.</p>
            <p className="mt-2">
              Create a group for an invite link, or open a link someone shared
              with you.
            </p>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {groups.map((g) => (
              <li key={g.id}>
                <Link href={`/dashboard/groups/${g.id}`} className={groupRow}>
                  <span className="font-medium text-foreground">{g.name}</span>
                  <p className="mt-1 font-mono text-xs text-muted">
                    Invite code: {g.invite_code}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </main>
  );
}
