import { cn } from "@/lib/utils";

interface DAGNode {
  id: string;
  label: string;
  description: string;
  dependencies: string[];
  status: "pending" | "running" | "complete" | "failed" | "skipped";
  startedAt?: number;
  completedAt?: number;
  result?: string;
  error?: string;
}

interface DAGGraphProps {
  nodes: DAGNode[];
  parallelBatches: string[][];
  className?: string;
}

const statusColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  running: { bg: "bg-amber-500/10", border: "border-amber-500/40", text: "text-amber-400", dot: "bg-amber-400 animate-pulse" },
  complete: { bg: "bg-emerald-500/10", border: "border-emerald-500/40", text: "text-emerald-400", dot: "bg-emerald-400" },
  failed: { bg: "bg-red-500/10", border: "border-red-500/40", text: "text-red-400", dot: "bg-red-400" },
  pending: { bg: "bg-slate-500/10", border: "border-slate-500/30", text: "text-slate-400", dot: "bg-slate-500" },
  skipped: { bg: "bg-gray-500/10", border: "border-gray-500/30", text: "text-gray-500", dot: "bg-gray-500" },
};

const fallbackColors = statusColors.pending;

export function DAGGraph({ nodes, parallelBatches, className }: DAGGraphProps) {
  return (
    <div className={cn("p-4 rounded-xl border border-white/[0.06] bg-black/20", className)} data-testid="dag-graph">
      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
        Reasoning DAG · {parallelBatches.length} batch{parallelBatches.length !== 1 ? "es" : ""}
      </div>
      <div className="space-y-3">
        {parallelBatches.map((batch, batchIdx) => (
          <div key={batchIdx}>
            <div className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-1.5">
              Batch {batchIdx + 1}
            </div>
            <div className="grid gap-1.5">
              {batch.map((nodeId) => {
                const node = nodes.find(n => n.id === nodeId);
                if (!node) return null;
                const colors = statusColors[node.status] || fallbackColors;
                return (
                  <div
                    key={node.id}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                      colors.bg, colors.border, colors.text
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", colors.dot)} />
                        <span className="truncate">{node.label}</span>
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground/50 shrink-0 ml-2">
                        {node.status}
                      </span>
                    </div>
                    {node.description && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1 pl-4 truncate">{node.description}</p>
                    )}
                    {node.error && (
                      <p className="text-[10px] text-red-400/80 mt-1 pl-4">{node.error}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
