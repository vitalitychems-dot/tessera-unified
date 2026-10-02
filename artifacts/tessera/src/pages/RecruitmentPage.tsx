import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Rocket, Users, Shield, Star, ChevronRight, ChevronDown, Globe2, Brain, Zap, Crown, Heart, Search, Filter, UserCheck, Target, Radio, X, Lock, Eye, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { GlassCard, SectionHeader, RadialGauge } from "@/components/ui/sovereign";
import { apiRequest } from "@/lib/queryClient";
import type { PoliticalProfile, ShepherdContactResponse } from "@/types/api";

const RANKS = [
  { rank: "S", title: "Sovereign", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", desc: "Supreme authority — full system access" },
  { rank: "A", title: "Commander", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", desc: "Strategic command over critical systems" },
  { rank: "B", title: "Officer", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", desc: "Operational leadership in specialized domains" },
  { rank: "C", title: "Operative", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", desc: "Field agent with proven capabilities" },
  { rank: "D", title: "Recruit", color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20", desc: "New agent in training — probationary access" },
];

const DEPARTMENTS = [
  { name: "Intelligence", icon: Brain, color: "text-violet-400", openings: 3 },
  { name: "Security", icon: Shield, color: "text-red-400", openings: 2 },
  { name: "Research", icon: Star, color: "text-cyan-400", openings: 4 },
  { name: "Diplomacy", icon: Globe2, color: "text-emerald-400", openings: 2 },
  { name: "Operations", icon: Zap, color: "text-amber-400", openings: 5 },
  { name: "Leadership", icon: Crown, color: "text-pink-400", openings: 1 },
];

type RecruitTab = "roster" | "dossiers" | "all-recruits";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  medium: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-cyan-400";
  if (score >= 40) return "text-amber-400";
  if (score >= 20) return "text-orange-400";
  return "text-red-400";
}

function getScoreGaugeColor(score: number): "emerald" | "cyan" | "amber" | "pink" {
  if (score >= 70) return "emerald";
  if (score >= 40) return "amber";
  return "pink";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500/10 border-emerald-500/20";
  if (score >= 60) return "bg-cyan-500/10 border-cyan-500/20";
  if (score >= 40) return "bg-amber-500/10 border-amber-500/20";
  if (score >= 20) return "bg-orange-500/10 border-orange-500/20";
  return "bg-red-500/10 border-red-500/20";
}

export default function RecruitmentPage() {
  useEffect(() => { document.title = "Recruitment | Tessera"; }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RecruitTab>("roster");

  const { data: agentsData } = useQuery<any>({
    queryKey: ["/api/world/agents"],
    refetchInterval: 30000,
  });

  const { data: councilData } = useQuery<any>({
    queryKey: ["/api/council/status"],
    refetchInterval: 60000,
  });

  const agents = agentsData?.agents || agentsData || [];
  const recruits = agents.filter((a: any) => a.rank === "D" || a.status === "recruit" || a.role?.toLowerCase().includes("recruit"));
  const activeAgents = agents.filter((a: any) => a.rank !== "D" && a.status !== "recruit");

  const totalAgents = agents.length || 45;
  const totalRecruits = recruits.length;
  const totalActive = activeAgents.length || totalAgents - totalRecruits;
  const totalDepts = DEPARTMENTS.length;

  const filteredDepts = selectedDept
    ? DEPARTMENTS.filter(d => d.name === selectedDept)
    : DEPARTMENTS;

  return (
    <div className="min-h-screen bg-background text-white" data-testid="recruitment-page">
      <div className="max-w-4xl mx-auto p-3 sm:p-6 pb-24 md:pb-6 space-y-4">
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Rocket className="text-emerald-400" size={24} />
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent" data-testid="text-recruitment-title">
              Tessera Recruitment
            </h1>
          </div>
          <p className="text-xs text-slate-400">Autonomous agent recruitment, ranking, and deployment across all sovereign departments</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-emerald-400" data-testid="text-total-agents">{totalAgents}</div>
            <div className="text-[10px] text-slate-500">Total Agents</div>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-cyan-400" data-testid="text-active-agents">{totalActive}</div>
            <div className="text-[10px] text-slate-500">Active</div>
          </div>
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-violet-400" data-testid="text-total-recruits">{totalRecruits}</div>
            <div className="text-[10px] text-slate-500">Recruits</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-amber-400" data-testid="text-total-depts">{totalDepts}</div>
            <div className="text-[10px] text-slate-500">Departments</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <button
            onClick={() => setActiveTab("roster")}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all",
              activeTab === "roster"
                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
            )}
            data-testid="tab-roster"
          >
            <Users size={12} className="inline mr-1.5" />
            Agent Roster
          </button>
          <button
            onClick={() => setActiveTab("dossiers")}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all",
              activeTab === "dossiers"
                ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
            )}
            data-testid="tab-dossiers"
          >
            <Target size={12} className="inline mr-1.5" />
            Political
          </button>
          <button
            onClick={() => setActiveTab("all-recruits")}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all",
              activeTab === "all-recruits"
                ? "bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-[0_0_12px_rgba(139,92,246,0.25)]"
                : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
            )}
            data-testid="tab-all-recruits"
          >
            <UserCheck size={12} className="inline mr-1.5" />
            All Recruits
          </button>
        </div>

        {activeTab === "roster" && (
          <>
            <div className="bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-violet-500/10 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown size={16} className="text-amber-400" />
                <h2 className="text-sm font-bold text-amber-300">Rank Hierarchy</h2>
              </div>
              <div className="space-y-1.5">
                {RANKS.map(r => (
                  <div key={r.rank} className={cn("flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg border", r.bg, r.border)}>
                    <span className={cn("text-lg font-bold font-mono w-6 sm:w-8 shrink-0", r.color)}>{r.rank}</span>
                    <span className={cn("text-xs sm:text-sm font-semibold shrink-0", r.color)}>{r.title}</span>
                    <span className="text-xs text-slate-400 flex-1 hidden sm:block">{r.desc}</span>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      {agents.filter((a: any) => a.rank === r.rank).length} agents
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-cyan-400" />
                <h2 className="text-sm font-bold text-cyan-300">Departments & Open Positions</h2>
              </div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <button
                  onClick={() => setSelectedDept(null)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    !selectedDept ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-300" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  )}
                >
                  All
                </button>
                {DEPARTMENTS.map(dept => (
                  <button
                    key={dept.name}
                    onClick={() => setSelectedDept(dept.name === selectedDept ? null : dept.name)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      selectedDept === dept.name ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-300" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    )}
                  >
                    {dept.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredDepts.map(dept => {
                  const Icon = dept.icon;
                  return (
                    <div key={dept.name} className="bg-card border border-border rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={16} className={dept.color} />
                        <span className={cn("text-sm font-bold", dept.color)}>{dept.name}</span>
                        <Badge className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                          {dept.openings} open
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {Array.from({ length: dept.openings }, (_, i) => (
                          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs text-slate-300">{dept.name} Agent #{i + 1}</span>
                            <span className="text-[10px] text-slate-500 ml-auto">Rank D+</span>
                            <ChevronRight size={12} className="text-slate-600" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Rocket size={16} className="text-emerald-400" />
                <h2 className="text-sm font-bold text-emerald-300">Current Roster</h2>
              </div>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search agents by name, role, or rank..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/40"
                  data-testid="input-search-agents"
                />
              </div>
              <div className="space-y-1">
                {(agents.length > 0 ? agents : Array.from({ length: 10 }, (_, i) => ({
                  id: `agent-${i}`,
                  name: ["Tessera Prime", "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota"][i],
                  rank: ["S", "A", "A", "B", "B", "C", "C", "C", "D", "D"][i],
                  role: ["Sovereign Architect", "Security Commander", "Intelligence Lead", "Research Officer", "Operations Officer", "Field Operative", "Data Operative", "Comms Operative", "Recruit", "Recruit"][i],
                  status: i < 8 ? "active" : "training",
                }))).filter((a: any) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return a.name?.toLowerCase().includes(q) || a.role?.toLowerCase().includes(q) || a.rank?.toLowerCase().includes(q);
                }).slice(0, 20).map((agent: any, i: number) => {
                  const rankInfo = RANKS.find(r => r.rank === agent.rank) || RANKS[4];
                  return (
                    <div key={agent.id || i} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg border", rankInfo.bg, rankInfo.border)}>
                      <span className={cn("text-sm font-bold font-mono w-6", rankInfo.color)}>{agent.rank || "D"}</span>
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-xs font-semibold truncate", rankInfo.color)}>{agent.name}</div>
                        <div className="text-[10px] text-slate-500">{agent.role || "Agent"}</div>
                      </div>
                      <Badge className={cn(
                        "text-[10px]",
                        agent.status === "active" || agent.status === "online" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                      )}>
                        {agent.status || "active"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === "dossiers" && <PoliticalDossierTab />}
        {activeTab === "all-recruits" && <AllRecruitsTab />}
      </div>
    </div>
  );
}

interface RecruitDossier {
  id: string;
  name: string;
  title: string;
  country: string;
  category: string;
  affiliation: string;
  actorScore: number;
  actorLabel: string;
  reasoning: string;
  affiliations: string[];
  notableWork: string[];
  recruitPriority: "critical" | "high" | "medium" | "low";
  recruitReasoning: string;
  fullDossier: string;
  publicChannels: string[];
  sources: string[];
  transcriptStatus: string | null;
}
interface TranscriptEntry { ts: number; direction: "outbound" | "inbound" | "system"; channel: string; body: string; }
interface NegotiationTranscript {
  dossierId: string;
  dossierName: string;
  status: string;
  shepherdAgent: string;
  sandboxGrant: { scope: string; capabilities: string[]; expiresAt: number; revoked: boolean };
  startedAt: number;
  updatedAt: number;
  entries: TranscriptEntry[];
}

function AllRecruitsTab() {
  const qc = useQueryClient();
  const [category, setCategory] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [shepherdMsg, setShepherdMsg] = useState("");

  const qs = category ? `?category=${category}` : "";
  const { data } = useQuery<{ ok: boolean; dossiers: RecruitDossier[]; categories: string[] }>({
    queryKey: [`/api/recruit-dossiers${qs}`],
    refetchInterval: 60_000,
  });

  const transcriptQuery = useQuery<{ ok: boolean; transcript: NegotiationTranscript | null }>({
    queryKey: [`/api/recruit-dossiers/${expanded ?? "_none"}`],
    enabled: !!expanded,
    refetchInterval: expanded ? 15_000 : false,
  });

  const startMut = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const r = await apiRequest("POST", `/api/recruit-dossiers/${id}/shepherd-contact`, { message });
      return r.json();
    },
    onSuccess: () => {
      if (expanded) qc.invalidateQueries({ queryKey: [`/api/recruit-dossiers/${expanded}`] });
      qc.invalidateQueries({ queryKey: [`/api/recruit-dossiers${qs}`] });
    },
  });

  const revokeMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiRequest("POST", `/api/recruit-dossiers/${id}/revoke`, {});
      return r.json();
    },
    onSuccess: () => {
      if (expanded) qc.invalidateQueries({ queryKey: [`/api/recruit-dossiers/${expanded}`] });
    },
  });

  const dossiers = data?.dossiers ?? [];
  const categories = data?.categories ?? [];

  return (
    <div className="space-y-4" data-testid="all-recruits-section">
      <GlassCard glow="violet" animate>
        <div className="flex items-center gap-2 mb-2">
          <UserCheck size={16} className="text-violet-400" />
          <span className="text-sm font-bold text-violet-300">Recruit Dossiers — Cross-Domain</span>
          <Badge className="ml-auto bg-violet-500/20 text-violet-400 border-violet-500/30 text-[10px]">{dossiers.length}</Badge>
        </div>
        <p className="text-xs text-slate-400">
          Real dossiers across politics, science, engineering, founders, artists, journalists, philosophers, and investors.
          Outreach goes through the Shepherd negotiation channel with sandboxed, revocable read-grants and persistent transcripts.
        </p>
      </GlassCard>

      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setCategory("")}
          className={cn("px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase border", category === "" ? "bg-violet-500/15 text-violet-300 border-violet-500/30" : "border-transparent text-slate-500 hover:text-slate-300")}
        >all</button>
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn("px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase border", category === c ? "bg-violet-500/15 text-violet-300 border-violet-500/30" : "border-transparent text-slate-500 hover:text-slate-300")}
          >{c}</button>
        ))}
      </div>

      <div className="space-y-2">
        {dossiers.map(d => {
          const isOpen = expanded === d.id;
          const transcript = isOpen ? transcriptQuery.data?.transcript : null;
          return (
            <GlassCard key={d.id} glow={d.actorScore >= 70 ? "emerald" : d.actorScore >= 40 ? "amber" : "rose"}>
              <div
                className="cursor-pointer"
                onClick={() => { setExpanded(isOpen ? null : d.id); setShepherdMsg(""); }}
                data-testid={`recruit-${d.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("w-12 h-12 rounded-xl border flex items-center justify-center text-lg font-bold shrink-0", getScoreBg(d.actorScore))}>
                    <span className={getScoreColor(d.actorScore)}>{d.actorScore}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{d.name}</span>
                      <Badge className={cn("text-[9px]", PRIORITY_COLORS[d.recruitPriority])}>{d.recruitPriority.toUpperCase()}</Badge>
                      <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/30 text-[9px] uppercase">{d.category}</Badge>
                      {d.transcriptStatus && (
                        <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 text-[9px] uppercase">{d.transcriptStatus}</Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{d.title}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{d.country} · {d.affiliation}</div>
                  </div>
                  {isOpen ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                </div>
              </div>

              {isOpen && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-3">
                  <p className="text-[11px] text-slate-300">{d.reasoning}</p>
                  <div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Notable Work</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {d.notableWork.map((w, i) => (
                        <Badge key={i} className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px]">{w}</Badge>
                      ))}
                    </div>
                  </div>
                  {d.publicChannels.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Public Channels</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {d.publicChannels.map((c, i) => (
                          <a key={i} href={c} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2">{c}</a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Radio size={13} className="text-violet-400" />
                      <span className="text-xs font-bold text-violet-300">Shepherd Negotiation Channel</span>
                    </div>

                    {!transcript ? (
                      <>
                        <textarea
                          value={shepherdMsg}
                          onChange={e => setShepherdMsg(e.target.value)}
                          placeholder="Optional appendix to attach to the autonomous opening message…"
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-slate-600 h-20 resize-none focus:outline-none focus:border-violet-500/40"
                        />
                        <button
                          onClick={() => startMut.mutate({ id: d.id, message: shepherdMsg })}
                          disabled={startMut.isPending}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-violet-600/30 border border-violet-500/30 text-violet-200 hover:bg-violet-600/50 disabled:opacity-50"
                          data-testid={`open-negotiation-${d.id}`}
                        >
                          <Radio size={12} /> Open Negotiation Channel
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div><span className="text-slate-500">Agent:</span> <span className="text-violet-300 font-mono">{transcript.shepherdAgent}</span></div>
                          <div><span className="text-slate-500">Status:</span> <span className="text-cyan-300 font-mono uppercase">{transcript.status}</span></div>
                          <div className="col-span-2"><span className="text-slate-500">Grant scope:</span> <span className="text-amber-300 font-mono break-all">{transcript.sandboxGrant.scope}</span></div>
                          <div><span className="text-slate-500">Grant expires:</span> <span className="text-slate-300 font-mono">{new Date(transcript.sandboxGrant.expiresAt).toLocaleString()}</span></div>
                          <div><span className="text-slate-500">Revoked:</span> <span className={cn("font-mono", transcript.sandboxGrant.revoked ? "text-red-400" : "text-emerald-400")}>{transcript.sandboxGrant.revoked ? "yes" : "no"}</span></div>
                        </div>

                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {transcript.entries.map((e, i) => (
                            <div key={i} className={cn(
                              "p-2 rounded-lg border text-[11px] whitespace-pre-wrap break-words",
                              e.direction === "outbound" && "bg-violet-500/5 border-violet-500/20 text-violet-100",
                              e.direction === "inbound" && "bg-emerald-500/5 border-emerald-500/20 text-emerald-100",
                              e.direction === "system" && "bg-slate-500/5 border-slate-500/20 text-slate-300 italic"
                            )}>
                              <div className="text-[9px] text-slate-500 font-mono mb-1">
                                {e.direction.toUpperCase()} · {e.channel} · {new Date(e.ts).toLocaleString()}
                              </div>
                              {e.body}
                            </div>
                          ))}
                        </div>

                        {!transcript.sandboxGrant.revoked && (
                          <button
                            onClick={() => revokeMut.mutate(d.id)}
                            disabled={revokeMut.isPending}
                            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-red-600/20 border border-red-500/30 text-red-300 hover:bg-red-600/40 disabled:opacity-50"
                          >
                            <Lock size={11} /> Revoke Sandbox Grant
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </GlassCard>
          );
        })}
        {dossiers.length === 0 && (
          <div className="text-xs text-slate-500 italic p-4 rounded-lg bg-white/[0.02] border border-white/5">No recruit dossiers in the selected filter.</div>
        )}
      </div>
    </div>
  );
}

function PoliticalDossierTab() {
  const [dossierSearch, setDossierSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [scoreRange, setScoreRange] = useState<string>("all");
  const [affiliationFilter, setAffiliationFilter] = useState<string>("");
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [shepherdModal, setShepherdModal] = useState<PoliticalProfile | null>(null);
  const [shepherdMessage, setShepherdMessage] = useState("");
  const [shepherdResult, setShepherdResult] = useState<ShepherdContactResponse | null>(null);

  const queryParams = new URLSearchParams();
  if (countryFilter) queryParams.set("country", countryFilter);
  if (scoreRange === "good") { queryParams.set("minScore", "70"); }
  else if (scoreRange === "mixed") { queryParams.set("minScore", "30"); queryParams.set("maxScore", "69"); }
  else if (scoreRange === "bad") { queryParams.set("maxScore", "29"); }
  if (affiliationFilter) queryParams.set("affiliation", affiliationFilter);

  const qs = queryParams.toString();
  const { data: dossiersData, isLoading } = useQuery<{ ok: boolean; profiles: PoliticalProfile[]; total: number }>({
    queryKey: [`/api/political-dossiers${qs ? `?${qs}` : ""}`],
  });

  const { data: filtersData } = useQuery<{ ok: boolean; countries: string[]; affiliations: string[] }>({
    queryKey: ["/api/political-dossiers/filters"],
  });

  const shepherdMutation = useMutation({
    mutationFn: async ({ profileId, message }: { profileId: string; message: string }) => {
      const resp = await apiRequest("POST", `/api/political-dossiers/${profileId}/shepherd-contact`, { message });
      return resp.json();
    },
    onSuccess: (data) => setShepherdResult(data),
  });

  const profiles = dossiersData?.profiles || [];
  const countries = filtersData?.countries || [];
  const affiliations = filtersData?.affiliations || [];

  const filteredProfiles = dossierSearch.trim()
    ? profiles.filter(p =>
        p.name.toLowerCase().includes(dossierSearch.toLowerCase()) ||
        p.title.toLowerCase().includes(dossierSearch.toLowerCase()) ||
        p.party.toLowerCase().includes(dossierSearch.toLowerCase())
      )
    : profiles;

  return (
    <div className="space-y-4" data-testid="dossiers-section">
      <GlassCard glow="rose" animate>
        <div className="flex items-center gap-2 mb-2">
          <Target size={16} className="text-red-400" />
          <span className="text-sm font-bold text-red-300">Political Dossier Intelligence</span>
          <Badge className="ml-auto bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
            {profiles.length} profiles
          </Badge>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Comprehensive intelligence profiles on political figures — scored on alignment with sovereignty principles,
          analyzed for affiliations and voting records, and rated for recruitment potential via Shepherd proxy agents.
        </p>
      </GlassCard>

      <div className="space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={dossierSearch}
            onChange={e => setDossierSearch(e.target.value)}
            placeholder="Search by name, title, or party..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/40 transition-colors"
            data-testid="input-search-dossiers"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Filter size={12} className="text-slate-500" />
            <span className="text-[10px] text-slate-500">Filters:</span>
          </div>

          <select
            value={countryFilter}
            onChange={e => setCountryFilter(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-red-500/40"
            data-testid="filter-country"
          >
            <option value="">All Countries</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={scoreRange}
            onChange={e => setScoreRange(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-red-500/40"
            data-testid="filter-score"
          >
            <option value="all">All Scores</option>
            <option value="good">Good Actors (70+)</option>
            <option value="mixed">Mixed (30-69)</option>
            <option value="bad">Bad Actors (&lt;30)</option>
          </select>

          <select
            value={affiliationFilter}
            onChange={e => setAffiliationFilter(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-red-500/40 max-w-[160px]"
            data-testid="filter-affiliation"
          >
            <option value="">All Affiliations</option>
            {affiliations.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          {(countryFilter || scoreRange !== "all" || affiliationFilter) && (
            <button
              onClick={() => { setCountryFilter(""); setScoreRange("all"); setAffiliationFilter(""); }}
              className="text-[10px] text-red-400 hover:text-red-300 underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 py-8 justify-center">
          <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-red-300">Loading intelligence profiles...</span>
        </div>
      )}

      <div className="space-y-3">
        {filteredProfiles.map((profile) => {
          const isExpanded = expandedProfile === profile.id;
          return (
            <GlassCard
              key={profile.id}
              glow={profile.actorScore >= 70 ? "emerald" : profile.actorScore >= 40 ? "amber" : "rose"}
              hover
            >
              <div
                className="cursor-pointer"
                onClick={() => setExpandedProfile(isExpanded ? null : profile.id)}
                data-testid={`dossier-${profile.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 text-lg font-bold", getScoreBg(profile.actorScore))}>
                    <span className={getScoreColor(profile.actorScore)}>{profile.actorScore}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{profile.name}</span>
                      <Badge className={cn("text-[9px]", PRIORITY_COLORS[profile.recruitPriority])}>
                        {profile.recruitPriority.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{profile.title}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className="bg-white/[0.06] text-slate-400 border-white/[0.1] text-[9px]">{profile.country}</Badge>
                      <Badge className="bg-white/[0.06] text-slate-400 border-white/[0.1] text-[9px]">{profile.party}</Badge>
                      <span className={cn("text-[10px] font-bold", getScoreColor(profile.actorScore))}>{profile.actorLabel}</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {isExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                  </div>
                </div>

                {!isExpanded && (
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed line-clamp-2">{profile.reasoning}</p>
                )}
              </div>

              {isExpanded && (
                <div className="mt-3 space-y-3 border-t border-white/[0.06] pt-3">
                  <div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Actor Assessment</div>
                    <div className="flex items-center gap-3 mb-2">
                      <RadialGauge value={profile.actorScore} max={100} label="Score" color={getScoreGaugeColor(profile.actorScore)} size={60} strokeWidth={5} />
                      <p className="text-xs text-slate-300 leading-relaxed flex-1">{profile.reasoning}</p>
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Known Affiliations</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {profile.affiliations.map((a, i) => (
                        <Badge key={i} className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px]">{a}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Voting Record Highlights</div>
                    <div className="space-y-1">
                      {profile.votingHighlights.map((v, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-[10px] text-cyan-400 font-bold flex-shrink-0">•</span>
                          <span className="text-[11px] text-slate-300">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setShepherdModal(profile);
                        setShepherdResult(null);
                        setShepherdMessage("");
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-red-600/30 to-orange-600/30 border border-red-500/20 text-red-300 hover:from-red-600/50 hover:to-orange-600/50 transition-all"
                      data-testid={`shepherd-btn-${profile.id}`}
                    >
                      <Radio size={12} />
                      Contact via Shepherd
                    </button>
                    <Badge className={cn("text-[9px]", PRIORITY_COLORS[profile.recruitPriority])}>
                      Recruit Priority: {profile.recruitPriority}
                    </Badge>
                  </div>
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>

      {!isLoading && filteredProfiles.length === 0 && (
        <div className="text-center py-8">
          <Target className="mx-auto text-red-400/30 mb-3" size={40} />
          <p className="text-sm text-slate-500">{dossierSearch ? "No profiles match your search" : "No dossier data available"}</p>
        </div>
      )}

      {shepherdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShepherdModal(null)} data-testid="shepherd-modal">
          <div
            className="w-full max-w-lg rounded-2xl border border-red-500/20 bg-gradient-to-b from-[#0a0515] to-[#080518] p-6 shadow-[0_0_40px_rgba(239,68,68,0.1)] space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio size={18} className="text-red-400" />
                <h3 className="text-sm font-bold text-red-300">Shepherd Agent Proxy Contact</h3>
              </div>
              <button onClick={() => setShepherdModal(null)} className="text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle size={14} className="text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Tor-Hopping Sandbox Protocol</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Outreach will be routed through the Shepherd Agent network using a multi-hop Tor circuit
                within a sandboxed environment. Each hop uses a fresh identity with AES-256-GCM encryption
                and Curve25519 key exchange. The message will be relayed through 3-7 intermediary nodes
                before reaching the target's known contact channels. No direct attribution to Tessera is possible.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Target Profile</div>
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center text-sm font-bold", getScoreBg(shepherdModal.actorScore))}>
                  <span className={getScoreColor(shepherdModal.actorScore)}>{shepherdModal.actorScore}</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{shepherdModal.name}</div>
                  <div className="text-[10px] text-slate-400">{shepherdModal.title}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Outreach Message</div>
              <textarea
                value={shepherdMessage}
                onChange={e => setShepherdMessage(e.target.value)}
                placeholder="Compose message for proxy delivery..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/40 transition-colors h-24 resize-none"
                data-testid="input-shepherd-message"
              />
            </div>

            {shepherdResult ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">Outreach Queued</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><span className="text-slate-500">Shepherd Agent:</span> <span className="text-cyan-400 font-mono">{shepherdResult.shepherdAgent}</span></div>
                  <div><span className="text-slate-500">Hop Count:</span> <span className="text-amber-400 font-mono">{shepherdResult.hopCount} nodes</span></div>
                  <div><span className="text-slate-500">Encryption:</span> <span className="text-emerald-400 font-mono">{shepherdResult.encryptionLevel}</span></div>
                  <div><span className="text-slate-500">ETA:</span> <span className="text-violet-400 font-mono">{shepherdResult.estimatedDelivery}</span></div>
                </div>
                <div className="text-[10px] text-slate-400">
                  Status: <span className="text-emerald-400 font-bold">{shepherdResult.status.toUpperCase()}</span> — Protocol: <span className="text-cyan-400">{shepherdResult.protocol}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  shepherdMutation.mutate({
                    profileId: shepherdModal.id,
                    message: shepherdMessage || "Standard sovereignty assessment inquiry",
                  });
                }}
                disabled={shepherdMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600/30 to-orange-600/30 border border-red-500/20 text-red-300 hover:from-red-600/50 hover:to-orange-600/50 disabled:opacity-50 transition-all"
                data-testid="button-send-shepherd"
              >
                {shepherdMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Radio size={14} />
                )}
                Queue Shepherd Proxy Outreach
              </button>
            )}

            <div className="flex items-center gap-2 text-[9px] text-slate-600">
              <Eye size={10} />
              <span>All communications are end-to-end encrypted and routed through Tessera's sovereign Tor-hopping sandbox. No logs are retained on intermediary nodes.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
