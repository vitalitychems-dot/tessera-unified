import { useQuery } from "@tanstack/react-query";
import { Trophy, Zap, Activity, TrendingUp, RefreshCw, Crown, Medal, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LeaderboardEntry {
  name: string;
  totalCalls: number;
  successRate: number;
  avgLatencyMs: number;
  totalTokens: number;
  status: string;
  rank: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  total: number;
  lastUpdated: number;
}

interface IntelDashboard {
  llm: { totalProviders: number; cooledDown: number; available: number; recentCooldowns: Array<{ name: string; remainingSeconds: number }> };
  gpu: { totalProviders: number; totalFreeVRAM: number; totalFreeTFLOPS: number };
  trainingData: { totalExamples: number; datasets: number };
  costSavings: { estimatedCostSaved: number; equivalentPaidCost: number; freeProviderCount: number };
  systemHealth: "good" | "degraded" | "critical";
  timestamp: number;
}

const RANK_ICONS = [
  <Crown className="w-4 h-4 text-yellow-400" />,
  <Medal className="w-4 h-4 text-slate-300" />,
  <Award className="w-4 h-4 text-amber-600" />,
];

const STATUS_COLORS: Record<string, string> = {
  healthy: "bg-green-500/20 text-green-300 border-green-500/30",
  degraded: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  down: "bg-red-500/20 text-red-300 border-red-500/30",
  cooldown: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  unknown: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

const HEALTH_COLORS: Record<string, string> = {
  good: "text-green-400",
  degraded: "text-yellow-400",
  critical: "text-red-400",
};

export default function ProviderLeaderboardPage({ embedded }: { embedded?: boolean }) {
  const { data: lb, isLoading, refetch } = useQuery<LeaderboardData>({
    queryKey: ["/api/system/provider-leaderboard"],
    refetchInterval: 30000,
  });

  const { data: intel } = useQuery<IntelDashboard>({
    queryKey: ["/api/system/intelligence-dashboard"],
    refetchInterval: 15000,
  });

  const top3 = lb?.leaderboard.slice(0, 3) || [];
  const rest = lb?.leaderboard.slice(3) || [];

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-background text-white`}>
      <div className="border-b border-[#1a1f2e] bg-gradient-to-r from-[#0a0f1a] to-[#090a0f] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">LLM Provider Leaderboard</h1>
            <p className="text-xs text-slate-400">Real performance metrics — {lb?.total || 0} providers ranked by success rate &amp; speed</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {intel && (
              <Badge className={`${HEALTH_COLORS[intel.systemHealth]} border border-current/30 text-xs`}>
                System: {intel.systemHealth}
              </Badge>
            )}
            <button onClick={() => refetch()} data-testid="btn-refresh-leaderboard" className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {intel && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#0d1117] border border-[#1a1f2e] rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-400">{intel.llm.available}</div>
              <div className="text-xs text-slate-400 mt-1">Available Providers</div>
              <div className="text-xs text-slate-500">{intel.llm.cooledDown} on cooldown</div>
            </div>
            <div className="bg-[#0d1117] border border-[#1a1f2e] rounded-xl p-4">
              <div className="text-2xl font-bold text-green-400">{intel.gpu.totalFreeVRAM} GB</div>
              <div className="text-xs text-slate-400 mt-1">Free GPU VRAM</div>
              <div className="text-xs text-slate-500">{intel.gpu.totalFreeTFLOPS.toLocaleString()} TFLOPs</div>
            </div>
            <div className="bg-[#0d1117] border border-[#1a1f2e] rounded-xl p-4">
              <div className="text-2xl font-bold text-purple-400">{intel.trainingData.totalExamples.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-1">Training Examples</div>
              <div className="text-xs text-slate-500">{intel.trainingData.datasets} datasets</div>
            </div>
            <div className="bg-[#0d1117] border border-[#1a1f2e] rounded-xl p-4">
              <div className="text-2xl font-bold text-yellow-400">${intel.costSavings.estimatedCostSaved.toFixed(2)}</div>
              <div className="text-xs text-slate-400 mt-1">Cost Saved</div>
              <div className="text-xs text-slate-500">vs ${intel.costSavings.equivalentPaidCost} paid</div>
            </div>
          </div>
        )}

        {top3.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" /> Top Performers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {top3.map((p, i) => (
                <div key={p.name} data-testid={`card-top-provider-${i}`} className="bg-[#0d1117] border border-yellow-500/20 rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute top-2 right-2">{RANK_ICONS[i]}</div>
                  <div className="text-xs text-slate-500 mb-1">#{p.rank}</div>
                  <div className="font-semibold text-white text-sm mb-2 pr-6">{p.name}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-slate-400">Success Rate</div>
                      <div className="text-green-400 font-bold">{p.successRate}%</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Avg Latency</div>
                      <div className="text-blue-400 font-bold">{p.avgLatencyMs > 0 ? `${p.avgLatencyMs}ms` : "—"}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Total Calls</div>
                      <div className="text-white font-bold">{p.totalCalls.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Status</div>
                      <Badge className={`${STATUS_COLORS[p.status]} text-xs px-1 py-0`}>{p.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12 text-slate-400">Loading provider performance data...</div>
        )}

        {!isLoading && lb?.leaderboard.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <div className="text-slate-400 text-sm">No provider call data yet</div>
            <div className="text-slate-500 text-xs mt-1">Performance data accumulates as agents make LLM calls</div>
          </div>
        )}

        {rest.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Full Rankings
            </h2>
            <div className="bg-[#0d1117] border border-[#1a1f2e] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-[#1a1f2e]">
                  <tr className="text-xs text-slate-400">
                    <th className="text-left px-4 py-3">Rank</th>
                    <th className="text-left px-4 py-3">Provider</th>
                    <th className="text-right px-4 py-3">Calls</th>
                    <th className="text-right px-4 py-3">Success</th>
                    <th className="text-right px-4 py-3">Latency</th>
                    <th className="text-right px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((p) => (
                    <tr key={p.name} data-testid={`row-provider-${p.rank}`} className="border-b border-[#1a1f2e]/50 hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-slate-500 font-mono">#{p.rank}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-white text-xs">{p.name}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-300">{p.totalCalls.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={p.successRate >= 70 ? "text-green-400" : p.successRate >= 40 ? "text-yellow-400" : "text-red-400"}>
                          {p.successRate}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-300">
                        {p.avgLatencyMs > 0 ? `${p.avgLatencyMs}ms` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Badge className={`${STATUS_COLORS[p.status]} text-xs px-1.5 py-0`}>{p.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {intel?.llm.recentCooldowns && intel.llm.recentCooldowns.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-400" /> Active Cooldowns
            </h2>
            <div className="flex flex-wrap gap-2">
              {intel.llm.recentCooldowns.map((c) => (
                <div key={c.name} data-testid={`badge-cooldown-${c.name}`} className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-1.5 text-xs">
                  <span className="text-orange-300">{c.name}</span>
                  <span className="text-slate-400 ml-2">{c.remainingSeconds}s</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
