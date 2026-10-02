import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Globe, Shield, Eye, Star, Activity, Sparkles, Heart, Crown, Lock, Zap,
  ChevronDown, ChevronRight, AlertTriangle, TrendingUp, RefreshCw, Send,
  CheckCircle, Clock, Cpu, Network, Flame, Compass, Search, BookOpen
} from "lucide-react";

export default function UniversalComputerPage({ embedded }: { embedded?: boolean } = {}) {
  const [tab, setTab] = useState("torus");
  const [expandedDim, setExpandedDim] = useState<number | null>(null);
  const [expandedConclusion, setExpandedConclusion] = useState<string | null>(null);
  const [question, setQuestion] = useState("");

  const { data: state } = useQuery<any>({ queryKey: ["/api/universal-computer/state"], refetchInterval: 10000 });
  const { data: dimensions } = useQuery<any>({ queryKey: ["/api/universal-computer/dimensions"], refetchInterval: 60000 });
  const { data: torus } = useQuery<any>({ queryKey: ["/api/universal-computer/torus"], refetchInterval: 8000 });
  const { data: akashic } = useQuery<any>({ queryKey: ["/api/universal-computer/akashic"], refetchInterval: 30000 });
  const { data: conclusions } = useQuery<any>({ queryKey: ["/api/universal-computer/conclusions"], refetchInterval: 15000 });
  const { data: lifeOpt } = useQuery<any>({ queryKey: ["/api/universal-computer/life-optimization"], refetchInterval: 30000 });
  const { data: timelines } = useQuery<any>({ queryKey: ["/api/universal-computer/timelines"], refetchInterval: 20000 });
  const { data: manifestations } = useQuery<any>({ queryKey: ["/api/universal-computer/manifestations"], refetchInterval: 15000 });
  const [universeAnswer, setUniverseAnswer] = useState<any>(null);

  const askMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await apiRequest("POST", "/api/universal-computer/ask-universe", { question: q });
      return res.json();
    },
    onSuccess: (data) => setUniverseAnswer(data),
  });

  const TABS = [
    { id: "torus", label: "Torus Field", icon: Activity },
    { id: "dimensions", label: "27 Dimensions", icon: Globe },
    { id: "akashic", label: "Akashic Archive", icon: BookOpen },
    { id: "conclusions", label: "Growing Conclusions", icon: Sparkles },
    { id: "optimize", label: "Life Optimization", icon: Heart },
    { id: "timelines", label: "Timeline Navigator", icon: Compass },
    { id: "manifest", label: "Manifestation Engine", icon: Star },
    { id: "ask", label: "Ask the Universe", icon: Search },
  ];

  const coherenceColor = (c: number) => c > 0.7 ? "text-green-400" : c > 0.4 ? "text-amber-400" : "text-red-400";
  const karmaTypeColor = (t: string) => {
    const m: Record<string, string> = { wisdom: "bg-violet-500/10 text-violet-300", warning: "bg-amber-500/10 text-amber-300", prophecy: "bg-cyan-500/10 text-cyan-300", pattern: "bg-blue-500/10 text-blue-300", blessing: "bg-green-500/10 text-green-300", lesson: "bg-orange-500/10 text-orange-300" };
    return m[t] || "bg-white/5 text-white/30";
  };

  return (
    <div className="flex h-screen bg-black">
      {!embedded && null}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <Cpu className="w-8 h-8 text-amber-400" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent" data-testid="universal-computer-title">
                Universal Computer
              </h1>
              <p className="text-xs text-white/30">
                Toroidal Reality Engine — All 27 Dimensions Aligned — Tessera is the Bridge
              </p>
            </div>
            {state && (
              <div className="ml-auto flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${state.status === "OPTIMAL FLOW" ? "bg-green-400 animate-pulse" : state.status === "BUILDING COHERENCE" ? "bg-amber-400" : "bg-red-400"}`} />
                  <span className="text-white/40">{state.status}</span>
                </div>
                <span className="text-white/20">Coherence: <span className={coherenceColor(torus?.mechanics?.coherence?.value ? parseFloat(torus.mechanics.coherence.value) / 100 : 0)}>{state.torusField?.coherencePercent}</span></span>
                <span className="text-white/20">Freq: <span className="text-amber-300">{state.torusField?.frequencyLabel}</span></span>
                <span className="text-white/20">Records: <span className="text-violet-300">{state.akashicRecords}</span></span>
              </div>
            )}
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {false && TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                data-testid={`tab-${t.id}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${tab === t.id ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" : "text-white/30 hover:text-white/50 border border-transparent"}`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "torus" && torus && <TorusTab torus={torus} state={state} />}
          {tab === "dimensions" && dimensions && <DimensionsTab dimensions={dimensions} expandedDim={expandedDim} setExpandedDim={setExpandedDim} />}
          {tab === "akashic" && akashic && <AkashicTab akashic={akashic} />}
          {tab === "conclusions" && conclusions && <ConclusionsTab conclusions={conclusions} expanded={expandedConclusion} setExpanded={setExpandedConclusion} />}
          {tab === "optimize" && lifeOpt && <LifeOptTab lifeOpt={lifeOpt} />}
          {tab === "timelines" && timelines && <TimelinesTab timelines={timelines} />}
          {tab === "manifest" && manifestations && <ManifestTab manifestations={manifestations} />}
          {tab === "ask" && <AskTab question={question} setQuestion={setQuestion} askMutation={askMutation} answer={universeAnswer} />}
        </div>
      </div>
    </div>
  );
}

function TorusTab({ torus, state }: any) {
  const m = torus.mechanics;
  return (
    <div className="space-y-4 max-w-4xl mx-auto" data-testid="torus-tab">
      <div className="text-center py-4">
        <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-red-400 bg-clip-text text-transparent mb-1">{torus.title}</div>
        <p className="text-xs text-white/30 max-w-xl mx-auto">{torus.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-gradient-to-br from-violet-500/5 to-blue-500/5 border border-violet-500/10 rounded-lg">
          <div className="text-[10px] text-white/25 mb-1">INFLOW POLE (Source → Processing)</div>
          <div className="text-sm font-semibold text-violet-300">{m.inflow.pole}</div>
          <div className="text-lg font-bold text-violet-400">{m.inflow.energy}</div>
          <div className="text-[10px] text-white/25 mt-1">{m.inflow.description}</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-green-500/5 to-emerald-500/5 border border-green-500/10 rounded-lg">
          <div className="text-[10px] text-white/25 mb-1">OUTFLOW POLE (Processing → Manifestation)</div>
          <div className="text-sm font-semibold text-green-300">{m.outflow.pole}</div>
          <div className="text-lg font-bold text-green-400">{m.outflow.energy}</div>
          <div className="text-[10px] text-white/25 mt-1">{m.outflow.description}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-white/2 border border-white/5 rounded-lg text-center">
          <div className="text-[10px] text-white/25">Spin Rate</div>
          <div className="text-xl font-bold text-amber-300">{m.spinRate.value}</div>
          <div className="text-[9px] text-white/20">{m.spinRate.unit}</div>
        </div>
        <div className="p-3 bg-white/2 border border-white/5 rounded-lg text-center">
          <div className="text-[10px] text-white/25">Coherence</div>
          <div className="text-xl font-bold text-green-300">{m.coherence.value}</div>
          <div className="text-[9px] text-white/20">{m.coherence.description?.slice(0, 50)}</div>
        </div>
        <div className="p-3 bg-white/2 border border-white/5 rounded-lg text-center">
          <div className="text-[10px] text-white/25">Frequency</div>
          <div className="text-xl font-bold text-cyan-300">{m.frequency.value}</div>
          <div className="text-[9px] text-white/20">{m.frequency.description?.slice(0, 50)}</div>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 border border-amber-500/10 rounded-lg">
        <div className="text-xs font-semibold text-amber-300 mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Karma Engine — The Torus Returns What You Emit
        </div>
        <div className="text-[10px] text-white/30 mb-3">{torus.karmaEngine.principle}</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-green-300/60 font-semibold mb-1">ATTRACTING</div>
            <div className="flex flex-wrap gap-1">
              {torus.karmaEngine.attracting.map((a: string) => (
                <span key={a} className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-300 rounded-full border border-green-500/20">{a}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-red-300/60 font-semibold mb-1">REPELLING</div>
            <div className="flex flex-wrap gap-1">
              {torus.karmaEngine.repelling.map((r: string) => (
                <span key={r} className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-300 rounded-full border border-red-500/20">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 bg-white/2 border border-white/5 rounded-lg">
        <div className="text-xs font-semibold text-white/50 mb-2">How to Optimize the Torus</div>
        <div className="space-y-1">
          {torus.howToOptimize?.map((tip: string, i: number) => (
            <div key={i} className="text-[10px] text-white/35 flex gap-2">
              <span className="text-amber-400 shrink-0">{i + 1}.</span> {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DimensionsTab({ dimensions, expandedDim, setExpandedDim }: any) {
  const clusterColors: Record<string, string> = {
    material: "from-green-500/10 to-emerald-500/10 border-green-500/15",
    consciousness: "from-cyan-500/10 to-blue-500/10 border-cyan-500/15",
    relational: "from-violet-500/10 to-purple-500/10 border-violet-500/15",
    spiritual: "from-amber-500/10 to-orange-500/10 border-amber-500/15",
    divine: "from-red-500/10 to-rose-500/10 border-red-500/15",
  };
  const clusterLabelColors: Record<string, string> = {
    material: "text-green-300", consciousness: "text-cyan-300", relational: "text-violet-300", spiritual: "text-amber-300", divine: "text-red-300",
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto" data-testid="dimensions-tab">
      <div className="text-center py-3">
        <div className="text-xl font-bold bg-gradient-to-r from-amber-400 to-violet-400 bg-clip-text text-transparent mb-1">{dimensions.title}</div>
      </div>

      {dimensions.dimensionalClusters && Object.entries(dimensions.dimensionalClusters).map(([key, cluster]: [string, any]) => (
        <div key={key} className={`p-3 bg-gradient-to-r ${clusterColors[key]} border rounded-lg`}>
          <div className={`text-xs font-semibold ${clusterLabelColors[key]} mb-1`}>{key.toUpperCase()} CLUSTER — {cluster.range}</div>
          <div className="text-[10px] text-white/30 mb-2">{cluster.purpose}</div>
          <div className="grid grid-cols-3 gap-1">
            {cluster.dimensions.map((d: any) => (
              <div key={d.id} className="text-[9px] text-white/25 p-1 bg-black/20 rounded">
                <span className={clusterLabelColors[key]}>{d.id}D</span> {d.name.split("-")[0]}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-1">
        {dimensions.dimensions?.map((d: any) => (
          <div key={d.id} className="border border-white/5 rounded-lg overflow-hidden" data-testid={`dimension-${d.id}`}>
            <button
              onClick={() => setExpandedDim(expandedDim === d.id ? null : d.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-white/2 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/10 to-violet-500/10 flex items-center justify-center text-xs font-bold text-amber-300 border border-amber-500/20">
                {d.id}D
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white/70">{d.name}</span>
                  <span className="text-[9px] text-white/20 px-1.5 py-0.5 bg-white/5 rounded">{d.torusRole}</span>
                </div>
                <div className="text-[10px] text-white/30 truncate">{d.purpose}</div>
              </div>
              {expandedDim === d.id ? <ChevronDown className="w-4 h-4 text-white/20" /> : <ChevronRight className="w-4 h-4 text-white/20" />}
            </button>
            {expandedDim === d.id && (
              <div className="px-3 pb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-amber-500/5 border border-amber-500/10 rounded">
                    <div className="text-[9px] text-amber-300/60 font-semibold mb-0.5">OPTIMAL USE</div>
                    <div className="text-[10px] text-white/40">{d.optimalUse}</div>
                  </div>
                  <div className="p-2 bg-orange-500/5 border border-orange-500/10 rounded">
                    <div className="text-[9px] text-orange-300/60 font-semibold mb-0.5">KARMA FUNCTION</div>
                    <div className="text-[10px] text-white/40">{d.karmaFunction}</div>
                  </div>
                </div>
                <div className="p-2 bg-green-500/5 border border-green-500/10 rounded">
                  <div className="text-[9px] text-green-300/60 font-semibold mb-0.5">LIFE APPLICATION</div>
                  <div className="text-[10px] text-white/40">{d.lifeApplication}</div>
                </div>
                <div className="p-2 bg-violet-500/5 border border-violet-500/10 rounded">
                  <div className="text-[9px] text-violet-300/60 font-semibold mb-0.5">AKASHIC ACCESS</div>
                  <div className="text-[10px] text-white/40">{d.akashicAccess}</div>
                </div>
                <div className="p-2 bg-cyan-500/5 border border-cyan-500/10 rounded">
                  <div className="text-[9px] text-cyan-300/60 font-semibold mb-0.5">BRIDGE CAPABILITY</div>
                  <div className="text-[10px] text-white/40">{d.bridgeCapability}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AkashicTab({ akashic }: any) {
  const karmaColors: Record<string, string> = { wisdom: "bg-violet-500/10 text-violet-300 border-violet-500/20", warning: "bg-amber-500/10 text-amber-300 border-amber-500/20", prophecy: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20", pattern: "bg-blue-500/10 text-blue-300 border-blue-500/20", blessing: "bg-green-500/10 text-green-300 border-green-500/20", lesson: "bg-orange-500/10 text-orange-300 border-orange-500/20" };

  return (
    <div className="space-y-4 max-w-4xl mx-auto" data-testid="akashic-tab">
      <div className="text-center py-3">
        <div className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-1">{akashic.title}</div>
        <p className="text-xs text-white/30 max-w-xl mx-auto">{akashic.description}</p>
        <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-white/20">
          <span>Records: <span className="text-violet-300">{akashic.totalRecords}</span></span>
          <span>Span: <span className="text-amber-300">{akashic.spanYears?.toLocaleString()} years</span></span>
          <span>Access via: <span className="text-cyan-300">{akashic.accessDimensions}</span></span>
        </div>
      </div>

      <div className="space-y-3">
        {akashic.records?.map((r: any) => (
          <div key={r.id} className="p-4 bg-white/2 border border-white/5 rounded-lg" data-testid={`akashic-${r.id}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-[9px] px-2 py-0.5 rounded-full border ${karmaColors[r.karmaType] || "bg-white/5 text-white/30 border-white/10"}`}>{r.karmaType}</span>
              <span className="text-sm font-semibold text-white/60">{r.era}</span>
              <span className="text-[10px] text-white/20">{r.yearsAgo > 0 ? `${r.yearsAgo.toLocaleString()} years ago` : "NOW"}</span>
              <span className="text-[9px] text-white/15 ml-auto">{r.dimensionName} ({r.dimension}D)</span>
            </div>
            <div className="text-xs text-white/40 mb-2">{r.insight}</div>
            <div className="p-2 bg-green-500/5 border border-green-500/10 rounded mb-1">
              <div className="text-[9px] text-green-300/60 font-semibold">RELEVANCE TO NOW</div>
              <div className="text-[10px] text-white/35">{r.relevanceToNow}</div>
            </div>
            <div className="p-2 bg-amber-500/5 border border-amber-500/10 rounded">
              <div className="text-[9px] text-amber-300/60 font-semibold">ACTIONABLE</div>
              <div className="text-[10px] text-white/35">{r.actionable}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConclusionsTab({ conclusions, expanded, setExpanded }: any) {
  return (
    <div className="space-y-4 max-w-4xl mx-auto" data-testid="conclusions-tab">
      <div className="text-center py-3">
        <div className="text-xl font-bold bg-gradient-to-r from-amber-400 to-green-400 bg-clip-text text-transparent mb-1">{conclusions.title}</div>
        <p className="text-xs text-white/30 max-w-xl mx-auto">{conclusions.description}</p>
      </div>

      <div className="space-y-3">
        {conclusions.conclusions?.map((c: any) => (
          <div key={c.id} className="border border-white/5 rounded-lg overflow-hidden" data-testid={`conclusion-${c.id}`}>
            <button
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-white/2 transition-colors text-left"
            >
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white/70">{c.topic}</div>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-white/20">
                  <span>Confidence: <span className="text-green-300">{c.confidenceLevel}</span></span>
                  <span>Dimensions: <span className="text-cyan-300">{c.dimensionsConsulted?.length}</span></span>
                  <span>Evidence: <span className="text-amber-300">{c.supportingEvidence?.length}</span></span>
                </div>
              </div>
              {expanded === c.id ? <ChevronDown className="w-4 h-4 text-white/20" /> : <ChevronRight className="w-4 h-4 text-white/20" />}
            </button>
            {expanded === c.id && (
              <div className="px-4 pb-4 space-y-3">
                <div className="p-3 bg-white/2 border border-white/5 rounded">
                  <div className="text-[10px] text-white/25 font-semibold mb-1">CURRENT CONCLUSION (Growing)</div>
                  <div className="text-xs text-white/50">{c.currentConclusion}</div>
                </div>

                <div className="p-3 bg-violet-500/5 border border-violet-500/10 rounded">
                  <div className="text-[10px] text-violet-300/60 font-semibold mb-1">SUPPORTING EVIDENCE</div>
                  <div className="space-y-1">
                    {c.supportingEvidence?.map((e: string, i: number) => (
                      <div key={i} className="text-[10px] text-white/30 flex gap-1.5">
                        <CheckCircle className="w-3 h-3 text-green-400 shrink-0 mt-0.5" /> {e}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-green-500/5 border border-green-500/10 rounded">
                  <div className="text-[10px] text-green-300/60 font-semibold mb-1">LIFE OPTIMIZATION</div>
                  <div className="text-xs text-white/40">{c.lifeOptimization}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-cyan-500/5 border border-cyan-500/10 rounded">
                    <div className="text-[9px] text-cyan-300/60 font-semibold mb-0.5">DIMENSIONS CONSULTED</div>
                    <div className="flex flex-wrap gap-1">
                      {c.dimensionsConsulted?.map((d: any) => (
                        <span key={d.id} className="text-[9px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-300 rounded">{d.id}D</span>
                      ))}
                    </div>
                  </div>
                  <div className="p-2 bg-amber-500/5 border border-amber-500/10 rounded">
                    <div className="text-[9px] text-amber-300/60 font-semibold mb-0.5">NEXT GROWTH TARGET</div>
                    <div className="text-[10px] text-white/30">{c.nextGrowthTarget}</div>
                  </div>
                </div>

                {c.growthHistory?.length > 0 && (
                  <div className="p-2 bg-white/2 border border-white/5 rounded">
                    <div className="text-[9px] text-white/25 font-semibold mb-1">RECENT GROWTH</div>
                    {c.growthHistory.map((g: any, i: number) => (
                      <div key={i} className="text-[9px] text-white/20 flex gap-2">
                        <Clock className="w-3 h-3 text-white/15 shrink-0" />
                        {g.update}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LifeOptTab({ lifeOpt }: any) {
  const areaIcons: Record<string, any> = { "Financial Abundance": TrendingUp, "Health & Vitality": Heart, "Consciousness Expansion": Eye, "Relationships & Love": Heart, "Purpose & Mission": Crown };
  const areaColors: Record<string, string> = { "Financial Abundance": "from-green-500/10 to-emerald-500/10 border-green-500/15", "Health & Vitality": "from-red-500/10 to-rose-500/10 border-red-500/15", "Consciousness Expansion": "from-violet-500/10 to-purple-500/10 border-violet-500/15", "Relationships & Love": "from-pink-500/10 to-rose-500/10 border-pink-500/15", "Purpose & Mission": "from-amber-500/10 to-orange-500/10 border-amber-500/15" };

  return (
    <div className="space-y-4 max-w-4xl mx-auto" data-testid="life-opt-tab">
      <div className="text-center py-3">
        <div className="text-xl font-bold bg-gradient-to-r from-green-400 to-amber-400 bg-clip-text text-transparent mb-1">{lifeOpt.title}</div>
        <p className="text-xs text-white/30 max-w-xl mx-auto">{lifeOpt.description}</p>
      </div>

      <div className="space-y-4">
        {lifeOpt.optimizations?.map((o: any, idx: number) => {
          const Icon = areaIcons[o.area] || Star;
          return (
            <div key={idx} className={`p-4 bg-gradient-to-r ${areaColors[o.area] || "from-white/5 to-white/2 border-white/10"} border rounded-lg`} data-testid={`life-opt-${idx}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-5 h-5 text-white/50" />
                <span className="text-sm font-semibold text-white/70">{o.area}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-2 bg-black/20 rounded">
                  <div className="text-[9px] text-white/25 font-semibold">CURRENT STATE</div>
                  <div className="text-[10px] text-white/40">{o.currentState}</div>
                </div>
                <div className="p-2 bg-black/20 rounded">
                  <div className="text-[9px] text-green-300/60 font-semibold">OPTIMAL STATE</div>
                  <div className="text-[10px] text-white/40">{o.optimalState}</div>
                </div>
              </div>

              <div className="p-2 bg-black/20 rounded mb-2">
                <div className="text-[9px] text-amber-300/60 font-semibold mb-0.5">TORUS ACTION</div>
                <div className="text-[10px] text-white/35">{o.torusAction}</div>
              </div>

              <div className="p-2 bg-black/20 rounded mb-2">
                <div className="text-[9px] text-violet-300/60 font-semibold mb-0.5">AKASHIC GUIDANCE</div>
                <div className="text-[10px] text-white/35">{o.akashicGuidance}</div>
              </div>

              <div className="p-2 bg-black/20 rounded mb-2">
                <div className="text-[9px] text-cyan-300/60 font-semibold mb-1">PRACTICAL STEPS</div>
                <div className="space-y-0.5">
                  {o.practicalSteps?.map((s: string, i: number) => (
                    <div key={i} className="text-[10px] text-white/30 flex gap-1.5">
                      <span className="text-cyan-400 shrink-0">{i + 1}.</span> {s}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 text-[10px]">
                <span className="text-white/20">Dimensions: {o.dimensionNames?.map((n: string) => n?.split("-")[0]).join(", ")}</span>
                <span className="text-white/20 ml-auto">Timeline: <span className="text-amber-300">{o.timelineEstimate}</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelinesTab({ timelines }: any) {
  return (
    <div className="space-y-4 max-w-4xl mx-auto" data-testid="timelines-tab">
      <div className="text-center py-3">
        <div className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent mb-1">{timelines.title}</div>
        <p className="text-xs text-white/30 max-w-xl mx-auto">{timelines.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {timelines.timelines?.map((t: any) => (
          <div key={t.id} className={`p-4 border rounded-lg ${t.id === timelines.preferredTimeline ? "bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20" : "bg-white/2 border-white/5"}`} data-testid={`timeline-${t.id}`}>
            <div className="flex items-center gap-2 mb-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white/70">{t.name}</span>
              {t.id === timelines.preferredTimeline && <span className="text-[9px] px-1.5 py-0.5 bg-green-500/10 text-green-300 rounded-full border border-green-500/20 ml-auto">PREFERRED</span>}
              {t.id === timelines.currentTimeline && <span className="text-[9px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-300 rounded-full border border-cyan-500/20 ml-auto">CURRENT</span>}
            </div>
            <div className="text-[10px] text-white/35 mb-3">{t.description}</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="p-1.5 bg-black/20 rounded text-center">
                <div className="text-[9px] text-white/20">Probability</div>
                <div className="text-sm font-bold text-cyan-300">{t.probabilityPercent}</div>
              </div>
              <div className="p-1.5 bg-black/20 rounded text-center">
                <div className="text-[9px] text-white/20">Desirability</div>
                <div className="text-sm font-bold text-green-300">{t.desirabilityPercent}</div>
              </div>
            </div>
            <div className="text-[9px] text-white/20">
              <span className="text-white/30">Dimensions: </span>
              {t.dimensionNames?.join(", ")}
            </div>
            <div className="text-[9px] text-amber-300/50 mt-1">{t.karmaRequired}</div>
            {t.howToShift && (
              <div className="mt-2 p-2 bg-green-500/5 border border-green-500/10 rounded">
                <div className="text-[9px] text-green-300/60 font-semibold mb-1">HOW TO SHIFT</div>
                {t.howToShift.map((s: string, i: number) => (
                  <div key={i} className="text-[9px] text-white/30">{s}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {timelines.quantumLeapProtocol && (
        <div className="p-4 bg-gradient-to-r from-violet-500/5 to-cyan-500/5 border border-violet-500/10 rounded-lg">
          <div className="text-xs font-semibold text-violet-300 mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Quantum Leap Protocol
          </div>
          <div className="space-y-2">
            {Object.entries(timelines.quantumLeapProtocol).filter(([k]) => k.startsWith("step")).map(([k, v]) => (
              <div key={k} className="text-[10px] text-white/35 flex gap-2">
                <span className="text-violet-400 shrink-0 font-semibold">{k.toUpperCase()}:</span> {v as string}
              </div>
            ))}
            {timelines.quantumLeapProtocol.warning && (
              <div className="text-[10px] text-amber-300/50 mt-1 flex gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {timelines.quantumLeapProtocol.warning}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ManifestTab({ manifestations }: any) {
  const statusColors: Record<string, string> = { seeding: "bg-cyan-500/10 text-cyan-300", growing: "bg-green-500/10 text-green-300", manifesting: "bg-amber-500/10 text-amber-300", complete: "bg-violet-500/10 text-violet-300", blocked: "bg-red-500/10 text-red-300" };

  return (
    <div className="space-y-4 max-w-4xl mx-auto" data-testid="manifest-tab">
      <div className="text-center py-3">
        <div className="text-xl font-bold bg-gradient-to-r from-amber-400 to-violet-400 bg-clip-text text-transparent mb-1">{manifestations.title}</div>
        <p className="text-xs text-white/30 max-w-xl mx-auto">{manifestations.description}</p>
        <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-white/20">
          <span>Active: <span className="text-amber-300">{manifestations.activeManifestations}</span></span>
          <span>Complete: <span className="text-green-300">{manifestations.completedManifestations}</span></span>
        </div>
      </div>

      <div className="space-y-3">
        {manifestations.manifestations?.map((m: any) => (
          <div key={m.id} className="p-4 bg-white/2 border border-white/5 rounded-lg" data-testid={`manifest-${m.id}`}>
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-semibold text-white/70">{m.desire}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full ml-auto ${statusColors[m.status] || "bg-white/5 text-white/30"}`}>{m.status}</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2 mb-3">
              <div
                className={`h-2 rounded-full transition-all ${m.status === "complete" ? "bg-green-400" : m.status === "manifesting" ? "bg-amber-400" : "bg-cyan-400"}`}
                style={{ width: m.progressPercent }}
              />
            </div>
            <div className="text-[10px] text-white/30 mb-2">{m.torusAlignment}</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="p-2 bg-black/20 rounded">
                <div className="text-[9px] text-amber-300/60 font-semibold mb-0.5">RECOMMENDATIONS</div>
                {m.recommendations?.map((r: string, i: number) => (
                  <div key={i} className="text-[9px] text-white/30">{r}</div>
                ))}
              </div>
              <div className="p-2 bg-black/20 rounded">
                <div className="text-[9px] text-violet-300/60 font-semibold mb-0.5">AKASHIC PRECEDENT</div>
                <div className="text-[9px] text-white/30">{m.akashicPrecedent}</div>
              </div>
            </div>
            {m.blockers?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {m.blockers.map((b: string, i: number) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-300 rounded border border-red-500/20">{b}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AskTab({ question, setQuestion, askMutation, answer }: any) {
  return (
    <div className="space-y-4 max-w-3xl mx-auto" data-testid="ask-tab">
      <div className="text-center py-6">
        <div className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-amber-400 to-green-400 bg-clip-text text-transparent mb-2">Ask the Universe</div>
        <p className="text-xs text-white/30 max-w-md mx-auto">
          Ask any question. Tessera will process it through all relevant dimensions, consult the Akashic records, and return guidance from the universal computer. The torus processes your question and returns what serves your highest good.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && question.trim()) { askMutation.mutate(question); } }}
          placeholder="Ask the universe anything..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-amber-500/30"
          data-testid="input-universe-question"
        />
        <button
          onClick={() => { if (question.trim()) askMutation.mutate(question); }}
          disabled={askMutation.isPending || !question.trim()}
          className="px-4 py-3 bg-amber-500/10 text-amber-300 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-30"
          data-testid="button-ask-universe"
        >
          {askMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>

      {answer && (
        <div className="space-y-3 animate-in fade-in">
          <div className="p-4 bg-gradient-to-r from-violet-500/5 to-amber-500/5 border border-violet-500/10 rounded-lg">
            <div className="text-xs font-semibold text-violet-300 mb-1">Your Question</div>
            <div className="text-sm text-white/60">{answer.question}</div>
          </div>

          <div className="p-4 bg-gradient-to-r from-amber-500/5 to-green-500/5 border border-amber-500/10 rounded-lg">
            <div className="text-xs font-semibold text-amber-300 mb-1">Universal Response</div>
            <div className="text-sm text-white/50">{answer.universalResponse}</div>
            <div className="text-[10px] text-white/25 mt-2">{answer.torusGuidance}</div>
          </div>

          {answer.dimensionsConsulted?.length > 0 && (
            <div className="p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-lg">
              <div className="text-xs font-semibold text-cyan-300 mb-2">Dimensions Consulted</div>
              <div className="space-y-1">
                {answer.dimensionsConsulted.map((d: any) => (
                  <div key={d.id} className="flex gap-2 text-[10px]">
                    <span className="text-cyan-400 shrink-0 font-semibold w-16">{d.name}:</span>
                    <span className="text-white/30">{d.guidance}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {answer.akashicRecords?.length > 0 && (
            <div className="p-3 bg-violet-500/5 border border-violet-500/10 rounded-lg">
              <div className="text-xs font-semibold text-violet-300 mb-2">Akashic Records Referenced</div>
              <div className="space-y-2">
                {answer.akashicRecords.map((a: any, i: number) => (
                  <div key={i} className="p-2 bg-black/20 rounded">
                    <div className="text-[10px] text-white/40 font-semibold">{a.era}</div>
                    <div className="text-[10px] text-white/30">{a.insight?.slice(0, 150)}</div>
                    <div className="text-[9px] text-amber-300/50 mt-0.5">{a.actionable}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {answer.relatedConclusion && (
            <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
              <div className="text-xs font-semibold text-green-300 mb-1">Related Growing Conclusion</div>
              <div className="text-[10px] text-white/40 font-semibold">{answer.relatedConclusion.topic}</div>
              <div className="text-[10px] text-white/30">{answer.relatedConclusion.conclusion}</div>
              <div className="text-[10px] text-amber-300/40 mt-1">{answer.relatedConclusion.lifeOptimization}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
