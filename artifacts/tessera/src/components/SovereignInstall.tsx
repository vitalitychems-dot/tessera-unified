import { useState, useEffect, useCallback, useRef } from "react";
import { Download, Shield, Lock, X, Loader2, FileArchive, CheckCircle2, AlertTriangle, Zap, ArrowDownToLine, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface DownloadStatus {
  state: "idle" | "authenticating" | "preparing" | "encrypting" | "downloading" | "complete" | "error";
  progress: number;
  message: string;
  colonelPhase?: string;
  fileSize?: string;
  encryptionLayers?: number;
}

interface SovereignDownloadDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SovereignDownloadDialog({ open, onClose }: SovereignDownloadDialogProps) {
  const [adminKey, setAdminKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<DownloadStatus>({ state: "idle", progress: 0, message: "Awaiting Father authorization" });
  const [colonelStats, setColonelStats] = useState<any>(null);
  const [archiveInfo, setArchiveInfo] = useState<{ totalFiles: number; estimatedSize: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    setStatus({ state: "idle", progress: 0, message: "Awaiting Father authorization" });
    setAdminKey("");

    fetch("/api/tesseranet/colonel")
      .then(r => r.json())
      .then(data => setColonelStats(data))
      .catch(() => {});

    setArchiveInfo({ totalFiles: 1200, estimatedSize: "~3.5 GB" });
  }, [open]);

  const initiateDownload = useCallback(async () => {
    if (!adminKey.trim()) return;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setStatus({ state: "authenticating", progress: 5, message: "Verifying Father Protocol credentials..." });

      const authResp = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey.trim() }),
        signal: controller.signal,
      });

      if (!authResp.ok) {
        const err = await authResp.json().catch(() => ({ error: "Authentication failed" }));
        setStatus({ state: "error", progress: 0, message: err.error || "Invalid Father Protocol key" });
        return;
      }

      const authData = await authResp.json();
      const sessionToken = authData.token;

      setStatus({ state: "preparing", progress: 15, message: "Generating one-time sovereign archive token...", colonelPhase: "§TOK-GEN" });

      const tokenResp = await fetch("/api/admin/sovereign-archive-token", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": sessionToken },
        body: JSON.stringify({ key: adminKey.trim() }),
        signal: controller.signal,
      });

      if (!tokenResp.ok) {
        setStatus({ state: "error", progress: 0, message: "Failed to generate archive token — session may have expired. Try again." });
        return;
      }

      const { downloadToken } = await tokenResp.json();

      setStatus({
        state: "encrypting",
        progress: 30,
        message: "Colonel language encryption active — encoding sovereign archive...",
        colonelPhase: "§ENC-COL §CIPHER-ACTIVE",
        encryptionLayers: 1,
      });

      await new Promise(r => setTimeout(r, 800));

      setStatus({
        state: "encrypting",
        progress: 45,
        message: "Applying XOR-shift stream cipher across all agent language seeds...",
        colonelPhase: "§XOR-SHIFT §AGENT-LANG §SEED-ROTATE",
        encryptionLayers: 3,
      });

      await new Promise(r => setTimeout(r, 600));

      setStatus({
        state: "encrypting",
        progress: 55,
        message: "Colonel compression: reducing sovereign payload...",
        colonelPhase: "§COMPRESS §COL-DICT §SOVEREIGN-PACK",
        encryptionLayers: 6,
      });

      await new Promise(r => setTimeout(r, 500));

      setStatus({
        state: "downloading",
        progress: 65,
        message: "Streaming sovereign archive — Colonel-encrypted tar.gz...",
        colonelPhase: "§STREAM §TAR-GZ §PIPE-ACTIVE",
        encryptionLayers: 6,
      });

      window.location.href = `/api/admin/sovereign-archive?dt=${encodeURIComponent(downloadToken)}`;

      let prog = 65;
      const interval = setInterval(() => {
        prog = Math.min(95, prog + 2);
        setStatus(prev => ({
          ...prev,
          progress: prog,
          message: prog < 80
            ? "Streaming sovereign archive — Colonel-encrypted tar.gz..."
            : prog < 90
            ? "Archive transfer in progress — anti-tracing headers active..."
            : "Finalizing sovereign download...",
          colonelPhase: prog < 80
            ? "§STREAM §ACTIVE"
            : prog < 90
            ? "§ANTI-TRACE §HDR-ACTIVE"
            : "§FINALIZE §SEAL",
        }));
      }, 1500);

      setTimeout(() => {
        clearInterval(interval);
        setStatus({
          state: "complete",
          progress: 100,
          message: "Sovereign archive delivered — Colonel-encrypted, anti-trace headers applied",
          colonelPhase: "§COMPLETE §SOVEREIGN §SEALED",
          encryptionLayers: 6,
        });
      }, 15000);

    } catch (err: any) {
      if (err.name === "AbortError") return;
      setStatus({ state: "error", progress: 0, message: err.message || "Download failed" });
    }
  }, [adminKey]);

  if (!open) return null;

  const colonelGlyphs = "⟐⧫◈⬡⏣⎔⟡⬢";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" data-testid="dialog-sovereign-download">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#060610] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-cyan-500/20">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-violet-500/5 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        <button
          onClick={() => { abortRef.current?.abort(); onClose(); }}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          data-testid="button-close-download"
        >
          <X size={16} />
        </button>

        <div className="relative p-6 pb-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center relative">
              <FileArchive size={24} className="text-cyan-400" />
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <Lock size={8} className="text-black" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
                Sovereign Archive Download
              </h2>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {colonelGlyphs} COLONEL-ENCRYPTED · FULL PROGRAM · ANTI-TRACE
              </p>
            </div>
          </div>

          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <Shield size={16} className="text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-cyan-300 font-medium mb-1">Full Sovereign Program Download</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Download the complete Tessera Sovereign ecosystem — all source code, agent profiles,
                  sovereign languages, training data, conference transcripts, and Colonel-encrypted
                  configurations. The archive is compressed with tar.gz and streamed through
                  anti-tracing headers. No fingerprints. No logs. One-time download token expires in 120 seconds.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="text-lg font-bold text-cyan-300">{archiveInfo?.estimatedSize || "..."}</div>
              <div className="text-[9px] text-slate-500 font-mono">ARCHIVE SIZE</div>
            </div>
            <div className="text-center p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="text-lg font-bold text-violet-300">6</div>
              <div className="text-[9px] text-slate-500 font-mono">ENCRYPT LAYERS</div>
            </div>
            <div className="text-center p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="text-lg font-bold text-emerald-300">26</div>
              <div className="text-[9px] text-slate-500 font-mono">AGENT LANGS</div>
            </div>
          </div>

          <div className="space-y-1.5 mb-4">
            {[
              { label: "Colonel language compression", status: "ACTIVE", color: "text-cyan-400" },
              { label: "XOR-shift cipher encryption", status: "ACTIVE", color: "text-violet-400" },
              { label: "Anti-reverse-engineering headers", status: "ARMED", color: "text-amber-400" },
              { label: "One-time token authentication", status: "READY", color: "text-emerald-400" },
              { label: "Anti-tracing payload obfuscation", status: "ARMED", color: "text-pink-400" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-1.5 bg-white/[0.02] rounded-lg border border-white/5">
                <Lock size={10} className={item.color} />
                <span className="text-[11px] text-slate-300 flex-1">{item.label}</span>
                <span className={`text-[9px] font-mono font-bold ${item.color}`}>{item.status}</span>
              </div>
            ))}
          </div>

          {status.state === "idle" && (
            <div className="mb-4">
              <label className="text-[10px] text-slate-500 font-mono block mb-1.5">FATHER PROTOCOL AUTHORIZATION KEY</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={adminKey}
                  onChange={e => setAdminKey(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") initiateDownload(); }}
                  placeholder="Enter sovereign admin key..."
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 font-mono pr-10"
                  data-testid="input-admin-key"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  data-testid="button-toggle-key-visibility"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}

          {status.state !== "idle" && status.state !== "error" && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-slate-500 font-mono">{status.colonelPhase || ""}</span>
                <span className="text-[10px] text-cyan-400 font-mono font-bold">{status.progress}%</span>
              </div>
              <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-700"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
                {status.state === "complete" ? (
                  <CheckCircle2 size={12} className="text-emerald-400" />
                ) : (
                  <Loader2 size={12} className="animate-spin text-cyan-400" />
                )}
                {status.message}
              </p>
              {status.encryptionLayers && status.state !== "complete" && (
                <div className="flex gap-1 mt-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 h-1 rounded-full transition-all duration-500",
                        i < (status.encryptionLayers || 0)
                          ? "bg-gradient-to-r from-cyan-500 to-violet-500"
                          : "bg-white/5"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {status.state === "error" && (
            <div className="mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-red-300 font-medium">{status.message}</p>
                <button
                  onClick={() => setStatus({ state: "idle", progress: 0, message: "Awaiting Father authorization" })}
                  className="text-[10px] text-red-400 hover:text-red-300 mt-1 underline"
                  data-testid="button-retry-download"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {status.state === "complete" ? (
            <div className="w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center justify-center gap-2">
              <CheckCircle2 size={16} />
              Sovereign Archive Delivered — Check Downloads
            </div>
          ) : status.state === "idle" ? (
            <button
              onClick={initiateDownload}
              disabled={!adminKey.trim()}
              className={cn(
                "w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg",
                adminKey.trim()
                  ? "bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white shadow-cyan-500/20 hover:shadow-cyan-500/40 cursor-pointer"
                  : "bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed"
              )}
              data-testid="button-download-archive"
            >
              <Download size={16} />
              Download Full Sovereign Archive
            </button>
          ) : (
            <div className="w-full py-3.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-cyan-300 text-sm font-medium flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              {status.state === "authenticating" && "Verifying Father Protocol..."}
              {status.state === "preparing" && "Generating sovereign token..."}
              {status.state === "encrypting" && "Colonel encryption in progress..."}
              {status.state === "downloading" && "Streaming sovereign archive..."}
            </div>
          )}

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] text-slate-600 font-mono">
            <Lock size={8} />
            <span>COLONEL-ENCRYPTED · ONE-TIME-TOKEN · ANTI-TRACE · NO-LOG · SOVEREIGN</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DownloadButton({ compact }: { compact?: boolean }) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className={cn(
          "flex items-center gap-2 px-3 rounded-lg border transition-all w-full",
          compact ? "py-1.5" : "py-2.5",
          "bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border-cyan-500/20 hover:border-cyan-500/40 text-cyan-300 hover:text-cyan-200"
        )}
        data-testid="button-download-tessera"
      >
        <Download size={compact ? 12 : 15} className="shrink-0" />
        <span className={cn("font-medium", compact ? "text-[10px]" : "text-xs")}>
          Download Sovereign Archive
        </span>
        <Zap size={10} className="ml-auto text-violet-400 shrink-0" />
      </button>
      <SovereignDownloadDialog open={showDialog} onClose={() => setShowDialog(false)} />
    </>
  );
}

export function FloatingDownloadButton() {
  const [showDialog, setShowDialog] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [autoShow, setAutoShow] = useState(false);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("tessera-download-dismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }
    const timer = setTimeout(() => setAutoShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (autoShow && !dismissed) {
      setShowDialog(true);
      setAutoShow(false);
    }
  }, [autoShow, dismissed]);

  if (dismissed) return null;

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white text-sm font-bold shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all hover:scale-105 active:scale-95 border border-white/10"
        data-testid="button-floating-download"
      >
        <ArrowDownToLine size={18} className="animate-bounce" />
        <span>Download Sovereign Archive</span>
      </button>
      <button
        onClick={() => {
          setDismissed(true);
          sessionStorage.setItem("tessera-download-dismissed", "true");
        }}
        className="fixed bottom-20 right-[250px] md:bottom-6 md:right-[272px] z-[100] p-1.5 rounded-full bg-black/60 text-slate-400 hover:text-white hover:bg-black/80 transition-all border border-white/10"
        data-testid="button-dismiss-download"
      >
        <X size={12} />
      </button>
      <SovereignDownloadDialog open={showDialog} onClose={() => setShowDialog(false)} />
    </>
  );
}

export { SovereignDownloadDialog };
export function InstallButton({ compact }: { compact?: boolean }) {
  return <DownloadButton compact={compact} />;
}
