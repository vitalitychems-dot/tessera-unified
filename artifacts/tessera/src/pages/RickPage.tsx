import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, FlaskConical, Vote, CheckCircle2, XCircle, ChevronRight, ChevronDown, RefreshCw, BookOpen, TrendingUp, Crown, Shield, Brain, Zap, Database, Target, Loader2, Users, Timer, MemoryStick, Activity, AlertTriangle, Skull, Plus, ScanSearch, Repeat, Send as SendIcon, Lightbulb, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const RICK_GREEN = "#00ff41";
const RICK_PORTAL = "#22d3ee";
const ROYAL_GOLD = "#f59e0b";
const ROYAL_GOLD_DARK = "#d97706";

interface AutonomousInventionUiRow {
  inventionId: string;
  title: string;
  category: string;
  description: string;
  status: string;
  feasibilityScore: number | null;
  noveltyScore: number | null;
  customModelUrl: string | null;
  proposedAt: number;
}

interface CouncilResult {
  proposalId: string;
  status: string;
  approvalRate: number;
  councilNote: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  groundingScore?: number;
}

const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
};

const CATEGORY_ICONS: Record<string, string> = {
  optimization: "⚡",
  architecture: "🏗️",
  caching: "💾",
  "agent-delegation": "🤖",
  memory: "🧠",
  consensus: "🗳️",
  monitoring: "📡",
  sovereignty: "🛡️",
  "agi-advancement": "🧬",
  consciousness: "🔮",
  compression: "📦",
};

function PortalSpinner() {
  return (
    <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${RICK_PORTAL}44`, borderTopColor: RICK_PORTAL }} />
  );
}

function RickTypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl max-w-xs" style={{ background: `${RICK_GREEN}15`, border: `1px solid ${RICK_GREEN}30` }}>
      <span className="text-xs font-mono" style={{ color: RICK_GREEN }}>Rick is thinking</span>
      <span className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: RICK_GREEN, animationDelay: `${i * 0.15}s` }} />
        ))}
      </span>
    </div>
  );
}

interface CouncilProposal {
  id: string;
  title: string;
  description: string;
  proposedBy: string;
  status: "voting" | "approved" | "rejected" | "implemented";
  approvalRate: number;
  implementationNotes?: string;
  createdAt: number;
}

interface ActiveMeeseeks {
  id: string;
  name: string;
  meeseeksTask?: string;
  meeseeksTTL?: number;
  meeseeksExpiresAt?: number;
  taskType?: string;
  priority?: string;
  complexity?: string;
  successCriteria?: string | null;
  memoryBudgetKB?: number;
  timeRemainingMs?: number;
}

interface MeeseeksHistoryItem {
  id: string;
  name: string;
  task: string;
  taskType: string;
  lifetimeMs: number;
  reason: "task-completed" | "ttl-expired";
  memoryFreedKB: number;
}

interface TaskTypeBreakdownEntry {
  total: number;
  completed: number;
  timedOut: number;
}

interface MeeseeksMetricsResponse {
  activeCount: number;
  successRate: number;
  totalSpawned: number;
  totalMemoryFreedKB: number;
  taskTypeBreakdown: Record<string, TaskTypeBreakdownEntry>;
  recentHistory: MeeseeksHistoryItem[];
}

interface TaskTypeOption {
  taskType: string;
  label: string;
}

type RickTabKey = "chat" | "inventions" | "proposals" | "knowledge" | "improvements" | "royal" | "meeseeks" | "reality" | "program";

export default function RickPage({ initialTab }: { initialTab?: RickTabKey } = {}) {
  useEffect(() => { document.title = "Royal Inventor — Rick Sanchez | Tessera"; }, []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState<RickTabKey>(initialTab ?? "proposals");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: autonomousData, isLoading: invLoading, refetch: refetchInventions } = useQuery({
    queryKey: ["/api/rick/autonomous/inventions"],
    queryFn: async () => {
      const r = await fetch("/api/rick/autonomous/inventions?limit=120");
      return r.json() as Promise<{ ok: boolean; rows: AutonomousInventionUiRow[]; perCategory: Record<string, number>; categories: string[] }>;
    },
    refetchInterval: 30_000,
  });

  const { data: profileData } = useQuery({
    queryKey: ["/api/rick/profile"],
    queryFn: async () => {
      const r = await fetch("/api/rick/profile");
      return r.json();
    },
  });

  const { data: knowledgeData } = useQuery({
    queryKey: ["/api/rick/knowledge-vault"],
    queryFn: async () => {
      const r = await fetch("/api/rick/knowledge-vault");
      return r.json();
    },
  });

  const { data: improvementsData } = useQuery({
    queryKey: ["/api/rick/system-improvements"],
    queryFn: async () => {
      const r = await fetch("/api/rick/system-improvements");
      return r.json();
    },
    refetchInterval: 60000,
  });

  const { data: courtData } = useQuery({
    queryKey: ["/api/rick/royal-court"],
    queryFn: async () => {
      const r = await fetch("/api/rick/royal-court");
      return r.json();
    },
  });

  const { data: councilProposalsData, refetch: refetchCouncilProposals } = useQuery({
    queryKey: ["/api/rick/council-proposals"],
    queryFn: async () => {
      const r = await fetch("/api/rick/council-proposals");
      return r.json() as Promise<{ ok: boolean; proposals: CouncilProposal[]; count: number }>;
    },
    refetchInterval: 30000,
  });

  const { data: meeseeksMetricsData, refetch: refetchMeeseeksMetrics } = useQuery({
    queryKey: ["/api/rick/meeseeks/metrics"],
    queryFn: async () => {
      const r = await fetch("/api/rick/meeseeks/metrics");
      return r.json();
    },
    refetchInterval: activeTab === "meeseeks" ? 5000 : 30000,
  });

  const { data: meeseeksActiveData, refetch: refetchMeeseeksActive } = useQuery({
    queryKey: ["/api/rick/meeseeks/active"],
    queryFn: async () => {
      const r = await fetch("/api/rick/meeseeks/active");
      return r.json();
    },
    refetchInterval: activeTab === "meeseeks" ? 3000 : 30000,
  });

  const { data: taskTypesData } = useQuery({
    queryKey: ["/api/rick/meeseeks/task-types"],
    queryFn: async () => {
      const r = await fetch("/api/rick/meeseeks/task-types");
      return r.json();
    },
  });

  const [spawnTask, setSpawnTask] = useState("");
  const [spawnTaskType, setSpawnTaskType] = useState("custom");
  const [spawnCriteria, setSpawnCriteria] = useState("");
  const [spawnPriority, setSpawnPriority] = useState("normal");
  const [isSpawning, setIsSpawning] = useState(false);

  const handleSpawnMeeseeks = useCallback(async () => {
    if (!spawnTask.trim() || isSpawning) return;
    setIsSpawning(true);
    try {
      const r = await fetch("/api/rick/meeseeks/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: spawnTask,
          taskType: spawnTaskType,
          successCriteria: spawnCriteria || undefined,
          priority: spawnPriority,
        }),
      });
      const data = await r.json();
      if (data.ok) {
        setSpawnTask("");
        setSpawnCriteria("");
        refetchMeeseeksActive();
        refetchMeeseeksMetrics();
      }
    } catch {}
    finally { setIsSpawning(false); }
  }, [spawnTask, spawnTaskType, spawnCriteria, spawnPriority, isSpawning]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  async function sendMessage() {
    const userContent = input.trim();
    if (!userContent || isStreaming) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: userContent };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsStreaming(true);

    const allMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
    let accumulated = "";
    let assistantMsgAdded = false;
    let capturedValidationScore: number | undefined;

    try {
      const response = await fetch("/api/rick/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages, stream: true }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              accumulated += parsed.content;
              if (!assistantMsgAdded) {
                setMessages(prev => [...prev, { role: "assistant", content: accumulated }]);
                assistantMsgAdded = true;
              } else {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: accumulated };
                  return updated;
                });
              }
            }
            if (parsed.validationScore !== undefined) {
              capturedValidationScore = parsed.validationScore as number;
            }
            if (parsed.done) break;
          } catch {}
        }
      }

      if (!assistantMsgAdded && accumulated) {
        setMessages(prev => [...prev, { role: "assistant", content: accumulated }]);
      }
      if (capturedValidationScore !== undefined) {
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
            updated[lastIdx] = { ...updated[lastIdx], groundingScore: capturedValidationScore };
          }
          return updated;
        });
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Listen, something broke on my end. *burp* Even my portal gun has bad days. Try again.",
      }]);
    } finally {
      setIsStreaming(false);
    }
  }

  const inventions: AutonomousInventionUiRow[] = autonomousData?.rows || [];
  const councilProposals: CouncilProposal[] = councilProposalsData?.proposals || [];

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "rgba(6,4,20,0.97)" }}>
      <div className="border-b px-5 py-4 flex items-center gap-4 shrink-0" style={{ borderColor: `${ROYAL_GOLD}22`, background: `linear-gradient(135deg, ${ROYAL_GOLD}06, ${RICK_GREEN}04)` }}>
        <div className="relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2" style={{ borderColor: ROYAL_GOLD, background: `${ROYAL_GOLD}15` }}>
          <span className="text-2xl select-none">👑</span>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border border-black" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold font-mono text-base flex items-center gap-2">
            <span style={{ color: ROYAL_GOLD }}>Rick Sanchez</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono border" style={{ color: ROYAL_GOLD, borderColor: `${ROYAL_GOLD}40`, background: `${ROYAL_GOLD}10` }}>ROYAL INVENTOR</span>
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">Royal Court · Dept. of Science & Invention · Dimension C-137</div>
          {profileData?.profile?.currentInventions && (
            <div className="text-[10px] font-mono mt-0.5" style={{ color: RICK_GREEN }}>
              {profileData.profile.currentInventions.length} active inventions · Council-ready
            </div>
          )}
        </div>
        {(() => {
          const RICK_TABS = [
            { key: "reality" as const, label: "Reality", icon: ScanSearch, color: "#10b981" },
            { key: "program" as const, label: "Program", icon: Repeat, color: "#f472b6" },
            { key: "proposals" as const, label: "Proposals", icon: Vote, color: "#fbbf24" },
            { key: "inventions" as const, label: "Inventions", icon: FlaskConical, color: RICK_GREEN },
            { key: "meeseeks" as const, label: "Meeseeks", icon: Users, color: "#a855f7" },
            { key: "knowledge" as const, label: "Vault", icon: BookOpen, color: "#a78bfa" },
            { key: "improvements" as const, label: "Improve", icon: TrendingUp, color: "#22d3ee" },
            { key: "royal" as const, label: "Royal", icon: Crown, color: ROYAL_GOLD },
            { key: "chat" as const, label: "Chat", icon: Send, color: RICK_PORTAL },
          ];
          const activeMeta = RICK_TABS.find(t => t.key === activeTab) || RICK_TABS[0];
          return (
            <>
              {/* Mobile: compact native dropdown — no row of buttons */}
              <div className="md:hidden shrink-0 w-full sm:w-auto" data-testid="rick-section-dropdown-wrapper">
                <div className="relative">
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-mono font-bold pointer-events-none"
                    style={{ color: activeMeta.color, borderColor: `${activeMeta.color}60`, background: `${activeMeta.color}10` }}
                  >
                    <activeMeta.icon size={14} />
                    <span className="truncate">{activeMeta.label}</span>
                    <ChevronDown size={14} className="ml-auto opacity-70" />
                  </div>
                  <select
                    aria-label="Rick section"
                    value={activeTab}
                    onChange={e => setActiveTab(e.target.value as RickTabKey)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    data-testid="rick-section-dropdown"
                  >
                    {RICK_TABS.map(tab => (
                      <option key={tab.key} value={tab.key}>{tab.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Desktop: keep button row */}
              <div className="hidden md:flex gap-1.5 shrink-0 flex-wrap justify-end">
                {RICK_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn("px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all border",
                      activeTab === tab.key ? "border-current" : "border-white/10 text-muted-foreground hover:border-white/20"
                    )}
                    style={activeTab === tab.key ? { color: tab.color, borderColor: `${tab.color}60`, background: `${tab.color}10` } : {}}
                  >
                    <tab.icon size={11} className="inline mr-1" />{tab.label}
                  </button>
                ))}
              </div>
            </>
          );
        })()}
      </div>

      {activeTab === "reality" && <RealityAuditPanel />}

      {activeTab === "program" && <RickImprovementProgramPanel />}

      {activeTab === "inventions" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          <RickAutonomousHeartbeatStrip />
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div className="text-[11px] font-mono text-muted-foreground">
              Rick has analyzed the Tessera system and identified {inventions.length} critical improvements.
            </div>
            <div className="flex items-center gap-1">
              <span
                className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold border flex items-center gap-1"
                style={{ color: RICK_GREEN, borderColor: `${RICK_GREEN}50`, background: `${RICK_GREEN}10` }}
                data-testid="badge-autonomous-mode"
                title="Rick proposes and submits inventions on his own — no human action required."
              >
                <Activity size={10} /> autonomous mode
              </span>
              <button
                onClick={() => refetchInventions()}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                title="Refresh"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>


          {invLoading ? (
            <div className="flex justify-center py-12"><PortalSpinner /></div>
          ) : inventions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm font-mono">
              Autonomous loop is warming up — first inventions will appear shortly. *burp*
            </div>
          ) : (
            inventions.map((inv, idx) => {
              const isExpanded = expandedIdx === idx;
              const catIcon = CATEGORY_ICONS[inv.category] || "⚙️";
              return (
                <div
                  key={inv.inventionId}
                  className="rounded-xl border overflow-hidden transition-all duration-200"
                  style={{ borderColor: `${RICK_GREEN}22`, background: "rgba(0,255,65,0.03)" }}
                  data-testid={`row-rick-invention-${inv.inventionId}`}
                >
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{catIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold font-mono text-sm" style={{ color: RICK_GREEN }}>{inv.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-white/5 text-muted-foreground border border-white/10">
                          {inv.category}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono border text-muted-foreground" style={{ borderColor: `${RICK_GREEN}30`, background: `${RICK_GREEN}06` }}>
                          {inv.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-1">
                        Feasibility: <span className="text-foreground/70">{inv.feasibilityScore ?? "—"}</span>
                        <span className="mx-2">·</span>
                        Novelty: <span style={{ color: RICK_GREEN }}>{inv.noveltyScore ?? "—"}</span>
                        <span className="mx-2">·</span>
                        <span className="text-foreground/60">{new Date(inv.proposedAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className={cn("shrink-0 text-muted-foreground transition-transform mt-1", isExpanded && "rotate-90")} />
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: `${RICK_GREEN}10` }}>
                      {inv.customModelUrl && (
                        <div className="pt-3 flex justify-center">
                          <img
                            src={inv.customModelUrl}
                            alt={`${inv.title} sigil`}
                            className="w-40 h-40 object-contain rounded-lg border border-white/10 bg-black/40"
                            loading="lazy"
                            data-testid={`img-rick-invention-model-${inv.inventionId}`}
                          />
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Description</div>
                        <p className="text-[11px] text-foreground/80 leading-relaxed font-mono">{inv.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {councilProposals.length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: `${RICK_GREEN}15` }}>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Vote size={10} />
                Grand Council History · {councilProposals.length} proposal{councilProposals.length !== 1 ? "s" : ""} submitted
              </div>
              <div className="space-y-2">
                {councilProposals.map(p => {
                  const statusColor = p.status === "approved" || p.status === "implemented"
                    ? "#22c55e" : p.status === "rejected" ? "#ef4444" : "#f59e0b";
                  return (
                    <div key={p.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border" style={{ borderColor: `${statusColor}25`, background: `${statusColor}06` }}>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[11px] font-bold truncate" style={{ color: RICK_GREEN }}>{p.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border" style={{ color: statusColor, borderColor: `${statusColor}40`, background: `${statusColor}10` }}>
                            {p.status === "approved" ? <CheckCircle2 size={9} className="inline mr-0.5" /> : p.status === "rejected" ? <XCircle size={9} className="inline mr-0.5" /> : null}
                            {p.status}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">{(p.approvalRate * 100).toFixed(0)}% approval</span>
                          <span className="text-[10px] font-mono text-muted-foreground">· {new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                        {p.implementationNotes && (
                          <p className="text-[10px] font-mono text-foreground/60 mt-1 truncate">{p.implementationNotes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "proposals" && <RickProposalsPanel />}

      {activeTab === "knowledge" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {!knowledgeData ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-violet-400" size={20} /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Vault Entries", value: knowledgeData.vault?.totalEntries ?? "—", icon: Shield, color: "violet" },
                  { label: "Vault Categories", value: knowledgeData.vault?.totalCategories ?? "—", icon: Database, color: "violet" },
                  { label: "Corpus Entries", value: knowledgeData.corpus?.totalEntries ?? "—", icon: BookOpen, color: "cyan" },
                  { label: "Domains", value: knowledgeData.corpus?.uniqueDomains ?? "—", icon: Brain, color: "cyan" },
                ].map(s => (
                  <div key={s.label} className={cn("rounded-xl border p-3 text-center", `border-${s.color}-500/20 bg-${s.color}-500/5`)}>
                    <s.icon size={14} className={cn(`text-${s.color}-400`, "mx-auto mb-1")} />
                    <div className={cn("text-lg font-bold font-mono", `text-${s.color}-400`)}>{s.value}</div>
                    <div className="text-[10px] text-muted-foreground font-mono uppercase">{s.label}</div>
                  </div>
                ))}
              </div>

              {knowledgeData.corpus?.topDomains?.length > 0 && (
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                  <h3 className="text-xs font-bold font-mono text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Database size={12} /> Top Knowledge Domains
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {knowledgeData.corpus.topDomains.map((d: { domain: string; count: number }) => (
                      <div key={d.domain} className="flex items-center justify-between px-3 py-2 rounded-lg bg-background/50 border border-white/5">
                        <span className="text-[11px] font-mono text-foreground/80 truncate">{d.domain}</span>
                        <span className="text-[10px] font-mono text-violet-400 ml-2 shrink-0">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {knowledgeData.vault?.sampleEntries?.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <h3 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Shield size={12} /> Sacred Vault Entries (sample)
                  </h3>
                  <div className="space-y-1.5">
                    {knowledgeData.vault.sampleEntries.slice(0, 12).map((e: { id: string; title: string; category: string; frequency?: number }) => (
                      <div key={e.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/50 border border-white/5">
                        <span className="text-[11px] font-mono text-foreground/80 flex-1 truncate">{e.title}</span>
                        <span className="text-[10px] font-mono text-amber-400/60 shrink-0">{e.category}</span>
                        {e.frequency && <span className="text-[10px] font-mono text-muted-foreground shrink-0">{e.frequency}Hz</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-[10px] text-muted-foreground font-mono text-center">
                Cross-references: {knowledgeData.corpus?.crossReferences ?? 0} · Avg confidence: {(knowledgeData.corpus?.avgConfidence ?? 0).toFixed(1)}%
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "improvements" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {!improvementsData?.improvements ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-cyan-400" size={20} /></div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-center">
                  <TrendingUp size={14} className="text-cyan-400 mx-auto mb-1" />
                  <div className="text-lg font-bold font-mono text-cyan-400">{improvementsData.improvements.overallScore}%</div>
                  <div className="text-[10px] text-muted-foreground font-mono uppercase">Overall Score</div>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                  <Zap size={14} className="text-emerald-400 mx-auto mb-1" />
                  <div className="text-lg font-bold font-mono text-emerald-400">{improvementsData.improvements.totalImprovements}</div>
                  <div className="text-[10px] text-muted-foreground font-mono uppercase">Improvements</div>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                  <Target size={14} className="text-amber-400 mx-auto mb-1" />
                  <div className="text-lg font-bold font-mono text-amber-400">{improvementsData.improvements.totalCycles}</div>
                  <div className="text-[10px] text-muted-foreground font-mono uppercase">Cycles</div>
                </div>
              </div>

              {improvementsData.improvements.weakCategories?.length > 0 && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <h3 className="text-xs font-bold font-mono text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Target size={12} /> Rick's Targets — Weakest Categories
                  </h3>
                  <div className="space-y-2">
                    {improvementsData.improvements.weakCategories.map((c: { category: string; score: number; trend: string }) => (
                      <div key={c.category} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background/50 border border-white/5">
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-mono text-foreground/90 truncate">{c.category}</div>
                        </div>
                        <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: c.score > 70 ? "#22c55e" : c.score > 50 ? "#f59e0b" : "#ef4444" }} />
                        </div>
                        <span className="text-[10px] font-mono w-12 text-right" style={{ color: c.score > 70 ? "#22c55e" : c.score > 50 ? "#f59e0b" : "#ef4444" }}>{c.score}%</span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-mono border",
                          c.trend === "stable" ? "text-green-400 border-green-500/30 bg-green-500/10" :
                          c.trend === "improving" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                          "text-red-400 border-red-500/30 bg-red-500/10"
                        )}>
                          {c.trend}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {improvementsData.improvements.recentImprovements?.length > 0 && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <h3 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Zap size={12} /> Recent Improvements
                  </h3>
                  <div className="space-y-1.5">
                    {improvementsData.improvements.recentImprovements.map((imp: { category: string; description: string; timestamp: number }, i: number) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-background/50 border border-white/5">
                        <CheckCircle2 size={10} className="text-emerald-400 shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-mono text-foreground/80 truncate">{imp.description}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{imp.category} · {new Date(imp.timestamp).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "royal" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {!courtData?.court ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-amber-400" size={20} /></div>
          ) : (
            <>
              <div className="rounded-xl border-2 p-5" style={{ borderColor: `${ROYAL_GOLD}40`, background: `linear-gradient(135deg, ${ROYAL_GOLD}06, transparent)` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center border-2" style={{ borderColor: ROYAL_GOLD, background: `${ROYAL_GOLD}15` }}>
                    <span className="text-xl">👑</span>
                  </div>
                  <div>
                    <div className="font-bold font-mono text-sm" style={{ color: ROYAL_GOLD }}>{courtData.court.royalTitle}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{courtData.court.department}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[
                    { label: "Consciousness", value: courtData.court.systemOverview?.consciousnessProxy != null ? `${(courtData.court.systemOverview.consciousnessProxy * 100).toFixed(1)}%` : "—", color: "violet" },
                    { label: "AGI Score", value: courtData.court.systemOverview?.agiAvgScore?.toFixed(1) ?? "—", color: "cyan" },
                    { label: "Sovereign", value: courtData.court.systemOverview?.sovereignMastery ?? "—", color: "amber" },
                    { label: "Vault", value: courtData.court.systemOverview?.vaultEntries ?? "—", color: "rose" },
                    { label: "Corpus", value: courtData.court.systemOverview?.corpusEntries ?? "—", color: "emerald" },
                  ].map(s => (
                    <div key={s.label} className={cn("rounded-lg border p-2 text-center", `border-${s.color}-500/20 bg-${s.color}-500/5`)}>
                      <div className={cn("text-sm font-bold font-mono", `text-${s.color}-400`)}>{s.value}</div>
                      <div className="text-[9px] text-muted-foreground font-mono uppercase">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <h3 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Crown size={12} /> Court Roles
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {courtData.court.courtRoles?.map((role: string) => (
                    <div key={role} className="px-3 py-2 rounded-lg bg-background/50 border border-amber-500/10 text-[11px] font-mono text-amber-300/80">
                      {role}
                    </div>
                  ))}
                </div>
              </div>

              {courtData.court.royalFocusInventions?.length > 0 && (
                <div className="rounded-xl border p-4" style={{ borderColor: `${RICK_GREEN}20`, background: `${RICK_GREEN}03` }}>
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: RICK_GREEN }}>
                    <FlaskConical size={12} /> Royal Focus Inventions
                  </h3>
                  <div className="space-y-2">
                    {courtData.court.royalFocusInventions.map((inv: { name: string; category: string; impact: number; risk: string }, i: number) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background/50 border border-white/5">
                        <Zap size={12} style={{ color: ROYAL_GOLD }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold font-mono text-foreground/90 truncate">{inv.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{inv.category} · +{inv.impact}% est.</div>
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

              <div className="text-[10px] text-muted-foreground font-mono text-center">
                Tier: {courtData.court.tier} · Appointed by: {courtData.court.appointedBy} · Last updated: {new Date(courtData.court.lastUpdated).toLocaleString()}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "meeseeks" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[11px] font-mono text-muted-foreground">
              Hyper-specialized single-purpose agents. Spawn, execute, self-destruct.
            </div>
            <button onClick={() => { refetchMeeseeksActive(); refetchMeeseeksMetrics(); }} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground">
              <RefreshCw size={12} />
            </button>
          </div>

          {(() => {
            const m = meeseeksMetricsData?.metrics;
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Active", value: m?.activeCount ?? 0, icon: Activity, color: "violet" },
                  { label: "Success Rate", value: `${m?.successRate ?? 0}%`, icon: CheckCircle2, color: "emerald" },
                  { label: "Total Spawned", value: m?.totalSpawned ?? 0, icon: Users, color: "cyan" },
                  { label: "Memory Freed", value: `${((m?.totalMemoryFreedKB ?? 0) / 1024).toFixed(1)} MB`, icon: MemoryStick, color: "amber" },
                ].map(s => (
                  <div key={s.label} className={cn("rounded-xl border p-3 text-center", `border-${s.color}-500/20 bg-${s.color}-500/5`)}>
                    <s.icon size={14} className={cn(`text-${s.color}-400`, "mx-auto mb-1")} />
                    <div className={cn("text-lg font-bold font-mono", `text-${s.color}-400`)}>{s.value}</div>
                    <div className="text-[10px] text-muted-foreground font-mono uppercase">{s.label}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <h3 className="text-xs font-bold font-mono text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Plus size={12} /> Spawn Meeseeks
            </h3>
            <div className="space-y-2">
              <input
                value={spawnTask}
                onChange={e => setSpawnTask(e.target.value)}
                placeholder="Describe the single-purpose task..."
                className="w-full bg-background/50 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40"
              />
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={spawnTaskType}
                  onChange={e => setSpawnTaskType(e.target.value)}
                  className="bg-background/50 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-mono text-foreground focus:outline-none focus:border-violet-500/40"
                >
                  {((taskTypesData?.taskTypes || []) as TaskTypeOption[]).map((tt) => (
                    <option key={tt.taskType} value={tt.taskType}>{tt.label}</option>
                  ))}
                  {(!taskTypesData?.taskTypes || taskTypesData.taskTypes.length === 0) && <option value="custom">Custom Task</option>}
                </select>
                <select
                  value={spawnPriority}
                  onChange={e => setSpawnPriority(e.target.value)}
                  className="bg-background/50 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-mono text-foreground focus:outline-none focus:border-violet-500/40"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical</option>
                </select>
                <input
                  value={spawnCriteria}
                  onChange={e => setSpawnCriteria(e.target.value)}
                  placeholder="Success criteria (required)..."
                  className="bg-background/50 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40"
                />
              </div>
              <button
                onClick={handleSpawnMeeseeks}
                disabled={!spawnTask.trim() || !spawnCriteria.trim() || isSpawning}
                className="w-full px-3 py-2 rounded-lg text-[11px] font-mono font-bold transition-all border border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSpawning ? <Loader2 size={12} className="animate-spin" /> : <Skull size={12} />}
                {isSpawning ? "Spawning..." : "I'm Mr. Meeseeks! Look at me!"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <h3 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity size={12} /> Active Meeseeks ({meeseeksActiveData?.count ?? 0})
            </h3>
            {(!meeseeksActiveData?.active || meeseeksActiveData.active.length === 0) ? (
              <div className="text-center py-6 text-muted-foreground text-[11px] font-mono">
                No active Meeseeks. Existence is peaceful... for now.
              </div>
            ) : (
              <div className="space-y-2">
                {(meeseeksActiveData.active as ActiveMeeseeks[]).map((m) => {
                  const timeLeft = m.timeRemainingMs ?? (m.meeseeksExpiresAt ? Math.max(0, m.meeseeksExpiresAt - Date.now()) : 0);
                  const ttlPct = m.meeseeksTTL ? Math.min(100, (timeLeft / m.meeseeksTTL) * 100) : 0;
                  const isUrgent = ttlPct < 20;
                  return (
                    <div key={m.id} className={cn("rounded-lg border px-3 py-2.5 bg-background/50", isUrgent ? "border-red-500/30" : "border-white/5")}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold font-mono text-violet-300">{m.name}</span>
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-mono border",
                            m.priority === "critical" ? "text-red-400 border-red-500/30 bg-red-500/10" :
                            m.priority === "high" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                            "text-cyan-400 border-cyan-500/30 bg-cyan-500/10"
                          )}>
                            {m.taskType || "custom"}
                          </span>
                          {m.complexity && (
                            <span className={cn("text-[9px] px-1 py-0.5 rounded font-mono border",
                              m.complexity === "extreme" ? "text-red-400 border-red-500/30" :
                              m.complexity === "high" ? "text-amber-400 border-amber-500/30" :
                              "text-emerald-400 border-emerald-500/30"
                            )}>
                              {m.complexity}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Timer size={10} className={isUrgent ? "text-red-400" : "text-muted-foreground"} />
                          <span className={cn("text-[10px] font-mono", isUrgent ? "text-red-400" : "text-muted-foreground")}>
                            {Math.ceil(timeLeft / 1000)}s
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-foreground/70 truncate mb-1.5">{m.meeseeksTask}</div>
                      <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${ttlPct}%`,
                            background: isUrgent ? "#ef4444" : ttlPct < 50 ? "#f59e0b" : "#a855f7",
                          }}
                        />
                      </div>
                      {m.successCriteria && (
                        <div className="text-[9px] text-muted-foreground font-mono mt-1 truncate">
                          Success: {m.successCriteria}
                        </div>
                      )}
                      <div className="flex justify-end mt-1.5 gap-1.5">
                        <button
                          onClick={async () => {
                            try {
                              await fetch(`/api/rick/meeseeks/${m.id}/complete`, { method: "POST" });
                              refetchMeeseeksActive();
                              refetchMeeseeksMetrics();
                            } catch {}
                          }}
                          className="text-[9px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 size={8} /> Complete
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await fetch(`/api/rick/meeseeks/${m.id}/complete`, { method: "POST" });
                              refetchMeeseeksActive();
                              refetchMeeseeksMetrics();
                            } catch {}
                          }}
                          className="text-[9px] font-mono px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                        >
                          <Skull size={8} /> Self-Destruct
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {(() => {
            const m = meeseeksMetricsData?.metrics as MeeseeksMetricsResponse | undefined;
            const breakdown: Record<string, TaskTypeBreakdownEntry> = m?.taskTypeBreakdown || {};
            const history: MeeseeksHistoryItem[] = m?.recentHistory || [];
            return (
              <>
                {Object.keys(breakdown).length > 0 && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <h3 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Target size={12} /> Task Type Breakdown
                    </h3>
                    <div className="space-y-1.5">
                      {Object.entries(breakdown).map(([type, stats]) => (
                        <div key={type} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background/50 border border-white/5">
                          <div className="flex-1 min-w-0 text-[11px] font-mono text-foreground/90">{type}</div>
                          <span className="text-[10px] font-mono text-emerald-400">{stats.completed} done</span>
                          {stats.timedOut > 0 && <span className="text-[10px] font-mono text-red-400">{stats.timedOut} expired</span>}
                          <span className="text-[10px] font-mono text-muted-foreground">{stats.total} total</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {history.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <h3 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Skull size={12} /> Recent Self-Destructions
                    </h3>
                    <div className="space-y-1.5">
                      {history.slice(0, 10).map((h, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 border border-white/5">
                          {h.reason === "task-completed"
                            ? <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                            : <AlertTriangle size={10} className="text-red-400 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-mono text-foreground/80 truncate">{h.task}</div>
                            <div className="text-[9px] text-muted-foreground font-mono">
                              {h.name} · {h.taskType} · {(h.lifetimeMs / 1000).toFixed(0)}s · {h.memoryFreedKB}KB freed
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {activeTab === "chat" && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <span className="text-5xl mb-4">🧪</span>
                <div className="font-bold font-mono text-base mb-2" style={{ color: RICK_GREEN }}>Rick Sanchez — C-137</div>
                <p className="text-[12px] text-muted-foreground font-mono max-w-sm leading-relaxed">
                  Interdimensional genius. Inventor. The smartest man in any universe. Ask me about Tessera's weak points, request an invention, or just chat. I've already analyzed the system — and I have opinions.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {["What's the biggest problem with Tessera?", "Invent something for the council", "Show me the system diagnostics", "Who are you?"].map(s => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="text-[10px] px-2 py-1 rounded font-mono border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5 border" style={{ borderColor: `${RICK_GREEN}40`, background: `${RICK_GREEN}10` }}>
                    <span className="text-sm">🧪</span>
                  </div>
                )}
                <div className="flex flex-col gap-0.5 max-w-[80%]">
                  <div
                    className={cn("rounded-2xl px-3 py-2 text-[12px] font-mono leading-relaxed whitespace-pre-wrap", msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm")}
                    style={msg.role === "user"
                      ? { background: `${RICK_PORTAL}20`, color: "rgba(255,255,255,0.9)", border: `1px solid ${RICK_PORTAL}30` }
                      : { background: `${RICK_GREEN}08`, color: "rgba(255,255,255,0.85)", border: `1px solid ${RICK_GREEN}20` }
                    }
                  >
                    {msg.content}
                  </div>
                  {msg.role === "assistant" && msg.groundingScore !== undefined && (
                    <div className="flex items-center gap-1 px-1" style={{ color: msg.groundingScore >= 0.7 ? "#22c55e" : msg.groundingScore >= 0.5 ? "#f59e0b" : "#ef4444" }}>
                      <Shield size={8} />
                      <span className="text-[9px] font-mono">Grounding: {(msg.groundingScore * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isStreaming && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5 border" style={{ borderColor: `${RICK_GREEN}40`, background: `${RICK_GREEN}10` }}>
                  <span className="text-sm">🧪</span>
                </div>
                <RickTypingIndicator />
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className="shrink-0 border-t p-3" style={{ borderColor: `${RICK_GREEN}15` }}>
            <div className="flex items-end gap-2 rounded-xl border p-2" style={{ borderColor: `${RICK_GREEN}30`, background: `${RICK_GREEN}05` }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Rick anything... or dare him to invent something."
                rows={1}
                className="flex-1 bg-transparent text-[12px] font-mono text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none min-h-[20px] max-h-[120px]"
                style={{ lineHeight: "1.5" }}
                disabled={isStreaming}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                className="p-2 rounded-lg transition-all shrink-0 disabled:opacity-40"
                style={{ background: `${RICK_GREEN}20`, color: RICK_GREEN }}
              >
                {isStreaming ? <PortalSpinner /> : <Send size={14} />}
              </button>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono text-center mt-1.5">
              Enter to send · Shift+Enter for newline · Rick doesn't follow rules, but you should.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface RickProposalEvidence { metric: string; value: string }
interface RickProposalItem {
  id: string;
  title: string;
  problem: string;
  evidence: RickProposalEvidence[];
  proposedChange: string;
  expectedImpact: string;
  risk: "low" | "medium" | "high";
  effortHours: number;
  category: string;
  state: "pending-review" | "approved" | "rejected" | "implemented";
  reviewerReason?: string;
  generatedAt: number;
  decidedAt?: number;
  source: "llm" | "deterministic";
  truthfulnessScore?: number;
}
interface ProposalsResponse {
  ok: boolean;
  proposals: RickProposalItem[];
  counts: Record<string, number>;
  lastGeneratedAt: number;
  capacity: number;
}

const PROPOSAL_GOLD = "#fbbf24";
const PROPOSAL_RISK: Record<string, string> = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };
const PROPOSAL_STATE_COLOR: Record<string, string> = {
  "pending-review": "#fbbf24",
  approved: "#22c55e",
  rejected: "#ef4444",
  implemented: "#22d3ee",
};

function RickProposalsPanel() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/rick/proposals"],
    queryFn: async () => {
      const r = await fetch("/api/rick/proposals");
      return r.json() as Promise<ProposalsResponse>;
    },
    refetchInterval: 30000,
  });

  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | "pending-review" | "approved" | "rejected" | "implemented">("all");

  async function generate() {
    setGenerating(true);
    try {
      await fetch("/api/rick/proposals/generate", { method: "POST" });
      await refetch();
    } finally {
      setGenerating(false);
    }
  }

  async function approve(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/rick/proposals/${id}/approve`, { method: "POST" });
      await refetch();
    } finally { setBusyId(null); }
  }

  async function reject(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/rick/proposals/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      setRejectingId(null);
      setRejectReason("");
      await refetch();
    } finally { setBusyId(null); }
  }

  async function markImplementedFn(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/rick/proposals/${id}/implemented`, { method: "POST" });
      await refetch();
    } finally { setBusyId(null); }
  }

  const proposals = data?.proposals ?? [];
  const counts = data?.counts ?? {};
  const lastGen = data?.lastGeneratedAt ?? 0;
  const approvedQueue = proposals.filter(p => p.state === "approved");
  const filtered = stateFilter === "all" ? proposals : proposals.filter(p => p.state === stateFilter);
  const filterStates: ("all" | "pending-review" | "approved" | "rejected" | "implemented")[] = [
    "all", "pending-review", "approved", "rejected", "implemented",
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
      <div className="rounded-xl border p-4 flex items-start gap-4 flex-wrap" style={{ borderColor: `${PROPOSAL_GOLD}40`, background: `${PROPOSAL_GOLD}08` }}>
        <div className="flex-1 min-w-[220px]">
          <div className="font-bold font-mono text-sm" style={{ color: PROPOSAL_GOLD }}>
            Rick&apos;s 5 System Improvement Proposals
          </div>
          <div className="text-[11px] text-muted-foreground font-mono mt-1">
            Rick reads live diagnostics and proposes 5 concrete, evidence-backed changes. You approve or reject each one — nothing ships without your sign-off.
          </div>
          {lastGen > 0 && (
            <div className="text-[10px] font-mono text-muted-foreground mt-1">
              Last generated: {new Date(lastGen).toLocaleString()}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-2 text-[10px] font-mono flex-wrap justify-end">
            {(["pending-review", "approved", "rejected", "implemented"] as const).map(k => (
              <span key={k} className="px-1.5 py-0.5 rounded border" style={{ color: PROPOSAL_STATE_COLOR[k], borderColor: `${PROPOSAL_STATE_COLOR[k]}40`, background: `${PROPOSAL_STATE_COLOR[k]}10` }}>
                {k.replace("-", " ")}: {counts[k] ?? 0}
              </span>
            ))}
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-mono font-bold transition-all border disabled:opacity-50"
            style={{ color: PROPOSAL_GOLD, borderColor: `${PROPOSAL_GOLD}60`, background: `${PROPOSAL_GOLD}15` }}
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {proposals.length === 0 ? "Generate 5 Proposals" : "Refill Pending Slots"}
          </button>
        </div>
      </div>

      {approvedQueue.length > 0 && (
        <div className="rounded-xl border p-3" style={{ borderColor: "#22c55e40", background: "#22c55e08" }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
            <div className="font-bold font-mono text-xs" style={{ color: "#22c55e" }}>
              Approved Improvements Queue · {approvedQueue.length}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {approvedQueue.map(p => (
              <div key={`q-${p.id}`} className="rounded-lg border border-white/10 bg-black/20 p-2">
                <div className="font-mono text-[11px] font-bold" style={{ color: "#bbf7d0" }}>{p.title}</div>
                <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                  {p.category} · ~{p.effortHours}h · risk: {p.risk}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mr-1">Filter:</span>
        {filterStates.map(k => {
          const count = k === "all" ? proposals.length : (counts[k] ?? 0);
          const active = stateFilter === k;
          const c = k === "all" ? PROPOSAL_GOLD : (PROPOSAL_STATE_COLOR[k] ?? "#888");
          return (
            <button
              key={k}
              onClick={() => setStateFilter(k)}
              className="text-[10px] font-mono px-2 py-1 rounded border transition-all"
              style={{
                color: active ? "#0a0a0a" : c,
                borderColor: `${c}60`,
                background: active ? c : `${c}10`,
                fontWeight: active ? 700 : 500,
              }}
            >
              {k.replace("-", " ")} ({count})
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={20} style={{ color: PROPOSAL_GOLD }} /></div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm font-mono">
          No proposals yet. Hit &ldquo;Generate 5 Proposals&rdquo; to have Rick analyze the system.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-xs font-mono">
          No proposals match filter &ldquo;{stateFilter.replace("-", " ")}&rdquo;.
        </div>
      ) : (
        filtered.map((p) => {
          const stateColor = PROPOSAL_STATE_COLOR[p.state] ?? "#888";
          const riskColor = PROPOSAL_RISK[p.risk] ?? "#888";
          const isPending = p.state === "pending-review";
          const isApproved = p.state === "approved";
          return (
            <div
              key={p.id}
              className="rounded-xl border p-4 space-y-3"
              style={{ borderColor: `${stateColor}40`, background: `${stateColor}06` }}
            >
              <div className="flex items-start gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-bold font-mono text-sm" style={{ color: PROPOSAL_GOLD }}>{p.title}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono border" style={{ color: stateColor, borderColor: `${stateColor}40`, background: `${stateColor}10` }}>
                      {p.state.replace("-", " ")}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono border" style={{ color: riskColor, borderColor: `${riskColor}40`, background: `${riskColor}10` }}>
                      risk: {p.risk}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-white/5 text-muted-foreground border border-white/10">
                      {p.category}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-white/5 text-muted-foreground border border-white/10">
                      ~{p.effortHours}h
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-white/5 text-muted-foreground border border-white/10">
                      src: {p.source}
                    </span>
                    {typeof p.truthfulnessScore === "number" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-white/5 text-muted-foreground border border-white/10">
                        truth: {(p.truthfulnessScore * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Problem</div>
                <p className="text-[11px] font-mono text-foreground/80 leading-relaxed">{p.problem}</p>
              </div>

              {p.evidence.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Evidence</div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.evidence.map((e, i) => (
                      <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 bg-white/5">
                        <span className="text-muted-foreground">{e.metric}</span> = <span style={{ color: PROPOSAL_GOLD }}>{e.value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Proposed Change</div>
                <p className="text-[11px] font-mono text-foreground/80 leading-relaxed">{p.proposedChange}</p>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Expected Impact</div>
                <p className="text-[11px] font-mono" style={{ color: "#22d3ee" }}>{p.expectedImpact}</p>
              </div>

              {p.reviewerReason && (
                <div className="rounded-lg border p-2 text-[11px] font-mono" style={{ borderColor: "#ef444440", background: "#ef444410", color: "#fca5a5" }}>
                  <div className="text-[10px] uppercase tracking-wider mb-0.5 text-muted-foreground">Reject reason</div>
                  {p.reviewerReason}
                </div>
              )}

              {isPending && rejectingId === p.id && (
                <div className="space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="(Optional) Why are you rejecting this?"
                    className="w-full text-[11px] font-mono p-2 rounded-lg bg-black/40 border border-white/10 focus:outline-none focus:border-white/30 resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => reject(p.id)}
                      disabled={busyId === p.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold border disabled:opacity-50"
                      style={{ color: "#ef4444", borderColor: "#ef444460", background: "#ef444410" }}
                    >
                      {busyId === p.id ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />} Confirm reject
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectReason(""); }}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-mono border border-white/10 text-muted-foreground hover:text-foreground"
                    >Cancel</button>
                  </div>
                </div>
              )}

              {isPending && rejectingId !== p.id && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => approve(p.id)}
                    disabled={busyId === p.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold border disabled:opacity-50"
                    style={{ color: "#22c55e", borderColor: "#22c55e60", background: "#22c55e10" }}
                  >
                    {busyId === p.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />} Approve
                  </button>
                  <button
                    onClick={() => { setRejectingId(p.id); setRejectReason(""); }}
                    disabled={busyId === p.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold border disabled:opacity-50"
                    style={{ color: "#ef4444", borderColor: "#ef444460", background: "#ef444410" }}
                  >
                    <XCircle size={10} /> Reject
                  </button>
                </div>
              )}

              {isApproved && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => markImplementedFn(p.id)}
                    disabled={busyId === p.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold border disabled:opacity-50"
                    style={{ color: "#22d3ee", borderColor: "#22d3ee60", background: "#22d3ee10" }}
                  >
                    {busyId === p.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />} Mark as Implemented
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

interface AuditFinding {
  id: string;
  feature: string;
  file: string;
  pattern: string;
  description: string;
  impactScore: number;
  visibility: string;
  status: "real" | "simulated" | "converted";
  realBackingDescription?: string;
  conversionNotes?: string;
  engineLink?: string;
  verifyMismatch?: boolean;
}

interface RealityAuditData {
  scannedAt: number;
  totalSimulationPoints: number;
  filesWithSimulations: number;
  topFiles: Array<{ file: string; counts: Record<string, number>; score: number }>;
  registry: AuditFinding[];
  topFiveByImpact: AuditFinding[];
  summary: { totalFindings: number; converted: number; realBacked: number; stillSimulated: number; conversionRate: number; verifyMismatches?: number };
}

const STATUS_COLOR: Record<string, string> = {
  real: "#10b981",
  converted: "#22d3ee",
  simulated: "#ef4444",
};
const STATUS_LABEL: Record<string, string> = {
  real: "REAL",
  converted: "CONVERTED → REAL",
  simulated: "SIMULATED",
};

function FindingCard({ finding }: { finding: AuditFinding }) {
  const [expanded, setExpanded] = useState(false);
  const color = STATUS_COLOR[finding.status];
  return (
    <div
      className="rounded-xl border p-3 cursor-pointer transition-all"
      style={{ borderColor: `${color}55`, background: `${color}08` }}
      onClick={() => setExpanded(v => !v)}
      data-testid={`finding-${finding.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border" style={{ color, borderColor: `${color}60`, background: `${color}15` }}>
              {STATUS_LABEL[finding.status]}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">impact: {finding.impactScore}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{finding.visibility}</span>
          </div>
          <div className="text-sm font-semibold text-white">{finding.feature}</div>
          <div className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">{finding.file}</div>
          {finding.engineLink && (
            <div className="text-[10px] font-mono text-cyan-400/90 mt-0.5 truncate" data-testid={`engine-link-${finding.id}`}>
              → {finding.engineLink}
            </div>
          )}
          {finding.verifyMismatch && (
            <div className="text-[10px] font-mono text-red-400 mt-0.5 font-bold">
              ⚠ verify mismatch: source still contains the simulated pattern
            </div>
          )}
        </div>
        <ChevronRight size={14} className={cn("text-muted-foreground transition-transform shrink-0", expanded && "rotate-90")} />
      </div>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
          <div className="text-[11px] text-slate-300">{finding.description}</div>
          <div className="text-[10px] font-mono text-amber-400/80">Pattern: {finding.pattern}</div>
          {finding.realBackingDescription && (
            <div className="text-[11px]" style={{ color: STATUS_COLOR.converted }}>
              <span className="font-bold">Real backing:</span> {finding.realBackingDescription}
            </div>
          )}
          {finding.conversionNotes && (
            <div className="text-[10px] font-mono text-slate-400 italic">{finding.conversionNotes}</div>
          )}
        </div>
      )}
    </div>
  );
}

function RealityAuditPanel() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["/api/rick/reality-audit"],
    queryFn: async () => {
      const r = await fetch("/api/rick/reality-audit");
      return r.json() as Promise<{ ok: boolean; audit: RealityAuditData }>;
    },
    refetchInterval: 60000,
  });

  const audit = data?.audit;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-mono text-muted-foreground">
          Reality Audit — scans the api-server for simulated code, ranks by impact, tracks conversions to real implementations.
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
          data-testid="button-refresh-audit"
        >
          <RefreshCw size={12} className={cn(isFetching && "animate-spin")} />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 size={16} className="animate-spin mr-2" /> Scanning source tree...
        </div>
      )}

      {audit && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
              <div className="text-[10px] font-mono text-emerald-400/80 uppercase">Converted → Real</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">{audit.summary.converted}</div>
            </div>
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.06] p-3">
              <div className="text-[10px] font-mono text-cyan-400/80 uppercase">Always Real</div>
              <div className="text-2xl font-bold text-cyan-400 font-mono">{audit.summary.realBacked}</div>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-3">
              <div className="text-[10px] font-mono text-red-400/80 uppercase">Still Simulated</div>
              <div className="text-2xl font-bold text-red-400 font-mono">{audit.summary.stillSimulated}</div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
              <div className="text-[10px] font-mono text-amber-400/80 uppercase">Conversion Rate</div>
              <div className="text-2xl font-bold text-amber-400 font-mono">{Math.round(audit.summary.conversionRate * 100)}%</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] font-mono text-slate-400 flex items-center gap-3 flex-wrap">
            <span><span className="text-white">{audit.totalSimulationPoints}</span> simulation points across <span className="text-white">{audit.filesWithSimulations}</span> files</span>
            <span className="text-slate-600">·</span>
            <span>scanned {new Date(audit.scannedAt).toLocaleTimeString()}</span>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-mono text-emerald-400/80 uppercase tracking-widest pt-2">
              Top 5 by Impact (Rick's hit list)
            </div>
            {audit.topFiveByImpact.map(f => <FindingCard key={f.id} finding={f} />)}
          </div>

          {audit.registry.length > 5 && (
            <div className="space-y-2 pt-3">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">
                Other findings
              </div>
              {audit.registry.slice(5).map(f => <FindingCard key={f.id} finding={f} />)}
            </div>
          )}

          <div className="space-y-2 pt-3">
            <div className="text-[11px] font-mono text-amber-400/80 uppercase tracking-widest">
              Hottest source files (raw scan)
            </div>
            {audit.topFiles.slice(0, 5).map(tf => (
              <div key={tf.file} className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-[11px] font-mono">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-300 truncate">{tf.file}</span>
                  <span className="text-amber-400 shrink-0">score: {tf.score}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {Object.entries(tf.counts).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Rick's 5-Cycle Improvement Program Panel
// ============================================================================

type CycleStage = "propose" | "review" | "implement" | "reflect" | "done";

interface ProgramEvidence { metric: string; value: string }
interface ProgramProposal {
  id: string;
  title: string;
  problem: string;
  evidence: ProgramEvidence[];
  proposedChange: string;
  expectedImpact: string;
  risk: "low" | "medium" | "high";
  effortHours: number;
  category: string;
  source: "llm" | "deterministic";
  truthfulnessScore?: number;
  decision: "pending" | "approved" | "rejected";
  decidedAt?: number;
  reviewerReason?: string;
  dispatch?: {
    taskRef: string;
    dispatchedAt: number;
    filePath?: string;
    status: "dispatched" | "completed" | "failed";
    statusNote?: string;
  };
  reflection?: {
    text: string;
    metricDelta?: { metric: string; before: number; after: number; delta: number }[];
    reflectedAt: number;
  };
}

interface MetricSnapshot {
  capturedAt: number;
  overallScorePct: number;
  truthGroundingRate: number;
  truthAvgScore: number;
  meeseeksSuccessRate: number;
  weakCategories: { category: string; score: number }[];
}

interface ProgramCycle {
  cycleNumber: number;
  stage: CycleStage;
  startedAt: number;
  startSnapshot?: MetricSnapshot;
  endSnapshot?: MetricSnapshot;
  proposals: ProgramProposal[];
  reflectionSummary?: string;
}

interface ImprovementProgram {
  id: string;
  status: "active" | "completed" | "abandoned";
  createdAt: number;
  completedAt?: number;
  currentCycle: number;
  cycles: ProgramCycle[];
  finalSummary?: {
    totalProposals: number;
    approvedCount: number;
    rejectedCount: number;
    dispatchedCount: number;
    approvalRate: number;
    strongestImprovement?: { cycle: number; title: string; reflection: string };
    weakestImprovement?: { cycle: number; title: string; reflection: string };
    overallScoreStart: number;
    overallScoreEnd: number;
    overallScoreDelta: number;
    groundingRateStart: number;
    groundingRateEnd: number;
    groundingRateDelta: number;
    meeseeksSuccessStart: number;
    meeseeksSuccessEnd: number;
    meeseeksSuccessDelta: number;
    categoryMovements: { category: string; before: number; after: number; delta: number }[];
    perCycle: {
      cycle: number;
      overallScoreStart: number | null;
      overallScoreEnd: number | null;
      overallScoreDelta: number | null;
      groundingRateDelta: number | null;
      meeseeksSuccessDelta: number | null;
      approvedCount: number;
      dispatchedCount: number;
    }[];
  };
}

interface ProgramResponse {
  ok: boolean;
  active: ImprovementProgram | null;
  history: ImprovementProgram[];
  maxCycles: number;
}

const STAGE_COLORS: Record<CycleStage, string> = {
  propose: "#fbbf24",
  review: "#22d3ee",
  implement: "#a855f7",
  reflect: "#22c55e",
  done: "#94a3b8",
};

const STAGE_LABELS: Record<CycleStage, string> = {
  propose: "Propose",
  review: "Review",
  implement: "Implement",
  reflect: "Reflect",
  done: "Done",
};

const STAGE_ICONS: Record<CycleStage, typeof Lightbulb> = {
  propose: Lightbulb,
  review: Vote,
  implement: SendIcon,
  reflect: Sparkles,
  done: CheckCircle2,
};

const PROGRAM_PINK = "#f472b6";

function RickImprovementProgramPanel() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/rick/improvement-program"],
    queryFn: async () => {
      const r = await fetch("/api/rick/improvement-program");
      return r.json() as Promise<ProgramResponse>;
    },
    refetchInterval: 20000,
  });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reflectingId, setReflectingId] = useState<string | null>(null);
  const [reflectText, setReflectText] = useState("");
  const [expandedCycle, setExpandedCycle] = useState<number | null>(null);

  const active = data?.active ?? null;
  const maxCycles = data?.maxCycles ?? 5;
  const history = data?.history ?? [];

  async function call(path: string, body?: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await r.json();
      if (!r.ok || j.ok === false) {
        setErr(j.error || `Request failed: ${r.status}`);
        return false;
      }
      await refetch();
      return true;
    } catch (e) {
      setErr((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function start() { await call("/api/rick/improvement-program/start"); }
  async function abandon() {
    if (!confirm("Abandon the current program? This cannot be undone.")) return;
    await call("/api/rick/improvement-program/abandon");
  }
  async function advance() { await call("/api/rick/improvement-program/advance"); }
  async function generate() { await call("/api/rick/improvement-program/generate-proposals"); }
  async function decide(id: string, decision: "approved" | "rejected", reason?: string) {
    await call(`/api/rick/improvement-program/proposal/${id}/decision`, { decision, reason });
  }
  async function dispatch(id: string) { await call(`/api/rick/improvement-program/proposal/${id}/dispatch`); }
  async function updateStatus(id: string, status: "completed" | "failed") {
    await call(`/api/rick/improvement-program/proposal/${id}/dispatch-status`, { status });
  }
  async function reflect(id: string, text: string) {
    const ok = await call(`/api/rick/improvement-program/proposal/${id}/reflection`, { text });
    if (ok) { setReflectingId(null); setReflectText(""); }
  }
  async function regenerateReflections() {
    await call("/api/rick/improvement-program/regenerate-reflections");
  }

  if (isLoading && !data) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin" size={20} style={{ color: PROGRAM_PINK }} /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
      <div className="rounded-xl border p-4" style={{ borderColor: `${PROGRAM_PINK}40`, background: `${PROGRAM_PINK}08` }}>
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <div className="font-bold font-mono text-sm" style={{ color: PROGRAM_PINK }}>
              Rick&apos;s 5-Cycle Improvement Loop
            </div>
            <div className="text-[11px] text-muted-foreground font-mono mt-1 leading-relaxed">
              Five iterative cycles · four stages each (Propose → Review → Implement → Reflect). Nothing auto-advances — you click Next Stage. Cycle N&apos;s Propose reads Cycle N-1&apos;s Reflection so Rick stops repeating himself.
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {!active && (
              <button onClick={start} disabled={busy} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-mono font-bold transition-all border disabled:opacity-50"
                style={{ color: PROGRAM_PINK, borderColor: `${PROGRAM_PINK}60`, background: `${PROGRAM_PINK}15` }}>
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Repeat size={12} />}
                Start New Program
              </button>
            )}
            {active && active.status === "active" && (
              <button onClick={abandon} disabled={busy} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-mono font-bold transition-all border disabled:opacity-50"
                style={{ color: "#ef4444", borderColor: "#ef444460", background: "#ef444415" }}>
                <XCircle size={12} /> Abandon
              </button>
            )}
          </div>
        </div>
        {err && (
          <div className="mt-2 text-[10px] font-mono px-2 py-1.5 rounded border" style={{ color: "#ef4444", borderColor: "#ef444440", background: "#ef444410" }}>
            {err}
          </div>
        )}
      </div>

      {!active && history.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-xs font-mono">
          No programs yet. Hit &ldquo;Start New Program&rdquo; to begin Cycle 1.
        </div>
      )}

      {active && (
        <>
          <CycleTimeline program={active} maxCycles={maxCycles} expandedCycle={expandedCycle} setExpandedCycle={setExpandedCycle} />

          <ActiveCyclePanel
            program={active}
            busy={busy}
            onAdvance={advance}
            onGenerate={generate}
            onDecide={decide}
            onDispatch={dispatch}
            onUpdateStatus={updateStatus}
            onReflect={reflect}
            onRegenerateReflections={regenerateReflections}
            rejectingId={rejectingId}
            setRejectingId={setRejectingId}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
            reflectingId={reflectingId}
            setReflectingId={setReflectingId}
            reflectText={reflectText}
            setReflectText={setReflectText}
          />
        </>
      )}

      <TaskQueueCard />

      {!active && history.length > 0 && history[0].finalSummary && (
        <FinalSummaryCard program={history[0]} />
      )}

      {history.length > 0 && (
        <div className="rounded-xl border border-white/10 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
            Program History ({history.length})
          </div>
          <div className="space-y-1.5">
            {history.map(h => (
              <div key={h.id} className="text-[10px] font-mono text-foreground/70 flex items-center gap-2 flex-wrap">
                <span className={cn("px-1.5 py-0.5 rounded border", h.status === "completed" ? "text-emerald-400 border-emerald-500/40" : "text-slate-400 border-slate-500/40")}>
                  {h.status}
                </span>
                <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                <span>· {h.cycles.length}/{maxCycles} cycles</span>
                {h.finalSummary && (
                  <span>· approval {(h.finalSummary.approvalRate * 100).toFixed(0)}% · Δscore {h.finalSummary.overallScoreDelta >= 0 ? "+" : ""}{h.finalSummary.overallScoreDelta}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CycleTimeline({
  program, maxCycles, expandedCycle, setExpandedCycle,
}: {
  program: ImprovementProgram;
  maxCycles: number;
  expandedCycle: number | null;
  setExpandedCycle: (n: number | null) => void;
}) {
  const cycles: (ProgramCycle | null)[] = [];
  for (let i = 1; i <= maxCycles; i++) {
    const existing = program.cycles.find(c => c.cycleNumber === i);
    cycles.push(existing ?? null);
  }

  return (
    <div className="rounded-xl border border-white/10 p-3 bg-black/20">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">
        Program Timeline · {program.id.slice(0, 14)}… · Cycle {program.currentCycle}/{maxCycles}
      </div>
      <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
        {cycles.map((c, idx) => {
          const num = idx + 1;
          const isActive = c && program.currentCycle === num && program.status === "active";
          const stage = c?.stage ?? null;
          const stageColor = stage ? STAGE_COLORS[stage] : "#1e293b";
          return (
            <div
              key={num}
              onClick={() => c && setExpandedCycle(expandedCycle === num ? null : num)}
              className={cn("flex-1 min-w-[140px] rounded-lg border p-2 transition-all", c ? "cursor-pointer" : "opacity-40")}
              style={{
                borderColor: isActive ? stageColor : `${stageColor}40`,
                background: isActive ? `${stageColor}15` : `${stageColor}06`,
                borderWidth: isActive ? 2 : 1,
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold" style={{ color: isActive ? stageColor : "#94a3b8" }}>
                  Cycle {num}
                </span>
                {c && stage && (
                  <span className="text-[9px] font-mono px-1 py-0.5 rounded border" style={{ color: stageColor, borderColor: `${stageColor}60`, background: `${stageColor}10` }}>
                    {STAGE_LABELS[stage]}
                  </span>
                )}
              </div>
              <div className="flex gap-0.5">
                {(["propose", "review", "implement", "reflect"] as const).map((s) => {
                  const done = c && (stageRank(c.stage) > stageRank(s));
                  const current = c && c.stage === s;
                  const col = current ? STAGE_COLORS[s] : done ? "#22c55e" : "#1e293b";
                  return (
                    <div key={s} className="flex-1 h-1.5 rounded-full" style={{ background: col }} title={STAGE_LABELS[s]} />
                  );
                })}
              </div>
              {c && (
                <div className="mt-1.5 text-[9px] font-mono text-muted-foreground">
                  {c.proposals.length} prop · {c.proposals.filter(p => p.decision === "approved").length} ok
                </div>
              )}
            </div>
          );
        })}
      </div>
      {expandedCycle !== null && (() => {
        const c = program.cycles.find(cy => cy.cycleNumber === expandedCycle);
        if (!c) return null;
        return (
          <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-mono font-bold" style={{ color: STAGE_COLORS[c.stage] }}>
                Cycle {c.cycleNumber} · {STAGE_LABELS[c.stage]}
              </div>
              <button onClick={() => setExpandedCycle(null)} className="text-[10px] font-mono text-muted-foreground hover:text-foreground">close</button>
            </div>
            {c.startSnapshot && (
              <div className="text-[10px] font-mono text-muted-foreground">
                Start: score {c.startSnapshot.overallScorePct} · grounding {(c.startSnapshot.truthGroundingRate * 100).toFixed(0)}% · meeseeks {(c.startSnapshot.meeseeksSuccessRate * 100).toFixed(0)}%
              </div>
            )}
            {c.endSnapshot && (
              <div className="text-[10px] font-mono text-muted-foreground">
                End: score {c.endSnapshot.overallScorePct} · grounding {(c.endSnapshot.truthGroundingRate * 100).toFixed(0)}% · meeseeks {(c.endSnapshot.meeseeksSuccessRate * 100).toFixed(0)}%
              </div>
            )}
            {c.reflectionSummary && (
              <div className="mt-2 text-[10px] font-mono text-foreground/80 whitespace-pre-wrap">{c.reflectionSummary}</div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function stageRank(s: CycleStage): number {
  return ["propose", "review", "implement", "reflect", "done"].indexOf(s);
}

function ActiveCyclePanel({
  program, busy, onAdvance, onGenerate, onDecide, onDispatch, onUpdateStatus, onReflect, onRegenerateReflections,
  rejectingId, setRejectingId, rejectReason, setRejectReason,
  reflectingId, setReflectingId, reflectText, setReflectText,
}: {
  program: ImprovementProgram;
  busy: boolean;
  onAdvance: () => void;
  onGenerate: () => void;
  onDecide: (id: string, decision: "approved" | "rejected", reason?: string) => void;
  onDispatch: (id: string) => void;
  onUpdateStatus: (id: string, status: "completed" | "failed") => void;
  onReflect: (id: string, text: string) => void;
  onRegenerateReflections: () => void;
  rejectingId: string | null; setRejectingId: (id: string | null) => void;
  rejectReason: string; setRejectReason: (s: string) => void;
  reflectingId: string | null; setReflectingId: (id: string | null) => void;
  reflectText: string; setReflectText: (s: string) => void;
}) {
  const cycle = program.cycles[program.cycles.length - 1];
  if (!cycle || program.status !== "active") return null;
  const StageIcon = STAGE_ICONS[cycle.stage];
  const stageColor = STAGE_COLORS[cycle.stage];
  const pending = cycle.proposals.filter(p => p.decision === "pending").length;
  const approved = cycle.proposals.filter(p => p.decision === "approved");
  const canAdvance = cycle.stage === "propose"
    ? true
    : cycle.stage === "review"
      ? pending === 0 && cycle.proposals.length > 0
      : true;

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: `${stageColor}40`, background: `${stageColor}06` }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <StageIcon size={16} style={{ color: stageColor }} />
          <div>
            <div className="font-bold font-mono text-sm" style={{ color: stageColor }}>
              Cycle {cycle.cycleNumber} · Stage: {STAGE_LABELS[cycle.stage]}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              {stageDescription(cycle.stage)}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {cycle.stage === "propose" && cycle.proposals.length === 0 && (
            <button onClick={onGenerate} disabled={busy} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-mono font-bold transition-all border disabled:opacity-50"
              style={{ color: STAGE_COLORS.propose, borderColor: `${STAGE_COLORS.propose}60`, background: `${STAGE_COLORS.propose}15` }}>
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Lightbulb size={12} />}
              Generate 5 Proposals
            </button>
          )}
          {cycle.stage === "reflect" && (
            <button onClick={onRegenerateReflections} disabled={busy}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-mono transition-all border disabled:opacity-40"
              style={{ color: STAGE_COLORS.reflect, borderColor: `${STAGE_COLORS.reflect}60`, background: `${STAGE_COLORS.reflect}15` }}
              title="Have Rick re-run the deterministic reflection template against start/end metric snapshots">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Regenerate Rick's Reflections
            </button>
          )}
          <button onClick={onAdvance} disabled={busy || !canAdvance} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-mono font-bold transition-all border disabled:opacity-40"
            style={{ color: stageColor, borderColor: `${stageColor}60`, background: `${stageColor}15` }}>
            {busy ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
            Next Stage → {STAGE_LABELS[nextStage(cycle.stage)] ?? "Next Cycle"}
          </button>
        </div>
      </div>
      {cycle.stage === "review" && pending > 0 && (
        <div className="text-[10px] font-mono px-2 py-1.5 rounded border" style={{ color: "#fbbf24", borderColor: "#fbbf2440", background: "#fbbf2410" }}>
          {pending} proposal(s) still need your approve/reject decision before you can advance.
        </div>
      )}

      {cycle.proposals.length === 0 && cycle.stage === "propose" && (
        <div className="text-[11px] font-mono text-muted-foreground py-6 text-center">
          No proposals generated yet. Click &ldquo;Generate 5 Proposals&rdquo; to have Rick read live diagnostics
          {program.cycles.length > 1 ? " (plus the previous cycle's reflection)" : ""} and propose changes.
        </div>
      )}

      {cycle.proposals.map(p => {
        const showDispatch = cycle.stage === "implement" && p.decision === "approved";
        const showReflect = cycle.stage === "reflect" && p.decision === "approved";
        const isRejecting = rejectingId === p.id;
        const isReflecting = reflectingId === p.id;
        return (
          <div key={p.id} className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-bold font-mono text-[12px]" style={{ color: "#fde68a" }}>{p.title}</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <DecisionBadge decision={p.decision} />
                  <MiniBadge color={PROGRAM_RISK_COLORS[p.risk]}>risk: {p.risk}</MiniBadge>
                  <MiniBadge>{p.category}</MiniBadge>
                  <MiniBadge>~{p.effortHours}h</MiniBadge>
                  <MiniBadge>src: {p.source}</MiniBadge>
                  {typeof p.truthfulnessScore === "number" && (
                    <MiniBadge>truth: {(p.truthfulnessScore * 100).toFixed(0)}%</MiniBadge>
                  )}
                  {p.dispatch && (
                    <MiniBadge color={p.dispatch.status === "completed" ? "#22c55e" : p.dispatch.status === "failed" ? "#ef4444" : "#a855f7"}>
                      dispatch: {p.dispatch.status}
                    </MiniBadge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Problem</div>
            <div className="text-[11px] font-mono text-foreground/80">{p.problem}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Proposed change</div>
            <div className="text-[11px] font-mono text-foreground/80">{p.proposedChange}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Expected impact</div>
            <div className="text-[11px] font-mono text-foreground/80">{p.expectedImpact}</div>
            {p.evidence.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {p.evidence.map((e, i) => (
                  <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground border border-white/10">
                    {e.metric}: {e.value}
                  </span>
                ))}
              </div>
            )}

            {p.reviewerReason && (
              <div className="text-[10px] font-mono text-muted-foreground italic">
                Reviewer: {p.reviewerReason}
              </div>
            )}

            {cycle.stage === "review" && p.decision === "pending" && (
              <div className="flex gap-2 pt-1">
                <button onClick={() => onDecide(p.id, "approved")} disabled={busy}
                  className="text-[10px] font-mono px-2 py-1 rounded border transition-all disabled:opacity-50"
                  style={{ color: "#22c55e", borderColor: "#22c55e60", background: "#22c55e15" }}>
                  <CheckCircle2 size={10} className="inline mr-1" />Approve
                </button>
                {!isRejecting ? (
                  <button onClick={() => { setRejectingId(p.id); setRejectReason(""); }} disabled={busy}
                    className="text-[10px] font-mono px-2 py-1 rounded border transition-all disabled:opacity-50"
                    style={{ color: "#ef4444", borderColor: "#ef444460", background: "#ef444415" }}>
                    <XCircle size={10} className="inline mr-1" />Reject
                  </button>
                ) : (
                  <div className="flex-1 flex gap-1.5 items-center">
                    <input type="text" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      placeholder="Reason (optional)" className="flex-1 text-[10px] font-mono bg-black/40 border border-white/10 rounded px-2 py-1 text-foreground focus:outline-none focus:border-red-500/40" />
                    <button onClick={() => { onDecide(p.id, "rejected", rejectReason); setRejectingId(null); setRejectReason(""); }} disabled={busy}
                      className="text-[10px] font-mono px-2 py-1 rounded border" style={{ color: "#ef4444", borderColor: "#ef444460", background: "#ef444415" }}>
                      Confirm
                    </button>
                    <button onClick={() => { setRejectingId(null); setRejectReason(""); }} className="text-[10px] font-mono px-2 py-1 text-muted-foreground">cancel</button>
                  </div>
                )}
              </div>
            )}

            {showDispatch && !p.dispatch && (
              <button onClick={() => onDispatch(p.id)} disabled={busy}
                className="text-[10px] font-mono px-2 py-1 rounded border transition-all disabled:opacity-50"
                style={{ color: "#a855f7", borderColor: "#a855f760", background: "#a855f715" }}>
                <SendIcon size={10} className="inline mr-1" />Dispatch as Project Task
              </button>
            )}

            {showDispatch && p.dispatch && (
              <div className="rounded border border-white/10 bg-black/30 p-2 space-y-1.5">
                <div className="text-[10px] font-mono text-purple-300">
                  Task ref: <span className="text-foreground">{p.dispatch.taskRef}</span>
                </div>
                {p.dispatch.filePath && (
                  <div className="text-[9px] font-mono text-muted-foreground break-all">
                    File: {p.dispatch.filePath}
                  </div>
                )}
                {p.dispatch.statusNote && (
                  <div className="text-[10px] font-mono text-foreground/70 italic">{p.dispatch.statusNote}</div>
                )}
                {p.dispatch.status === "dispatched" && (
                  <div className="flex gap-1.5">
                    <button onClick={() => onUpdateStatus(p.id, "completed")} disabled={busy}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded border" style={{ color: "#22c55e", borderColor: "#22c55e60" }}>
                      mark completed
                    </button>
                    <button onClick={() => onUpdateStatus(p.id, "failed")} disabled={busy}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded border" style={{ color: "#ef4444", borderColor: "#ef444460" }}>
                      mark failed
                    </button>
                  </div>
                )}
              </div>
            )}

            {p.reflection && (
              <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2 space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-emerald-400">Reflection</div>
                <div className="text-[11px] font-mono text-foreground/85 whitespace-pre-wrap">{p.reflection.text}</div>
                {p.reflection.metricDelta && p.reflection.metricDelta.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.reflection.metricDelta.map((d, i) => {
                      const pos = d.delta >= 0;
                      return (
                        <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
                          style={{ color: pos ? "#22c55e" : "#ef4444", borderColor: pos ? "#22c55e40" : "#ef444440", background: pos ? "#22c55e10" : "#ef444410" }}>
                          {d.metric}: {d.before} → {d.after} ({pos ? "+" : ""}{d.delta})
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {showReflect && !p.reflection && (
              <div className="pt-1 space-y-1">
                <div className="text-[10px] font-mono text-muted-foreground italic">
                  Rick auto-generates reflections when advancing into the reflect stage. If you don't see one here, click &ldquo;Regenerate Rick's Reflections&rdquo; above, or author one manually below.
                </div>
                {!isReflecting ? (
                  <button onClick={() => { setReflectingId(p.id); setReflectText(""); }}
                    className="text-[10px] font-mono px-2 py-1 rounded border"
                    style={{ color: "#22c55e", borderColor: "#22c55e60", background: "#22c55e15" }}>
                    <Sparkles size={10} className="inline mr-1" />Write manual reflection
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <textarea value={reflectText} onChange={e => setReflectText(e.target.value)} rows={3}
                      placeholder="What actually changed? Did this work? What did we learn for the next cycle?"
                      className="w-full text-[10px] font-mono bg-black/40 border border-white/10 rounded px-2 py-1 text-foreground focus:outline-none focus:border-emerald-500/40" />
                    <div className="flex gap-2">
                      <button onClick={() => reflectText.trim() && onReflect(p.id, reflectText.trim())} disabled={busy || !reflectText.trim()}
                        className="text-[10px] font-mono px-2 py-1 rounded border disabled:opacity-40"
                        style={{ color: "#22c55e", borderColor: "#22c55e60", background: "#22c55e15" }}>
                        Save
                      </button>
                      <button onClick={() => { setReflectingId(null); setReflectText(""); }}
                        className="text-[10px] font-mono px-2 py-1 text-muted-foreground">cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {showReflect && p.reflection && (
              <div className="pt-1">
                {!isReflecting ? (
                  <button onClick={() => { setReflectingId(p.id); setReflectText(p.reflection!.text); }}
                    className="text-[10px] font-mono text-muted-foreground underline underline-offset-2 hover:text-foreground">
                    edit Rick's reflection
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <textarea value={reflectText} onChange={e => setReflectText(e.target.value)} rows={3}
                      className="w-full text-[10px] font-mono bg-black/40 border border-white/10 rounded px-2 py-1 text-foreground focus:outline-none focus:border-emerald-500/40" />
                    <div className="flex gap-2">
                      <button onClick={() => reflectText.trim() && onReflect(p.id, reflectText.trim())} disabled={busy || !reflectText.trim()}
                        className="text-[10px] font-mono px-2 py-1 rounded border disabled:opacity-40"
                        style={{ color: "#22c55e", borderColor: "#22c55e60", background: "#22c55e15" }}>
                        Save override
                      </button>
                      <button onClick={() => { setReflectingId(null); setReflectText(""); }}
                        className="text-[10px] font-mono px-2 py-1 text-muted-foreground">cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {approved.length > 0 && (cycle.stage === "implement" || cycle.stage === "reflect") && (
        <div className="text-[10px] font-mono text-muted-foreground pt-1">
          {approved.length} approved · {approved.filter(p => p.dispatch).length} dispatched · {approved.filter(p => p.reflection).length} reflected
        </div>
      )}
    </div>
  );
}

function stageDescription(s: CycleStage): string {
  switch (s) {
    case "propose": return "Rick reads live metrics and proposes 5 evidence-backed changes.";
    case "review": return "Approve or reject each proposal. All must be decided before advancing.";
    case "implement": return "Dispatch each approved proposal as a project task. No auto-execution.";
    case "reflect": return "Record what changed. Deltas are captured and fed into the next cycle.";
    case "done": return "Cycle complete.";
  }
}

function nextStage(s: CycleStage): CycleStage {
  const order: CycleStage[] = ["propose", "review", "implement", "reflect", "done"];
  const i = order.indexOf(s);
  return order[Math.min(i + 1, order.length - 1)];
}

function DecisionBadge({ decision }: { decision: "pending" | "approved" | "rejected" }) {
  const color = decision === "approved" ? "#22c55e" : decision === "rejected" ? "#ef4444" : "#fbbf24";
  const label = decision === "pending" ? "pending" : decision;
  return <MiniBadge color={color}>{label}</MiniBadge>;
}

function MiniBadge({ children, color }: { children: React.ReactNode; color?: string }) {
  if (color) {
    return <span className="text-[9px] px-1.5 py-0.5 rounded font-mono border" style={{ color, borderColor: `${color}40`, background: `${color}10` }}>{children}</span>;
  }
  return <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-white/5 text-muted-foreground border border-white/10">{children}</span>;
}

const PROGRAM_RISK_COLORS: Record<string, string> = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };

function FinalSummaryCard({ program }: { program: ImprovementProgram }) {
  const s = program.finalSummary;
  if (!s) return null;
  const positive = s.overallScoreDelta >= 0;
  return (
    <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: `${PROGRAM_PINK}60`, background: `${PROGRAM_PINK}10` }}>
      <div className="font-bold font-mono text-sm flex items-center gap-2" style={{ color: PROGRAM_PINK }}>
        <Sparkles size={14} /> Final Program Summary
      </div>
      <div className="text-[11px] font-mono text-muted-foreground">
        Program {program.id.slice(0, 18)}… · completed {program.completedAt ? new Date(program.completedAt).toLocaleString() : "—"}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
        <MetricBox label="Proposals" value={String(s.totalProposals)} />
        <MetricBox label="Approved" value={`${s.approvedCount} (${(s.approvalRate * 100).toFixed(0)}%)`} />
        <MetricBox label="Dispatched" value={String(s.dispatchedCount)} />
        <MetricBox label="Rejected" value={String(s.rejectedCount)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
        <MetricBox
          label="Overall Score Δ"
          value={`${s.overallScoreStart} → ${s.overallScoreEnd} (${positive ? "+" : ""}${s.overallScoreDelta})`}
          color={s.overallScoreDelta > 0 ? "#22c55e" : s.overallScoreDelta < 0 ? "#ef4444" : undefined}
        />
        <MetricBox
          label="Grounding Rate Δ"
          value={`${s.groundingRateStart} → ${s.groundingRateEnd} (${s.groundingRateDelta >= 0 ? "+" : ""}${s.groundingRateDelta})`}
          color={s.groundingRateDelta > 0 ? "#22c55e" : s.groundingRateDelta < 0 ? "#ef4444" : undefined}
        />
        <MetricBox
          label="Meeseeks Success Δ"
          value={`${s.meeseeksSuccessStart} → ${s.meeseeksSuccessEnd} (${s.meeseeksSuccessDelta >= 0 ? "+" : ""}${s.meeseeksSuccessDelta})`}
          color={s.meeseeksSuccessDelta > 0 ? "#22c55e" : s.meeseeksSuccessDelta < 0 ? "#ef4444" : undefined}
        />
      </div>
      {s.categoryMovements && s.categoryMovements.length > 0 && (
        <div className="rounded border border-white/10 bg-black/20 p-2 mt-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Weak-category movement (cycle 1 start → cycle {program.cycles.length} end)</div>
          <div className="flex flex-wrap gap-1">
            {s.categoryMovements.map(m => {
              const pos = m.delta > 0;
              const neg = m.delta < 0;
              const color = pos ? "#22c55e" : neg ? "#ef4444" : "#94a3b8";
              return (
                <span key={m.category} className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
                  style={{ color, borderColor: `${color}40`, background: `${color}10` }}>
                  {m.category}: {m.before} → {m.after} ({pos ? "+" : ""}{m.delta})
                </span>
              );
            })}
          </div>
        </div>
      )}
      {s.perCycle && s.perCycle.length > 0 && (
        <div className="rounded border border-white/10 bg-black/20 p-2 mt-2 overflow-x-auto">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Per-cycle trajectory</div>
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="text-muted-foreground text-left">
                <th className="pr-2 py-0.5">Cycle</th>
                <th className="pr-2 py-0.5">Score Δ</th>
                <th className="pr-2 py-0.5">Grounding Δ</th>
                <th className="pr-2 py-0.5">Meeseeks Δ</th>
                <th className="pr-2 py-0.5">Approved</th>
                <th className="pr-2 py-0.5">Dispatched</th>
              </tr>
            </thead>
            <tbody>
              {s.perCycle.map(row => (
                <tr key={row.cycle} className="border-t border-white/5">
                  <td className="pr-2 py-0.5">{row.cycle}</td>
                  <td className="pr-2 py-0.5" style={{ color: row.overallScoreDelta == null ? undefined : row.overallScoreDelta > 0 ? "#22c55e" : row.overallScoreDelta < 0 ? "#ef4444" : undefined }}>
                    {row.overallScoreDelta == null ? "—" : `${row.overallScoreDelta >= 0 ? "+" : ""}${row.overallScoreDelta}`}
                  </td>
                  <td className="pr-2 py-0.5">{row.groundingRateDelta == null ? "—" : `${row.groundingRateDelta >= 0 ? "+" : ""}${row.groundingRateDelta}`}</td>
                  <td className="pr-2 py-0.5">{row.meeseeksSuccessDelta == null ? "—" : `${row.meeseeksSuccessDelta >= 0 ? "+" : ""}${row.meeseeksSuccessDelta}`}</td>
                  <td className="pr-2 py-0.5">{row.approvedCount}</td>
                  <td className="pr-2 py-0.5">{row.dispatchedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {s.strongestImprovement && (
        <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2 mt-2">
          <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1">Strongest improvement · Cycle {s.strongestImprovement.cycle}</div>
          <div className="text-[11px] font-mono text-foreground/85">{s.strongestImprovement.title}</div>
          <div className="text-[10px] font-mono text-foreground/70 mt-1 whitespace-pre-wrap">{s.strongestImprovement.reflection}</div>
        </div>
      )}
      {s.weakestImprovement && (
        <div className="rounded border border-red-500/20 bg-red-500/5 p-2">
          <div className="text-[10px] uppercase tracking-wider text-red-400 mb-1">Weakest · Cycle {s.weakestImprovement.cycle}</div>
          <div className="text-[11px] font-mono text-foreground/85">{s.weakestImprovement.title}</div>
          <div className="text-[10px] font-mono text-foreground/70 mt-1 whitespace-pre-wrap">{s.weakestImprovement.reflection}</div>
        </div>
      )}
    </div>
  );
}

interface DispatchedTaskRow {
  id: string;
  programId: string;
  cycleNumber: number;
  proposalId: string;
  title: string;
  body: string;
  category: string;
  risk: string;
  effortHours: number;
  status: "queued" | "in-progress" | "completed" | "failed" | "cancelled";
  createdAt: number;
  updatedAt: number;
  statusNote?: string;
  filePath?: string;
}

const TASK_STATUS_COLORS: Record<DispatchedTaskRow["status"], string> = {
  queued: "#a855f7",
  "in-progress": "#22d3ee",
  completed: "#22c55e",
  failed: "#ef4444",
  cancelled: "#94a3b8",
};

function TaskQueueCard() {
  const { data, refetch } = useQuery<{ ok: boolean; tasks: DispatchedTaskRow[] }>({
    queryKey: ["/api/rick/improvement-program/task-queue"],
    queryFn: async () => {
      const r = await fetch("/api/rick/improvement-program/task-queue");
      return r.json();
    },
    refetchInterval: 6000,
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tasks = data?.tasks ?? [];
  if (tasks.length === 0) return null;

  async function setStatus(id: string, status: DispatchedTaskRow["status"]) {
    setBusy(true);
    try {
      await fetch(`/api/rick/improvement-program/task-queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await refetch();
    } finally {
      setBusy(false);
    }
  }

  const counts = tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-white/10 p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-[11px] font-mono font-bold" style={{ color: PROGRAM_PINK }}>
          Dispatched Task Queue ({tasks.length})
        </div>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(TASK_STATUS_COLORS) as DispatchedTaskRow["status"][]).map(st => (
            counts[st] ? (
              <span key={st} className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
                style={{ color: TASK_STATUS_COLORS[st], borderColor: `${TASK_STATUS_COLORS[st]}40`, background: `${TASK_STATUS_COLORS[st]}10` }}>
                {st}: {counts[st]}
              </span>
            ) : null
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        {tasks.map(t => {
          const isOpen = expanded === t.id;
          const color = TASK_STATUS_COLORS[t.status];
          return (
            <div key={t.id} className="rounded border border-white/10 bg-black/20">
              <button onClick={() => setExpanded(isOpen ? null : t.id)}
                className="w-full flex items-center gap-2 p-2 text-left hover:bg-white/5">
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
                  style={{ color, borderColor: `${color}40`, background: `${color}10` }}>{t.status}</span>
                <span className="text-[10px] font-mono text-muted-foreground">C{t.cycleNumber}</span>
                <span className="text-[11px] font-mono text-foreground/90 flex-1 truncate">{t.title}</span>
                <span className="text-[9px] font-mono text-muted-foreground">{t.category} · {t.effortHours}h</span>
              </button>
              {isOpen && (
                <div className="px-2 pb-2 space-y-1.5">
                  <div className="text-[9px] font-mono text-muted-foreground">
                    Task ID: {t.id} · Proposal {t.proposalId} · Created {new Date(t.createdAt).toLocaleString()}
                  </div>
                  {t.statusNote && <div className="text-[10px] font-mono text-foreground/70 italic">{t.statusNote}</div>}
                  {t.filePath && <div className="text-[9px] font-mono text-muted-foreground">File: {t.filePath}</div>}
                  <pre className="text-[10px] font-mono text-foreground/80 whitespace-pre-wrap bg-black/40 border border-white/10 rounded p-2 max-h-64 overflow-auto">{t.body}</pre>
                  <div className="flex flex-wrap gap-1.5">
                    {(["queued", "in-progress", "completed", "failed", "cancelled"] as const).map(st => (
                      <button key={st} disabled={busy || t.status === st} onClick={() => setStatus(t.id, st)}
                        className="text-[10px] font-mono px-2 py-0.5 rounded border disabled:opacity-30"
                        style={{ color: TASK_STATUS_COLORS[st], borderColor: `${TASK_STATUS_COLORS[st]}60`, background: `${TASK_STATUS_COLORS[st]}10` }}>
                        → {st}
                      </button>
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

function MetricBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
      <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[12px] font-mono font-bold" style={{ color: color ?? "#f0f0f0" }}>{value}</div>
    </div>
  );
}

interface AutonomousHeartbeat {
  running: boolean;
  lastTickAt: number;
  intervalMs: number;
  totalCycles: number;
  totalGenerated: number;
  perCategoryGenerated: Record<string, number>;
  categories: string[];
  lastError: string | null;
}

function fmtAgoShort(ms: number): string {
  if (!ms) return "—";
  const dt = Date.now() - ms;
  if (dt < 60_000) return `${Math.floor(dt / 1000)}s`;
  if (dt < 3_600_000) return `${Math.floor(dt / 60_000)}m`;
  return `${Math.floor(dt / 3_600_000)}h`;
}

function RickAutonomousHeartbeatStrip() {
  const { data } = useQuery({
    queryKey: ["/api/rick/autonomous/heartbeat"],
    queryFn: async () => {
      const r = await fetch("/api/rick/autonomous/heartbeat");
      return r.json() as Promise<{ ok: boolean; heartbeat: AutonomousHeartbeat }>;
    },
    refetchInterval: 15_000,
  });
  const hb = data?.heartbeat;
  if (!hb) return null;
  const accent = hb.running ? "#22c55e" : "#ef4444";
  return (
    <div
      className="rounded-xl border p-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5"
      style={{ borderColor: `${accent}40`, background: `${accent}08` }}
      data-testid="rick-autonomous-strip"
    >
      <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold" style={{ color: accent }}>
        <Activity size={11} /> {hb.running ? "AUTONOMOUS" : "STOPPED"}
      </span>
      <span className="text-[10px] font-mono text-muted-foreground">
        last tick {fmtAgoShort(hb.lastTickAt)} · cycles {hb.totalCycles} · built {hb.totalGenerated}
      </span>
      <div className="flex flex-wrap gap-1 ml-auto">
        {hb.categories.map((c) => (
          <span key={c} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-foreground/70">
            {c} {hb.perCategoryGenerated[c] ?? 0}
          </span>
        ))}
      </div>
      <a
        href="/gallery"
        className="text-[10px] font-mono underline opacity-70 hover:opacity-100 ml-1"
        data-testid="link-open-gallery"
      >
        open gallery →
      </a>
    </div>
  );
}
