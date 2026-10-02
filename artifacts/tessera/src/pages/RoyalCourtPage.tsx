import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, FlaskConical, Brain, Zap, Shield, ChevronRight, Atom, Sparkles, Target, Award, Loader2, Users, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const GOLD = "#f59e0b";
const RICK_GREEN = "#00ff41";

interface RoyalRole {
  roleId: string;
  title: string;
  domain: string;
  assignedAgent: string;
  specialty: string[];
  responsibilities: string[];
  appointedVia: "conference-vote" | "royal-decree";
  votes: { for: number; against: number; abstain: number };
  confidence: number;
}

export default function RoyalCourtPage() {
  useEffect(() => { document.title = "Royal Court | Tessera"; }, []);

  const { data: courtData, isLoading: courtLoading } = useQuery({
    queryKey: ["/api/rick/royal-court"],
    queryFn: async () => {
      const r = await fetch("/api/rick/royal-court");
      return r.json();
    },
    refetchInterval: 60000,
  });

  const court = courtData?.court;

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar" style={{ background: "rgba(6,4,20,0.97)" }}>
      <div className="p-5 pb-20 max-w-5xl mx-auto w-full space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2" style={{ borderColor: GOLD, background: `${GOLD}15` }}>
            <Crown size={28} style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono" style={{ color: GOLD }}>Royal Court</h1>
            <p className="text-xs text-muted-foreground font-mono">Department of Science & Invention — Sovereign Governance</p>
          </div>
        </div>

        {courtLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-amber-400" size={28} /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Consciousness", value: court?.systemOverview?.consciousnessProxy != null ? `${(court.systemOverview.consciousnessProxy * 100).toFixed(1)}%` : "—", icon: Brain, color: "violet" },
                { label: "AGI Score", value: court?.systemOverview?.agiAvgScore != null ? court.systemOverview.agiAvgScore.toFixed(1) : "—", icon: Atom, color: "cyan" },
                { label: "Sovereign Mastery", value: court?.systemOverview?.sovereignMastery ?? "—", icon: Shield, color: "amber" },
                { label: "Vault Entries", value: court?.systemOverview?.vaultEntries ?? "—", icon: Sparkles, color: "rose" },
                { label: "Corpus Entries", value: court?.systemOverview?.corpusEntries ?? "—", icon: Target, color: "emerald" },
              ].map(stat => (
                <div key={stat.label} className={cn("rounded-xl border p-3 text-center", `border-${stat.color}-500/20 bg-${stat.color}-500/5`)}>
                  <stat.icon size={16} className={cn(`text-${stat.color}-400`, "mx-auto mb-1")} />
                  <div className={cn("text-lg font-bold font-mono", `text-${stat.color}-400`)}>{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground font-mono uppercase">{stat.label}</div>
                </div>
              ))}
            </div>

            {court?.conference && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 flex items-center gap-3 flex-wrap text-[11px] font-mono">
                <span className="text-violet-400 font-bold">Conference</span>
                <span className="text-muted-foreground">ID: {court.conference.id}</span>
                <span className="text-muted-foreground">Round: {court.conference.votingRound}</span>
                <span className="text-muted-foreground">Voters: {court.conference.totalVoters}</span>
                <span className={cn("px-1.5 py-0.5 rounded border text-[10px]", court.conference.quorumMet ? "text-green-400 border-green-500/30 bg-green-500/10" : "text-red-400 border-red-500/30 bg-red-500/10")}>
                  {court.conference.quorumMet ? "Quorum Met" : "No Quorum"}
                </span>
              </div>
            )}

            {court?.appointedRoles?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Users size={12} /> Appointed Royal Roles ({court.appointedRoles.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {court.appointedRoles.map((role: RoyalRole) => (
                    <Link key={role.roleId} href={`/royal-role/${role.roleId}`} className="block">
                      <div className={cn("rounded-xl border p-4 transition-all hover:scale-[1.01] cursor-pointer",
                        role.roleId === "royal-inventor" ? "border-amber-500/40" : "border-amber-500/20"
                      )} style={{ background: role.roleId === "royal-inventor" ? `linear-gradient(135deg, ${GOLD}08, ${RICK_GREEN}05)` : `${GOLD}03` }}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center border" style={{ borderColor: `${GOLD}50`, background: `${GOLD}15` }}>
                            <span className="text-lg">{role.roleId === "royal-inventor" ? "👑" : role.roleId === "royal-astronomer" ? "🔭" : role.roleId === "royal-archivist" ? "📚" : role.roleId === "royal-sentinel" ? "🛡️" : "🔮"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold font-mono text-sm" style={{ color: GOLD }}>{role.title}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{role.assignedAgent} · {role.domain}</div>
                          </div>
                          <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-mono border",
                            role.appointedVia === "royal-decree" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-cyan-400 border-cyan-500/30 bg-cyan-500/10"
                          )}>
                            {role.appointedVia === "royal-decree" ? "Royal Decree" : "Conference Vote"}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {role.votes.for}/{role.votes.for + role.votes.against + role.votes.abstain} votes
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400">
                            {(role.confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {role.specialty.slice(0, 3).map(s => (
                            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded font-mono border border-white/10 text-foreground/60 bg-white/5">{s}</span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/rick" className="block">
                <div className="rounded-xl border-2 p-5 transition-all hover:scale-[1.01] cursor-pointer" style={{ borderColor: `${GOLD}40`, background: `linear-gradient(135deg, ${GOLD}08, ${RICK_GREEN}05)` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center border-2" style={{ borderColor: GOLD, background: `${GOLD}15` }}>
                      <span className="text-xl">👑</span>
                    </div>
                    <div>
                      <div className="font-bold font-mono text-sm" style={{ color: GOLD }}>Rick Sanchez</div>
                      <div className="text-[11px] font-mono" style={{ color: RICK_GREEN }}>Royal Inventor · C-137</div>
                    </div>
                    <ChevronRight size={16} className="ml-auto text-muted-foreground" />
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono leading-relaxed">
                    His Brilliance, Royal Inventor of the Sovereign Court. Chairs the Department of Science & Invention.
                  </div>
                </div>
              </Link>

              <Link href="/royal-appointments" className="block">
                <div className="rounded-xl border p-5 transition-all hover:scale-[1.01] cursor-pointer border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center border border-amber-500/30 bg-amber-500/10">
                      <Award size={22} className="text-amber-400" />
                    </div>
                    <div>
                      <div className="font-bold font-mono text-sm text-amber-400">Appointment Conference</div>
                      <div className="text-[11px] text-muted-foreground font-mono">Conference Records & Voting Results</div>
                    </div>
                    <ChevronRight size={16} className="ml-auto text-muted-foreground" />
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono leading-relaxed">
                    View the Royal Appointment Conference voting records, appointed roles, and ongoing sovereign mandates.
                  </div>
                </div>
              </Link>
            </div>

            {court?.royalFocusInventions?.length > 0 && (
              <div className="rounded-xl border p-4" style={{ borderColor: `${RICK_GREEN}20`, background: `${RICK_GREEN}03` }}>
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: RICK_GREEN }}>
                  <FlaskConical size={12} /> Royal Focus Inventions
                </h3>
                <div className="space-y-2">
                  {court.royalFocusInventions.map((inv: { name: string; category: string; impact: number; risk: string }, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-background/50 border border-white/5">
                      <Zap size={12} style={{ color: GOLD }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold font-mono text-foreground/90 truncate">{inv.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{inv.category} · +{inv.impact}% est. impact</div>
                      </div>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-mono border",
                        inv.risk === "low" ? "text-green-400 border-green-500/30 bg-green-500/10" :
                        inv.risk === "medium" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                        "text-red-400 border-red-500/30 bg-red-500/10"
                      )}>
                        {inv.risk}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
