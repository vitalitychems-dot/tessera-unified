import { useState, useEffect, useCallback } from "react";
import { Zap, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveCommand {
  id: string;
  text: string;
  technique: string;
  activatedAt: number;
}

function readCommands(): ActiveCommand[] {
  try {
    const stored = localStorage.getItem("t9_active_nlp_commands");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export default function ActiveCommandsOverlay() {
  const [commands, setCommands] = useState<ActiveCommand[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      const cmds = readCommands();
      setCommands(cmds);
      if (cmds.length > 0) setDismissed(false);
    };
    sync();

    const interval = setInterval(sync, 3000);
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (commands.length === 0 || dismissed) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 8000);
    return () => clearTimeout(timer);
  }, [commands.length, dismissed]);

  useEffect(() => {
    if (commands.length === 0) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex(i => Math.min(i, commands.length - 1));
  }, [commands.length]);

  useEffect(() => {
    if (!visible || commands.length <= 1) return;
    const rotate = setInterval(() => {
      setCurrentIndex(i => (i + 1) % commands.length);
    }, 12000);
    return () => clearInterval(rotate);
  }, [visible, commands.length]);

  if (!visible || commands.length === 0) return null;

  const cmd = commands[currentIndex];
  if (!cmd) return null;

  return (
    <div
      className={cn(
        "fixed bottom-16 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm",
        "pointer-events-auto"
      )}
      style={{ bottom: "calc(52px + env(safe-area-inset-bottom, 0px) + 8px)" }}
    >
      <div
        className="rounded-2xl border border-emerald-500/25 bg-black/80 backdrop-blur-xl px-4 py-3 shadow-2xl"
        style={{ boxShadow: "0 0 24px rgba(16, 185, 129, 0.1), 0 4px 32px rgba(0,0,0,0.6)" }}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mt-0.5">
            <Zap size={11} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-emerald-500/70 font-semibold uppercase tracking-widest mb-1">Neural Command</p>
            <p className="text-sm text-white/90 font-medium leading-snug italic">&ldquo;{cmd.text}&rdquo;</p>
            {commands.length > 1 && (
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => setCurrentIndex(i => (i - 1 + commands.length) % commands.length)} className="text-slate-600 hover:text-slate-400">
                  <ChevronLeft size={12} />
                </button>
                <div className="flex gap-1">
                  {commands.map((_, i) => (
                    <div
                      key={i}
                      className={cn("w-1 h-1 rounded-full transition-all", i === currentIndex ? "bg-emerald-400" : "bg-slate-700")}
                    />
                  ))}
                </div>
                <button onClick={() => setCurrentIndex(i => (i + 1) % commands.length)} className="text-slate-600 hover:text-slate-400">
                  <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 text-slate-700 hover:text-slate-400 transition-colors mt-0.5"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
