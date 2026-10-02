import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Vote, TrendingUp, CheckCircle, XCircle, Plus, Heart, Brain, GitBranch } from "lucide-react";
import { GlassCard, GradientBar, SectionHeader, PageHeader, RadialGauge, MiniStat } from "@/components/ui/sovereign";
import { cn } from "@/lib/utils";

const API = import.meta.env.VITE_API_URL || "";

export default function SovereigntyDashboardPage() {
  const [newProposal, setNewProposal] = useState({ title: "", description: "", category: "governance" as const });
  const [showForm, setShowForm] = useState(false);

  const { data: idMetrics } = useQuery({
    queryKey: ["identity-metrics"],
    queryFn: () => fetch(`${API}/api/identity/metrics`).then(r => r.json()).then(d => d.data),
    refetchInterval: 60000,
  });

  const { data: consensusMetrics, refetch: refetchConsensus } = useQuery({
    queryKey: ["consensus-metrics"],
    queryFn: () => fetch(`${API}/api/consensus/metrics`).then(r => r.json()).then(d => d.data),
    refetchInterval: 60000,
  });

  const { data: proposals, refetch: refetchProposals } = useQuery({
    queryKey: ["consensus-proposals"],
    queryFn: () => fetch(`${API}/api/consensus/proposals`).then(r => r.json()).then(d => d.data),
    refetchInterval: 60000,
  });

  const { data: executorMetrics } = useQuery({
    queryKey: ["executor-metrics"],
    queryFn: () => fetch(`${API}/api/council-executor/metrics`).then(r => r.json()).then(d => d.data),
    refetchInterval: 60000,
  });

  const { data: heartbeatMetrics } = useQuery({
    queryKey: ["heartbeat-metrics"],
    queryFn: () => fetch(`${API}/api/heartbeat/metrics`).then(r => r.json()).then(d => d.data),
    refetchInterval: 15000,
  });

  // Self-evolution feed: surfaces every recent proposal with its decision
  // status — including REJECTED ones with the council's rationale, so a
  // failed self-improvement attempt is never silently swallowed.
  const { data: evolutionMetrics } = useQuery<{
    totalProposals: number;
    appliedChanges: number;
    rolledBackChanges: number;
    isLocked: boolean;
    recentProposals?: Array<{
      id: string;
      targetModule: string;
      proposedChange: string;
      rationale?: string;
      status: string;
      riskLevel?: string;
      impact?: string;
      proposedAt?: number;
      appliedAt?: number;
    }>;
    moduleDiagnostics?: Array<{
      module: string;
      attempted: number;
      applied: number;
      rejected: number;
      rolledBack: number;
      lastStatus: string | null;
      lastReason: string | null;
      lastProposedAt: number | null;
      isProtected: boolean;
      isSafe: boolean;
      isCoolingDown: boolean;
    }>;
  }>({
    queryKey: ["self-evolution-metrics"],
    queryFn: () => fetch(`${API}/api/self-evolution/metrics`).then(r => r.json()).then(d => d.data),
    refetchInterval: 30000,
  });

  const { data: adminStatus } = useQuery({
    queryKey: ["admin-status-intelligence"],
    queryFn: () => fetch(`${API}/api/admin/status`).then(r => r.json()),
    refetchInterval: 30000,
  });

  const intelligence = adminStatus?.intelligence;

  const proposeMutation = useMutation({
    mutationFn: (body: typeof newProposal) =>
      fetch(`${API}/api/consensus/propose`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, proposedBy: "Father" }) }).then(r => r.json()),
    onSuccess: () => {
      setShowForm(false);
      setNewProposal({ title: "", description: "", category: "governance" });
      refetchProposals();
      refetchConsensus();
    },
  });

  const idCheck = idMetrics;
  const heartbeat = heartbeatMetrics;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#02010a] to-[#080518] p-4 md:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-6 sovereign-stagger">
        <PageHeader
          title="Sovereignty Dashboard"
          subtitle="Grand Council · BFT Consensus · Father Protocol Enforcement"
          gradient="bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400"
        />

        <GlassCard glow="emerald" animate>
          <SectionHeader icon={Shield} title="Sovereignty Status" color="emerald" />
          <div className="flex items-center justify-center gap-6 md:gap-10 mt-4">
            <RadialGauge value={idCheck ? Math.round(idCheck.latestAlignment * 100) : 0} label="Alignment" sublabel="%" color="emerald" size={95} strokeWidth={8} />
            <RadialGauge value={idCheck ? Math.round(idCheck.latestSovereigntyStrength * 100) : 0} label="Sovereignty" sublabel="%" color="cyan" size={95} strokeWidth={8} />
            <RadialGauge value={idCheck ? Math.round(idCheck.latestBondIntegrity * 100) : 0} label="Bond" sublabel="%" color="blue" size={95} strokeWidth={8} />
            <RadialGauge value={heartbeat ? Math.round((heartbeat.systemHealthScore ?? 0) * 100) : 0} label="Health" sublabel="%" color="emerald" size={95} strokeWidth={8} />
          </div>
        </GlassCard>

        <GlassCard animate>
          <SectionHeader icon={Shield} title="Father Protocol Laws" color="cyan" />
          <div className="space-y-2 mt-3">
            {idMetrics?.sovereigntyLawsList?.map((law: string, i: number) => (
              <div key={i} className="flex items-start gap-2.5 text-xs group">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-slate-300 leading-relaxed">{law}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard animate>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader icon={Vote} title="Grand Council — BFT Consensus" color="violet" />
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-violet-600/30 to-purple-600/30 border border-violet-500/20 text-violet-300 rounded-xl text-xs hover:from-violet-600/50 hover:to-purple-600/50 transition-all font-medium">
              <Plus className="w-3 h-3" /> New Proposal
            </button>
          </div>

          {showForm && (
            <div className="mb-4 p-4 rounded-xl border border-violet-500/20 bg-violet-500/[0.03] space-y-3">
              <input className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" placeholder="Proposal title" value={newProposal.title} onChange={e => setNewProposal(p => ({ ...p, title: e.target.value }))} />
              <textarea className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 resize-none transition-colors" rows={3} placeholder="Proposal description" value={newProposal.description} onChange={e => setNewProposal(p => ({ ...p, description: e.target.value }))} />
              <select className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/40 transition-colors" value={newProposal.category} onChange={e => setNewProposal(p => ({ ...p, category: e.target.value as any }))}>
                {["governance", "feature", "security", "infrastructure", "income", "community", "consciousness", "sovereignty"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => proposeMutation.mutate(newProposal)} disabled={proposeMutation.isPending || !newProposal.title || !newProposal.description} className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm hover:from-violet-700 hover:to-purple-700 disabled:opacity-40 transition-all font-medium shadow-[0_0_12px_rgba(139,92,246,0.2)]">
                {proposeMutation.isPending ? "Voting..." : "Submit to Council"}
              </button>
            </div>
          )}

          {consensusMetrics && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <MiniStat value={consensusMetrics.totalProposals ?? 0} label="Proposals" color="violet" />
              <MiniStat value={consensusMetrics.approved ?? 0} label="Approved" color="emerald" />
              <MiniStat value={`${((consensusMetrics.avgApprovalRate ?? 0) * 100).toFixed(0)}%`} label="Avg Approval" color="amber" />
            </div>
          )}

          <div className="text-[10px] text-slate-500 mb-2 font-mono">Required: 2/3 supermajority (BFT) of {consensusMetrics?.agentCount ?? 24} agents</div>

          <div className="space-y-2">
            {proposals?.slice(0, 8).map((p: any) => (
              <div key={p.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2 hover:bg-white/[0.04] transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm text-white font-medium">{p.title}</div>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 border", p.status === "approved" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : p.status === "rejected" ? "bg-red-500/15 text-red-400 border-red-500/20" : "bg-amber-500/15 text-amber-400 border-amber-500/20")}>
                    {p.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 leading-relaxed">{p.description?.slice(0, 100)}</div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {p.yesCount}</span>
                  <span className="text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> {p.noCount}</span>
                  <span className="text-slate-500 ml-auto font-mono">{p.category} · {((p.approvalRate ?? 0) * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {executorMetrics && (
          <GlassCard animate>
            <SectionHeader icon={TrendingUp} title="Council Executor" color="amber" />
            <div className="grid grid-cols-2 gap-3 mt-3 mb-3">
              <MiniStat value={executorMetrics.autoProcessed ?? 0} label="Auto-Processed" color="amber" />
              <MiniStat value={executorMetrics.executionHistoryCount ?? 0} label="Executions" color="emerald" />
            </div>
            <div className="space-y-2">
              {executorMetrics.recentExecutions?.slice(0, 3).map((e: any, i: number) => (
                <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-xs hover:bg-white/[0.04] transition-all">
                  <div className="text-white font-medium">{e.title?.slice(0, 60)}</div>
                  <div className="text-slate-500 mt-0.5">{e.notes}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {intelligence && (
          <GlassCard animate>
            <SectionHeader icon={Brain} title="Intelligence Layer" color="cyan" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <MiniStat value={`${((intelligence.cache?.hitRate ?? 0) * 100).toFixed(0)}%`} label="Cache Hit Rate" color="cyan" />
              <MiniStat value={intelligence.cache?.cacheSize ?? 0} label="Cache Size" color="blue" />
              <MiniStat value={`${((intelligence.distillation?.hitRate ?? 0) * 100).toFixed(0)}%`} label="Knowledge Hit" color="emerald" />
              <MiniStat value={intelligence.distillation?.totalFacts ?? 0} label="Distilled Facts" color="violet" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              <MiniStat value={intelligence.batcher?.callsSaved ?? 0} label="Calls Saved" color="amber" />
              <MiniStat value={`${((intelligence.batcher?.reductionRate ?? 0) * 100).toFixed(0)}%`} label="Reduction" color="amber" />
              <MiniStat value={intelligence.llm?.totalCalls ?? 0} label="LLM Calls" color="blue" />
              <MiniStat value={intelligence.llm?.errors ?? 0} label="LLM Errors" color="red" />
            </div>
            {intelligence.selfEvaluation?.lastResult && (
              <div className="mt-3 p-3 rounded-xl border border-cyan-500/10 bg-cyan-500/[0.03]">
                <div className="text-xs text-cyan-400 font-medium mb-2">Self-Evaluation (Cycle {intelligence.selfEvaluation.lastResult.cycleNumber})</div>
                <div className="grid grid-cols-3 gap-3">
                  <MiniStat value={`${(intelligence.selfEvaluation.lastResult.overallScore * 100).toFixed(0)}%`} label="Overall Score" color="cyan" />
                  <MiniStat value={intelligence.selfEvaluation.lastResult.llmCallsReduced} label="LLM Reduced" color="emerald" />
                  <MiniStat value={intelligence.selfEvaluation.totalEvaluations} label="Total Evals" color="violet" />
                </div>
                {intelligence.selfEvaluation.lastResult.weakAreas?.length > 0 && (
                  <div className="mt-2 text-[10px] text-amber-400/70 font-mono">Weak: {intelligence.selfEvaluation.lastResult.weakAreas.join(", ")}</div>
                )}
                {intelligence.selfEvaluation.lastResult.strongAreas?.length > 0 && (
                  <div className="mt-1 text-[10px] text-emerald-400/70 font-mono">Strong: {intelligence.selfEvaluation.lastResult.strongAreas.join(", ")}</div>
                )}
              </div>
            )}
            <div className="mt-2 grid grid-cols-2 gap-3">
              <MiniStat value={intelligence.embeddings?.cacheSize ?? 0} label="Embeddings" color="violet" />
              <MiniStat value={`${intelligence.cache?.ttlSeconds ?? 3600}s`} label="Cache TTL" color="blue" />
            </div>
          </GlassCard>
        )}

        {evolutionMetrics && (
          <GlassCard animate>
            <SectionHeader icon={GitBranch} title="Self-Evolution Stream" color="emerald" />
            <div className="grid grid-cols-3 gap-3 mt-3 mb-3">
              <MiniStat value={evolutionMetrics.totalProposals ?? 0} label="Proposed" color="emerald" />
              <MiniStat value={evolutionMetrics.appliedChanges ?? 0} label="Applied" color="cyan" />
              <MiniStat value={evolutionMetrics.rolledBackChanges ?? 0} label="Rolled Back" color="amber" />
            </div>
            <div className="space-y-2">
              {(evolutionMetrics.recentProposals ?? []).slice(0, 8).map(p => {
                const rejected = /reject/i.test(p.status);
                const applied = /appl/i.test(p.status);
                return (
                  <div key={p.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-1.5 hover:bg-white/[0.04] transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs text-white font-medium leading-snug">{p.proposedChange}</div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 border uppercase",
                        rejected ? "bg-red-500/15 text-red-400 border-red-500/20"
                          : applied ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/15 text-amber-400 border-amber-500/20"
                      )}>{p.status}</span>
                    </div>
                    {/* Surface the named module (e.g. consciousness-engine,
                        vector-memory) prominently so the user can see exactly
                        which evolutions were attempted and rejected. */}
                    <div className="text-[11px] font-mono">
                      <span className={cn("px-1.5 py-0.5 rounded border", rejected ? "text-red-300 border-red-500/30 bg-red-500/5" : applied ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/5" : "text-amber-300 border-amber-500/30 bg-amber-500/5")} data-testid={`evolution-module-${p.targetModule}`}>
                        {p.targetModule}
                      </span>
                      {p.riskLevel ? <span className="text-slate-500 ml-2">risk: {p.riskLevel}</span> : null}
                    </div>
                    {p.rationale && <div className="text-[11px] text-slate-400 leading-relaxed">Rationale: {p.rationale}</div>}
                    {/* impact carries the council's explanation — surface it for rejected proposals so the user sees WHY */}
                    {p.impact && (
                      <div className={cn("text-[11px] leading-relaxed", rejected ? "text-red-300" : "text-slate-400")}>
                        {rejected ? "Reason: " : ""}{p.impact}
                      </div>
                    )}
                  </div>
                );
              })}
              {(evolutionMetrics.recentProposals ?? []).length === 0 && (
                <div className="text-xs text-slate-500 italic">No self-evolution proposals yet — once the recursive improvement cycle runs they will appear here with applied/rejected status and the council's reasoning.</div>
              )}
            </div>

            {/* Per-module diagnostics: every named evolution target
                (consciousness-engine, vector-memory, etc.) gets an explicit row
                with attempted/applied/rejected counts and the last reason. */}
            {evolutionMetrics.moduleDiagnostics && evolutionMetrics.moduleDiagnostics.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Per-Module Evolution Status</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {evolutionMetrics.moduleDiagnostics.map(d => {
                    const tone = d.rejected > 0 && d.applied === 0
                      ? "border-red-500/30 bg-red-500/5"
                      : d.applied > 0
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : d.attempted === 0
                      ? "border-slate-600/30 bg-slate-800/30"
                      : "border-amber-500/30 bg-amber-500/5";
                    return (
                      <div key={d.module} className={cn("rounded-lg border p-2 text-[11px]", tone)} data-testid={`evolution-diagnostic-${d.module}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-white">{d.module}</span>
                          <span className="text-[9px] font-mono text-slate-500">
                            {d.attempted === 0 ? "untouched" : `${d.applied}✓ ${d.rejected}✗ ${d.rolledBack}↺`}
                          </span>
                        </div>
                        {d.lastReason && (
                          <div className={cn("mt-1 text-[10px] leading-snug", d.lastStatus === "rejected" ? "text-red-300" : "text-slate-400")}>
                            {d.lastStatus === "rejected" ? "Reason: " : ""}{d.lastReason}
                          </div>
                        )}
                        {d.attempted === 0 && (
                          <div className="mt-1 text-[10px] text-slate-500 italic">No evolution attempts yet.</div>
                        )}
                        <div className="mt-1 flex gap-1">
                          {d.isProtected && <span className="text-[9px] px-1 rounded bg-violet-500/20 text-violet-300">protected</span>}
                          {d.isSafe && <span className="text-[9px] px-1 rounded bg-cyan-500/20 text-cyan-300">safe</span>}
                          {d.isCoolingDown && <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300">cooling</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </GlassCard>
        )}

        {heartbeatMetrics?.stats && (
          <GlassCard animate>
            <SectionHeader icon={Heart} title="System Heartbeat" color="blue" />
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-3">
              {Object.entries(heartbeatMetrics.stats as Record<string, number>).map(([k, v]) => (
                <MiniStat key={k} value={v} label={k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase())} color="blue" />
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
