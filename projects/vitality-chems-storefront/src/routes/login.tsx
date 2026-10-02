import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { authClient, authEnabled, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { isAdminEmail } from "@/lib/business";
import { ensureStaffAccount } from "@/lib/store-api";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () =>
    seoHead({
      title: "Sign in",
      description: "Lab account sign-in for Vitality Supply.",
      path: "/login",
    }),
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const goAfter = (addr: string) => {
    navigate({ to: isAdminEmail(addr) ? "/admin" : "/account" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!authEnabled) {
      setError("Accounts are not enabled in this environment.");
      return;
    }
    if (!email.includes("@")) {
      setError("Enter a valid laboratory email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const addr = email.trim();
      if (isAdminEmail(addr)) {
        const seeded = await ensureStaffAccount();
        if (!seeded.ok) throw new Error(seeded.error ?? "Staff account unavailable");
        const { error: err } = await authClient.signIn.email({
          email: addr,
          password,
        });
        if (err) throw new Error(err.message);
        goAfter(addr);
        return;
      }
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.trim(),
        });
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (err) throw new Error(err.message);
      }
      goAfter(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader active="signin" />
      <main className="mx-auto grid max-w-md px-6 pt-8 pb-20">
        <p className="font-mono text-xs tracking-widest text-primary uppercase">Lab account</p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-wide uppercase">
          {mode === "up" ? "Create account" : "Sign in"}
        </h1>
        <p className="mt-3 text-sm text-muted">
          Bank 5% of every order as reward credits — they only spend on a later purchase, so you come
          back. Guest checkout still works if you skip this.
        </p>

        <div className="mt-6 grid gap-2">
          {GROK_PROVIDERS.map((p) => (
            <button
              key={p.providerId}
              type="button"
              onClick={() => signIn(p.providerId, { callbackURL: "/account" })}
              className="min-h-11 rounded-sm border border-border bg-surface px-4 font-display text-xs font-semibold tracking-widest uppercase hover:border-primary hover:text-primary"
            >
              Continue with {p.label}
            </button>
          ))}
        </div>

        <p className="my-5 text-center font-mono text-[10px] tracking-widest text-faint uppercase">
          or email
        </p>

        <form onSubmit={submit} className="space-y-3">
          {mode === "up" && (
            <label className="block text-xs tracking-widest text-muted uppercase">
              Name
              <input
                className="input-field mt-1"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}
          <label className="block text-xs tracking-widest text-muted uppercase">
            Email
            <input
              className="input-field mt-1"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-xs tracking-widest text-muted uppercase">
            Password
            <input
              className="input-field mt-1"
              type="password"
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "up" ? "Create lab account" : "Sign in"}
          </button>
        </form>
        <button
          type="button"
          className="mt-4 text-sm text-muted hover:text-primary"
          onClick={() => setMode((m) => (m === "in" ? "up" : "in"))}
        >
          {mode === "in" ? "New here? Create a lab account" : "Already have an account? Sign in"}
        </button>
        <Link to="/" className="mt-8 text-sm text-muted hover:text-primary">
          ← Back to catalog
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
