import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare, Send, RefreshCw, Loader2, Radio, Activity,
  BarChart3, Users, AlertTriangle, BookOpen, Zap, Crown,
  ChevronDown, ChevronRight, Clock, TrendingUp, Hash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type CommsTab = "threads" | "feed" | "compose" | "stats";

const COUNCIL_AGENTS = [
  "Tessera", "Alpha", "Beta", "Gamma", "Delta", "Epsilon",
  "Zeta", "Eta", "Theta", "Iota", "Kappa", "Lambda",
  "Sigma", "Omega", "Mu", "Rho", "Pi", "Phi",
];

function timeAgo(ts: number): string {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const MSG_TYPE_COLORS: Record<string, string> = {
  directive: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  response: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  broadcast: "text-violet-400 bg-violet-500/10 border-violet-500/30",
  alert: "text-red-400 bg-red-500/10 border-red-500/30",
  report: "text-amber-400 bg-amber-500/10 border-amber-500/30",
};

function AgentAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const colors = [
    "bg-cyan-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
    "bg-red-500", "bg-blue-500", "bg-pink-500", "bg-teal-500",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-[11px]";
  return (
    <div className={cn("rounded-full flex items-center justify-center font-bold text-white shrink-0", color, sz)}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function MsgTypeBadge({ type }: { type: string }) {
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-mono border", MSG_TYPE_COLORS[type] || "text-muted-foreground bg-background border-border/30")}>
      {type}
    </span>
  );
}

function ThreadsTab() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/agent-comms/threads"],
    refetchInterval: 15000,
  });

  const threads = data?.threads || [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-cyan-400" />
          <span className="text-sm font-semibold">Message Threads</span>
          {data?.total != null && (
            <Badge variant="secondary" className="text-[10px]">{data.total}</Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => refetch()}
          disabled={isLoading}
          className="h-7 px-2 text-[10px]"
        >
          <RefreshCw size={11} className={isLoading ? "animate-spin" : ""} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/40">
            <MessageSquare size={32} className="mb-2" />
            <p className="text-xs font-mono">No threads yet</p>
          </div>
        ) : threads.map((thread: any) => (
          <div
            key={thread.id}
            className="rounded-lg border border-border/30 bg-background/50 overflow-hidden"
          >
            <button
              className="w-full px-3 py-2.5 flex items-start gap-2 hover:bg-white/5 transition-colors text-left"
              onClick={() => setExpanded(expanded === thread.id ? null : thread.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {expanded === thread.id ? (
                  <ChevronDown size={12} className="text-muted-foreground shrink-0 mt-0.5" />
                ) : (
                  <ChevronRight size={12} className="text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold truncate">{thread.topic}</span>
                    <span className="text-[9px] text-muted-foreground font-mono shrink-0">
                      {thread.messages?.length || 0} msg
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {(thread.participants || []).slice(0, 4).map((p: string) => (
                      <span key={p} className="text-[9px] text-cyan-400/70">{p}</span>
                    ))}
                    {thread.participants?.length > 4 && (
                      <span className="text-[9px] text-muted-foreground/50">+{thread.participants.length - 4}</span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[9px] text-muted-foreground/50 shrink-0 mt-0.5 font-mono">
                {timeAgo(thread.updatedAt)}
              </span>
            </button>

            {expanded === thread.id && (
              <div className="border-t border-border/20 px-3 py-2 space-y-2 max-h-72 overflow-y-auto">
                {(thread.messages || []).map((msg: any) => (
                  <div key={msg.id} className="flex items-start gap-2">
                    <AgentAvatar name={msg.from} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-[10px] font-semibold text-foreground">{msg.from}</span>
                        <span className="text-[9px] text-muted-foreground/50">→</span>
                        <span className="text-[10px] text-muted-foreground">{msg.to}</span>
                        <MsgTypeBadge type={msg.type} />
                        <span className="text-[9px] text-muted-foreground/40 font-mono ml-auto">{formatTime(msg.timestamp)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveFeedTab() {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/agent-comms/feed"],
    refetchInterval: 5000,
  });

  const messages = data?.messages || [];

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, autoScroll]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-emerald-400 animate-pulse" />
          <span className="text-sm font-semibold">Live Message Feed</span>
          {data?.total != null && (
            <Badge variant="secondary" className="text-[10px]">{data.total} total</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn("text-[10px] px-2 py-1 rounded border font-mono transition-colors",
              autoScroll ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-background border-border/30 text-muted-foreground"
            )}
          >
            AUTO
          </button>
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isLoading} className="h-7 px-2">
            <RefreshCw size={11} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/40">
            <Radio size={32} className="mb-2" />
            <p className="text-xs">No messages in feed</p>
          </div>
        ) : [...messages].reverse().map((msg: any) => (
          <div
            key={msg.id}
            className="flex items-start gap-2 px-2.5 py-1.5 rounded hover:bg-white/5 transition-colors"
          >
            <span className="text-[9px] text-muted-foreground/40 shrink-0 mt-0.5 w-16">{formatTime(msg.timestamp)}</span>
            <AgentAvatar name={msg.from} />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-semibold text-cyan-400">{msg.from}</span>
              <span className="text-[10px] text-muted-foreground/50 mx-1">→</span>
              <span className="text-[10px] text-violet-400">{msg.to}</span>
              <MsgTypeBadge type={msg.type} />
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function ComposeTab() {
  const { toast } = useToast();
  const [from, setFrom] = useState("User");
  const [to, setTo] = useState("ALL");
  const [type, setType] = useState("directive");
  const [content, setContent] = useState("");

  const send = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/agent-comms/send", { from, to, type, content });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Message sent", description: data.message || "Directive delivered successfully" });
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/agent-comms/threads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-comms/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-comms/stats"] });
    },
    onError: () => {
      toast({ title: "Send failed", description: "Could not deliver message", variant: "destructive" });
    },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
        <Send size={14} className="text-violet-400" />
        <span className="text-sm font-semibold">Compose Directive</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-mono text-muted-foreground mb-1 block">FROM</label>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full bg-background border border-border/40 rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="User">User (You)</option>
              {COUNCIL_AGENTS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground mb-1 block">TO</label>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full bg-background border border-border/40 rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="ALL">ALL (Broadcast)</option>
              {COUNCIL_AGENTS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-mono text-muted-foreground mb-1 block">MESSAGE TYPE</label>
          <div className="flex flex-wrap gap-2">
            {["directive", "response", "broadcast", "alert", "report"].map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "px-2.5 py-1 rounded text-[10px] font-mono border transition-colors",
                  type === t
                    ? MSG_TYPE_COLORS[t]
                    : "text-muted-foreground bg-background border-border/30 hover:border-border/60"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-mono text-muted-foreground mb-1 block">CONTENT</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your directive or message..."
            rows={5}
            className="w-full bg-background border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
          />
          <div className="text-[9px] text-muted-foreground/40 mt-1 text-right font-mono">{content.length} chars</div>
        </div>

        <div className="bg-background/50 rounded-lg border border-border/30 p-3 space-y-1.5">
          <p className="text-[9px] font-mono text-muted-foreground">PREVIEW</p>
          <div className="flex items-center gap-2">
            <AgentAvatar name={from} />
            <div>
              <span className="text-[10px] font-semibold text-cyan-400">{from}</span>
              <span className="text-[10px] text-muted-foreground/50 mx-1">→</span>
              <span className="text-[10px] text-violet-400">{to}</span>
              <MsgTypeBadge type={type} />
            </div>
          </div>
          {content && (
            <p className="text-[11px] text-muted-foreground leading-relaxed pl-8">{content}</p>
          )}
        </div>

        <Button
          onClick={() => send.mutate()}
          disabled={send.isPending || !content.trim()}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white"
        >
          {send.isPending ? (
            <><Loader2 size={14} className="animate-spin mr-2" />Sending...</>
          ) : (
            <><Send size={14} className="mr-2" />Send Directive</>
          )}
        </Button>
      </div>
    </div>
  );
}

function MiniBarChart({ data, color = "#22d3ee" }: { data: number[]; color?: string }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.map((v, i) => (
        <div
          key={i}
          style={{ height: `${(v / max) * 100}%`, backgroundColor: color }}
          className="flex-1 rounded-sm min-h-[2px] opacity-80"
        />
      ))}
    </div>
  );
}

function StatsTab() {
  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/agent-comms/stats"],
    refetchInterval: 15000,
  });

  const stats = data;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-amber-400" />
          <span className="text-sm font-semibold">Communication Statistics</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isLoading} className="h-7 px-2">
          <RefreshCw size={11} className={isLoading ? "animate-spin" : ""} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
          </div>
        ) : !stats ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/40">
            <AlertTriangle size={24} className="mb-2" />
            <p className="text-xs">Stats unavailable</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/30 bg-background/50 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquare size={11} className="text-cyan-400" />
                  <span className="text-[10px] font-mono text-muted-foreground">TOTAL MESSAGES</span>
                </div>
                <div className="text-2xl font-bold text-cyan-400">{stats.totalMessages}</div>
              </div>
              <div className="rounded-lg border border-border/30 bg-background/50 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Hash size={11} className="text-violet-400" />
                  <span className="text-[10px] font-mono text-muted-foreground">THREADS</span>
                </div>
                <div className="text-2xl font-bold text-violet-400">{stats.totalThreads}</div>
              </div>
            </div>

            <div className="rounded-lg border border-border/30 bg-background/50 p-3">
              <p className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp size={10} /> MESSAGE TYPE BREAKDOWN
              </p>
              <div className="space-y-1.5">
                {Object.entries(stats.typeBreakdown || {}).map(([type, count]: [string, any]) => (
                  <div key={type} className="flex items-center gap-2">
                    <MsgTypeBadge type={type} />
                    <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${stats.totalMessages > 0 ? (count / stats.totalMessages) * 100 : 0}%`,
                          backgroundColor: type === "directive" ? "#22d3ee" : type === "response" ? "#34d399" : type === "broadcast" ? "#a78bfa" : type === "alert" ? "#f87171" : "#fbbf24"
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border/30 bg-background/50 p-3">
              <p className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
                <Users size={10} /> MOST ACTIVE AGENTS
              </p>
              <div className="space-y-2">
                {(stats.mostActiveAgents || []).map((entry: any, i: number) => (
                  <div key={entry.agent} className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-muted-foreground/40 w-4">{i + 1}</span>
                    <AgentAvatar name={entry.agent} />
                    <span className="text-xs font-medium flex-1">{entry.agent}</span>
                    <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden max-w-[80px]">
                      <div
                        className="h-full bg-cyan-500/60 rounded-full transition-all"
                        style={{ width: `${stats.mostActiveAgents[0]?.count > 0 ? (entry.count / stats.mostActiveAgents[0].count) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 w-8 text-right">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border/30 bg-background/50 p-3">
              <p className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
                <Clock size={10} /> VOLUME OVER LAST 24H
              </p>
              <MiniBarChart data={stats.volumeOverTime || []} color="#22d3ee" />
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-muted-foreground/40 font-mono">24h ago</span>
                <span className="text-[9px] text-muted-foreground/40 font-mono">now</span>
              </div>
            </div>

            <div className="rounded-lg border border-border/30 bg-background/50 p-3">
              <p className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
                <MessageSquare size={10} /> MESSAGES PER THREAD
              </p>
              <div className="space-y-1.5">
                {(stats.messagesPerThread || []).map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground flex-1 truncate">{t.topic}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-amber-400">{t.messageCount}</span>
                      <span className="text-[9px] text-muted-foreground/40">msg</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const TABS: { id: CommsTab; label: string; icon: React.ElementType; color: string }[] = [
  { id: "threads", label: "Threads", icon: BookOpen, color: "text-cyan-400" },
  { id: "feed", label: "Live Feed", icon: Activity, color: "text-emerald-400" },
  { id: "compose", label: "Compose", icon: Send, color: "text-violet-400" },
  { id: "stats", label: "Stats", icon: BarChart3, color: "text-amber-400" },
];

export default function AgentCommsPage() {
  const tab = "all" as any;

  return (
    <div className="flex h-screen bg-[#08090e] overflow-hidden">
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30 bg-background/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <MessageSquare size={16} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Agent Comms</h1>
              <p className="text-[10px] text-muted-foreground font-mono">Inter-Agent Communication Protocol</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-mono">BUS ACTIVE</span>
          </div>
        </div>

        

        <div className="flex-1 min-h-0 overflow-hidden">
          <ThreadsTab />
          <LiveFeedTab />
          <ComposeTab />
          <StatsTab />
        </div>
      </div>
    </div>
  );
}
