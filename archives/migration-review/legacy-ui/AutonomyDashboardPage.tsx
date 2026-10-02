import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Activity, Shield, Heart, AlertTriangle, CheckCircle, XCircle,
  Clock, RefreshCw, Server, Brain, Bot, Wrench, Zap, Filter,
  ChevronDown, ChevronUp, Loader2
} from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  low: "text-green-400 bg-green-500/10 border-green-500/30",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  critical: "text-red-400 bg-red-500/10 border-red-500/30",
};

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  success: CheckCircle,
  failure: XCircle,
  warning: AlertTriangle,
  pending: Clock,
};

const TYPE_ICONS: Record<string, typeof Activity> = {
  health_check: Heart,
  self_improvement: Brain,
  self_healing: Wrench,
  agent_deliberation: Zap,
  fleet_sync: Server,
  approval_queued: Shield,
  approval_reviewed: Shield,
  bot_deployed: Bot,
  bot_deployment: Bot,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function HealthPanel() {
  const { data: health } = useQuery<any>({
    queryKey: ["/api/autonomy/health"],
    refetchInterval: 30000,
  });

  if (!health) return null;

  const statusColor = health.status === "healthy" ? "text-green-400" : health.status === "degraded" ? "text-yellow-400" : "text-red-400";
  const statusBg = health.status === "healthy" ? "bg-green-500/10" : health.status === "degraded" ? "bg-yellow-500/10" : "bg-red-500/10";

  return (
    <div className={`rounded-xl border border-white/10 ${statusBg} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Heart className={`w-5 h-5 ${statusColor}`} />
          System Health
        </h3>
        <span className={`text-sm font-medium ${statusColor} uppercase`}>{health.status}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(health.components || {}).map(([name, comp]: [string, any]) => (
          <div key={name} className="bg-black/30 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase">{name}</div>
            <div className={`text-sm font-medium ${comp.status === "healthy" ? "text-green-400" : comp.status === "degraded" ? "text-yellow-400" : "text-red-400"}`}>
              {comp.status}
            </div>
            {comp.latencyMs > 0 && <div className="text-xs text-gray-600">{comp.latencyMs}ms</div>}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <span>Uptime: {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m</span>
        <span>Remediations: {health.remediations}</span>
      </div>
    </div>
  );
}

function ActivityLogPanel() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: activities, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/autonomy/activity-log", typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (typeFilter !== "all") params.set("type", typeFilter);
      const res = await fetch(`/api/autonomy/activity-log?${params}`);
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/autonomy/activity-stats"],
    refetchInterval: 15000,
  });

  const types = ["all", "health_check", "self_improvement", "self_healing", "agent_deliberation", "fleet_sync", "approval_queued", "bot_deployed"];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Autonomous Activity Log
        </h3>
        <div className="flex items-center gap-2">
          {stats && (
            <div className="flex gap-3 text-xs text-gray-500 mr-3">
              <span>{stats.totalActions} total</span>
              <span className="text-green-400">{stats.successRate}% success</span>
              <span className="text-yellow-400">{stats.pendingApprovals} pending</span>
            </div>
          )}
          <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-white/5">
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
        {types.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${typeFilter === t ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"}`}
          >
            {t === "all" ? "All" : t.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      ) : !activities?.length ? (
        <div className="text-center py-8 text-gray-500">No activity recorded yet</div>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {activities.map((a: any) => {
            const Icon = TYPE_ICONS[a.actionType] || Activity;
            const StatusIcon = STATUS_ICONS[a.status] || Clock;
            const isExpanded = expanded === a.id;

            return (
              <div
                key={a.id}
                className="bg-black/20 rounded-lg p-3 hover:bg-black/30 cursor-pointer transition-colors"
                onClick={() => setExpanded(isExpanded ? null : a.id)}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {a.actionType.replace(/_/g, " ")}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.low}`}>
                        {a.severity}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {a.source} → {a.target}
                    </div>
                  </div>
                  <StatusIcon className={`w-4 h-4 flex-shrink-0 ${a.status === "success" ? "text-green-400" : a.status === "failure" ? "text-red-400" : "text-yellow-400"}`} />
                  <span className="text-xs text-gray-600 flex-shrink-0">{timeAgo(a.createdAt)}</span>
                  {isExpanded ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
                </div>
                {isExpanded && a.detail && (
                  <div className="mt-2 text-xs text-gray-400 bg-black/30 rounded p-2">
                    {a.detail}
                    {a.durationMs > 0 && <span className="ml-2 text-gray-600">({a.durationMs}ms)</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ApprovalQueuePanel() {
  const [tab, setTab] = useState<"pending" | "history">("pending");

  const { data: pending, refetch: refetchPending } = useQuery<any[]>({
    queryKey: ["/api/autonomy/approvals/pending"],
    refetchInterval: 10000,
  });

  const { data: history } = useQuery<any[]>({
    queryKey: ["/api/autonomy/approvals/history"],
    enabled: tab === "history",
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, decision, note }: { id: number; decision: string; note?: string }) => {
      const res = await apiRequest("POST", `/api/autonomy/approvals/${id}/review`, { decision, note });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autonomy/approvals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/autonomy/approvals/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/autonomy/activity-stats"] });
    },
  });

  const items = tab === "pending" ? pending : history;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          Human-in-the-Loop Approvals
        </h3>
        {pending && pending.length > 0 && (
          <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/30">
            {pending.length} pending
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setTab("pending")}
          className={`px-3 py-1.5 rounded text-sm ${tab === "pending" ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-gray-400"}`}
        >
          Pending {pending?.length ? `(${pending.length})` : ""}
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-3 py-1.5 rounded text-sm ${tab === "history" ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-gray-400"}`}
        >
          History
        </button>
      </div>

      {!items?.length ? (
        <div className="text-center py-6 text-gray-500">
          {tab === "pending" ? "No pending approvals" : "No approval history"}
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {items.map((item: any) => (
            <div key={item.id} className="bg-black/20 rounded-lg p-3 border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">
                  {item.actionType.replace(/_/g, " ")}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded border ${SEVERITY_COLORS[item.riskLevel] || SEVERITY_COLORS.medium}`}>
                  {item.riskLevel}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{item.description}</p>
              <div className="text-xs text-gray-600 mb-2">
                Source: {item.source} | {timeAgo(item.createdAt)}
              </div>

              {tab === "pending" ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => reviewMutation.mutate({ id: item.id, decision: "approved" })}
                    disabled={reviewMutation.isPending}
                    className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded hover:bg-green-500/30 border border-green-500/30 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reviewMutation.mutate({ id: item.id, decision: "rejected" })}
                    disabled={reviewMutation.isPending}
                    className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500/30 border border-red-500/30 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <div className={`text-xs ${item.status === "approved" ? "text-green-400" : "text-red-400"}`}>
                  {item.status} by {item.reviewedBy || "system"}
                  {item.reviewNote && <span className="text-gray-500 ml-1">— {item.reviewNote}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AutonomyDashboardPage() {
  document.title = "Autonomy Dashboard | Tessera";

  return (
    <div className="min-h-screen bg-black text-white p-6" data-testid="autonomy-dashboard-page">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="w-8 h-8 text-cyan-400" />
              Tessera Autonomy Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              Real-time autonomous operations, self-healing, and human-in-the-loop approvals
            </p>
          </div>
        </div>

        <HealthPanel />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityLogPanel />
          <ApprovalQueuePanel />
        </div>
      </div>
    </div>
  );
}
