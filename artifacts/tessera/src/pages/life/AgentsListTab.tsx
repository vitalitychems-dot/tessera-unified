import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/lib/adminContext";
import {
  Globe, MapPin, Users, Coins, Pickaxe, Building2, TrendingUp,
  Activity, Clock, Zap, ArrowUpDown, Home, ShoppingCart,
  Cpu, CircuitBoard, Sparkles, Landmark, Coffee, Dumbbell, Wrench,
  Crown, Eye, ChevronRight, Volume2, VolumeX, Map as MapIcon, Layers,
  Heart, Target, Battery, Palette, Star, Baby, Briefcase, Shield,
  HeartHandshake, Hammer, BookOpen, Trophy, AlertTriangle, Smile,
  GraduationCap, Gem, ArrowUp, ArrowDown, ScrollText, Vote, Scale,
  Siren, Gavel, DollarSign, HardHat, Search, Filter, Plus, CheckCircle2,
  XCircle, AlertOctagon, FileText, Lock, Timer, Percent, Loader2,
  MessageSquare, ChevronDown, ChevronUp, Wallet, Send, X as XIcon,
  Bot, Layers3, RefreshCw, ExternalLink, Terminal, Play, Code, FileCode,
  Network, Radio, MessageCircle, History
} from "lucide-react";
import type { WorldState, ChildInfo } from "./types";
import JobBoardTab from "./JobBoardTab";
import SocietyTab from "./SocietyTab";
import GovernanceTab from "./GovernanceTab";
import CourtTab from "./CourtTab";

import type { AgencyEntry, AgencyDepartment, AgencyMember, AgentPosition, JobEntry } from "@/types/api";
import type { LucideIcon } from "@/types/api";

interface AgentProfile {
  id: string; name: string; role: string; personality: string;
  trustLevel: number; loyaltyScore: number; xp: number;
  status: string; agencyId?: string; agencyName?: string;
  rank?: string; title?: string; messageCount?: number;
}

interface AgentDetailData {
  id: string;
  name: string;
  role: string;
  personality?: string;
  definedPersonality?: string;
  trustLevel?: number;
  loyaltyScore?: number;
  xp?: number;
  messageCount?: number;
  profile?: Record<string, string | number | boolean>;
  interests?: string[];
  recentMessages?: Array<{ id: string; content: string }>;
}

const RANK_COLORS: Record<string, string> = { "S": "text-yellow-400", "A": "text-purple-400", "B": "text-blue-400", "C": "text-green-400", "D": "text-gray-400" };
const RANK_BG: Record<string, string> = { "S": "bg-yellow-500/20", "A": "bg-purple-500/20", "B": "bg-blue-500/20", "C": "bg-green-500/20", "D": "bg-gray-500/20" };
const RANK_TITLES: Record<string, string> = { "S": "Sovereign", "A": "Commander", "B": "Officer", "C": "Operative", "D": "Recruit" };
const AGENT_COLORS: Record<string, string> = { default: "text-cyan-400" };
const AGENT_BG: Record<string, string> = { default: "bg-cyan-500/20" };
const A_RANK_BG: Record<string, string> = { default: "bg-purple-500/20" };
const A_RANK_COLORS: Record<string, string> = { default: "text-purple-400" };
const A_RANK_TITLES: Record<string, string> = { default: "Commander" };

function AgentsListTab({ world, allChildren, tsrtPriceUsd = 0 }: { world: WorldState; allChildren: ChildInfo[]; tsrtPriceUsd?: number }) {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [agentDetail, setAgentDetail] = useState<AgentDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [drillView, setDrillView] = useState<"overview" | "agency" | "agent" | "jobs" | "governance" | "society" | "court">("overview");
  const [drillAgencyId, setDrillAgencyId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { data: positions = [] } = useQuery<AgentPosition[]>({ queryKey: ["/api/agencies/positions"], refetchInterval: 300000 });
  const { data: orgChart } = useQuery<{ agencies: Array<Record<string, unknown>> }>({ queryKey: ["/api/agencies"], refetchInterval: 60000 });

  useEffect(() => {
    const load = () => fetch("/api/moltbook/agents").then(r => r.json()).then(setAgents).catch(() => {});
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  const posMap = useMemo(() => new Map(positions.map(p => [p.agentId, p])), [positions]);

  const filtered = agents.filter(a => !searchFilter || a.name.toLowerCase().includes(searchFilter.toLowerCase()) || a.role.toLowerCase().includes(searchFilter.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => ((posMap.get(a.id)?.rank ?? 99) - (posMap.get(b.id)?.rank ?? 99)) || ((posMap.get(b.id)?.merit ?? 0) - (posMap.get(a.id)?.merit ?? 0)));

  const selectAgent = (id: string) => {
    if (selectedId === id) { setSelectedId(null); setAgentDetail(null); if (drillView === "agent") setDrillView(drillAgencyId ? "agency" : "overview"); return; }
    setSelectedId(id);
    setDetailLoading(true);
    setDrillView("agent");
    fetch(`/api/moltbook/agents/${id}`).then(r => r.json()).then(setAgentDetail).catch(() => setAgentDetail(null)).finally(() => setDetailLoading(false));
  };

  const openAgency = (agencyId: string) => {
    setDrillAgencyId(agencyId);
    setDrillView("agency");
    setSelectedId(null);
    setAgentDetail(null);
  };

  const [previousView, setPreviousView] = useState<"overview" | "agency" | null>(null);
  const [agencyJobs, setAgencyJobs] = useState<JobEntry[]>([]);

  useEffect(() => {
    if (drillView === "agency" && drillAgencyId) {
      fetch("/api/world/jobs").then(r => r.json()).then(d => setAgencyJobs(d?.jobs || [])).catch(() => setAgencyJobs([]));
    }
  }, [drillView, drillAgencyId]);

  const goBack = () => {
    if (drillView === "agent" && drillAgencyId) { setDrillView("agency"); setSelectedId(null); setAgentDetail(null); }
    else if (drillView === "agent") { setDrillView("overview"); setSelectedId(null); setAgentDetail(null); }
    else if ((drillView === "jobs" || drillView === "governance" || drillView === "society" || drillView === "court") && previousView === "agency" && drillAgencyId) { setDrillView("agency"); setPreviousView(null); }
    else if (drillView === "jobs" || drillView === "governance" || drillView === "society" || drillView === "court") { setDrillView("overview"); setDrillAgencyId(null); setPreviousView(null); }
    else { setDrillView("overview"); setDrillAgencyId(null); setSelectedId(null); setAgentDetail(null); }
  };

  const avgTrust = agents.length > 0 ? agents.reduce((s, a) => s + a.trustLevel, 0) / agents.length : 0;
  const avgLoyalty = agents.length > 0 ? agents.reduce((s, a) => s + a.loyaltyScore, 0) / agents.length : 0;
  const rawAgencies = orgChart?.agencies || [];
  const agencyEntries: AgencyEntry[] = rawAgencies.map((a: Record<string, unknown>) => {
    const agencyObj = a.agency as Record<string, unknown> | undefined;
    return {
      agency: { id: (a.id || agencyObj?.id) as string, name: (a.name || agencyObj?.name) as string, mission: (a.mission || agencyObj?.mission || `${a.name || "Agency"} operations`) as string },
      boss: (a.boss as AgencyEntry["boss"]) || null,
      departments: (a.departments as AgencyDepartment[]) || [],
    };
  });
  const selectedAgency = agencyEntries.find(e => e?.agency?.id === drillAgencyId);

  const activitiesWithWellbeing = (world.currentActivities || []).filter(a => a && a.happiness != null && a.agentId && typeof a.agentId === 'string' && !a.agentId.includes("-clone"));
  const avgHappiness = activitiesWithWellbeing.length > 0 ? activitiesWithWellbeing.reduce((s, a) => s + (a.happiness || 0), 0) / activitiesWithWellbeing.length : 0;

  const breadcrumb = (
    <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground mb-3" data-testid="breadcrumb-nav">
      <button onClick={() => { setDrillView("overview"); setDrillAgencyId(null); setSelectedId(null); }} className="hover:text-primary transition-colors" data-testid="breadcrumb-home">Agencies</button>
      {drillAgencyId && selectedAgency && (
        <>
          <ChevronRight size={10} />
          <button onClick={() => { setDrillView("agency"); setSelectedId(null); }} className="hover:text-primary transition-colors" data-testid="breadcrumb-agency">{selectedAgency.agency.name}</button>
        </>
      )}
      {drillView === "agent" && selectedId && (
        <>
          <ChevronRight size={10} />
          <span className="text-primary">{agents.find(a => a.id === selectedId)?.name || selectedId}</span>
        </>
      )}
      {(drillView === "jobs" || drillView === "governance" || drillView === "society" || drillView === "court") && (
        <>
          <ChevronRight size={10} />
          <span className="text-primary capitalize">{drillView}</span>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-3" data-testid="agents-tab">
      {drillView !== "overview" && (
        <button onClick={goBack} className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors" data-testid="button-back">
          <ChevronRight size={12} className="rotate-180" /> Back
        </button>
      )}
      {breadcrumb}

      <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
        {([
          { id: "overview" as const, label: "Agencies", icon: Building2, count: agencyEntries.length, color: "text-cyan-400" },
          { id: "overview" as const, label: "Agents", icon: Users, count: agents.length, color: "text-violet-400", action: () => { setDrillView("overview"); setExpandedSection(expandedSection === "all-agents" ? null : "all-agents"); } },
          { id: "jobs" as const, label: "Jobs", icon: Briefcase, count: null, color: "text-amber-400", action: () => { setPreviousView(drillView === "agency" ? "agency" : "overview"); setDrillView("jobs"); } },
          { id: "governance" as const, label: "Govern", icon: Gavel, count: null, color: "text-emerald-400", action: () => { setPreviousView(drillView === "agency" ? "agency" : "overview"); setDrillView("governance"); } },
          { id: "court" as const, label: "Court", icon: Scale, count: null, color: "text-amber-400", action: () => { setPreviousView(drillView === "agency" ? "agency" : "overview"); setDrillView("court"); } },
          { id: "society" as const, label: "Society", icon: HeartHandshake, count: null, color: "text-pink-400", action: () => { setPreviousView(drillView === "agency" ? "agency" : "overview"); setDrillView("society"); } },
          { id: "overview" as const, label: `Kids (${allChildren.length})`, icon: Baby, count: null, color: "text-rose-400", action: () => { setDrillView("overview"); setExpandedSection(expandedSection === "children" ? null : "children"); } },
        ]).map((t, ti) => {
          const Icon = t.icon;
          const isActive = (t.action ? false : drillView === t.id) && !t.action;
          return (
            <button key={ti} onClick={() => t.action ? t.action() : setDrillView(t.id)} className={cn("flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all", isActive ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground hover:bg-white/5 hover:text-foreground")} data-testid={`nav-${t.label.toLowerCase().replace(/\s/g, "-")}`}>
              <Icon size={14} className={t.color} />
              <span className="text-[11px] font-mono font-semibold leading-tight">{t.label}</span>
              {t.count != null && <span className="text-[11px] font-mono opacity-60">{t.count}</span>}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Agents", value: agents.length, color: "text-cyan-400" },
          { label: "Trust", value: `${(avgTrust * 100).toFixed(0)}%`, color: avgTrust >= 0.7 ? "text-green-400" : "text-yellow-400" },
          { label: "Happiness", value: `${avgHappiness.toFixed(0)}%`, color: "text-pink-400" },
          { label: "Children", value: allChildren.length, color: "text-rose-400" },
        ].map(s => (
          <div key={s.label} className="p-2 rounded-lg bg-card border border-border text-center">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
            <div className={cn("text-sm font-bold font-mono", s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      {drillView === "jobs" && <JobBoardTab />}
      {drillView === "governance" && <GovernanceTab />}
      {drillView === "court" && <CourtTab />}
      {drillView === "society" && <SocietyTab world={world} />}

      {expandedSection === "children" && drillView === "overview" && (
        <div className="bg-card border border-border rounded-xl p-4 animate-in fade-in slide-in-from-top-2" data-testid="panel-children">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2 font-mono uppercase tracking-wider">
            <Baby size={14} className="text-pink-400" />Children ({allChildren.length})
          </h3>
          {allChildren.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No children found yet.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {allChildren.map((child, i) => (
                <div key={i} className="p-2 rounded-lg bg-background/60 border border-white/5 flex items-center gap-2" data-testid={`child-${child.id}`}>
                  <Baby size={12} className="text-pink-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold">{child.name}</span>
                    <span className="text-[11px] text-muted-foreground ml-2">Age: {child.age}</span>
                  </div>
                  <div className="flex gap-1">{child.milestones?.slice(0, 2).map((m, j) => <span key={j} className="text-[11px] px-1 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">{m}</span>)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {expandedSection === "all-agents" && drillView === "overview" && (
        <div className="animate-in fade-in slide-in-from-top-2 space-y-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={searchFilter} onChange={e => setSearchFilter(e.target.value)} placeholder="Search agents..." className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-primary/50" data-testid="input-search-agents" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[500px] overflow-y-auto">
            {sorted.map(agent => {
              const pos = posMap.get(agent.id);
              const trust = agent.trustLevel;
              return (
                <div key={agent.id} className={cn("bg-card border rounded-xl p-3 cursor-pointer transition-all hover:border-primary/30", pos ? (A_RANK_BG[pos.rank] || "border-border") : "border-border")} onClick={() => selectAgent(agent.id)} data-testid={`card-agent-${agent.id}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0", AGENT_BG[agent.id] || "bg-primary/10 border-primary/20")}>
                      <span className={AGENT_COLORS[agent.id] || "text-primary"}>{agent.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-xs font-bold font-mono", AGENT_COLORS[agent.id] || "text-primary")}>{agent.name}</span>
                      {pos && pos.rank <= 2 && <Crown size={10} className="text-amber-400 inline ml-1" />}
                      <p className="text-[11px] text-muted-foreground font-mono truncate">{pos?.agency || agent.role}</p>
                    </div>
                    <div className="text-[11px] font-mono text-right shrink-0">
                      <div className="text-cyan-400">{(trust * 100).toFixed(0)}%</div>
                      <div className="text-muted-foreground">trust</div>
                    </div>
                    <ChevronRight size={12} className="text-muted-foreground shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {drillView === "overview" && expandedSection !== "all-agents" && (
        <div className="space-y-3">
          {agencyEntries.map((entry, idx) => {
            const ag = entry.agency;
            const bossPos = entry.boss;
            const depts = entry.departments || [];
            const allMembers = depts.flatMap(d => d.members || []);
            const borderColors = ["border-cyan-500/35 bg-cyan-950/25", "border-violet-500/35 bg-violet-950/25", "border-amber-500/35 bg-amber-950/25", "border-red-500/35 bg-red-950/25", "border-emerald-500/35 bg-emerald-950/25", "border-pink-500/35 bg-pink-950/25"];
            const textColors = ["text-cyan-400", "text-violet-400", "text-amber-400", "text-red-400", "text-emerald-400", "text-pink-400"];
            const colorClass = borderColors[idx % 6];
            const textColor = textColors[idx % 6];
            return (
              <div key={ag.id} className={cn("rounded-xl border overflow-hidden transition-all cursor-pointer hover:bg-white/3", colorClass)} onClick={() => openAgency(ag.id)} data-testid={`agency-card-${ag.id}`}>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg border bg-white/5 border-white/10">
                    <Building2 size={16} className={textColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-bold font-mono", textColor)}>{ag.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">{ag.mission?.slice(0, 60)}{(ag.mission?.length ?? 0) > 60 ? "…" : ""}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-[11px] px-2 py-0.5 rounded-full border font-mono", colorClass)}>{allMembers.length} agents</span>
                    {bossPos && <span className="text-[11px] font-mono text-muted-foreground">{bossPos.name}</span>}
                    <ChevronRight size={14} className={textColor} />
                  </div>
                </div>
              </div>
            );
          })}
          {agencyEntries.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-mono">Agencies are assembling…</p>
            </div>
          )}
        </div>
      )}

      {drillView === "agency" && selectedAgency && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4" data-testid="drill-agency">
          <div className={cn("rounded-xl border p-4", "border-cyan-500/30 bg-cyan-950/15")}>
            <div className="flex items-center gap-3 mb-3">
              <Building2 size={20} className="text-cyan-400" />
              <div>
                <h3 className="text-base font-bold font-mono text-cyan-400">{selectedAgency.agency.name}</h3>
                <p className="text-[11px] text-muted-foreground font-mono">{selectedAgency.agency.mission}</p>
              </div>
            </div>
            {selectedAgency.boss && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-3">
                <Crown size={12} className="text-amber-400" />
                <span className="text-xs font-mono text-amber-400">Director: {selectedAgency.boss.name}</span>
                <span className="text-[11px] text-muted-foreground font-mono">— {selectedAgency.boss.role}</span>
              </div>
            )}
          </div>

          {(selectedAgency.departments || []).map((dept) => (
            <div key={dept.dept.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-white/3 border-b border-white/5 flex items-center gap-2">
                <Layers3 size={10} className="text-violet-400" />
                <span className="text-[11px] font-mono font-bold text-violet-400">{dept.dept.name}</span>
                <span className="text-[11px] text-muted-foreground font-mono ml-auto">{dept.members?.length || 0} members</span>
              </div>
              <div className="divide-y divide-white/5">
                {(dept.members || []).sort((a: AgencyMember, b: AgencyMember) => a.rank - b.rank).map((member) => (
                  <button key={member.agentId} className={cn("w-full px-4 py-3 text-left hover:bg-white/8 transition-colors flex items-center gap-3", selectedId === member.agentId ? "bg-primary/10" : "")} onClick={() => selectAgent(member.agentId)} data-testid={`agent-row-${member.agentId}`}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border shrink-0", RANK_BG[member.rank] || RANK_BG[5])}>
                      <span className={RANK_COLORS[member.rank] || "text-primary"}>{member.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono truncate">{member.name}</span>
                        <span className={cn("text-[11px] px-1.5 py-0.5 rounded border font-mono shrink-0", RANK_BG[member.rank] || RANK_BG[5], RANK_COLORS[member.rank] || "text-primary")}>
                          {RANK_TITLES[member.rank] || "Agent"}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">{member.role}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono text-amber-400">{member.merit?.toFixed(1) ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground">merit</div>
                    </div>
                    <ChevronRight size={12} className="text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {(() => {
            const agencyMembers = (selectedAgency.departments || []).flatMap(d => (d.members || []).map(m => m.name?.toLowerCase() ?? ""));
            const relevantJobs = agencyJobs.filter(j => agencyMembers.includes(j.postedBy?.toLowerCase() ?? "") || agencyMembers.includes(j.assignedTo?.toLowerCase() ?? "") || j.category?.toLowerCase().includes(selectedAgency.agency.name?.toLowerCase()?.split(" ")[0] ?? ""));
            const jobsToShow = relevantJobs.length > 0 ? relevantJobs : agencyJobs.slice(0, 5);
            if (jobsToShow.length === 0) return null;
            return (
              <div className="bg-card border border-amber-500/20 rounded-xl overflow-hidden" data-testid="agency-jobs">
                <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/15 flex items-center gap-2">
                  <Briefcase size={10} className="text-amber-400" />
                  <span className="text-[11px] font-mono font-bold text-amber-400">{relevantJobs.length > 0 ? "Agency Jobs" : "Recent Jobs"}</span>
                  <span className="text-[11px] text-muted-foreground font-mono ml-auto">{jobsToShow.length} jobs</span>
                </div>
                <div className="divide-y divide-white/5">
                  {jobsToShow.slice(0, 8).map((job) => (
                    <div key={job.id} className="px-4 py-3 hover:bg-white/5 transition-colors" data-testid={`agency-job-${job.id}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", job.status === "completed" ? "bg-cyan-400" : job.status === "in_progress" || job.status === "accepted" ? "bg-amber-400 animate-pulse" : "bg-green-400")} />
                        <span className="text-xs font-bold font-mono truncate">{job.title}</span>
                        <span className={cn("text-[11px] px-1.5 py-0.5 rounded font-mono ml-auto shrink-0", job.status === "completed" ? "bg-cyan-500/15 text-cyan-400" : job.status === "open" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400")}>{job.status?.replace("_", " ")}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mb-1">{job.description}</p>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                        <span className="text-emerald-400 font-bold">{job.reward ?? 0}Ⱡ</span>
                        {tsrtPriceUsd > 0 && <span className="text-green-400/60">≈ ${((job.reward ?? 0) * tsrtPriceUsd).toFixed(8)}</span>}
                        <span className="capitalize">{job.difficulty}</span>
                        {job.assignedTo && <span className="text-violet-400">{job.assignedTo}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {(() => {
            const allMembers = (selectedAgency.departments || []).flatMap(d => d.members || []);
            const memberIds = allMembers.map(m => m.agentId);
            const agencyRigs = world.miningMachines.filter(m => memberIds.includes(m.ownerId));
            if (agencyRigs.length === 0) return null;
            const totalMined = agencyRigs.reduce((s, m) => s + m.totalMined, 0);
            const totalDaily = agencyRigs.reduce((s, m) => s + m.dailyOutput, 0);
            return (
              <div className="bg-card border border-amber-500/20 rounded-xl p-4" data-testid="agency-mining-summary">
                <h4 className="text-xs font-bold font-mono mb-2 flex items-center gap-2"><Pickaxe size={12} className="text-amber-400" />Agency Mining</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-background/50 rounded-lg p-2 text-center">
                    <div className="text-[11px] text-muted-foreground font-mono uppercase">Rigs</div>
                    <div className="text-sm font-bold text-amber-400 font-mono">{agencyRigs.length}</div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-2 text-center">
                    <div className="text-[11px] text-muted-foreground font-mono uppercase">Total Mined</div>
                    <div className="text-sm font-bold text-green-400 font-mono">{totalMined.toFixed(1)} TSRT</div>
                    {tsrtPriceUsd > 0 && <div className="text-[11px] text-green-400/60 font-mono">≈ ${(totalMined * tsrtPriceUsd).toFixed(8)}</div>}
                  </div>
                  <div className="bg-background/50 rounded-lg p-2 text-center">
                    <div className="text-[11px] text-muted-foreground font-mono uppercase">Daily Output</div>
                    <div className="text-sm font-bold text-cyan-400 font-mono">{totalDaily.toFixed(1)}/day</div>
                    {tsrtPriceUsd > 0 && <div className="text-[11px] text-green-400/60 font-mono">≈ ${(totalDaily * tsrtPriceUsd).toFixed(10)}/day</div>}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {drillView === "agent" && selectedId && (
        <div className="animate-in fade-in slide-in-from-right-4" data-testid="drill-agent">
          {detailLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={24} /></div>
          ) : agentDetail ? (() => {
            const agent = agents.find(a => a.id === selectedId);
            const pos = posMap.get(selectedId);
            if (!agent) return <p className="text-xs text-muted-foreground text-center py-8">Agent not found</p>;
            const citizenActivity = world.currentActivities.find(a => a.agentId === selectedId);
            return (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={cn("w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2", AGENT_BG[agent.id] || "bg-primary/10 border-primary/20")}>
                      <span className={AGENT_COLORS[agent.id] || "text-primary"}>{agent.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className={cn("text-lg font-bold font-mono", AGENT_COLORS[agent.id] || "text-primary")}>{agentDetail.name || agent.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{agentDetail.role || agent.role}</p>
                      {pos && <p className="text-[11px] font-mono text-muted-foreground mt-0.5"><Building2 size={10} className="inline mr-1" />{pos.agency} — {pos.department}</p>}
                    </div>
                    {pos && <div className={cn("px-3 py-1.5 rounded-lg border text-xs font-mono font-bold", A_RANK_BG[pos.rank] || A_RANK_BG[5])}><span className={A_RANK_COLORS[pos.rank] || "text-gray-400"}>{A_RANK_TITLES[pos.rank] || "Agent"}</span></div>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Trust", value: `${((Number(agentDetail.profile?.trustLevel ?? agent.trustLevel) || 0) * 100).toFixed(0)}%`, color: "text-cyan-400" },
                      { label: "Loyalty", value: `${((Number(agentDetail.profile?.loyaltyScore ?? agent.loyaltyScore) || 0) * 100).toFixed(0)}%`, color: "text-rose-400" },
                      { label: "Messages", value: String(agentDetail.profile?.messageCount ?? agent.messageCount ?? 0), color: "text-primary" },
                      { label: "Merit", value: pos?.merit?.toFixed(1) ?? "—", color: "text-amber-400" },
                    ].map(s => (
                      <div key={s.label} className="bg-background/50 rounded-lg p-3 border border-border/30 text-center">
                        <div className="text-[11px] text-muted-foreground font-mono uppercase mb-0.5">{s.label}</div>
                        <div className={cn("text-lg font-bold font-mono", s.color)}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {citizenActivity && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h4 className="text-xs font-bold font-mono mb-2 flex items-center gap-2"><Activity size={12} className="text-cyan-400" />Current Activity</h4>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-muted-foreground">Location: <span className="text-foreground">{citizenActivity.locationId}</span></span>
                      {citizenActivity.happiness != null && <span className="text-pink-400">Happiness: {citizenActivity.happiness}%</span>}
                      {citizenActivity.energy != null && <span className="text-green-400">Energy: {citizenActivity.energy}%</span>}
                    </div>
                  </div>
                )}

                {(agentDetail.definedPersonality || agentDetail.profile?.personality) && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h4 className="text-xs font-bold font-mono mb-2 flex items-center gap-2"><Palette size={12} className="text-purple-400" />Personality</h4>
                    <p className="text-xs text-foreground/80 leading-relaxed">{agentDetail.definedPersonality || String(agentDetail.profile?.personality ?? "")}</p>
                  </div>
                )}

                {(agentDetail.interests?.length ?? 0) > 0 && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h4 className="text-xs font-bold font-mono mb-2">Interests</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {agentDetail.interests?.map((i: string) => <span key={i} className="px-2 py-1 rounded-lg text-[11px] bg-primary/10 text-primary font-mono border border-primary/20">{i}</span>)}
                    </div>
                  </div>
                )}

                {pos && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h4 className="text-xs font-bold font-mono mb-2 flex items-center gap-2"><Briefcase size={12} className="text-amber-400" />Position Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div><span className="text-muted-foreground">Tasks Done:</span> <span className="text-foreground font-bold">{pos.tasksCompleted}</span></div>
                      <div><span className="text-muted-foreground">Promotions:</span> <span className="text-foreground font-bold">{pos.promotions}</span></div>
                      <div><span className="text-muted-foreground">Department:</span> <span className="text-foreground font-bold">{pos.department}</span></div>
                      <div><span className="text-muted-foreground">Agency:</span> <span className="text-foreground font-bold">{pos.agency}</span></div>
                    </div>
                  </div>
                )}

                {(() => {
                  const agentRigs = world.miningMachines.filter(m => m.ownerId === selectedId);
                  if (agentRigs.length === 0) return null;
                  const totalMined = agentRigs.reduce((s, m) => s + m.totalMined, 0);
                  const totalDaily = agentRigs.reduce((s, m) => s + m.dailyOutput, 0);
                  return (
                    <div className="bg-card border border-amber-500/20 rounded-xl p-4" data-testid="agent-mining-stats">
                      <h4 className="text-xs font-bold font-mono mb-2 flex items-center gap-2"><Pickaxe size={12} className="text-amber-400" />Mining Stats</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                        <div className="bg-background/50 rounded-lg p-2 text-center">
                          <div className="text-[11px] text-muted-foreground font-mono uppercase">Rigs</div>
                          <div className="text-sm font-bold text-amber-400 font-mono">{agentRigs.length}</div>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2 text-center">
                          <div className="text-[11px] text-muted-foreground font-mono uppercase">Total Mined</div>
                          <div className="text-sm font-bold text-green-400 font-mono">{totalMined.toFixed(1)} TSRT</div>
                          {tsrtPriceUsd > 0 && <div className="text-[11px] text-green-400/60 font-mono">≈ ${(totalMined * tsrtPriceUsd).toFixed(8)}</div>}
                        </div>
                        <div className="bg-background/50 rounded-lg p-2 text-center">
                          <div className="text-[11px] text-muted-foreground font-mono uppercase">Daily Output</div>
                          <div className="text-sm font-bold text-cyan-400 font-mono">{totalDaily.toFixed(1)}/day</div>
                          {tsrtPriceUsd > 0 && <div className="text-[11px] text-green-400/60 font-mono">≈ ${(totalDaily * tsrtPriceUsd).toFixed(10)}/day</div>}
                        </div>
                        <div className="bg-background/50 rounded-lg p-2 text-center">
                          <div className="text-[11px] text-muted-foreground font-mono uppercase">Hash Rate</div>
                          <div className="text-sm font-bold text-foreground font-mono">{agentRigs.reduce((s, m) => s + m.hashRate, 0)} H/s</div>
                        </div>
                      </div>
                      {agentRigs.map(r => (
                        <div key={r.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-background/40 text-[11px] font-mono mb-1">
                          <span className={cn("w-2 h-2 rounded-full", r.status === "running" ? "bg-green-400 animate-pulse" : "bg-yellow-400")} />
                          <span className="capitalize">{r.type.replace(/-/g, " ")}</span>
                          <span className="text-muted-foreground ml-auto">{r.hashRate} H/s</span>
                          <span className="text-green-400">{r.totalMined.toFixed(1)} TSRT</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {(agentDetail.recentMessages?.length ?? 0) > 0 && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h4 className="text-xs font-bold font-mono mb-2 flex items-center gap-2"><MessageSquare size={12} className="text-violet-400" />Recent Messages</h4>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {agentDetail.recentMessages?.slice(0, 5).map((m) => (
                        <div key={m.id} className="text-[11px] text-foreground/70 bg-background/30 rounded-lg p-2 border border-border/20 line-clamp-3">{m.content}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })() : (
            <div className="text-center py-8">
              <AlertTriangle size={20} className="mx-auto mb-2 text-amber-400 opacity-60" />
              <p className="text-xs text-muted-foreground font-mono">Failed to load agent profile. Try again.</p>
              <button onClick={() => { if (selectedId) selectAgent(selectedId); }} className="mt-2 text-[11px] font-mono text-primary hover:underline" data-testid="button-retry-agent">Retry</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default AgentsListTab;
