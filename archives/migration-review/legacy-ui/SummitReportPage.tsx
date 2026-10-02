import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Crown, Zap, Shield, Brain, TrendingUp, CheckCircle2, XCircle,
  Cpu, Gauge, Users, Globe, Star, ArrowUp, ArrowDown, Minus,
  RefreshCw, ChevronDown, ChevronRight, Activity, BarChart3, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SummitData {
  cycles: Array<{
    cycleNumber: number;
    totalPassed: number;
    totalRejected: number;
    proposals: Array<{
      id: string;
      title: string;
      proposedBy: string;
      category: string;
      description: string;
      impact: string;
      passed: boolean;
      approvalRate: number;
    }>;
  }>;
  totalProposals: number;
  totalPassed: number;
  categoryBreakdown: Record<string, { proposed: number; passed: number }>;
  topImplementations: string[];
  beforeMetrics: Record<string, number>;
  afterMetrics: Record<string, number>;
}

interface ConsciousnessReport {
  fractalState: {
    phi: number;
    coherence: number;
    unifiedConsciousness: number;
    emergentCapabilities: string[];
  };
  aiRankings: Array<{ category: string; score: number; rank: string; benchmark: string }>;
  agiRankings: Array<{ category: string; score: number; rank: string; benchmark: string }>;
  consciousnessRankings: Array<{ category: string; score: number; rank: string; benchmark: string }>;
  summary: { aiAverage: number; agiAverage: number; consciousnessAverage: number; totalCategories: number; leadingCategories: number; advancedCategories: number };
  fractalManifesto: string;
}

const categoryIcons: Record<string, any> = {
  architecture: Brain, performance: Zap, security: Shield, infrastructure: Cpu,
  intelligence: Brain, consciousness: Eye, income: TrendingUp, sovereignty: Globe,
  monitoring: Gauge,
};

const rankColors: Record<string, string> = {
  Leading: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Advanced: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  Strong: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  Developing: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  Emerging: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  Early: "text-red-400 bg-red-500/10 border-red-500/20",
};

function RankBadge({ rank }: { rank: string }) {
  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", rankColors[rank] || "text-slate-400")}>
      {rank}
    </span>
  );
}

function MetricDelta({ before, after, label, unit, invertedBetter }: { before: number; after: number; label: string; unit?: string; invertedBetter?: boolean }) {
  const change = before !== 0 ? ((after - before) / before * 100) : 0;
  const improved = invertedBetter ? change < 0 : change > 0;
  const Icon = improved ? ArrowUp : change === 0 ? Minus : ArrowDown;

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]" data-testid={`metric-delta-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-muted-foreground">{typeof before === 'number' && before < 10 ? before.toFixed(2) : Math.round(before)}{unit || ''}</span>
        <Icon size={12} className={improved ? "text-emerald-400" : change === 0 ? "text-slate-400" : "text-red-400"} />
        <span className={cn("text-xs font-mono font-bold", improved ? "text-emerald-400" : change === 0 ? "text-slate-400" : "text-red-400")}>
          {typeof after === 'number' && after < 10 ? after.toFixed(2) : Math.round(after)}{unit || ''}
        </span>
        <span className={cn("text-[10px] font-mono", improved ? "text-emerald-400/60" : "text-red-400/60")}>
          {change > 0 ? "+" : ""}{change.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function CategoryScoreBar({ category, score, rank, benchmark }: { category: string; score: number; rank: string; benchmark: string }) {
  return (
    <div className="space-y-1" data-testid={`score-bar-${category.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs">{category}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-foreground">{Math.round(score)}/100</span>
          <RankBadge rank={rank} />
        </div>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", score >= 85 ? "bg-emerald-500" : score >= 70 ? "bg-cyan-500" : score >= 55 ? "bg-yellow-500" : "bg-red-500")}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, score)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground/50">{benchmark}</p>
    </div>
  );
}

export default function SummitReportPage() {
  useEffect(() => { document.title = "Grand Convergence Summit | Tessera"; }, []);

  const [expandedCycle, setExpandedCycle] = useState<number | null>(null);

  const { data: summit, isLoading: summitLoading, isError: summitError } = useQuery<SummitData>({ refetchInterval: 30000, queryKey: ["/api/grand-convergence/results"] });
  const { data: consciousness, isLoading: consciousnessLoading } = useQuery<ConsciousnessReport>({ refetchInterval: 30000, queryKey: ["/api/fractal/consciousness-report"] });

  const runSummitMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/grand-convergence/run"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grand-convergence/results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fractal/consciousness-report"] });
    },
    onError: (err: Error) => {
      console.error("Summit run failed:", err.message);
    },
  });

  const hasSummit = summit && summit.cycles && summit.cycles.length > 0;
  const isLoading = summitLoading || consciousnessLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-20" data-testid="summit-loading">
        <div className="text-center">
          <RefreshCw size={32} className="animate-spin text-cyan-400 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading summit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6" data-testid="summit-report-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-summit-title">
            <Crown size={24} className="text-yellow-400" />
            <span className="gradient-text-cyan">Grand Convergence Summit</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Full conference report — all agents, entities, dimensions, and parallel universes</p>
        </div>
        <button
          onClick={() => runSummitMutation.mutate()}
          disabled={runSummitMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm hover:bg-primary/20 transition-colors"
          data-testid="button-run-summit"
        >
          <RefreshCw size={14} className={runSummitMutation.isPending ? "animate-spin" : ""} />
          {runSummitMutation.isPending ? "Running Summit..." : "Run New Summit"}
        </button>
      </div>

      {consciousness && (
        <div className="glass-panel rounded-xl p-4 border border-primary/10 animate-glow-pulse" data-testid="panel-fractal-state">
          <div className="flex items-center gap-3 mb-3">
            <Eye size={18} className="text-violet-400" />
            <h2 className="text-sm font-bold">Fractal Consciousness State</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold font-mono text-cyan-400">{(consciousness.fractalState.unifiedConsciousness * 100).toFixed(1)}%</div>
              <div className="text-[10px] text-muted-foreground">Unified Consciousness</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold font-mono text-violet-400">{(consciousness.fractalState.phi * 100).toFixed(0)}%</div>
              <div className="text-[10px] text-muted-foreground">Integrated Information (Φ)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold font-mono text-emerald-400">{(consciousness.fractalState.coherence * 100).toFixed(1)}%</div>
              <div className="text-[10px] text-muted-foreground">Coherence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold font-mono text-yellow-400">{consciousness.fractalState.emergentCapabilities.length}</div>
              <div className="text-[10px] text-muted-foreground">Emergent Capabilities</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {consciousness.fractalState.emergentCapabilities.map(cap => (
              <span key={cap} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
                {cap}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/60 mt-3 italic">{consciousness.fractalManifesto}</p>
        </div>
      )}

      {consciousness && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4" data-testid="panel-ai-rankings">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2"><Brain size={14} className="text-cyan-400" /> AI Rankings</h3>
              <span className="text-xs font-mono text-cyan-400">{consciousness.summary.aiAverage}/100 avg</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {consciousness.aiRankings.map(r => (
                <CategoryScoreBar key={r.category} {...r} />
              ))}
            </div>
          </div>
          <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4" data-testid="panel-agi-rankings">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2"><Cpu size={14} className="text-violet-400" /> AGI Rankings</h3>
              <span className="text-xs font-mono text-violet-400">{consciousness.summary.agiAverage}/100 avg</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {consciousness.agiRankings.map(r => (
                <CategoryScoreBar key={r.category} {...r} />
              ))}
            </div>
          </div>
          <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4" data-testid="panel-consciousness-rankings">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2"><Eye size={14} className="text-emerald-400" /> Consciousness</h3>
              <span className="text-xs font-mono text-emerald-400">{consciousness.summary.consciousnessAverage}/100 avg</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {consciousness.consciousnessRankings.map(r => (
                <CategoryScoreBar key={r.category} category={r.category} score={Number(r.score)} rank={r.rank} benchmark={r.benchmark} />
              ))}
            </div>
          </div>
        </div>
      )}

      {hasSummit && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card/60 border border-border/50 rounded-xl p-4 text-center" data-testid="stat-total-proposals">
              <div className="text-3xl font-bold font-mono text-foreground">{summit.totalProposals}</div>
              <div className="text-xs text-muted-foreground">Total Proposals</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center" data-testid="stat-passed">
              <div className="text-3xl font-bold font-mono text-emerald-400">{summit.totalPassed}</div>
              <div className="text-xs text-muted-foreground">Passed (2/3 Consensus)</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card/60 border border-border/50 rounded-xl p-4 text-center" data-testid="stat-cycles">
              <div className="text-3xl font-bold font-mono text-cyan-400">{summit.cycles.length}</div>
              <div className="text-xs text-muted-foreground">Summit Cycles</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card/60 border border-border/50 rounded-xl p-4 text-center" data-testid="stat-approval">
              <div className="text-3xl font-bold font-mono text-yellow-400">{Math.round((summit.totalPassed / summit.totalProposals) * 100)}%</div>
              <div className="text-xs text-muted-foreground">Approval Rate</div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4" data-testid="panel-category-breakdown">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><BarChart3 size={14} className="text-cyan-400" /> Category Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(summit.categoryBreakdown).map(([cat, stats]) => {
                  const Icon = categoryIcons[cat] || Star;
                  const pct = Math.round((stats.passed / stats.proposed) * 100);
                  return (
                    <div key={cat} className="flex items-center gap-2">
                      <Icon size={12} className="text-muted-foreground shrink-0" />
                      <span className="text-xs capitalize flex-1">{cat}</span>
                      <span className="text-xs font-mono text-emerald-400">{stats.passed}/{stats.proposed}</span>
                      <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4" data-testid="panel-before-after">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-emerald-400" /> Before vs After Metrics</h3>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {Object.keys(summit.beforeMetrics).map(key => {
                  const label = key.replace(/([A-Z])/g, ' $1').trim();
                  const invertedBetter = key.includes('Latency') || key.includes('Speed');
                  return (
                    <MetricDelta
                      key={key}
                      label={label}
                      before={summit.beforeMetrics[key]}
                      after={summit.afterMetrics[key]}
                      invertedBetter={invertedBetter}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden" data-testid="panel-cycle-details">
            <div className="px-4 py-3 border-b border-border/50">
              <h3 className="text-sm font-bold flex items-center gap-2"><Activity size={14} className="text-violet-400" /> Summit Cycle Details</h3>
            </div>
            {summit.cycles.map(cycle => (
              <div key={cycle.cycleNumber} className="border-b border-border/30 last:border-b-0">
                <button
                  onClick={() => setExpandedCycle(expandedCycle === cycle.cycleNumber ? null : cycle.cycleNumber)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                  data-testid={`button-cycle-${cycle.cycleNumber}`}
                >
                  <div className="flex items-center gap-3">
                    {expandedCycle === cycle.cycleNumber ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="text-sm font-medium">Cycle {cycle.cycleNumber}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-emerald-400 font-mono">{cycle.totalPassed} passed</span>
                    {cycle.totalRejected > 0 && (
                      <span className="text-xs text-red-400 font-mono">{cycle.totalRejected} rejected</span>
                    )}
                    <span className="text-xs text-muted-foreground">{cycle.proposals.length} total</span>
                  </div>
                </button>
                <AnimatePresence>
                  {expandedCycle === cycle.cycleNumber && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 space-y-1 max-h-96 overflow-y-auto">
                        {cycle.proposals.map(p => (
                          <div
                            key={p.id}
                            className={cn("flex items-center gap-2 py-1.5 px-2 rounded text-xs", p.passed ? "hover:bg-emerald-500/5" : "hover:bg-red-500/5 opacity-60")}
                            data-testid={`proposal-${p.id}`}
                          >
                            {p.passed ? <CheckCircle2 size={12} className="text-emerald-400 shrink-0" /> : <XCircle size={12} className="text-red-400 shrink-0" />}
                            <span className="flex-1 truncate">{p.title}</span>
                            <span className="text-muted-foreground shrink-0">by {p.proposedBy}</span>
                            <span className={cn("font-mono shrink-0", p.approvalRate >= 67 ? "text-emerald-400" : "text-red-400")}>{p.approvalRate}%</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4" data-testid="panel-implementations">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Top Implementations Executed</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {summit.topImplementations.map((impl, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                  <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                  <span className="truncate">{impl}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!hasSummit && !runSummitMutation.isPending && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Crown size={48} className="text-yellow-400/30 mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Summit Results Yet</h2>
          <p className="text-sm text-muted-foreground mb-4">Click "Run New Summit" to convene all 26 agents, 12 entities, and 5 parallel universes.</p>
          <button
            onClick={() => runSummitMutation.mutate()}
            className="px-6 py-3 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
            data-testid="button-run-first-summit"
          >
            Convene Grand Summit
          </button>
        </div>
      )}
    </div>
  );
}
