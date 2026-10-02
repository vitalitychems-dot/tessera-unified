import { useState, useRef } from "react";
import { Key, LogOut, Unlock, Loader2, Link2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/lib/adminContext";

const ADMIN_KEY_MIN_LENGTH = 8;

interface AdminKeyInputProps {
  compact?: boolean;
}

export default function AdminKeyInput({ compact = false }: AdminKeyInputProps) {
  const { isAdmin, authenticate, logout, loading } = useAdmin();
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCopyLink = async () => {
    const storedKey = localStorage.getItem("t9_sovereign_key");
    if (!storedKey) return;
    try {
      const token = btoa(storedKey);
      const url = `${window.location.origin}${window.location.pathname}#t=${encodeURIComponent(token)}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const handleSubmit = async () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    const ok = await authenticate(trimmed);
    setSubmitting(false);
    if (ok) {
      setKey("");
    } else {
      setError("Invalid key");
      setKey("");
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
    if (error) setError(null);
  };

  const trimmedLength = key.trim().length;
  const looksValid = trimmedLength >= ADMIN_KEY_MIN_LENGTH && !error;

  if (loading) return null;

  return (
    <div
      data-testid="admin-key-section"
      className={cn(
        "rounded-xl border transition-all duration-300",
        "border-white/[0.07] bg-white/[0.02]",
        compact ? "p-2.5" : "p-3"
      )}
    >
      {isAdmin ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-4 h-4 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            </div>
            <span className="text-[10px] font-mono text-violet-400/80 tracking-wider truncate admin-mode-font">
              SOVEREIGN · ADMIN
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleCopyLink}
              className={cn(
                "flex items-center gap-1 text-[10px] font-mono transition-colors px-1.5 py-0.5 rounded-md",
                copied
                  ? "text-violet-300 bg-violet-500/15"
                  : "text-slate-500 hover:text-violet-400 hover:bg-violet-500/10"
              )}
              data-testid="button-admin-copy-link"
              aria-label="Copy login link"
            >
              {copied ? <Check size={10} /> : <Link2 size={10} />}
              <span>{copied ? "Copied!" : "Copy link"}</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-red-400 transition-colors px-1.5 py-0.5 rounded-md hover:bg-red-500/10"
              data-testid="button-admin-logout"
            >
              <LogOut size={10} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Key size={10} className="text-slate-600 shrink-0" />
            <span className="text-[9px] font-mono text-slate-600 tracking-[0.18em] uppercase">Admin key</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0">
              <input
                ref={inputRef}
                type="password"
                value={key}
                onChange={e => { setKey(e.target.value); if (error) setError(null); }}
                onKeyDown={handleKeyDown}
                placeholder="Paste key…"
                autoComplete="off"
                className={cn(
                  "w-full bg-white/[0.03] border rounded-lg px-2.5 py-1.5 pr-7",
                  "text-[11px] font-mono text-slate-300 placeholder:text-slate-700",
                  "focus:outline-none transition-all duration-200",
                  "admin-mode-caret",
                  error
                    ? "border-red-500/40 focus:border-red-500/60"
                    : looksValid
                      ? "border-emerald-500/30 focus:border-emerald-500/50 bg-emerald-500/[0.03]"
                      : "border-white/[0.07] focus:border-violet-500/40 focus:bg-violet-500/[0.04]"
                )}
                data-testid="input-admin-key"
              />
              {looksValid && (
                <span
                  className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-emerald-400/80"
                  aria-hidden="true"
                  data-testid="indicator-admin-key-valid"
                >
                  <Check size={12} strokeWidth={2.5} />
                </span>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !key.trim()}
              className={cn(
                "shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border transition-all duration-200",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                key.trim()
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/60"
                  : "border-white/[0.06] bg-white/[0.02] text-slate-600"
              )}
              data-testid="button-admin-unlock"
              aria-label="Unlock admin"
            >
              {submitting ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Unlock size={11} />
              )}
            </button>
          </div>
          {error && (
            <p className="text-[10px] font-mono text-red-400/80 pl-0.5" data-testid="text-admin-key-error">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
