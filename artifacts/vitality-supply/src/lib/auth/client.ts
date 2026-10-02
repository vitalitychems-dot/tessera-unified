import { createAuthClient } from "better-auth/react";
import { clearCheckoutDraft } from "@/lib/checkout-draft";

const BEARER_KEY = "vs-auth.bearer-token";
const LEGACY_KEYS = ["vs-auth.bearer-token", "grok-auth.bearer-token"];
let legacyCleared = false;

/**
 * Only the embedded workspace preview needs a bearer token: inside the proxied
 * iframe the session cookie is partitioned/third-party and may be dropped, so
 * Better Auth's `bearer` plugin hands the client a token instead. Deployed
 * traffic is top-level and rides the HttpOnly cookie alone, so no credential is
 * ever left in script-readable storage there.
 */
function usesBearerFallback(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true; // cross-origin parent -> definitely embedded
  }
}

/** Remove tokens written by older builds (localStorage, previous key names). */
function clearLegacyTokens(): void {
  if (typeof window === "undefined" || legacyCleared) return;
  legacyCleared = true;
  try {
    for (const key of LEGACY_KEYS) window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(LEGACY_KEYS[1]);
  } catch {
    // Storage unavailable — nothing to clean.
  }
}

export function getBearerToken(): string | null {
  if (!usesBearerFallback()) return null;
  clearLegacyTokens();
  try {
    return window.sessionStorage.getItem(BEARER_KEY);
  } catch {
    return null;
  }
}

function setBearerToken(token: string | null): void {
  if (typeof window === "undefined") return;
  clearLegacyTokens();
  if (!usesBearerFallback()) return;
  try {
    if (token) window.sessionStorage.setItem(BEARER_KEY, token);
    else window.sessionStorage.removeItem(BEARER_KEY);
  } catch {
    // The server response remains authoritative if storage is unavailable.
  }
}

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => getBearerToken() ?? undefined,
    },
    onResponse(ctx) {
      const token = ctx.response.headers.get("set-auth-token");
      if (token) setBearerToken(token);
    },
  },
});

export const authEnabled = true;

function authError(error: { message?: string } | null, fallback: string): Error {
  return new Error(error?.message || fallback);
}

export async function signInWithEmail(input: {
  email: string;
  password: string;
}): Promise<void> {
  const { error } = await authClient.signIn.email(input);
  if (error) throw authError(error, "Unable to sign in.");
  await authClient.getSession();
}

export async function signUpWithEmail(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ emailVerified: boolean }> {
  const { data, error } = await authClient.signUp.email({
    ...input,
    callbackURL: "/account?verified=1",
  });
  if (error) throw authError(error, "Unable to create account.");
  await authClient.getSession();
  return { emailVerified: data?.user?.emailVerified === true };
}

export async function resendVerificationEmail(input: {
  email: string;
  callbackURL?: string;
}): Promise<void> {
  const { error } = await authClient.sendVerificationEmail({
    email: input.email,
    callbackURL: input.callbackURL ?? "/account?verified=1",
  });
  if (error) throw authError(error, "Unable to send the verification email.");
}

export async function signOut(redirectTo = "/"): Promise<void> {
  let failure: Error | null = null;
  try {
    const { error } = await authClient.signOut();
    if (error) failure = authError(error, "Unable to sign out.");
  } catch (error) {
    failure = error instanceof Error ? error : new Error("Unable to sign out.");
  } finally {
    setBearerToken(null);
    clearCheckoutDraft();
    authClient.$store.notify("$sessionSignal");
  }
  if (failure) throw failure;
  if (typeof window !== "undefined") window.location.assign(redirectTo);
}