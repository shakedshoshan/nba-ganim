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
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Join group
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          You&apos;re invited to <span className="font-medium">{groupName}</span>
          .
        </p>
        <p className="mt-1 font-mono text-xs text-zinc-500">
          Code: {inviteCode}
        </p>

        {user ? (
          <JoinGroupForm groupId={groupId} inviteCode={inviteCode} />
        ) : (
          <div className="mt-8 space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Sign in to join this group.
            </p>
            <Link
              href={loginHref}
              className="block w-full rounded-lg bg-red-600 py-2.5 text-center text-sm font-medium text-white hover:bg-red-700"
            >
              Log in
            </Link>
            <Link
              href={signupHref}
              className="block w-full rounded-lg border border-zinc-300 py-2.5 text-center text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
