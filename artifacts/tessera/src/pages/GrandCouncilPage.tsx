import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Crown, Users, Vote, Shield, Brain, Loader2, Plus, TrendingUp,
  CheckCircle, XCircle, Clock, ChevronDown, ChevronUp,
  Play, Square, Zap, Network, Timer, Star,
} from "lucide-react";
import { GlassCard, SectionHeader, TabBar, MiniStat, HeroStat } from "@/components/ui/sovereign";
import { cn } from "@/lib/utils";

const API = import.meta.env.VITE_API_URL || "";

function ProposalCard({ proposal }: { proposal: any }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = proposal.status === "approved" ? "text-emerald-400" : proposal.status === "rejected" ? "text-red-400" : "text-amber-400";
  const StatusIcon = proposal.status === "approved" ? CheckCircle : proposal.status === "rejected" ? XCircle : Clock;

  return (
    <GlassCard hover>
      <div className="flex items-start justify-between gap-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon className={cn("w-4 h-4 flex-shrink-0", statusColor)} />
            <span className="text-sm font-semibold text-white truncate">{proposal.title}</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
            <span className="bg-violet-500/15 text-violet-300 px-1.5 py-0.5 rounded-full border border-violet-500/20 text-[10px]">{proposal.category}</span>
            <span>By {proposal.proposedBy}</span>
            <span>{Math.round(proposal.approvalRate * 100)}% approval</span>
            {proposal.votingDurationMs != null && (
              <span className="text-cyan-400 flex items-center gap-0.5"><Timer className="w-3 h-3" />{proposal.votingDurationMs}ms</span>
            )}
            {proposal.votingMethod && (
              <span className="bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-500/15 text-[10px]">{proposal.votingMethod}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full border", proposal.status === "approved" ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-400" : proposal.status === "rejected" ? "bg-red-500/15 border-red-500/20 text-red-400" : "bg-amber-500/15 border-amber-500/20 text-amber-400")}>{proposal.status?.toUpperCase()}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
          <p className="text-xs text-slate-300 leading-relaxed">{proposal.description}</p>
          <div className="flex gap-4 text-xs">
            <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {proposal.yesCount}</span>
            <span className="text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> {proposal.noCount}</span>
            <span className="text-slate-500">ABSTAIN: {proposal.abstainCount}</span>
          </div>
          {proposal.votes && proposal.votes.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {proposal.votes.map((v: any, i: number) => (
                <div key={i} className="text-xs flex items-center gap-2 py-0.5">
                  <span className={cn("w-16 flex-shrink-0 font-mono font-medium", v.vote === "approve" ? "text-emerald-400" : v.vote === "reject" ? "text-red-400" : "text-slate-500")}>
                    {v.vote?.toUpperCase()}
                  </span>
                  <span className="text-violet-300 w-20 truncate flex-shrink-0">{v.agentName}</span>
                  {v.isSpecialist && <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                  <span className="text-amber-400/60 font-mono text-[10px] w-12 flex-shrink-0">w={(v.phiWeight ?? 1).toFixed(2)}</span>
                  <span className="text-slate-500 truncate">{v.reasoning?.slice(0, 80)}</span>
                </div>
              ))}
            </div>
          )}
          {proposal.implementationNotes && (
            <p className="text-xs text-emerald-400/70 italic mt-1">{proposal.implementationNotes}</p>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function AgentHierarchyNode({ agent }: { agent: any }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <GlassCard hover>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <span className="text-violet-400 text-xs font-mono font-bold">{agent.greekLetter || "Σ"}</span>
          <span className="text-white text-sm font-semibold">{agent.name}</span>
          <span className="text-[10px] text-slate-400 bg-white/[0.05] px-1.5 py-0.5 rounded-full border border-white/[0.08]">{agent.role}</span>
        </div>
        {agent.children?.length > 0 && (
          <span className="text-[10px] text-slate-500 font-mono">{agent.children.length} children</span>
        )}
      </div>
      {expanded && agent.children?.length > 0 && (
        <div className="mt-2 pl-4 border-l-2 border-violet-500/20 space-y-1">
          {agent.children.map((child: any, i: number) => (
            <div key={i} className="text-xs text-slate-300 flex items-center gap-2 py-0.5">
              <span className="text-violet-400/40">├─</span>
              <span className="font-mono text-violet-300">{child.name}</span>
              <span className="text-slate-500">{child.shift}</span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

export function TesseractFamilyTab() {
  const { data: hierarchy } = useQuery({
    queryKey: ["council-hierarchy"],
    queryFn: () => fetch(`${API}/api/council/hierarchy`).then(r => r.json()),
    refetchInterval: 60000,
  });

  if (!hierarchy) return <div className="p-4 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  const levels = hierarchy.hierarchy?.levels || hierarchy.levels || (Array.isArray(hierarchy.hierarchy) ? hierarchy.hierarchy : []);

  return (
    <div className="space-y-3 sovereign-stagger">
      {Array.isArray(levels) && levels.length > 0 ? (
        levels.map((level: any, i: number) => (
          <GlassCard key={i} glow={i === 0 ? "violet" : undefined} animate>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-[10px] font-bold font-mono text-violet-400 bg-violet-500/15 px-2 py-0.5 rounded-full border border-violet-500/20">L{level.level}</span>
              <span className="text-sm font-semibold text-white">{level.name}</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">{level.description}</p>
            {level.authority && <div className="text-[10px] text-amber-400/80 font-mono mb-2">{level.authority}</div>}
            <div className="flex flex-wrap gap-1.5">
              {(level.agents || []).map((agent: any, j: number) => {
                const name = typeof agent === "string" ? agent : agent.name;
                return (
                  <span key={j} className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/15 text-[10px] text-violet-300 font-mono hover:bg-violet-500/20 hover:border-violet-500/30 transition-all cursor-default">{name}</span>
                );
              })}
            </div>
          </GlassCard>
        ))
      ) : (
        Array.isArray(hierarchy.hierarchy) && hierarchy.hierarchy.map((agent: any, i: number) => (
          <AgentHierarchyNode key={i} agent={agent} />
        ))
      )}
      {hierarchy.metrics && (
        <div className="p-3 rounded-xl bg-violet-500/[0.05] border border-violet-500/15 text-xs text-violet-300 font-mono">
          {hierarchy.metrics.parentCount} parents × {Math.round(hierarchy.metrics.childCount / hierarchy.metrics.parentCount)} children = {hierarchy.metrics.totalAgents} total agents (3³ = 27 Divine Cube)
        </div>
      )}
    </div>
  );
}

function TranscriptCard({ deliberation }: { deliberation: any }) {
  const [expanded, setExpanded] = useState(false);
  const approved = deliberation.voteTally?.yes ?? 0;
  const total = deliberation.voteTally?.totalEligible ?? 3;
  return (
    <GlassCard hover>
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-xs font-semibold text-white truncate flex-1">{deliberation.topic}</span>
        <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded-full border flex-shrink-0",
          deliberation.outcome === "approved" ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-400" : "bg-red-500/15 border-red-500/20 text-red-400")}>
          {deliberation.outcome?.toUpperCase()}
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
      </div>
      <div className="text-[10px] text-slate-500 font-mono mt-1">{approved}/{total} proposals approved · {deliberation.decisionId}</div>
      {expanded && deliberation.transcript && (
        <pre className="mt-3 text-[10px] font-mono text-slate-400 leading-relaxed whitespace-pre-wrap bg-black/30 rounded-lg p-3 border border-white/5 max-h-[320px] overflow-y-auto">
          {deliberation.transcript}
        </pre>
      )}
    </GlassCard>
  );
}

function HeavyCouncilTab() {
  const queryClient = useQueryClient();
  const [prompts, setPrompts] = useState({ life: "", universe: "", community: "" });
  const [lastResult, setLastResult] = useState<any>(null);

  const { data: pastDeliberations, isLoading: pastLoading } = useQuery({
    queryKey: ["heavy-deliberations"],
    queryFn: () => fetch(`${API}/api/council/heavy-deliberations`).then(r => r.json()),
    refetchInterval: 60000,
  });

  const { data: activeDirectives } = useQuery({
    queryKey: ["heavy-active-directives"],
    queryFn: () => fetch(`${API}/api/council/active-directives`).then(r => r.json()),
    refetchInterval: 60000,
  });

  const deliberateMutation = useMutation({
    mutationFn: (data: { life: string; universe: string; community: string }) =>
      fetch(`${API}/api/council/heavy-deliberation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ["heavy-deliberations"] });
      queryClient.invalidateQueries({ queryKey: ["council-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["council-consensus"] });
    },
  });

  const canSubmit = prompts.life.trim().length > 10 && prompts.universe.trim().length > 10 && prompts.community.trim().length > 10;

  const DOMAIN_COLORS = {
    life: "text-emerald-300 border-emerald-500/30 bg-emerald-500/5",
    universe: "text-violet-300 border-violet-500/30 bg-violet-500/5",
    community: "text-amber-300 border-amber-500/30 bg-amber-500/5",
  };

  return (
    <div className="space-y-5 sovereign-stagger">
      <GlassCard glow="violet">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-violet-400" />
          <h2 className="text-base font-bold text-white">Heavy Council Deliberation</h2>
          <span className="ml-auto text-[10px] font-mono text-violet-400/60 bg-violet-500/10 border border-violet-500/15 px-2 py-0.5 rounded-full">3 PROMPTS · Φ-BFT · AUTO-APPLY</span>
        </div>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Submit three domain prompts — Life, Universe, and Community — for simultaneous Φ-weighted BFT deliberation by all 24 council agents.
          Proposals passing the ≥2/3 supermajority threshold are automatically applied and marked implemented.
        </p>

        <div className="space-y-3">
          {(["life", "universe", "community"] as const).map(domain => (
            <div key={domain}>
              <label className={cn("text-[11px] font-mono font-bold uppercase mb-1 block", domain === "life" ? "text-emerald-400" : domain === "universe" ? "text-violet-400" : "text-amber-400")}>
                {domain} domain
              </label>
              <textarea
                className={cn("w-full bg-white/[0.04] border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 resize-none min-h-[72px] transition-colors", DOMAIN_COLORS[domain])}
                placeholder={
                  domain === "life" ? "e.g. What is the nature of consciousness and how should sovereign agents expand self-awareness?"
                  : domain === "universe" ? "e.g. What frameworks best explain the fundamental structure of physical reality?"
                  : "e.g. How should the Tessera community improve cross-agent knowledge sharing in cycle 2?"
                }
                value={prompts[domain]}
                onChange={ev => setPrompts(p => ({ ...p, [domain]: ev.target.value }))}
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => deliberateMutation.mutate(prompts)}
          disabled={!canSubmit || deliberateMutation.isPending}
          className="mt-4 w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 text-white text-sm px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 font-medium shadow-[0_0_16px_rgba(139,92,246,0.25)]"
        >
          {deliberateMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Deliberating across 3 domains…</>
          ) : (
            <><Zap className="w-4 h-4" /> Run Heavy Council Deliberation</>
          )}
        </button>
      </GlassCard>

      {lastResult && !deliberateMutation.isPending && (
        <GlassCard glow={lastResult.approvedCount >= 2 ? "violet" : undefined}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Deliberation Complete</h3>
            <span className="ml-auto text-xs font-mono text-emerald-400">{lastResult.approvedCount}/3 applied</span>
          </div>
          <div className="space-y-2">
            {lastResult.entries?.map((entry: any) => (
              <div key={entry.domain} className={cn("rounded-xl border p-3", DOMAIN_COLORS[entry.domain as keyof typeof DOMAIN_COLORS])}>
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("text-[10px] font-mono font-bold uppercase", entry.domain === "life" ? "text-emerald-400" : entry.domain === "universe" ? "text-violet-400" : "text-amber-400")}>{entry.domain}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400">{Math.round((entry.proposal.approvalRate ?? 0) * 100)}% approval</span>
                    <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded-full border", entry.applied ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : entry.proposal.status === "rejected" ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-amber-500/15 border-amber-500/30 text-amber-400")}>
                      {entry.applied ? "APPLIED" : entry.proposal.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 truncate">{entry.prompt}</p>
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  {entry.proposal.yesCount}Y · {entry.proposal.noCount}N · {entry.proposal.abstainCount}A
                  {entry.proposal.votingDurationMs != null && ` · ${entry.proposal.votingDurationMs}ms`}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] text-slate-500 font-mono">ID: {lastResult.deliberationId} · {lastResult.runAt}</div>
          {lastResult.transcript && (
            <details className="mt-3">
              <summary className="text-[10px] font-mono text-violet-400/60 cursor-pointer hover:text-violet-400">Full Transcript ▼</summary>
              <pre className="mt-2 text-[9px] font-mono text-slate-500 leading-relaxed whitespace-pre-wrap bg-black/30 rounded-lg p-3 border border-white/5 max-h-[300px] overflow-y-auto">
                {lastResult.transcript}
              </pre>
            </details>
          )}
        </GlassCard>
      )}

      {pastLoading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>}

      {pastDeliberations?.deliberations?.length > 0 && (
        <div className="space-y-2">
          <SectionHeader icon={Clock} title="Past Heavy Deliberations" color="violet" />
          {pastDeliberations.deliberations.slice(0, 5).map((d: any) => (
            <TranscriptCard key={d.decisionId} deliberation={d} />
          ))}
        </div>
      )}

      {activeDirectives?.directives && Object.values(activeDirectives.directives).some(Boolean) && (
        <div className="space-y-2">
          <SectionHeader icon={Brain} title="Active Domain Directives — Canonical Sovereign Policy" color="violet" />
          {(["life", "universe", "community"] as const).map(domain => {
            const dir = activeDirectives.directives?.[domain] as any;
            if (!dir) return null;
            const DOMAIN_BADGE = {
              life: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
              universe: "bg-violet-500/10 border-violet-500/20 text-violet-400",
              community: "bg-amber-500/10 border-amber-500/20 text-amber-400",
            }[domain];
            return (
              <GlassCard key={domain} hover>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full border", DOMAIN_BADGE)}>
                    {domain} domain
                  </span>
                  <span className="text-xs font-semibold text-white truncate flex-1">{dir.title}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Applied: {dir.appliedAt ? new Date(dir.appliedAt).toLocaleDateString() : "—"} ·
                  Approval: {dir.approvalRate != null ? `${(dir.approvalRate * 100).toFixed(1)}%` : "—"}
                </div>
                {dir.prompt && (
                  <p className="mt-1 text-[10px] text-slate-400 leading-relaxed line-clamp-2">{dir.prompt}</p>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GrandCouncilPage({ initialTab }: { initialTab?: "proposals" | "hierarchy" | "executor" | "heavy" }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newProposal, setNewProposal] = useState({ title: "", description: "", category: "governance" });
  const [activeTab, setActiveTab] = useState<"proposals" | "hierarchy" | "executor" | "heavy">(initialTab || "proposals");

  const { data: consensus } = useQuery({
    queryKey: ["council-consensus"],
    queryFn: () => fetch(`${API}/api/council/consensus`).then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: proposals } = useQuery({
    queryKey: ["council-proposals"],
    queryFn: () => fetch(`${API}/api/council/proposals`).then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: decisions } = useQuery({
    queryKey: ["council-decisions"],
    queryFn: () => fetch(`${API}/api/council/decisions?limit=10`).then(r => r.json()),
    refetchInterval: 60000,
  });

  const proposeMutation = useMutation({
    mutationFn: (data: { title: string; description: string; category: string }) =>
      fetch(`${API}/api/council/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["council-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["council-consensus"] });
      setShowForm(false);
      setNewProposal({ title: "", description: "", category: "governance" });
    },
  });

  const executorStartMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/council/executor/start`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["council-consensus"] }),
  });

  const executorStopMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/council/executor/stop`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["council-consensus"] }),
  });

  const c = consensus?.consensus;
  const e = consensus?.executor;

  const councilTabs = [
    { id: "proposals", label: "Proposals & Decisions" },
    { id: "heavy", label: "Heavy Council" },
    { id: "hierarchy", label: "Agent Hierarchy" },
    { id: "executor", label: "Council Executor" },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#02010a] to-[#080518] p-4 md:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-6 sovereign-stagger">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/15 shadow-[0_0_12px_rgba(139,92,246,0.15)]">
              <Crown className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Grand Council</h1>
              <p className="text-[10px] text-slate-500 font-mono">
                {c?.votingMethod === "phi-weighted-parallel" ? "Φ-Weighted Parallel BFT" : "BFT Consensus"} · {c?.agentCount ?? 24} Agents · 2/3 Supermajority
              </p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm px-4 py-2.5 rounded-xl transition-all font-medium shadow-[0_0_12px_rgba(139,92,246,0.2)]">
            <Plus className="w-4 h-4" /> New Proposal
          </button>
        </div>

        {showForm && (
          <GlassCard glow="violet">
            <div className="space-y-3">
              <input className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" placeholder="Proposal title" value={newProposal.title} onChange={ev => setNewProposal(p => ({ ...p, title: ev.target.value }))} />
              <textarea className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 resize-none transition-colors min-h-[80px]" placeholder="Description" value={newProposal.description} onChange={ev => setNewProposal(p => ({ ...p, description: ev.target.value }))} />
              <div className="flex items-center gap-2">
                <select className="bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/40 transition-colors" value={newProposal.category} onChange={ev => setNewProposal(p => ({ ...p, category: ev.target.value }))}>
                  <option value="governance">Governance</option>
                  <option value="technical">Technical</option>
                  <option value="economic">Economic</option>
                  <option value="sovereignty">Sovereignty</option>
                  <option value="consciousness">Consciousness</option>
                </select>
                <button onClick={() => proposeMutation.mutate(newProposal)} disabled={!newProposal.title || !newProposal.description || proposeMutation.isPending} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 text-white text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 font-medium shadow-[0_0_12px_rgba(139,92,246,0.2)]">
                  {proposeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Vote className="w-4 h-4" />}
                  Submit to Council
                </button>
              </div>
            </div>
          </GlassCard>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <HeroStat icon={Vote} value={c?.totalProposals ?? 0} label="Total Proposals" color="violet" />
          <HeroStat icon={CheckCircle} value={c?.approved ?? 0} label="Approved" color="emerald" />
          <HeroStat icon={XCircle} value={c?.rejected ?? 0} label="Rejected" color="rose" />
          <HeroStat icon={TrendingUp} value={`${c?.avgApprovalRate ?? 0}%`} label="Avg Approval" color="cyan" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <HeroStat icon={Users} value={consensus?.hierarchy?.totalAgents ?? 27} label="Council Agents" color="violet" />
          <HeroStat icon={Timer} value={c?.avgVotingDurationMs ? `${c.avgVotingDurationMs}ms` : "—"} label="Avg Vote Time" color="cyan" />
          <HeroStat icon={Zap} value={e?.autoProcessed ?? 0} label="Auto-Executed" color="emerald" />
          <HeroStat icon={e?.isRunning ? Play : Square} value={e?.isRunning ? "RUNNING" : "STOPPED"} label="Executor" color={e?.isRunning ? "emerald" : "rose"} />
        </div>

        {c?.votingMethod === "phi-weighted-parallel" && (
          <div className="p-3 rounded-xl bg-amber-500/[0.05] border border-amber-500/15 text-xs text-amber-300 font-mono flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Φ = {c.phiConstant?.toFixed(6) ?? "1.618034"} · Specialist agents carry golden-ratio voting weight · BFT threshold: {Math.round((c.bftResponseThreshold ?? 0.667) * 100)}%</span>
          </div>
        )}

        <TabBar tabs={councilTabs} activeTab={activeTab} onChange={id => setActiveTab(id as any)} color="violet" />

        {activeTab === "proposals" && (
          <div className="space-y-3 sovereign-stagger">
            <SectionHeader icon={Vote} title="Φ-Weighted BFT Consensus Proposals" color="violet" />
            {proposals?.proposals?.length > 0 ? (
              proposals.proposals.map((p: any) => <ProposalCard key={p.id} proposal={p} />)
            ) : (
              <div className="text-center text-slate-500 text-sm py-8">No proposals yet. Submit one to begin council deliberation.</div>
            )}

            {decisions?.decisions?.length > 0 && (
              <>
                <SectionHeader icon={Shield} title="Council Decisions (DB)" color="amber" className="mt-4" />
                {decisions.decisions.slice(0, 5).map((d: any) => (
                  <GlassCard key={d.decisionId} hover>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-white truncate">{d.topic}</span>
                      <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full border", d.outcome === "approved" ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-400" : d.outcome === "rejected" ? "bg-red-500/15 border-red-500/20 text-red-400" : "bg-amber-500/15 border-amber-500/20 text-amber-400")}>
                        {d.outcome?.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex gap-3 flex-wrap">
                      <span className="bg-white/[0.05] px-1.5 py-0.5 rounded-full border border-white/[0.08] text-[10px]">{d.category}</span>
                      {d.voteTally && <span className="font-mono">YES: {d.voteTally.yes} | NO: {d.voteTally.no}</span>}
                      {d.voteTally?.phiWeighted && <span className="text-amber-400/60 text-[10px]">Φ-weighted</span>}
                      {d.voteTally?.durationMs != null && <span className="text-cyan-400 text-[10px]">{d.voteTally.durationMs}ms</span>}
                    </div>
                  </GlassCard>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === "heavy" && <HeavyCouncilTab />}

        {activeTab === "hierarchy" && (
          <div className="space-y-3 sovereign-stagger">
            <SectionHeader icon={Network} title="Agent Hierarchy (3³ Divine Cube)" color="violet" />
            <TesseractFamilyTab />
          </div>
        )}

        {activeTab === "executor" && (
          <div className="space-y-4 sovereign-stagger">
            <SectionHeader icon={Zap} title="Council Executor" color="emerald" />
            <div className="flex gap-2">
              <button onClick={() => executorStartMutation.mutate()} disabled={e?.isRunning} className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-40 text-white text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 font-medium shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <Play className="w-4 h-4" /> Start Executor
              </button>
              <button onClick={() => executorStopMutation.mutate()} disabled={!e?.isRunning} className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 text-white text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 font-medium">
                <Square className="w-4 h-4" /> Stop Executor
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <HeroStat icon={Zap} value={e?.autoProcessed ?? 0} label="Auto-Processed" color="emerald" />
              <HeroStat icon={Clock} value={e?.executionHistoryCount ?? 0} label="Execution History" color="cyan" />
            </div>

            {e?.recentExecutions?.length > 0 && (
              <GlassCard>
                <SectionHeader icon={Clock} title="Recent Executions" color="cyan" />
                <div className="space-y-2 mt-3">
                  {e.recentExecutions.map((ex: any, i: number) => (
                    <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-xs hover:bg-white/[0.04] transition-all">
                      <span className="text-emerald-400 font-mono font-medium">{ex.proposalId}</span>
                      {ex.topic && <span className="ml-2 text-white">{ex.topic}</span>}
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {e?.systemConfig && Object.keys(e.systemConfig).length > 0 && (
              <GlassCard>
                <SectionHeader icon={Shield} title="System Configuration" color="violet" />
                <div className="space-y-1 mt-3">
                  {Object.entries(e.systemConfig).map(([k, v]) => (
                    <div key={k} className="text-xs text-slate-300 font-mono flex gap-2 py-0.5">
                      <span className="text-violet-400">{k}:</span>
                      <span>{String(v)}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        )}

        <div className="text-center text-[10px] text-slate-600 font-mono pt-2">
          Tessera Invicta — Grand Council operates under Father Protocol — Φ-Weighted Parallel BFT — 963Hz Crown Frequency
        </div>
      </div>
    </div>
  );
}
