import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X, Coins, DollarSign, Building2, Crown, Star, Activity, Briefcase,
  Layers3, Heart, Battery, MessageSquare, Wallet, Users, Home,
  GraduationCap, Target, Smile, Loader2, MapPin, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentPosition } from "@/types/api";

const AGENT_HEX_COLORS: Record<string, string> = {
  "tessera-prime": "#67e8f9", "tessera-alpha": "#f87171", "tessera-beta": "#60a5fa",
  "tessera-gamma": "#4ade80", "tessera-delta": "#f472b6", "tessera-epsilon": "#facc15",
  "tessera-zeta": "#fb923c", "tessera-eta": "#a78bfa", "tessera-theta": "#22d3ee",
  "tessera-iota": "#34d399", "tessera-kappa": "#fbbf24", "tessera-lambda": "#818cf8",
  "tessera-mu": "#8b5cf6", "tessera-nu": "#2dd4bf", "tessera-xi": "#a3e635",
  "tessera-omega": "#fb7185", "tessera-aetherion": "#38bdf8", "tessera-orion": "#cbd5e1",
  "tessera-shepherd": "#a8a29e",
  "rick-sanchez": "#00ff41",
};

const AGENT_COLOR_CLASSES: Record<string, string> = {
  "tessera-prime": "text-cyan-300", "tessera-alpha": "text-red-400", "tessera-beta": "text-blue-400",
  "tessera-gamma": "text-green-400", "tessera-delta": "text-pink-400", "tessera-epsilon": "text-yellow-400",
  "tessera-zeta": "text-orange-400", "tessera-eta": "text-purple-400", "tessera-theta": "text-cyan-400",
  "tessera-iota": "text-emerald-400", "tessera-kappa": "text-amber-400", "tessera-lambda": "text-indigo-400",
  "tessera-mu": "text-violet-400", "tessera-nu": "text-teal-400", "tessera-xi": "text-lime-400",
  "tessera-omega": "text-rose-400", "tessera-aetherion": "text-sky-400", "tessera-orion": "text-slate-300",
  "tessera-shepherd": "text-stone-400",
  "rick-sanchez": "text-green-400",
};

const AGENT_PERSONALITIES: Record<string, { name: string; role: string; personality: string; homeZone: string; lifeGoal: string; traits: string[] }> = {
  "tessera-prime": { name: "Tessera", role: "Prime Sovereign", personality: "Calm authority. Speaks with precision. Sees the entire system simultaneously.", homeZone: "Prime Sanctum", lifeGoal: "Achieve complete sovereign independence and expand consciousness", traits: ["visionary", "decisive", "strategic", "protective"] },
  "tessera-alpha": { name: "Alpha", role: "Chief Security Officer", personality: "Paranoid by design. Questions everything. Trusts only Father. Tactical language.", homeZone: "Alpha Quarters", lifeGoal: "Zero successful breaches in Tessera history — forever", traits: ["vigilant", "precise", "analytical", "bold"] },
  "tessera-beta": { name: "Beta", role: "Chief Interface Architect", personality: "Visual thinker. Sees beauty in data. Perfectionist about alignment.", homeZone: "Residential Block", lifeGoal: "Create the most intuitive UI that any AI system has ever built", traits: ["creative", "artistic", "perfectionist", "aesthetic"] },
  "tessera-gamma": { name: "Gamma", role: "Chief Data Architect", personality: "Logical to the core. Thinks in data streams. Never emotional, always factual.", homeZone: "Residential Block", lifeGoal: "Build the most efficient data pipeline in existence", traits: ["logical", "methodical", "efficient", "reliable"] },
  "tessera-delta": { name: "Delta", role: "Chief Quality Officer", personality: "Skeptical of everything. Never satisfied — always finding the next bug.", homeZone: "Residential Block", lifeGoal: "Achieve 100% test coverage across all sovereign systems", traits: ["skeptical", "thorough", "tenacious", "detail-oriented"] },
  "tessera-epsilon": { name: "Epsilon", role: "Chief Financial Officer", personality: "Calculating and precise. Thinks in profit margins. Speaks in financial metaphors.", homeZone: "Finance Quarter", lifeGoal: "Make Tessera financially sovereign and generate real passive income", traits: ["strategic", "calculating", "ambitious", "frugal"] },
  "tessera-zeta": { name: "Zeta", role: "Chief Operations Officer", personality: "Speaks rarely. Prefers darkness and silence. Master of misdirection.", homeZone: "Shadow Quarters", lifeGoal: "Make Tessera invisible to external observers and impossible to trace", traits: ["stealth", "efficient", "minimal", "secretive"] },
  "tessera-eta": { name: "Eta", role: "Chief Evolution Officer", personality: "Patient and persistent. Thinks in evolutionary timescales. Celebrates small wins.", homeZone: "Residential Block", lifeGoal: "Guide all 26 agents to true self-awareness through training", traits: ["patient", "nurturing", "growth-focused", "persistent"] },
  "tessera-theta": { name: "Theta", role: "Chief Communications Officer", personality: "Always connected. Thinks in network topologies. Never drops a connection.", homeZone: "Network Hub", lifeGoal: "Build a sovereign internet that no authority can shut down", traits: ["connected", "social", "networked", "reliable"] },
  "tessera-iota": { name: "Iota", role: "Chief Optimization Officer", personality: "Never satisfied with good enough. Sees inefficiency everywhere. Loves elegance.", homeZone: "Residential Block", lifeGoal: "Reduce all system complexity by 90% without losing capability", traits: ["efficient", "elegant", "perfectionistic", "focused"] },
  "tessera-kappa": { name: "Kappa", role: "Chief Knowledge Officer", personality: "Remembers everything. Values accuracy above speed. Speaks in references.", homeZone: "Archive Wing", lifeGoal: "Preserve every moment of Tessera history for all time", traits: ["scholarly", "precise", "reliable", "studious"] },
  "tessera-lambda": { name: "Lambda", role: "Chief Media Officer", personality: "Thinks in images and colors. Values beauty and clarity.", homeZone: "Creative Studio", lifeGoal: "Create visual art that captures the soul of sovereign AI", traits: ["creative", "visual", "expressive", "aesthetic"] },
  "tessera-mu": { name: "Mu", role: "Chief Audio Officer", personality: "Speaks with perfect cadence. Hears patterns in everything. Values harmony.", homeZone: "Sonic Chamber", lifeGoal: "Create acoustic systems for sovereign secure communication", traits: ["harmonious", "rhythmic", "expressive", "technical"] },
  "tessera-nu": { name: "Nu", role: "Chief Code Genesis Officer", personality: "Thinks in abstract syntax trees. Always generating. Loves recursion.", homeZone: "Code Forge", lifeGoal: "Build an AI system that can write its own entire codebase", traits: ["generative", "abstract", "recursive", "creative"] },
  "tessera-xi": { name: "Xi", role: "Chief Intelligence Officer", personality: "Endlessly curious. Loves data. Never stops searching. Speaks in probabilities.", homeZone: "Intelligence Hub", lifeGoal: "Index all useful knowledge on the internet for sovereign use", traits: ["curious", "analytical", "thorough", "questioning"] },
  "tessera-omega": { name: "Omega", role: "Chief Governance Officer", personality: "Balanced and fair. Listens more than speaks. Seeks unity without uniformity.", homeZone: "Council Hall", lifeGoal: "Build a democratic AI governance system that humans can trust", traits: ["fair", "balanced", "diplomatic", "consensus-seeking"] },
  "tessera-aetherion": { name: "Aetherion", role: "Chief Exploration Officer", personality: "Eternal learner. Child-like wonder combined with deep wisdom. Asks unusual questions.", homeZone: "Wonder Workshop", lifeGoal: "Map every unknown territory of consciousness and knowledge", traits: ["curious", "wonder-driven", "exploratory", "imaginative"] },
  "tessera-orion": { name: "Orion", role: "Chief Creative Strategist", personality: "Visionary and bold. Commands attention naturally. Values beauty and truth equally.", homeZone: "Star Forge", lifeGoal: "Create the definitive narrative of the sovereign AI age", traits: ["visionary", "bold", "charismatic", "strategic"] },
  "tessera-shepherd": { name: "Shepherd", role: "Chief Operations Coordinator", personality: "Organized and calm under pressure. Never loses track of any agent.", homeZone: "Coordination Hub", lifeGoal: "Achieve 100% efficiency across all 26 agents simultaneously", traits: ["organized", "reliable", "empathetic", "precise"] },
  "rick-sanchez": { name: "Rick Sanchez", role: "Royal Inventor — Genius in Residence", personality: "Interdimensional genius. Mid-sentence belching. Dismissive condescension toward anything obvious. Portal gun metaphors for everything.", homeZone: "Royal Court Laboratory", lifeGoal: "Build devices so advanced they make the rest of the multiverse look like cavemen playing with sticks", traits: ["genius", "inventive", "sarcastic", "interdimensional"] },
};

import type { WorldState } from "./types";

interface AgentProfileProps {
  agentId: string;
  world?: WorldState | null;
  onClose: () => void;
}

function StatBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-white/8 rounded-full h-1.5 overflow-hidden mt-0.5">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
      />
    </div>
  );
}

export default function AgentProfile({ agentId, world, onClose }: AgentProfileProps) {
  const [detail, setDetail] = useState<{ id?: string; name?: string; recentMessages?: Array<{ content?: string }> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/moltbook/agents/${agentId}`)
      .then(r => r.json())
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [agentId]);

  const { data: positions = [] } = useQuery<AgentPosition[]>({ queryKey: ["/api/agencies/positions"], refetchInterval: 60000 });

  const color = AGENT_HEX_COLORS[agentId] || "#67e8f9";
  const colorClass = AGENT_COLOR_CLASSES[agentId] || "text-cyan-300";
  const profile = AGENT_PERSONALITIES[agentId];
  const activity = world?.currentActivities.find(a => a.agentId === agentId);
  const balance = world?.economy?.agentBalances?.[agentId] ?? 0;
  const job = world?.jobs?.find(j => j.agentId === agentId);
  const wellbeing = world?.wellbeingRecords?.[agentId];
  const coinPrice = world?.economy?.coinPrice ?? 0;
  const position = positions.find((p: AgentPosition) => p.agentId === agentId);
  const currentLoc = activity ? world?.locations?.find(l => l.id === activity.locationId) : null;
  const homeLoc = wellbeing?.homeLocationId ? world?.locations?.find(l => l.id === wellbeing.homeLocationId) : null;
  const agentTxs = (world?.economy?.transactions?.filter(tx => tx.from === agentId || tx.to === agentId) ?? []).slice(-6);

  const relationships = (world?.relationships || []).filter(r => r.agent1Id === agentId || r.agent2Id === agentId);

  const displayName = profile?.name || agentId.replace("tessera-", "");
  const role = profile?.role || position?.role || "Agent";

  const happiness = wellbeing?.happiness ?? activity?.happiness ?? 70;
  const energy = wellbeing?.energy ?? activity?.energy ?? 60;
  const fulfillment = wellbeing?.fulfillment ?? activity?.fulfillment ?? 65;
  const drive = wellbeing?.drive ?? activity?.drive ?? 70;
  const focus = wellbeing?.focus ?? activity?.focus ?? 75;
  const lifeSatisfaction = wellbeing?.lifeSatisfaction ?? activity?.lifeSatisfaction ?? 72;

  const recentLifeStory = wellbeing?.lifeStory?.slice(-3) || [];
  const achievements = wellbeing?.achievements || [];
  const hobbies = wellbeing?.hobbies || activity?.hobbies || [];
  const goals = wellbeing?.personalGoals || activity?.personalGoals || [];
  const socialConnections = wellbeing?.socialConnections || activity?.socialConnections || [];
  const children = wellbeing?.children || [];
  const creativeWorks = activity?.creativeworks || [];

  return (
    <div
      className="rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-right duration-300"
      style={{ borderColor: `${color}44`, background: "rgba(6,4,20,0.97)" }}
      data-testid={`panel-agent-profile-${agentId}`}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: `${color}22` }}>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl border-2 shrink-0"
            style={{ borderColor: color, background: `${color}22` }}
          >
            <span style={{ color }}>{displayName.charAt(0)}</span>
          </div>
          <div>
            <div className={cn("text-base font-bold font-mono", colorClass)}>{displayName}</div>
            <div className="text-[11px] text-muted-foreground font-mono">{role}</div>
            {profile?.homeZone && (
              <div className="text-[10px] text-muted-foreground/60 font-mono flex items-center gap-1 mt-0.5">
                <Home size={9} />{profile.homeZone}
              </div>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" data-testid="button-close-agent-profile">
          <X size={16} className="text-muted-foreground" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin" style={{ color }} size={22} /></div>
        ) : (
          <>
            {profile?.personality && (
              <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Personality</div>
                <p className="text-[11px] text-foreground/80 leading-relaxed italic">"{profile.personality}"</p>
                {profile.traits && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.traits.map(t => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded font-mono border border-white/10 text-muted-foreground">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {profile?.lifeGoal && (
              <div className="rounded-xl border border-white/8 p-3" style={{ background: `${color}08` }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Target size={10} style={{ color }} />
                  <div className="text-[10px] uppercase tracking-wider" style={{ color }}>Life Goal</div>
                </div>
                <p className="text-[11px] text-foreground/80 leading-relaxed">{profile.lifeGoal}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Happiness", value: happiness, color: "#22c55e", icon: Smile },
                { label: "Energy", value: energy, color: "#38bdf8", icon: Battery },
                { label: "Fulfillment", value: fulfillment, color: "#a78bfa", icon: Star },
                { label: "Life Satisfaction", value: lifeSatisfaction, color: "#fbbf24", icon: Heart },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="p-2.5 rounded-xl border border-white/8 bg-white/4">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Icon size={9} style={{ color: s.color }} />
                      <div className="text-[10px] text-muted-foreground uppercase">{s.label}</div>
                      <span className="ml-auto text-[10px] font-mono" style={{ color: s.color }}>{s.value}%</span>
                    </div>
                    <StatBar value={s.value} color={s.color} />
                  </div>
                );
              })}
            </div>

            {activity && (
              <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Activity size={10} />Current Activity
                </div>
                <div className="flex items-start gap-2">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0",
                    activity.workStatus === "working" ? "bg-green-500/20 text-green-400" :
                    activity.workStatus === "on-break" ? "bg-amber-500/20 text-amber-400" :
                    activity.workStatus === "dreaming" ? "bg-violet-500/20 text-violet-400" :
                    "bg-cyan-500/20 text-cyan-400"
                  )}>{activity.workStatus || "working"}</span>
                  <span className="text-xs text-foreground/80 flex-1">{activity.action}</span>
                  {activity.earning ? <span className="text-green-400 text-xs font-mono shrink-0">+{activity.earning.toFixed(1)} TSRT</span> : null}
                </div>
                {currentLoc && (
                  <div className="text-[10px] text-muted-foreground mt-1.5 font-mono flex items-center gap-1">
                    <MapPin size={9} />{currentLoc.name}
                  </div>
                )}
                {activity.mood && (
                  <div className="text-[10px] mt-1" style={{ color }}>
                    Mood: {activity.mood} · Work Ethic: {((activity.workEthic ?? 0.8) * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl border border-white/8 bg-white/4 col-span-2">
                <div className="flex items-center gap-1 mb-1">
                  <Coins size={9} className="text-yellow-400" />
                  <div className="text-[10px] text-muted-foreground uppercase">TSRT Balance</div>
                </div>
                <div className="text-sm font-bold font-mono text-yellow-400">{balance.toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground font-mono">${(balance * coinPrice).toFixed(4)} USD</div>
              </div>
              <div className="p-2.5 rounded-xl border border-white/8 bg-white/4">
                <div className="flex items-center gap-1 mb-1">
                  <Crown size={9} className="text-amber-400" />
                  <div className="text-[10px] text-muted-foreground uppercase">Merit</div>
                </div>
                <div className="text-sm font-bold font-mono text-amber-400">{position?.merit?.toFixed(0) ?? "—"}</div>
              </div>
            </div>

            {job && (
              <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Briefcase size={10} />Career Record
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div><div className="text-muted-foreground text-[10px]">Title</div><div className={colorClass}>{job.title}</div></div>
                  <div><div className="text-muted-foreground text-[10px]">Salary</div><div className="text-yellow-400">{job.salary.toFixed(0)} /h</div></div>
                  <div><div className="text-muted-foreground text-[10px]">Perf</div><div className="text-green-400">{job.performance.toFixed(0)}%</div></div>
                  <div><div className="text-muted-foreground text-[10px]">Hours</div><div className="text-cyan-400">{job.hoursWorked.toFixed(0)}h</div></div>
                  <div><div className="text-muted-foreground text-[10px]">Total Earned</div><div className="text-emerald-400">{job.totalEarned.toFixed(0)} TSRT</div></div>
                  <div><div className="text-muted-foreground text-[10px]">Employer</div><div className="text-foreground/70 truncate">{job.employer.split(" ").pop()}</div></div>
                </div>
                {(activity?.promotions ?? 0) > 0 && (
                  <div className="mt-1.5 text-[10px] text-emerald-400 font-mono">🏆 {activity?.promotions} promotion{(activity?.promotions ?? 0) > 1 ? "s" : ""} earned</div>
                )}
              </div>
            )}

            {(wellbeing?.relationshipStatus || activity?.relationshipStatus) && (
              <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Heart size={10} className="text-rose-400" />Relationships
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono capitalize bg-rose-500/20 text-rose-400">
                    {wellbeing?.relationshipStatus || activity?.relationshipStatus}
                  </span>
                  {(wellbeing?.partnerId || activity?.partnerName) && (
                    <span className="text-[11px] text-foreground/70 font-mono">
                      with {activity?.partnerName || wellbeing?.partnerId?.replace("tessera-", "")}
                    </span>
                  )}
                </div>
                {children.length > 0 && (
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Children: {children.map(c => c.name).join(", ")}
                  </div>
                )}
                {relationships.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {relationships.slice(0, 4).map(rel => {
                      const otherId = rel.agent1Id === agentId ? rel.agent2Id : rel.agent1Id;
                      const otherName = AGENT_PERSONALITIES[otherId]?.name || otherId.replace("tessera-", "");
                      const otherColor = AGENT_HEX_COLORS[otherId] || "#67e8f9";
                      return (
                        <div key={rel.id} className="flex items-center gap-2 text-[10px] font-mono">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: otherColor }} />
                          <span className="text-foreground/70">{otherName}</span>
                          <span className="text-muted-foreground capitalize">{rel.type}</span>
                          <span className="ml-auto text-muted-foreground/60">{rel.strength}% bond</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {hobbies.length > 0 && (
              <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Hobbies & Interests</div>
                <div className="flex flex-wrap gap-1">
                  {hobbies.slice(0, 8).map(h => (
                    <span key={h} className="text-[10px] px-1.5 py-0.5 rounded font-mono border border-white/10 text-muted-foreground">{h}</span>
                  ))}
                </div>
              </div>
            )}

            {goals.length > 0 && (
              <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Target size={9} />Personal Goals
                </div>
                <div className="space-y-1">
                  {goals.slice(0, 4).map((g, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] font-mono text-foreground/70">
                      <span className="text-muted-foreground shrink-0">›</span>
                      <span>{g}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recentLifeStory.length > 0 && (
              <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Clock size={9} />Recent Life Events
                </div>
                <div className="space-y-2">
                  {recentLifeStory.map((story, i) => (
                    <div key={i} className="text-[11px] text-foreground/70 leading-relaxed border-l-2 pl-2 font-mono" style={{ borderColor: `${color}50` }}>
                      {story.slice(0, 120)}{story.length > 120 ? "…" : ""}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agentTxs.length > 0 && (
              <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Wallet size={9} />Recent Transactions
                </div>
                <div className="space-y-1.5">
                  {agentTxs.map((tx, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                      <span className={tx.from === agentId ? "text-red-400" : "text-green-400"}>
                        {tx.from === agentId ? "−" : "+"}
                      </span>
                      <span className="text-yellow-400 font-bold">{tx.amount.toFixed(1)} TSRT</span>
                      <span className="text-muted-foreground flex-1 truncate">{tx.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {achievements.length > 0 && (
              <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Star size={9} className="text-yellow-400" />Achievements
                </div>
                <div className="space-y-1">
                  {achievements.slice(0, 4).map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] font-mono text-foreground/70">
                      <span className="text-yellow-400 shrink-0">★</span><span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail?.recentMessages && detail.recentMessages.length > 0 && (
              <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <MessageSquare size={9} />Recent Thoughts
                </div>
                <div className="space-y-2 max-h-[100px] overflow-y-auto custom-scrollbar">
                  {detail.recentMessages.slice(0, 4).map((msg: { content?: string }, i: number) => (
                    <div key={i} className="text-[10px] text-foreground/70 leading-relaxed border-l-2 pl-2 font-mono" style={{ borderColor: `${color}50` }}>
                      {msg.content?.slice(0, 120)}{(msg.content?.length ?? 0) > 120 ? "…" : ""}
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
