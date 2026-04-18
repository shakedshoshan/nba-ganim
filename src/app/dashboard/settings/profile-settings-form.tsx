"use client";

import type { ProfileSettingsState } from "@/app/dashboard/settings/actions";
import { updateProfileSettings } from "@/app/dashboard/settings/actions";

const profileSettingsInitialState: ProfileSettingsState = {
  error: null,
  saved: false,
};
import { ProfileAvatarBlock } from "@/app/dashboard/settings/profile-avatar-block";
import { Button } from "@/components/ui/button";
import { useActionState } from "react";

const inputClass =
  "mt-1.5 block w-full min-h-11 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring";

const selectClass = inputClass;

export type ProfileSettingsInitial = {
  userId: string;
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  username: string;
  favoriteGroupId: string;
  groups: { id: string; name: string }[];
};

export function ProfileSettingsForm({
  initial,
}: {
  initial: ProfileSettingsInitial;
}) {
  const [state, formAction] = useActionState(
    updateProfileSettings,
    profileSettingsInitialState,
  );

  return (
    <div className="flex flex-col gap-6">
      <ProfileAvatarBlock
        userId={initial.userId}
        avatarUrl={initial.avatarUrl}
      />

      <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="min-w-0">
          <label
            htmlFor="profile-first"
            className="text-sm font-medium text-foreground"
          >
            First name
          </label>
          <input
            id="profile-first"
            name="firstName"
            type="text"
            maxLength={80}
            defaultValue={initial.firstName}
            autoComplete="given-name"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted">
            Optional. Shown to people in your groups (e.g. standings).
          </p>
        </div>
        <div className="min-w-0">
          <label
            htmlFor="profile-last"
            className="text-sm font-medium text-foreground"
          >
            Family name
          </label>
          <input
            id="profile-last"
            name="lastName"
            type="text"
            maxLength={80}
            defaultValue={initial.lastName}
            autoComplete="family-name"
            className={inputClass}
          />
        </div>
      </div>

      <div className="min-w-0">
        <label
          htmlFor="profile-username"
          className="text-sm font-medium text-foreground"
        >
          Username
        </label>
        <input
          id="profile-username"
          name="username"
          type="text"
          required
          minLength={2}
          maxLength={40}
          defaultValue={initial.username}
          autoComplete="username"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-muted">
          Unique handle (2–40 characters, no spaces).
        </p>
      </div>

      <div className="min-w-0">
        <label
          htmlFor="profile-favorite"
          className="text-sm font-medium text-foreground"
        >
          Favorite group
        </label>
        <select
          id="profile-favorite"
          name="favoriteGroupId"
          defaultValue={initial.favoriteGroupId}
          className={selectClass}
        >
          <option value="">None</option>
          {initial.groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">
          Used when you have no active group cookie (e.g. new device). Saving
          also sets your active group when a favorite is chosen.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" variant="secondary" className="min-h-11 w-full sm:w-auto">
          Save profile
        </Button>
        {state.saved ? (
          <p className="text-sm text-muted" role="status">
            Profile updated.
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
    </div>
  );
}
