import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign-in error | NBA Playoff Challenge",
};

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Could not complete sign-in
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          The auth link may have expired or was already used. Try signing in
          again from the login page.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
