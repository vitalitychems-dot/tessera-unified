import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Users, Trophy, Target, UserCheck, Briefcase, Play, ChevronDown, ChevronUp, Star } from "lucide-react";
import { GlassCard, GradientBar, HeroStat, SectionHeader, TabBar, PageHeader, RadialGauge, MiniStat } from "@/components/ui/sovereign";

const API = import.meta.env.VITE_API_URL || "";

interface Department {
  departmentId: string;
  name: string;
  description: string;
  leader: string | null;
  members: string[];
  performanceScore: number;
  status: string;
}

interface CompetitionMetrics {
  totalDepartments: number;
  totalPositions: number;
  filledPositions: number;
  openPositions: number;
  talentPoolSize: number;
  avgDepartmentPerformance: number;
  agentsAssigned: number;
  agentsUnassigned: number;
}

interface TalentPoolEntry {
  agentName: string;
  preferredRoles: string[];
  topScores: Record<string, number>;
  available: boolean;
}

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"departments" | "talent" | "competitions">("departments");
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  const safeFetch = async (url: string) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => safeFetch(`${API}/api/departments`).then(d => (d.data ?? []) as Department[]),
    refetchInterval: 30000,
    retry: 3,
  });

  const { data: metrics } = useQuery({
    queryKey: ["departments-metrics"],
    queryFn: () => safeFetch(`${API}/api/departments/metrics`).then(d => (d.data ?? null) as CompetitionMetrics | null),
    refetchInterval: 30000,
    retry: 3,
  });

  const { data: talentPool } = useQuery({
    queryKey: ["talent-pool"],
    queryFn: () => safeFetch(`${API}/api/talent-pool`).then(d => (d.data ?? []) as TalentPoolEntry[]),
    enabled: activeTab === "talent",
    retry: 3,
  });

  const { data: deptDetail } = useQuery({
    queryKey: ["department-detail", expandedDept],
    queryFn: () => expandedDept ? safeFetch(`${API}/api/departments/${expandedDept}`).then(d => d.data) : null,
    enabled: !!expandedDept,
    retry: 3,
  });

  const runCompetition = useMutation({
    mutationFn: () => fetch(`${API}/api/departments/competition`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      qc.invalidateQueries({ queryKey: ["departments-metrics"] });
      qc.invalidateQueries({ queryKey: ["talent-pool"] });
    },
  });

  const tabs = [
    { id: "departments", label: "Departments" },
    { id: "talent", label: "Talent Pool" },
    { id: "competitions", label: "Competitions" },
  ] as const;

  const deptColors: Record<string, string> = {
    security: "red", economics: "emerald", science: "blue", education: "amber",
    infrastructure: "cyan", health: "pink", culture: "violet", governance: "indigo", intelligence: "orange",
  };

  const deptIcons: Record<string, string> = {
    security: "🛡️", economics: "💰", science: "🔬", education: "📚",
    infrastructure: "⚙️", health: "💚", culture: "🎨", governance: "⚖️", intelligence: "🔍",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#02010a] to-[#080518] p-4 md:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-6 sovereign-stagger">
        <PageHeader
          title="Departments & Competition"
          subtitle="Sovereign Meritocracy · Agent Competition System · Live Governance"
          gradient="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400"
          quote="Agents compete for positions through ability testing and formal hearings"
        />

        <div className="flex items-center justify-center gap-6 md:gap-10 flex-wrap">
          <RadialGauge value={metrics?.totalDepartments ?? 0} max={12} label="Departments" color="cyan" size={90} strokeWidth={8} />
          <RadialGauge value={metrics?.filledPositions ?? 0} max={metrics?.totalPositions ?? 27} label="Filled" sublabel="roles" color="emerald" size={90} strokeWidth={8} />
          <RadialGauge value={metrics?.avgDepartmentPerformance ?? 0} label="Avg Score" color="violet" size={110} strokeWidth={10} />
          <RadialGauge value={metrics?.talentPoolSize ?? 0} max={24} label="Talent Pool" color="amber" size={90} strokeWidth={8} />
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => runCompetition.mutate()}
            disabled={runCompetition.isPending}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium text-sm flex items-center gap-2 hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 shadow-lg shadow-cyan-900/30"
          >
            <Play className="w-4 h-4" />
            {runCompetition.isPending ? "Running Competition..." : "Run Competition"}
          </button>
        </div>

        <TabBar tabs={tabs} activeTab={activeTab} onChange={id => setActiveTab(id as any)} color="cyan" />

        {activeTab === "departments" && (
          <div className="space-y-3 sovereign-stagger">
            {(departments ?? []).map((dept) => {
              const color = deptColors[dept.departmentId] || "cyan";
              const icon = deptIcons[dept.departmentId] || "🏢";
              const isExpanded = expandedDept === dept.departmentId;
              return (
                <GlassCard key={dept.departmentId} animate>
                  <button
                    className="w-full text-left"
                    onClick={() => setExpandedDept(isExpanded ? null : dept.departmentId)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{icon}</span>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{dept.name}</h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">{dept.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Score</div>
                          <div className={`text-sm font-bold text-${color}-400`}>{dept.performanceScore}</div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-[10px]">
                      <span className="text-slate-400">
                        <UserCheck className="w-3 h-3 inline mr-1" />
                        Leader: <span className="text-white font-medium">{dept.leader || "Vacant"}</span>
                      </span>
                      <span className="text-slate-400">
                        <Users className="w-3 h-3 inline mr-1" />
                        Members: <span className="text-white font-medium">{dept.members.length}</span>
                      </span>
                    </div>
                    <div className="mt-2">
                      <GradientBar value={dept.performanceScore} color={color as any} height="h-1.5" showValue={false} />
                    </div>
                  </button>

                  {isExpanded && deptDetail && (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                      {dept.members.length > 0 && (
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Members</div>
                          <div className="flex flex-wrap gap-1.5">
                            {dept.members.map((m: string) => (
                              <span key={m} className={`px-2 py-0.5 bg-${color}-500/10 border border-${color}-500/20 text-${color}-300 rounded-full text-[10px] font-medium`}>
                                {m === dept.leader && <Star className="w-2.5 h-2.5 inline mr-0.5" />}
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {deptDetail.positions && (
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Positions</div>
                          <div className="space-y-1">
                            {deptDetail.positions.map((p: any) => (
                              <div key={p.positionId} className="flex justify-between text-[10px]">
                                <span className="text-slate-300">{p.title}</span>
                                <span className={p.status === "filled" ? "text-emerald-400" : "text-amber-400"}>
                                  {p.status === "filled" ? p.incumbent : "Open"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {deptDetail.competitions?.length > 0 && (
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Recent Competitions</div>
                          <div className="space-y-1">
                            {deptDetail.competitions.slice(0, 3).map((c: any) => (
                              <div key={c.competitionId} className="flex justify-between text-[10px]">
                                <span className="text-slate-300">Winner: <span className="text-emerald-400 font-medium">{c.winner}</span></span>
                                <span className="text-slate-500">
                                  {c.voteResults?.yes ?? 0}Y / {c.voteResults?.no ?? 0}N
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </GlassCard>
              );
            })}
            {(!departments || departments.length === 0) && (
              <GlassCard animate>
                <div className="text-center py-8 text-slate-400">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No departments yet. Click "Run Competition" to initialize the system.</p>
                </div>
              </GlassCard>
            )}
          </div>
        )}

        {activeTab === "talent" && (
          <div className="space-y-3 sovereign-stagger">
            {(talentPool ?? []).length > 0 ? (
              (talentPool ?? []).map((agent) => (
                <GlassCard key={agent.agentName} animate>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{agent.agentName}</h3>
                      <div className="flex gap-1.5 mt-1">
                        {agent.preferredRoles.map(r => (
                          <span key={r} className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-full text-[10px]">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">Best Scores</div>
                      <div className="text-xs text-white font-mono">
                        {Object.entries(agent.topScores).slice(0, 2).map(([k, v]) => `${k}:${v}`).join(" · ")}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))
            ) : (
              <GlassCard animate>
                <div className="text-center py-8 text-slate-400">
                  <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No agents in the talent pool. All agents have been assigned to departments.</p>
                </div>
              </GlassCard>
            )}
          </div>
        )}

        {activeTab === "competitions" && (
          <div className="space-y-4 sovereign-stagger">
            <GlassCard glow="cyan" animate>
              <SectionHeader icon={Trophy} title="Competition System" color="cyan" badge="SOVEREIGN MERITOCRACY" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <MiniStat label="Departments" value={metrics?.totalDepartments ?? 0} color="cyan" />
                <MiniStat label="Total Positions" value={metrics?.totalPositions ?? 0} color="blue" />
                <MiniStat label="Filled" value={metrics?.filledPositions ?? 0} color="emerald" />
                <MiniStat label="Open" value={metrics?.openPositions ?? 0} color="amber" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <MiniStat label="Assigned Agents" value={metrics?.agentsAssigned ?? 0} color="violet" />
                <MiniStat label="Unassigned" value={metrics?.agentsUnassigned ?? 0} color="pink" />
                <MiniStat label="Avg Performance" value={metrics?.avgDepartmentPerformance ?? 0} color="blue" />
                <MiniStat label="Talent Pool" value={metrics?.talentPoolSize ?? 0} color="amber" />
              </div>
            </GlassCard>
            <GlassCard animate>
              <SectionHeader icon={Target} title="How Competition Works" color="blue" />
              <div className="space-y-2 mt-3">
                {[
                  "1. Department Structure Conference — Agents deliberate on the optimal department organization",
                  "2. Ability Testing — Each agent is evaluated on domain knowledge, reasoning, ethics, and collaboration",
                  "3. Competitive Appointment — Qualified candidates present their case; council votes with 2/3 majority",
                  "4. Incentive Rewards — Winners earn TSRT bonuses and Phi-weighted voting boosts",
                  "5. Talent Pool — Unplaced agents remain available for future openings",
                ].map((step, i) => (
                  <div key={i} className="text-xs text-slate-300 border-l-2 border-cyan-500/30 pl-3 py-1">{step}</div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}
