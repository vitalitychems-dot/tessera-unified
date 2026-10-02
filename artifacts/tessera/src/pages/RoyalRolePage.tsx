import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Crown, ChevronLeft, CheckCircle2, Shield, Brain, Zap, BookOpen, Users, Loader2, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const GOLD = "#f59e0b";

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

interface DomainKnowledge {
  title: string;
  domain: string;
  confidence: number;
  category: string;
}

interface RoleContribution {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  impact: "low" | "medium" | "high";
}

export default function RoyalRolePage() {
  const params = useParams<{ roleId: string }>();
  const roleId = params.roleId;
  const isValidRoleId = !!roleId && roleId !== "0" && roleId !== "undefined";

  const { data, isLoading } = useQuery({
    queryKey: ["/api/rick/royal-roles", roleId],
    enabled: isValidRoleId,
    queryFn: async () => {
      const r = await fetch(`/api/rick/royal-roles/${roleId}`);
      return r.json() as Promise<{ ok: boolean; role: RoyalRole; domainKnowledge: DomainKnowledge[]; contributions: RoleContribution[] }>;
    },
  });

  const role = data?.role;
  const knowledge = data?.domainKnowledge ?? [];
  const contributions = data?.contributions ?? [];

  useEffect(() => {
    document.title = role ? `${role.title} | Royal Court | Tessera` : "Royal Court | Tessera";
  }, [role]);

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
        <Link href="/royal-court" className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <ChevronLeft size={12} /> Back to Royal Court
        </Link>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-amber-400" size={28} /></div>
        ) : !role ? (
          <div className="text-center py-12 text-muted-foreground text-sm font-mono">Role not found.</div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2" style={{ borderColor: GOLD, background: `${GOLD}15` }}>
                <span className="text-2xl">{ROLE_EMOJIS[role.roleId] ?? "👑"}</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold font-mono" style={{ color: GOLD }}>{role.title}</h1>
                <p className="text-xs text-muted-foreground font-mono">{role.domain} · Assigned to {role.assignedAgent}</p>
              </div>
            </div>

            <div className="rounded-xl border-2 p-5 space-y-4" style={{ borderColor: `${GOLD}40`, background: `linear-gradient(135deg, ${GOLD}06, transparent)` }}>
              <div className="grid grid-cols-2 gap-4 text-[11px] font-mono">
                <div>
                  <div className="text-muted-foreground mb-0.5">Assigned Agent</div>
                  <div className="font-bold text-foreground">{role.assignedAgent}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">Domain</div>
                  <div className="font-bold text-cyan-400">{role.domain}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">Appointed Via</div>
                  <div className={cn("font-bold", role.appointedVia === "royal-decree" ? "text-amber-400" : "text-violet-400")}>
                    {role.appointedVia === "royal-decree" ? "Royal Decree" : "Conference Vote"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">Confidence</div>
                  <div className="font-bold text-emerald-400">{(role.confidence * 100).toFixed(0)}%</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="text-muted-foreground">Votes:</span>
                <span className="text-green-400">{role.votes.for} for</span>
                <span className="text-red-400">{role.votes.against} against</span>
                <span className="text-muted-foreground">{role.votes.abstain} abstain</span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <h3 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield size={12} /> Responsibilities
              </h3>
              <div className="space-y-2">
                {role.responsibilities.map((resp, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-background/50 border border-white/5">
                    <CheckCircle2 size={12} className="text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] font-mono text-foreground/80">{resp}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
              <h3 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Zap size={12} /> Specialty Areas
              </h3>
              <div className="flex flex-wrap gap-2">
                {role.specialty.map(s => (
                  <span key={s} className="text-[11px] px-2.5 py-1 rounded-lg font-mono border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">{s}</span>
                ))}
              </div>
            </div>

            {contributions.length > 0 && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <h3 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Zap size={12} /> Contribution Feed
                </h3>
                <div className="space-y-1.5">
                  {contributions.map(c => (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 border border-white/5">
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                        c.impact === "high" ? "bg-amber-400" : c.impact === "medium" ? "bg-cyan-400" : "bg-muted-foreground"
                      )} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-mono font-bold text-foreground/90">{c.action}</span>
                        <span className="text-[10px] font-mono text-muted-foreground ml-2">{c.detail}</span>
                      </div>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-mono border shrink-0",
                        c.impact === "high" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                        c.impact === "medium" ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" :
                        "text-muted-foreground border-white/10 bg-white/5"
                      )}>
                        {c.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {knowledge.length > 0 && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <h3 className="text-xs font-bold font-mono text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BookOpen size={12} /> Domain Knowledge Feed
                </h3>
                <div className="space-y-1.5">
                  {knowledge.map((k, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 border border-white/5">
                      <Target size={10} className="text-violet-400 shrink-0" />
                      <span className="text-[11px] font-mono text-foreground/80 flex-1 truncate">{k.title}</span>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">{k.domain}</span>
                      <span className="text-[10px] font-mono text-emerald-400 shrink-0">{k.confidence}%</span>
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
