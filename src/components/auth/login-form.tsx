"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const inputClass =
  "mt-1.5 block w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground shadow-sm outline-none transition-shadow focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Log in
      </h1>
      <p className="mt-2 text-sm text-muted">
        NBA Playoff Challenge — join your group and place picks.
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
      </div>

      <form onSubmit={onEmailLogin} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-foreground"
          >
            Email
          </label>
          <input
            id="login-email"
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
            htmlFor="login-password"
            className="block text-sm font-medium text-foreground"
          >
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        No account?{" "}
        <Link
          href={
            next === "/dashboard"
              ? "/signup"
              : `/signup?next=${encodeURIComponent(next)}`
          }
          className="min-h-11 font-medium text-accent underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </Card>
  );
}
