import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, AlertOctagon, Info, CheckCircle2, Clock, RefreshCw,
  Activity, Shield, Cpu, Zap, TrendingDown, TrendingUp,
  RotateCcw, Bell, BellOff, Filter, X, ChevronDown, ChevronUp,
  Heart, Server, Database, Terminal, Radio, Eye, BarChart3,
} from "lucide-react";

type AlertSeverity = "info" | "warning" | "critical";

interface StructuredAlert {
  id: string;
  severity: AlertSeverity;
  component: string;
  title: string;
  message: string;
  timestamp: number;
  recommendedAction?: string;
  metadata?: Record<string, any>;
  acknowledged: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

interface DashboardData {
  healthScore: number;
  timestamp: number;
  alerts: {
    total: number;
    unacknowledged: number;
    bySeverity: Record<AlertSeverity, number>;
    byComponent: Record<string, number>;
    recentCritical: StructuredAlert[];
    suppressedCount: number;
    recent: StructuredAlert[];
  };
  watchdog: {
    summary: { total: number; healthy: number; degraded: number; failed: number; recovering: number };
    components: Array<{
      id: string; name: string; description?: string;
      status: "healthy" | "degraded" | "failed" | "recovering";
      consecutiveFailures: number; totalRestarts: number;
      lastChecked: number; lastHealthy: number;
    }>;
    recoveryHistory: Array<{ componentId: string; componentName: string; action: string; timestamp: number; attemptNumber: number; details?: string }>;
  };
  llmProviders: {
    circuitBreakerSummary: { totalProviders: number; healthy: number; degraded: number; down: number; avgHealthScore: number; predictiveAlerts: number };
    providerHealth: Array<{ name: string; state: string; healthScore: number; avgResponseMs: number; successRate: number; failures: number; cooldownRemaining: number }>;
    predictions: Array<{ name: string; healthScore: number; predictedDegradation: number; trend: string; recommendedAction: string }>;
  };
  recoveryHistory: Array<{ componentId: string; componentName: string; action: string; timestamp: number; attemptNumber: number; details?: string }>;
}

const severityConfig = {
  critical: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: AlertOctagon, label: "Critical" },
  warning: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: AlertTriangle, label: "Warning" },
  info: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: Info, label: "Info" },
};

function HealthScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const label = score >= 80 ? "Healthy" : score >= 50 ? "Degraded" : "Critical";
  const ringColor = score >= 80 ? "#4ade80" : score >= 50 ? "#fbbf24" : "#f87171";
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="36" fill="none"
            stroke={ringColor} strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-xl font-bold font-mono", color)}>{score}</span>
          <span className="text-[10px] text-muted-foreground font-mono uppercase">/ 100</span>
        </div>
      </div>
      <span className={cn("text-xs font-bold font-mono", color)}>{label}</span>
    </div>
  );
}

function AlertCard({ alert, onAcknowledge }: { alert: StructuredAlert; onAcknowledge: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = severityConfig[alert.severity];
  const Icon = cfg.icon;
  const age = Date.now() - alert.timestamp;
  const ageStr = age < 60000 ? "just now" : age < 3600000 ? `${Math.floor(age / 60000)}m ago` : `${Math.floor(age / 3600000)}h ago`;

  return (
    <div className={cn("rounded-lg border p-3 transition-all", cfg.bg, cfg.border, alert.acknowledged && "opacity-50")}>
      <div className="flex items-start gap-2">
        <Icon size={14} className={cn("flex-shrink-0 mt-0.5", cfg.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn("text-[10px] font-bold font-mono uppercase px-1.5 py-0.5 rounded", cfg.bg, cfg.color)}>{alert.severity}</span>
            <span className="text-[11px] text-muted-foreground font-mono">{alert.component}</span>
            <span className="text-[10px] text-muted-foreground ml-auto font-mono">{ageStr}</span>
          </div>
          <p className="text-xs font-semibold text-foreground mb-0.5">{alert.title}</p>
          {expanded && (
            <>
              <p className="text-[11px] text-muted-foreground mb-2">{alert.message}</p>
              {alert.recommendedAction && (
                <div className="bg-background/60 rounded p-2 mb-2">
                  <span className="text-[10px] font-bold text-green-400 font-mono uppercase">Recommended Action: </span>
                  <span className="text-[11px] text-muted-foreground">{alert.recommendedAction}</span>
                </div>
              )}
            </>
          )}
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-[10px] text-muted-foreground hover:text-foreground font-mono flex items-center gap-1 transition-colors"
            >
              {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              {expanded ? "less" : "more"}
            </button>
            {!alert.acknowledged && (
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="text-[10px] text-green-400 hover:text-green-300 font-mono flex items-center gap-1 ml-auto transition-colors"
              >
                <CheckCircle2 size={10} /> Acknowledge
              </button>
            )}
            {alert.acknowledged && (
              <span className="text-[10px] text-green-400 font-mono ml-auto flex items-center gap-1">
                <CheckCircle2 size={10} /> Acknowledged
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComponentStatus({ comp }: { comp: DashboardData["watchdog"]["components"][0] }) {
  const statusConfig = {
    healthy: { color: "text-green-400", dot: "bg-green-400" },
    degraded: { color: "text-amber-400", dot: "bg-amber-400 animate-pulse" },
    failed: { color: "text-red-400", dot: "bg-red-400 animate-pulse" },
    recovering: { color: "text-blue-400", dot: "bg-blue-400 animate-pulse" },
  };
  const cfg = statusConfig[comp.status] || statusConfig.healthy;
  const lastCheckedAgo = Math.round((Date.now() - comp.lastChecked) / 1000);

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", cfg.dot)} />
        <div>
          <span className="text-xs font-mono text-foreground">{comp.name}</span>
          {comp.description && <p className="text-[10px] text-muted-foreground font-mono">{comp.description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
        <span className={cfg.color}>{comp.status}</span>
        {comp.totalRestarts > 0 && <span className="text-amber-400">{comp.totalRestarts} restarts</span>}
        <span>checked {lastCheckedAgo}s ago</span>
      </div>
    </div>
  );
}

function ProviderRow({ p }: { p: DashboardData["llmProviders"]["providerHealth"][0] }) {
  const stateColor = p.state === "closed" ? "text-green-400" : p.state === "half-open" ? "text-amber-400" : "text-red-400";
  const barWidth = Math.min(100, p.healthScore);
  const barColor = p.healthScore >= 70 ? "bg-green-500" : p.healthScore >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-foreground truncate">{p.name}</span>
          <span className={cn("text-[10px] font-mono", stateColor)}>{p.state}</span>
          {p.cooldownRemaining > 0 && (
            <span className="text-[10px] text-red-400 font-mono">~{Math.round(p.cooldownRemaining / 1000)}s cooldown</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${barWidth}%` }} />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground w-8">{p.healthScore}</span>
        </div>
      </div>
      <div className="text-right text-[10px] font-mono text-muted-foreground">
        <div>{p.successRate}%</div>
        <div>{p.avgResponseMs}ms</div>
      </div>
    </div>
  );
}

export default function AlertsDashboardPage() {
  const qc = useQueryClient();
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | "all">("all");
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const { data, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ["/api/alerts/dashboard"],
    queryFn: () => apiRequest("GET", "/api/alerts/dashboard").then(r => r.json()),
    refetchInterval: 30000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/alerts/${id}/acknowledge`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/alerts/dashboard"] }),
  });

  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/broadcast`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(JSON.stringify({ type: "subscribe", channel: "alerts" }));
    };
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.channel === "alerts" && (msg.type === "alert_new" || msg.type === "alert_acknowledged" || msg.type === "health_score")) {
          qc.invalidateQueries({ queryKey: ["/api/alerts/dashboard"] });
        }
      } catch {}
    };

    return () => ws.close();
  }, [qc]);

  const filteredAlerts = (data?.alerts.recent || []).filter(a => {
    if (!showAcknowledged && a.acknowledged) return false;
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    return true;
  });

  const healthScore = data?.healthScore ?? 100;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 space-y-4" data-testid="alerts-dashboard">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold font-mono text-foreground flex items-center gap-2">
            <Bell size={16} className="text-amber-400" />
            Alerts & System Health
          </h1>
          <p className="text-xs text-muted-foreground font-mono">Real-time monitoring, autonomous recovery, and circuit breaker status</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border", wsConnected ? "text-green-400 border-green-500/30 bg-green-500/5" : "text-muted-foreground border-white/10")}>
            <Radio size={10} className={wsConnected ? "animate-pulse" : ""} />
            {wsConnected ? "Live" : "Polling"}
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border border-white/10 hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
          >
            <RefreshCw size={10} /> Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground font-mono text-sm animate-pulse">Loading alerts dashboard...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center">
              <HealthScoreGauge score={healthScore} />
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-1">System Health</span>
            </div>

            <div className="bg-card border border-red-500/20 rounded-xl p-4 text-center">
              <AlertOctagon size={18} className="mx-auto mb-2 text-red-400" />
              <div className="text-2xl font-bold font-mono text-red-400">{data?.alerts.bySeverity.critical ?? 0}</div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Critical</div>
              <div className="text-[10px] text-muted-foreground font-mono mt-1">{data?.alerts.bySeverity.warning ?? 0} warnings</div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <Shield size={18} className="mx-auto mb-2 text-blue-400" />
              <div className="text-2xl font-bold font-mono text-blue-400">{data?.watchdog.summary.healthy ?? 0}/{data?.watchdog.summary.total ?? 0}</div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Components OK</div>
              {(data?.watchdog.summary.failed ?? 0) > 0 && (
                <div className="text-[10px] text-red-400 font-mono mt-1">{data?.watchdog.summary.failed} failed</div>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <Activity size={18} className="mx-auto mb-2 text-green-400" />
              <div className="text-2xl font-bold font-mono text-green-400">{data?.llmProviders.circuitBreakerSummary.healthy ?? 0}</div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">LLM Providers OK</div>
              <div className="text-[10px] text-muted-foreground font-mono mt-1">
                {data?.llmProviders.circuitBreakerSummary.down ?? 0} down,{" "}
                {data?.llmProviders.circuitBreakerSummary.degraded ?? 0} degraded
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h2 className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                    <Bell size={14} className="text-amber-400" />
                    Active Alerts
                    {(data?.alerts.unacknowledged ?? 0) > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-mono">{data?.alerts.unacknowledged} unacked</span>
                    )}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {(["all", "critical", "warning", "info"] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setFilterSeverity(s)}
                          className={cn(
                            "text-[10px] font-mono px-2 py-0.5 rounded border transition-colors capitalize",
                            filterSeverity === s
                              ? "border-white/30 bg-white/10 text-foreground"
                              : "border-white/10 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowAcknowledged(s => !s)}
                      className={cn(
                        "text-[10px] font-mono px-2 py-0.5 rounded border transition-colors flex items-center gap-1",
                        showAcknowledged ? "border-green-500/30 text-green-400" : "border-white/10 text-muted-foreground"
                      )}
                    >
                      {showAcknowledged ? <Eye size={10} /> : <BellOff size={10} />}
                      {showAcknowledged ? "Showing Acked" : "Hide Acked"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {filteredAlerts.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-xs font-mono">
                      <CheckCircle2 size={24} className="mx-auto mb-2 text-green-400/50" />
                      {filterSeverity === "all" ? "No active alerts" : `No ${filterSeverity} alerts`}
                    </div>
                  ) : (
                    filteredAlerts.map(a => (
                      <AlertCard key={a.id} alert={a} onAcknowledge={id => acknowledgeMutation.mutate(id)} />
                    ))
                  )}
                </div>

                {(data?.alerts.suppressedCount ?? 0) > 0 && (
                  <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                    {data?.alerts.suppressedCount} duplicate alerts suppressed (deduplication active)
                  </p>
                )}
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <h2 className="text-sm font-bold font-mono text-foreground flex items-center gap-2 mb-3">
                  <RotateCcw size={14} className="text-green-400" />
                  Recovery History
                </h2>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(data?.recoveryHistory ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground font-mono text-center py-4">No recovery actions recorded</p>
                  ) : (
                    (data?.recoveryHistory ?? []).map((r, i) => {
                      const actionConfig = {
                        restart: { color: "text-amber-400", icon: RotateCcw },
                        recovered: { color: "text-green-400", icon: CheckCircle2 },
                        alert_escalated: { color: "text-red-400", icon: AlertOctagon },
                      };
                      const cfg = actionConfig[r.action as keyof typeof actionConfig] || actionConfig.restart;
                      const Icon = cfg.icon;
                      const ago = Math.round((Date.now() - r.timestamp) / 60000);
                      return (
                        <div key={i} className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0">
                          <Icon size={12} className={cfg.color} />
                          <span className="text-xs font-mono text-foreground">{r.componentName}</span>
                          <span className={cn("text-[11px] font-mono", cfg.color)}>{r.action.replace("_", " ")}</span>
                          {r.details && <span className="text-[10px] text-muted-foreground truncate">{r.details}</span>}
                          <span className="text-[10px] text-muted-foreground ml-auto font-mono">{ago}m ago</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-card border border-border rounded-xl p-4">
                <h2 className="text-sm font-bold font-mono text-foreground flex items-center gap-2 mb-3">
                  <Shield size={14} className="text-blue-400" />
                  Component Watchdog
                </h2>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: "Healthy", value: data?.watchdog.summary.healthy ?? 0, color: "text-green-400" },
                    { label: "Degraded", value: data?.watchdog.summary.degraded ?? 0, color: "text-amber-400" },
                    { label: "Failed", value: data?.watchdog.summary.failed ?? 0, color: "text-red-400" },
                    { label: "Recovering", value: data?.watchdog.summary.recovering ?? 0, color: "text-blue-400" },
                  ].map(s => (
                    <div key={s.label} className="text-center p-2 rounded-lg bg-background/60 border border-white/5">
                      <div className={cn("text-lg font-bold font-mono", s.color)}>{s.value}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-0">
                  {(data?.watchdog.components ?? []).map(c => (
                    <ComponentStatus key={c.id} comp={c} />
                  ))}
                  {(data?.watchdog.components ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground font-mono text-center py-3">No components registered</p>
                  )}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <h2 className="text-sm font-bold font-mono text-foreground flex items-center gap-2 mb-3">
                  <Cpu size={14} className="text-violet-400" />
                  LLM Provider Health
                </h2>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: "Healthy", value: data?.llmProviders.circuitBreakerSummary.healthy ?? 0, color: "text-green-400" },
                    { label: "Degraded", value: data?.llmProviders.circuitBreakerSummary.degraded ?? 0, color: "text-amber-400" },
                    { label: "Down", value: data?.llmProviders.circuitBreakerSummary.down ?? 0, color: "text-red-400" },
                  ].map(s => (
                    <div key={s.label} className="text-center p-2 rounded-lg bg-background/60 border border-white/5">
                      <div className={cn("text-lg font-bold font-mono", s.color)}>{s.value}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono text-center mb-2">
                  Avg Health: <span className={cn(
                    (data?.llmProviders.circuitBreakerSummary.avgHealthScore ?? 100) >= 70 ? "text-green-400" :
                    (data?.llmProviders.circuitBreakerSummary.avgHealthScore ?? 100) >= 40 ? "text-amber-400" : "text-red-400"
                  )}>{data?.llmProviders.circuitBreakerSummary.avgHealthScore ?? 100}/100</span>
                  {(data?.llmProviders.circuitBreakerSummary.predictiveAlerts ?? 0) > 0 && (
                    <span className="ml-2 text-amber-400">{data?.llmProviders.circuitBreakerSummary.predictiveAlerts} predictive alerts</span>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0">
                  {(data?.llmProviders.providerHealth ?? []).slice(0, 12).map(p => (
                    <ProviderRow key={p.name} p={p} />
                  ))}
                  {(data?.llmProviders.providerHealth ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground font-mono text-center py-3">No providers tracked yet</p>
                  )}
                </div>
              </div>

              {(data?.llmProviders.predictions ?? []).some(p => p.predictedDegradation > 20) && (
                <div className="bg-card border border-amber-500/20 rounded-xl p-4">
                  <h2 className="text-sm font-bold font-mono text-amber-400 flex items-center gap-2 mb-3">
                    <TrendingDown size={14} />
                    Proactive Routing Alerts
                  </h2>
                  <div className="space-y-2">
                    {(data?.llmProviders.predictions ?? [])
                      .filter(p => p.predictedDegradation > 20)
                      .slice(0, 5)
                      .map(p => (
                        <div key={p.name} className="flex items-center gap-2 text-[11px] font-mono">
                          <TrendingDown size={10} className="text-amber-400" />
                          <span className="text-foreground">{p.name}</span>
                          <span className="text-amber-400">{p.predictedDegradation}% degradation predicted</span>
                          <span className={cn("ml-auto",
                            p.trend === "rapidly-declining" ? "text-red-400" :
                            p.trend === "declining" ? "text-amber-400" : "text-muted-foreground"
                          )}>{p.trend}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
