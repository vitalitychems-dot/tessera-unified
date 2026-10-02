import { useMesh, type MeshHealth } from "@/lib/meshContext";
import { useAdmin } from "@/lib/adminContext";
import { useLocation } from "wouter";
import { Network } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<MeshHealth, { dot: string; label: string; border: string; text: string; glow: string }> = {
  entangled: { dot: "bg-violet-400 shadow-violet-400/50 shadow-sm", label: "", border: "border-violet-500/40", text: "text-violet-300", glow: "shadow-violet-500/20" },
  isolated: { dot: "bg-emerald-400 shadow-emerald-400/50 shadow-sm", label: "Connected", border: "border-emerald-500/30", text: "text-emerald-300", glow: "shadow-emerald-500/10" },
  connecting: { dot: "bg-cyan-400 animate-pulse shadow-cyan-400/50 shadow-sm", label: "Syncing", border: "border-cyan-500/30", text: "text-cyan-300", glow: "" },
  degraded: { dot: "bg-red-400 shadow-red-400/50 shadow-sm", label: "Degraded", border: "border-red-500/30", text: "text-red-300", glow: "" },
  offline: { dot: "bg-slate-500", label: "Offline", border: "border-white/5", text: "text-slate-400", glow: "" },
};

export default function MeshStatusBadge() {
  const { isAdmin } = useAdmin();
  const { health, peerCount } = useMesh();
  const [, setLocation] = useLocation();

  if (!isAdmin) return null;

  const cfg = STATUS_CONFIG[health] || STATUS_CONFIG.offline;
  const label = health === "entangled" ? `${peerCount + 1} nodes` : cfg.label;

  return (
    <button
      onClick={() => setLocation("/settings")}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono font-medium transition-all backdrop-blur-sm",
        "bg-black/40 hover:bg-black/60 border",
        cfg.border, cfg.glow
      )}
      title="Mesh status"
    >
      <div className="relative">
        <div className={cn("w-2 h-2 rounded-full", cfg.dot)} />
        {(health === "entangled" || health === "isolated") && (
          <div className={cn("absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-40", health === "entangled" ? "bg-violet-400" : "bg-emerald-400")} style={{ animationDuration: "3s" }} />
        )}
      </div>
      <span className={cn("tracking-wide", cfg.text)}>{label}</span>
      <Network className={cn("w-3.5 h-3.5", cfg.text)} />
    </button>
  );
}
