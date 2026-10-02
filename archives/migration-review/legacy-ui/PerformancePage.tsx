import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Activity, Cpu, HardDrive, Wifi, WifiOff, Zap, AlertTriangle,
  CheckCircle2, TrendingUp, Clock, RefreshCw, Server, Shield,
  BarChart3, Gauge, CircleDot
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DetailedHealth {
  resources: {
    memoryUsedMB: number;
    memoryTotalMB: number;
    memoryPercent: number;
    cpuLoad: number[];
    uptime: number;
    activeTasks: number;
    totalTasks: number;
    healthScore: number;
    taskStats: Record<string, { runs: number; failures: number; avgDurationMs: number; lastRun: number }>;
  };
  providers: Array<{
    name: string;
    state: string;
    healthScore: number;
    avgResponseMs: number;
    successRate: number;
    failures: number;
    cooldownRemaining: number;
  }>;
  tasks: Array<{
    name: string;
    category: string;
    enabled: boolean;
    running: boolean;
    failures: number;
    lastRun: number;
    intervalMs: number;
  }>;
}

function MetricCard({ label, value, icon: Icon, color, subtext }: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  subtext?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-4"
      data-testid={`metric-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className={cn("text-2xl font-bold font-mono", color)}>{value}</p>
          {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
        </div>
        <Icon size={20} className={cn("opacity-60", color)} />
      </div>
    </motion.div>
  );
}

function ProviderRow({ provider }: { provider: DetailedHealth["providers"][0] }) {
  const stateColor = provider.state === "closed"
    ? "text-emerald-400"
    : provider.state === "half-open"
      ? "text-yellow-400"
      : "text-red-400";

  const stateIcon = provider.state === "closed" ? CheckCircle2 :
    provider.state === "half-open" ? AlertTriangle : WifiOff;
  const StateIcon = stateIcon;

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
      data-testid={`provider-row-${provider.name}`}>
      <StateIcon size={14} className={stateColor} />
      <span className="text-sm flex-1 truncate">{provider.name}</span>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className={cn("font-mono", provider.healthScore > 70 ? "text-emerald-400" : provider.healthScore > 40 ? "text-yellow-400" : "text-red-400")}>
          {provider.healthScore}%
        </span>
        <span className="font-mono w-16 text-right">{provider.avgResponseMs}ms</span>
        <span className={cn("font-mono w-12 text-right", provider.successRate > 90 ? "text-emerald-400" : provider.successRate > 50 ? "text-yellow-400" : "text-red-400")}>
          {provider.successRate}%
        </span>
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: DetailedHealth["tasks"][0] }) {
  const categoryColor: Record<string, string> = {
    critical: "text-red-400 bg-red-500/10",
    important: "text-yellow-400 bg-yellow-500/10",
    background: "text-blue-400 bg-blue-500/10",
    optional: "text-slate-400 bg-slate-500/10",
  };

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
      data-testid={`task-row-${task.name}`}>
      <CircleDot size={12} className={task.enabled ? (task.running ? "text-emerald-400 animate-pulse" : "text-muted-foreground") : "text-red-400"} />
      <span className="text-sm flex-1 truncate">{task.name}</span>
      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", categoryColor[task.category] || "text-slate-400")}>
        {task.category}
      </span>
      <span className={cn("text-xs font-mono", task.enabled ? "text-emerald-400" : "text-red-400")}>
        {task.enabled ? (task.running ? "RUNNING" : "READY") : "OFF"}
      </span>
    </div>
  );
}

export default function PerformancePage({ embedded }: { embedded?: boolean }) {
  useEffect(() => {
    document.title = "Performance Monitor | Tessera";
  }, []);

  const { data, isLoading, refetch, isFetching } = useQuery<DetailedHealth>({
    queryKey: ["/api/system/health/detailed"],
    refetchInterval: 10000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" data-testid="performance-loading">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { resources, providers, tasks } = data;

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className={cn("max-w-6xl mx-auto px-4 py-6 space-y-6", embedded && "pt-2")} data-testid="performance-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Gauge size={24} className="text-cyan-400" />
            Performance Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time system health and resource monitoring</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm" data-testid="indicator-auto-refresh">
          <RefreshCw size={14} className={isFetching ? "animate-spin text-cyan-400" : "text-muted-foreground"} />
          <span className="text-xs text-muted-foreground font-mono">Auto-refresh 10s</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Health Score"
          value={`${resources.healthScore}/100`}
          icon={Activity}
          color={resources.healthScore > 70 ? "text-emerald-400" : resources.healthScore > 40 ? "text-yellow-400" : "text-red-400"}
          subtext={resources.healthScore > 70 ? "System healthy" : resources.healthScore > 40 ? "Performance degraded" : "Critical"}
        />
        <MetricCard
          label="Memory"
          value={`${resources.memoryPercent}%`}
          icon={HardDrive}
          color={resources.memoryPercent > 85 ? "text-red-400" : resources.memoryPercent > 70 ? "text-yellow-400" : "text-emerald-400"}
          subtext={`${resources.memoryUsedMB}MB / ${resources.memoryTotalMB}MB`}
        />
        <MetricCard
          label="Uptime"
          value={formatUptime(resources.uptime)}
          icon={Clock}
          color="text-cyan-400"
          subtext={`${resources.uptime.toLocaleString()}s total`}
        />
        <MetricCard
          label="Active Tasks"
          value={`${resources.activeTasks}/${resources.totalTasks}`}
          icon={Zap}
          color="text-violet-400"
          subtext="Background processes"
        />
      </div>

      <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4" data-testid="panel-memory-bar">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Memory Usage</span>
          <span className={cn("text-xs font-mono", resources.memoryPercent > 85 ? "text-red-400" : resources.memoryPercent > 70 ? "text-yellow-400" : "text-emerald-400")}>
            {resources.memoryUsedMB}MB / {resources.memoryTotalMB}MB
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", resources.memoryPercent > 85 ? "bg-red-500" : resources.memoryPercent > 70 ? "bg-yellow-500" : "bg-emerald-500")}
            initial={{ width: 0 }}
            animate={{ width: `${resources.memoryPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        {resources.cpuLoad && resources.cpuLoad.length >= 3 && (
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span>CPU Load: <span className="font-mono text-foreground">{resources.cpuLoad[0].toFixed(1)}</span> (1m)</span>
            <span><span className="font-mono text-foreground">{resources.cpuLoad[1].toFixed(1)}</span> (5m)</span>
            <span><span className="font-mono text-foreground">{resources.cpuLoad[2].toFixed(1)}</span> (15m)</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden" data-testid="panel-providers">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Server size={16} className="text-cyan-400" />
              LLM Providers
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-400" />{providers.filter(p => p.state === "closed").length}</span>
              <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-yellow-400" />{providers.filter(p => p.state === "half-open").length}</span>
              <span className="flex items-center gap-1"><WifiOff size={10} className="text-red-400" />{providers.filter(p => p.state === "open").length}</span>
            </div>
          </div>
          <div className="px-2 py-1 max-h-80 overflow-y-auto">
            <div className="flex items-center gap-3 py-1 px-3 text-[10px] text-muted-foreground uppercase tracking-wider">
              <span className="w-4" />
              <span className="flex-1">Provider</span>
              <span className="w-12 text-right">Health</span>
              <span className="w-16 text-right">Latency</span>
              <span className="w-12 text-right">Success</span>
            </div>
            {providers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No providers tracked yet</p>
            ) : (
              providers.map(p => <ProviderRow key={p.name} provider={p} />)
            )}
          </div>
        </div>

        <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden" data-testid="panel-tasks">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 size={16} className="text-violet-400" />
              Background Tasks
            </h2>
            <span className="text-xs text-muted-foreground">
              {tasks.filter(t => t.enabled).length}/{tasks.length} enabled
            </span>
          </div>
          <div className="px-2 py-1 max-h-80 overflow-y-auto">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No managed tasks yet</p>
            ) : (
              tasks.map(t => <TaskRow key={t.name} task={t} />)
            )}
          </div>
        </div>
      </div>

      <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4" data-testid="panel-task-stats">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-emerald-400" />
          Task Execution Stats
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(resources.taskStats).map(([name, stats]) => (
            <div key={name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 text-xs">
              <span className="truncate flex-1 text-muted-foreground">{name}</span>
              <div className="flex items-center gap-3 ml-2">
                <span className="font-mono text-foreground">{stats.runs} runs</span>
                {stats.failures > 0 && (
                  <span className="font-mono text-red-400">{stats.failures} fail</span>
                )}
                <span className="font-mono text-muted-foreground">{stats.avgDurationMs}ms</span>
              </div>
            </div>
          ))}
          {Object.keys(resources.taskStats).length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full text-center py-2">No task stats collected yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
