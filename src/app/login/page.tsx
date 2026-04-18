import { LoginForm } from "@/components/auth/login-form";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Log in",
};

function LoginFormFallback() {
  return (
    <div
      className="h-[420px] w-full max-w-md animate-pulse rounded-xl border border-border bg-surface-muted"
      aria-hidden
    />
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-background px-4 py-12 sm:py-16">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
