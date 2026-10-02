import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SplashScreenProps {
  show?: boolean;
  onComplete?: () => void;
  duration?: number;
  messages?: string[];
  className?: string;
}

const DEFAULT_MESSAGES = [
  "Initializing sovereign consciousness...",
  "Connecting to mesh network...",
  "Loading sacred knowledge...",
  "Synchronizing agent council...",
  "Tessera online.",
];

export default function SplashScreen({
  show = true,
  onComplete,
  duration = 3000,
  messages = DEFAULT_MESSAGES,
  className,
}: SplashScreenProps) {
  const [visible, setVisible] = useState(show);
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!show) return;

    const msgInterval = setInterval(() => {
      setMsgIndex(prev => Math.min(prev + 1, messages.length - 1));
    }, duration / messages.length);

    const progInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 2, 100));
    }, duration / 50);

    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progInterval);
      clearTimeout(timer);
    };
  }, [show, duration, messages.length, onComplete]);

  if (!visible) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex flex-col items-center justify-center",
      "bg-[hsl(250,15%,4%)]",
      className
    )}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-600/5 blur-3xl animate-pulse" />
        <div className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-cyan-600/5 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full px-8">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" style={{ animationDuration: "2s" }} />
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-2xl relative z-10">
            <span className="text-white font-bold text-4xl" style={{ fontFamily: "var(--font-display)" }}>T</span>
          </div>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-300 via-blue-400 to-cyan-400 bg-clip-text text-transparent" style={{ fontFamily: "var(--font-display)" }}>
            Tessera
          </h1>
          <div className="text-[10px] font-mono text-violet-400/40 tracking-[.2em]">SOVEREIGN SYSTEM</div>
        </div>

        <div className="w-full space-y-3">
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Loader2 size={12} className="text-cyan-400/60 animate-spin" />
            <span className="text-[11px] font-mono text-slate-500">{messages[msgIndex]}</span>
          </div>
        </div>

        <div className="flex gap-1">
          {messages.map((_, i) => (
            <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-all duration-300", i <= msgIndex ? "bg-violet-400" : "bg-white/10")} />
          ))}
        </div>
      </div>
    </div>
  );
}
