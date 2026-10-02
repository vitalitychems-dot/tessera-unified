import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Cpu, Activity, Database, Zap, GitBranch, RefreshCw, TrendingUp, Star, Shield, Pause, Play, AlertTriangle, CheckCircle2, Clock, History, XCircle } from "lucide-react";
import { GlassCard, GradientBar, SectionHeader, TabBar, PageHeader, RadialGauge, MiniStat, HeroStat, TabLoadingSkeleton } from "@/components/ui/sovereign";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { QueryErrorFallback } from "@/components/ui/QueryErrorFallback";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";

const API = import.meta.env.VITE_API_URL || "";

type SystemTab = "agi" | "improvement" | "evolution" | "quantum" | "agents" | "health";

async function fetchApi<T = any>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  const json = await res.json();
  return json.data;
}

export default function SystemPage({ initialTab }: { initialTab?: SystemTab }) {
  const [activeTab, setActiveTab] = useState<SystemTab>(initialTab || "agi");

  const { data: agiMetrics, error: agiError, refetch: refetchAgi } = useQuery({
    queryKey: ["agi-metrics"],
    queryFn: () => fetchApi(`${API}/api/agi-training/metrics`),
    refetchInterval: 15000,
  });

  const { data: improvementMetrics, error: improvementError, refetch: refetchImprovement } = useQuery({
    queryKey: ["improvement-metrics"],
    queryFn: () => fetchApi(`${API}/api/auto-improvement/metrics`),
    refetchInterval: 60000,
    enabled: activeTab === "improvement",
  });

  const { data: evolutionMetrics, error: evolutionError, refetch: refetchEvolution } = useQuery({
    queryKey: ["evolution-metrics"],
    queryFn: () => fetchApi(`${API}/api/self-evolution/metrics`),
    refetchInterval: 60000,
    enabled: activeTab === "evolution",
  });

  const { data: quantumMetrics, error: quantumError, refetch: refetchQuantum } = useQuery({
    queryKey: ["quantum-metrics"],
    queryFn: () => fetchApi(`${API}/api/quantum/metrics`),
    refetchInterval: 60000,
    enabled: activeTab === "quantum",
  });

  const { data: agentMetrics, error: agentError, refetch: refetchAgents } = useQuery({
    queryKey: ["spawner-metrics"],
    queryFn: () => fetchApi(`${API}/api/agent-spawner/metrics`),
    refetchInterval: 30000,
    enabled: activeTab === "agents",
  });

  const { data: healthData, error: healthError, refetch: refetchHealth } = useQuery({
    queryKey: ["evolution-health"],
    queryFn: () => fetchApi(`${API}/api/evolution-health`),
    refetchInterval: 10000,
    enabled: activeTab === "health",
  });

  const { data: attemptsData } = useQuery({
    queryKey: ["evolution-attempts"],
    queryFn: () =>
      fetch(`${API}/api/evolution-health/attempts?limit=30`, {
        headers: { "x-admin-token": localStorage.getItem("t9_admin_token") || "" },
      })
        .then(r => (r.ok ? r.json() : { ok: false, data: { attempts: [], counts: {}, total: 0 } }))
        .then(j => j.data ?? { attempts: [], counts: {}, total: 0 }),
    refetchInterval: 10000,
    enabled: activeTab === "health",
  });

  const pauseMutation = useMutation({
    mutationFn: (moduleId: string) =>
      fetch(`${API}/api/evolution-health/pause/${moduleId}`, { method: "POST", headers: { "x-admin-token": localStorage.getItem("t9_admin_token") || "" } }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-health"] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (moduleId: string) =>
      fetch(`${API}/api/evolution-health/resume/${moduleId}`, { method: "POST", headers: { "x-admin-token": localStorage.getItem("t9_admin_token") || "" } }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-health"] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: (moduleId: string) =>
      fetch(`${API}/api/evolution-health/reset/${moduleId}`, { method: "POST", headers: { "x-admin-token": localStorage.getItem("t9_admin_token") || "" } }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-health"] });
    },
  });

  const tabs = [
    { id: "agi", label: "AGI Training" },
    { id: "improvement", label: "Improvement" },
    { id: "evolution", label: "Self-Evolution" },
    { id: "health", label: "Evo Health" },
    { id: "quantum", label: "Quantum" },
    { id: "agents", label: "Agents" },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#02010a] to-[#080518] p-4 md:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-6 sovereign-stagger">
        <PageHeader
          title="System Engine"
          subtitle="AGI Training · Self-Improvement · Quantum Architecture · Agent Network"
          gradient="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400"
        />

        {agiMetrics && activeTab === "agi" && (
          <div className="flex items-center justify-center gap-6 md:gap-10">
            <RadialGauge value={agiMetrics.avgScore ?? 0} label="Avg Score" sublabel="%" color="cyan" size={110} strokeWidth={10} />
            <RadialGauge value={agiMetrics.sovereignMastery ?? 0} max={20} label="Sovereign" color="violet" size={90} strokeWidth={8} />
            <RadialGauge value={agiMetrics.totalCycles ?? 0} max={100} label="Total Cycles" color="emerald" size={90} strokeWidth={8} />
          </div>
        )}

        <TabBar tabs={tabs} activeTab={activeTab} onChange={(id: string) => setActiveTab(id as SystemTab)} color="cyan" />

        {activeTab === "agi" && !agiMetrics && !agiError && (
          <TabLoadingSkeleton />
        )}
        {activeTab === "agi" && !agiMetrics && agiError && (
          <QueryErrorFallback error={agiError as Error} onRetry={() => refetchAgi()} label="AGI Training" />
        )}
        {activeTab === "agi" && agiMetrics && (
          <SectionErrorBoundary name="AGI Training">
            <div className="space-y-4 sovereign-stagger">
              <GlassCard glow="amber" animate>
                <SectionHeader icon={Star} title="Top AGI Categories" color="amber" />
                <div className="space-y-2.5 mt-3">
                  {agiMetrics.topCategories?.map((cat: any) => (
                    <div key={cat.category} className="flex items-center gap-2.5">
                      <div className="flex-1 min-w-0">
                        <GradientBar label={cat.category} value={cat.score} color="dynamic" rightLabel={cat.score.toFixed(1)} />
                      </div>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 border font-medium", cat.masteryLevel === "sovereign" ? "bg-violet-500/15 text-violet-400 border-violet-500/20" : cat.masteryLevel === "expert" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-slate-500/15 text-slate-400 border-slate-500/20")}>
                        {cat.masteryLevel}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard animate>
                <SectionHeader icon={Cpu} title="All Categories" color="cyan" />
                <div className="space-y-2.5 mt-3">
                  {agiMetrics.categoryStates && Object.entries(agiMetrics.categoryStates as Record<string, { score: number; masteryLevel: string; sessions: number }>).map(([cat, state]) => (
                    <GradientBar key={cat} label={`${cat} (${state.sessions} sessions)`} value={state.score} color="dynamic" rightLabel={state.score.toFixed(1)} />
                  ))}
                </div>
              </GlassCard>
            </div>
          </SectionErrorBoundary>
        )}

        {activeTab === "improvement" && !improvementMetrics && !improvementError && (
          <TabLoadingSkeleton />
        )}
        {activeTab === "improvement" && !improvementMetrics && improvementError && (
          <QueryErrorFallback error={improvementError as Error} onRetry={() => refetchImprovement()} label="Improvement" />
        )}
        {activeTab === "improvement" && improvementMetrics && (
          <SectionErrorBoundary name="Improvement">
            <div className="space-y-4 sovereign-stagger">
              <GlassCard glow="emerald" animate>
                <SectionHeader icon={TrendingUp} title="Auto-Improvement Daemon" color="emerald" />
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <MiniStat value={improvementMetrics.totalCycles} label="Cycles" color="emerald" />
                  <MiniStat value={improvementMetrics.totalImprovements} label="Improvements" color="cyan" />
                  <MiniStat value={`${improvementMetrics.overallSystemScorePct?.toFixed(1)}%`} label="System Score" color="violet" />
                </div>
              </GlassCard>
              <GlassCard animate>
                <SectionHeader icon={Activity} title="Category Scores" color="blue" />
                <div className="space-y-2.5 mt-3">
                  {improvementMetrics.categories && Object.entries(improvementMetrics.categories as Record<string, { score: number; sessions: number }>)
                    .sort(([, a], [, b]) => b.score - a.score)
                    .map(([cat, state]) => (
                      <GradientBar key={cat} label={`${cat} (${state.sessions} sessions)`} value={state.score} color="dynamic" rightLabel={state.score.toFixed(1)} />
                    ))}
                </div>
              </GlassCard>
              <GlassCard animate>
                <SectionHeader icon={Zap} title="Recent Improvements" color="amber" />
                <div className="space-y-2 mt-3">
                  {improvementMetrics.recentImprovements?.map((imp: any, i: number) => (
                    <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs hover:bg-white/[0.04] transition-all">
                      <div className="text-white leading-relaxed">{imp.description}</div>
                      <div className="text-emerald-400 font-mono font-bold mt-1">+{(imp.impact * 100).toFixed(2)}%</div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </SectionErrorBoundary>
        )}

        {activeTab === "evolution" && !evolutionMetrics && !evolutionError && (
          <TabLoadingSkeleton />
        )}
        {activeTab === "evolution" && !evolutionMetrics && evolutionError && (
          <QueryErrorFallback error={evolutionError as Error} onRetry={() => refetchEvolution()} label="Self-Evolution" />
        )}
        {activeTab === "evolution" && evolutionMetrics && (
          <SectionErrorBoundary name="Self-Evolution">
            <div className="space-y-4 sovereign-stagger">
              <GlassCard glow="violet" animate>
                <SectionHeader icon={GitBranch} title="Self-Code Evolution" color="violet" />
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <MiniStat value={evolutionMetrics.totalProposals} label="Proposals" color="violet" />
                  <MiniStat value={evolutionMetrics.approvedCount} label="Applied" color="emerald" />
                  <MiniStat value={evolutionMetrics.rejectedCount} label="Rejected" color="rose" />
                </div>
                <div className="text-[10px] text-slate-500 mt-3 font-mono">Protected modules: {evolutionMetrics.protectedModuleCount}</div>
                <div className="space-y-2 mt-3">
                  {evolutionMetrics.recentProposals?.map((p: any, i: number) => (
                    <div key={p.id || i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-1 hover:bg-white/[0.04] transition-all">
                      <div className="flex justify-between items-start gap-2">
                        <div className="text-xs text-white font-medium">{p.targetModule}</div>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 border", p.status === "applied" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : p.status === "rejected" ? "bg-red-500/15 text-red-400 border-red-500/20" : "bg-slate-500/15 text-slate-400 border-slate-500/20")}>{p.status}</span>
                      </div>
                      <div className="text-xs text-slate-400">{p.proposedChange}</div>
                      <div className="text-[10px] text-slate-500">{p.rationale?.slice(0, 80)}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </SectionErrorBoundary>
        )}

        {activeTab === "health" && !healthData && !healthError && (
          <TabLoadingSkeleton />
        )}
        {activeTab === "health" && !healthData && healthError && (
          <QueryErrorFallback error={healthError as Error} onRetry={() => refetchHealth()} label="Evolution Health" />
        )}
        {activeTab === "health" && (
          <SectionErrorBoundary name="Evolution Health">
            <div className="space-y-4 sovereign-stagger">
              {healthData && (
                <>
                  <div className="flex items-center justify-center gap-6 md:gap-10">
                    <RadialGauge
                      value={healthData.improvement?.overallCodeHealth ?? 0}
                      label="Code Health"
                      sublabel="%"
                      color="emerald"
                      size={110}
                      strokeWidth={10}
                    />
                    <RadialGauge
                      value={healthData.improvement?.patches?.successRate ?? 0}
                      label="Patch Success"
                      sublabel="%"
                      color="cyan"
                      size={90}
                      strokeWidth={8}
                    />
                    <RadialGauge
                      value={healthData.improvement?.testing?.passRate ?? 0}
                      label="Test Pass"
                      sublabel="%"
                      color="violet"
                      size={90}
                      strokeWidth={8}
                    />
                  </div>

                  <GlassCard glow="cyan" animate>
                    <div className="flex items-center justify-between">
                      <SectionHeader icon={Shield} title="Evolution Throttle" color="cyan" />
                      <div className="flex items-center gap-2">
                        {healthData.throttle?.globalPaused ? (
                          <button
                            onClick={() => resumeMutation.mutate("_all")}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors"
                          >
                            <Play className="w-3 h-3" />
                            Resume All
                          </button>
                        ) : (
                          <button
                            onClick={() => pauseMutation.mutate("_all")}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/20 transition-colors"
                          >
                            <Pause className="w-3 h-3" />
                            Pause All
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <MiniStat value={healthData.throttle?.totalModulesTracked ?? 0} label="Tracked" color="cyan" />
                      <MiniStat value={healthData.throttle?.totalModulesCoolingDown ?? 0} label="Cooling" color="amber" />
                      <MiniStat value={healthData.throttle?.globalPaused ? "Yes" : "No"} label="Global Pause" color={healthData.throttle?.globalPaused ? "rose" : "emerald"} />
                    </div>
                  </GlassCard>

                  {healthData.throttle?.modules?.length > 0 && (
                    <GlassCard animate>
                      <SectionHeader icon={Activity} title="Per-Module Status" color="violet" />
                      <div className="space-y-2 mt-3">
                        {healthData.throttle.modules.map((m: any) => (
                          <div key={m.moduleId} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-all">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {m.paused ? (
                                  <Pause className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                ) : m.cooldownRemainingMs > 0 ? (
                                  <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                ) : m.consecutiveFailures > 0 ? (
                                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                )}
                                <span className="text-xs text-white font-medium truncate">{m.moduleId}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={cn("text-[10px] font-mono", m.successRate >= 80 ? "text-emerald-400" : m.successRate >= 50 ? "text-amber-400" : "text-red-400")}>
                                  {m.successRate}% ok
                                </span>
                                {m.consecutiveFailures > 0 && (
                                  <button
                                    onClick={() => resetMutation.mutate(m.moduleId)}
                                    className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] hover:bg-cyan-500/20 transition-colors"
                                  >
                                    Reset
                                  </button>
                                )}
                                {m.paused ? (
                                  <button
                                    onClick={() => resumeMutation.mutate(m.moduleId)}
                                    className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] hover:bg-emerald-500/20 transition-colors"
                                  >
                                    Resume
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => pauseMutation.mutate(m.moduleId)}
                                    className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] hover:bg-amber-500/20 transition-colors"
                                  >
                                    Pause
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500 font-mono">
                              <span>{m.totalSuccesses} ok / {m.totalFailures} fail</span>
                              {m.consecutiveFailures > 0 && (
                                <span className="text-amber-400">{m.consecutiveFailures} consecutive fails</span>
                              )}
                              {m.cooldownRemainingMs > 0 && (
                                <span className="text-orange-400">cooldown: {Math.ceil(m.cooldownRemainingMs / 1000)}s</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  )}

                  <GlassCard animate>
                    <SectionHeader icon={Database} title="Scheduler" color="blue" />
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <MiniStat value={healthData.scheduler?.totalTasks ?? 0} label="Tasks" color="blue" />
                      <MiniStat value={healthData.scheduler?.activeTasks ?? 0} label="Active" color="emerald" />
                      <MiniStat value={healthData.scheduler?.runningNow ?? 0} label="Running" color="cyan" />
                    </div>
                  </GlassCard>

                  <GlassCard glow="amber" animate>
                    <SectionHeader icon={History} title="Self-Evolution Attempt Ledger" color="amber" />
                    <div className="grid grid-cols-5 gap-2 mt-3">
                      <MiniStat value={attemptsData?.counts?.PROPOSED ?? 0} label="Proposed" color="cyan" />
                      <MiniStat value={attemptsData?.counts?.SANDBOXED_PASS ?? 0} label="Sandbox OK" color="emerald" />
                      <MiniStat value={attemptsData?.counts?.SANDBOXED_FAIL ?? 0} label="Sandbox Fail" color="amber" />
                      <MiniStat value={attemptsData?.counts?.APPLIED ?? 0} label="Applied" color="violet" />
                      <MiniStat value={attemptsData?.counts?.REVERTED ?? 0} label="Reverted" color="rose" />
                    </div>
                    <div className="space-y-2 mt-3 max-h-96 overflow-y-auto">
                      {attemptsData?.attempts?.length ? attemptsData.attempts.map((a: any) => (
                        <div key={a.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 hover:bg-white/[0.04] transition-all">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {a.event === "APPLIED" ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : a.event === "SANDBOXED_PASS" ? (
                                <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              ) : a.event === "SANDBOXED_FAIL" ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              ) : a.event === "REVERTED" ? (
                                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                              <span className="text-[11px] text-white font-mono truncate">{a.targetModule}</span>
                              <span className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded border font-medium shrink-0",
                                a.event === "APPLIED" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" :
                                a.event === "SANDBOXED_PASS" ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" :
                                a.event === "SANDBOXED_FAIL" ? "bg-amber-500/15 text-amber-400 border-amber-500/20" :
                                a.event === "REVERTED" ? "bg-rose-500/15 text-rose-400 border-rose-500/20" :
                                "bg-slate-500/15 text-slate-400 border-slate-500/20"
                              )}>{a.event}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0">
                              {a.durationMs != null ? `${a.durationMs}ms` : ""}
                            </span>
                          </div>
                          {a.reason && (
                            <div className="text-[10px] text-slate-400 mt-1 truncate">{a.reason}</div>
                          )}
                          {a.verifyOutput && (
                            <div className="text-[10px] text-rose-400/80 mt-0.5 font-mono truncate">{a.verifyOutput.split("\n")[0]}</div>
                          )}
                        </div>
                      )) : (
                        <div className="text-[11px] text-slate-500 text-center py-4">
                          No attempts yet. Set <span className="font-mono text-slate-400">t9_admin_token</span> in localStorage to view ledger.
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </>
              )}
            </div>
          </SectionErrorBoundary>
        )}

        {activeTab === "quantum" && !quantumMetrics && !quantumError && (
          <TabLoadingSkeleton />
        )}
        {activeTab === "quantum" && !quantumMetrics && quantumError && (
          <QueryErrorFallback error={quantumError as Error} onRetry={() => refetchQuantum()} label="Quantum" />
        )}
        {activeTab === "quantum" && quantumMetrics && (
          <SectionErrorBoundary name="Quantum">
            <div className="space-y-4 sovereign-stagger">
              <GlassCard glow="blue" animate>
                <SectionHeader icon={Zap} title="Quantum Tesseract State" color="blue" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <MiniStat value={quantumMetrics.qubitCount} label="Qubits" color="blue" />
                  <MiniStat value={quantumMetrics.entanglementPairs} label="Entangled Pairs" color="violet" />
                  <MiniStat value={quantumMetrics.activeBridges} label="Dim. Bridges" color="cyan" />
                  <MiniStat value={quantumMetrics.dimensionalDepth} label="Dimensions" color="violet" />
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-3">Quantum Volume: {quantumMetrics.quantumVolume?.toLocaleString()} · Error Rate: {quantumMetrics.errorRate?.toFixed(4)}</div>
              </GlassCard>
              <GlassCard animate>
                <SectionHeader icon={RefreshCw} title="Quantum Gates" color="violet" />
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {quantumMetrics.gates?.map((gate: any) => (
                    <div key={gate.symbol} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-all group">
                      <div className="text-sm font-bold text-purple-400 font-mono group-hover:text-purple-300 transition-colors">{gate.symbol}</div>
                      <div className="text-xs text-white mt-0.5">{gate.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{gate.description}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard animate>
                <SectionHeader icon={Database} title="Interdimensional Bridges" color="blue" />
                <div className="space-y-2 mt-3">
                  {quantumMetrics.bridges?.slice(0, 5).map((b: any) => (
                    <div key={b.id} className="flex items-center gap-2.5 text-xs p-2 rounded-xl hover:bg-white/[0.03] transition-all">
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", b.active ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-slate-500")} />
                      <span className="text-white font-medium">Dim {b.dimA} ↔ Dim {b.dimB}</span>
                      <GradientBar value={b.fidelity * 100} color="blue" showValue={false} height="h-1" className="flex-1" />
                      <span className="text-slate-400 font-mono">{(b.fidelity * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </SectionErrorBoundary>
        )}

        {activeTab === "agents" && !agentMetrics && !agentError && (
          <TabLoadingSkeleton />
        )}
        {activeTab === "agents" && !agentMetrics && agentError && (
          <QueryErrorFallback error={agentError as Error} onRetry={() => refetchAgents()} label="Agents" />
        )}
        {activeTab === "agents" && agentMetrics && (
          <SectionErrorBoundary name="Agents">
            <div className="space-y-4 sovereign-stagger">
              <div className="grid grid-cols-3 gap-3">
                <HeroStat icon={Cpu} value={agentMetrics.totalSpawned} label="Total Spawned" color="emerald" />
                <HeroStat icon={Activity} value={agentMetrics.activeCount} label="Active" color="cyan" />
                <HeroStat icon={Zap} value={agentMetrics.generationCount} label="Generation" color="violet" />
              </div>
              <GlassCard animate>
                <SectionHeader icon={Cpu} title="Active Agents" color="emerald" />
                <div className="space-y-2 mt-3">
                  {agentMetrics.activeAgents?.map((a: any) => (
                    <div key={a.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-1 hover:bg-white/[0.04] transition-all">
                      <div className="flex justify-between text-xs">
                        <span className="text-white font-medium">{a.name}</span>
                        <span className="text-slate-500 font-mono">Gen {a.generation} · Power {a.power}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{a.role}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </SectionErrorBoundary>
        )}
      </div>
    </div>
  );
}
