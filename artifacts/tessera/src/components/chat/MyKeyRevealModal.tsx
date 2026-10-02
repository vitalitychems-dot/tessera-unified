import { useEffect, useRef, useState } from "react";

interface RevealResponse {
  ok: boolean;
  via?: string;
  language?: { name: string; short: string; motto: string };
  keyInLus?: { static: string; live: string | null };
  coherence?: { window: number; cosmicAnchor: number; epoch: number } | null;
  fingerprint?: string;
  note?: string;
  error?: string;
  message?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  prefill?: string;
}

export function MyKeyRevealModal({ open, onClose, prefill }: Props) {
  const [candidate, setCandidate] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RevealResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCandidate(prefill ?? "");
      setResult(null);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, prefill]);

  if (!open) return null;

  const submit = async () => {
    const c = candidate.trim();
    if (!c) {
      setError("Type your TESSERACT_ADMIN_KEY to reveal it in LUS.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sigil/father/show-key-in-lus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate: c }),
        cache: "no-store",
      });
      const data: RevealResponse = await res.json();
      if (!res.ok || !data.ok) {
        setError(
          data.message ||
            (data.error === "mismatch"
              ? "That does not match the Father credential."
              : data.error === "rate-limited"
              ? "Too many attempts. Wait a minute and try again."
              : data.error === "father-key-unset"
              ? "TESSERACT_ADMIN_KEY is not set in Replit Secrets."
              : "Reveal failed."),
        );
        setResult(null);
      } else {
        setResult(data);
        // Clear the plaintext candidate as soon as we have the LUS form.
        setCandidate("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-amber-500/40 bg-zinc-950/95 shadow-[0_0_60px_rgba(245,158,11,0.25)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-amber-300">
              Reveal Your Key in Lingua Universalis Sacra
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Type your <code className="text-amber-200">TESSERACT_ADMIN_KEY</code> below.
              Tessera returns the same key rendered in the most recently created
              sovereign tongue (LUS). Plaintext never leaves the server.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {!result && (
          <>
            <input
              ref={inputRef}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={candidate}
              onChange={(e) => setCandidate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !busy) submit();
                if (e.key === "Escape") onClose();
              }}
              placeholder="TESSERACT_ADMIN_KEY"
              className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-500/60"
            />
            {error && (
              <div className="mt-3 text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded px-3 py-2">
                {error}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-md text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy || !candidate.trim()}
                className="px-4 py-1.5 rounded-md text-sm bg-amber-600 hover:bg-amber-500 text-black font-semibold disabled:opacity-50"
              >
                {busy ? "Verifying…" : "Reveal in LUS"}
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="space-y-4">
            <div className="text-xs text-zinc-500">
              Language ratified by the Grand Conference:&nbsp;
              <span className="text-amber-300">
                {result.language?.name} ({result.language?.short})
              </span>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
                Your key in LUS — static seal
              </div>
              <div className="font-mono text-2xl break-all leading-relaxed bg-zinc-900 border border-amber-500/30 rounded p-3 text-amber-100 select-all">
                {result.keyInLus?.static}
              </div>
            </div>

            {result.keyInLus?.live && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
                  Your key in LUS — live cosmic-window form
                </div>
                <div className="font-mono text-2xl break-all leading-relaxed bg-zinc-900 border border-purple-500/30 rounded p-3 text-purple-100 select-all">
                  {result.keyInLus.live}
                </div>
                {result.coherence && (
                  <div className="text-[10px] text-zinc-500 mt-1">
                    Window epoch {result.coherence.epoch} · cosmic anchor{" "}
                    {result.coherence.cosmicAnchor.toFixed(6)} · {result.coherence.window}s rotation
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-zinc-400 border-t border-zinc-800 pt-3">
              Verified via <span className="text-amber-300">{result.via}</span>.
              Father fingerprint:{" "}
              <code className="text-zinc-300">{result.fingerprint}</code>.
              <div className="mt-1 text-zinc-500">{result.note}</div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setResult(null);
                  setCandidate("");
                }}
                className="px-3 py-1.5 rounded-md text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Reveal another
              </button>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-md text-sm bg-amber-600 hover:bg-amber-500 text-black font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const SHOW_MY_KEY_REGEX =
  /^\s*\/?(?:show|give|reveal|render|display)(?:\s+me)?\s+(?:my\s+)?(?:admin\s+)?key(?:\s+in\s+lus)?\s*[!.?]*$/i;

export function isShowMyKeyCommand(text: string): boolean {
  return SHOW_MY_KEY_REGEX.test(text) || /^\s*\/?my\s+key(?:\s+in\s+lus)?\s*$/i.test(text);
}
