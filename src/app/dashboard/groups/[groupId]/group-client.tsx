"use client";

import { Button } from "@/components/ui/button";
import {
  leaveGroupFormAction,
  regenerateGroupInvite,
  removeGroupMember,
} from "@/app/dashboard/groups/actions";
import type { GroupActionState } from "@/app/dashboard/groups/actions";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useFormState } from "react-dom";

export function CopyJoinUrlButton({ joinUrl }: { joinUrl: string }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={() => {
          startTransition(() => {
            void navigator.clipboard.writeText(joinUrl).then(() => {
              setCopied(true);
            });
          });
        }}
      >
        {pending ? "Copying…" : "Copy join link"}
      </button>
      <p className="min-h-5 text-xs text-muted" aria-live="polite">
        {copied ? "Join link copied to clipboard." : null}
      </p>
    </div>
  );
}

export function RegenerateInviteButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface-muted px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={() => {
          setError(null);
          if (
            !window.confirm(
              "Regenerating creates a new invite code. Old links will stop working. Continue?",
            )
          ) {
            return;
          }
          startTransition(async () => {
            const r = await regenerateGroupInvite(groupId);
            if (r.error) {
              setError(r.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {pending ? "Working…" : "Regenerate invite link"}
      </button>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RemoveMemberButton({
  groupId,
  memberUserId,
  username,
}: {
  groupId: string;
  memberUserId: string;
  username: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        className="inline-flex min-h-11 min-w-18 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-danger transition-colors hover:bg-danger-muted/30 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={() => {
          setError(null);
          if (
            !window.confirm(
              `Remove ${username} from this group? They can rejoin with a new invite if you share one.`,
            )
          ) {
            return;
          }
          startTransition(async () => {
            const r = await removeGroupMember(groupId, memberUserId);
            if (r.error) {
              setError(r.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {pending ? "…" : "Remove"}
      </button>
      {error ? (
        <p className="max-w-48 text-right text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const leaveInitial: GroupActionState = { error: null };

export function LeaveGroupForm({ groupId }: { groupId: string }) {
  const [state, formAction] = useFormState(
    leaveGroupFormAction,
    leaveInitial,
  );

  return (
    <form
      action={formAction}
      className="inline-flex flex-col items-stretch gap-1 sm:items-end"
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Leave this group? You can rejoin with an invite if someone shares one.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="groupId" value={groupId} />
      <Button type="submit" variant="secondary" className="border-danger-muted text-danger">
        Leave group
      </Button>
      {state.error ? (
        <span className="text-xs text-danger" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
