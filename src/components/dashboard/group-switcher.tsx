"use client";

import { setActiveGroupId } from "@/app/dashboard/groups/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function GroupSwitcher({
  groups,
  activeGroupId,
}: {
  groups: { id: string; name: string }[];
  activeGroupId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (groups.length === 0) {
    return null;
  }

  if (groups.length === 1) {
    const only = groups[0];
    return (
      <p className="max-w-[16rem] truncate text-sm text-muted">
        <span className="font-medium text-foreground">Active group:</span>{" "}
        {only.name}
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span className="shrink-0">Active group</span>
        <select
          className="min-h-11 max-w-[min(100%,14rem)] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={pending}
          value={activeGroupId ?? groups[0].id}
          onChange={(e) => {
            const id = e.target.value;
            setError(null);
            startTransition(async () => {
              const res = await setActiveGroupId(id);
              if (res?.error) {
                setError(res.error);
                return;
              }
              router.refresh();
            });
          }}
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
