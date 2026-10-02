import { useEffect, useState, type ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Heavy Council, Apr 2026 — Proposals P1, P2, P5, P6, P11
//
// Single-credential, finite-state entry. The operator presents ONE token.
// The server returns an HttpOnly cookie. Browser code never touches the
// canonical token after submission. Four UI states, one CTA per state, plus
// a recovery runbook drawer.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/?$/, "/");

type GateState =
  | { kind: "loading" }
  | { kind: "unconfigured" }
  | { kind: "locked"; reason?: string }
  | { kind: "submitting" }
  | { kind: "invalid"; reason?: string }
  | { kind: "rate-limited"; retryAfterMs: number }
  | { kind: "expired" }
  | { kind: "unlocked"; expiresAt: number };

interface StatusResponse {
  ok: boolean;
  configured: boolean;
  authenticated: boolean;
  expiresAt?: number;
  reason?: string;
}

async function fetchStatus(): Promise<StatusResponse | null> {
  try {
    const res = await fetch(`${BASE}api/admin/session/status`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as StatusResponse;
  } catch {
    return null;
  }
}

async function postUnlock(token: string): Promise<{ ok: true; expiresAt: number } | { ok: false; status: number; body: unknown }> {
  const res = await fetch(`${BASE}api/admin/session`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  let body: unknown = null;
  try { body = await res.json(); } catch { /* ignore */ }
  if (res.ok) {
    const b = body as { expiresAt?: number };
    return { ok: true, expiresAt: b.expiresAt ?? Date.now() + 8 * 3600 * 1000 };
  }
  return { ok: false, status: res.status, body };
}

async function postLogout(): Promise<void> {
  try {
    await fetch(`${BASE}api/admin/session/logout`, { method: "POST", credentials: "include" });
  } catch { /* ignore */ }
}

function classifyStatus(s: StatusResponse | null): GateState {
  if (!s) return { kind: "locked", reason: "network" };
  if (!s.configured) return { kind: "unconfigured" };
  if (s.authenticated && s.expiresAt) return { kind: "unlocked", expiresAt: s.expiresAt };
  if (s.reason === "expired") return { kind: "expired" };
  return { kind: "locked", reason: s.reason };
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ }
      }}
      className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
    >
      {done ? "copied" : "copy"}
    </button>
  );
}

function RecoveryPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6 border-t border-zinc-800 pt-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-xs text-zinc-400 hover:text-zinc-200"
      >
        {open ? "▾" : "▸"} Can't unlock? Recovery runbook
      </button>
      {open && (
        <ol className="mt-3 space-y-3 text-xs text-zinc-300">
          <li>
            <div className="font-semibold text-zinc-100">1. Generate a new token</div>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 px-2 py-1 rounded bg-black/40 font-mono text-emerald-300 text-[11px]">openssl rand -base64 48 | tr -d '\n'</code>
              <CopyButton text={"openssl rand -base64 48 | tr -d '\\n'"} />
            </div>
          </li>
          <li>
            <div className="font-semibold text-zinc-100">2. Save it in Replit Secrets</div>
            <div className="mt-1 text-zinc-400">
              Set the secret <code className="px-1 py-0.5 rounded bg-black/40 text-amber-200">SOVEREIGN_ADMIN_TOKEN</code> to the value from step 1.
              The legacy <code className="px-1 py-0.5 rounded bg-black/40 text-amber-200">TESSERACT_ADMIN_KEY</code> is still accepted as a fallback during migration.
            </div>
          </li>
          <li>
            <div className="font-semibold text-zinc-100">3. Restart the API workflow</div>
            <div className="mt-1 text-zinc-400">In the workspace, restart <code className="px-1 py-0.5 rounded bg-black/40">artifacts/api-server: API Server</code>.</div>
          </li>
          <li>
            <div className="font-semibold text-zinc-100">4. Verify the gate</div>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 px-2 py-1 rounded bg-black/40 font-mono text-emerald-300 text-[11px]">curl -sS $REPLIT_DEV_DOMAIN/api/admin/session/status</code>
              <CopyButton text={"curl -sS $REPLIT_DEV_DOMAIN/api/admin/session/status"} />
            </div>
            <div className="mt-1 text-zinc-400">Should return <code>{"{\"configured\":true,\"authenticated\":false}"}</code>. Then unlock here.</div>
          </li>
        </ol>
      )}
    </div>
  );
}

function Frame({ tone, title, body }: { tone: "amber" | "rose" | "emerald" | "zinc"; title: string; body: ReactNode }) {
  const ring = {
    amber: "ring-amber-500/40 from-amber-950/30 to-zinc-950",
    rose: "ring-rose-500/40 from-rose-950/30 to-zinc-950",
    emerald: "ring-emerald-500/40 from-emerald-950/30 to-zinc-950",
    zinc: "ring-zinc-700/50 from-zinc-900/30 to-zinc-950",
  }[tone];
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-6">
      <div className={`w-full max-w-xl rounded-2xl ring-1 ${ring} bg-gradient-to-br p-6 shadow-2xl`}>
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        {body}
        <RecoveryPanel />
      </div>
    </div>
  );
}

export default function TesseractKeyGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({ kind: "loading" });
  const [tokenInput, setTokenInput] = useState("");

  // Initial probe + periodic re-probe to detect server-side expiry.
  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      const s = await fetchStatus();
      if (cancelled) return;
      // Don't clobber a transient submitting/invalid state mid-typing.
      setState(prev => {
        if (prev.kind === "submitting" || prev.kind === "invalid" || prev.kind === "rate-limited") return prev;
        return classifyStatus(s);
      });
    };
    probe();
    const t = setInterval(probe, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Auto-expire watch.
  useEffect(() => {
    if (state.kind !== "unlocked") return;
    const ms = Math.max(0, state.expiresAt - Date.now());
    const t = setTimeout(() => setState({ kind: "expired" }), ms);
    return () => clearTimeout(t);
  }, [state]);

  const submit = async () => {
    const tok = tokenInput.trim();
    if (!tok) {
      setState({ kind: "invalid", reason: "empty" });
      return;
    }
    setState({ kind: "submitting" });
    const result = await postUnlock(tok);
    if (result.ok) {
      setTokenInput("");
      setState({ kind: "unlocked", expiresAt: result.expiresAt });
      return;
    }
    if (result.status === 429) {
      const retry = (result.body as { retryAfterMs?: number })?.retryAfterMs ?? 60_000;
      setState({ kind: "rate-limited", retryAfterMs: retry });
      setTimeout(() => setState({ kind: "locked" }), retry);
      return;
    }
    if (result.status === 503) {
      setState({ kind: "unconfigured" });
      return;
    }
    setState({ kind: "invalid", reason: (result.body as { error?: string })?.error });
  };

  const logout = async () => {
    await postLogout();
    setState({ kind: "locked" });
  };

  if (state.kind === "loading") {
    return <Frame tone="zinc" title="Tesseract — verifying session…" body={<p className="mt-2 text-sm text-zinc-400">Probing sovereign session.</p>} />;
  }

  if (state.kind === "unlocked") {
    return (
      <>
        {children}
        <div className="fixed bottom-3 right-3 z-[9998] text-[10px] text-emerald-400/70 font-mono">
          ◈ session · expires {new Date(state.expiresAt).toLocaleTimeString()}
          <button onClick={logout} className="ml-2 underline hover:text-emerald-300">logout</button>
        </div>
      </>
    );
  }

  if (state.kind === "unconfigured") {
    return (
      <Frame
        tone="rose"
        title="◈ Tesseract — sovereign-unconfigured"
        body={
          <div className="mt-3 space-y-3 text-sm text-rose-100">
            <p>The server has no <code className="px-1 py-0.5 rounded bg-black/40 text-amber-200">SOVEREIGN_ADMIN_TOKEN</code> (or legacy <code className="px-1 py-0.5 rounded bg-black/40 text-amber-200">TESSERACT_ADMIN_KEY</code>) configured.</p>
            <p className="text-rose-200/80">Privileged routes are fail-closed. Open the recovery runbook below to provision one.</p>
          </div>
        }
      />
    );
  }

  if (state.kind === "rate-limited") {
    const secs = Math.ceil(state.retryAfterMs / 1000);
    return (
      <Frame
        tone="rose"
        title="◈ Tesseract — too many attempts"
        body={
          <p className="mt-3 text-sm text-rose-100">Try again in <span className="font-mono text-rose-200">{secs}s</span>. Your IP was rate-limited to protect the canonical token.</p>
        }
      />
    );
  }

  const isInvalid = state.kind === "invalid";
  const isSubmitting = state.kind === "submitting";
  const isExpired = state.kind === "expired";

  return (
    <Frame
      tone={isInvalid || isExpired ? "amber" : "emerald"}
      title={isExpired ? "◈ Tesseract — session expired" : "◈ Tesseract — sovereign entry"}
      body={
        <div className="mt-3 space-y-3 text-sm text-zinc-200">
          <p>
            Present your <span className="text-emerald-300 font-semibold">sovereign admin token</span>.
            One credential, one session — no rotating signal, no second key.
          </p>
          <input
            type="password"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="paste SOVEREIGN_ADMIN_TOKEN (or legacy TESSERACT_ADMIN_KEY)"
            className="w-full px-3 py-2 rounded-md bg-black/60 border border-zinc-700 text-zinc-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
            disabled={isSubmitting}
          />
          {isInvalid && (
            <p className="text-xs text-amber-300">Token rejected. Verify the secret value matches what the server expects, then try again.</p>
          )}
          {isExpired && (
            <p className="text-xs text-amber-300">Your previous session expired. Re-present your token to continue.</p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting || !tokenInput.trim()}
            className="w-full py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-400 text-white font-semibold transition-colors"
          >
            {isSubmitting ? "verifying…" : "Unlock Tesseract"}
          </button>
          <p className="text-[11px] text-zinc-500">
            Once unlocked, the server issues an HttpOnly session cookie (8h). Your token never persists in browser storage.
          </p>
        </div>
      }
    />
  );
}
