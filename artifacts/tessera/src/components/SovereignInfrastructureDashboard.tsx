import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Cpu, Network, Server, Zap, CheckCircle, Clock, Activity, Database, Globe, Users, ChevronRight } from "lucide-react";

interface MissionObjective {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: string;
  metric: string;
  real: boolean;
}

interface LatticeNode {
  id: string;
  type: string;
  status: string;
  latencyMs: number;
  connections: string[];
  uptime: number;
}

interface ComputationEngine {
  name: string;
  status: string;
  latencyMs: number;
  purpose: string;
}

interface CouncilDecision {
  id: string;
  topic: string;
  outcome: string;
  timestamp: string;
}

interface DashboardData {
  ok: boolean;
  councilMandate: {
    decisionId: string;
    topic: string;
    outcome: string;
    votes: { yes: number; no: number; abstain: number; totalEligible: number };
    approvedAt: string;
  };
  missionTracker: {
    overallProgress: number;
    objectives: MissionObjective[];
    sovereigntyLevel: string;
  };
  latticeNetwork: {
    nodes: LatticeNode[];
    totalNodes: number;
    totalConnections: number;
    meshHealth: string;
  };
  computationEngines: {
    engines: ComputationEngine[];
    activeCount: number;
    totalCount: number;
    avgLatencyMs: number;
  };
  recentCouncilDecisions: CouncilDecision[];
  systemVitals: {
    uptimeSec: number;
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    cpuPercent: number;
    cpuCores: number;
    loadAvg: number[];
    platform: string;
    nodeVersion: string;
  };
}

function ProgressBar({ value, color = "bg-cyan-500" }: { value: number; color?: string }) {
  return (
    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "active" || status === "operational" ? "bg-emerald-400" : status === "building" ? "bg-amber-400" : "bg-red-400";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color} animate-pulse`} />;
}

export default function SovereignInfrastructureDashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/sovereign-infrastructure/dashboard"],
    queryFn: () => apiRequest("GET", "/api/sovereign-infrastructure/dashboard").then(r => r.json()),
    refetchInterval: 15000,
  });

  if (isLoading || !data?.ok) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-cyan-400" />
          <h2 className="text-sm font-bold text-white">Sovereign Infrastructure</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[#0d1117]/80 rounded-xl border border-[#1a2030] p-4 animate-pulse h-28" />
          ))}
        </div>
      </div>
    );
  }

  const { missionTracker, latticeNetwork, computationEngines, recentCouncilDecisions, systemVitals, councilMandate } = data;
  const levelColors: Record<string, string> = {
    FULLY_SOVEREIGN: "text-emerald-400",
    SOVEREIGN: "text-cyan-400",
    SEMI_SOVEREIGN: "text-amber-400",
    BUILDING: "text-red-400",
  };

  return (
    <div className="space-y-4" data-testid="sovereign-infrastructure-dashboard">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-cyan-400" />
          <h2 className="text-sm font-bold text-white">Sovereign Infrastructure</h2>
          <span className={`text-[10px] font-mono font-bold ${levelColors[missionTracker.sovereigntyLevel] || "text-slate-400"}`}>
            {missionTracker.sovereigntyLevel.replace(/_/g, " ")}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
          <Activity size={10} className="text-emerald-400" />
          {systemVitals.uptimeSec}s uptime
        </div>
      </div>

      <div className="bg-[#0d1117]/80 rounded-xl border border-cyan-500/20 p-4" data-testid="council-mandate-banner">
        <div className="flex items-center gap-2 mb-2">
          <Users size={12} className="text-cyan-400" />
          <span className="text-[10px] font-bold text-cyan-400">COUNCIL MANDATE — {councilMandate.outcome.toUpperCase()}</span>
          <span className="text-[10px] text-emerald-400 font-mono ml-auto">
            {councilMandate.votes.yes}/{councilMandate.votes.totalEligible} YES
          </span>
        </div>
        <p className="text-xs text-slate-300 line-clamp-2">{councilMandate.topic}</p>
        <div className="flex gap-3 mt-2">
          <span className="text-[10px] text-emerald-400">Yes: {councilMandate.votes.yes}</span>
          <span className="text-[10px] text-red-400">No: {councilMandate.votes.no}</span>
          <span className="text-[10px] text-slate-500">Abstain: {councilMandate.votes.abstain}</span>
        </div>
      </div>

      <div className="bg-[#0d1117]/80 rounded-xl border border-[#1a2030] p-4" data-testid="mission-tracker">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Globe size={12} className="text-cyan-400" />
            Mission Progress
          </h3>
          <span className="text-[10px] font-mono font-bold text-cyan-400">{missionTracker.overallProgress}%</span>
        </div>
        <ProgressBar value={missionTracker.overallProgress} />
        <div className="mt-3 space-y-2">
          {missionTracker.objectives.map((obj) => (
            <div key={obj.id} className="flex items-center gap-2" data-testid={`objective-${obj.id}`}>
              <StatusDot status={obj.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-white truncate">{obj.name}</span>
                  <span className="text-[10px] font-mono text-cyan-400">{obj.progress}%</span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">{obj.metric}</p>
              </div>
              <ChevronRight size={10} className="text-slate-600 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#0d1117]/80 rounded-xl border border-[#1a2030] p-4" data-testid="lattice-network">
          <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-3">
            <Network size={12} className="text-violet-400" />
            Mesh Lattice Network
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <div className="text-sm font-bold text-violet-400 font-mono">{latticeNetwork.totalNodes}</div>
              <div className="text-[9px] text-slate-500">NODES</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-cyan-400 font-mono">{latticeNetwork.totalConnections}</div>
              <div className="text-[9px] text-slate-500">LINKS</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-emerald-400 font-mono">{latticeNetwork.meshHealth === "healthy" ? "OK" : "!!"}</div>
              <div className="text-[9px] text-slate-500">HEALTH</div>
            </div>
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {latticeNetwork.nodes.map((node) => (
              <div key={node.id} className="flex items-center gap-2 text-[10px]">
                <StatusDot status={node.status} />
                <span className="text-white font-mono truncate flex-1">{node.id}</span>
                <span className="text-slate-500">{node.latencyMs}ms</span>
                <span className="text-violet-400/60">{node.connections.length} conn</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0d1117]/80 rounded-xl border border-[#1a2030] p-4" data-testid="computation-engines">
          <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-3">
            <Cpu size={12} className="text-amber-400" />
            Bio-Neural Engines
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <div className="text-sm font-bold text-emerald-400 font-mono">{computationEngines.activeCount}</div>
              <div className="text-[9px] text-slate-500">ACTIVE</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-amber-400 font-mono">{computationEngines.totalCount}</div>
              <div className="text-[9px] text-slate-500">TOTAL</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-cyan-400 font-mono">{computationEngines.avgLatencyMs}ms</div>
              <div className="text-[9px] text-slate-500">AVG LAT</div>
            </div>
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {computationEngines.engines.map((engine) => (
              <div key={engine.name} className="flex items-center gap-2 text-[10px]">
                <StatusDot status={engine.status} />
                <span className="text-white font-mono truncate flex-1">{engine.name}</span>
                <span className="text-slate-500">{engine.latencyMs}ms</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#0d1117]/80 rounded-xl border border-[#1a2030] p-4" data-testid="system-vitals">
        <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-3">
          <Server size={12} className="text-emerald-400" />
          System Vitals
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <div className="text-[9px] text-slate-500 mb-1">HEAP</div>
            <div className="text-xs font-mono text-cyan-400">{systemVitals.heapUsedMB}/{systemVitals.heapTotalMB}MB</div>
            <ProgressBar value={(systemVitals.heapUsedMB / systemVitals.heapTotalMB) * 100} color="bg-cyan-500" />
          </div>
          <div>
            <div className="text-[9px] text-slate-500 mb-1">CPU</div>
            <div className="text-xs font-mono text-amber-400">{systemVitals.cpuPercent}% / {systemVitals.cpuCores}c</div>
            <ProgressBar value={systemVitals.cpuPercent} color="bg-amber-500" />
          </div>
          <div>
            <div className="text-[9px] text-slate-500 mb-1">RSS</div>
            <div className="text-xs font-mono text-violet-400">{systemVitals.rssMB}MB</div>
            <ProgressBar value={Math.min(100, (systemVitals.rssMB / 512) * 100)} color="bg-violet-500" />
          </div>
          <div>
            <div className="text-[9px] text-slate-500 mb-1">LOAD</div>
            <div className="text-xs font-mono text-emerald-400">{systemVitals.loadAvg[0]?.toFixed(2)}</div>
            <ProgressBar value={Math.min(100, (systemVitals.loadAvg[0] / systemVitals.cpuCores) * 100)} color="bg-emerald-500" />
          </div>
        </div>
      </div>

      {recentCouncilDecisions.length > 0 && (
        <div className="bg-[#0d1117]/80 rounded-xl border border-[#1a2030] p-4" data-testid="council-feed">
          <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-3">
            <Users size={12} className="text-cyan-400" />
            Recent Council Decisions
          </h3>
          <div className="space-y-2">
            {recentCouncilDecisions.map((d) => (
              <div key={d.id} className="flex items-start gap-2 text-[10px]">
                <CheckCircle size={10} className={d.outcome === "approved" ? "text-emerald-400 mt-0.5 flex-shrink-0" : "text-red-400 mt-0.5 flex-shrink-0"} />
                <div className="flex-1 min-w-0">
                  <p className="text-white truncate">{d.topic}</p>
                  <div className="flex gap-2 text-slate-500">
                    <span className={d.outcome === "approved" ? "text-emerald-400" : "text-red-400"}>{d.outcome}</span>
                    <span>{new Date(d.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
