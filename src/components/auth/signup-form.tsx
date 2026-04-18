"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const inputClass =
  "mt-1.5 block w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground shadow-sm outline-none transition-shadow focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      if (data.session) {
        router.push(next);
        router.refresh();
        return;
      }
      setMessage(
        "Check your email for a confirmation link before signing in.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Create account
      </h1>
      <p className="mt-2 text-sm text-muted">
        Sign up to join groups and track playoff picks.
      </p>

      <div aria-live="polite" className="min-h-0">
        {error ? (
          <p
            className="mt-4 rounded-lg border border-danger-muted bg-danger-muted px-3 py-2.5 text-sm text-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-lg border border-border bg-success-bg px-3 py-2.5 text-sm text-success-fg">
            {message}
          </p>
        ) : null}
      </div>

      <form onSubmit={onEmailSignup} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="signup-email"
            className="block text-sm font-medium text-foreground"
          >
            Email
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="signup-password"
            className="block text-sm font-medium text-foreground"
          >
            Password
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted">At least 6 characters.</p>
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href={
            next === "/dashboard"
              ? "/login"
              : `/login?next=${encodeURIComponent(next)}`
          }
          className="min-h-11 font-medium text-accent underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </Card>
  );
}
