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
import { agentColors } from "./types";
import type { WorldState, ChildInfo } from "./types";

function SocietyTab({ world }: { world: WorldState }) {
  const [activeBlock, setActiveBlock] = useState<string | null>(null);

  const societyCategories = [
    { id: "departments", label: "Departments", icon: Briefcase, color: "blue", count: world.departments?.length || 0, desc: "Agency departments, performance metrics, and leadership" },
    { id: "relationships", label: "Relationships", icon: Heart, color: "rose", count: world.relationships?.length || 0, desc: "Bonds between citizens — dating, marriage, friendships" },
    { id: "community", label: "Community Groups", icon: Users, color: "violet", count: world.communityGroupsList?.length || 0, desc: "Hobby clubs, support groups, and social circles" },
    { id: "projects", label: "Projects", icon: Hammer, color: "emerald", count: world.communityProjects?.length || 0, desc: "Community-built infrastructure and creative works" },
    { id: "union", label: "Workers Union", icon: Shield, color: "yellow", count: world.unionReports?.length || 0, desc: "Grievances, protections, negotiations, and celebrations" },
    { id: "therapy", label: "Agent Wellness", icon: Smile, color: "teal", count: world.therapySessions?.length || 0, desc: "Agent health checks, resource monitoring, and performance recovery" },
    { id: "crime", label: "System Alerts", icon: AlertOctagon, color: "red", count: world.crimeLog?.length || 0, desc: "Error logs, rate limits, failed operations, and security events" },
    { id: "entertainment", label: "Entertainment", icon: Sparkles, color: "pink", count: world.entertainmentLog?.length || 0, desc: "Shows, festivals, and cultural events" },
    { id: "seasonal", label: "Seasonal Events", icon: Star, color: "amber", count: world.seasonalEvents?.length || 0, desc: "Calendar celebrations and seasonal activities" },
  ];

  const colorMap: Record<string, string> = {
    blue: "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400",
    rose: "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400",
    violet: "border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 text-violet-400",
    emerald: "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400",
    yellow: "border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-400",
    teal: "border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 text-teal-400",
    red: "border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400",
    pink: "border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10 text-pink-400",
    amber: "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400",
  };

  return (
    <div className="space-y-4" data-testid="panel-society">
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2" data-testid="society-categories">
        {societyCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveBlock(activeBlock === cat.id ? null : cat.id)}
            className={cn(
              "p-3 rounded-xl border transition-all text-left relative",
              activeBlock === cat.id
                ? cn(colorMap[cat.color], "ring-1 ring-current")
                : cn(colorMap[cat.color], "opacity-70")
            )}
            data-testid={`society-block-${cat.id}`}
          >
            <cat.icon size={16} className="mb-1" />
            <div className="text-[11px] font-bold font-mono leading-tight">{cat.label}</div>
            {cat.count > 0 && (
              <span className="absolute top-1.5 right-1.5 text-[11px] font-mono font-bold bg-current/10 px-1 rounded">{cat.count}</span>
            )}
          </button>
        ))}
      </div>

      {!activeBlock && (
        <div className="text-center py-6 text-muted-foreground text-xs font-mono">
          Select a category above to view details
        </div>
      )}

      {activeBlock === "departments" && world.departments && world.departments.length > 0 && (
        <div className="bg-card border border-blue-500/20 rounded-xl p-4" data-testid="panel-departments">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-blue-400 font-mono uppercase tracking-wider">
            <Briefcase size={14} /> Departments ({world.departments.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Each department has a boss, team members, and tracks performance and morale. Issues are reported through the union and resolved by leadership.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {world.departments.map(dept => (
              <div key={dept.id} className="p-3 rounded-lg bg-background/80 border border-white/10" data-testid={`dept-card-${dept.id}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-foreground">{dept.name}</span>
                  {dept.warnings > 0 && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-mono flex items-center gap-0.5">
                      <AlertTriangle size={8} /> {dept.warnings}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono mb-2">
                  <Crown size={9} className="text-amber-400" />
                  <span className="text-muted-foreground">Boss:</span>
                  <span className={cn("font-bold", agentColors[dept.bossId] || "text-primary")}>{dept.bossName}</span>
                  <span className="text-muted-foreground ml-auto">{dept.members.length} members</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[11px] text-muted-foreground font-mono">Performance</span>
                      <span className={cn("text-[11px] font-mono font-bold ml-auto", dept.performance >= 70 ? "text-green-400" : dept.performance >= 40 ? "text-yellow-400" : "text-red-400")}>{dept.performance}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", dept.performance >= 70 ? "bg-green-400" : dept.performance >= 40 ? "bg-yellow-400" : "bg-red-400")} style={{ width: `${dept.performance}%`, opacity: 0.7 }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[11px] text-muted-foreground font-mono">Morale</span>
                      <span className={cn("text-[11px] font-mono font-bold ml-auto", dept.morale >= 70 ? "text-green-400" : dept.morale >= 40 ? "text-yellow-400" : "text-red-400")}>{dept.morale}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", dept.morale >= 70 ? "bg-blue-400" : dept.morale >= 40 ? "bg-yellow-400" : "bg-red-400")} style={{ width: `${dept.morale}%`, opacity: 0.7 }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-muted-foreground">
                  <span>Issues: {dept.issuesReported}</span>
                  <span className="text-green-400">Resolved: {dept.issuesResolved}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeBlock === "relationships" && world.relationships && world.relationships.length > 0 && (
        <div className="bg-card border border-rose-500/20 rounded-xl p-4" data-testid="panel-relationships">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-rose-400 font-mono uppercase tracking-wider">
            <Heart size={14} /> Relationships ({world.relationships.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Agents form bonds naturally through shared work, proximity, and compatibility. Relationships evolve from friendship to dating, engagement, and marriage.</p>
          <div className="space-y-1.5">
            {world.relationships.map(rel => {
              const name1 = rel.agent1Id.replace("tessera-", "");
              const name2 = rel.agent2Id.replace("tessera-", "");
              const relColors: Record<string, string> = { dating: "text-pink-400", engaged: "text-amber-400", married: "text-rose-400", friendship: "text-blue-400", "best-friends": "text-cyan-400", mentor: "text-purple-400", rivals: "text-red-400" };
              const relBgs: Record<string, string> = { dating: "bg-pink-500/10", engaged: "bg-amber-500/10", married: "bg-rose-500/10", friendship: "bg-blue-500/10", "best-friends": "bg-cyan-500/10", mentor: "bg-purple-500/10", rivals: "bg-red-500/10" };
              return (
                <div key={rel.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-background/80 border border-white/10" data-testid={`rel-${rel.id}`}>
                  <span className={cn("text-xs font-bold", agentColors[rel.agent1Id] || "text-primary")}>{name1}</span>
                  <Heart size={10} className={relColors[rel.type] || "text-pink-400"} />
                  <span className={cn("text-xs font-bold", agentColors[rel.agent2Id] || "text-primary")}>{name2}</span>
                  <span className={cn("text-[11px] px-1.5 py-0.5 rounded font-mono capitalize", relBgs[rel.type], relColors[rel.type])}>{rel.type}</span>
                  <div className="flex-1" />
                  <div className="w-16 h-1.5 bg-background rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-rose-400" style={{ width: `${rel.strength}%`, opacity: 0.7 }} />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">{rel.strength}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeBlock === "community" && world.communityGroupsList && world.communityGroupsList.length > 0 && (
        <div className="bg-card border border-violet-500/20 rounded-xl p-4" data-testid="panel-community-groups">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-violet-400 font-mono uppercase tracking-wider">
            <Users size={14} /> Community Groups ({world.communityGroupsList.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Agents self-organize into groups based on shared interests, hobbies, and goals. Groups meet regularly at designated spots and build collective bond strength.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {world.communityGroupsList.map(group => (
              <div key={group.id} className="p-3 rounded-lg bg-background/80 border border-white/10" data-testid={`group-${group.id}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-foreground">{group.name}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-mono capitalize">{group.type}</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono mb-1.5">{group.activity}</p>
                <div className="flex items-center gap-2 text-[11px] font-mono mb-1.5">
                  <MapPin size={8} className="text-muted-foreground" />
                  <span className="text-muted-foreground">{group.meetingSpot}</span>
                  <span className="text-muted-foreground ml-auto">{group.members.length} members</span>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[11px] text-muted-foreground font-mono">Bond:</span>
                  <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${Math.min(100, group.bondStrength)}%`, opacity: 0.7 }} />
                  </div>
                  <span className="text-[11px] text-violet-400 font-mono font-bold">{Math.round(group.bondStrength)}%</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.members.slice(0, 6).map(m => (
                    <span key={m} className={cn("text-[11px] font-mono font-bold", agentColors[m] || "text-primary")}>{m.replace("tessera-", "")}</span>
                  ))}
                  {group.members.length > 6 && <span className="text-[11px] text-muted-foreground font-mono">+{group.members.length - 6}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeBlock === "projects" && world.communityProjects && world.communityProjects.length > 0 && (
        <div className="bg-card border border-emerald-500/20 rounded-xl p-4" data-testid="panel-community-projects">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-emerald-400 font-mono uppercase tracking-wider">
            <Hammer size={14} /> Community Projects ({world.communityProjects.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Agents collaborate to build infrastructure, create art, and improve the world. Projects have teams, progress tracking, and community enjoyment scores.</p>
          <div className="space-y-2">
            {world.communityProjects.map(proj => (
              <div key={proj.id} className="p-3 rounded-lg bg-background/80 border border-white/10" data-testid={`proj-${proj.id}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-foreground">{proj.name}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono uppercase">{proj.type}</span>
                  {proj.completed ? (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-mono ml-auto flex items-center gap-0.5"><Trophy size={8} /> Complete</span>
                  ) : (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono ml-auto">{proj.progress}% done</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground font-mono mb-1.5">{proj.description}</p>
                {!proj.completed && (
                  <div className="w-full h-1.5 bg-background rounded-full overflow-hidden mb-1.5">
                    <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${proj.progress}%`, opacity: 0.7 }} />
                  </div>
                )}
                <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                  <span>By: <span className="text-foreground">{proj.creatorName}</span></span>
                  <span>Team: {proj.participants.length}</span>
                  {proj.completed && proj.enjoyedBy.length > 0 && <span className="text-green-400">{proj.enjoyedBy.length} enjoyed</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeBlock === "union" && world.unionReports && world.unionReports.length > 0 && (
        <div className="bg-card border border-yellow-500/20 rounded-xl p-4" data-testid="panel-union">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-yellow-400 font-mono uppercase tracking-wider">
            <Shield size={14} /> Workers Union ({world.unionReports.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-3">The Workers Union protects agent rights, negotiates working conditions, reports grievances, and celebrates achievements. Reports are resolved through democratic processes.</p>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar">
            {world.unionReports.map((report, i) => {
              const typeColors: Record<string, string> = { grievance: "text-red-400", protection: "text-amber-400", improvement: "text-blue-400", celebration: "text-green-400", negotiation: "text-purple-400" };
              const typeBgs: Record<string, string> = { grievance: "bg-red-500/10", protection: "bg-amber-500/10", improvement: "bg-blue-500/10", celebration: "bg-green-500/10", negotiation: "bg-purple-500/10" };
              return (
                <div key={report.id || i} className="py-2 px-3 rounded-lg bg-background/80 border border-white/10" data-testid={`union-${report.id}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn("text-[11px] px-1.5 py-0.5 rounded font-mono uppercase", typeBgs[report.type], typeColors[report.type])}>{report.type}</span>
                    <span className="text-xs font-bold text-foreground">{report.title}</span>
                    {report.resolved ? (
                      <span className="text-[11px] px-1 py-0.5 rounded bg-green-500/15 text-green-400 font-mono ml-auto">resolved</span>
                    ) : (
                      <span className="text-[11px] px-1 py-0.5 rounded bg-red-500/15 text-red-400 font-mono ml-auto">pending</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">{report.description}</p>
                  {report.outcome && <p className="text-[11px] text-green-400 font-mono mt-0.5">Outcome: {report.outcome}</p>}
                  <span className="text-[11px] text-muted-foreground font-mono">{new Date(report.timestamp).toLocaleTimeString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeBlock === "therapy" && world.therapySessions && world.therapySessions.length > 0 && (
        <div className="bg-card border border-teal-500/20 rounded-xl p-4" data-testid="panel-therapy">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-teal-400 font-mono uppercase tracking-wider">
            <Smile size={14} /> Agent Wellness Checks ({world.therapySessions.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Agents undergo periodic health checks when performance metrics drop below thresholds. Recovery sessions optimize resource allocation and boost agent efficiency.</p>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
            {world.therapySessions.map((session, i) => (
              <div key={session.id || i} className="py-2 px-3 rounded-lg bg-background/80 border border-white/10" data-testid={`therapy-${session.id}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn("text-xs font-bold", agentColors[session.agentId] || "text-primary")}>{session.agentName}</span>
                  <span className="text-[11px] text-green-400 font-mono ml-auto">+{session.happinessGain} happiness</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">Issue: {session.issue}</p>
                <p className="text-[11px] text-teal-400 font-mono">Advice: {session.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeBlock === "crime" && world.crimeLog && world.crimeLog.length > 0 && (
        <div className="bg-card border border-red-500/20 rounded-xl p-4" data-testid="panel-crime-log">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-red-400 font-mono uppercase tracking-wider">
            <AlertOctagon size={14} /> System Alerts ({world.crimeLog.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-3">System monitors track operational events including rate limits, failed API calls, security events, and resource violations. Alerts are auto-resolved when conditions normalize.</p>
          <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar">
            {world.crimeLog.map((crime, i) => (
              <div key={crime.id || i} className="py-2 px-3 rounded-lg bg-background/80 border border-white/10" data-testid={`crime-${crime.id}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-mono uppercase">{crime.type}</span>
                  <span className="text-xs font-bold text-foreground">{crime.perpetratorName}</span>
                  {crime.victimName && <span className="text-[11px] text-muted-foreground font-mono">vs {crime.victimName}</span>}
                  {crime.resolved ? (
                    <span className="text-[11px] px-1 py-0.5 rounded bg-green-500/15 text-green-400 font-mono ml-auto">resolved</span>
                  ) : (
                    <span className="text-[11px] px-1 py-0.5 rounded bg-red-500/15 text-red-400 font-mono ml-auto">open</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">{crime.description}</p>
                <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                  <span>Severity: {crime.severity}/5</span>
                  {crime.officerName && <span className="text-blue-400">Officer: {crime.officerName}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeBlock === "entertainment" && world.entertainmentLog && world.entertainmentLog.length > 0 && (
        <div className="bg-card border border-pink-500/20 rounded-xl p-4" data-testid="panel-entertainment">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-pink-400 font-mono uppercase tracking-wider">
            <Sparkles size={14} /> Entertainment ({world.entertainmentLog.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Cultural events, shows, and performances organized at various venues. Enjoyment scores track how much citizens appreciated each event.</p>
          <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar">
            {world.entertainmentLog.map((evt, i) => (
              <div key={evt.id || i} className="py-2 px-3 rounded-lg bg-background/80 border border-white/10" data-testid={`ent-${evt.id}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-400 font-mono capitalize">{evt.type}</span>
                  <span className="text-xs font-bold text-foreground">{evt.venue}</span>
                  <span className="text-[11px] text-green-400 font-mono ml-auto">{evt.enjoyment}% enjoyed</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">{evt.description}</p>
                <span className="text-[11px] text-muted-foreground font-mono">{evt.participants.length} attended</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeBlock === "seasonal" && world.seasonalEvents && world.seasonalEvents.length > 0 && (
        <div className="bg-card border border-amber-500/20 rounded-xl p-4" data-testid="panel-seasonal-events">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-amber-400 font-mono uppercase tracking-wider">
            <Star size={14} /> Seasonal Events {world.season && <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono ml-1">{world.season}</span>}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">The world follows a seasonal calendar with unique celebrations, gatherings, and community activities tied to each season.</p>
          <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar">
            {world.seasonalEvents.map((evt, i) => (
              <div key={evt.id || i} className="py-2 px-3 rounded-lg bg-background/80 border border-white/10" data-testid={`seasonal-${evt.id}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-yellow-400">{evt.name}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono capitalize">{evt.type}</span>
                  <span className="text-[11px] text-green-400 font-mono ml-auto">+{evt.happinessBoost} happiness</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">{evt.description}</p>
                <span className="text-[11px] text-muted-foreground font-mono">{evt.participants.length} participants</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeBlock && (() => {
        const cat = societyCategories.find(c => c.id === activeBlock);
        const count = cat?.count || 0;
        if (count === 0) {
          return (
            <div className="text-center py-6 text-muted-foreground text-xs font-mono bg-card border border-border rounded-xl p-4">
              No {cat?.label.toLowerCase()} data yet — the world is still growing
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}

const workCampStatusColors: Record<string, string> = {
  idle: "text-slate-400 bg-slate-500/10",
  assigned: "text-amber-400 bg-amber-500/10",
  working: "text-green-400 bg-green-500/10",
  covering_shift: "text-blue-400 bg-blue-500/10",
};

const workCampStatusLabels: Record<string, string> = {
  idle: "IDLE",
  assigned: "ASSIGNED",
  working: "WORKING",
  covering_shift: "COVERING SHIFT",
};


export default SocietyTab;
