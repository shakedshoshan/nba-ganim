import { SignupForm } from "@/components/auth/signup-form";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign up",
};

function SignupFormFallback() {
  return (
    <div
      className="h-[420px] w-full max-w-md animate-pulse rounded-xl border border-border bg-surface-muted"
      aria-hidden
    />
  );
}

export default function SignupPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-background px-4 py-12 sm:py-16">
      <Suspense fallback={<SignupFormFallback />}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
