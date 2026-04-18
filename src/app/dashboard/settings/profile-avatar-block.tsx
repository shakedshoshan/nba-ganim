"use client";

import { refreshRandomAvatar } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import {
  defaultTestingBotAvatarUrl,
  TESTINGBOT_AVATAR_DISPLAY_SIZE,
} from "@/lib/profiles/testingbot-avatar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ProfileAvatarBlock({
  userId,
  avatarUrl,
}: {
  userId: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const src =
    avatarUrl?.trim() ||
    defaultTestingBotAvatarUrl(userId, TESTINGBOT_AVATAR_DISPLAY_SIZE);

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:gap-6">
      <div className="shrink-0">
        <img
          src={src}
          alt="Your profile photo"
          width={TESTINGBOT_AVATAR_DISPLAY_SIZE}
          height={TESTINGBOT_AVATAR_DISPLAY_SIZE}
          className="size-28 rounded-full border border-border bg-surface-muted object-cover shadow-sm sm:size-36"
        />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Profile photo</h2>
          <p className="mt-1 text-sm text-muted">
            Random placeholder faces from{" "}
            <Link
              href="https://testingbot.com/free-online-tools/free-avatar-generator"
              className="font-medium text-accent underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              TestingBot&apos;s free avatar generator
            </Link>
            . Press the button to pick a new one; it saves immediately.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 w-full sm:w-auto"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const r = await refreshRandomAvatar();
              if (r.error) {
                setError(r.error);
                return;
              }
              router.refresh();
            });
          }}
        >
          {pending ? "Updating…" : "New random avatar"}
        </Button>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
