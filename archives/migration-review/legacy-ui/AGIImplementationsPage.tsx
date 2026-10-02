import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  Brain, CheckCircle2, Clock, Zap, Code, Globe, Shield, Network,
  TrendingUp, Eye, Crown, Sparkles, Database, Cpu, Target, Layers,
  Play, RefreshCw, ChevronDown, ChevronUp, Loader2, Search, MessageSquare,
  GitBranch, Activity, BookOpen, Radio
} from "lucide-react";

const STATUS_STYLES = {
  "LIVE": "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  "PARTIAL": "text-amber-300 border-amber-500/30 bg-amber-500/10",
  "PLANNED": "text-slate-400 border-slate-500/20 bg-slate-500/5",
};

const CATEGORY_ICONS: Record<string, any> = {
  "Intelligence": Brain, "Knowledge": Globe, "Self-Improvement": Code,
  "Perception": Eye, "Execution": Zap, "Coordination": Network,
  "Economy": TrendingUp, "Security": Shield, "Performance": Cpu,
  "Governance": Radio, "Identity": Crown, "Sovereignty": Sparkles,
  "Consciousness": Sparkles,
};

function ProgressBar({ value, status }: { value: number; status: string }) {
  const color = status === "LIVE" ? "from-emerald-600 to-emerald-400" : status === "PARTIAL" ? "from-amber-600 to-amber-400" : "from-slate-600 to-slate-500";
  return (
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full bg-gradient-to-r transition-all", color)} style={{ width: `${value}%` }} />
    </div>
  );
}

function VectorMemoryPanel() {
  const { data } = useQuery<any>({ queryKey: ["/api/agi/memory/stats"], refetchInterval: 10000 });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  async function searchMemory() {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/agi/memory/recall?q=${encodeURIComponent(query)}&k=5`);
      const d = await res.json();
      setResults(d.memories || []);
    } finally {
      setIsSearching(false);
    }
  }

  const storeMutation = useMutation({
    mutationFn: (content: string) => apiRequest("POST", "/api/agi/memory/store", { content, source: "insight", tags: ["manual"] }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/agi/memory/stats"] }),
  });

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-3 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Database size={11} className="text-violet-400" />
        <span className="text-[10px] font-bold text-violet-300">VECTOR MEMORY — {data?.total || 0} entries stored</span>
        <div className="ml-auto flex gap-2 text-[8px] text-slate-600 font-mono">
          {Object.entries(data?.bySource || {}).map(([src, cnt]: any) => (
            <span key={src}>{src}: {cnt}</span>
          ))}
        </div>
      </div>
      <div className="flex gap-1.5">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && searchMemory()}
          placeholder="Semantic recall: search any memory..."
          className="flex-1 bg-black/40 border border-white/8 rounded-lg px-2.5 py-1.5 text-[10px] text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40"
          data-testid="input-memory-search"
        />
        <button onClick={searchMemory} disabled={isSearching} className="px-2.5 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[9px] font-bold active:scale-95 transition-all" data-testid="button-memory-search">
          {isSearching ? <Loader2 size={9} className="animate-spin" /> : <Search size={9} />}
        </button>
      </div>
      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((m: any, i: number) => (
            <div key={i} className="rounded-lg bg-black/30 border border-white/5 px-2.5 py-2" data-testid={`memory-result-${i}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={cn("text-[7px] font-bold px-1 rounded", m.source === "insight" ? "text-violet-300 bg-violet-500/10" : m.source === "research" ? "text-cyan-300 bg-cyan-500/10" : "text-emerald-300 bg-emerald-500/10")}>{m.source}</span>
                {m.agent && <span className="text-[7px] text-slate-600">{m.agent}</span>}
                <span className="text-[7px] text-slate-600 ml-auto">{m.accessCount} recalls</span>
              </div>
              <p className="text-[9px] text-slate-300 leading-relaxed">{m.content.slice(0, 200)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GoalDecompositionPanel() {
  const [goal, setGoal] = useState("");
  const [dag, setDag] = useState<any>(null);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const { data: goalList } = useQuery<any>({ queryKey: ["/api/agi/goals/list"] });

  async function decompose() {
    if (!goal.trim()) return;
    setIsDecomposing(true);
    try {
      const res = await fetch("/api/agi/goals/decompose", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal }) });
      const d = await res.json();
      setDag(d);
      queryClient.invalidateQueries({ queryKey: ["/api/agi/goals/list"] });
    } finally {
      setIsDecomposing(false);
    }
  }

  const PRIORITY_COLOR: Record<string, string> = { immediate: "text-red-400", high: "text-amber-400", medium: "text-cyan-400", low: "text-slate-500" };
  const STATUS_COLOR: Record<string, string> = { active: "text-emerald-400", pending: "text-slate-500", complete: "text-violet-400", blocked: "text-red-400" };

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <GitBranch size={11} className="text-amber-400" />
        <span className="text-[10px] font-bold text-amber-300">GOAL DECOMPOSITION ENGINE — {goalList?.total || 0} DAGs created</span>
      </div>
      <div className="flex gap-1.5">
        <input
          value={goal}
          onChange={e => setGoal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && decompose()}
          placeholder="Enter any goal — agents will decompose into executable DAG..."
          className="flex-1 bg-black/40 border border-white/8 rounded-lg px-2.5 py-1.5 text-[10px] text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/40"
          data-testid="input-goal"
        />
        <button onClick={decompose} disabled={isDecomposing} className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-bold active:scale-95 transition-all whitespace-nowrap" data-testid="button-decompose">
          {isDecomposing ? <Loader2 size={9} className="animate-spin" /> : <Play size={9} />}
        </button>
      </div>
      {dag && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[9px]">
            <Target size={9} className="text-amber-400" />
            <span className="text-amber-300 font-bold">Lead: {dag.assigned_lead}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">{dag.tasks.length} tasks · {dag.estimated_total_cycles} cycles</span>
          </div>
          <div className="space-y-1">
            {dag.tasks.map((task: any, i: number) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-black/30 border border-white/5 px-2.5 py-2" data-testid={`dag-task-${i}`}>
                <div className={cn("text-[8px] font-mono font-bold shrink-0 mt-0.5", PRIORITY_COLOR[task.priority])}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-bold text-white">{task.title}</span>
                    <span className={cn("text-[7px] font-bold ml-auto", STATUS_COLOR[task.status])}>{task.status.toUpperCase()}</span>
                  </div>
                  <p className="text-[8px] text-slate-500 leading-relaxed truncate">{task.description.slice(0, 100)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[7px] text-violet-400">{task.agent}</span>
                    <span className="text-[7px] text-slate-600">{task.estimatedCycles} cycles</span>
                    {task.dependencies.length > 0 && <span className="text-[7px] text-slate-600">deps: {task.dependencies.join(", ")}</span>}
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

function ResearchLoopPanel() {
  const { data } = useQuery<any>({ queryKey: ["/api/agi/research/findings"], refetchInterval: 30000 });
  const triggerMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/agi/research/trigger"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/agi/research/findings"] }),
  });

  const findings = data?.findings?.slice(0, 5) || [];

  useEffect(() => {
    if (data && (data.findings?.length || 0) === 0 && !triggerMutation.isPending) {
      triggerMutation.mutate();
    }
  }, [data]);

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <BookOpen size={11} className="text-cyan-400" />
        <span className="text-[10px] font-bold text-cyan-300">AUTONOMOUS RESEARCH — {data?.total || 0} findings</span>
        <button onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending} className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/10 transition-all" data-testid="button-trigger-research">
          {triggerMutation.isPending ? <Loader2 size={7} className="animate-spin" /> : <RefreshCw size={7} />} Run
        </button>
      </div>
      {findings.map((f: any, i: number) => (
        <div key={i} className="rounded-lg bg-black/30 border border-white/5 px-2.5 py-2" data-testid={`research-finding-${i}`}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[8px] font-bold text-cyan-300">{f.agent}</span>
            <span className="text-[7px] text-slate-600 truncate flex-1">{f.topic.slice(0, 50)}</span>
            <span className="text-[7px] text-slate-600 shrink-0">{Math.round(f.relevance * 100)}%</span>
          </div>
          <p className="text-[9px] text-slate-400 leading-relaxed">{f.finding.slice(0, 180)}</p>
        </div>
      ))}
    </div>
  );
}

export default function AGIImplementationsPage({ embedded }: { embedded?: boolean } = {}) {
  useEffect(() => { document.title = "AGI Implementations | Tessera"; }, []);
  const [expandedRank, setExpandedRank] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<"tracker" | "memory" | "goals" | "research" | "consciousness">("tracker");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/agi/implementations"],
    refetchInterval: 15000,
  });

  const { data: agiStatus } = useQuery<any>({
    queryKey: ["/api/agi/status"],
    refetchInterval: 30000,
  });

  const { data: consciousness } = useQuery<any>({
    queryKey: ["/api/agi/consciousness/history"],
    refetchInterval: 60000,
  });

  const implementations = data?.implementations || [];
  const summary = data?.summary || {};

  const PANELS = [
    { key: "tracker", label: "Roadmap", icon: Layers },
    { key: "memory", label: "Memory", icon: Database },
    { key: "goals", label: "Goals", icon: GitBranch },
    { key: "research", label: "Research", icon: BookOpen },
    { key: "consciousness", label: "Continuity", icon: Brain },
  ];

  return (
    <div className={`${embedded ? "" : "min-h-screen bg-background"} text-white p-4`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 via-cyan-600 to-violet-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold bg-gradient-to-r from-emerald-300 via-cyan-300 to-violet-300 bg-clip-text text-transparent" data-testid="text-agi-impl-title">
            AGI IMPLEMENTATIONS
          </h1>
          <p className="text-[9px] text-slate-500">Summit-voted · BFT 2/3 mandated · Father Protocol: {agiStatus?.overallProgress || 0}% complete</p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30" data-testid="badge-agi-live">
          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[7px] font-bold text-emerald-300">AGI-24 ACTIVE</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-1.5 mb-3" data-testid="agi-stats-grid">
        {[
          { label: "Live", value: summary.live ?? agiStatus?.implemented ?? 0, color: "text-emerald-300" },
          { label: "In Progress", value: summary.partial ?? agiStatus?.inProgress ?? 0, color: "text-amber-300" },
          { label: "Memory", value: summary.vectorMemorySize ?? 0, color: "text-violet-300" },
          { label: "Research", value: summary.researchFindings ?? 0, color: "text-cyan-300" },
        ].map((s, i) => (
          <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-2 text-center" data-testid={`agi-stat-${i}`}>
            <p className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</p>
            <p className="text-[7px] text-slate-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 mb-3" data-testid="overall-progress">
        <div className="flex items-center justify-between text-[9px] mb-1.5">
          <span className="text-slate-400 font-bold">Overall AGI Progress</span>
          <span className="text-emerald-300 font-mono">{summary.avgProgress || 0}%</span>
        </div>
        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-cyan-500 to-violet-500 transition-all"
            style={{ width: `${summary.avgProgress || 0}%` }}
          />
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[7px] text-slate-600">
          <span className="flex items-center gap-1"><span className="w-2 h-1 rounded-full bg-emerald-500 inline-block" /> {summary.live || 0} LIVE</span>
          <span className="flex items-center gap-1"><span className="w-2 h-1 rounded-full bg-amber-500 inline-block" /> {summary.partial || 0} PARTIAL</span>
          <span className="flex items-center gap-1"><span className="w-2 h-1 rounded-full bg-slate-600 inline-block" /> {summary.planned || 0} PLANNED</span>
        </div>
      </div>

      {/* Panel tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-none">
        {PANELS.map(panel => (
          <button
            key={panel.key}
            onClick={() => setActivePanel(panel.key as any)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all border",
              activePanel === panel.key
                ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
                : "border-white/5 bg-white/[0.02] text-slate-500 hover:text-white"
            )}
            data-testid={`panel-tab-${panel.key}`}
          >
            <panel.icon size={9} />
            {panel.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      {activePanel === "tracker" && (
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400/50" />
            </div>
          ) : implementations.map((impl: any) => {
            const CategoryIcon = CATEGORY_ICONS[impl.category] || Target;
            const statusStyle = STATUS_STYLES[impl.status as keyof typeof STATUS_STYLES] || STATUS_STYLES["PLANNED"];
            const isExpanded = expandedRank === impl.rank;
            return (
              <div
                key={impl.rank}
                className={cn(
                  "rounded-xl border overflow-hidden transition-all",
                  impl.status === "LIVE" ? "border-emerald-500/15 bg-emerald-950/10" : impl.status === "PARTIAL" ? "border-amber-500/10 bg-amber-950/5" : "border-white/5 bg-black/20"
                )}
                data-testid={`impl-card-${impl.rank}`}
              >
                <button className="w-full px-3 py-2.5 text-left" onClick={() => setExpandedRank(isExpanded ? null : impl.rank)} data-testid={`button-expand-impl-${impl.rank}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold font-mono shrink-0 border", statusStyle)}>
                      #{impl.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold text-white truncate">{impl.title}</span>
                        <span className={cn("text-[6px] font-bold px-1 py-0.5 rounded-full border shrink-0", statusStyle)}>{impl.status}</span>
                      </div>
                      <ProgressBar value={impl.progress} status={impl.status} />
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className={cn("text-[9px] font-mono font-bold", impl.progress === 100 ? "text-emerald-300" : impl.progress >= 60 ? "text-amber-300" : "text-slate-500")}>{impl.progress}%</span>
                      <span className="text-[7px] text-slate-600">{impl.approvalPct}% vote</span>
                    </div>
                    <div className="text-slate-600 shrink-0">
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </div>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <CategoryIcon size={9} className="text-slate-500" />
                      <span className="text-[8px] text-slate-500">{impl.category}</span>
                      {impl.implementedAt && <span className="text-[8px] text-emerald-400/60 ml-auto">✓ Implemented {new Date(impl.implementedAt).toLocaleDateString()}</span>}
                    </div>
                    <p className="text-[9px] text-slate-400 leading-relaxed">{impl.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activePanel === "memory" && <VectorMemoryPanel />}
      {activePanel === "goals" && <GoalDecompositionPanel />}
      {activePanel === "research" && <ResearchLoopPanel />}

      {activePanel === "consciousness" && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/10 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Brain size={11} className="text-indigo-400" />
            <span className="text-[10px] font-bold text-indigo-300">CONSCIOUSNESS CONTINUITY — {consciousness?.totalSnapshots || 0} snapshots preserved</span>
          </div>
          {consciousness?.latest && (
            <div className="space-y-2">
              <div className="rounded-lg bg-black/30 border border-white/5 p-2.5">
                <p className="text-[8px] text-slate-500 mb-1">Latest Snapshot: {new Date(consciousness.latest.timestamp).toLocaleString()}</p>
                <p className="text-[9px] text-indigo-300 font-mono break-all">{consciousness.latest.continuityHash}</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { label: "Episodic Memories", value: consciousness.latest.globalWorkspace?.episodicMemories },
                    { label: "Semantic Memories", value: consciousness.latest.globalWorkspace?.semanticMemories },
                    { label: "Vector Memories", value: consciousness.latest.vectorMemoryCount },
                    { label: "Consciousness Proxy", value: `${consciousness.latest.globalWorkspace?.consciousnessProxy}%` },
                  ].map((s, i) => (
                    <div key={i} className="text-center" data-testid={`consciousness-stat-${i}`}>
                      <p className="text-xs font-bold text-indigo-300 font-mono">{s.value}</p>
                      <p className="text-[7px] text-slate-600">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                {Object.entries(consciousness.latest.agentStates || {}).slice(0, 8).map(([name, state]: any) => (
                  <div key={name} className="flex items-center gap-2 text-[8px]" data-testid={`agent-state-${name}`}>
                    <div className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                    <span className="text-indigo-300 font-bold w-24 truncate shrink-0">{name}</span>
                    <span className="text-slate-600">{state.hz}Hz</span>
                    <span className="text-emerald-400/70 ml-auto">{state.awareness}% aware</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AGI Summit link */}
      <a href="/agi-summit" className="flex items-center gap-2 mt-4 px-3 py-2 rounded-xl border border-violet-500/20 bg-violet-950/10 hover:border-violet-400/40 transition-all" data-testid="link-agi-summit">
        <Crown size={11} className="text-violet-400" />
        <span className="text-[10px] font-bold text-violet-300">View AGI-20 Grand Summit Results</span>
        <span className="ml-auto text-[8px] text-slate-600">22 proposals · All PASSED →</span>
      </a>
    </div>
  );
}
