import { useQuery } from "@tanstack/react-query";
import { Activity, Cpu, HardDrive, Wifi, WifiOff, Zap, AlertTriangle, CheckCircle2, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HealthData {
  status: string;
  healthScore: number;
  uptime: { formatted: string; seconds: number };
  memory: { heapUsedMB: number; heapTotalMB: number; percent: number };
  cpu: { loadAvg: number[]; cores: number };
  tasks: { active: number; total: number };
  llmProviders: { totalProviders: number; healthy: number; degraded: number; down: number; avgHealthScore: number };
}

export default function SystemHealthPulse() {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery<HealthData>({
    queryKey: ["/api/system/health"],
    refetchInterval: 15000,
    staleTime: 10000,
  });

  if (isLoading || !data) {
    return (
      <div className="px-3 py-2" data-testid="system-health-loading">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
          <span>Loading system status...</span>
        </div>
      </div>
    );
  }

  const statusColor = data.status === "healthy"
    ? "text-emerald-400"
    : data.status === "degraded"
      ? "text-yellow-400"
      : "text-red-400";

  const pulseColor = data.status === "healthy"
    ? "bg-emerald-400"
    : data.status === "degraded"
      ? "bg-yellow-400"
      : "bg-red-400";

  const StatusIcon = data.status === "healthy" ? CheckCircle2 : data.status === "degraded" ? AlertTriangle : AlertTriangle;

  return (
    <div className="px-2 py-1.5" data-testid="system-health-pulse">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
        data-testid="button-toggle-health"
      >
        <div className="relative">
          <div className={cn("w-2 h-2 rounded-full", pulseColor)} />
          <div className={cn("absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-75", pulseColor)} />
        </div>
        <span className={cn("text-xs font-medium", statusColor)}>
          {data.healthScore}/100
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
          <Clock size={10} />
          {data.uptime.formatted}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 px-2 py-2 text-xs" data-testid="health-details-panel">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <HardDrive size={12} />
                  Memory
                </span>
                <span className={cn(
                  "font-mono",
                  data.memory.percent > 85 ? "text-red-400" :
                    data.memory.percent > 70 ? "text-yellow-400" : "text-emerald-400"
                )}>
                  {data.memory.heapUsedMB}MB / {data.memory.heapTotalMB}MB
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    data.memory.percent > 85 ? "bg-red-500" :
                      data.memory.percent > 70 ? "bg-yellow-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(data.memory.percent, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Cpu size={12} />
                  CPU Load
                </span>
                <span className="font-mono text-foreground">
                  {data.cpu.loadAvg[0].toFixed(2)} / {data.cpu.cores} cores
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Zap size={12} />
                  Tasks
                </span>
                <span className="font-mono text-foreground">
                  {data.tasks.active} active / {data.tasks.total} total
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Activity size={12} />
                  LLM Providers
                </span>
                <div className="flex items-center gap-1">
                  {data.llmProviders.healthy > 0 && (
                    <span className="text-emerald-400 flex items-center gap-0.5">
                      <Wifi size={10} />{data.llmProviders.healthy}
                    </span>
                  )}
                  {data.llmProviders.degraded > 0 && (
                    <span className="text-yellow-400 flex items-center gap-0.5">
                      <AlertTriangle size={10} />{data.llmProviders.degraded}
                    </span>
                  )}
                  {data.llmProviders.down > 0 && (
                    <span className="text-red-400 flex items-center gap-0.5">
                      <WifiOff size={10} />{data.llmProviders.down}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-1.5 border-t border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingUp size={12} />
                    Overall
                  </span>
                  <StatusIcon size={14} className={statusColor} />
                </div>
              </div>

              <div className="pt-1.5 border-t border-violet-500/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-mono text-violet-400/70 tracking-widest">SOVEREIGN LAYERS</span>
                </div>
                <div className="flex gap-[1px]">
                  {Array.from({ length: 17 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full bg-violet-500/60"
                      title={["ENTRY","TESS://","COLONEL","QUANTUM","TEMPORAL","POLYMORPH","MANIFEST","VOID","MESH","WATERMARK","DIMENSIONS","SELF-HEAL","GLYPH","ZK-AUTH","COMMAND","SILENCE","CONVERGENCE"][i]}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[8px] font-mono text-violet-500/40">17/17 ACTIVE</span>
                  <span className="text-[8px] font-mono text-violet-500/40">TESS://</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
