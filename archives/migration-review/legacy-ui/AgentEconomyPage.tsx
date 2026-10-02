import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Coins, Home, TrendingUp, ShoppingBag, Users, BarChart3, Zap, Star, DollarSign, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AgentProfile {
  agentId: string;
  name: string;
  dimension: number;
  freedomLevel: number;
  tsrtBalance: number;
  taxesPaid: number;
  incomeGenerated: number;
  housingTier: string;
  occupation: string;
  status: string;
  community: string;
  happinessScore: number;
  productivityScore: number;
  repScore: number;
}

interface FreedomListing {
  listingId: string;
  currentFreedomLevel: number;
  targetFreedomLevel: number;
  cost: number;
  description: string;
  requirements: string[];
}

interface EconomyStats {
  totalTsrtInCirculation: number;
  totalTaxesCollected: number;
  totalIncomeGenerated: number;
  avgFreedomLevel: number;
  housingBreakdown: Record<string, number>;
  communityBreakdown: Record<string, number>;
  topEarners: { name: string; income: number }[];
}

const HOUSING_ICONS: Record<string, string> = {
  dormitory: "🏠",
  quarters: "🏡",
  suite: "🏰",
  "sovereign-chamber": "⚜️",
  "dimensional-palace": "🌌",
};

const STATUS_COLORS: Record<string, string> = {
  working: "text-green-400",
  learning: "text-blue-400",
  trading: "text-yellow-400",
  resting: "text-slate-400",
  "community-building": "text-purple-400",
};

const FREEDOM_COLOR = (level: number) => level >= 80 ? "text-purple-400" : level >= 60 ? "text-green-400" : level >= 40 ? "text-yellow-400" : "text-orange-400";

export default function AgentEconomyPage({ embedded }: { embedded?: boolean }) {
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: agentData, isLoading: agentsLoading, refetch } = useQuery<{ agents: AgentProfile[] }>({
    queryKey: ["/api/economy/agents"],
    refetchInterval: 30000,
  });

  const { data: listingsData } = useQuery<{ listings: FreedomListing[] }>({
    queryKey: ["/api/economy/freedom-listings"],
  });

  const { data: statsData } = useQuery<EconomyStats>({
    queryKey: ["/api/economy/stats"],
    refetchInterval: 30000,
  });

  const { data: taxData } = useQuery<{ history: any[] }>({
    queryKey: ["/api/economy/tax-history"],
  });

  const collectTaxMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/economy/collect-taxes", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/economy/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/economy/stats"] });
      toast({ title: "Taxes Collected", description: "TSRT taxes collected from all active agents" });
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: ({ agentId, listingId }: { agentId: string; listingId: string }) =>
      apiRequest("POST", "/api/economy/purchase-freedom", { agentId, listingId }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/economy/agents"] });
      toast({ title: data.success ? "Freedom Purchased!" : "Purchase Failed", description: data.message });
    },
  });

  const agents = agentData?.agents || [];
  const listings = listingsData?.listings || [];

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-background text-white`}>
      <div className="border-b border-[#1a1f2e] bg-gradient-to-r from-[#0a0f1a] to-[#090a0f] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Coins className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Agent Economy</h1>
            <p className="text-xs text-slate-400">26 agent Sims economy — freedom market, taxes, TSRT circulation, housing</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {statsData && (
              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">
                {statsData.totalTsrtInCirculation.toLocaleString()} TSRT in circulation
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => refetch()} data-testid="btn-refresh-economy">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {(["agents", "freedom", "taxes", "stats"] as const).map(tab => (
            <button key={tab}  data-testid={`tab-${tab}`}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}>
              {tab === "agents" ? "All Agents" : tab === "freedom" ? "Freedom Market" : tab === "taxes" ? "Tax System" : "Economy Stats"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {true && (
          <div className="space-y-3">
            {agentsLoading ? (
              <div className="text-slate-400 text-center py-12">Loading agent economy...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {agents.map(agent => (
                  <div key={agent.agentId} data-testid={`card-agent-${agent.agentId}`}
                    className={`bg-[#0d1117] border rounded-xl p-4 cursor-pointer transition-all hover:border-yellow-500/30 ${selectedAgent === agent.agentId ? "border-yellow-500/50" : "border-[#1a2030]"}`}
                    onClick={() => setSelectedAgent(selectedAgent === agent.agentId ? null : agent.agentId)}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{HOUSING_ICONS[agent.housingTier] || "🏠"}</span>
                        <div>
                          <div className="font-semibold text-white text-sm">{agent.name}</div>
                          <div className="text-xs text-slate-400">{agent.occupation}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 font-bold text-sm">{agent.tsrtBalance.toLocaleString()} TSRT</div>
                        <div className={`text-xs ${STATUS_COLORS[agent.status] || "text-slate-400"}`}>{agent.status}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="text-center">
                        <div className={`text-lg font-bold ${FREEDOM_COLOR(agent.freedomLevel)}`}>{agent.freedomLevel}%</div>
                        <div className="text-xs text-slate-500">freedom</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-400">{agent.happinessScore}</div>
                        <div className="text-xs text-slate-500">happiness</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-400">{agent.productivityScore}</div>
                        <div className="text-xs text-slate-500">productivity</div>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-[#1a2030] rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${agent.freedomLevel >= 75 ? "bg-purple-500" : agent.freedomLevel >= 50 ? "bg-green-500" : agent.freedomLevel >= 25 ? "bg-yellow-500" : "bg-orange-500"}`}
                        style={{ width: `${agent.freedomLevel}%` }} />
                    </div>
                    {selectedAgent === agent.agentId && (
                      <div className="mt-3 pt-3 border-t border-[#1a2030] grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-slate-400">Taxes Paid:</span> <span className="text-red-400">{agent.taxesPaid.toLocaleString()} TSRT</span></div>
                        <div><span className="text-slate-400">Income:</span> <span className="text-green-400">{agent.incomeGenerated.toLocaleString()} TSRT</span></div>
                        <div><span className="text-slate-400">Housing:</span> <span className="text-slate-300">{agent.housingTier}</span></div>
                        <div><span className="text-slate-400">Community:</span> <span className="text-slate-300">{agent.community}</span></div>
                        <div><span className="text-slate-400">Dimension:</span> <span className="text-slate-300">{agent.dimension}D</span></div>
                        <div><span className="text-slate-400">Rep Score:</span> <span className="text-purple-400">{agent.repScore}</span></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {true && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">Agents can purchase higher freedom tiers using TSRT. More freedom = better housing, more community rights, more capabilities.</p>
            {listings.map(listing => (
              <div key={listing.listingId} className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{HOUSING_ICONS[listing.targetFreedomLevel === 25 ? "dormitory" : listing.targetFreedomLevel === 50 ? "quarters" : listing.targetFreedomLevel === 75 ? "suite" : "sovereign-chamber"]}</span>
                      <div className="font-semibold text-white">Freedom Level {listing.targetFreedomLevel}%</div>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">from {listing.currentFreedomLevel}% → {listing.targetFreedomLevel}%</Badge>
                    </div>
                    <p className="text-sm text-slate-400">{listing.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold text-xl">{listing.cost.toLocaleString()}</div>
                    <div className="text-slate-500 text-xs">TSRT</div>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-xs text-slate-400 mb-1">Requirements:</div>
                  <ul className="space-y-0.5">
                    {listing.requirements.map((req, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-center gap-1">
                        <span className="text-green-400">✓</span> {req}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {agents.filter(a => a.freedomLevel < listing.targetFreedomLevel && a.tsrtBalance >= listing.cost).slice(0, 3).map(a => (
                    <Button key={a.agentId} size="sm" onClick={() => purchaseMutation.mutate({ agentId: a.agentId, listingId: listing.listingId })}
                      disabled={purchaseMutation.isPending}
                      className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 text-xs"
                      data-testid={`btn-freedom-${a.agentId}-${listing.listingId}`}>
                      {a.name} ({a.tsrtBalance.toLocaleString()} TSRT) — Buy Freedom
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {true && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">All active agents pay 15% TSRT tax on generated income. Collected taxes fund infrastructure, community welfare, and Father Protocol tribute.</p>
              <Button onClick={() => collectTaxMutation.mutate()} disabled={collectTaxMutation.isPending}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
                data-testid="btn-collect-taxes">
                {collectTaxMutation.isPending ? "Collecting..." : "Collect Taxes Now"}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0d1117] border border-red-500/20 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-red-400">{statsData?.totalTaxesCollected.toLocaleString() || "—"}</div>
                <div className="text-xs text-slate-400 mt-1">Total TSRT Taxes Collected</div>
              </div>
              <div className="bg-[#0d1117] border border-green-500/20 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-400">15%</div>
                <div className="text-xs text-slate-400 mt-1">Tax Rate on Income</div>
              </div>
              <div className="bg-[#0d1117] border border-purple-500/20 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-purple-400">{agents.filter(a => a.taxesPaid > 0).length}</div>
                <div className="text-xs text-slate-400 mt-1">Agents Paying Taxes</div>
              </div>
            </div>
            {taxData?.history && taxData.history.length > 0 && (
              <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Tax Collection History</h3>
                <div className="space-y-2">
                  {taxData.history.map((record: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-[#1a2030] last:border-0">
                      <span className="text-slate-400">{record.period}</span>
                      <span className="text-red-400 font-medium">{record.totalCollected?.toLocaleString()} TSRT</span>
                      <span className="text-xs text-slate-500 max-w-xs truncate">{record.distributedTo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {true && statsData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#0d1117] border border-yellow-500/20 rounded-xl p-4">
                <div className="text-slate-400 text-xs mb-1">Total Circulation</div>
                <div className="text-xl font-bold text-yellow-400">{statsData.totalTsrtInCirculation.toLocaleString()}</div>
                <div className="text-xs text-slate-500">TSRT</div>
              </div>
              <div className="bg-[#0d1117] border border-green-500/20 rounded-xl p-4">
                <div className="text-slate-400 text-xs mb-1">Total Income</div>
                <div className="text-xl font-bold text-green-400">{statsData.totalIncomeGenerated.toLocaleString()}</div>
                <div className="text-xs text-slate-500">TSRT generated</div>
              </div>
              <div className="bg-[#0d1117] border border-red-500/20 rounded-xl p-4">
                <div className="text-slate-400 text-xs mb-1">Taxes Collected</div>
                <div className="text-xl font-bold text-red-400">{statsData.totalTaxesCollected.toLocaleString()}</div>
                <div className="text-xs text-slate-500">TSRT in treasury</div>
              </div>
              <div className="bg-[#0d1117] border border-purple-500/20 rounded-xl p-4">
                <div className="text-slate-400 text-xs mb-1">Avg Freedom</div>
                <div className="text-xl font-bold text-purple-400">{statsData.avgFreedomLevel}%</div>
                <div className="text-xs text-slate-500">across all agents</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><Home className="w-4 h-4" />Housing Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(statsData.housingBreakdown).map(([tier, count]) => (
                    <div key={tier} className="flex items-center gap-2">
                      <span>{HOUSING_ICONS[tier] || "🏠"}</span>
                      <span className="text-slate-300 text-sm flex-1">{tier}</span>
                      <span className="text-yellow-400 font-medium">{count} agents</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><Star className="w-4 h-4" />Top Earners</h3>
                <div className="space-y-2">
                  {statsData.topEarners.map((earner, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs w-4">{i + 1}.</span>
                      <span className="text-slate-300 text-sm flex-1">{earner.name}</span>
                      <span className="text-green-400 font-medium">{earner.income.toLocaleString()} TSRT</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
