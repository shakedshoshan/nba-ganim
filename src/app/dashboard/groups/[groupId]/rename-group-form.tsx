"use client";

import {
  renameGroup,
  type GroupActionState,
} from "@/app/dashboard/groups/actions";
import { Button } from "@/components/ui/button";
import { useFormState } from "react-dom";

const initial: GroupActionState = { error: null };

const inputClass =
  "min-h-11 w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring sm:w-56";

export function RenameGroupForm({
  groupId,
  initialName,
}: {
  groupId: string;
  initialName: string;
}) {
  const [state, formAction] = useFormState(
    renameGroup.bind(null, groupId),
    initial,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="min-w-0 flex-1">
        <label htmlFor="rename-group" className="sr-only">
          Group name
        </label>
        <input
          id="rename-group"
          name="name"
          type="text"
          required
          maxLength={200}
          defaultValue={initialName}
          className={inputClass}
        />
      </div>
      <Button type="submit" variant="secondary">
        Save name
      </Button>
      {state.error ? (
        <p className="w-full text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
