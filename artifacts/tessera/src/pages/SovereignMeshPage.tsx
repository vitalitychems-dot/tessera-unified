import { useState, useEffect } from "react";
import { Network, Cpu, Zap, Globe, Shield, Activity, ChevronRight, Radio, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, SectionHeader, PageHeader, RadialGauge, MiniStat } from "@/components/ui/sovereign";

interface MeshNode {
  id: string;
  name: string;
  type: "sovereign" | "relay" | "edge";
  status: "online" | "degraded" | "offline";
  region: string;
  peers: number;
  latency: number;
  throughput: string;
  uptime: number;
}

const MESH_NODES: MeshNode[] = [
  { id: "n1", name: "Tessera Core", type: "sovereign", status: "online", region: "Primary", peers: 27, latency: 2, throughput: "4.8 GB/s", uptime: 99.97 },
  { id: "n2", name: "Alpha Relay", type: "relay", status: "online", region: "North", peers: 12, latency: 8, throughput: "1.2 GB/s", uptime: 99.5 },
  { id: "n3", name: "Beta Relay", type: "relay", status: "online", region: "South", peers: 9, latency: 11, throughput: "0.9 GB/s", uptime: 99.1 },
  { id: "n4", name: "Gamma Edge", type: "edge", status: "online", region: "East", peers: 5, latency: 22, throughput: "380 MB/s", uptime: 98.3 },
  { id: "n5", name: "Delta Edge", type: "edge", status: "degraded", region: "West", peers: 3, latency: 45, throughput: "120 MB/s", uptime: 94.1 },
  { id: "n6", name: "Epsilon Node", type: "relay", status: "online", region: "Central", peers: 14, latency: 6, throughput: "2.1 GB/s", uptime: 99.8 },
  { id: "n7", name: "Zeta Edge", type: "edge", status: "online", region: "Northeast", peers: 4, latency: 18, throughput: "290 MB/s", uptime: 97.6 },
  { id: "n8", name: "Eta Node", type: "relay", status: "offline", region: "Northwest", peers: 0, latency: 0, throughput: "0", uptime: 0 },
];

const STATUS_STYLES: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  online: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", dot: "bg-emerald-400" },
  degraded: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", dot: "bg-amber-400" },
  offline: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", dot: "bg-red-400" },
};

const TYPE_ICONS: Record<string, any> = { sovereign: Shield, relay: Radio, edge: Wifi };

function NodeRow({ node }: { node: MeshNode }) {
  const s = STATUS_STYLES[node.status];
  const Icon = TYPE_ICONS[node.type];
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-all">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", s.bg, "border", s.border)}>
        <Icon size={14} className={s.text} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{node.name}</span>
          <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full font-mono border uppercase", s.bg, s.text, s.border)}>{node.status}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-slate-500 font-mono">{node.type}</span>
          <span className="text-[10px] text-slate-600">·</span>
          <span className="text-[10px] text-slate-500">{node.region}</span>
        </div>
      </div>
      <div className="hidden sm:grid grid-cols-3 gap-4 text-right shrink-0">
        <div>
          <div className="text-xs font-mono text-slate-300">{node.peers}</div>
          <div className="text-[9px] text-slate-600">peers</div>
        </div>
        <div>
          <div className="text-xs font-mono text-slate-300">{node.latency > 0 ? `${node.latency}ms` : "—"}</div>
          <div className="text-[9px] text-slate-600">latency</div>
        </div>
        <div>
          <div className="text-xs font-mono text-cyan-400">{node.throughput}</div>
          <div className="text-[9px] text-slate-600">throughput</div>
        </div>
      </div>
    </div>
  );
}

export default function SovereignMeshPage() {
  useEffect(() => { document.title = "Sovereign Mesh | Tessera"; }, []);
  const [activeTab, setActiveTab] = useState<"nodes" | "topology" | "stats">("nodes");

  const online = MESH_NODES.filter(n => n.status === "online").length;
  const degraded = MESH_NODES.filter(n => n.status === "degraded").length;
  const totalPeers = MESH_NODES.reduce((s, n) => s + n.peers, 0);

  return (
    <div className="p-4 pb-20 max-w-4xl mx-auto space-y-5">
      <PageHeader icon={Network} title="Sovereign Mesh" subtitle="Distributed peer-to-peer sovereign compute network" iconColor="text-cyan-400" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GlassCard className="p-3 text-center">
          <div className="text-2xl font-bold font-mono text-emerald-400">{online}</div>
          <div className="text-[9px] text-slate-500 font-mono mt-1">ONLINE NODES</div>
        </GlassCard>
        <GlassCard className="p-3 text-center">
          <div className="text-2xl font-bold font-mono text-amber-400">{degraded}</div>
          <div className="text-[9px] text-slate-500 font-mono mt-1">DEGRADED</div>
        </GlassCard>
        <GlassCard className="p-3 text-center">
          <div className="text-2xl font-bold font-mono text-cyan-400">{totalPeers}</div>
          <div className="text-[9px] text-slate-500 font-mono mt-1">TOTAL PEERS</div>
        </GlassCard>
        <GlassCard className="p-3 text-center">
          <div className="text-2xl font-bold font-mono text-violet-400">99.1%</div>
          <div className="text-[9px] text-slate-500 font-mono mt-1">MESH HEALTH</div>
        </GlassCard>
      </div>

      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] text-slate-500 font-mono">MESH HEALTH PULSE</div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <RadialGauge value={99.1} max={100} color="emerald" size={90} label="99.1%" />
          <div className="flex-1 space-y-2">
            {[
              { label: "Encryption", val: 100, color: "emerald" },
              { label: "Redundancy", val: 87, color: "cyan" },
              { label: "Bandwidth Util", val: 62, color: "violet" },
              { label: "Sovereign Score", val: 94, color: "amber" },
            ].map(({ label, val, color }) => (
              <div key={label}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-500 font-mono">{label}</span>
                  <span className={`text-${color}-400 font-mono`}>{val}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full bg-${color}-500`} style={{ width: `${val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      <div className="flex gap-2 border-b border-white/5 pb-3">
        {[["nodes", "Nodes"], ["stats", "Statistics"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-mono transition-all", activeTab === id ? "bg-cyan-500/15 text-cyan-400" : "text-slate-500 hover:text-slate-300")}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "nodes" && (
        <div className="space-y-2">
          {MESH_NODES.map(n => <NodeRow key={n.id} node={n} />)}
        </div>
      )}

      {activeTab === "stats" && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Bandwidth", val: "9.8 GB/s", color: "cyan" },
            { label: "Avg Latency", val: "14ms", color: "emerald" },
            { label: "Messages Routed", val: "4.2M", color: "violet" },
            { label: "Uptime (30d)", val: "99.1%", color: "amber" },
            { label: "Active Tunnels", val: "847", color: "cyan" },
            { label: "Encrypted Flows", val: "100%", color: "emerald" },
          ].map(({ label, val, color }) => (
            <GlassCard key={label} className="p-4">
              <div className={cn("text-xl font-bold font-mono", `text-${color}-400`)}>{val}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">{label}</div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
