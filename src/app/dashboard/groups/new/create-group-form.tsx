"use client";

import { createGroup, type GroupActionState } from "@/app/dashboard/groups/actions";
import { Button } from "@/components/ui/button";
import { useFormState } from "react-dom";

const initial: GroupActionState = { error: null };

const inputClass =
  "mt-1.5 block w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground shadow-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring";

export function CreateGroupForm() {
  const [state, formAction] = useFormState(createGroup, initial);

  return (
    <form action={formAction} className="mt-8 flex max-w-md flex-col gap-4">
      <div>
        <label
          htmlFor="group-name"
          className="block text-sm font-medium text-foreground"
        >
          Group name
        </label>
        <input
          id="group-name"
          name="name"
          type="text"
          required
          maxLength={200}
          placeholder="e.g. Office bracket"
          className={inputClass}
        />
      </div>
      {state.error ? (
        <p
          className="rounded-lg border border-danger-muted bg-danger-muted px-3 py-2.5 text-sm text-danger"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full sm:w-auto">
        Create group
      </Button>
    </form>
  );
}
