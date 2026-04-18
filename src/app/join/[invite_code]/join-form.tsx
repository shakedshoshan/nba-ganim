"use client";

import { Button } from "@/components/ui/button";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { joinGroup, type JoinGroupState } from "./actions";

const initial: JoinGroupState = { error: null };

function JoinSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Joining…" : "Join group"}
    </Button>
  );
}

export function JoinGroupForm({
  groupId,
  inviteCode,
}: {
  groupId: string;
  inviteCode: string;
}) {
  const [state, formAction] = useActionState(
    joinGroup.bind(null, inviteCode),
    initial,
  );

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      <input type="hidden" name="groupId" value={groupId} />
      <div aria-live="polite">
        {state.error ? (
          <p
            className="rounded-lg border border-danger-muted bg-danger-muted px-3 py-2.5 text-sm text-danger"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}
      </div>
      <JoinSubmitButton />
    </form>
  );
}
