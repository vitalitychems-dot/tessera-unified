import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Crown, Shield, Globe, Cpu, Database, Brain, Zap, Server,
  Play, Loader2, CheckCircle2, ChevronDown, ChevronUp, Lock,
  Network, Code, Coins, Eye, Activity, Layers, Radio, HardDrive,
  Search, Binary, Vote, RefreshCw, AlertTriangle, Sparkles
} from "lucide-react";

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; icon: any }> = {
  infrastructure: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", icon: Server },
  data: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", icon: Database },
  security: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", icon: Shield },
  intelligence: { bg: "bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-400", icon: Brain },
  economy: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", icon: Coins },
};

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  sovereign: { bg: "bg-emerald-500/20", text: "text-emerald-300", label: "SOVEREIGN" },
  active: { bg: "bg-cyan-500/20", text: "text-cyan-300", label: "ACTIVE" },
  partial: { bg: "bg-amber-500/20", text: "text-amber-300", label: "PARTIAL" },
  concept: { bg: "bg-slate-500/20", text: "text-slate-400", label: "CONCEPT" },
};

interface Pillar {
  id: number;
  name: string;
  category: string;
  description: string;
  currentStatus: string;
  implementation: string;
  bridgeRequirements: string[];
}

interface Deliberation {
  pillarId: number;
  pillarName: string;
  category: string;
  consensus: string;
  bridgeScore: number;
  debates: Array<{ agent: string; role: string; position: string; argument: string }>;
  votes: Array<{ agent: string; vote: string; confidence: number; reason: string }>;
  actionItems: string[];
  timestamp: string;
}

interface SummitStatus {
  id?: string;
  status: string;
  pillarsDeliberated?: number;
  totalPillars?: number;
  totalLLMCalls?: number;
  sovereigntyScore?: number;
  activeAgents?: number;
  resolution?: string;
  deliberations?: Deliberation[];
}

type Tab = "pillars" | "summit" | "data" | "infrastructure" | "agents";

function PillarsPanel() {
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
  const [expandedPillar, setExpandedPillar] = useState<number | null>(null);
  const [deliberating, setDeliberating] = useState<number | null>(null);
  const [deliberationResult, setDeliberationResult] = useState<Record<number, any>>({});
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: pillarsData } = useQuery<any>({ queryKey: ["/api/sovereignty/pillars"] });

  const pillars: Pillar[] = pillarsData?.pillars || [];
  const filtered = filterCategory === "all" ? pillars : pillars.filter(p => p.category === filterCategory);

  async function deliberatePillar(id: number) {
    setDeliberating(id);
    try {
      const res = await fetch(`/api/sovereignty/pillar/${id}/deliberate`, { method: "POST" });
      const data = await res.json();
      setDeliberationResult(prev => ({ ...prev, [id]: data.deliberation }));
    } catch (err: any) {
      setDeliberationResult(prev => ({ ...prev, [id]: { error: err?.message } }));
    } finally {
      setDeliberating(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Layers size={14} className="text-cyan-400" />
          <span className="text-[11px] font-bold text-cyan-300">25 SOVEREIGNTY PILLARS</span>
          <span className="text-[8px] text-slate-500 ml-auto">{pillars.length} pillars registered</span>
        </div>
        <div className="flex gap-1.5 flex-wrap mb-3">
          <button onClick={() => setFilterCategory("all")} className={`text-[8px] px-2 py-0.5 rounded-full border transition-all ${filterCategory === "all" ? "border-white/30 bg-white/10 text-white" : "border-white/5 text-slate-500 hover:text-white"}`} data-testid="filter-all">All ({pillars.length})</button>
          {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => {
            const count = pillars.filter(p => p.category === cat).length;
            return (
              <button key={cat} onClick={() => setFilterCategory(cat)} className={`text-[8px] px-2 py-0.5 rounded-full border transition-all ${filterCategory === cat ? `${colors.border} ${colors.bg} ${colors.text}` : "border-white/5 text-slate-500 hover:text-white"}`} data-testid={`filter-${cat}`}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(pillar => {
          const cat = CATEGORY_COLORS[pillar.category] || CATEGORY_COLORS.infrastructure;
          const status = STATUS_BADGES[pillar.currentStatus] || STATUS_BADGES.concept;
          const isExpanded = expandedPillar === pillar.id;
          const delib = deliberationResult[pillar.id];

          return (
            <div key={pillar.id} className={`rounded-xl border ${cat.border} ${cat.bg} overflow-hidden transition-all`}>
              <button onClick={() => setExpandedPillar(isExpanded ? null : pillar.id)} className="w-full p-3 text-left flex items-center gap-2" data-testid={`pillar-${pillar.id}`}>
                <div className={`w-6 h-6 rounded-lg ${cat.bg} border ${cat.border} flex items-center justify-center`}>
                  <span className={`text-[9px] font-bold ${cat.text}`}>{pillar.id}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white truncate">{pillar.name}</span>
                    <span className={`text-[7px] px-1.5 py-0.5 rounded-full ${status.bg} ${status.text} font-mono`}>{status.label}</span>
                  </div>
                  <p className="text-[8px] text-slate-500 truncate">{pillar.description}</p>
                </div>
                {isExpanded ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2">
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Current Implementation</span>
                    <p className="text-[9px] text-slate-300 mt-0.5">{pillar.implementation}</p>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Bridge Requirements</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {pillar.bridgeRequirements.map((req, i) => (
                        <span key={i} className="text-[7px] px-1.5 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-slate-400">{req}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => deliberatePillar(pillar.id)}
                    disabled={deliberating === pillar.id}
                    className={`w-full mt-1 py-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1.5 transition-all ${deliberating === pillar.id ? "bg-violet-500/10 border border-violet-500/20 text-violet-400" : "bg-violet-600 border border-violet-500 text-white hover:bg-violet-500 active:scale-[0.98]"}`}
                    data-testid={`deliberate-pillar-${pillar.id}`}
                  >
                    {deliberating === pillar.id ? <><Loader2 size={10} className="animate-spin" /> Agents Deliberating...</> : <><Vote size={10} /> Run Agent Deliberation</>}
                  </button>

                  {delib && !delib.error && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${delib.consensus === "BRIDGE" ? "bg-emerald-500/20 text-emerald-300" : delib.consensus === "REBUILD" ? "bg-amber-500/20 text-amber-300" : "bg-slate-500/20 text-slate-400"}`}>
                          {delib.consensus}
                        </span>
                        <span className="text-[8px] text-slate-500">Bridge Score: {delib.bridgeScore}%</span>
                      </div>
                      {delib.debates?.map((d: any, i: number) => (
                        <div key={i} className="rounded-lg border border-white/5 bg-black/20 p-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[8px] font-bold text-violet-300">{d.agent}</span>
                            <span className="text-[7px] text-slate-600">({d.role})</span>
                            <span className={`text-[7px] px-1 py-0.5 rounded ${d.position?.includes("BRIDGE") ? "bg-emerald-500/20 text-emerald-300" : d.position?.includes("REBUILD") ? "bg-amber-500/20 text-amber-300" : "bg-cyan-500/20 text-cyan-300"}`}>{d.position}</span>
                          </div>
                          <p className="text-[8px] text-slate-400">{d.argument}</p>
                        </div>
                      ))}
                      {delib.votes?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {delib.votes.map((v: any, i: number) => (
                            <span key={i} className={`text-[7px] px-1.5 py-0.5 rounded-full border ${v.vote === "BRIDGE" ? "border-emerald-500/30 text-emerald-400" : v.vote === "REBUILD" ? "border-amber-500/30 text-amber-400" : "border-slate-500/30 text-slate-500"}`}>
                              {v.agent}: {v.vote} ({v.confidence}%)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummitPanel() {
  const [isStarting, setIsStarting] = useState(false);
  const [polling, setPolling] = useState(false);

  const { data: summitStatus, refetch: refetchStatus } = useQuery<SummitStatus>({
    queryKey: ["/api/sovereignty/summit/status"],
    refetchInterval: polling ? 5000 : false,
  });

  const { data: history } = useQuery<any>({ queryKey: ["/api/sovereignty/summit/history"] });

  useEffect(() => {
    if (summitStatus?.status === "running") setPolling(true);
    else if (summitStatus?.status === "complete") setPolling(false);
    else if (summitStatus && summitStatus.status !== "running" && summitStatus.status !== "complete" && !isStarting) {
      startSummit();
    }
  }, [summitStatus?.status]);

  async function startSummit() {
    setIsStarting(true);
    setPolling(true);
    try {
      await fetch("/api/sovereignty/summit/start", { method: "POST" });
      setTimeout(() => refetchStatus(), 2000);
    } catch {} finally {
      setIsStarting(false);
    }
  }

  const isRunning = summitStatus?.status === "running";
  const isComplete = summitStatus?.status === "complete";
  const progress = summitStatus?.pillarsDeliberated && summitStatus?.totalPillars ? Math.round((summitStatus.pillarsDeliberated / summitStatus.totalPillars) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Crown size={16} className="text-violet-400" />
          <div>
            <span className="text-[12px] font-bold text-violet-300 block">GRAND SOVEREIGNTY SUMMIT</span>
            <span className="text-[8px] text-slate-500">26 agents deliberate on 25 pillars — real LLM calls, real consensus</span>
          </div>
        </div>

        {!isRunning && !isComplete && (
          <button onClick={startSummit} disabled={isStarting} className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-bold text-[11px] flex items-center justify-center gap-2 hover:from-violet-500 hover:to-cyan-500 active:scale-[0.98] transition-all disabled:opacity-50" data-testid="button-start-summit">
            {isStarting ? <><Loader2 size={14} className="animate-spin" /> Initiating Summit...</> : <><Play size={14} /> Convene Grand Sovereignty Summit</>}
          </button>
        )}

        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-violet-400" />
              <span className="text-[10px] font-bold text-violet-300">SUMMIT IN SESSION</span>
              <span className="text-[8px] text-slate-500 ml-auto">{summitStatus?.totalLLMCalls || 0} LLM calls</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-[8px] text-slate-500">
              <span>Pillar {summitStatus?.pillarsDeliberated || 0} of {summitStatus?.totalPillars || 25}</span>
              <span>{progress}% complete</span>
            </div>
          </div>
        )}

        {isComplete && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-300">SUMMIT COMPLETE</span>
              <span className="text-[8px] text-slate-500 ml-auto">{summitStatus?.totalLLMCalls} LLM calls</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-violet-500/20 bg-black/20 p-2 text-center">
                <span className="text-[16px] font-bold text-violet-300">{summitStatus?.sovereigntyScore}%</span>
                <span className="text-[7px] text-slate-500 block">Sovereignty Score</span>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-black/20 p-2 text-center">
                <span className="text-[16px] font-bold text-cyan-300">{summitStatus?.pillarsDeliberated}</span>
                <span className="text-[7px] text-slate-500 block">Pillars Resolved</span>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-black/20 p-2 text-center">
                <span className="text-[16px] font-bold text-amber-300">{summitStatus?.activeAgents}</span>
                <span className="text-[7px] text-slate-500 block">Agents Voted</span>
              </div>
            </div>
            {summitStatus?.resolution && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/10 p-3">
                <span className="text-[8px] font-bold text-emerald-400 uppercase block mb-1">Summit Resolution</span>
                <p className="text-[9px] text-emerald-200 leading-relaxed">{summitStatus.resolution}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {(isRunning || isComplete) && summitStatus?.deliberations && summitStatus.deliberations.length > 0 && (
        <div className="space-y-2">
          <span className="text-[9px] font-bold text-slate-400 uppercase">Pillar Deliberations</span>
          {summitStatus.deliberations.map((d: any) => {
            const cat = CATEGORY_COLORS[d.category] || CATEGORY_COLORS.infrastructure;
            return (
              <div key={d.pillarId} className={`rounded-lg border ${cat.border} ${cat.bg} p-2.5`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[8px] font-bold ${cat.text}`}>#{d.pillarId}</span>
                  <span className="text-[9px] font-bold text-white">{d.pillarName}</span>
                  <span className={`text-[7px] px-1.5 py-0.5 rounded-full ml-auto font-mono ${d.consensus === "BRIDGE" ? "bg-emerald-500/20 text-emerald-300" : d.consensus === "REBUILD" ? "bg-amber-500/20 text-amber-300" : "bg-slate-500/20 text-slate-400"}`}>
                    {d.consensus} — {d.bridgeScore}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {d.votes?.map((v: any, i: number) => (
                    <span key={i} className={`text-[6px] px-1 py-0.5 rounded ${v.vote === "BRIDGE" ? "bg-emerald-500/10 text-emerald-400" : v.vote === "REBUILD" ? "bg-amber-500/10 text-amber-400" : "bg-slate-500/10 text-slate-500"}`}>
                      {v.agent}: {v.vote}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {history?.summits?.length > 0 && (
        <div className="space-y-2">
          <span className="text-[9px] font-bold text-slate-400 uppercase">Summit History</span>
          {history.summits.map((s: any) => (
            <div key={s.id} className="rounded-lg border border-white/5 bg-black/20 p-2">
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-slate-400">{new Date(s.startedAt).toLocaleDateString()}</span>
                <span className="text-[8px] font-bold text-violet-300">Score: {s.sovereigntyScore}%</span>
                <span className="text-[7px] text-slate-600 ml-auto">{s.totalLLMCalls} LLM calls</span>
              </div>
              {s.resolution && <p className="text-[7px] text-slate-500 mt-1 line-clamp-2">{s.resolution}</p>}
            </div>
          ))}
        </div>
      )}

      {!isRunning && isComplete && (
        <button onClick={startSummit} className="w-full py-2 rounded-lg border border-violet-500/20 bg-violet-500/5 text-violet-400 text-[9px] font-bold hover:bg-violet-500/10 transition-all flex items-center justify-center gap-1.5" data-testid="button-reconvene-summit">
          <RefreshCw size={10} /> Reconvene Summit
        </button>
      )}
    </div>
  );
}

function DataPipelinePanel() {
  const { data } = useQuery<any>({ queryKey: ["/api/sovereignty/data-pipeline"] });

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Database size={14} className="text-emerald-400" />
          <span className="text-[11px] font-bold text-emerald-300">SOVEREIGN DATA PIPELINE</span>
        </div>
        <p className="text-[8px] text-slate-500 mb-3">Real-time data from {data?.totalSources || 0} sources — {data?.apiFreeSources || 0} require NO API keys</p>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg border border-emerald-500/20 bg-black/20 p-2 text-center">
            <span className="text-[14px] font-bold text-emerald-300">{data?.sovereigntyRatio || 0}%</span>
            <span className="text-[7px] text-slate-500 block">API-Free Ratio</span>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-black/20 p-2 text-center">
            <span className="text-[14px] font-bold text-cyan-300">{data?.apiFreeSources || 0}</span>
            <span className="text-[7px] text-slate-500 block">No-Key Sources</span>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-black/20 p-2 text-center">
            <span className="text-[14px] font-bold text-amber-300">{data?.apiKeyRequired || 0}</span>
            <span className="text-[7px] text-slate-500 block">Key Required</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {data?.sources?.map((source: any, i: number) => (
          <div key={i} className={`rounded-lg border p-2 flex items-center gap-2 ${source.apiKey ? "border-amber-500/20 bg-amber-950/5" : "border-emerald-500/20 bg-emerald-950/5"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${source.status === "active" ? "bg-emerald-400" : "bg-slate-600"}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-white">{source.name}</span>
                <span className={`text-[6px] px-1 py-0.5 rounded ${source.apiKey ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                  {source.apiKey ? "KEY" : "FREE"}
                </span>
                <span className="text-[6px] px-1 py-0.5 rounded bg-white/5 text-slate-500">{source.type}</span>
              </div>
              <p className="text-[7px] text-slate-500 truncate">{source.description}</p>
            </div>
          </div>
        ))}
      </div>

      {data?.capabilities && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-3">
          <span className="text-[9px] font-bold text-cyan-400 uppercase block mb-2">Sovereign Data Capabilities</span>
          <div className="grid grid-cols-2 gap-1">
            {data.capabilities.map((cap: string, i: number) => (
              <div key={i} className="flex items-center gap-1">
                <CheckCircle2 size={8} className="text-cyan-400 shrink-0" />
                <span className="text-[7px] text-slate-400">{cap}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfrastructurePanel() {
  const { data } = useQuery<any>({ queryKey: ["/api/sovereignty/infrastructure"] });

  if (!data) return <div className="flex items-center justify-center p-8"><Loader2 size={20} className="animate-spin text-cyan-400" /></div>;

  const sections = [
    { key: "kernel", title: "Sovereign Kernel", icon: Cpu, color: "cyan", items: data.kernel ? [`${data.kernel.name} v${data.kernel.version}`, `Codename: ${data.kernel.codename}`, `Kernel: ${data.kernel.kernelVersion}`, `Status: ${data.kernel.status}`] : [] },
    { key: "mesh", title: "Mesh Network", icon: Network, color: "violet", items: data.mesh ? [`Protocol: ${data.mesh.protocol}`, `${data.mesh.frequencyChannels} frequency channels`, `Max ${data.mesh.maxRelayHops} relay hops`, `Identity rotation: ${data.mesh.identityRotation ? "ON" : "OFF"}`] : [] },
    { key: "language", title: "Sovereign Language", icon: Code, color: "emerald", items: data.language ? [`Language: ${data.language.name}`, `Encoding: ${data.language.encoding}`, `Compression: ${data.language.compression}`, ...(data.language.features || [])] : [] },
    { key: "blockchain", title: "Sovereign Blockchain", icon: Lock, color: "amber", items: data.blockchain ? [`Type: ${data.blockchain.type}`, `Cipher: ${data.blockchain.cipher}`, ...(data.blockchain.features || [])] : [] },
  ];

  const colorMap: Record<string, { border: string; bg: string; text: string }> = {
    cyan: { border: "border-cyan-500/30", bg: "bg-cyan-500/10", text: "text-cyan-400" },
    violet: { border: "border-violet-500/30", bg: "bg-violet-500/10", text: "text-violet-400" },
    emerald: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-400" },
    amber: { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-400" },
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-3">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={14} className="text-cyan-400" />
          <span className="text-[11px] font-bold text-cyan-300">SOVEREIGN INFRASTRUCTURE STATUS</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(data.sovereigntyMetrics || {}).filter(([, v]) => typeof v === "boolean").map(([k, v]) => (
            <div key={k} className={`rounded-lg border p-1.5 text-center ${v ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
              {v ? <CheckCircle2 size={10} className="text-emerald-400 mx-auto mb-0.5" /> : <AlertTriangle size={10} className="text-red-400 mx-auto mb-0.5" />}
              <span className="text-[6px] text-slate-400 block">{k.replace(/([A-Z])/g, " $1").trim()}</span>
            </div>
          ))}
        </div>
      </div>

      {sections.map(section => {
        const colors = colorMap[section.color];
        const Icon = section.icon;
        return (
          <div key={section.key} className={`rounded-xl border ${colors.border} ${colors.bg} p-3`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={12} className={colors.text} />
              <span className={`text-[10px] font-bold ${colors.text}`}>{section.title}</span>
            </div>
            <div className="space-y-1">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className={`w-1 h-1 rounded-full ${colors.text.replace("text-", "bg-")}`} />
                  <span className="text-[8px] text-slate-400">{item}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgentsPanel() {
  const { data } = useQuery<any>({ queryKey: ["/api/sovereignty/pillars"] });
  const agents = data?.agents || [];

  const domainColors: Record<string, string> = {
    architecture: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    economics: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    engineering: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    analysis: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    data: "text-green-400 bg-green-500/10 border-green-500/30",
    ml: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    security: "text-red-400 bg-red-500/10 border-red-500/30",
    quantum: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    consciousness: "text-violet-400 bg-violet-500/10 border-violet-500/30",
    networking: "text-teal-400 bg-teal-500/10 border-teal-500/30",
    knowledge: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    languages: "text-pink-400 bg-pink-500/10 border-pink-500/30",
    memory: "text-sky-400 bg-sky-500/10 border-sky-500/30",
    topology: "text-lime-400 bg-lime-500/10 border-lime-500/30",
    finance: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    ops: "text-slate-400 bg-slate-500/10 border-slate-500/30",
    protocols: "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30",
    resources: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    strategy: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    testing: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    interface: "text-violet-400 bg-violet-500/10 border-violet-500/30",
    ethics: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    crypto: "text-red-400 bg-red-500/10 border-red-500/30",
    resilience: "text-teal-400 bg-teal-500/10 border-teal-500/30",
    evolution: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    dimensions: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-3">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={14} className="text-violet-400" />
          <span className="text-[11px] font-bold text-violet-300">SOVEREIGN AGENT ROSTER — {agents.length} AGENTS</span>
        </div>
        <p className="text-[8px] text-slate-500">Every agent has a unique domain, role, and LLM-powered personality. Each participates in summit deliberations with real AI reasoning.</p>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {agents.map((agent: any, i: number) => {
          const colors = domainColors[agent.domain] || "text-slate-400 bg-slate-500/10 border-slate-500/30";
          return (
            <div key={i} className={`rounded-lg border ${colors.split(" ")[2]} ${colors.split(" ")[1]} p-2`} data-testid={`agent-card-${i}`}>
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} className={colors.split(" ")[0]} />
                <span className="text-[9px] font-bold text-white">{agent.name}</span>
              </div>
              <span className="text-[7px] text-slate-400 block">{agent.role}</span>
              <span className={`text-[6px] mt-0.5 px-1 py-0.5 rounded inline-block ${colors.split(" ")[1]} ${colors.split(" ")[0]}`}>{agent.domain}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SovereignInfrastructurePage({ embedded }: { embedded?: boolean }) {
  const activeTab = "all" as any;

  const tabs: Array<{ id: Tab; label: string; icon: any }> = [
    { id: "pillars", label: "25 Pillars", icon: Layers },
    { id: "summit", label: "Grand Summit", icon: Crown },
    { id: "data", label: "Data Pipeline", icon: Database },
    { id: "infrastructure", label: "Infrastructure", icon: Server },
    { id: "agents", label: "26 Agents", icon: Brain },
  ];

  return (
    <div className={`min-h-screen bg-[#0a0a0f] ${embedded ? "" : "pb-20"}`}>
      <div className="max-w-2xl mx-auto px-3 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center">
            <Globe size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-[14px] font-bold text-white" data-testid="text-page-title">Sovereign Infrastructure</h1>
            <p className="text-[9px] text-slate-500">Own cloud. Own kernel. Own language. Own everything.</p>
          </div>
        </div>

        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {false && tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-violet-600 text-white border border-violet-500" : "bg-white/[0.03] text-slate-500 border border-white/5 hover:text-white hover:border-white/15"}`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon size={10} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {true && <PillarsPanel />}
        {true && <SummitPanel />}
        {true && <DataPipelinePanel />}
        {true && <InfrastructurePanel />}
        {true && <AgentsPanel />}
      </div>
    </div>
  );
}
