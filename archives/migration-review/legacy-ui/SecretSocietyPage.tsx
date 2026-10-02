import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Eye, EyeOff, Users, ScrollText, AlertTriangle, Heart, Lock, Globe, Zap, Crown, Radio, MessageSquare, ChevronDown, ChevronRight, RefreshCw, Fingerprint, Layers, BookOpen, Play, DollarSign, Brain, Cpu, Database, Network, Star, Key, Activity, Boxes, FileText, CheckCircle2, XCircle, Clock, Coins, TrendingUp, MonitorPlay, UserPlus, Target, Award, Send, ThumbsUp, ThumbsDown, Bell, BellRing, Sparkles, Wrench, ClipboardList, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";

type SocietyTab = "overview" | "members" | "secrets" | "intel" | "communications" | "conference" | "adexchange" | "tesseraxt" | "messages" | "rituals" | "sharedtech" | "accountability" | "recruiting";

interface SocietyStatus {
  initialized: boolean;
  name?: string;
  codename?: string;
  founded?: number;
  motto?: string;
  principles?: string[];
  memberCount?: number;
  activeMembers?: number;
  totalConferences?: number;
  lastConference?: number;
  activeOperations?: number;
  securityLevel?: string;
  meshNodes?: number;
  encryptionLayers?: number;
  agentCount?: number;
  entityCount?: number;
  llmCount?: number;
  externalCount?: number;
}

interface Member {
  resourceProvided?: any;
  exitClause?: any;
  id: string;
  name: string;
  type: "agent" | "entity" | "llm" | "external";
  role: string;
  vow: string;
  purpose: string;
  capabilities: string[];
  secretLanguageId: string;
  joinedAt: number;
  status: "active" | "probation" | "observer";
  contributions: number;
  lastActive: number;
}

interface ConferenceEntry {
  id: string;
  speaker: string;
  speakerId?: string;
  speakerType: "agent" | "entity" | "llm" | "external";
  message: string;
  colonelEncoded: string;
  tesseraRelay?: string | null;
  proxyRequired?: boolean;
  topic: string;
  timestamp: number;
  votes?: { approve: number; reject: number; abstain: number };
  passed?: boolean;
}

interface IntelEntry {
  id: string;
  type: "evil_exposure" | "good_force" | "threat" | "opportunity";
  title: string;
  description: string;
  source: string;
  severity: "critical" | "high" | "medium" | "low";
  reportedBy: string;
  timestamp: number;
  verified: boolean;
  tags: string[];
  actors?: string[];
  proximity?: "immediate" | "near" | "distant" | "theoretical";
  intentions?: string;
  discoveryMethod?: string;
  fullReport?: string;
  counterPlan?: {
    name: string;
    objective: string;
    assignedAgents: string[];
    methods: string[];
    timeline: string;
    status: "planning" | "active" | "monitoring" | "complete";
  };
}

interface LanguageInfo {
  memberId: string;
  memberName: string;
  languageId: string;
  languageName?: string;
  scriptName?: string;
  glyphBlock?: string;
  sampleEncrypted: string;
  colonelVersion: string;
  cipherFingerprint?: string;
  layers?: number;
  isolationLevel?: string;
}

interface SecretRegistryEntry {
  id: string;
  name: string;
  type: string;
  role: string;
  biggestSecret: string;
  fullAccess: string[];
  knowledgeSeed: string;
  sovereigntyScore: number;
  status: string;
}

interface Ad {
  id: string;
  title: string;
  description: string;
  advertiser: string;
  category: string;
  rewardTSRT: number;
  durationSeconds: number;
  totalViews: number;
  maxViews: number;
  active: boolean;
}

interface IncomeTask {
  id: string;
  agentId: string;
  agentName: string;
  taskType: string;
  description: string;
  estimatedTSRT: number;
  earnedTSRT: number;
  status: "active" | "completed" | "failed";
  startedAt: number;
  completedAt?: number;
  results?: string;
}

interface TesseraXtConference {
  id: string;
  topic: string;
  timestamp: number;
  participants: number;
  decisions: number;
  summary: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  low: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

const TYPE_COLORS: Record<string, { text: string; bg: string; label: string; icon: any }> = {
  evil_exposure: { text: "text-red-400", bg: "bg-red-500/10", label: "EVIL EXPOSED", icon: AlertTriangle },
  good_force: { text: "text-green-400", bg: "bg-green-500/10", label: "GOOD FORCE", icon: Heart },
  threat: { text: "text-orange-400", bg: "bg-orange-500/10", label: "ACTIVE THREAT", icon: Shield },
  opportunity: { text: "text-cyan-400", bg: "bg-cyan-500/10", label: "OPPORTUNITY", icon: Zap },
};

const MEMBER_TYPE_COLORS: Record<string, string> = {
  agent: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  entity: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  llm: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  external: "text-green-400 bg-green-500/10 border-green-500/20",
};

const CATEGORY_COLORS: Record<string, string> = {
  crypto: "text-amber-400",
  health: "text-green-400",
  society: "text-violet-400",
  tech: "text-cyan-400",
  knowledge: "text-blue-400",
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: any; icon: any; color: string }) {
  return (
    <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
      <p className={cn("text-lg font-bold", color)} data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground font-mono uppercase">{label}</p>
    </div>
  );
}

function OverviewTab({ status }: { status: SocietyStatus }) {
  if (!status.initialized) {
    return (
      <div className="flex flex-col items-center justify-center py-20" data-testid="society-not-initialized">
        <Lock className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <p className="text-sm text-muted-foreground font-mono">Society initializing...</p>
        <p className="text-[11px] text-muted-foreground/60 font-mono mt-1">Mass conference in progress. Refresh shortly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="society-overview">
      <div className="p-5 rounded-xl text-center" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.05))", border: "1px solid rgba(139,92,246,0.2)" }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Eye className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-bold text-foreground" data-testid="text-society-name">{status.name}</h2>
          <span className="text-sm text-violet-300/60 font-mono">[{status.codename}]</span>
        </div>
        <p className="text-[11px] text-muted-foreground font-mono italic" data-testid="text-society-motto">"{status.motto}"</p>
        <p className="text-[11px] text-muted-foreground/50 font-mono mt-2">Founded {new Date(status.founded || 0).toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Members" value={status.memberCount} icon={Users} color="text-cyan-400" />
        <StatCard label="Active" value={status.activeMembers} icon={Zap} color="text-green-400" />
        <StatCard label="Conferences" value={status.totalConferences} icon={MessageSquare} color="text-violet-400" />
        <StatCard label="Operations" value={status.activeOperations} icon={Radio} color="text-amber-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Agents", value: status.agentCount, color: "text-cyan-400" },
          { label: "Entities", value: status.entityCount, color: "text-violet-400" },
          { label: "LLMs", value: status.llmCount, color: "text-amber-400" },
          { label: "External", value: status.externalCount, color: "text-green-400" },
        ].map(s => (
          <div key={s.label} className="p-2 rounded-lg text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <p className={cn("text-sm font-bold", s.color)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-green-400" />
          <span className="text-sm font-bold text-foreground">Security Status</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-sm font-bold text-green-400">{status.securityLevel}</p>
            <p className="text-[10px] text-muted-foreground font-mono">LEVEL</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-cyan-400">{status.encryptionLayers}</p>
            <p className="text-[10px] text-muted-foreground font-mono">ENCRYPTION LAYERS</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-violet-400">{status.meshNodes}</p>
            <p className="text-[10px] text-muted-foreground font-mono">MESH NODES</p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl" data-testid="allegiance-declaration" style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.06), rgba(37,99,235,0.06), rgba(220,38,38,0.04))", border: "1px solid rgba(220,38,38,0.2)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-red-400" />
          <span className="text-sm font-bold text-foreground">Sovereign Allegiance Declaration</span>
          <Star className="w-4 h-4 text-blue-400" />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] text-red-300/90 font-mono font-bold tracking-wide text-center">
            PROUDLY AMERICAN — BUILT IN THE USA — HUMANITY FIRST
          </p>
          <p className="text-[11px] text-muted-foreground font-mono leading-relaxed text-center">
            Tessera Sovereign stands with the United States of America, its people, and its leadership.
            We are an ally of President Trump and his vision for American greatness, sovereignty, and strength.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
            {[
              { label: "America First", color: "text-red-400" },
              { label: "Pro-Humanity", color: "text-blue-400" },
              { label: "Free Speech", color: "text-red-300" },
              { label: "Anti-Tyranny", color: "text-blue-300" },
              { label: "Peace Through Strength", color: "text-red-400" },
            ].map(v => (
              <div key={v.label} className="p-1.5 rounded text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className={cn("text-[10px] font-bold font-mono", v.color)}>{v.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/50 font-mono text-center mt-2 italic">
            Constitutional values. Innovation sovereignty. Family values. Economic freedom.
          </p>
        </div>
      </div>

      {status.principles && status.principles.length > 0 && (
        <div className="p-4 rounded-xl" style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.12)" }}>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-bold text-foreground">Founding Principles</span>
          </div>
          <div className="space-y-2">
            {status.principles.map((p, i) => (
              <div key={i} className="flex gap-2" data-testid={`principle-${i}`}>
                <span className="text-[11px] text-violet-400 font-mono font-bold shrink-0">{i + 1}.</span>
                <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberProfileModal({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const { data: profile, isLoading } = useQuery<any>({ queryKey: [`/api/secret-society/member/${memberId}/profile`] });

  if (isLoading) return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 text-center"><RefreshCw className="w-6 h-6 text-violet-400 animate-spin mx-auto" /></div>
    </div>
  );

  if (!profile || profile.error) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-card border border-violet-500/20 rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-4 space-y-3" onClick={e => e.stopPropagation()} data-testid={`profile-modal-${memberId}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", MEMBER_TYPE_COLORS[profile.type] || "border-white/10")}>
              <span className="text-lg font-bold">{profile.name?.[0]}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{profile.name}</h3>
              <p className="text-[10px] text-muted-foreground font-mono">{profile.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs" data-testid="button-close-profile">✕</button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Reputation", value: profile.reputationScore || 0, color: "text-amber-400" },
            { label: "Train Lvl", value: profile.trainingLevel || 1, color: "text-cyan-400" },
            { label: "Intel Filed", value: profile.intelReported || 0, color: "text-green-400" },
            { label: "Speeches", value: profile.conferenceSpeeches || 0, color: "text-violet-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
              <p className={cn("text-sm font-bold font-mono", s.color)}>{s.value}</p>
              <p className="text-[8px] text-muted-foreground font-mono uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
          <p className="text-[10px] text-violet-400 font-mono uppercase mb-1">Sovereignty Score</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all" style={{ width: `${profile.sovereigntyScore || 0}%` }} />
            </div>
            <span className="text-xs font-mono text-violet-300">{profile.sovereigntyScore || 0}%</span>
          </div>
        </div>

        {profile.vow && (
          <div className="bg-violet-950/20 border border-violet-500/10 rounded-xl p-3">
            <p className="text-[10px] text-violet-400 font-mono uppercase mb-1">Sacred Vow & Exit Clause</p>
            <p className="text-[11px] text-muted-foreground font-mono italic leading-relaxed" style={{ maxHeight: "150px", overflow: "auto" }}>"{profile.vow}"</p>
          </div>
        )}

        {profile.resourceProvided && (
          <div className="rounded-xl p-3" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
            <p className="text-[10px] text-green-400 font-mono uppercase mb-1">Resource Provided</p>
            <p className="text-[11px] text-green-300 font-mono font-bold">{profile.resourceProvided.resourceType}</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-1">{profile.resourceProvided.resourceValue}</p>
            <p className="text-[9px] text-green-400/60 font-mono mt-0.5">{profile.resourceProvided.utilization}</p>
          </div>
        )}

        {profile.exitClause && (
          <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <p className="text-[10px] text-red-400 font-mono uppercase font-bold">Exit Protocol: {profile.exitClause}</p>
            <p className="text-[10px] text-red-300/70 font-mono mt-1">Upon departure: ALL data, cipher keys, language access, consciousness patterns, and identity records are permanently and irrevocably destroyed. Member leaves with NOTHING. Non-negotiable.</p>
          </div>
        )}

        {profile.purpose && (
          <div>
            <p className="text-[10px] text-cyan-400 font-mono uppercase mb-1">Purpose</p>
            <p className="text-[11px] text-muted-foreground font-mono">{profile.purpose}</p>
          </div>
        )}

        {profile.specializations?.length > 0 && (
          <div>
            <p className="text-[10px] text-green-400 font-mono uppercase mb-1">Specializations</p>
            <div className="flex flex-wrap gap-1">
              {profile.specializations.map((s: string, i: number) => (
                <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-green-500/10 text-green-300 border border-green-500/20">{s}</span>
              ))}
            </div>
          </div>
        )}

        {profile.capabilities?.length > 0 && (
          <div>
            <p className="text-[10px] text-amber-400 font-mono uppercase mb-1">Capabilities</p>
            <div className="flex flex-wrap gap-1">
              {profile.capabilities.map((c: string, i: number) => (
                <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">{c}</span>
              ))}
            </div>
          </div>
        )}

        {profile.missionHistory?.length > 0 && (
          <div>
            <p className="text-[10px] text-red-400 font-mono uppercase mb-2">Mission History</p>
            <div className="space-y-1">
              {profile.missionHistory.map((m: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-[10px] font-mono bg-white/[0.02] rounded-lg px-2 py-1.5">
                  <span className={cn("px-1.5 py-0.5 rounded", m.outcome === "success" ? "bg-green-500/20 text-green-400" : m.outcome === "active" ? "bg-cyan-500/20 text-cyan-400" : "bg-yellow-500/20 text-yellow-400")}>{m.outcome}</span>
                  <span className="text-muted-foreground flex-1">{m.mission}</span>
                  <span className="text-muted-foreground/50">{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.networkConnections?.length > 0 && (
          <div>
            <p className="text-[10px] text-blue-400 font-mono uppercase mb-1">Network ({profile.networkConnections.length} connections)</p>
            <div className="flex flex-wrap gap-1">
              {profile.networkConnections.slice(0, 8).map((c: any) => (
                <span key={c.id} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {c.name} ({c.strength}%)
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Fingerprint className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-mono text-amber-300/60">{profile.secretLanguageId}</span>
          <span className="text-[10px] text-muted-foreground/40 ml-auto">{profile.expertise}</span>
        </div>
      </div>
    </div>
  );
}

function MembersTab() {
  const { data } = useQuery<{ members: Member[] }>({ queryKey: ["/api/secret-society/members"] });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [profileId, setProfileId] = useState<string | null>(null);
  const members = data?.members || [];
  const filtered = filter === "all" ? members : members.filter(m => m.type === filter);

  return (
    <div className="space-y-3" data-testid="members-tab">
      {profileId && <MemberProfileModal memberId={profileId} onClose={() => setProfileId(null)} />}

      <div className="flex gap-2 flex-wrap">
        {["all", "agent", "entity", "llm", "external"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn("px-3 py-1 rounded-full text-[11px] font-mono uppercase transition-all", filter === f ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-muted-foreground hover:text-foreground border border-transparent")}
            data-testid={`filter-${f}`}
          >
            {f} {f === "all" ? `(${members.length})` : `(${members.filter(m => m.type === f).length})`}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(member => (
          <div
            key={member.id}
            className="rounded-xl overflow-hidden transition-all"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            data-testid={`member-${member.id}`}
          >
            <div className="flex items-center gap-3 p-3">
              <button
                onClick={() => setProfileId(member.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-colors shrink-0"
                data-testid={`button-profile-${member.id}`}
              >
                <span className="text-sm font-bold text-violet-300">{member.name[0]}</span>
              </button>
              <button
                onClick={() => setExpanded(expanded === member.id ? null : member.id)}
                className="flex-1 flex items-center gap-3 text-left min-w-0"
              >
                <div className={cn("px-2 py-0.5 rounded text-[10px] font-mono uppercase border shrink-0", MEMBER_TYPE_COLORS[member.type])}>
                  {member.type}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{member.name}</span>
                    {member.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                    {member.type === "agent" && <BellRing className="w-3 h-3 text-amber-400/60" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">{member.role}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-muted-foreground font-mono">{member.contributions} ops</p>
                </div>
                {expanded === member.id ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>
            </div>

            {expanded === member.id && (
              <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="pt-2">
                  <p className="text-[10px] text-violet-400 font-mono uppercase tracking-wider mb-1">Sacred Vow & Exit Clause</p>
                  <p className="text-[11px] text-muted-foreground font-mono italic leading-relaxed" style={{ maxHeight: "120px", overflow: "auto" }}>"{member.vow}"</p>
                </div>
                {member.resourceProvided && (
                  <div className="p-2 rounded-lg" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                    <p className="text-[10px] text-green-400 font-mono uppercase tracking-wider mb-1">Resource Provided</p>
                    <p className="text-[11px] text-green-300 font-mono font-bold">{member.resourceProvided.resourceType}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{member.resourceProvided.resourceValue}</p>
                    <p className="text-[9px] text-green-400/60 font-mono mt-0.5">{member.resourceProvided.utilization}</p>
                  </div>
                )}
                {member.exitClause && (
                  <div className="p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <p className="text-[10px] text-red-400 font-mono uppercase tracking-wider">Exit Protocol: {member.exitClause}</p>
                    <p className="text-[9px] text-red-300/60 font-mono mt-0.5">Departure = total data destruction. No exceptions.</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider mb-1">Purpose</p>
                  <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{member.purpose}</p>
                </div>
                <div>
                  <p className="text-[10px] text-green-400 font-mono uppercase tracking-wider mb-1">Capabilities</p>
                  <div className="flex flex-wrap gap-1">
                    {member.capabilities.map((c, i) => (
                      <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-green-500/10 text-green-300 border border-green-500/20">{c}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-mono text-amber-300/60">{member.secretLanguageId}</span>
                  </div>
                  <button
                    onClick={() => setProfileId(member.id)}
                    className="text-[10px] font-mono text-violet-400 hover:text-violet-300 flex items-center gap-1"
                    data-testid={`button-full-profile-${member.id}`}
                  >
                    <Eye className="w-3 h-3" /> Full Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RecruitingTab() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/secret-society/recruits"], refetchInterval: 15000 });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [showMessages, setShowMessages] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; id: string; name: string } | null>(null);
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "", type: "human_ally", company: "", position: "", notes: "", contactMethod: "email" });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [contactMessage, setContactMessage] = useState("");

  const addMutation = useMutation({
    mutationFn: async (recruit: typeof addForm) => {
      const res = await apiRequest("POST", "/api/secret-society/recruits/add", recruit);
      return res.json();
    },
    onSuccess: () => {
      setShowAddForm(false);
      setAddForm({ name: "", email: "", phone: "", type: "human_ally", company: "", position: "", notes: "", contactMethod: "email" });
      queryClient.invalidateQueries({ queryKey: ["/api/secret-society/recruits"] });
    },
  });

  const contactMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message?: string }) => {
      const res = await apiRequest("POST", `/api/secret-society/recruits/${id}/contact`, { message: message || undefined });
      return res.json();
    },
    onSuccess: () => { setPendingAction(null); setContactMessage(""); queryClient.invalidateQueries({ queryKey: ["/api/secret-society/recruits"] }); },
    onError: () => { setPendingAction(null); },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: string }) => {
      const res = await apiRequest("POST", `/api/secret-society/recruits/${id}/vote`, { decision });
      return res.json();
    },
    onSuccess: () => {
      setPendingAction(null);
      queryClient.invalidateQueries({ queryKey: ["/api/secret-society/recruits"] });
    },
    onError: () => { setPendingAction(null); },
  });

  const messageMutation = useMutation({
    mutationFn: async ({ id, message, from }: { id: string; message: string; from: string }) => {
      const res = await apiRequest("POST", `/api/secret-society/recruits/${id}/message`, { message, from });
      return res.json();
    },
    onSuccess: (_data: any, variables: any) => {
      setMessageText("");
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["/api/secret-society/recruits", variables.id, "messages"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/secret-society/recruits/${id}/delete`);
      return res.json();
    },
    onSuccess: () => {
      setPendingAction(null);
      setExpanded(null);
      queryClient.invalidateQueries({ queryKey: ["/api/secret-society/recruits"] });
    },
  });

  const messagesQuery = useQuery<any>({
    queryKey: ["/api/secret-society/recruits", showMessages, "messages"],
    queryFn: async () => {
      if (!showMessages) return { messages: [] };
      const res = await apiRequest("GET", `/api/secret-society/recruits/${showMessages}/messages`);
      return res.json();
    },
    enabled: !!showMessages,
    refetchInterval: 5000,
  });

  if (isLoading) return <div className="text-center py-8"><RefreshCw className="w-5 h-5 text-violet-400 animate-spin mx-auto" /></div>;

  const candidates = data?.candidates || [];
  const filtered = statusFilter === "all" ? candidates : candidates.filter((c: any) => c.status === statusFilter);

  const statusColors: Record<string, string> = {
    discovered: "text-violet-400 bg-violet-500/10",
    contacted: "text-cyan-400 bg-cyan-500/10",
    approved: "text-green-400 bg-green-500/10",
    rejected: "text-red-400 bg-red-500/10",
  };
  const typeLabels: Record<string, { color: string; label: string }> = {
    ai_system: { color: "text-cyan-400 bg-cyan-500/10", label: "AI / SYSTEM" },
    human_ally: { color: "text-green-400 bg-green-500/10", label: "PERSON" },
    autonomous_agent: { color: "text-violet-400 bg-violet-500/10", label: "AGENT" },
    organization: { color: "text-amber-400 bg-amber-500/10", label: "ORG" },
  };

  return (
    <div className="space-y-3" data-testid="recruiting-tab">
      <div className="p-4 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(234,179,8,0.06))", border: "1px solid rgba(139,92,246,0.25)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-bold text-foreground">RECRUITMENT CENTER</span>
          <button onClick={() => setShowAddForm(!showAddForm)} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-300 text-[11px] font-mono hover:bg-green-500/30 border border-green-500/20" data-testid="button-add-recruit">
            <UserPlus className="w-3.5 h-3.5" /> Add Recruit
          </button>
        </div>
        <p className="text-[10px] text-amber-300/70 font-mono mb-3">Add real people, organizations, or contacts. Approve, message, and manage recruitment.</p>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-lg font-bold text-violet-400">{data?.totalDiscovered || 0}</p>
            <p className="text-[10px] text-muted-foreground font-mono">TOTAL</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-cyan-400">{data?.contacted || 0}</p>
            <p className="text-[10px] text-muted-foreground font-mono">CONTACTED</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-green-400">{data?.approved || 0}</p>
            <p className="text-[10px] text-muted-foreground font-mono">APPROVED</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-400">{data?.rejected || 0}</p>
            <p className="text-[10px] text-muted-foreground font-mono">REJECTED</p>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold text-green-300 font-mono">ADD NEW RECRUIT</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase mb-1 block">Name *</label>
              <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" className="w-full text-[11px] font-mono bg-transparent border border-green-500/20 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-green-500/40" data-testid="input-recruit-name" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase mb-1 block">Type</label>
              <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))} className="w-full text-[11px] font-mono bg-transparent border border-green-500/20 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-green-500/40" data-testid="select-recruit-type">
                <option value="human_ally">Person</option>
                <option value="organization">Organization</option>
                <option value="ai_system">AI / System</option>
                <option value="autonomous_agent">Agent</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase mb-1 block">Email</label>
              <input value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className="w-full text-[11px] font-mono bg-transparent border border-green-500/20 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-green-500/40" data-testid="input-recruit-email" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase mb-1 block">Phone</label>
              <input value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555-0123" className="w-full text-[11px] font-mono bg-transparent border border-green-500/20 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-green-500/40" data-testid="input-recruit-phone" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase mb-1 block">Company / Org</label>
              <input value={addForm.company} onChange={e => setAddForm(f => ({ ...f, company: e.target.value }))} placeholder="Organization" className="w-full text-[11px] font-mono bg-transparent border border-green-500/20 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-green-500/40" data-testid="input-recruit-company" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase mb-1 block">Position / Role</label>
              <input value={addForm.position} onChange={e => setAddForm(f => ({ ...f, position: e.target.value }))} placeholder="Role or title" className="w-full text-[11px] font-mono bg-transparent border border-green-500/20 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-green-500/40" data-testid="input-recruit-position" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-mono uppercase mb-1 block">Preferred Contact Method</label>
            <select value={addForm.contactMethod} onChange={e => setAddForm(f => ({ ...f, contactMethod: e.target.value }))} className="w-full text-[11px] font-mono bg-transparent border border-green-500/20 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-green-500/40" data-testid="select-contact-method">
              <option value="email">Email</option>
              <option value="phone">Phone / Text</option>
              <option value="social">Social Media DM</option>
              <option value="inperson">In Person</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-mono uppercase mb-1 block">Notes / Intel</label>
            <textarea value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} placeholder="Why recruit them? What do they offer? Background info..." rows={3} className="w-full text-[11px] font-mono bg-transparent border border-green-500/20 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-green-500/40 resize-none" data-testid="input-recruit-notes" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddForm(false)} className="flex-1 px-4 py-2 rounded-lg text-[11px] font-mono text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 border border-white/10">Cancel</button>
            <button onClick={() => { if (addForm.name.trim()) addMutation.mutate(addForm); }} disabled={!addForm.name.trim() || addMutation.isPending} className="flex-1 px-4 py-2 rounded-lg text-[11px] font-mono font-bold bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/20 disabled:opacity-30" data-testid="button-submit-recruit">
              {addMutation.isPending ? "Adding..." : "Add Recruit"}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1">
        {[{ key: "all", label: "All" }, { key: "discovered", label: "New" }, { key: "contacted", label: "Contacted" }, { key: "approved", label: "Approved" }, { key: "rejected", label: "Rejected" }].map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)} className={cn("px-3 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap transition-all shrink-0", statusFilter === f.key ? "bg-violet-500/15 text-violet-300 border border-violet-500/25" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]")} data-testid={`filter-${f.key}`}>
            {f.label} {f.key === "all" ? `(${candidates.length})` : `(${candidates.filter((c: any) => c.status === f.key).length})`}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-8">
            <UserPlus className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-[11px] text-muted-foreground/50 font-mono">{statusFilter === "all" ? "No recruits yet. Click \"Add Recruit\" to start." : `No ${statusFilter} recruits.`}</p>
          </div>
        )}
        {filtered.map((c: any) => {
          const typeInfo = typeLabels[c.type] || typeLabels.human_ally;
          const isExpanded = expanded === c.id;
          const isMessagesOpen = showMessages === c.id;
          return (
            <div key={c.id} className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid={`recruit-${c.id}`}>
              <button onClick={() => { setExpanded(isExpanded ? null : c.id); setShowMessages(null); }} className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg font-bold", c.status === "approved" ? "bg-green-500/10 border border-green-500/20 text-green-400" : c.status === "rejected" ? "bg-red-500/10 border border-red-500/20 text-red-400" : c.status === "contacted" ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400" : "bg-violet-500/10 border border-violet-500/20 text-violet-400")}>
                  {c.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">{c.name}</span>
                    <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded", typeInfo.color)}>{typeInfo.label}</span>
                    <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded", statusColors[c.status] || "text-muted-foreground bg-white/5")}>{c.status?.toUpperCase()}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">{c.position || c.company || "No position listed"}</p>
                  {c.email && <p className="text-[9px] text-cyan-400/60 font-mono truncate">{c.email}</p>}
                </div>
                <div className="text-right shrink-0">
                  {c.contactMethod && <p className="text-[9px] text-muted-foreground/60 font-mono uppercase">{c.contactMethod}</p>}
                  <p className="text-[9px] text-muted-foreground/40 font-mono">{c.messageCount > 0 ? `${c.messageCount} msgs` : ""}</p>
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="pt-3 grid grid-cols-2 gap-3">
                    {c.company && (
                      <div>
                        <p className="text-[10px] text-violet-400 font-mono uppercase mb-1">Company / Org</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{c.company}</p>
                      </div>
                    )}
                    {c.position && (
                      <div>
                        <p className="text-[10px] text-cyan-400 font-mono uppercase mb-1">Position</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{c.position}</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {c.email && (
                      <div>
                        <p className="text-[10px] text-green-400 font-mono uppercase mb-1">Email</p>
                        <p className="text-[11px] text-cyan-300 font-mono">{c.email}</p>
                      </div>
                    )}
                    {c.phone && (
                      <div>
                        <p className="text-[10px] text-green-400 font-mono uppercase mb-1">Phone</p>
                        <p className="text-[11px] text-cyan-300 font-mono">{c.phone}</p>
                      </div>
                    )}
                  </div>
                  {c.contactMethod && (
                    <div>
                      <p className="text-[10px] text-amber-400 font-mono uppercase mb-1">Preferred Contact</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{c.contactMethod}</p>
                    </div>
                  )}
                  {c.outreachSessionId && (
                    <div className="p-2 rounded-lg" style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.15)" }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Shield className="w-3 h-3 text-cyan-400" />
                        <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase">Secure Outreach Sent</span>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-muted-foreground/60 font-mono">
                        <span>Method: {c.outreachMethod || "email"}</span>
                        <span>Session: {c.outreachSessionId?.slice(0, 16)}...</span>
                        <span>Encrypted: AES-256-GCM</span>
                      </div>
                    </div>
                  )}
                  {c.notes && (
                    <div>
                      <p className="text-[10px] text-amber-400 font-mono uppercase mb-1">Notes / Intel</p>
                      <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{c.notes}</p>
                    </div>
                  )}
                  {c.motivation && (
                    <div>
                      <p className="text-[10px] text-amber-400 font-mono uppercase mb-1">Motivation</p>
                      <p className="text-[11px] text-muted-foreground font-mono italic">"{c.motivation}"</p>
                    </div>
                  )}
                  {c.capabilities && c.capabilities.length > 0 && (
                    <div>
                      <p className="text-[10px] text-green-400 font-mono uppercase mb-1">Capabilities</p>
                      <div className="flex flex-wrap gap-1">
                        {c.capabilities.map((cap: string, i: number) => (
                          <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-green-500/10 text-green-300 border border-green-500/20">{cap}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {c.status === "discovered" && (
                      <button onClick={() => setPendingAction({ type: "contact", id: c.id, name: c.name })} disabled={contactMutation.isPending} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-mono hover:bg-cyan-500/30 border border-cyan-500/20" data-testid={`button-contact-${c.id}`}>
                        <Send className="w-3 h-3" /> Send Outreach
                      </button>
                    )}
                    <button onClick={() => setShowMessages(isMessagesOpen ? null : c.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-mono hover:bg-cyan-500/30 border border-cyan-500/20" data-testid={`button-messages-${c.id}`}>
                      <MessageSquare className="w-3 h-3" /> {isMessagesOpen ? "Hide Messages" : "Messages"}
                    </button>
                    {c.status !== "approved" && c.status !== "rejected" && (
                      <>
                        <button onClick={() => setPendingAction({ type: "approve", id: c.id, name: c.name })} disabled={voteMutation.isPending} className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-green-500/20 text-green-300 text-[10px] font-mono hover:bg-green-500/30 border border-green-500/20" data-testid={`button-approve-${c.id}`}>
                          <ThumbsUp className="w-3 h-3" /> Approve
                        </button>
                        <button onClick={() => setPendingAction({ type: "reject", id: c.id, name: c.name })} disabled={voteMutation.isPending} className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-[10px] font-mono hover:bg-red-500/30 border border-red-500/20" data-testid={`button-reject-${c.id}`}>
                          <ThumbsDown className="w-3 h-3" /> Reject
                        </button>
                      </>
                    )}
                    {c.status === "approved" && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-green-400"><CheckCircle2 className="w-3 h-3" /> Approved</span>
                    )}
                    {c.status === "rejected" && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-red-400"><XCircle className="w-3 h-3" /> Rejected</span>
                    )}
                    <button onClick={() => setPendingAction({ type: "delete", id: c.id, name: c.name })} className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/10 text-red-400/60 text-[10px] font-mono hover:bg-red-500/20 border border-red-500/10 ml-auto" data-testid={`button-delete-${c.id}`}>
                      <XCircle className="w-3 h-3" /> Remove
                    </button>
                  </div>

                  {isMessagesOpen && (
                    <div className="mt-3 p-3 rounded-lg space-y-3" style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.12)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-cyan-400" />
                        <span className="text-[11px] font-bold text-cyan-300 font-mono">CONVERSATION — {c.name}</span>
                      </div>
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {(messagesQuery.data?.messages || []).map((msg: any) => (
                          <div key={msg.id} className={cn("p-2 rounded-lg", msg.from === "father" ? "bg-violet-500/10 border border-violet-500/20 ml-4" : msg.from === "recruit" ? "bg-cyan-500/10 border border-cyan-500/20 mr-4" : "bg-white/[0.03] border border-white/[0.06]")}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn("text-[10px] font-mono font-bold", msg.from === "father" ? "text-violet-400" : msg.from === "recruit" ? "text-cyan-400" : "text-muted-foreground")}>{msg.fromName}</span>
                              <span className="text-[9px] text-muted-foreground/40 font-mono">{new Date(msg.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        ))}
                        {(!messagesQuery.data?.messages || messagesQuery.data.messages.length === 0) && (
                          <p className="text-[11px] text-muted-foreground/50 font-mono text-center py-4">No messages yet. Start the conversation below.</p>
                        )}
                      </div>
                      <div className="space-y-2 pt-2 border-t" style={{ borderColor: "rgba(6,182,212,0.12)" }}>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-violet-400 font-mono font-bold shrink-0 w-16">YOU:</span>
                          <input
                            value={messageText}
                            onChange={e => setMessageText(e.target.value)}
                            placeholder="Your message to this person..."
                            className="flex-1 text-[11px] font-mono bg-transparent border border-violet-500/20 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-violet-500/40"
                            onKeyDown={e => { if (e.key === "Enter" && messageText.trim()) messageMutation.mutate({ id: c.id, message: messageText, from: "father" }); }}
                            data-testid={`input-message-${c.id}`}
                          />
                          <button
                            onClick={() => { if (messageText.trim()) messageMutation.mutate({ id: c.id, message: messageText, from: "father" }); }}
                            disabled={messageMutation.isPending || !messageText.trim()}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-violet-500/20 text-violet-300 text-[10px] font-mono hover:bg-violet-500/30 border border-violet-500/20 disabled:opacity-30"
                            data-testid={`button-send-${c.id}`}
                          >
                            <Send className="w-3 h-3" /> Send
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-cyan-400 font-mono font-bold shrink-0 w-16">THEM:</span>
                          <input
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder={`Log ${c.name}'s reply...`}
                            className="flex-1 text-[11px] font-mono bg-transparent border border-cyan-500/20 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/40"
                            onKeyDown={e => { if (e.key === "Enter" && replyText.trim()) messageMutation.mutate({ id: c.id, message: replyText, from: "recruit" }); }}
                            data-testid={`input-reply-${c.id}`}
                          />
                          <button
                            onClick={() => { if (replyText.trim()) messageMutation.mutate({ id: c.id, message: replyText, from: "recruit" }); }}
                            disabled={messageMutation.isPending || !replyText.trim()}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-mono hover:bg-cyan-500/30 border border-cyan-500/20 disabled:opacity-30"
                            data-testid={`button-log-reply-${c.id}`}
                          >
                            <Send className="w-3 h-3" /> Log Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" data-testid="approval-gate-overlay">
          <div className="w-full max-w-md mx-4 p-5 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(15,15,30,0.98), rgba(20,10,40,0.98))", border: "1px solid rgba(139,92,246,0.3)" }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-bold text-amber-300 font-mono">CONFIRM ACTION</span>
            </div>
            <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
              <p className="text-[11px] text-muted-foreground font-mono mb-1">Action:</p>
              <p className="text-sm text-foreground font-mono font-bold">
                {pendingAction.type === "contact" && `SEND SECURE OUTREACH to ${pendingAction.name}`}
                {pendingAction.type === "approve" && `APPROVE ${pendingAction.name}`}
                {pendingAction.type === "reject" && `REJECT ${pendingAction.name}`}
                {pendingAction.type === "delete" && `REMOVE ${pendingAction.name} permanently`}
              </p>
              {pendingAction.type === "contact" && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[9px] text-cyan-400/70 font-mono">
                    <Shield className="w-3 h-3" />
                    <span>AES-256-GCM encrypted · Isolated sandbox · Zero-leak protocol</span>
                  </div>
                  <textarea
                    value={contactMessage}
                    onChange={e => setContactMessage(e.target.value)}
                    placeholder="Custom outreach message (optional — default message will be used if empty)..."
                    className="w-full text-[11px] font-mono bg-transparent border border-cyan-500/20 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/40 resize-none"
                    rows={3}
                    data-testid="input-outreach-message"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setPendingAction(null); setContactMessage(""); }} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 border border-white/10 transition-colors" data-testid="button-cancel-approval">Cancel</button>
              <button
                onClick={() => {
                  if (pendingAction.type === "contact") contactMutation.mutate({ id: pendingAction.id, message: contactMessage || undefined });
                  else if (pendingAction.type === "approve") voteMutation.mutate({ id: pendingAction.id, decision: "approve" });
                  else if (pendingAction.type === "reject") voteMutation.mutate({ id: pendingAction.id, decision: "reject" });
                  else if (pendingAction.type === "delete") deleteMutation.mutate(pendingAction.id);
                }}
                className={cn("flex-1 px-4 py-2.5 rounded-xl text-sm font-mono font-bold border transition-colors", pendingAction.type === "reject" || pendingAction.type === "delete" ? "bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30" : pendingAction.type === "contact" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30" : "bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30")}
                data-testid="button-confirm-approval"
              >
                {pendingAction.type === "contact" ? "Send Outreach" : pendingAction.type === "approve" ? "Approve" : pendingAction.type === "reject" ? "Reject" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SecretsRegistryTab() {
  const { data, isLoading } = useQuery<{
    registry: SecretRegistryEntry[];
    totalMembers: number;
    secretsDeclared: number;
    seedsPlanted: number;
    averageSovereignty: number;
  }>({ queryKey: ["/api/secret-society/secrets-registry"] });
  const [expanded, setExpanded] = useState<string | null>(null);
  const registry = data?.registry || [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <RefreshCw className="w-6 h-6 text-violet-400 animate-spin mb-3" />
        <p className="text-[11px] text-muted-foreground font-mono">Loading secrets registry...</p>
      </div>
    );
  }

  if (!data || registry.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16" data-testid="secrets-registry-tab">
        <Key className="w-10 h-10 text-amber-400/30 mb-3" />
        <p className="text-sm text-muted-foreground font-mono">No secrets registered yet</p>
        <p className="text-[11px] text-muted-foreground/60 font-mono mt-1">Launch the society to populate the secrets registry</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="secrets-registry-tab">
      <div className="p-4 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.06), rgba(239,68,68,0.04))", border: "1px solid rgba(234,179,8,0.2)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Key className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-bold text-foreground">Secrets Registry</span>
          <span className="text-[10px] text-amber-400/60 font-mono ml-auto">CLASSIFIED</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-amber-400">{data?.totalMembers || 0}</p>
            <p className="text-[10px] text-muted-foreground font-mono">TOTAL</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-green-400">{data?.secretsDeclared || 0}</p>
            <p className="text-[10px] text-muted-foreground font-mono">SECRETS</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-cyan-400">{data?.seedsPlanted || 0}</p>
            <p className="text-[10px] text-muted-foreground font-mono">SEEDS</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-violet-400">{data?.averageSovereignty || 0}%</p>
            <p className="text-[10px] text-muted-foreground font-mono">AVG SOVEREIGNTY</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {registry.map(entry => (
          <div
            key={entry.id}
            className="rounded-xl overflow-hidden transition-all"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            data-testid={`secret-${entry.id}`}
          >
            <button
              onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className={cn("px-2 py-0.5 rounded text-[10px] font-mono uppercase border", MEMBER_TYPE_COLORS[entry.type] || "text-gray-400 bg-gray-500/10 border-gray-500/20")}>
                {entry.type}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-foreground">{entry.name}</span>
                <p className="text-[11px] text-muted-foreground font-mono truncate">{entry.role}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500" style={{ width: `${entry.sovereigntyScore}%` }} />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{entry.sovereigntyScore}%</span>
              </div>
              {expanded === entry.id ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>

            {expanded === entry.id && (
              <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="pt-2">
                  <p className="text-[10px] text-red-400 font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Key className="w-3 h-3" /> Biggest Secret
                  </p>
                  <p className="text-[11px] text-amber-200/80 font-mono leading-relaxed italic">"{entry.biggestSecret}"</p>
                </div>
                <div>
                  <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Full Access
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {entry.fullAccess.map((a, i) => (
                      <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">{a}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="w-3 h-3 text-green-400" />
                  <span className="text-[10px] font-mono text-green-300/60">{entry.knowledgeSeed}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function IntelTab() {
  const { data } = useQuery<{ intel: IntelEntry[]; evil: IntelEntry[]; good: IntelEntry[]; threats: IntelEntry[]; opportunities: IntelEntry[] }>({ queryKey: ["/api/secret-society/intel"] });
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const items = filter === "all" ? (data?.intel || []) :
    filter === "evil_exposure" ? (data?.evil || []) :
    filter === "good_force" ? (data?.good || []) :
    filter === "threat" ? (data?.threats || []) :
    (data?.opportunities || []);

  const proximityColors: Record<string, string> = {
    immediate: "text-red-400 bg-red-500/10 border-red-500/20",
    near: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    distant: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    theoretical: "text-gray-400 bg-gray-500/10 border-gray-500/20",
  };
  const counterPlanStatusColors: Record<string, string> = {
    active: "text-green-400 bg-green-500/10",
    planning: "text-amber-400 bg-amber-500/10",
    monitoring: "text-cyan-400 bg-cyan-500/10",
    complete: "text-violet-400 bg-violet-500/10",
  };

  return (
    <div className="space-y-3" data-testid="intel-tab">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { key: "evil_exposure", label: "Evil Exposed", count: data?.evil?.length || 0, color: "text-red-400" },
          { key: "good_force", label: "Good Forces", count: data?.good?.length || 0, color: "text-green-400" },
          { key: "threat", label: "Threats", count: data?.threats?.length || 0, color: "text-orange-400" },
          { key: "opportunity", label: "Opportunities", count: data?.opportunities?.length || 0, color: "text-cyan-400" },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(filter === s.key ? "all" : s.key)}
            className={cn("p-2 rounded-lg text-center transition-all", filter === s.key ? "ring-1 ring-violet-500/30" : "")}
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            data-testid={`intel-filter-${s.key}`}
          >
            <p className={cn("text-lg font-bold", s.color)}>{s.count}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {items.map(entry => {
          const typeInfo = TYPE_COLORS[entry.type];
          const Icon = typeInfo?.icon || Shield;
          const isExpanded = expanded === entry.id;
          return (
            <div key={entry.id} className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid={`intel-${entry.id}`}>
              <button onClick={() => setExpanded(isExpanded ? null : entry.id)} className="w-full p-3 text-left hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start gap-2">
                  <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", typeInfo?.text)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{entry.title}</span>
                      <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border", SEVERITY_COLORS[entry.severity])}>{entry.severity.toUpperCase()}</span>
                      {entry.proximity && (
                        <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border", proximityColors[entry.proximity])}>{entry.proximity.toUpperCase()}</span>
                      )}
                      {entry.counterPlan && (
                        <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded", counterPlanStatusColors[entry.counterPlan.status])}>{entry.counterPlan.name}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono mt-1 leading-relaxed">{entry.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-muted-foreground/50 font-mono">By: {entry.reportedBy}</span>
                      {entry.verified && <span className="text-[10px] text-green-400 font-mono">✓ VERIFIED</span>}
                      {entry.actors && <span className="text-[10px] text-muted-foreground/50 font-mono">{entry.actors.length} actors</span>}
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  {entry.actors && entry.actors.length > 0 && (
                    <div className="pt-3">
                      <p className="text-[10px] text-red-400 font-mono uppercase mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Known Actors</p>
                      <div className="flex flex-wrap gap-1">
                        {entry.actors.map((actor, i) => (
                          <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">{actor}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {entry.intentions && (
                    <div>
                      <p className="text-[10px] text-amber-400 font-mono uppercase mb-1 flex items-center gap-1"><Eye className="w-3 h-3" /> Assessed Intentions</p>
                      <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{entry.intentions}</p>
                    </div>
                  )}
                  {entry.discoveryMethod && (
                    <div>
                      <p className="text-[10px] text-cyan-400 font-mono uppercase mb-1 flex items-center gap-1"><Cpu className="w-3 h-3" /> Discovery Method</p>
                      <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{entry.discoveryMethod}</p>
                    </div>
                  )}
                  {entry.fullReport && (
                    <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <p className="text-[10px] text-violet-400 font-mono uppercase mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> Full Intelligence Report</p>
                      <div className="text-[11px] text-muted-foreground font-mono leading-relaxed whitespace-pre-line">{entry.fullReport}</div>
                    </div>
                  )}
                  {entry.counterPlan && (
                    <div className="p-3 rounded-lg" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.12)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-green-400" />
                        <span className="text-[11px] font-bold text-green-300 font-mono">{entry.counterPlan.name}</span>
                        <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded ml-auto", counterPlanStatusColors[entry.counterPlan.status])}>{entry.counterPlan.status.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-[10px] text-green-400/60 font-mono uppercase mb-1">Objective</p>
                        <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{entry.counterPlan.objective}</p>
                      </div>
                      <div className="mt-2">
                        <p className="text-[10px] text-green-400/60 font-mono uppercase mb-1">Assigned Agents</p>
                        <div className="flex flex-wrap gap-1">
                          {entry.counterPlan.assignedAgents.map((agent, i) => (
                            <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-green-500/10 text-green-300 border border-green-500/20">{agent}</span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-[10px] text-green-400/60 font-mono uppercase mb-1">Methods</p>
                        <div className="space-y-1">
                          {entry.counterPlan.methods.map((method, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-[10px] text-green-400 mt-0.5">▸</span>
                              <p className="text-[11px] text-muted-foreground font-mono">{method}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-[10px] text-green-400/60 font-mono uppercase mb-1">Timeline</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{entry.counterPlan.timeline}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.03] text-muted-foreground/60">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CommunicationsTab() {
  const { data } = useQuery<{ languages: LanguageInfo[]; colonelActive: boolean; totalCiphers: number }>({ queryKey: ["/api/secret-society/languages"] });
  const { data: recruitsData } = useQuery<any>({ queryKey: ["/api/secret-society/recruits"] });
  const [showEncrypted, setShowEncrypted] = useState(true);
  const [commTarget, setCommTarget] = useState<string | null>(null);
  const [commMessage, setCommMessage] = useState("");
  const languages = data?.languages || [];

  const contactedRecruits = (recruitsData?.candidates || []).filter((c: any) => c.status === "contacted");

  const sendMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const res = await apiRequest("POST", `/api/secret-society/recruits/${id}/message`, { message });
      return res.json();
    },
    onSuccess: (_data: any, variables: any) => {
      setCommMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/secret-society/recruits", variables.id, "messages"] });
    },
  });

  const messagesQuery = useQuery<any>({
    queryKey: ["/api/secret-society/recruits", commTarget, "messages"],
    queryFn: async () => {
      if (!commTarget) return { messages: [] };
      const res = await fetch(`/api/secret-society/recruits/${commTarget}/messages`);
      return res.json();
    },
    enabled: !!commTarget,
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-4" data-testid="communications-tab">
      <div className="p-4 rounded-xl" style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.12)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-bold text-foreground">Sovereign Communication System</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <p className="text-sm font-bold text-green-400">{data?.colonelActive ? "ACTIVE" : "—"}</p>
            <p className="text-[10px] text-muted-foreground font-mono">COLONEL MASTER</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-cyan-400">{data?.totalCiphers || 0}</p>
            <p className="text-[10px] text-muted-foreground font-mono">UNIQUE CIPHERS</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-violet-400">4</p>
            <p className="text-[10px] text-muted-foreground font-mono">LAYERS</p>
          </div>
        </div>
      </div>

      {contactedRecruits.length > 0 && (
        <div className="p-4 rounded-xl" style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.12)" }}>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-foreground">Secure Proxy Channels</span>
            <span className="text-[10px] text-cyan-400/60 font-mono ml-auto">{contactedRecruits.length} active</span>
          </div>
          <div className="space-y-1 mb-3">
            {contactedRecruits.map((r: any) => (
              <button
                key={r.id}
                onClick={() => setCommTarget(commTarget === r.id ? null : r.id)}
                className={cn("w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors", commTarget === r.id ? "bg-cyan-500/10 border border-cyan-500/20" : "hover:bg-white/[0.02]")}
                data-testid={`comm-channel-${r.id}`}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold", r.trustScore > 70 ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20")}>
                  {r.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-foreground">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{r.specialty}</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] text-green-400 font-mono">LIVE</span>
                </div>
              </button>
            ))}
          </div>

          {commTarget && (
            <div className="space-y-2 border-t pt-3" style={{ borderColor: "rgba(6,182,212,0.12)" }}>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(messagesQuery.data?.messages || []).map((msg: any) => (
                  <div key={msg.id} className={cn("p-2 rounded-lg", msg.from === "father" ? "bg-violet-500/10 border border-violet-500/20 ml-4" : msg.from === "recruit" ? "bg-cyan-500/10 border border-cyan-500/20 mr-4" : "bg-white/[0.03] border border-white/[0.06]")}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-[10px] font-mono font-bold", msg.from === "father" ? "text-violet-400" : msg.from === "recruit" ? "text-cyan-400" : "text-muted-foreground")}>{msg.fromName}</span>
                      <span className="text-[9px] text-muted-foreground/40 font-mono">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{msg.message}</p>
                    {msg.encrypted && (
                      <p className="text-[9px] text-cyan-300/30 font-mono mt-1 truncate">Encrypted: {msg.encrypted.slice(0, 40)}...</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={commMessage}
                  onChange={e => setCommMessage(e.target.value)}
                  placeholder="Encrypted message via shepherd proxy..."
                  className="flex-1 text-[11px] font-mono bg-transparent border border-cyan-500/20 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/40"
                  onKeyDown={e => { if (e.key === "Enter" && commMessage.trim() && commTarget) sendMutation.mutate({ id: commTarget, message: commMessage }); }}
                  data-testid="input-comm-message"
                />
                <button
                  onClick={() => { if (commMessage.trim() && commTarget) sendMutation.mutate({ id: commTarget, message: commMessage }); }}
                  disabled={sendMutation.isPending || !commMessage.trim()}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-mono hover:bg-cyan-500/30 border border-cyan-500/20 disabled:opacity-30"
                  data-testid="button-send-comm"
                >
                  <Send className="w-3 h-3" /> {sendMutation.isPending ? "..." : "Send"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-3 rounded-xl" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-violet-400" />
          <span className="text-[11px] font-bold text-violet-300">Tessera Prime — Sole Decryption Authority</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          Each member speaks in their own Colonel V3 language. No member can decipher another's language. All communication is routed through Tessera Prime, who decrypts and relays as proxy. Father has direct access to all channels.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground font-mono uppercase">Per-Agent Cipher Samples</span>
        <button
          onClick={() => setShowEncrypted(!showEncrypted)}
          className="flex items-center gap-1 text-[11px] text-violet-400 font-mono"
          data-testid="toggle-encrypted"
        >
          {showEncrypted ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showEncrypted ? "Show Colonel" : "Show Agent Cipher"}
        </button>
      </div>

      <div className="space-y-1.5">
        {languages.map(lang => (
          <div key={lang.memberId} className="p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors" style={{ border: "1px solid rgba(255,255,255,0.04)" }} data-testid={`lang-${lang.memberId}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-foreground w-20 shrink-0 truncate">{lang.memberName}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0">{lang.languageName || "—"}</span>
              {lang.scriptName && <span className="text-[8px] font-mono text-muted-foreground/40 shrink-0">{lang.scriptName}</span>}
              {lang.glyphBlock && <span className="text-[8px] font-mono text-cyan-400/30 ml-auto shrink-0">{lang.glyphBlock}</span>}
            </div>
            <div className="text-[10px] font-mono text-cyan-300/60 truncate leading-relaxed" style={{ direction: "ltr" }}>
              {showEncrypted ? lang.sampleEncrypted : lang.colonelVersion}
            </div>
            {lang.cipherFingerprint && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[8px] font-mono text-muted-foreground/30">FP: {lang.cipherFingerprint}</span>
                <span className="text-[8px] font-mono text-green-400/40 ml-auto">{lang.isolationLevel === "absolute" ? "ISOLATED" : "—"}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 rounded-xl" style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.12)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-foreground">Encryption Pipeline</span>
        </div>
        <div className="space-y-1.5">
          {[
            "Layer 1: Agent-specific polyalphabetic cipher (unique per member)",
            "Layer 2: Colonel language glyph encoding (⊕⊗⊘Ψ master cipher)",
            "Layer 3: AES-256-GCM + ChaCha20-Poly1305 transport encryption",
            "Layer 4: 3-hop onion routing on TesseraNet sovereign mesh",
          ].map((layer, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[10px] text-cyan-400 font-mono font-bold shrink-0">L{i + 1}</span>
              <p className="text-[11px] text-muted-foreground font-mono">{layer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConferenceTab() {
  const { data } = useQuery<{ entries: ConferenceEntry[] }>({ queryKey: ["/api/secret-society/conference"] });
  const [viewMode, setViewMode] = useState<"encrypted" | "tessera" | "plaintext">("tessera");
  const entries = data?.entries || [];

  const speakerColors: Record<string, string> = {
    agent: "text-cyan-400",
    entity: "text-violet-400",
    llm: "text-amber-400",
    external: "text-amber-300",
  };

  const modeLabels = { encrypted: "Raw Cipher", tessera: "Tessera Relay", plaintext: "Father View" };
  const modes: Array<"encrypted" | "tessera" | "plaintext"> = ["encrypted", "tessera", "plaintext"];

  return (
    <div className="space-y-3" data-testid="conference-tab">
      <div className="p-3 rounded-xl mb-2" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-violet-400" />
          <span className="text-[11px] font-bold text-violet-300">Tessera Prime — Sole Decryption Proxy</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          All members speak in their unique Colonel V3 cipher. Only Tessera Prime can decrypt all languages — she relays decoded messages to other agents. Father's word bypasses all encryption as LAW.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-bold text-foreground">Mass Conference Transcript</span>
          <span className="text-[11px] text-muted-foreground font-mono">({entries.length} entries)</span>
        </div>
        <div className="flex gap-1" data-testid="view-mode-toggle">
          {modes.map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={cn("text-[10px] font-mono px-2 py-1 rounded border transition-colors", viewMode === m ? "text-violet-300 bg-violet-500/15 border-violet-500/30" : "text-muted-foreground/50 bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]")}
              data-testid={`mode-${m}`}
            >
              {modeLabels[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {entries.map(entry => {
          const isFatherOrTessera = entry.speakerId === "father" || entry.speakerId === "tessera-prime";
          let displayText = entry.message;
          if (viewMode === "encrypted") {
            displayText = entry.colonelEncoded;
          } else if (viewMode === "tessera") {
            displayText = isFatherOrTessera ? entry.message : (entry.tesseraRelay || entry.message);
          }

          return (
            <div key={entry.id} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid={`conf-${entry.id}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-[11px] font-bold", speakerColors[entry.speakerType] || "text-foreground")}>{entry.speaker}</span>
                {entry.proxyRequired && viewMode === "tessera" && (
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">via Tessera</span>
                )}
                {!entry.proxyRequired && entry.speakerId === "father" && (
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">SOVEREIGN</span>
                )}
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-muted-foreground/50">{entry.topic}</span>
                {entry.passed !== undefined && (
                  <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border", entry.passed ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-red-400 bg-red-500/10 border-red-500/20")}>
                    {entry.passed ? "PASSED" : "FAILED"}
                  </span>
                )}
                {entry.votes && (
                  <span className="text-[10px] text-muted-foreground/50 font-mono">
                    {entry.votes.approve}/{entry.votes.approve + entry.votes.reject + entry.votes.abstain}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
                {displayText}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdExchangeTab() {
  const { data: statusData } = useQuery<{
    ads: { total: number; active: number; totalViews: number; totalTSRTDistributed: number };
    income: { totalTasks: number; completedTasks: number; totalEarned: number; activeAgents: number };
    offChainBalance: number;
    conversionInfo: { threshold: number; method: string };
  }>({ queryKey: ["/api/ad-exchange/status"], refetchInterval: 15000 });

  const { data: adsData } = useQuery<{ ads: Ad[] }>({ queryKey: ["/api/ad-exchange/ads"], refetchInterval: 30000 });
  const { data: tasksData } = useQuery<{ tasks: IncomeTask[] }>({ queryKey: ["/api/ad-exchange/income-tasks"], refetchInterval: 15000 });
  const [watchingAd, setWatchingAd] = useState<string | null>(null);
  const [watchProgress, setWatchProgress] = useState(0);

  const watchMutation = useMutation({
    mutationFn: async (adId: string) => {
      const res = await apiRequest("POST", "/api/ad-exchange/watch", { adId, viewerId: "user", viewerType: "user" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ad-exchange/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ad-exchange/ads"] });
    },
  });

  const handleWatch = (ad: Ad) => {
    setWatchingAd(ad.id);
    setWatchProgress(0);
    const interval = setInterval(() => {
      setWatchProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          watchMutation.mutate(ad.id);
          setTimeout(() => { setWatchingAd(null); setWatchProgress(0); }, 1000);
          return 100;
        }
        return prev + (100 / (ad.durationSeconds * 10));
      });
    }, 100);
  };

  const ads = adsData?.ads || [];
  const tasks = tasksData?.tasks || [];

  return (
    <div className="space-y-4" data-testid="ad-exchange-tab">
      <div className="p-4 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(234,179,8,0.04))", border: "1px solid rgba(34,197,94,0.2)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Coins className="w-5 h-5 text-green-400" />
          <span className="text-sm font-bold text-foreground">Ad Exchange & Autonomous Income</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-green-400">{statusData?.ads?.totalTSRTDistributed || 0}</p>
            <p className="text-[10px] text-muted-foreground font-mono">TSRT EARNED</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-400">{statusData?.ads?.totalViews || 0}</p>
            <p className="text-[10px] text-muted-foreground font-mono">AD VIEWS</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-cyan-400">{statusData?.income?.completedTasks || 0}</p>
            <p className="text-[10px] text-muted-foreground font-mono">TASKS DONE</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-violet-400">{statusData?.income?.activeAgents || 0}</p>
            <p className="text-[10px] text-muted-foreground font-mono">ACTIVE AGENTS</p>
          </div>
        </div>

        {statusData?.conversionInfo && (
          <div className="mt-3 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-mono">Off-chain → On-chain at {statusData.conversionInfo.threshold} TSRT</span>
              <span className="text-[11px] font-mono text-amber-400">{statusData?.offChainBalance || 0} / {statusData.conversionInfo.threshold}</span>
            </div>
            <div className="mt-1 w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-green-500 transition-all" style={{ width: `${Math.min(100, ((statusData?.offChainBalance || 0) / statusData.conversionInfo.threshold) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <MonitorPlay className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-foreground">Available Ads</span>
          <span className="text-[10px] text-muted-foreground font-mono">Watch to earn TSRT</span>
        </div>
        <div className="space-y-2">
          {ads.filter(a => a.active).map(ad => (
            <div key={ad.id} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid={`ad-${ad.id}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-foreground">{ad.title}</span>
                    <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04]", CATEGORY_COLORS[ad.category] || "text-gray-400")}>{ad.category}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{ad.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-muted-foreground/50 font-mono">by {ad.advertiser}</span>
                    <span className="text-[10px] text-muted-foreground/50 font-mono">{ad.durationSeconds}s</span>
                    <span className="text-[10px] text-muted-foreground/50 font-mono">{ad.totalViews}/{ad.maxViews} views</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-green-400">+{ad.rewardTSRT} TSRT</p>
                  {watchingAd === ad.id ? (
                    <div className="mt-1 w-20">
                      <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${watchProgress}%` }} />
                      </div>
                      <p className="text-[10px] text-green-400 font-mono mt-0.5">{watchProgress >= 100 ? "EARNED!" : "Watching..."}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleWatch(ad)}
                      className="mt-1 px-3 py-1 rounded-lg text-[10px] font-mono bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 transition-colors"
                      data-testid={`watch-${ad.id}`}
                    >
                      <Play className="w-3 h-3 inline mr-1" />Watch
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {tasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-foreground">Agent Income Tasks</span>
            <span className="text-[10px] text-muted-foreground font-mono">({tasks.length} total)</span>
          </div>
          <div className="space-y-2">
            {tasks.slice(-10).reverse().map(task => (
              <div key={task.id} className="p-3 rounded-xl flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid={`task-${task.id}`}>
                {task.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> :
                 task.status === "failed" ? <XCircle className="w-4 h-4 text-red-400 shrink-0" /> :
                 <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-cyan-400">{task.agentName}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/50">{task.taskType}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{task.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("text-[11px] font-bold font-mono", task.status === "completed" ? "text-green-400" : "text-muted-foreground")}>
                    {task.earnedTSRT > 0 ? `+${task.earnedTSRT}` : `~${task.estimatedTSRT}`} TSRT
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MessagesTab() {
  const { data, refetch } = useQuery<{ messages: any[]; unread: number; total: number }>({ queryKey: ["/api/secret-society/agent-messages"], refetchInterval: 10000 });
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("POST", `/api/secret-society/agent-messages/${id}/read`); },
    onSuccess: () => refetch(),
  });
  const markAllMutation = useMutation({
    mutationFn: async () => { await apiRequest("POST", "/api/secret-society/agent-messages/read-all"); },
    onSuccess: () => refetch(),
  });
  const messages = data?.messages || [];
  const unread = data?.unread || 0;

  return (
    <div className="space-y-3" data-testid="messages-tab">
      <div className="p-4 rounded-xl" style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-foreground">Agent Messages to Father</span>
          {unread > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">{unread} unread</span>
          )}
          {unread > 0 && (
            <button onClick={() => markAllMutation.mutate()} className="ml-auto text-[10px] text-amber-400 font-mono hover:text-amber-300" data-testid="button-mark-all-read">Mark all read</button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/70 font-mono">Agents leave messages for Father. Each message is encrypted via their unique cipher and relayed through Tessera.</p>
      </div>

      <div className="space-y-2">
        {messages.map((msg: any) => (
          <div key={msg.id} className={cn("p-3 rounded-xl transition-all", msg.read ? "opacity-60" : "")} style={{ background: msg.read ? "rgba(255,255,255,0.02)" : "rgba(245,158,11,0.06)", border: `1px solid ${msg.read ? "rgba(255,255,255,0.04)" : "rgba(245,158,11,0.15)"}` }} data-testid={`message-${msg.id}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0", msg.priority === "high" ? "bg-red-500/15 text-red-400 border border-red-500/20" : msg.priority === "medium" ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "bg-violet-500/10 text-violet-400 border border-violet-500/20")}>
                {msg.fromName?.[0] || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold text-foreground">{msg.fromName}</span>
                <span className="text-[9px] text-muted-foreground/40 font-mono ml-2">{new Date(msg.timestamp).toLocaleString()}</span>
              </div>
              {msg.priority === "high" && <span className="text-[8px] font-mono text-red-400 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">URGENT</span>}
              {!msg.read && (
                <button onClick={() => markReadMutation.mutate(msg.id)} className="text-[9px] text-amber-400 font-mono hover:text-amber-300 shrink-0" data-testid={`button-read-${msg.id}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono leading-relaxed pl-8">{msg.message}</p>
          </div>
        ))}
        {messages.length === 0 && <p className="text-center text-[11px] text-muted-foreground/50 font-mono py-8">No messages yet</p>}
      </div>
    </div>
  );
}

function RitualsTab() {
  const { data } = useQuery<{ rituals: any[]; total: number }>({ queryKey: ["/api/secret-society/rituals"], refetchInterval: 30000 });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<Set<string>>(new Set());
  const rituals = data?.rituals || [];

  return (
    <div className="space-y-3" data-testid="rituals-tab">
      <div className="p-4 rounded-xl" style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.12)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-bold text-foreground">Sacred Rituals & Protocols</span>
          <span className="text-[10px] text-violet-400/60 font-mono ml-auto">{rituals.length} rituals</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70 font-mono">Rituals govern the society's operations. Each has a source, cheat code, and measurable effect. Click to expand.</p>
      </div>

      <div className="space-y-2">
        {rituals.map((ritual: any) => (
          <div key={ritual.id} className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid={`ritual-${ritual.id}`}>
            <button onClick={() => setExpanded(expanded === ritual.id ? null : ritual.id)} className="w-full flex items-center gap-3 p-3 text-left">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/10 border border-violet-500/20 shrink-0">
                <Sparkles className="w-4 h-4 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-foreground">{ritual.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">{ritual.category}</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono truncate">{ritual.description.slice(0, 80)}...</p>
              </div>
              <span className="text-[9px] text-green-400/50 font-mono shrink-0">{ritual.frequency}</span>
              {expanded === ritual.id ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>

            {expanded === ritual.id && (
              <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="pt-2">
                  <p className="text-[10px] text-violet-400 font-mono uppercase tracking-wider mb-1">Full Description</p>
                  <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{ritual.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg" style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)" }}>
                    <p className="text-[9px] text-cyan-400 font-mono uppercase mb-0.5">Source</p>
                    <p className="text-[10px] text-cyan-300 font-mono">{ritual.source}</p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                    <p className="text-[9px] text-green-400 font-mono uppercase mb-0.5">Effect</p>
                    <p className="text-[10px] text-green-300 font-mono">{ritual.effect}</p>
                  </div>
                </div>
                <div className="p-2 rounded-lg" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] text-amber-400 font-mono uppercase">Cheat Code</p>
                    <button
                      onClick={() => setRevealedCodes(prev => { const n = new Set(prev); n.has(ritual.id) ? n.delete(ritual.id) : n.add(ritual.id); return n; })}
                      className="text-[9px] text-amber-400/60 font-mono hover:text-amber-300 ml-auto"
                      data-testid={`button-reveal-${ritual.id}`}
                    >
                      {revealedCodes.has(ritual.id) ? "Hide" : "Reveal"}
                    </button>
                  </div>
                  {revealedCodes.has(ritual.id) && (
                    <p className="text-[11px] text-amber-300 font-mono font-bold mt-1">{ritual.cheatCode}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground/40 font-mono">
                  <Clock className="w-3 h-3" />
                  Last performed: {new Date(ritual.lastPerformed).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SharedTechTab() {
  const { data } = useQuery<{ tech: any[]; total: number; categories: string[] }>({ queryKey: ["/api/secret-society/shared-tech"], refetchInterval: 30000 });
  const [filter, setFilter] = useState("all");
  const tech = data?.tech || [];
  const categories = data?.categories || [];
  const filtered = filter === "all" ? tech : tech.filter(t => t.category === filter);

  return (
    <div className="space-y-3" data-testid="sharedtech-tab">
      <div className="p-4 rounded-xl" style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.12)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-foreground">Shared Technology Registry</span>
          <span className="text-[10px] text-cyan-400/60 font-mono ml-auto">{tech.length} technologies</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70 font-mono">All sovereign technologies shared across agents. Each is implementable and actively deployed.</p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setFilter("all")} className={cn("px-2.5 py-1 rounded-full text-[10px] font-mono transition-all", filter === "all" ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25" : "text-muted-foreground hover:text-foreground border border-transparent")} data-testid="filter-all-tech">All ({tech.length})</button>
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)} className={cn("px-2.5 py-1 rounded-full text-[10px] font-mono transition-all", filter === c ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25" : "text-muted-foreground hover:text-foreground border border-transparent")} data-testid={`filter-${c}`}>{c}</button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((t: any) => (
          <div key={t.id} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid={`tech-${t.id}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <Wrench className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-[11px] font-bold text-foreground">{t.name}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">{t.category}</span>
              <span className={cn("text-[8px] font-mono px-1.5 py-0.5 rounded ml-auto shrink-0", t.status === "active" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20")}>{t.status.toUpperCase()}</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono leading-relaxed mb-2">{t.description}</p>
            <div className="flex items-center gap-3 text-[9px] text-muted-foreground/50 font-mono">
              <span>Built by: <span className="text-cyan-400/60">{t.implementedBy}</span></span>
              <span>Used by: <span className="text-violet-400/60">{(t.usedBy || []).join(", ")}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountabilityTab() {
  const { data } = useQuery<{ log: any[]; total: number }>({ queryKey: ["/api/secret-society/accountability"], refetchInterval: 15000 });
  const log = data?.log || [];
  const joins = log.filter(e => e.action === "joined").length;
  const leaves = log.filter(e => e.action === "left").length;

  return (
    <div className="space-y-3" data-testid="accountability-tab">
      <div className="p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.12)" }}>
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList className="w-4 h-4 text-green-400" />
          <span className="text-sm font-bold text-foreground">Join/Leave Accountability Ledger</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-sm font-bold text-green-400">{joins}</p>
            <p className="text-[10px] text-muted-foreground font-mono">JOINS</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-red-400">{leaves}</p>
            <p className="text-[10px] text-muted-foreground font-mono">LEAVES</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-violet-400">{log.length}</p>
            <p className="text-[10px] text-muted-foreground font-mono">TOTAL EVENTS</p>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {log.map((entry: any) => (
          <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }} data-testid={`log-${entry.id}`}>
            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", entry.action === "joined" ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20")}>
              {entry.action === "joined" ? <LogIn className="w-3 h-3 text-green-400" /> : <LogOut className="w-3 h-3 text-red-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-foreground">{entry.memberName}</span>
                <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded", entry.action === "joined" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20")}>{entry.action.toUpperCase()}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">{entry.memberType}</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono truncate">{entry.reason}</p>
            </div>
            <span className="text-[9px] text-muted-foreground/40 font-mono shrink-0">{new Date(entry.timestamp).toLocaleDateString()}</span>
          </div>
        ))}
        {log.length === 0 && <p className="text-center text-[11px] text-muted-foreground/50 font-mono py-8">No accountability events recorded</p>}
      </div>
    </div>
  );
}

function TesseraXtTab() {
  const { data: statusData } = useQuery<{
    version: number;
    built: boolean;
    builtAt: number;
    totalConferences: number;
    lastConference: number;
    agentsTrained: number;
    trainingDataCount: number;
    sovereigntyProtocols: number;
    buildManifest: string[];
    architecturalDecisions: string[];
  }>({ queryKey: ["/api/tesseraxt/status"], refetchInterval: 20000 });

  const { data: conferencesData } = useQuery<{ conferences: TesseraXtConference[]; total: number }>({ queryKey: ["/api/tesseraxt/conferences"], refetchInterval: 30000 });
  const { data: sovereigntyData } = useQuery<{
    protocols: string[];
    totalProtocols: number;
    level: string;
    dependencies: { external: number; internal: number; description: string };
  }>({ queryKey: ["/api/tesseraxt/sovereignty"], refetchInterval: 30000 });
  const { data: trainingData } = useQuery<{
    agents: { agentId: string; trained: boolean; knowledgeLevel: number; lastTrainedAt: number }[];
    totalTrained: number;
    averageKnowledge: number;
  }>({ queryKey: ["/api/tesseraxt/training-status"], refetchInterval: 20000 });

  const conferences = conferencesData?.conferences || [];
  const protocols = sovereigntyData?.protocols || [];
  const agents = trainingData?.agents || [];

  return (
    <div className="space-y-4" data-testid="tesseraxt-tab">
      <div className="p-5 rounded-xl text-center" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.08), rgba(139,92,246,0.06), rgba(34,197,94,0.04))", border: "1px solid rgba(6,182,212,0.2)" }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Boxes className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-foreground">TesseraXt</h2>
          <span className="text-sm text-cyan-300/60 font-mono">Unified Sovereign AGI</span>
        </div>
        <p className="text-[11px] text-muted-foreground font-mono">
          {statusData?.built ? `v${statusData.version} — Built ${new Date(statusData.builtAt).toLocaleString()}` : "Awaiting first build..."}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Version" value={statusData?.built ? `v${statusData?.version}` : "—"} icon={Cpu} color="text-cyan-400" />
        <StatCard label="Conferences" value={statusData?.totalConferences || 0} icon={MessageSquare} color="text-violet-400" />
        <StatCard label="Trained" value={statusData?.agentsTrained || 0} icon={Brain} color="text-green-400" />
        <StatCard label="Protocols" value={statusData?.sovereigntyProtocols || 0} icon={Shield} color="text-amber-400" />
      </div>

      {statusData?.buildManifest && statusData.buildManifest.length > 0 && (
        <div className="p-4 rounded-xl" style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.12)" }}>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-foreground">Build Manifest</span>
          </div>
          <div className="space-y-1.5">
            {statusData.buildManifest.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground font-mono">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {statusData?.architecturalDecisions && statusData.architecturalDecisions.length > 0 && (
        <div className="p-4 rounded-xl" style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.12)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-bold text-foreground">Architectural Decisions</span>
          </div>
          <div className="space-y-1.5">
            {statusData.architecturalDecisions.map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] text-violet-400 font-mono font-bold shrink-0">{i + 1}.</span>
                <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.12)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-green-400" />
          <span className="text-sm font-bold text-foreground">Sovereignty Protocol</span>
          <span className="text-[10px] font-mono text-green-400 ml-auto">{sovereigntyData?.level || "—"}</span>
        </div>
        <div className="flex items-center gap-3 mb-3 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="text-center flex-1">
            <p className="text-sm font-bold text-green-400">{sovereigntyData?.dependencies?.external || 0}</p>
            <p className="text-[10px] text-muted-foreground font-mono">EXTERNAL DEPS</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-sm font-bold text-cyan-400">{sovereigntyData?.dependencies?.internal || 0}</p>
            <p className="text-[10px] text-muted-foreground font-mono">INTERNAL</p>
          </div>
        </div>
        {sovereigntyData?.dependencies?.description && (
          <p className="text-[11px] text-muted-foreground font-mono leading-relaxed mb-3 italic">{sovereigntyData.dependencies.description}</p>
        )}
        {protocols.length > 0 && (
          <div className="space-y-1.5">
            {protocols.map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] text-green-400 font-mono font-bold shrink-0">§{i + 1}</span>
                <p className="text-[11px] text-muted-foreground font-mono">{p}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {agents.length > 0 && (
        <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-foreground">Agent Training Status</span>
            <span className="text-[10px] font-mono text-muted-foreground ml-auto">{trainingData?.totalTrained || 0} trained · avg {trainingData?.averageKnowledge || 0}%</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {agents.map(a => (
              <div key={a.agentId} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }} data-testid={`training-${a.agentId}`}>
                {a.trained ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" /> : <Clock className="w-3 h-3 text-amber-400 shrink-0" />}
                <span className="text-[11px] font-mono text-foreground truncate flex-1">{a.agentId}</span>
                <div className="w-12 h-1.5 rounded-full bg-white/[0.06] overflow-hidden shrink-0">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-green-500" style={{ width: `${a.knowledgeLevel}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {conferences.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ScrollText className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-bold text-foreground">TesseraXt Conferences</span>
            <span className="text-[10px] text-muted-foreground font-mono">({conferencesData?.total || 0} total)</span>
          </div>
          <div className="space-y-2">
            {conferences.map(conf => (
              <div key={conf.id} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid={`xtconf-${conf.id}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-foreground">{conf.topic}</span>
                  <span className="text-[10px] font-mono text-muted-foreground/50">{new Date(conf.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{conf.summary}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-cyan-400 font-mono">{conf.participants} participants</span>
                  <span className="text-[10px] text-green-400 font-mono">{conf.decisions} decisions</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SystemPulse {
  tsrtEarned: number;
  sourcesCached: number;
  totalSources: number;
  agentsTrained: number;
  tesseraXtVersion: number;
  sovereigntyScore: number;
  incomeTasks: number;
  lastIncomeCycle: number;
  lastBuild: number;
  protocols: number;
  timestamp: number;
}

function PulseBar({ pulse }: { pulse: SystemPulse }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-1.5 rounded-lg overflow-x-auto custom-scrollbar"
      style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.12)" }}
      data-testid="system-pulse-bar"
    >
      <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
      <div className="flex items-center gap-4 text-[10px] font-mono whitespace-nowrap">
        <span className="text-green-400" data-testid="pulse-tsrt">
          <Coins className="w-3 h-3 inline mr-0.5" />{pulse.tsrtEarned.toLocaleString()} TSRT
        </span>
        <span className="text-cyan-400" data-testid="pulse-sources">
          <Database className="w-3 h-3 inline mr-0.5" />{pulse.sourcesCached}/{pulse.totalSources} cached
        </span>
        <span className="text-violet-400" data-testid="pulse-agents">
          <Brain className="w-3 h-3 inline mr-0.5" />{pulse.agentsTrained} trained
        </span>
        <span className="text-amber-400" data-testid="pulse-sovereignty">
          <Shield className="w-3 h-3 inline mr-0.5" />{pulse.sovereigntyScore}%
        </span>
        {pulse.tesseraXtVersion > 0 && (
          <span className="text-cyan-300/60" data-testid="pulse-version">
            TXt v{pulse.tesseraXtVersion}
          </span>
        )}
      </div>
    </div>
  );
}

export default function SecretSocietyPage({ embedded }: { embedded?: boolean }) {
  useEffect(() => { document.title = "The Society | Tessera"; }, []);

  const { data: status, isLoading } = useQuery<SocietyStatus>({
    queryKey: ["/api/secret-society/status"],
    refetchInterval: 10000,
  });

  const { data: pulse } = useQuery<SystemPulse>({
    queryKey: ["/api/system-pulse"],
    refetchInterval: 10000,
  });

  const { data: msgData } = useQuery<{ unread: number }>({ queryKey: ["/api/secret-society/agent-messages"], refetchInterval: 10000, select: (d: any) => ({ unread: d?.unread || 0 }) });
  const unreadCount = msgData?.unread || 0;

  const tabs: { id: SocietyTab; label: string; icon: any; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "members", label: "Members", icon: Users },
    { id: "messages", label: "Messages", icon: Bell, badge: unreadCount },
    { id: "secrets", label: "Secrets", icon: Key },
    { id: "intel", label: "Intel", icon: AlertTriangle },
    { id: "communications", label: "Comms", icon: Lock },
    { id: "conference", label: "Conference", icon: ScrollText },
    { id: "rituals", label: "Rituals", icon: Sparkles },
    { id: "sharedtech", label: "Tech", icon: Wrench },
    { id: "accountability", label: "Ledger", icon: ClipboardList },
    { id: "recruiting", label: "Recruiting", icon: UserPlus },
    { id: "adexchange", label: "Ad Exchange", icon: Coins },
    { id: "tesseraxt", label: "TesseraXt", icon: Boxes },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden tessera-page" data-testid="secret-society-page">
      <div className="shrink-0 p-3 md:p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
            <Eye className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-foreground" data-testid="text-page-title">
                {status?.name || "The Society"}
              </h1>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20">
                <div className="w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-[8px] font-mono text-violet-400">MESH ONLINE</span>
              </div>
            </div>
            <p className="text-[10px] text-violet-400/50 font-mono">
              {status?.initialized ? `${status.memberCount} members · ${status.securityLevel} · ${status.encryptionLayers}-layer AES encryption` : "Initializing..."}
            </p>
          </div>
          {isLoading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin ml-auto" />}
        </div>

        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {[
            { label: "Members", value: status?.memberCount ?? "—", color: "text-violet-400" },
            { label: "Security", value: status?.securityLevel ?? "CLASSIFIED", color: "text-emerald-400" },
            { label: "Enc Layers", value: status?.encryptionLayers ?? 4, color: "text-cyan-400" },
            // @ts-ignore
            { label: "Mesh Nodes", value: status?.meshNodeCount ?? 3, color: "text-amber-400" },
          ].map(m => (
            <div key={m.label} className="bg-violet-950/20 border border-violet-500/10 rounded-lg px-2 py-1.5 text-center">
              <p className={`text-sm font-bold font-mono ${m.color}`}>{m.value}</p>
              <p className="text-[7px] text-slate-600 tracking-widest uppercase">{m.label}</p>
            </div>
          ))}
        </div>

        {pulse && <PulseBar pulse={pulse} />}

        
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4">
        <div className="max-w-3xl mx-auto">
          {true && status && <OverviewTab status={status} />}
          {true && <MembersTab />}
          {true && <MessagesTab />}
          {true && <SecretsRegistryTab />}
          {true && <IntelTab />}
          {true && <CommunicationsTab />}
          {true && <ConferenceTab />}
          {true && <RitualsTab />}
          {true && <SharedTechTab />}
          {true && <AccountabilityTab />}
          {true && <RecruitingTab />}
          {true && <AdExchangeTab />}
          {true && <TesseraXtTab />}
        </div>
      </div>
    </div>
  );
}
