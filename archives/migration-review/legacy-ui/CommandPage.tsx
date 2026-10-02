import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, AlertTriangle, CheckCircle2, Clock, Zap, Target, Play,
  ChevronRight, Loader2, RefreshCw, Activity, Shield, Bell,
  Terminal, Settings, XCircle, Circle, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

function timeSince(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-mono font-bold uppercase shrink-0", map[priority] || map.low)}>
      {priority}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-400 animate-pulse",
    executing: "bg-blue-400 animate-pulse",
    implemented: "bg-green-400",
    completed: "bg-green-400",
    failed: "bg-red-400",
    cancelled: "bg-gray-400",
    active: "bg-green-400 animate-pulse",
  };
  return <span className={cn("w-2 h-2 rounded-full shrink-0", map[status] || "bg-gray-400")} />;
}

function PendingActionsPanel() {
  const { data, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/human-actions/pending"],
    refetchInterval: 10000,
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, result }: { id: string; result: string }) => {
      const res = await apiRequest("POST", `/api/human-actions/${id}/complete`, { result });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/human-actions/pending"] }),
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/human-actions/${id}/dismiss`, {});
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/human-actions/pending"] }),
  });

  const actions = Array.isArray(data) ? data : [];

  return (
    <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-orange-500/15 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-orange-400" />
          <span className="text-sm font-bold text-orange-400 font-mono">Pending Approvals</span>
          {actions.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-mono font-bold">{actions.length}</span>
          )}
        </div>
        <button onClick={() => refetch()} className="p-1 rounded hover:bg-white/5 text-muted-foreground" data-testid="button-refresh-actions">
          <RefreshCw size={12} />
        </button>
      </div>
      {isLoading ? (
        <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" /></div>
      ) : actions.length === 0 ? (
        <div className="py-6 text-center">
          <CheckCircle2 size={20} className="mx-auto mb-2 text-green-400/60" />
          <div className="text-xs text-muted-foreground font-mono">No pending approvals</div>
        </div>
      ) : (
        <div className="divide-y divide-border/10 max-h-[320px] overflow-y-auto">
          {actions.map((action: any) => (
            <div key={action.id} data-testid={`action-item-${action.id}`} className="px-4 py-3 space-y-2 hover:bg-white/2 transition-colors">
              <div className="flex items-start gap-2">
                <AlertTriangle size={13} className="text-orange-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-foreground font-mono">{action.title || action.type || "Action Required"}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{action.description || action.message}</div>
                  <div className="text-[10px] text-muted-foreground/60 font-mono mt-1">{timeSince(action.createdAt || action.timestamp || Date.now())}</div>
                </div>
                {action.priority && <PriorityBadge priority={action.priority} />}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => completeMutation.mutate({ id: action.id, result: "approved" })}
                  disabled={completeMutation.isPending}
                  data-testid={`button-approve-${action.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] font-mono hover:bg-green-500/15 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 size={11} /> Approve
                </button>
                <button
                  onClick={() => dismissMutation.mutate(action.id)}
                  disabled={dismissMutation.isPending}
                  data-testid={`button-dismiss-${action.id}`}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-border/20 text-muted-foreground text-[11px] font-mono hover:bg-white/8 transition-all disabled:opacity-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MissionQueuePanel() {
  const { data: registryData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/action-registry"],
    refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("POST", `/api/action-registry/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/action-registry"] }),
  });

  const registry = Array.isArray(registryData) ? registryData : [];
  const pending = registry.filter(r => r.status === "pending");
  const executing = registry.filter(r => r.status === "executing");
  const implemented = registry.filter(r => r.status === "implemented").slice(0, 5);

  return (
    <div className="rounded-xl border border-border/30 bg-background/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-violet-400" />
          <span className="text-sm font-bold text-violet-400 font-mono">Mission Queue</span>
          <span className="text-[10px] text-muted-foreground font-mono">{registry.length} total · {executing.length} active · {pending.length} queued</span>
        </div>
        {isLoading && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
      </div>

      {executing.length > 0 && (
        <div className="px-3 py-2 bg-blue-500/5 border-b border-blue-500/10">
          <div className="text-[10px] font-mono text-blue-400 uppercase tracking-wider mb-1.5">Executing Now</div>
          {executing.map((item: any) => (
            <div key={item.id} data-testid={`mission-executing-${item.id}`} className="flex items-center gap-2 py-1.5">
              <Zap size={11} className="text-blue-400 animate-pulse shrink-0" />
              <span className="text-[11px] font-mono text-foreground flex-1 truncate">{item.title || item.name}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{item.progress ? `${item.progress}%` : ""}</span>
            </div>
          ))}
        </div>
      )}

      <div className="divide-y divide-border/10 max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" /></div>
        ) : pending.length === 0 && executing.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground font-mono">No pending missions</div>
        ) : (
          pending.map((item: any) => (
            <div key={item.id} data-testid={`mission-item-${item.id}`} className="px-4 py-2.5 flex items-center gap-3 hover:bg-white/2 transition-colors">
              <StatusDot status={item.status} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-mono text-foreground truncate">{item.title || item.name}</div>
                {item.description && <div className="text-[10px] text-muted-foreground truncate">{item.description.slice(0, 80)}</div>}
              </div>
              {item.priority && <PriorityBadge priority={item.priority} />}
              <button
                onClick={() => updateMutation.mutate({ id: item.id, status: "executing" })}
                disabled={updateMutation.isPending}
                data-testid={`button-execute-${item.id}`}
                className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/15 transition-all disabled:opacity-50"
              >
                <Play size={10} />
              </button>
            </div>
          ))
        )}
        {implemented.map((item: any) => (
          <div key={item.id} data-testid={`mission-done-${item.id}`} className="px-4 py-2 flex items-center gap-3 opacity-50">
            <StatusDot status="completed" />
            <span className="text-[11px] font-mono text-muted-foreground truncate flex-1 line-through">{item.title || item.name}</span>
            <span className="text-[10px] text-muted-foreground font-mono">Done</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskApprovalGatePanel() {
  const { data: pendingApprovals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/sovereign/approvals/pending"],
    refetchInterval: 5000,
  });

  const { data: gateState } = useQuery<{ required: boolean }>({
    queryKey: ["/api/sovereign/approval-gate"],
  });

  const toggleGate = useMutation({
    mutationFn: async (required: boolean) => {
      const res = await apiRequest("POST", "/api/sovereign/approval-gate", { required });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sovereign/approval-gate"] }),
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/sovereign/approvals/${id}/approve`, {});
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sovereign/approvals/pending"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/sovereign/approvals/${id}/reject`, {});
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sovereign/approvals/pending"] }),
  });

  const approvals = Array.isArray(pendingApprovals) ? pendingApprovals : [];
  const gateEnabled = gateState?.required !== false;

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-violet-500/15 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-violet-400" />
          <span className="text-sm font-bold text-violet-400 font-mono">Task Approval Gate</span>
          {approvals.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono font-bold animate-pulse">{approvals.length}</span>
          )}
        </div>
        <button
          onClick={() => toggleGate.mutate(!gateEnabled)}
          disabled={toggleGate.isPending}
          data-testid="button-toggle-approval-gate"
          className={cn(
            "px-2 py-1 rounded text-[10px] font-mono font-bold border transition-all",
            gateEnabled
              ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
              : "bg-gray-500/20 border-gray-500/30 text-gray-400"
          )}
        >
          {gateEnabled ? "Gate ON" : "Gate OFF"}
        </button>
      </div>

      {isLoading ? (
        <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" /></div>
      ) : approvals.length === 0 ? (
        <div className="py-6 text-center">
          <Shield size={20} className="mx-auto mb-2 text-violet-400/40" />
          <div className="text-xs text-muted-foreground font-mono">
            {gateEnabled ? "No tasks awaiting approval" : "Approval gate disabled — tasks execute automatically"}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border/10 max-h-[400px] overflow-y-auto">
          {approvals.map((approval: any) => (
            <div key={approval.id} data-testid={`approval-item-${approval.id}`} className="px-4 py-3 space-y-2">
              <div className="flex items-start gap-2">
                <Clock size={13} className="text-violet-400 mt-0.5 shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-foreground font-mono">{approval.taskDescription?.slice(0, 80) || "Sovereign Task"}</div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">Type: {approval.taskType} · Agents consulted: {approval.consultations?.length || 0}</div>
                </div>
              </div>

              {approval.proposedActions?.length > 0 && (
                <div className="bg-black/20 rounded-lg p-2 border border-violet-500/10 max-h-[80px] overflow-y-auto">
                  {approval.proposedActions.slice(0, 3).map((action: string, i: number) => (
                    <div key={i} className="text-[10px] text-muted-foreground font-mono truncate">{action}</div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => approveMutation.mutate(approval.id)}
                  disabled={approveMutation.isPending}
                  data-testid={`button-approve-task-${approval.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] font-mono hover:bg-green-500/15 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 size={11} /> Approve
                </button>
                <button
                  onClick={() => rejectMutation.mutate(approval.id)}
                  disabled={rejectMutation.isPending}
                  data-testid={`button-reject-task-${approval.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-mono hover:bg-red-500/15 transition-all disabled:opacity-50"
                >
                  <XCircle size={11} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AutonomyControlPanel() {
  const { data: autonomyState, isLoading } = useQuery<any>({
    queryKey: ["/api/autonomy/state"],
    refetchInterval: 15000,
  });
  const { data: activeTasks } = useQuery<any[]>({
    queryKey: ["/api/tasks/active"],
    refetchInterval: 15000,
  });

  const cycle = autonomyState?.currentCycle || autonomyState?.cycle || 0;
  const phase = autonomyState?.currentPhase || autonomyState?.phase || "idle";
  const improvements = autonomyState?.totalImprovements || 0;
  const tasks = Array.isArray(activeTasks) ? activeTasks : [];

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-emerald-500/15 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-emerald-400" />
          <span className="text-sm font-bold text-emerald-400 font-mono">Autonomy Engine</span>
          {isLoading && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", autonomyState?.running !== false ? "bg-green-400 animate-pulse" : "bg-gray-400")} />
          <span className="text-[10px] font-mono text-muted-foreground">
            {autonomyState?.running !== false ? "Active" : "Idle"}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-black/20 rounded-lg p-2.5 border border-emerald-500/15 text-center">
            <div className="text-[10px] text-muted-foreground font-mono mb-0.5">Cycle</div>
            <div className="text-lg font-bold font-mono text-emerald-400" data-testid="text-autonomy-cycle">#{cycle}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-2.5 border border-emerald-500/15 text-center">
            <div className="text-[10px] text-muted-foreground font-mono mb-0.5">Phase</div>
            <div className="text-sm font-bold font-mono text-emerald-400 truncate" data-testid="text-autonomy-phase">{phase}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-2.5 border border-emerald-500/15 text-center">
            <div className="text-[10px] text-muted-foreground font-mono mb-0.5">Improvements</div>
            <div className="text-lg font-bold font-mono text-emerald-400" data-testid="text-autonomy-improvements">{improvements}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
          <Activity size={12} className="text-emerald-400 animate-pulse shrink-0" />
          <span className="text-[11px] font-mono text-emerald-400/80">Autonomy cycles run automatically in background</span>
          <span className="text-[10px] font-mono text-muted-foreground ml-auto shrink-0">Auto</span>
        </div>

        {tasks.length > 0 && (
          <div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Active Tasks ({tasks.length})</div>
            <div className="space-y-1 max-h-[100px] overflow-y-auto">
              {tasks.slice(0, 5).map((task: any, i: number) => (
                <div key={task.id || i} data-testid={`active-task-${i}`} className="flex items-center gap-2 text-[11px] font-mono">
                  <Activity size={10} className="text-cyan-400 shrink-0" />
                  <span className="text-foreground truncate flex-1">{task.title || task.name || "Task"}</span>
                  <span className="text-muted-foreground shrink-0">{task.progress ? `${task.progress}%` : task.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SwarmStatusPanel() {
  const { data: consensusHistory } = useQuery<any>({
    queryKey: ["/api/swarm-consensus/history"],
    refetchInterval: 30000,
  });
  const { data: swarmData } = useQuery<any>({
    queryKey: ["/api/moltbook/agents"],
    refetchInterval: 30000,
    select: (agents: any[]) => ({
      total: agents?.length || 0,
      active: agents?.filter((a: any) => a.status === "active" || (a.messageCount || 0) > 0).length || 0,
      topAgents: agents?.sort((a: any, b: any) => (b.messageCount || 0) - (a.messageCount || 0)).slice(0, 5) || [],
    }),
  });

  const recentDecisions = Array.isArray(consensusHistory?.decisions)
    ? consensusHistory.decisions.slice(0, 5)
    : Array.isArray(consensusHistory)
    ? consensusHistory.slice(0, 5)
    : [];

  return (
    <div className="rounded-xl border border-border/30 bg-background/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/20 flex items-center gap-2">
        <Shield size={14} className="text-cyan-400" />
        <span className="text-sm font-bold text-cyan-400 font-mono">Swarm Status</span>
        {swarmData && (
          <span className="text-[10px] text-muted-foreground font-mono ml-auto">{swarmData.active}/{swarmData.total} agents active</span>
        )}
      </div>
      <div className="p-4 space-y-3">
        {swarmData?.topAgents?.length > 0 && (
          <div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Most Active Agents</div>
            <div className="space-y-1">
              {swarmData.topAgents.map((agent: any, i: number) => (
                <div key={agent.id || i} data-testid={`agent-status-${i}`} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-[11px] font-mono text-foreground flex-1 truncate">{agent.name}</span>
                  <span className="text-[10px] font-mono text-cyan-400">{agent.messageCount || 0} msgs</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentDecisions.length > 0 && (
          <div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Recent Consensus Decisions</div>
            <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
              {recentDecisions.map((d: any, i: number) => (
                <div key={d.id || i} data-testid={`consensus-decision-${i}`} className="flex items-center gap-2 text-[11px] font-mono">
                  <CheckCircle2 size={10} className="text-green-400 shrink-0" />
                  <span className="text-foreground/80 truncate flex-1">{d.topic || d.decision || "Decision"}</span>
                  <span className="text-muted-foreground shrink-0">{d.votes ? `${d.votes}v` : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommandPage({ embedded }: { embedded?: boolean }) {
  useEffect(() => { document.title = "Command Center | Tessera"; }, []);

  return (
    <div className="flex h-full bg-background" data-testid="command-page">
      <div className="flex-1 overflow-auto" data-scroll-container>
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold font-mono text-foreground flex items-center gap-2">
              <Brain size={20} className="text-orange-400" />
              Command Center
            </h1>
            <p className="text-[12px] text-muted-foreground font-mono mt-1">
              Mission queue · pending approvals · autonomy controls · swarm status
            </p>
          </div>

          <TaskApprovalGatePanel />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PendingActionsPanel />
            <AutonomyControlPanel />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MissionQueuePanel />
            <SwarmStatusPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
