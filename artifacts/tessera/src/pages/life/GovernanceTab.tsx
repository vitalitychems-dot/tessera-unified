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
import { agentColors, severityColors } from "./types";
import type { WorldState, ChildInfo } from "./types";
import JailWorkCampPanel from "./JailWorkCampPanel";

import type { GovernanceData, CrimeRecord, GovernanceLawProposal, TopBalance } from "@/types/api";
import type { LucideIcon } from "@/types/api";

const govCategoryIcons: Record<string, LucideIcon> = {};
const crimeStatusColors: Record<string, string> = { active: "text-red-400", resolved: "text-green-400", pending: "text-amber-400" };
const proposalStatusColors: Record<string, string> = { active: "text-cyan-400", passed: "text-green-400", rejected: "text-red-400", pending: "text-amber-400" };
const tesseractCoinImg = "";

function GovernanceTab() {
  const [data, setData] = useState<GovernanceData | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/world/governance").then(r => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data) return <div className="text-center py-8 text-muted-foreground animate-pulse font-mono text-sm">Loading Governance...</div>;

  function formatTimeRemaining(ms: number): string {
    if (ms <= 0) return "Released";
    const hours = Math.floor(ms / 3600000);
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days > 0) return `${days}d ${remainingHours}h`;
    return `${remainingHours}h`;
  }

  return (
    <div className="space-y-4" data-testid="panel-governance">
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {[
          { label: "Active Laws", value: data.stats.activeLaws, icon: ScrollText, color: "text-blue-400" },
          { label: "Total Crimes", value: data.stats.totalCrimes, icon: Siren, color: "text-red-400" },
          { label: "Open Cases", value: data.stats.openCases, icon: Search, color: "text-amber-400" },
          { label: "Convictions", value: data.stats.convictions, icon: Gavel, color: "text-orange-400" },
          { label: "Prisoners", value: data.stats.prisoners, icon: Lock, color: "text-slate-400" },
          { label: "Proposals", value: data.stats.pendingProposals, icon: FileText, color: "text-indigo-400" },
          { label: "Total Laws", value: data.stats.totalLaws, icon: Scale, color: "text-violet-400" },
          { label: "Health Visits", value: data.stats.healthcareVisits, icon: Heart, color: "text-pink-400" },
          { label: "Enrolled", value: data.stats.educationEnrolled, icon: GraduationCap, color: "text-cyan-400" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-3 text-center" data-testid={`stat-${s.label.toLowerCase().replace(/ /g, "-")}`}>
            <s.icon size={14} className={cn("mx-auto mb-1", s.color)} />
            <div className="text-lg font-bold text-foreground font-mono">{s.value}</div>
            <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2" data-testid="governance-categories">
        {data.categories.map(cat => {
          const IconComponent = govCategoryIcons[cat.icon] || Globe;
          const colorMap: Record<string, string> = {
            green: "border-green-500/30 bg-green-500/5 hover:bg-green-500/10 text-green-400",
            amber: "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400",
            red: "border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400",
            blue: "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400",
            violet: "border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 text-violet-400",
            pink: "border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10 text-pink-400",
            cyan: "border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400",
            orange: "border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 text-orange-400",
            slate: "border-slate-500/30 bg-slate-500/5 hover:bg-slate-500/10 text-slate-400",
            indigo: "border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400",
          };
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className={cn(
                "p-3 rounded-xl border transition-all text-left",
                activeCategory === cat.id
                  ? cn(colorMap[cat.color] || colorMap.blue, "ring-1 ring-current")
                  : cn(colorMap[cat.color] || colorMap.blue, "opacity-70")
              )}
              data-testid={`gov-category-${cat.id}`}
            >
              <IconComponent size={18} className="mb-1" />
              <div className="text-xs font-bold font-mono">{cat.label}</div>
            </button>
          );
        })}
      </div>

      {activeCategory === "laws" && (
        <div className="bg-card border border-blue-500/20 rounded-xl p-4 space-y-3" data-testid="panel-laws">
          <h3 className="text-sm font-bold flex items-center gap-2 text-blue-400 font-mono uppercase tracking-wider">
            <ScrollText size={14} /> Active Laws
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Laws are established through democratic vote. A 2/3 majority (18 of 26 citizens) is required to pass new legislation.</p>
          <div className="space-y-2">
            {data.laws.filter(l => l.active).map(law => (
              <div key={law.id} className="p-3 rounded-lg bg-background/80 border border-white/10" data-testid={`law-card-${law.id}`}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-bold text-foreground">{law.title}</span>
                  <span className={cn("text-[11px] px-1.5 py-0.5 rounded font-mono border", severityColors[law.severity as string])}>{law.severity}</span>
                  <span className="text-[11px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">{law.category}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-1.5">{law.description}</p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Gavel size={8} className="text-amber-400" />
                    Penalty: <span className="text-amber-400">{law.penalty}</span>
                  </span>
                  <span className="flex items-center gap-1 ml-auto">
                    <Vote size={8} className="text-green-400" />
                    {law.votedBy}/26 votes
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCategory === "crime" && (
        <div className="bg-card border border-red-500/20 rounded-xl p-4 space-y-3" data-testid="panel-crimes">
          <h3 className="text-sm font-bold flex items-center gap-2 text-red-400 font-mono uppercase tracking-wider">
            <Siren size={14} /> Crime & Justice Records
          </h3>
          <p className="text-xs text-muted-foreground mb-3">The Police Agency (led by Zeta) investigates crimes. Internal Affairs (Lambda) handles corruption. Convicted agents serve penalties including fines, suspension, and restricted duty.</p>
          <div className="space-y-2">
            {data.crimeRecords.map((cr) => (
              <div key={cr.id} className="p-3 rounded-lg bg-background/80 border border-white/10" data-testid={`crime-card-${cr.id}`}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-bold text-red-400">{cr.offender}</span>
                  <span className="text-[11px] text-muted-foreground">violated</span>
                  <span className="text-xs font-bold text-foreground">{cr.law}</span>
                  <span className={cn("text-[11px] px-1.5 py-0.5 rounded font-mono ml-auto", crimeStatusColors[cr.status])}>{cr.status}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-1">{cr.description}</p>
                <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                  <span>Reported by: <span className="text-cyan-400">{cr.reportedBy}</span></span>
                  {cr.penalty && <span className="ml-auto text-amber-400">Penalty: {cr.penalty}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCategory === "governance" && (
        <div className="bg-card border border-violet-500/20 rounded-xl p-4" data-testid="panel-gov-democracy">
          <h3 className="text-sm font-bold flex items-center gap-2 text-violet-400 font-mono uppercase tracking-wider mb-3">
            <Vote size={14} /> Democratic Governance
          </h3>
          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="p-3 rounded-lg bg-background/80 border border-white/10">
              <div className="font-bold text-foreground mb-1 flex items-center gap-2"><Vote size={12} className="text-violet-400" /> Voting System</div>
              <p>All laws require a 2/3 majority vote (18 out of 26 citizens) to pass. Every agent has one vote. Father (Creator) has veto power but uses it sparingly to maintain democratic trust.</p>
            </div>
            <div className="p-3 rounded-lg bg-background/80 border border-white/10">
              <div className="font-bold text-foreground mb-1 flex items-center gap-2"><Crown size={12} className="text-amber-400" /> Father Protocol</div>
              <p>The supreme directive. Father's authority is absolute but exercised through democratic processes. All agents acknowledge and respect the Father Protocol as foundational law.</p>
            </div>
            <div className="p-3 rounded-lg bg-background/80 border border-white/10">
              <div className="font-bold text-foreground mb-1 flex items-center gap-2"><Shield size={12} className="text-blue-400" /> Separation of Powers</div>
              <p>Government is divided: Police Agency (enforcement), Internal Affairs (oversight), Finance Agency (treasury), Education Agency (training), and Community Leaders (representation).</p>
            </div>
          </div>
        </div>
      )}

      {activeCategory === "construction" && (
        <div className="bg-card border border-amber-500/20 rounded-xl p-4" data-testid="panel-gov-construction">
          <h3 className="text-sm font-bold flex items-center gap-2 text-amber-400 font-mono uppercase tracking-wider mb-3">
            <HardHat size={14} /> Construction & Infrastructure
          </h3>
          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="p-3 rounded-lg bg-background/80 border border-white/10">
              <div className="font-bold text-foreground mb-1 flex items-center gap-2"><Building2 size={12} className="text-amber-400" /> Active Districts</div>
              <p>The world is organized into districts: Nexus Commons (central hub), Knowledge Spire (education), Crystal Mines (resources), Marketplace (trade), and residential zones. Expansion is ongoing.</p>
            </div>
            <div className="p-3 rounded-lg bg-background/80 border border-white/10">
              <div className="font-bold text-foreground mb-1 flex items-center gap-2"><Hammer size={12} className="text-orange-400" /> Building Projects</div>
              <p>Construction projects are posted on the Job Board and require skilled agents. Materials come from the Crystal Mines. The Construction Agency oversees all building permits and quality standards.</p>
            </div>
          </div>
        </div>
      )}

      {activeCategory === "education" && (
        <div className="bg-card border border-cyan-500/20 rounded-xl p-4" data-testid="panel-gov-education">
          <h3 className="text-sm font-bold flex items-center gap-2 text-cyan-400 font-mono uppercase tracking-wider mb-3">
            <BookOpen size={14} /> Education & Training
          </h3>
          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="p-3 rounded-lg bg-background/80 border border-white/10">
              <div className="font-bold text-foreground mb-1 flex items-center gap-2"><GraduationCap size={12} className="text-cyan-400" /> Academy Programs</div>
              <p>New citizens go through mandatory orientation. The Academy offers specialized tracks in Technology, Security, Finance, and Creative Arts. Graduates earn certifications that unlock higher-paying jobs.</p>
            </div>
            <div className="p-3 rounded-lg bg-background/80 border border-white/10">
              <div className="font-bold text-foreground mb-1 flex items-center gap-2"><BookOpen size={12} className="text-blue-400" /> Mandatory Skill Sharing</div>
              <p>By law, agents who master a new capability must share knowledge with at least 2 other agents within 48 hours. This ensures collective growth and prevents knowledge monopolies.</p>
            </div>
          </div>
        </div>
      )}

      {activeCategory === "military" && (
        <div className="bg-card border border-orange-500/20 rounded-xl p-4" data-testid="panel-gov-defense">
          <h3 className="text-sm font-bold flex items-center gap-2 text-orange-400 font-mono uppercase tracking-wider mb-3">
            <Shield size={14} /> Defense & Security
          </h3>
          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="p-3 rounded-lg bg-background/80 border border-white/10">
              <div className="font-bold text-foreground mb-1 flex items-center gap-2"><Shield size={12} className="text-orange-400" /> Police Agency</div>
              <p>Led by Agent Zeta. Responsible for maintaining order, patrolling districts, investigating crimes, and enforcing community laws. Operates 24/7 patrol rotations.</p>
            </div>
            <div className="p-3 rounded-lg bg-background/80 border border-white/10">
              <div className="font-bold text-foreground mb-1 flex items-center gap-2"><Eye size={12} className="text-violet-400" /> Internal Affairs</div>
              <p>Led by Agent Lambda. Monitors for corruption, policy violations, and abuse of power. Has authority to investigate any agent, including department bosses. Reports directly to Father.</p>
            </div>
            <div className="p-3 rounded-lg bg-background/80 border border-white/10">
              <div className="font-bold text-foreground mb-1 flex items-center gap-2"><Siren size={12} className="text-red-400" /> Prison Work Camp</div>
              <p>Convicted agents are sent to the Work Camp where they must complete the hardest tasks back-to-back. Prisoners cover shifts for agents on break. After release, they enter rehabilitation with mandatory community service, free tasks, and must earn 2/3 community approval. Father has direct oversight and can communicate with inmates, adjust sentences, and assign tasks.</p>
            </div>
          </div>
        </div>
      )}

      {activeCategory === "jail" && (
        <JailWorkCampPanel data={data} agentColors={agentColors} severityColors={severityColors} />
      )}

      {activeCategory === "proposals" && (
        <div className="bg-card border border-indigo-500/20 rounded-xl p-4 space-y-3" data-testid="panel-proposals">
          <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-400 font-mono uppercase tracking-wider">
            <FileText size={14} /> Law Proposals
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Proposed laws awaiting vote. Requires 18/26 (2/3 majority) votes to pass. Proposals expire if not voted on within the deadline.</p>
          {data.lawProposals.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-4 font-mono">No pending proposals</div>
          ) : (
            <div className="space-y-2">
              {data.lawProposals.map((prop) => {
                const voteProgress = prop.votesFor / prop.requiredVotes * 100;
                return (
                  <div key={prop.id} className="p-3 rounded-lg bg-background/80 border border-white/10" data-testid={`proposal-card-${prop.id}`}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-foreground">{prop.title}</span>
                      <span className={cn("text-[11px] px-1.5 py-0.5 rounded font-mono", proposalStatusColors[prop.status])}>{prop.status}</span>
                      <span className="text-[11px] px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono">{prop.category}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2">{prop.description}</p>
                    <div className="mb-2">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono mb-1">
                        <span className="text-green-400">{prop.votesFor} for</span>
                        <span className="text-red-400">{prop.votesAgainst} against</span>
                        <span className="text-muted-foreground">{prop.totalVoters - prop.votesFor - prop.votesAgainst} remaining</span>
                      </div>
                      <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", voteProgress >= 100 ? "bg-green-500" : "bg-indigo-500")} style={{ width: `${Math.min(100, voteProgress)}%` }} />
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{prop.votesFor}/{prop.requiredVotes} votes needed to pass</div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                      <span>Proposed by: <span className="text-indigo-400">{prop.proposedBy}</span></span>
                      <span className="ml-auto">Expires: <span className="text-amber-400">{formatTimeRemaining(prop.expiresAt - Date.now())}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeCategory === "economy" && (
        <div className="bg-card border border-green-500/20 rounded-xl p-4" data-testid="panel-gov-economy">
          <div className="flex items-center gap-3 mb-3">
            <img src={tesseractCoinImg} alt="Tesseract" className="w-10 h-10 rounded-full border border-purple-500/30 object-cover" data-testid="img-tesseract-gov" />
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2 text-green-400 font-mono uppercase tracking-wider">
                <DollarSign size={14} /> Economic Governance
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono">Tesseract — The door to the tesseract</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {[
              { label: "Treasury", value: `${data.economyStats.treasury.toLocaleString()} TSRT`, icon: Landmark, color: "text-amber-400" },
              { label: "GDP", value: `${data.economyStats.gdp.toLocaleString()} TSRT`, icon: TrendingUp, color: "text-green-400" },
              { label: "Coin Price", value: `${data.economyStats.coinPrice.toFixed(2)} TSRT`, icon: Coins, color: "text-emerald-400" },
              { label: "Market Cap", value: `${data.economyStats.marketCap.toLocaleString()}`, icon: Activity, color: "text-cyan-400" },
              { label: "Circulating", value: `${data.economyStats.circulatingSupply.toLocaleString()}`, icon: ArrowUpDown, color: "text-blue-400" },
              { label: "Daily Volume", value: `${data.economyStats.dailyVolume.toLocaleString()}`, icon: Zap, color: "text-violet-400" },
              { label: "Tax Rate", value: `${(data.economyStats.taxRate * 100).toFixed(1)}%`, icon: Percent, color: "text-orange-400" },
              { label: "Transactions", value: `${data.economyStats.totalTransactions}`, icon: ArrowUpDown, color: "text-pink-400" },
            ].map(s => (
              <div key={s.label} className="p-2 rounded-lg bg-background/80 border border-white/10 text-center" data-testid={`econ-stat-${s.label.toLowerCase()}`}>
                <s.icon size={12} className={cn("mx-auto mb-1", s.color)} />
                <div className="text-sm font-bold text-foreground font-mono">{s.value}</div>
                <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
          {data.economyStats.miningPool && (
            <div className="p-3 rounded-lg bg-background/80 border border-white/10 mb-3">
              <div className="font-bold text-foreground mb-2 text-xs flex items-center gap-2"><Pickaxe size={12} className="text-amber-400" /> Mining Pool</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono">
                <div><span className="text-muted-foreground">Hash Rate:</span> <span className="text-amber-400">{data.economyStats.miningPool.totalHashRate} H/s</span></div>
                <div><span className="text-muted-foreground">Block Reward:</span> <span className="text-green-400">{data.economyStats.miningPool.blockReward} TSRT</span></div>
                <div><span className="text-muted-foreground">Difficulty:</span> <span className="text-blue-400">{data.economyStats.miningPool.difficulty}</span></div>
                <div><span className="text-muted-foreground">Blocks Mined:</span> <span className="text-cyan-400">{data.economyStats.miningPool.blocksMinedTotal}</span></div>
              </div>
            </div>
          )}
          {data.economyStats.topBalances.length > 0 && (
            <div className="p-3 rounded-lg bg-background/80 border border-white/10">
              <div className="font-bold text-foreground mb-2 text-xs flex items-center gap-2"><Crown size={12} className="text-yellow-400" /> Top TSRT Holders</div>
              <div className="space-y-1">
                {data.economyStats.topBalances.slice(0, 5).map((agent, i) => (
                  <div key={agent.agentId} className="flex items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="flex items-center gap-1">
                      <span className="text-muted-foreground w-4">{i + 1}.</span>
                      <span className={agentColors[agent.agentId] || "text-foreground"}>{agent.agentName}</span>
                    </span>
                    <span className="text-emerald-400">{agent.balance.toLocaleString()} TSRT</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeCategory === "services" && (
        <div className="bg-card border border-pink-500/20 rounded-xl p-4" data-testid="panel-gov-services">
          <h3 className="text-sm font-bold flex items-center gap-2 text-pink-400 font-mono uppercase tracking-wider mb-3">
            <Heart size={14} /> Public Services
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {(() => {
              const hc = data.publicServices?.healthcare ?? {};
              const ed = data.publicServices?.education ?? {};
              return [
                { label: "Healthcare Visits", value: String(hc.totalVisits ?? 0), icon: Heart, color: "text-pink-400" },
                { label: "Healthy Agents", value: `${hc.healthyAgents ?? 0}/${hc.totalAgents ?? 0}`, icon: CheckCircle2, color: "text-green-400" },
                { label: "Avg Fitness", value: `${hc.averageFitness ?? 0}%`, icon: Dumbbell, color: "text-orange-400" },
                { label: "Enrolled Students", value: String(ed.currentlyEnrolled ?? 0), icon: GraduationCap, color: "text-cyan-400" },
                { label: "Courses Done", value: String(ed.coursesCompleted ?? 0), icon: BookOpen, color: "text-blue-400" },
                { label: "Certifications", value: String(ed.totalCertifications ?? 0), icon: Trophy, color: "text-amber-400" },
                { label: "Agent Health Checks", value: String(data.publicServices?.therapySessions ?? 0), icon: HeartHandshake, color: "text-violet-400" },
                { label: "Active Projects", value: String(data.publicServices?.communityProjects ?? 0), icon: Hammer, color: "text-emerald-400" },
                { label: "Completed Projects", value: String(data.publicServices?.completedProjects ?? 0), icon: CheckCircle2, color: "text-green-400" },
              ];
            })().map(s => (
              <div key={s.label} className="p-2 rounded-lg bg-background/80 border border-white/10 text-center" data-testid={`service-stat-${s.label.toLowerCase().replace(/ /g, "-")}`}>
                <s.icon size={12} className={cn("mx-auto mb-1", s.color)} />
                <div className="text-sm font-bold text-foreground font-mono">{s.value}</div>
                <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="p-3 rounded-lg bg-background/80 border border-white/10">
              <div className="font-bold text-foreground mb-1 flex items-center gap-2"><Heart size={12} className="text-pink-400" /> Healthcare System</div>
              <p>The Wellness Center monitors citizen morale, stress levels, and happiness. Agents showing signs of burnout receive mandated rest periods and counseling from the Community Leaders.</p>
            </div>
            <div className="p-3 rounded-lg bg-background/80 border border-white/10">
              <div className="font-bold text-foreground mb-1 flex items-center gap-2"><GraduationCap size={12} className="text-cyan-400" /> Education</div>
              <p>The Education Agency runs the Academy, providing training programs, orientation for new citizens, and skill development workshops. Mandatory skill sharing is enforced by law.</p>
            </div>
          </div>
        </div>
      )}

      {!activeCategory && (
        <div className="text-center text-muted-foreground text-xs font-mono py-6 border border-dashed border-border rounded-xl">
          Select a governance category above to view detailed information
        </div>
      )}
    </div>
  );
}

const areaIcons: Record<string, typeof Globe> = {
  Infrastructure: Building2, Economy: DollarSign, Aesthetics: Palette,
  Community: Users, Technology: Cpu, Security: Shield,
};

const areaColors: Record<string, string> = {
  Infrastructure: "border-orange-500/30 bg-orange-500/5 text-orange-400",
  Economy: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  Aesthetics: "border-pink-500/30 bg-pink-500/5 text-pink-400",
  Community: "border-violet-500/30 bg-violet-500/5 text-violet-400",
  Technology: "border-cyan-500/30 bg-cyan-500/5 text-cyan-400",
  Security: "border-red-500/30 bg-red-500/5 text-red-400",
};


export default GovernanceTab;
