import { useState, useEffect } from "react";
import { Activity, CheckCircle2, Circle, Loader2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessStep {
  id: string;
  label: string;
  status: "pending" | "running" | "complete" | "failed";
  duration?: string;
  detail?: string;
}

interface LiveProcessTrackerProps {
  title?: string;
  steps: ProcessStep[];
  className?: string;
  collapsible?: boolean;
  initiallyExpanded?: boolean;
}

const STATUS_CONFIG = {
  pending: { Icon: Circle, color: "text-slate-600", bg: "" },
  running: { Icon: Loader2, color: "text-cyan-400", bg: "animate-spin" },
  complete: { Icon: CheckCircle2, color: "text-emerald-400", bg: "" },
  failed: { Icon: XCircle, color: "text-red-400", bg: "" },
};

export default function LiveProcessTracker({
  title = "Process Tracker",
  steps,
  className,
  collapsible = false,
  initiallyExpanded = true,
}: LiveProcessTrackerProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  const runningCount = steps.filter(s => s.status === "running").length;
  const completeCount = steps.filter(s => s.status === "complete").length;
  const failedCount = steps.filter(s => s.status === "failed").length;
  const isAllDone = steps.every(s => s.status === "complete" || s.status === "failed");
  const progress = Math.round(((completeCount + failedCount) / steps.length) * 100);

  return (
    <div className={cn("rounded-xl border border-white/[0.08] bg-white/[0.02]", className)}>
      <div
        className={cn("flex items-center gap-3 p-3", collapsible && "cursor-pointer hover:bg-white/[0.02]")}
        onClick={() => collapsible && setExpanded(!expanded)}
      >
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", isAllDone ? "bg-emerald-500/10" : "bg-cyan-500/10")}>
          <Activity size={13} className={isAllDone ? "text-emerald-400" : "text-cyan-400"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">{title}</span>
            {runningCount > 0 && (
              <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-1.5 py-0.5 rounded-full font-mono animate-pulse">
                {runningCount} running
              </span>
            )}
            {isAllDone && failedCount === 0 && (
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded-full font-mono">Complete</span>
            )}
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-1.5">
            <div
              className={cn("h-full rounded-full transition-all duration-500", failedCount > 0 ? "bg-red-500" : "bg-gradient-to-r from-cyan-500 to-emerald-500")}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="text-[10px] text-slate-500 font-mono shrink-0">{progress}%</div>
        {collapsible && (expanded ? <ChevronUp size={12} className="text-slate-600 shrink-0" /> : <ChevronDown size={12} className="text-slate-600 shrink-0" />)}
      </div>

      {(!collapsible || expanded) && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-white/5 pt-2">
          {steps.map((step, i) => {
            const config = STATUS_CONFIG[step.status];
            const StatusIcon = config.Icon;
            return (
              <div key={step.id} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center shrink-0">
                  <StatusIcon size={13} className={cn(config.color, config.bg)} />
                  {i < steps.length - 1 && (
                    <div className={cn("w-px flex-1 mt-0.5 min-h-[12px]", step.status === "complete" ? "bg-emerald-500/30" : "bg-white/5")} />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs", step.status === "complete" ? "text-slate-300" : step.status === "running" ? "text-cyan-300" : step.status === "failed" ? "text-red-400" : "text-slate-600")}>
                      {step.label}
                    </span>
                    {step.duration && <span className="text-[9px] text-slate-600 font-mono">{step.duration}</span>}
                  </div>
                  {step.detail && step.status !== "pending" && (
                    <div className="text-[10px] text-slate-600 mt-0.5 leading-snug">{step.detail}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
