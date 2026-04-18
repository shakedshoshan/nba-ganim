import { Card } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JoinGroupForm } from "./join-form";

type PreviewRow = { group_id: string; group_name: string };

export default async function JoinInvitePage({
  params,
}: {
  params: Promise<{ invite_code: string }>;
}) {
  const { invite_code: rawCode } = await params;
  const inviteCode = decodeURIComponent(rawCode);

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: preview, error: previewError } = await supabase.rpc(
    "get_group_by_invite_code",
    { p_invite: inviteCode },
  );

  if (previewError || !preview?.length) {
    notFound();
  }

  const row = preview[0] as PreviewRow;
  const groupId = row.group_id;
  const groupName = row.group_name;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loginHref = `/login?next=${encodeURIComponent(`/join/${inviteCode}`)}`;
  const signupHref = `/signup?next=${encodeURIComponent(`/join/${inviteCode}`)}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:py-16">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Join group
        </h1>
        <p className="mt-2 text-sm text-muted">
          You&apos;re invited to{" "}
          <span className="font-medium text-foreground">{groupName}</span>.
        </p>
        <p className="mt-1 font-mono text-xs text-muted">
          Code: {inviteCode}
        </p>

        {user ? (
          <JoinGroupForm groupId={groupId} inviteCode={inviteCode} />
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            <p className="text-sm text-muted">Sign in to join this group.</p>
            <Link
              href={loginHref}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent text-sm font-medium text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Log in
            </Link>
            <Link
              href={signupHref}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-surface text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Create account
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
