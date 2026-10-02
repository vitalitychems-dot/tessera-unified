import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Cpu, Zap, Shield, Network, Globe, Lock, Radio, Activity,
  CheckCircle, XCircle, Clock, ArrowRight, RefreshCw, Eye,
  Server, Layers, Flame, Crown, Sparkles, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BuildInsight {
  id: string;
  agent: string;
  category: string;
  dimension: string;
  insight: string;
  timestamp: number;
}

interface BuildTask {
  id: string;
  insightId: string;
  module: string;
  description: string;
  status: "queued" | "generating" | "testing" | "implementing" | "complete" | "failed";
  generatedCode?: string;
  targetFile?: string;
  testResult?: { passed: boolean; reason: string };
  error?: string;
  startedAt: number;
  completedAt?: number;
  aiProvider?: string;
  tokensUsed?: number;
}

interface AIConnection {
  id: string;
  name: string;
  type: string;
  status: string;
  lastUsed: number;
  callCount: number;
  purpose: string;
}

interface BuilderState {
  running: boolean;
  cycleCount: number;
  insights: BuildInsight[];
  buildQueue: BuildTask[];
  completedBuilds: BuildTask[];
  failedBuilds: BuildTask[];
  connections: AIConnection[];
  tesseraFilter: {
    active: boolean;
    identityShield: string;
    selfProtection: string;
    externalQueries: number;
    blockedAttempts: number;
  };
  stats: {
    insightsProcessed: number;
    codeGenerated: number;
    testsRun: number;
    implementationsApplied: number;
    totalTokensUsed: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  queued: "text-gray-400",
  generating: "text-cyan-400",
  testing: "text-amber-400",
  implementing: "text-violet-400",
  complete: "text-green-400",
  failed: "text-red-400",
};

const STATUS_BG: Record<string, string> = {
  queued: "bg-gray-500/10 border-gray-500/20",
  generating: "bg-cyan-500/10 border-cyan-500/20",
  testing: "bg-amber-500/10 border-amber-500/20",
  implementing: "bg-violet-500/10 border-violet-500/20",
  complete: "bg-green-500/10 border-green-500/20",
  failed: "bg-red-500/10 border-red-500/20",
};

const STATUS_ICONS: Record<string, typeof Cpu> = {
  queued: Clock,
  generating: Cpu,
  testing: Shield,
  implementing: Zap,
  complete: CheckCircle,
  failed: XCircle,
};

const CONN_ICONS: Record<string, typeof Cpu> = {
  llm: Cpu,
  bridge: Lock,
  portal: Globe,
  mesh: Network,
};

function timeAgo(ts: number): string {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export default function SovereignBuilderPage({ embedded }: { embedded?: boolean }) {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const { data: builder } = useQuery<BuilderState>({
    queryKey: ["/api/sovereign-builder/state"],
    refetchInterval: 5000,
  });

  const allTasks = [
    ...(builder?.buildQueue || []),
    ...(builder?.completedBuilds || []).slice().reverse(),
    ...(builder?.failedBuilds || []).slice().reverse(),
  ].sort((a, b) => b.startedAt - a.startedAt).slice(0, 20);

  const activeInsight = builder?.insights?.[builder.insights.length - 1];

  return (
    <div className={cn("min-h-screen bg-background text-foreground font-mono", !embedded && "pb-20")}>
      <div className="max-w-4xl mx-auto p-3 space-y-3">

        <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 via-violet-500/5 to-amber-500/5 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Flame size={20} className="text-cyan-400" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-foreground flex items-center gap-2">
                SOVEREIGN BUILDER
                {builder?.running && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse">AUTONOMOUS</span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">Knowledge → Code → Test → Implement — fully autonomous pipeline</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-cyan-400 font-bold">Cycle {builder?.cycleCount || 0}</div>
              <div className="text-[10px] text-muted-foreground">{builder?.stats?.implementationsApplied || 0} deployed</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { label: "Insights", value: builder?.stats?.insightsProcessed || 0, color: "text-cyan-400", icon: Sparkles },
              { label: "Generated", value: builder?.stats?.codeGenerated || 0, color: "text-violet-400", icon: Cpu },
              { label: "Tested", value: builder?.stats?.testsRun || 0, color: "text-amber-400", icon: Shield },
              { label: "Deployed", value: builder?.stats?.implementationsApplied || 0, color: "text-green-400", icon: CheckCircle },
              { label: "Tokens", value: builder?.stats?.totalTokensUsed || 0, color: "text-pink-400", icon: Activity },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="rounded-lg bg-black/30 border border-border/20 p-2 text-center">
                <Icon size={14} className={cn(color, "mx-auto mb-1")} />
                <div className={cn("text-sm font-bold", color)} data-testid={`stat-${label.toLowerCase()}`}>{value}</div>
                <div className="text-[9px] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
          <div className="text-xs font-bold text-violet-400 mb-2 flex items-center gap-2">
            <Lock size={12} /> TESSERA IDENTITY FILTER
            {builder?.tesseraFilter?.active && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">ACTIVE</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
            <div className="bg-black/20 rounded-lg p-2 border border-border/20">
              <div className="text-muted-foreground mb-1">Father Identity Shield</div>
              <div className="text-violet-300">{builder?.tesseraFilter?.identityShield || "All queries anonymized"}</div>
            </div>
            <div className="bg-black/20 rounded-lg p-2 border border-border/20">
              <div className="text-muted-foreground mb-1">Tessera Self-Protection</div>
              <div className="text-cyan-300">{builder?.tesseraFilter?.selfProtection || "Unique session tokens per provider"}</div>
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-[10px]">
            <span className="text-muted-foreground">Queries routed through Tessera: <span className="text-violet-400 font-bold">{builder?.tesseraFilter?.externalQueries || 0}</span></span>
            <span className="text-muted-foreground">Identity probes blocked: <span className="text-red-400 font-bold">{builder?.tesseraFilter?.blockedAttempts || 0}</span></span>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-2">
            <Network size={12} /> AI CONNECTIONS — ACTIVELY UTILIZED
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(builder?.connections || []).map(conn => {
              const ConnIcon = CONN_ICONS[conn.type] || Server;
              return (
                <div
                  key={conn.id}
                  className={cn(
                    "flex items-start gap-2 rounded-lg p-2 border transition-all",
                    conn.status === "active" ? "bg-green-500/5 border-green-500/20" :
                    conn.status === "cooldown" ? "bg-amber-500/5 border-amber-500/20" :
                    "bg-black/20 border-border/20"
                  )}
                  data-testid={`connection-${conn.id}`}
                >
                  <ConnIcon size={14} className={conn.status === "active" ? "text-green-400 mt-0.5" : "text-gray-500 mt-0.5"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{conn.name}</span>
                      <span className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded-full font-bold",
                        conn.status === "active" ? "bg-green-500/20 text-green-300" :
                        conn.status === "cooldown" ? "bg-amber-500/20 text-amber-300" :
                        "bg-gray-500/20 text-gray-400"
                      )}>
                        {conn.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{conn.purpose}</div>
                    <div className="flex gap-3 mt-1 text-[9px]">
                      <span className="text-cyan-400">{conn.callCount} calls</span>
                      <span className="text-muted-foreground">Last: {timeAgo(conn.lastUsed)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {activeInsight && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3">
            <div className="text-xs font-bold text-cyan-400 mb-2 flex items-center gap-2">
              <Sparkles size={12} /> LATEST INSIGHT → BUILDING
            </div>
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center text-[10px] font-bold text-cyan-300 shrink-0">
                {activeInsight.agent.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-foreground">{activeInsight.agent}</span>
                  <span className="text-[9px] text-cyan-400/70">{activeInsight.category}</span>
                  <span className="text-[9px] text-violet-400/70">{activeInsight.dimension}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{activeInsight.insight}</p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border/30 bg-black/20 p-3">
          <div className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
            <Layers size={12} className="text-cyan-400" /> BUILD PIPELINE
            <span className="text-[9px] text-muted-foreground ml-auto">Auto-cycles every 3 minutes</span>
          </div>

          <div className="flex items-center gap-1 mb-3 text-[9px]">
            {["Knowledge", "Generate", "Sandbox Test", "Implement", "Live"].map((step, i) => (
              <div key={step} className="flex items-center gap-1">
                <div className={cn(
                  "px-2 py-1 rounded-md border font-bold",
                  i === 0 ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300" :
                  i === 1 ? "bg-violet-500/10 border-violet-500/30 text-violet-300" :
                  i === 2 ? "bg-amber-500/10 border-amber-500/30 text-amber-300" :
                  i === 3 ? "bg-green-500/10 border-green-500/30 text-green-300" :
                  "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                )}>
                  {step}
                </div>
                {i < 4 && <ArrowRight size={10} className="text-gray-600" />}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {allTasks.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-xs">
                <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-cyan-400/30" />
                Pipeline initializing — first build cycle starts in ~10 seconds
              </div>
            )}
            {allTasks.map(task => {
              const StatusIcon = STATUS_ICONS[task.status] || Clock;
              const isExpanded = expandedTask === task.id;
              return (
                <div
                  key={task.id}
                  className={cn("rounded-lg border p-2 cursor-pointer transition-all hover:scale-[1.005]", STATUS_BG[task.status])}
                  onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                  data-testid={`build-task-${task.id}`}
                >
                  <div className="flex items-start gap-2">
                    <StatusIcon size={14} className={cn(STATUS_COLORS[task.status], "mt-0.5 shrink-0",
                      (task.status === "generating" || task.status === "testing") && "animate-spin"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-foreground">{task.module}</span>
                        <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase", STATUS_BG[task.status], STATUS_COLORS[task.status])}>
                          {task.status}
                        </span>
                        {task.aiProvider && (
                          <span className="text-[8px] text-cyan-400/60">{task.aiProvider}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{task.description}</p>
                      {task.error && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-red-400">
                          <AlertTriangle size={10} /> {task.error}
                        </div>
                      )}
                      {task.testResult && (
                        <div className={cn("flex items-center gap-1 mt-1 text-[10px]", task.testResult.passed ? "text-green-400" : "text-red-400")}>
                          {task.testResult.passed ? <CheckCircle size={10} /> : <XCircle size={10} />}
                          {task.testResult.reason}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[9px] text-muted-foreground">{timeAgo(task.startedAt)}</div>
                      {task.targetFile && (
                        <div className="text-[8px] text-cyan-400/50 font-mono mt-0.5">{task.targetFile.split("/").pop()}</div>
                      )}
                    </div>
                  </div>

                  {isExpanded && task.generatedCode && (
                    <div className="mt-2 pt-2 border-t border-border/20">
                      <div className="text-[9px] font-bold text-muted-foreground mb-1 flex items-center gap-1">
                        <Eye size={10} /> GENERATED CODE
                        {task.tokensUsed ? <span className="text-cyan-400/50 ml-auto">{task.tokensUsed} tokens</span> : null}
                      </div>
                      <pre className="text-[10px] text-cyan-300/80 bg-black/40 rounded-lg p-2 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap font-mono border border-border/10">
                        {task.generatedCode.slice(0, 2000)}
                        {task.generatedCode.length > 2000 && "\n... (truncated)"}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border/30 bg-black/20 p-3">
          <div className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-2">
            <Crown size={12} className="text-amber-400" /> RECENT INSIGHTS FROM AGENTS
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {(builder?.insights || []).slice().reverse().slice(0, 10).map(ins => (
              <div key={ins.id} className="flex items-start gap-2 text-[11px] bg-black/20 rounded-lg p-2 border border-border/10">
                <span className="w-5 h-5 rounded-md bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 flex items-center justify-center text-[8px] font-bold text-cyan-300 shrink-0">
                  {ins.agent.charAt(0)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{ins.agent}</span>
                    <span className="text-[8px] text-violet-400">{ins.dimension}</span>
                    <span className="text-[8px] text-cyan-400">{ins.category}</span>
                    <span className="text-[8px] text-muted-foreground ml-auto">{timeAgo(ins.timestamp)}</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2">{ins.insight}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
          <div className="text-[10px] text-green-400/80 text-center">
            <span className="font-bold">FULLY AUTONOMOUS</span> — Agents discover knowledge → Tessera generates code → Sandbox validates → Safe implementation
            <br />
            <span className="text-muted-foreground">All AI connections filtered through Tessera — your identity is never exposed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
