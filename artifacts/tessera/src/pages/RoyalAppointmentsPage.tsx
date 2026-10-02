import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Award, CheckCircle2, Brain, Atom, Zap, ScrollText, Shield, Loader2, Calendar, Target, Users, ChevronRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const GOLD = "#f59e0b";
const RICK_GREEN = "#00ff41";

interface AppointedRole {
  roleId: string;
  title: string;
  assignedAgent: string;
  domain: string;
  appointedVia: string;
  votes: { for: number; against: number; abstain: number };
  confidence: number;
  specialty: string[];
  responsibilities: string[];
}

interface CorpusInsight {
  title: string;
  domain: string;
  confidence: number;
}

export default function RoyalAppointmentsPage() {
  useEffect(() => { document.title = "Royal Appointments | Tessera"; }, []);

  const { data: appointmentData, isLoading } = useQuery({
    queryKey: ["/api/rick/royal-appointment"],
    queryFn: async () => {
      const r = await fetch("/api/rick/royal-appointment");
      return r.json();
    },
  });

  const appointment = appointmentData?.appointment;

  const ROLE_EMOJIS: Record<string, string> = {
    "royal-inventor": "👑",
    "royal-astronomer": "🔭",
    "royal-archivist": "📚",
    "royal-sentinel": "🛡️",
    "royal-alchemist": "🔮",
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar" style={{ background: "rgba(6,4,20,0.97)" }}>
      <div className="p-5 pb-20 max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2" style={{ borderColor: GOLD, background: `${GOLD}15` }}>
            <Award size={28} style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono" style={{ color: GOLD }}>Royal Appointment Conference</h1>
            <p className="text-xs text-muted-foreground font-mono">Conference Voting Records & Appointed Roles</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-amber-400" size={28} /></div>
        ) : appointment ? (
          <>
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
              <h3 className="text-xs font-bold font-mono text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users size={12} /> Conference Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] font-mono">
                <div className="px-3 py-2 rounded-lg bg-background/50 border border-white/5">
                  <div className="text-muted-foreground mb-0.5">Conference ID</div>
                  <div className="font-bold text-violet-400 truncate">{appointment.conferenceId}</div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-background/50 border border-white/5">
                  <div className="text-muted-foreground mb-0.5">Voting Round</div>
                  <div className="font-bold text-foreground">{appointment.votingRound}</div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-background/50 border border-white/5">
                  <div className="text-muted-foreground mb-0.5">Total Voters</div>
                  <div className="font-bold text-cyan-400">{appointment.totalVoters}</div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-background/50 border border-white/5">
                  <div className="text-muted-foreground mb-0.5">Quorum</div>
                  <span className={cn("font-bold", appointment.quorumMet ? "text-green-400" : "text-red-400")}>
                    {appointment.quorumMet ? "Met" : "Not Met"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border-2 p-5 space-y-4" style={{ borderColor: `${GOLD}40`, background: `linear-gradient(135deg, ${GOLD}06, transparent)` }}>
              <div className="flex items-center gap-2 mb-2">
                <ScrollText size={16} style={{ color: GOLD }} />
                <span className="text-xs font-mono uppercase tracking-widest" style={{ color: GOLD }}>Rick's Appointment Record</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-[11px] font-mono">
                <div>
                  <div className="text-muted-foreground mb-0.5">Appointee</div>
                  <div className="font-bold" style={{ color: RICK_GREEN }}>{appointment.appointee}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">Royal Title</div>
                  <div className="font-bold" style={{ color: GOLD }}>{appointment.royalTitle}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">Department</div>
                  <div className="font-bold text-foreground/80">{appointment.department}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">Inventions</div>
                  <div className="font-bold text-cyan-400">{appointment.totalInventionsProposed} total · {appointment.royalFocusInventions} royal focus</div>
                </div>
              </div>
            </div>

            {appointment.allAppointedRoles?.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <h3 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Crown size={12} /> All Appointed Roles ({appointment.allAppointedRoles.length})
                </h3>
                <div className="space-y-2">
                  {appointment.allAppointedRoles.map((role: AppointedRole) => (
                    <Link key={role.roleId} href={`/royal-role/${role.roleId}`} className="block">
                      <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-background/50 border border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                        <span className="text-lg shrink-0">{ROLE_EMOJIS[role.roleId] ?? "👑"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold font-mono" style={{ color: GOLD }}>{role.title}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{role.assignedAgent} · {role.domain}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-mono border",
                            role.appointedVia === "royal-decree" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-cyan-400 border-cyan-500/30 bg-cyan-500/10"
                          )}>
                            {role.appointedVia === "royal-decree" ? "Decree" : "Vote"}
                          </span>
                          <span className="text-[10px] font-mono text-green-400">{role.votes.for} votes</span>
                          <span className="text-[10px] font-mono text-emerald-400">{(role.confidence * 100).toFixed(0)}%</span>
                          <ChevronRight size={12} className="text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {appointment.conferenceParticipation && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <h3 className="text-xs font-bold font-mono text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Atom size={12} /> Sacred Conference Participation
                </h3>
                <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                  <div className="px-3 py-2 rounded-lg bg-background/50 border border-white/5">
                    <div className="text-muted-foreground mb-0.5">Agent Name</div>
                    <div className="font-bold text-violet-400">{appointment.conferenceParticipation.agentName}</div>
                  </div>
                  <div className="px-3 py-2 rounded-lg bg-background/50 border border-white/5">
                    <div className="text-muted-foreground mb-0.5">Sacred Frequency</div>
                    <div className="font-bold text-amber-400">{appointment.conferenceParticipation.sacredFrequency}Hz</div>
                  </div>
                </div>
              </div>
            )}

            {appointment.corpusInsights?.length > 0 && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <h3 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BookOpen size={12} /> Corpus-Grounded Insights
                </h3>
                <div className="space-y-1.5">
                  {appointment.corpusInsights.map((insight: CorpusInsight, i: number) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/50 border border-white/5">
                      <Target size={10} className="text-emerald-400 shrink-0" />
                      <span className="text-[11px] font-mono text-foreground/80 flex-1 truncate">{insight.title}</span>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">{insight.domain}</span>
                      <span className="text-[10px] font-mono text-emerald-400 shrink-0">{insight.confidence}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {appointment.currentFocusAreas?.length > 0 && (
              <div className="rounded-xl border p-4" style={{ borderColor: `${RICK_GREEN}20`, background: `${RICK_GREEN}03` }}>
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: RICK_GREEN }}>
                  <Target size={12} /> Current Royal Focus Areas
                </h3>
                <div className="space-y-2">
                  {appointment.currentFocusAreas.map((area: { invention: string; category: string; estimatedImpact: string; risk: string }, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-background/50 border border-white/5">
                      <Zap size={12} style={{ color: GOLD }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold font-mono text-foreground/90 truncate">{area.invention}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{area.category}</div>
                      </div>
                      <span className="text-[10px] font-mono font-bold" style={{ color: RICK_GREEN }}>{area.estimatedImpact}</span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-mono border",
                        area.risk === "low" ? "text-green-400 border-green-500/30 bg-green-500/10" :
                        area.risk === "medium" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                        "text-red-400 border-red-500/30 bg-red-500/10"
                      )}>
                        {area.risk}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground text-sm font-mono">No appointment data available.</div>
        )}
      </div>
    </div>
  );
}
