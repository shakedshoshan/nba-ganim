"use client";

import { Button } from "@/components/ui/button";
import {
  leaveGroupFormAction,
  regenerateGroupInvite,
  removeGroupMember,
} from "@/app/dashboard/groups/actions";
import type { GroupActionState } from "@/app/dashboard/groups/actions";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

export function CopyJoinUrlButton({ joinUrl }: { joinUrl: string }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      <Button
        type="button"
        variant="primary"
        disabled={pending}
        className="w-full min-h-11 sm:w-auto"
        onClick={() => {
          startTransition(() => {
            void navigator.clipboard.writeText(joinUrl).then(() => {
              setCopied(true);
            });
          });
        }}
      >
        {pending ? "Copying…" : "Copy join link"}
      </Button>
      <p className="min-h-5 text-center text-xs text-muted sm:text-left" aria-live="polite">
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
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        className="w-full min-h-11 sm:w-auto"
        onClick={() => {
          setError(null);
          if (
            !window.confirm(
              "This creates a new invite link. Anyone using the old link will not be able to join. Continue?",
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
        {pending ? "Working…" : "New invite link"}
      </Button>
      {error ? (
        <p className="text-center text-xs text-danger sm:text-left" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RemoveMemberButton({
  groupId,
  memberUserId,
  memberLabel,
}: {
  groupId: string;
  memberUserId: string;
  memberLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
      <Button
        type="button"
        variant="danger"
        disabled={pending}
        className="w-full min-h-11 px-4 sm:w-auto"
        onClick={() => {
          setError(null);
          if (
            !window.confirm(
              `Remove ${memberLabel} from this group? They can rejoin if you send a new invite link.`,
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
        {pending ? "Removing…" : "Remove from group"}
      </Button>
      {error ? (
        <p className="text-center text-xs text-danger sm:text-right" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const leaveInitial: GroupActionState = { error: null };

export function LeaveGroupForm({ groupId }: { groupId: string }) {
  const [state, formAction] = useActionState(
    leaveGroupFormAction,
    leaveInitial,
  );

  return (
    <form
      action={formAction}
      className="flex w-full flex-col gap-2 sm:max-w-xs sm:self-end"
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Leave this group? You can rejoin later if someone shares a new invite link with you.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="groupId" value={groupId} />
      <Button
        type="submit"
        variant="secondary"
        className="w-full min-h-11 border-danger-muted text-danger hover:bg-danger-muted/20"
      >
        Leave group
      </Button>
      {state.error ? (
        <span className="text-center text-xs text-danger sm:text-right" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
