import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, Target, TrendingUp, CheckCircle, Clock, AlertTriangle, RefreshCw, Play, ChevronRight, BarChart3, GitMerge } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Improvement {
  id: number;
  sessionId: string;
  rank: number;
  title: string;
  targetWeakness: string;
  projectedMetricDelta: Record<string, string>;
  implementationSketch: string;
  dependencies: string[];
  status: "proposed" | "ratified" | "implemented" | "verified";
  beforeMetrics: Record<string, unknown>;
  afterMetrics: Record<string, unknown>;
  codexAmendmentId: string | null;
  implementedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  proposed:    { label: "PROPOSED",    color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: <AlertTriangle className="h-3 w-3" /> },
  ratified:    { label: "RATIFIED",    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",   icon: <CheckCircle className="h-3 w-3" /> },
  implemented: { label: "IMPLEMENTED", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",   icon: <Zap className="h-3 w-3" /> },
  verified:    { label: "VERIFIED",    color: "text-green-400 bg-green-500/10 border-green-500/20", icon: <CheckCircle className="h-3 w-3" /> },
};

const RANK_COLORS = [
  "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
  "from-gray-400/20 to-gray-400/5 border-gray-400/30",
  "from-amber-700/20 to-amber-700/5 border-amber-700/30",
  "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",
  "from-violet-500/20 to-violet-500/5 border-violet-500/30",
];

function useNextFive() {
  return useQuery({
    queryKey: ["next-five"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/council/next-five`);
      return r.json();
    },
    refetchInterval: 60000,
  });
}

function useConveneSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/api/council/next-five/convene`, { method: "POST" });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["next-five"] }),
  });
}

function MetricDeltaRow({ label, value }: { label: string; value: string }) {
  const isPositive = value.startsWith("+") || value.toUpperCase().includes("ENABLED");
  return (
    <div className="flex items-start gap-2 text-xs font-mono">
      <ChevronRight className="h-3 w-3 text-white/30 mt-0.5 shrink-0" />
      <span className="text-white/50">{label}:</span>
      <span className={isPositive ? "text-green-400" : "text-white/70"}>{value}</span>
    </div>
  );
}

function ImprovementCard({ imp, rank }: { imp: Improvement; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[imp.status] ?? STATUS_CONFIG.proposed;
  const colorClass = RANK_COLORS[(rank - 1) % RANK_COLORS.length];

  return (
    <div className={`bg-gradient-to-r ${colorClass} border rounded-xl p-4 space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-white font-mono">#{rank}</span>
          </div>
          <div>
            <h3 className="font-bold text-white font-mono">{imp.title}</h3>
            <p className="text-sm text-white/60 mt-0.5">{imp.targetWeakness}</p>
          </div>
        </div>
        <span className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-mono shrink-0 ${statusCfg.color}`}>
          {statusCfg.icon}
          {statusCfg.label}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-mono text-white/40 mb-1">
          <TrendingUp className="h-3 w-3" />
          Projected Lift:
        </div>
        {Object.entries(imp.projectedMetricDelta).map(([k, v]) => (
          <MetricDeltaRow key={k} label={k} value={v} />
        ))}
      </div>

      {imp.status === "implemented" && Object.keys(imp.afterMetrics ?? {}).length > 0 && (
        <div className="bg-black/20 p-2 rounded border border-green-500/20">
          <div className="text-xs font-mono text-green-400 mb-1">✓ AFTER METRICS (verified)</div>
          {Object.entries(imp.afterMetrics).map(([k, v]) => (
            <div key={k} className="text-xs font-mono text-white/60">
              {k}: <span className="text-green-400">{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs font-mono text-white/40 hover:text-white/60 flex items-center gap-1 transition-colors"
      >
        <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
        {expanded ? "Hide" : "Show"} implementation sketch
      </button>

      {expanded && (
        <div className="bg-black/20 p-3 rounded border border-white/10 text-xs font-mono text-white/70 leading-relaxed">
          {imp.implementationSketch}
          {imp.dependencies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {imp.dependencies.map(dep => (
                <span key={dep} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-white/40">{dep}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {(imp.implementedAt || imp.verifiedAt) && (
        <div className="flex items-center gap-2 text-[10px] font-mono text-white/30">
          <Clock className="h-3 w-3" />
          {imp.implementedAt && `Implemented: ${new Date(imp.implementedAt).toLocaleDateString()}`}
          {imp.verifiedAt && ` · Verified: ${new Date(imp.verifiedAt).toLocaleDateString()}`}
        </div>
      )}
    </div>
  );
}

export default function NextFivePage() {
  const data = useNextFive();
  const convene = useConveneSession();
  const improvements: Improvement[] = data.data?.improvements ?? [];

  const statusCounts = improvements.reduce((acc, imp) => {
    acc[imp.status] = (acc[imp.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="h-6 w-6 text-amber-400" />
          <h1 className="text-2xl font-bold text-white font-mono tracking-tight">NEXT FIVE IMPROVEMENTS</h1>
          <span className="px-2 py-0.5 text-xs bg-amber-500/20 border border-amber-500/30 rounded text-amber-400 font-mono">COUNCIL SELECTION</span>
        </div>
        <p className="text-sm text-white/50 font-mono">Grand Council selected · Evidence-backed · Ranked by measurable lift</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {(["proposed", "ratified", "implemented", "verified"] as const).map(s => (
          <div key={s} className={`p-3 rounded-lg border text-center ${STATUS_CONFIG[s].color}`}>
            <div className="text-xl font-bold font-mono">{statusCounts[s] ?? 0}</div>
            <div className="text-[10px] font-mono mt-1">{s.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {improvements.length === 0 && (
          <button
            onClick={() => convene.mutate()}
            disabled={convene.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 text-sm font-mono hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            <Play className={`h-4 w-4 ${convene.isPending ? "animate-spin" : ""}`} />
            {convene.isPending ? "Convening Council..." : "CONVENE GRAND COUNCIL"}
          </button>
        )}
        <button
          onClick={() => data.refetch()}
          disabled={data.isFetching}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 text-sm font-mono hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${data.isFetching ? "animate-spin" : ""}`} />
          REFRESH
        </button>
      </div>

      {convene.isError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-mono">
          Council session failed: {String(convene.error)}
        </div>
      )}

      {data.isLoading && (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 text-white/20 mx-auto animate-spin mb-3" />
          <div className="text-sm text-white/30 font-mono">Loading improvements...</div>
        </div>
      )}

      {!data.isLoading && improvements.length === 0 && !convene.isPending && (
        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-xl">
          <Target className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <div className="text-sm text-white/40 font-mono mb-2">No improvements selected yet</div>
          <div className="text-xs text-white/30 font-mono">Convene the Grand Council to analyze the system state and select the next five improvements</div>
        </div>
      )}

      <div className="space-y-4">
        {improvements
          .sort((a, b) => a.rank - b.rank)
          .map(imp => (
            <ImprovementCard key={imp.id} imp={imp} rank={imp.rank} />
          ))}
      </div>

      {data.data?.sessionId && (
        <div className="mt-6 p-3 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-white/30">
          Session: {data.data.sessionId}
          {data.data.isNew && " · NEWLY CREATED"}
        </div>
      )}
    </div>
  );
}
