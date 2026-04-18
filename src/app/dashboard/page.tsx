import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

const cardLink =
  "flex min-h-[4.5rem] flex-col justify-center rounded-xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-accent/40 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col py-8 sm:py-10">
      <PageContainer>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-muted">
          Signed in as{" "}
          <span className="font-medium text-foreground">
            {user?.email ?? "—"}
          </span>
        </p>
        <p className="mt-4 max-w-2xl text-sm text-muted">
          Open the bracket for live series scores, manage picks on My bets, and
          check standings on each group page.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          <li>
            <Link href="/dashboard/bracket" className={cardLink}>
              <span className="text-base font-semibold text-foreground">
                Playoff bracket
              </span>
              <span className="mt-1 text-sm text-muted">
                Series progress and game logs
              </span>
            </Link>
          </li>
          <li>
            <Link href="/dashboard/bets" className={cardLink}>
              <span className="text-base font-semibold text-foreground">
                My bets
              </span>
              <span className="mt-1 text-sm text-muted">
                Series picks and tournament predictions
              </span>
            </Link>
          </li>
          <li>
            <Link href="/dashboard/groups" className={cardLink}>
              <span className="text-base font-semibold text-foreground">
                Groups
              </span>
              <span className="mt-1 text-sm text-muted">
                Invites, members, active group
              </span>
            </Link>
          </li>
        </ul>

        <Card className="mt-8 p-4 sm:p-5">
          <p className="text-sm text-muted">
            <Link
              href="/dashboard/groups/new"
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              Create a group
            </Link>{" "}
            to get a shareable invite link for your league.
          </p>
        </Card>
      </PageContainer>
    </main>
  );
}
