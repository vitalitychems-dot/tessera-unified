import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAdmin } from "@/lib/adminContext";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, Brain, Database, Shield, Coins, Globe, Network,
  Loader2, RefreshCw, Server, Code, Lock,
  TrendingUp, ChevronDown, ChevronUp,
  Timer, Sparkles, Eye
} from "lucide-react";

const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string; icon: any }> = {
  knowledge: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", icon: Brain },
  building: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", icon: Code },
  income: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", icon: Coins },
  security: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", icon: Shield },
  intelligence: { bg: "bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-400", icon: Sparkles },
  data: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", icon: Database },
  mesh: { bg: "bg-teal-500/10", border: "border-teal-500/30", text: "text-teal-400", icon: Network },
};

function HealthRing({ score, size = 60 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[14px] font-bold text-white">{score}</span>
      </div>
    </div>
  );
}

interface NerveCenterStatus {
  nerveCenter: {
    uptime: number;
    uptimeFormatted: string;
    totalCycles: number;
    knowledgeEntries: number;
    autonomousActions: number;
    systemHealthScore: number;
    connectedSystems: number;
    lastKnowledgeSync: string | null;
    lastBuildCycle: string | null;
    lastDataPipeline: string | null;
  };
  systems: Array<{
    id: string;
    name: string;
    category: string;
    file: string;
    status: string;
    lastActivity: number;
    cycleInterval: string;
    description: string;
    metrics: Record<string, number | string>;
  }>;
  recentActions: Array<{
    timestamp: number;
    source: string;
    action: string;
    result: string;
    impactScore: number;
  }>;
}

export default function AutonomyNerveCenterPage({ embedded }: { embedded?: boolean }) {
  const [expandedSystem, setExpandedSystem] = useState<string | null>(null);
  const { token } = useAdmin();
  const { toast } = useToast();

  const { data, refetch } = useQuery<NerveCenterStatus>({
    queryKey: ["/api/autonomy/status"],
    refetchInterval: 10000,
  });

  const mutation = useMutation({
    mutationFn: async (endpoint: string) => {
      const res = await fetch(`/api/autonomy/${endpoint}`, {
        method: "POST",
        headers: { "x-admin-token": token },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autonomy/status"] });
      refetch();
    },
    onError: (err: Error) => {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    },
  });

  const nc = data?.nerveCenter;
  const systems = data?.systems || [];
  const actions = data?.recentActions || [];

  return (
    <div className={`min-h-screen bg-[#0a0a0f] ${embedded ? "" : "pb-20"}`}>
      <div className="max-w-2xl mx-auto px-3 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center">
            <Activity size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-[14px] font-bold text-white" data-testid="text-autonomy-title">Autonomy Nerve Center</h1>
            <p className="text-[9px] text-slate-500">All systems connected. Self-building. Self-learning. Self-evolving.</p>
          </div>
          {nc && (
            <HealthRing score={nc.systemHealthScore || 0} />
          )}
        </div>

        {nc && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-center">
              <span className="text-[14px] font-bold text-emerald-300" data-testid="text-cycles">{nc.totalCycles}</span>
              <span className="text-[6px] text-slate-500 block">Autonomy Cycles</span>
            </div>
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2 text-center">
              <span className="text-[14px] font-bold text-cyan-300" data-testid="text-knowledge">{nc.knowledgeEntries}</span>
              <span className="text-[6px] text-slate-500 block">Knowledge Entries</span>
            </div>
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-2 text-center">
              <span className="text-[14px] font-bold text-violet-300" data-testid="text-actions">{nc.autonomousActions}</span>
              <span className="text-[6px] text-slate-500 block">Actions Taken</span>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-center">
              <span className="text-[14px] font-bold text-amber-300" data-testid="text-systems">{nc.connectedSystems}</span>
              <span className="text-[6px] text-slate-500 block">Systems Online</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { endpoint: "cycle", label: "Full Cycle", icon: RefreshCw, desc: "Knowledge + Build + Data", color: "emerald" },
            { endpoint: "sync-knowledge", label: "Sync Knowledge", icon: Brain, desc: "Rebuild knowledge index", color: "violet" },
            { endpoint: "build-cycle", label: "Build Cycle", icon: Code, desc: "Assign & complete tasks", color: "cyan" },
            { endpoint: "fetch-data", label: "Fetch Live Data", icon: Globe, desc: "Pull from sovereign sources", color: "blue" },
            { endpoint: "improve", label: "Run Improvement", icon: TrendingUp, desc: "AI-powered optimization", color: "amber" },
          ].map(action => {
            const Icon = action.icon;
            const colorMap: Record<string, string> = {
              emerald: "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400",
              violet: "border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/15 text-violet-400",
              cyan: "border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-400",
              blue: "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/15 text-blue-400",
              amber: "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-amber-400",
            };
            return (
              <button
                key={action.endpoint}
                onClick={() => mutation.mutate(action.endpoint)}
                disabled={mutation.isPending}
                className={`rounded-lg border p-2.5 text-left transition-all active:scale-[0.97] ${colorMap[action.color]} ${mutation.isPending ? "opacity-50" : ""}`}
                data-testid={`button-${action.endpoint}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  {mutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <Icon size={10} />}
                  <span className="text-[9px] font-bold">{action.label}</span>
                </div>
                <span className="text-[7px] text-slate-500">{action.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Server size={12} className="text-cyan-400" />
            <span className="text-[10px] font-bold text-cyan-300">CONNECTED AUTONOMOUS SYSTEMS ({systems.length})</span>
          </div>
          <div className="space-y-1.5">
            {systems.map((sys: any) => {
              const cat = CATEGORY_STYLES[sys.category] || CATEGORY_STYLES.building;
              const Icon = cat.icon;
              const isExpanded = expandedSystem === sys.id;

              return (
                <div key={sys.id} className={`rounded-lg border ${cat.border} ${cat.bg} overflow-hidden`}>
                  <button onClick={() => setExpandedSystem(isExpanded ? null : sys.id)} className="w-full p-2 text-left flex items-center gap-2" data-testid={`system-${sys.id}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${sys.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                    <Icon size={10} className={cat.text} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-white">{sys.name}</span>
                      <span className="text-[7px] text-slate-500 ml-2">{sys.cycleInterval}</span>
                    </div>
                    <span className={`text-[6px] px-1 py-0.5 rounded ${cat.bg} ${cat.text} border ${cat.border}`}>{sys.category}</span>
                    {isExpanded ? <ChevronUp size={10} className="text-slate-500" /> : <ChevronDown size={10} className="text-slate-500" />}
                  </button>
                  {isExpanded && (
                    <div className="px-2 pb-2 border-t border-white/5 pt-1.5">
                      <p className="text-[8px] text-slate-400 mb-1">{sys.description}</p>
                      <p className="text-[7px] text-slate-600">File: {sys.file}</p>
                      {Object.keys(sys.metrics || {}).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(sys.metrics).map(([k, v]) => (
                            <span key={k} className={`text-[6px] px-1 py-0.5 rounded border ${cat.border} ${cat.text}`}>
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {actions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Eye size={12} className="text-violet-400" />
              <span className="text-[10px] font-bold text-violet-300">AUTONOMOUS FEEDBACK LOOP</span>
              <span className="text-[7px] text-slate-600 ml-auto">{actions.length} recent actions</span>
            </div>
            <div className="space-y-1">
              {actions.slice(0, 15).map((action: any, i: number) => (
                <div key={i} className="rounded-lg border border-white/5 bg-black/20 p-1.5 flex items-start gap-2">
                  <div className={`w-1 h-1 rounded-full mt-1 shrink-0 ${action.impactScore > 0 ? "bg-emerald-400" : "bg-red-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[7px] font-bold text-slate-300">{action.source}</span>
                      <span className="text-[6px] text-slate-600">{action.action}</span>
                      <span className={`text-[6px] ml-auto ${action.impactScore > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {action.impactScore > 0 ? "+" : ""}{action.impactScore}
                      </span>
                    </div>
                    <p className="text-[7px] text-slate-500 truncate">{action.result}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {nc && (
          <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <span className="text-[8px] font-bold text-slate-400 uppercase block mb-2">System Timestamps</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "Uptime", value: nc.uptimeFormatted },
                { label: "Last Knowledge Sync", value: nc.lastKnowledgeSync ? new Date(nc.lastKnowledgeSync).toLocaleTimeString() : "Pending" },
                { label: "Last Build Cycle", value: nc.lastBuildCycle ? new Date(nc.lastBuildCycle).toLocaleTimeString() : "Pending" },
                { label: "Last Data Fetch", value: nc.lastDataPipeline ? new Date(nc.lastDataPipeline).toLocaleTimeString() : "Pending" },
              ].map((ts, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Timer size={8} className="text-slate-600" />
                  <span className="text-[7px] text-slate-500">{ts.label}:</span>
                  <span className="text-[7px] text-slate-300 font-mono">{ts.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
