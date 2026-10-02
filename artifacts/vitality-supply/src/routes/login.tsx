import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  resendVerificationEmail,
  signInWithEmail,
  signUpWithEmail,
} from "@/lib/auth/client";
import { isAdminEmail } from "@/lib/business";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { noindexSeoHead } from "@/lib/seo";
import { trackEvent } from "@/lib/analytics";
import { safeLoginRedirect } from "@/lib/auth/redirect";

type Mode = "in" | "up";

export const Route = createFileRoute("/login")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string } => ({
    redirect:
      safeLoginRedirect(search.redirect, "") || undefined,
  }),
  component: Login,
  head: () =>
    noindexSeoHead({
      title: "Sign in",
      description: "Vitality Chems account sign-in.",
      path: "/login",
    }),
});

function friendlyAuthError(error: unknown, mode: Mode): string {
  const message =
    error instanceof Error ? error.message : "The authentication request failed.";
  const normalized = message.toLowerCase();
  if (
    normalized.includes("invalid email or password") ||
    normalized.includes("invalid_email_or_password") ||
    normalized.includes("incorrect password")
  ) {
    return "The email or password is incorrect.";
  }
  if (
    normalized.includes("already exists") ||
    normalized.includes("already registered") ||
    normalized.includes("user_already_exists")
  ) {
    return "An account already uses this email. Sign in instead.";
  }
  if (
    normalized.includes("password") &&
    (normalized.includes("short") ||
      normalized.includes("least") ||
      normalized.includes("weak"))
  ) {
    return "Password must be at least 8 characters.";
  }
  return message || (mode === "in" ? "Unable to sign in." : "Unable to create account.");
}

function Login() {
  const { redirect = "/account" } = Route.useSearch();
  const [mode, setMode] = useState<Mode>("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(
    null,
  );
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  function chooseMode(next: Mode) {
    setMode(next);
    setError(null);
    setNeedsVerification(false);
    setVerificationMessage(null);
    setPassword("");
    setConfirm("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setVerificationMessage(null);
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (mode === "up") {
      if (!name.trim()) {
        setError("Enter your name.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
      if (isAdminEmail(address)) {
        setError(
          "Staff accounts are provisioned by the owner. Sign in instead.",
        );
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "up") {
        const result = await signUpWithEmail({
          name: name.trim(),
          email: address,
          password,
        });
        trackEvent("account_auth_success", { action: "signup" });
        if (!result.emailVerified) {
          setNeedsVerification(true);
          setVerificationMessage(
            "Account created. Check your inbox and spam folder, then verify your email before signing in.",
          );
          setPassword("");
          setConfirm("");
          return;
        }
      } else {
        await signInWithEmail({ email: address, password });
        trackEvent("account_auth_success", { action: "login" });
      }
      window.location.assign(isAdminEmail(address) ? "/admin" : redirect);
    } catch (cause) {
      setError(friendlyAuthError(cause, mode));
      const message = cause instanceof Error ? cause.message.toLowerCase() : "";
      setNeedsVerification(
        mode === "in" &&
          (message.includes("email not verified") ||
            message.includes("email_not_verified") ||
            message.includes("verify your email")),
      );
      if (
        mode === "in" &&
        (message.includes("email not verified") ||
          message.includes("email_not_verified") ||
          message.includes("verify your email"))
      ) {
        trackEvent("verification_result", { status: "required" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    const address = email.trim().toLowerCase();
    setVerificationBusy(true);
    setVerificationMessage(null);
    try {
      await resendVerificationEmail({
        email: address,
        callbackURL: "/account?verified=1",
      });
       trackEvent("verification_requested", { status: "sent", channel: "email" });
      setVerificationMessage(
        "Verification email sent. Check your inbox and spam folder, then use the link.",
      );
    } catch (cause) {
      setVerificationMessage(
        cause instanceof Error
          ? cause.message
          : "Unable to send the verification email.",
      );
    } finally {
      setVerificationBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader active="signin" />
      <main className="mx-auto grid max-w-md px-6 pt-8 pb-20">
        <p className="font-mono text-xs tracking-widest text-primary uppercase">
          Lab account
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-wide uppercase">
          Welcome back
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Sign in to view orders and use your reward credits, or create a
          customer account.
        </p>

        <div
          className="mt-7 grid grid-cols-2 rounded-lg border border-border bg-surface p-1"
          role="tablist"
          aria-label="Account access"
        >
          {(["in", "up"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mode === tab}
              onClick={() => chooseMode(tab)}
              className={`min-h-10 rounded-md px-3 font-display text-xs font-semibold tracking-widest uppercase transition ${
                mode === tab
                  ? "bg-primary text-white"
                  : "text-muted hover:text-fg"
              }`}
            >
              {tab === "in" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "up" && (
            <Field label="Name">
              <input
                className="input-field mt-1"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={busy}
                required
              />
            </Field>
          )}
          <Field label="Email">
            <input
              className="input-field mt-1"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
              required
            />
          </Field>
          <Field label="Password">
            <input
              className="input-field mt-1"
              type="password"
              minLength={8}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              required
            />
          </Field>
          {mode === "up" && (
            <Field label="Confirm password">
              <input
                className="input-field mt-1"
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                disabled={busy}
                required
              />
            </Field>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </p>
          )}
          {needsVerification && (
            <div className="rounded-md border border-primary/40 bg-primary/5 px-3 py-3 text-sm">
              <p className="leading-relaxed text-muted">
                {mode === "up"
                  ? "Confirm email ownership before signing in or accessing account history. Request a fresh link if the original email expired or did not arrive."
                  : "Confirm email ownership before signing in or accessing account history. Request a fresh link if the original email expired or did not arrive."}
              </p>
              <button
                type="button"
                className="mt-3 text-primary underline-offset-4 hover:underline disabled:opacity-60"
                onClick={() => void resendVerification()}
                disabled={verificationBusy || busy}
              >
                {verificationBusy ? "Sending…" : "Resend verification email"}
              </button>
              {verificationMessage && (
                <p className="mt-2 text-xs leading-relaxed text-muted" role="status">
                  {verificationMessage}
                </p>
              )}
            </div>
          )}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy
              ? mode === "in"
                ? "Signing in…"
                : "Creating account…"
              : mode === "in"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="mt-5 rounded-md border border-border bg-surface/60 px-3 py-3 text-xs leading-relaxed text-muted">
          <span className="font-semibold text-fg">Forgot password?</span>{" "}
          Password reset by email becomes available once email delivery is
          connected.
        </div>
        <Link to="/" className="mt-8 text-sm text-muted hover:text-primary">
          ← Back to catalog
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs tracking-widest text-muted uppercase">
      {label}
      {children}
    </label>
  );
}
