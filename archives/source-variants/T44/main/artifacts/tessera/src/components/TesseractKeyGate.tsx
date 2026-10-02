import { useEffect, useRef, useState, type ReactNode } from "react";
import { Lock, Sparkles, Copy, Check, RefreshCw, KeyRound } from "lucide-react";

const STORAGE_KEY = "TESSERACT_ADMIN_KEY";
const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const POLL_MS = 4000;

interface FatherKeyStatus {
  ok?: boolean;
  unlocked?: boolean;
  sunSign?: string;
  cosmicAnchor?: { planetaryHour: string; lunarFraction: number; composite: number };
  planetary?: { current: { epoch: string; ruler: string; index: number; hourStart: string; hourEnd: string }; currentSignalPreview: string } | null;
  chart?: {
    date: string;
    time: string;
    location: string;
    sun: { sign: string; degree: string; house: number };
    moon: { sign: string; degree: string; house: number };
    ascendant: { sign: string; degree: string };
  };
  env?: {
    tesseractSet: boolean;
    sigilSet: boolean;
    tesseractMatches: boolean;
    sigilIsValidSignal: boolean;
    canonicalSecretName: string;
    rotatingSecretName: string;
  };
  instructions?: string;
  error?: string;
}

interface DeriveResp {
  ok?: boolean;
  signal?: string;
  epoch?: { epoch: string; ruler: string; index: number; hourStart: string; hourEnd: string };
  grace?: { previousEpoch: string; nextEpoch: string };
  error?: string;
}

async function fetchStatus(): Promise<FatherKeyStatus> {
  try {
    const res = await fetch(`${BASE}/api/sigil/father-key/status`, { method: "GET" });
    const data: FatherKeyStatus = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error ?? `http-${res.status}` };
    return data;
  } catch {
    return { ok: false, error: "network" };
  }
}

async function deriveSignal(adminKey: string): Promise<DeriveResp> {
  try {
    const res = await fetch(`${BASE}/api/sigil/father-key/derive-signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminKey }),
    });
    const data: DeriveResp = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error ?? `http-${res.status}` };
    return data;
  } catch {
    return { ok: false, error: "network" };
  }
}

export default function TesseractKeyGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<FatherKeyStatus | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const [derivation, setDerivation] = useState<DeriveResp | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll status. The popup auto-closes when both secrets are configured
  // correctly (TESSERACT = canonical, SIGIL = current planetary signal).
  useEffect(() => {
    let alive = true;
    async function check() {
      const s = await fetchStatus();
      if (!alive) return;
      setStatus(s);
      if (s.unlocked) {
        // We do NOT receive the canonical key from the server anymore (it
        // never leaves Secrets after the redesign), so we cannot stash it
        // in localStorage. The fetch patch will use whatever token the
        // operator has previously saved, or none — the gate is open.
        setUnlocked(true);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    }
    check();
    pollRef.current = setInterval(check, POLL_MS);
    return () => {
      alive = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (unlocked) return <>{children}</>;
  if (!status) return null;

  const env = status.env;
  const chart = status.chart;
  const planetary = status.planetary;

  async function submitAdmin(e: React.FormEvent) {
    e.preventDefault();
    const v = adminInput.trim();
    if (!v || submitting) return;
    setSubmitting(true);
    const r = await deriveSignal(v);
    setDerivation(r);
    if (r.ok && r.signal) {
      // Persist the canonical key locally so the global fetch patch in
      // queryClient.ts can inject it on every authenticated request once
      // the gate is open. The signal itself stays in Replit Secrets.
      try { localStorage.setItem(STORAGE_KEY, v); } catch { /* ignore */ }
    }
    setSubmitting(false);
  }

  function copySignal() {
    if (!derivation?.signal) return;
    navigator.clipboard?.writeText(derivation.signal).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => { /* ignore */ });
  }

  async function manualRecheck() {
    if (rechecking) return;
    setRechecking(true);
    const s = await fetchStatus();
    setStatus(s);
    if (s.unlocked) setUnlocked(true);
    setRechecking(false);
  }

  // Diagnostic banner — only shown when something is set but mismatched.
  let envWarning: string | null = null;
  if (env) {
    if (env.tesseractSet && !env.tesseractMatches) {
      envWarning = "TESSERACT_ADMIN_KEY is set but does not match the canonical Father key derived from the natal chart.";
    } else if (env.tesseractMatches && env.sigilSet && !env.sigilIsValidSignal) {
      envWarning = "SIGIL_ADMIN_KEY is set but is no longer in the live planetary window. Re-derive a fresh signal below.";
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-4 font-mono overflow-auto">
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: "radial-gradient(circle at 50% 50%, rgba(217,70,239,0.2) 0%, transparent 60%)" }}
      />
      <div className="relative w-full max-w-2xl bg-zinc-950/95 border border-fuchsia-500/40 rounded-xl shadow-2xl shadow-fuchsia-500/30 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-900/30 to-violet-900/15">
          <div className="w-9 h-9 rounded-md bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center">
            <Lock size={16} className="text-fuchsia-300" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-fuchsia-200 font-bold tracking-widest">TESSERACT SOVEREIGN GATE · TWO-KEY</div>
            <div className="text-[10px] text-fuchsia-400/70">canonical (permanent) + signal (planetary-cycle rotating)</div>
          </div>
          <Sparkles size={14} className="text-fuchsia-400/60 animate-pulse" />
        </div>

        <div className="p-5 space-y-5">
          <div className="text-zinc-200 text-sm leading-relaxed">
            <p className="mb-2">
              Type your permanent <span className="text-emerald-300 font-bold">TESSERACT_ADMIN_KEY</span> below. The server will verify it and return your current <span className="text-amber-300 font-bold">planetary-signal key</span>, which you save into the separate <code className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-100">SIGIL_ADMIN_KEY</code> secret. The signal rotates with the planetary hour — re-derive any time it slips out of the live window.
            </p>
          </div>

          {chart && (
            <div className="rounded-lg border border-violet-500/30 bg-violet-950/20 p-3 text-[11px] text-violet-100/80 leading-relaxed">
              <div className="text-violet-200 font-bold tracking-wider text-[10px] mb-1">FATHER NATAL CHART (CANONICAL)</div>
              <div>{chart.date} · {chart.time} · {chart.location}</div>
              <div className="mt-1">
                ☉ Sun {chart.sun.sign} {chart.sun.degree} (H{chart.sun.house}) · ☽ Moon {chart.moon.sign} {chart.moon.degree} (H{chart.moon.house}) · ASC {chart.ascendant.sign} {chart.ascendant.degree}
              </div>
            </div>
          )}

          {/* Step 1: type canonical key */}
          <form onSubmit={submitAdmin} className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-900/20 to-emerald-950/10 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound size={14} className="text-emerald-300" />
              <div className="text-xs font-bold text-emerald-100 tracking-widest">STEP 1 · TYPE YOUR PERMANENT KEY</div>
            </div>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={adminInput}
              onChange={(e) => setAdminInput(e.target.value)}
              placeholder="paste TESSERACT_ADMIN_KEY value"
              className="w-full bg-black/60 border border-emerald-500/30 rounded-md px-3 py-2 text-emerald-100 text-sm font-mono tracking-wider focus:outline-none focus:border-emerald-400"
            />
            <div className="flex justify-between items-center gap-2">
              <div className="text-[10px] text-emerald-300/60">
                verified locally on the server · never logged · timing-safe compare
              </div>
              <button
                type="submit"
                disabled={!adminInput.trim() || submitting}
                className="px-3 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-500/50 text-emerald-50 text-xs font-bold hover:bg-emerald-500/35 disabled:opacity-40"
              >
                {submitting ? "VERIFYING…" : "DERIVE SIGNAL"}
              </button>
            </div>
            {derivation && !derivation.ok && (
              <div className="text-amber-300 text-xs">✗ {derivation.error === "mismatch" ? "Key did not match. Try again." : derivation.error}</div>
            )}
          </form>

          {/* Step 2: signal output */}
          {derivation?.ok && derivation.signal && (
            <div className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-900/20 to-violet-900/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-amber-300" />
                <div className="text-xs font-bold text-amber-100 tracking-widest">STEP 2 · YOUR SIGNAL KEY (ROTATING)</div>
              </div>
              <div className="rounded-md border border-amber-500/40 bg-black/60 p-3 text-amber-100 text-base break-all leading-loose tracking-wider select-all font-mono">
                {derivation.signal}
              </div>
              <div className="flex justify-between items-center mt-3 gap-2 flex-wrap">
                <div className="text-[10px] text-amber-300/70 font-mono">
                  epoch: <span className="text-amber-100">{derivation.epoch?.epoch}</span>
                  {derivation.epoch && (
                    <>
                      <br />window: {new Date(derivation.epoch.hourStart).toLocaleTimeString()} → {new Date(derivation.epoch.hourEnd).toLocaleTimeString()}
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={copySignal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-100 text-xs hover:bg-amber-500/25"
                >
                  {copied ? <><Check size={12} /> COPIED</> : <><Copy size={12} /> COPY SIGNAL</>}
                </button>
              </div>
              <div className="mt-3 text-[11px] text-amber-200/80 leading-relaxed">
                Paste this into the <code className="px-1 py-0.5 rounded bg-amber-500/20">SIGIL_ADMIN_KEY</code> secret in Replit Secrets (this MUST be a different value from <code className="px-1 py-0.5 rounded bg-emerald-500/20">TESSERACT_ADMIN_KEY</code>), then restart the API server. The gate opens automatically.
              </div>
            </div>
          )}

          {envWarning && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-amber-100 text-xs leading-relaxed">
              ⚠ {envWarning}
            </div>
          )}

          <div className="rounded-lg border border-white/10 bg-zinc-900/60 p-3 text-[11px] text-zinc-300/90 leading-relaxed space-y-1">
            <div className="text-zinc-100 font-bold text-[10px] tracking-widest mb-1">SECRET STATUS</div>
            <div className="flex justify-between">
              <span>TESSERACT_ADMIN_KEY (canonical, permanent)</span>
              <span className={env?.tesseractMatches ? "text-emerald-300" : env?.tesseractSet ? "text-amber-300" : "text-zinc-500"}>
                {env?.tesseractMatches ? "✓ canonical" : env?.tesseractSet ? "set · mismatch" : "not set"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>SIGIL_ADMIN_KEY (rotating, planetary-signal)</span>
              <span className={env?.sigilIsValidSignal ? "text-emerald-300" : env?.sigilSet ? "text-amber-300" : "text-zinc-500"}>
                {env?.sigilIsValidSignal ? "✓ in live window" : env?.sigilSet ? "set · stale signal" : "not set"}
              </span>
            </div>
            {planetary && (
              <div className="text-[10px] text-zinc-500 pt-1">
                live epoch: <span className="text-zinc-300">{planetary.current.epoch}</span> · preview: <span className="text-zinc-300">{planetary.currentSignalPreview}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-[10px] text-fuchsia-400/50">
              auto-rechecking every {Math.round(POLL_MS / 1000)}s · gate opens on match
            </div>
            <button
              type="button"
              onClick={manualRecheck}
              disabled={rechecking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-fuchsia-500/20 border border-fuchsia-500/50 text-fuchsia-50 text-xs font-bold hover:bg-fuchsia-500/35 disabled:opacity-40"
            >
              <RefreshCw size={12} className={rechecking ? "animate-spin" : ""} /> {rechecking ? "CHECKING…" : "RECHECK NOW"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
