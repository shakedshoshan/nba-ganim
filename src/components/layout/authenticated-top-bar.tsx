"use client";

import { signOut } from "@/app/auth/actions";
import { SiteLogo } from "@/components/ui/site-logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

const navLink =
  "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const navLinkActive =
  "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const mobileNavItem =
  "flex min-h-11 w-full items-center rounded-lg px-3 text-base font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type Props = {
  current?: "home" | "dashboard";
};

function MenuIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function AuthenticatedTopBar({ current }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
          aria-label="Close menu"
          onClick={close}
        />
      ) : null}

      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 lg:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-4">
            <SiteLogo href="/dashboard" size={40} />
            <nav
              className="hidden items-center gap-1 lg:flex lg:gap-2"
              aria-label="Main"
            >
              <Link href="/dashboard" className={navLink}>
                Dashboard
              </Link>
              <Link href="/dashboard/bets" className={navLink}>
                My bets
              </Link>
              <Link href="/dashboard/bracket" className={navLink}>
                Bracket
              </Link>
              <Link href="/dashboard/groups" className={navLink}>
                Groups
              </Link>
              <Link href="/dashboard/settings" className={navLink}>
                Profile
              </Link>
              <Link
                href="/"
                className={current === "home" ? navLinkActive : navLink}
                aria-current={current === "home" ? "page" : undefined}
              >
                Home
              </Link>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 lg:gap-3">
            <div className="hidden lg:block">
              <form action={signOut}>
                <button type="submit" className={navLink}>
                  Sign out
                </button>
              </form>
            </div>

            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {open ? (
          <div
            id={panelId}
            className="border-t border-border bg-surface pb-4 shadow-inner lg:hidden"
          >
            <nav className="flex flex-col gap-1 px-2 pt-2" aria-label="Main">
              <Link href="/dashboard" className={mobileNavItem} onClick={close}>
                Dashboard
              </Link>
              <Link href="/dashboard/bets" className={mobileNavItem} onClick={close}>
                My bets
              </Link>
              <Link
                href="/dashboard/bracket"
                className={mobileNavItem}
                onClick={close}
              >
                Bracket
              </Link>
              <Link href="/dashboard/groups" className={mobileNavItem} onClick={close}>
                Groups
              </Link>
              <Link
                href="/dashboard/settings"
                className={mobileNavItem}
                onClick={close}
              >
                Profile
              </Link>
              <Link
                href="/"
                className={
                  current === "home"
                    ? `${mobileNavItem} bg-surface-muted font-semibold`
                    : mobileNavItem
                }
                aria-current={current === "home" ? "page" : undefined}
                onClick={close}
              >
                Home
              </Link>
            </nav>

            <div className="mt-3 border-t border-border px-3 pt-4">
              <form action={signOut} className="w-full">
                <button type="submit" className={`${mobileNavItem} border border-border`}>
                  Sign out
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </header>
    </>
  );
}
