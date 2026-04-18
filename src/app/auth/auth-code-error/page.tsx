import { Card } from "@/components/ui/card";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign-in error",
};

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-background px-4 py-12 sm:py-16">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-foreground">
          Could not complete sign-in
        </h1>
        <p className="mt-3 text-sm text-muted">
          The auth link may have expired or was already used. Try signing in
          again from the login page.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent text-sm font-medium text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Back to login
        </Link>
      </Card>
    </div>
  );
}
