import { AuthenticatedTopBar } from "@/components/layout/authenticated-top-bar";
import { SiteLogo } from "@/components/ui/site-logo";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";

const navLink =
  "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const navLinkActive =
  "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type AppTopBarProps = {
  /** When `"home"`, the Home nav item is styled as current (for `/`). */
  current?: "home" | "dashboard";
};

export async function AppTopBar({ current }: AppTopBarProps = {}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <SiteLogo href="/" size={40} />
            <nav
              className="flex flex-wrap items-center gap-1 sm:gap-2"
              aria-label="Main"
            >
              <Link
                href="/"
                className={current === "home" ? navLinkActive : navLink}
                aria-current={current === "home" ? "page" : undefined}
              >
                Home
              </Link>
              <Link href="/login" className={navLink}>
                Log in
              </Link>
              <Link href="/signup" className={navLink}>
                Sign up
              </Link>
            </nav>
          </div>
        </div>
      </header>
    );
  }

  return <AuthenticatedTopBar current={current} />;
}
