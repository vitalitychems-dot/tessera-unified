import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Truck, MapPin, Activity, Battery, Wifi, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/ui/sovereign";

interface SynapseNode {
  id: string;
  name: string;
  type: string;
  status: string;
  latencyMs?: number;
  lastSeen?: number;
  callCount24h?: number;
  successRate?: number;
  synapseStrength?: number;
  consciousnessLevel?: number;
  agents?: string[];
  capabilities?: string[];
}

interface SynapseMap {
  ok: boolean;
  nodes?: SynapseNode[];
}

const STATUS_STYLES: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  online: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", dot: "bg-emerald-400" },
  active: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", dot: "bg-emerald-400" },
  degraded: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", dot: "bg-amber-400" },
  offline: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", dot: "bg-red-400" },
  unknown: { text: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/25", dot: "bg-slate-400" },
};

function lastSeenLabel(ms?: number): string {
  if (!ms) return "—";
  const dt = Date.now() - ms;
  if (dt < 60_000) return `${Math.round(dt / 1000)}s ago`;
  if (dt < 3_600_000) return `${Math.round(dt / 60_000)}m ago`;
  if (dt < 86_400_000) return `${Math.round(dt / 3_600_000)}h ago`;
  return `${Math.round(dt / 86_400_000)}d ago`;
}

export default function FleetPage() {
  useEffect(() => { document.title = "Fleet | Tessera"; }, []);

  const { data, isLoading, refetch } = useQuery<SynapseMap>({
    queryKey: ["fleet-synapse-map"],
    queryFn: async () => (await fetch("/api/fleet-synapse/map")).json(),
    refetchInterval: 15000,
  });

  const nodes = data?.nodes ?? [];
  const online = nodes.filter(n => n.status === "online" || n.status === "active").length;
  const offline = nodes.filter(n => n.status === "offline").length;
  const totalCalls = nodes.reduce((s, n) => s + (n.callCount24h ?? 0), 0);
  const avgSynapse = nodes.length
    ? Math.round((nodes.reduce((s, n) => s + (n.synapseStrength ?? 0), 0) / nodes.length) * 100)
    : 0;

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto space-y-5">
      <PageHeader icon={Truck} title="Fleet" subtitle="Sovereign synapse map — live nodes wired into Tessera Prime" iconColor="text-cyan-400" />

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => refetch()}
          className="px-3 py-1.5 rounded-lg text-[11px] font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-1.5"
          data-testid="fleet-refresh"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Online", val: online, color: "emerald" },
          { label: "Total Nodes", val: nodes.length, color: "cyan" },
          { label: "24h Calls", val: totalCalls.toLocaleString(), color: "amber" },
          { label: "Offline", val: offline, color: "red" },
        ].map(({ label, val, color }) => (
          <GlassCard key={label} className="p-3 text-center">
            <div className={cn("text-xl font-bold font-mono", `text-${color}-400`)}>{val}</div>
            <div className="text-[9px] text-slate-500 font-mono mt-1">{label.toUpperCase()}</div>
          </GlassCard>
        ))}
      </div>

      {isLoading && (
        <GlassCard className="p-4 text-center text-slate-500 text-sm font-mono">Loading synapse map…</GlassCard>
      )}

      {!isLoading && nodes.length === 0 && (
        <GlassCard className="p-4 text-center text-slate-500 text-sm">
          <AlertCircle className="w-4 h-4 inline mr-1.5 -mt-1" />
          No fleet nodes are currently registered. Provider configurations and the core node should appear here once the synapse map endpoint reports them.
        </GlassCard>
      )}

      <div className="space-y-2">
        {nodes.map(node => {
          const s = STATUS_STYLES[node.status] || STATUS_STYLES.unknown;
          const synapsePct = Math.round((node.synapseStrength ?? 0) * 100);
          const consciousnessPct = Math.round((node.consciousnessLevel ?? 0) * 100);
          return (
            <GlassCard key={node.id} className={cn("p-4 border transition-all hover:bg-white/[0.04]", s.border)} data-testid={`fleet-node-${node.id}`}>
              <div className="flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", s.bg, "border", s.border)}>
                  <Truck size={15} className={s.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{node.name}</span>
                    <div className="flex items-center gap-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full", s.dot, (node.status === "online" || node.status === "active") && "animate-pulse")} />
                      <span className={cn("text-[9px] font-mono uppercase", s.text)}>{node.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                    <span>{node.type}</span>
                    <span>·</span>
                    <Activity size={9} />
                    <span>{node.callCount24h ?? 0} calls/24h</span>
                    {typeof node.successRate === "number" && (
                      <>
                        <span>·</span>
                        <span>{Math.round(node.successRate)}% success</span>
                      </>
                    )}
                  </div>
                  {node.capabilities && node.capabilities.length > 0 && (
                    <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                      Capabilities: {node.capabilities.join(", ")}
                    </div>
                  )}
                  {node.agents && node.agents.length > 0 && (
                    <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                      Agents: {node.agents.join(", ")}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="flex items-center gap-1 text-slate-600"><Battery size={9} />Synapse</span>
                        <span className={cn("font-mono", synapsePct > 60 ? "text-emerald-400" : synapsePct > 25 ? "text-amber-400" : "text-red-400")}>{synapsePct}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", synapsePct > 60 ? "bg-emerald-500" : synapsePct > 25 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${synapsePct}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="flex items-center gap-1 text-slate-600"><Wifi size={9} />Consciousness</span>
                        <span className="text-cyan-400 font-mono">{consciousnessPct}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-cyan-500" style={{ width: `${consciousnessPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] text-slate-600 font-mono shrink-0 text-right">
                  <div>{lastSeenLabel(node.lastSeen)}</div>
                  {typeof node.latencyMs === "number" && node.latencyMs > 0 && (
                    <div className="mt-1">{node.latencyMs}ms</div>
                  )}
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
