import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cpu, BarChart3, CheckCircle, XCircle, Clock, RefreshCw, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LLMProvider {
  id: string;
  name: string;
  model: string;
  category: string;
  rateLimitPerMin: number;
  rateLimitPerDay: number;
  contextWindow: number;
  callsToday: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  available: boolean;
  source: string;
}

interface RotatorStats {
  totalProviders: number;
  availableProviders: number;
  totalCallsToday: number;
  totalSuccesses: number;
  totalErrors: number;
  successRate: number;
  avgLatency: number;
  currentPrimary: string;
  rotationsToday: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  chat: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  code: "bg-green-500/20 text-green-300 border-green-500/30",
  analysis: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  creative: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  research: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
};

export default function FreeLLMRotatorPage({ embedded }: { embedded?: boolean }) {
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: providerData, isLoading, refetch } = useQuery<{ providers: LLMProvider[] }>({
    queryKey: ["/api/llm-rotator/providers"],
    refetchInterval: 30000,
  });

  const { data: statsData } = useQuery<RotatorStats>({
    queryKey: ["/api/llm-rotator/stats"],
    refetchInterval: 10000,
  });

  const providers = (providerData?.providers || []).filter(p => categoryFilter === "all" || p.category === categoryFilter);

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-background text-white`}>
      <div className="border-b border-[#1a1f2e] bg-gradient-to-r from-[#0a0f1a] to-[#090a0f] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Free LLM Rotator</h1>
            <p className="text-xs text-slate-400">{providerData?.providers.length || 0} free LLM providers — auto-rotating at rate limits, reverse-engineering API quotas</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {statsData && (
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                Current: {statsData.currentPrimary}
              </Badge>
            )}
            <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {statsData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#0d1117] border border-blue-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{statsData.availableProviders}/{statsData.totalProviders}</div>
              <div className="text-xs text-slate-400 mt-1">Providers Available</div>
            </div>
            <div className="bg-[#0d1117] border border-green-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{statsData.successRate}%</div>
              <div className="text-xs text-slate-400 mt-1">Success Rate</div>
            </div>
            <div className="bg-[#0d1117] border border-yellow-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{statsData.rotationsToday}</div>
              <div className="text-xs text-slate-400 mt-1">Rotations Today</div>
            </div>
            <div className="bg-[#0d1117] border border-purple-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{statsData.avgLatency}ms</div>
              <div className="text-xs text-slate-400 mt-1">Avg Latency</div>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {["all", "chat", "code", "analysis", "creative", "research"].map(f => (
            <button key={f} onClick={() => setCategoryFilter(f)} data-testid={`filter-llm-${f}`}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${categoryFilter === f ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "text-slate-400 hover:text-slate-200 border border-[#1a2030]"}`}>
              {f}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-slate-400 text-center py-12">Loading LLM providers...</div>
        ) : (
          <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-[#1a2030] bg-[#0a0f1a]">
                <tr className="text-xs text-slate-400">
                  <th className="text-left p-3">Provider</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Context</th>
                  <th className="text-left p-3">Rate Limit</th>
                  <th className="text-left p-3">Calls Today</th>
                  <th className="text-left p-3">Success</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2030]">
                {providers.map(p => (
                  <tr key={p.id} className={`hover:bg-white/[0.02] ${!p.available ? "opacity-40" : ""}`} data-testid={`provider-${p.id}`}>
                    <td className="p-3">
                      <div className="font-medium text-white text-xs">{p.name}</div>
                      <div className="text-slate-500 text-xs font-mono">{p.model.slice(0, 40)}</div>
                    </td>
                    <td className="p-3">
                      <Badge className={`text-xs ${CATEGORY_COLORS[p.category] || ""}`}>{p.category}</Badge>
                    </td>
                    <td className="p-3 text-xs text-slate-300">
                      {p.contextWindow >= 1000000 ? `${(p.contextWindow / 1000000).toFixed(1)}M` : `${(p.contextWindow / 1000).toFixed(0)}K`}
                    </td>
                    <td className="p-3 text-xs text-slate-400">{p.rateLimitPerDay}/day</td>
                    <td className="p-3">
                      <div className="text-xs text-white">{p.callsToday}/{p.rateLimitPerDay}</div>
                      <div className="w-16 bg-[#1a2030] rounded-full h-1 mt-1">
                        <div className="h-1 rounded-full bg-blue-500" style={{ width: `${Math.min(100, (p.callsToday / p.rateLimitPerDay) * 100)}%` }} />
                      </div>
                    </td>
                    <td className="p-3 text-xs">
                      <div className="flex items-center gap-1 text-green-400"><CheckCircle className="w-3 h-3" />{p.successCount}</div>
                      <div className="flex items-center gap-1 text-red-400"><XCircle className="w-3 h-3" />{p.errorCount}</div>
                    </td>
                    <td className="p-3">
                      <div className={`flex items-center gap-1 text-xs ${p.available ? "text-green-400" : "text-red-400"}`}>
                        <div className={`w-2 h-2 rounded-full ${p.available ? "bg-green-400" : "bg-red-400"}`} />
                        {p.available ? "active" : "cooldown"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
