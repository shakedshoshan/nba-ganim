"use client";

import {
  renameGroup,
  type GroupActionState,
} from "@/app/dashboard/groups/actions";
import { Button } from "@/components/ui/button";
import { useActionState } from "react";

const initial: GroupActionState = { error: null };

const inputClass =
  "mt-1.5 block w-full min-h-11 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring";

export function RenameGroupForm({
  groupId,
  initialName,
}: {
  groupId: string;
  initialName: string;
}) {
  const [state, formAction] = useActionState(
    renameGroup.bind(null, groupId),
    initial,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="min-w-0">
        <label
          htmlFor="rename-group"
          className="text-sm font-medium text-foreground"
        >
          Group name
        </label>
        <input
          id="rename-group"
          name="name"
          type="text"
          required
          maxLength={200}
          defaultValue={initialName}
          autoComplete="off"
          className={inputClass}
        />
        <p className="mt-1.5 text-xs text-muted">
          Only you can change the name people see on the invite page.
        </p>
      </div>
      <Button type="submit" variant="secondary" className="w-full min-h-11 sm:w-fit">
        Save name
      </Button>
      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
