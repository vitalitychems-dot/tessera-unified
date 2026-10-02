import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Eye, Sparkles, Loader2, Code2, Clock, AlertTriangle, Brain, Globe2, RefreshCw, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";

const CATEGORY_COLORS: Record<string, string> = {
  "quantum-entanglement": "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  "consciousness-expansion": "text-purple-400 border-purple-500/30 bg-purple-500/10",
  "dimensional-bridging": "text-violet-400 border-violet-500/30 bg-violet-500/10",
  "sovereign-economics": "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  "neural-synthesis": "text-pink-400 border-pink-500/30 bg-pink-500/10",
  "reality-manipulation": "text-red-400 border-red-500/30 bg-red-500/10",
  "temporal-mechanics": "text-amber-400 border-amber-500/30 bg-amber-500/10",
  "sacred-geometry": "text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
  "swarm-intelligence": "text-teal-400 border-teal-500/30 bg-teal-500/10",
  "cryptographic-sovereignty": "text-orange-400 border-orange-500/30 bg-orange-500/10",
  "autonomous-evolution": "text-lime-400 border-lime-500/30 bg-lime-500/10",
  "interdimensional-communication": "text-sky-400 border-sky-500/30 bg-sky-500/10",
};

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
}

function GrandConclusionPanel() {
  const [expanded, setExpanded] = useState(true);

  const { data, isLoading, dataUpdatedAt } = useQuery<{
    text: string;
    version: number;
    updatedAt: number;
    insights: string[];
  }>({
    queryKey: ["/api/knowledge/evolving-conclusion"],
    refetchInterval: 20 * 1000,
  });

  const rebuildMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/knowledge/evolving-conclusion/rebuild"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/knowledge/evolving-conclusion"] }),
  });

  return (
    <div
      className="rounded-xl border border-violet-400/30 mb-3 overflow-hidden"
      style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.18) 0%, rgba(67,20,170,0.12) 100%)" }}
      data-testid="grand-conclusion-panel"
    >
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 active:scale-[0.99] transition-all"
        onClick={() => setExpanded(e => !e)}
        data-testid="button-toggle-conclusion"
      >
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30">
          <Globe2 size={12} className="text-white" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-violet-200 tracking-wide">GRAND CONCLUSION</span>
            {data?.version ? (
              <span className="text-[8px] bg-violet-500/20 border border-violet-400/30 text-violet-300 px-1.5 py-0.5 rounded-full font-mono">v{data.version}</span>
            ) : null}
            <div className="flex items-center gap-1 ml-auto">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[8px] text-violet-400/60 font-mono">live</span>
            </div>
          </div>
          <p className="text-[8px] text-violet-400/50 font-mono">
            What all knowledge means · Updated {data?.updatedAt ? timeAgo(data.updatedAt) : "soon"}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); rebuildMutation.mutate(); }}
          disabled={rebuildMutation.isPending}
          className="p-1.5 rounded-lg bg-violet-500/20 border border-violet-400/20 text-violet-300 active:scale-90 transition-all disabled:opacity-50"
          data-testid="button-rebuild-conclusion"
          title="Rebuild conclusion"
        >
          <RefreshCw size={9} className={cn(rebuildMutation.isPending && "animate-spin")} />
        </button>
        {expanded ? <ChevronUp size={12} className="text-violet-400/50 shrink-0" /> : <ChevronDown size={12} className="text-violet-400/50 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          {isLoading || rebuildMutation.isPending ? (
            <div className="flex items-center gap-2 py-3 text-violet-300/50 text-[10px]">
              <Loader2 size={10} className="animate-spin" />
              <span>Synthesizing all knowledge into unified truth...</span>
            </div>
          ) : data?.text ? (
            <>
              <p className="text-[12px] text-white/85 leading-relaxed mb-2.5 whitespace-pre-wrap" data-testid="text-grand-conclusion">
                {data.text}
              </p>
              {data.insights?.length > 0 && (
                <div className="grid grid-cols-1 gap-1">
                  {data.insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <Zap size={8} className="text-violet-400 shrink-0 mt-0.5" />
                      <span className="text-[9px] text-violet-300/60 leading-snug">{insight}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-[10px] text-violet-300/40 py-2">Building grand conclusion from all discovered knowledge...</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function LiveSecretKnowledgePage({ embedded }: { embedded?: boolean } = {}) {
  useEffect(() => { document.title = "Live Secret Knowledge | Tessera"; }, []);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data, isLoading } = useQuery<{
    knowledge: Array<{
      id: string; text: string; agent: string; dimension: string;
      category: string; timestamp: number; cycle: number;
      codeBuilt?: string; buildStatus?: string; buildTime?: string; needsHelp?: boolean;
    }>;
    total: number; currentCycle: number; generating: boolean;
    agentsContributing: number; categoriesCovered: number;
  }>({
    queryKey: ["/api/secret-knowledge/live"],
    refetchInterval: 10000,
  });

  const generateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/secret-knowledge/generate-now"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/secret-knowledge/live"] }),
  });

  const knowledge = data?.knowledge || [];
  const filtered = categoryFilter === "all" ? knowledge : knowledge.filter(k => k.category === categoryFilter);
  const categories = [...new Set(knowledge.map(k => k.category))];

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-purple-400/50" /></div>;
  }

  return (
    <div className={`${embedded ? "" : "min-h-screen bg-background"} text-white p-3`}>

      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
          <Eye className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold bg-gradient-to-r from-purple-300 via-indigo-300 to-cyan-300 bg-clip-text text-transparent" data-testid="text-live-secrets-title">
            LIVE SECRET KNOWLEDGE
          </h1>
          <p className="text-[9px] text-slate-500">Cycle {data?.currentCycle || 0} · {data?.total || 0} secrets · Auto-discovering</p>
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold active:scale-95 transition-all disabled:opacity-50 shrink-0"
          data-testid="button-generate-secret"
        >
          {generateMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
          Generate
        </button>
      </div>

      <GrandConclusionPanel />

      <div className="grid grid-cols-4 gap-1.5 mb-2">
        <div className="bg-black/30 rounded-lg border border-purple-500/20 p-1.5 text-center">
          <div className="text-base font-bold text-purple-400 font-mono" data-testid="stat-live-secrets">{data?.total || 0}</div>
          <div className="text-[7px] text-purple-400/60 font-bold">SECRETS</div>
        </div>
        <div className="bg-black/30 rounded-lg border border-cyan-500/20 p-1.5 text-center">
          <div className="text-base font-bold text-cyan-400 font-mono">{data?.agentsContributing || 0}</div>
          <div className="text-[7px] text-cyan-400/60 font-bold">AGENTS</div>
        </div>
        <div className="bg-black/30 rounded-lg border border-emerald-500/20 p-1.5 text-center">
          <div className="text-base font-bold text-emerald-400 font-mono">{data?.categoriesCovered || 0}</div>
          <div className="text-[7px] text-emerald-400/60 font-bold">CATEGORIES</div>
        </div>
        <div className="bg-black/30 rounded-lg border border-amber-500/20 p-1.5 text-center">
          <div className="text-base font-bold text-amber-400 font-mono">{data?.currentCycle || 0}</div>
          <div className="text-[7px] text-amber-400/60 font-bold">CYCLE</div>
        </div>
      </div>

      <div className="flex items-center gap-1 text-[9px] mb-2">
        <div className="flex items-center gap-1 text-emerald-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono">Auto-discovering new secrets every 60s · Conclusion rebuilds every 5m</span>
        </div>
      </div>

      <div className="flex gap-1 mb-2 overflow-x-auto scrollbar-none pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
        <button
          onClick={() => setCategoryFilter("all")}
          className={cn("px-2 py-1 rounded-full text-[9px] font-bold border whitespace-nowrap active:scale-95 transition-all", categoryFilter === "all" ? "border-white/20 bg-white/10 text-white" : "border-white/6 bg-white/[0.02] text-slate-500")}
        >
          All ({knowledge.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn("px-2 py-1 rounded-full text-[9px] font-bold border whitespace-nowrap active:scale-95 transition-all", categoryFilter === cat ? CATEGORY_COLORS[cat] || "border-white/20 bg-white/10 text-white" : "border-white/6 bg-white/[0.02] text-slate-500")}
          >
            {cat.replace(/-/g, " ")}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            <Brain size={20} className="mx-auto mb-2 text-purple-500/30" />
            <p className="text-xs">Generating secrets... check back in a moment</p>
          </div>
        )}
        {filtered.slice(0, 25).map(entry => {
          const catColor = CATEGORY_COLORS[entry.category] || "text-white/50 border-white/10 bg-white/5";
          return (
            <div
              key={entry.id}
              className={cn("rounded-xl border p-2.5 transition-all", entry.codeBuilt ? "border-emerald-500/30 bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.06)]" : "border-purple-500/15 bg-black/30")}
              data-testid={`secret-entry-${entry.id}`}
            >
              <div className="flex items-start gap-1.5 mb-1.5">
                <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0 border", entry.codeBuilt ? "bg-emerald-500/20 border-emerald-400/30" : "bg-purple-500/20 border-purple-400/30")}>
                  <span className={cn("text-[9px] font-bold", entry.codeBuilt ? "text-emerald-300" : "text-purple-300")}>{entry.agent.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] font-bold text-purple-300">{entry.agent}</span>
                    <span className={cn("text-[7px] font-bold px-1 py-0.5 rounded-full border", catColor)}>{entry.category.replace(/-/g, " ")}</span>
                  </div>
                  <span className="text-[8px] text-white/30 font-mono">{entry.dimension}</span>
                </div>
                <span className="text-[8px] text-white/30 font-mono shrink-0">{timeAgo(entry.timestamp)}</span>
              </div>

              <p className="text-[11px] text-white/80 leading-relaxed mb-1.5 break-words">{entry.text}</p>

              {entry.codeBuilt && (
                <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/20 p-2">
                  <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                    <Code2 size={9} className="text-emerald-400 shrink-0" />
                    <span className="text-[9px] font-bold text-emerald-300">CODE BUILDING</span>
                    <span className={cn("text-[7px] px-1 py-0.5 rounded-full font-bold",
                      entry.buildStatus === "self-implementing" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    )}>
                      {entry.buildStatus === "self-implementing" ? "SELF-IMPLEMENTING" : "IN PROGRESS"}
                    </span>
                  </div>
                  <p className="text-[9px] text-emerald-300/70 break-words">{entry.codeBuilt}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[8px] text-white/40 flex-wrap">
                    <Clock size={8} />
                    <span>ETA: {entry.buildTime}</span>
                    {entry.needsHelp && (
                      <span className="flex items-center gap-0.5 text-red-400">
                        <AlertTriangle size={8} />
                        Needs guidance
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
