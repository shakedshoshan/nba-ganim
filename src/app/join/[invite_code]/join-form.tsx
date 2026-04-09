"use client";

import { useFormState } from "react-dom";
import { joinGroup, type JoinGroupState } from "./actions";

const initial: JoinGroupState = { error: null };

export function JoinGroupForm({
  groupId,
  inviteCode,
}: {
  groupId: string;
  inviteCode: string;
}) {
  const [state, formAction] = useFormState(
    joinGroup.bind(null, inviteCode),
    initial,
  );

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      {state.error ? (
        <p
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700"
      >
        Join group
      </button>
    </form>
  );
}
