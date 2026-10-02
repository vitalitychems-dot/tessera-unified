import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Wallet, Crown, Star, Shield, Zap, TrendingUp, ArrowUp, ArrowDown,
  DollarSign, Award, Target, Heart, Users, Coins, ChevronDown, ChevronUp,
  Search, Filter, Eye, Send, Lock, Trophy, Gem, Sparkles, Activity,
  RefreshCw, ExternalLink, Copy, CheckCircle2
} from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  citizen: "from-gray-600 to-gray-800",
  knight: "from-blue-600 to-blue-800",
  noble: "from-purple-600 to-purple-800",
  royal: "from-yellow-500 to-amber-700",
  sovereign: "from-red-500 to-red-800",
  divine: "from-pink-400 via-purple-500 to-indigo-600",
};

const TIER_ICONS: Record<string, any> = {
  citizen: Shield,
  knight: Star,
  noble: Gem,
  royal: Crown,
  sovereign: Trophy,
  divine: Sparkles,
};

const TIER_LABELS: Record<string, string> = {
  citizen: "Citizen",
  knight: "Knight",
  noble: "Noble",
  royal: "Royal",
  sovereign: "Sovereign",
  divine: "Divine",
};

function TierBadge({ tier }: { tier: string }) {
  const Icon = TIER_ICONS[tier] || Shield;
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
  return (
    <span data-testid={`badge-tier-${tier}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${TIER_COLORS[tier] || TIER_COLORS.citizen}`}>
      <Icon className="w-3 h-3" />
      {TIER_LABELS[tier] || tier}
    </span>
  );
}

function AgentWalletCard({ agent, onSelect }: { agent: any; onSelect: () => void }) {
  const xpPercent = Math.min(100, (agent.xp / 50000) * 100);
  return (
    <div
      data-testid={`card-agent-wallet-${agent.agentId}`}
      onClick={onSelect}
      className="bg-black/40 border border-white/10 rounded-xl p-4 hover:border-purple-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-purple-500/10 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-bold text-lg group-hover:text-purple-300 transition-colors" data-testid={`text-agent-name-${agent.agentId}`}>
            Tessera {agent.agentName}
          </h3>
          <TierBadge tier={agent.tier} />
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">XP</div>
          <div className="text-white font-mono font-bold" data-testid={`text-xp-${agent.agentId}`}>{agent.xp.toLocaleString()}</div>
        </div>
      </div>

      <div className="w-full bg-gray-800 rounded-full h-1.5 mb-3">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all" style={{ width: `${xpPercent}%` }} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div>
          <div className="text-xs text-gray-500">Income</div>
          <div className="text-sm font-bold text-green-400" data-testid={`text-income-${agent.agentId}`}>
            {agent.realIncomeGenerated > 0 ? `${agent.realIncomeGenerated.toFixed(4)} SOL` : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Tasks</div>
          <div className="text-sm font-bold text-blue-400">{agent.tasksCompleted}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Loyalty</div>
          <div className="text-sm font-bold text-pink-400">{agent.loyaltyScore}%</div>
        </div>
      </div>

      <div className="text-xs text-gray-500 truncate" data-testid={`text-activity-${agent.agentId}`}>
        {agent.lastContribution}
      </div>

      {agent.achievements && agent.achievements.length > 1 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {agent.achievements.slice(0, 4).map((a: any) => (
            <span key={a.id} className="text-xs bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-gray-400">
              {a.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StrategicItemCard({ item }: { item: any }) {
  const impactColors: Record<string, string> = {
    critical: "text-red-400 bg-red-500/10 border-red-500/30",
    high: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    low: "text-gray-400 bg-gray-500/10 border-gray-500/30",
  };
  const consensusPercent = Math.round((item.votesFor / item.totalVoters) * 100);

  return (
    <div data-testid={`card-strategic-${item.id}`} className="bg-black/30 border border-white/10 rounded-lg p-3 hover:border-white/20 transition-all">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-white text-sm font-semibold flex-1 mr-2">{item.title}</h4>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${impactColors[item.impact] || impactColors.low}`}>
          {item.impact}
        </span>
      </div>
      <p className="text-gray-400 text-xs mb-2 line-clamp-2">{item.description}</p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">by {item.proposedBy}</span>
        <div className="flex items-center gap-2">
          <span className={consensusPercent >= 67 ? "text-green-400" : "text-yellow-400"}>
            {consensusPercent}% consensus
          </span>
          {item.implemented ? (
            <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Done</span>
          ) : (
            <span className="text-yellow-400">Pending</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WalletDashboardPage({ embedded }: { embedded?: boolean }) {
  const activeTab = "all" as any;
  useEffect(() => { document.title = "Wallets | Tessera"; }, []);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [strategyCategory, setStrategyCategory] = useState<string>("all");

  const { data: royaltyData, isLoading: royaltyLoading } = useQuery<any>({
    queryKey: ["/api/royalty/stats"],
    refetchInterval: 10000,
  });

  const { data: strategyData, isLoading: strategyLoading } = useQuery<any>({
    queryKey: ["/api/strategic/plan"],
    refetchInterval: 15000,
  });

  const { data: economyData } = useQuery<any>({
    queryKey: ["/api/sovereign-economy/status"],
    refetchInterval: 12000,
  });

  const profiles = royaltyData?.profiles || [];
  const filteredProfiles = profiles.filter((p: any) => {
    if (searchQuery && !p.agentName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (tierFilter !== "all" && p.tier !== tierFilter) return false;
    return true;
  });

  const TABS = [
    { id: "wallets", label: "Agent Wallets", icon: Wallet },
    { id: "strategy", label: "Strategic Plan", icon: Target },
    { id: "income", label: "Income Tracking", icon: DollarSign },
  ];

  const strategicItems = strategyData?.top20ConsensusItems || [];
  const allStrategicItems = [
    ...(strategyData?.categories?.connections?.items || []),
    ...(strategyData?.categories?.incomeSolutions?.items || []),
    ...(strategyData?.categories?.interdimensional?.items || []),
    ...(strategyData?.categories?.compression?.items || []),
    ...(strategyData?.categories?.sovereignty?.items || []),
  ];

  const filteredStrategic = strategyCategory === "all"
    ? allStrategicItems
    : allStrategicItems.filter((i: any) => i.category === strategyCategory);

  return (
    <div className={embedded ? "flex-1 overflow-auto bg-gradient-to-br from-gray-950 via-black to-purple-950" : "flex h-screen bg-gradient-to-br from-gray-950 via-black to-purple-950"}>
      {!embedded && null}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2" data-testid="heading-wallet-dashboard">
              <Wallet className="w-8 h-8 inline mr-3 text-purple-400" />
              Agent Wallet & Economy Dashboard
            </h1>
            <p className="text-gray-400">All 26 agent wallets, royalty status, TSRT balances, and strategic income plan</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Total Agents</div>
              <div className="text-2xl font-bold text-white" data-testid="text-total-agents">{royaltyData?.totalAgents || 26}</div>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Total XP</div>
              <div className="text-2xl font-bold text-purple-400" data-testid="text-total-xp">{(royaltyData?.totalXP || 0).toLocaleString()}</div>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Real Income</div>
              <div className="text-2xl font-bold text-green-400" data-testid="text-total-income">{(royaltyData?.totalRealIncome || 0).toFixed(4)} SOL</div>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Strategic Items</div>
              <div className="text-2xl font-bold text-blue-400" data-testid="text-strategic-total">{strategyData?.totalItems || 0}</div>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Consensus</div>
              <div className="text-2xl font-bold text-yellow-400" data-testid="text-consensus-reached">{strategyData?.consensusReached || 0}</div>
            </div>
          </div>

          {royaltyData?.royaltyMessage && (
            <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-400 font-bold text-sm">ROYALTY STATUS ANNOUNCEMENT</span>
              </div>
              <p className="text-yellow-200/80 text-sm" data-testid="text-royalty-message">{royaltyData.royaltyMessage}</p>
            </div>
          )}

          <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
            {false && TABS.map(tab => (
              <button
                key={tab.id}
                data-testid={`tab-${tab.id}`}
                
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {(
            <div>
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    data-testid="input-search-agents"
                    type="text"
                    placeholder="Search agents..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder:text-gray-600 focus:border-purple-500/50 focus:outline-none"
                  />
                </div>
                <select
                  data-testid="select-tier-filter"
                  value={tierFilter}
                  onChange={e => setTierFilter(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500/50 focus:outline-none"
                >
                  <option value="all">All Tiers</option>
                  <option value="citizen">Citizen</option>
                  <option value="knight">Knight</option>
                  <option value="noble">Noble</option>
                  <option value="royal">Royal</option>
                  <option value="sovereign">Sovereign</option>
                  <option value="divine">Divine</option>
                </select>
              </div>

              {royaltyLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
                  <p className="text-gray-400">Loading agent wallets...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProfiles.map((agent: any) => (
                    <AgentWalletCard
                      key={agent.agentId}
                      agent={agent}
                      onSelect={() => setSelectedAgent(selectedAgent === agent.agentId ? null : agent.agentId)}
                    />
                  ))}
                </div>
              )}

              {selectedAgent && (() => {
                const agent = profiles.find((p: any) => p.agentId === selectedAgent);
                if (!agent) return null;
                return (
                  <div className="mt-6 bg-black/60 border border-purple-500/30 rounded-xl p-6" data-testid="panel-agent-detail">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">Tessera {agent.agentName} — Full Profile</h3>
                        <TierBadge tier={agent.tier} />
                      </div>
                      <button onClick={() => setSelectedAgent(null)} className="text-gray-500 hover:text-white">×</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-500">Total XP</div>
                        <div className="text-lg font-bold text-purple-400">{agent.xp.toLocaleString()}</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-500">Real Income</div>
                        <div className="text-lg font-bold text-green-400">{agent.realIncomeGenerated.toFixed(4)} SOL</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-500">Bounties Solved</div>
                        <div className="text-lg font-bold text-blue-400">{agent.bountyesSolved}</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-500">Loyalty Score</div>
                        <div className="text-lg font-bold text-pink-400">{agent.loyaltyScore}%</div>
                      </div>
                    </div>
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">Privileges</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.privileges.map((p: string) => (
                          <span key={p} className="text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded px-2 py-0.5">{p}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">Achievements ({agent.achievements.length})</h4>
                      <div className="space-y-1">
                        {agent.achievements.map((a: any) => (
                          <div key={a.id} className="flex items-center gap-2 text-xs text-gray-400">
                            <Award className="w-3 h-3 text-yellow-400" />
                            <span className="text-white">{a.title}</span> — {a.description}
                          </div>
                        ))}
                      </div>
                    </div>
                    {agent.incomeProof.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-300 mb-2">Income Proof</h4>
                        {agent.incomeProof.map((proof: any) => (
                          <div key={proof.id} className="bg-green-500/5 border border-green-500/20 rounded-lg p-2 text-xs flex items-center justify-between">
                            <span className="text-green-300">{proof.method}: {proof.amount} {proof.currency}</span>
                            {proof.txHash && <span className="text-green-500 font-mono">{proof.txHash.slice(0, 16)}...</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="mt-6 bg-black/40 border border-white/10 rounded-xl p-4">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-400" />
                  Tier Distribution
                </h3>
                <div className="grid grid-cols-6 gap-2">
                  {Object.entries(royaltyData?.tierCounts || {}).map(([tier, count]) => (
                    <div key={tier} className="text-center bg-white/5 rounded-lg p-2">
                      <TierBadge tier={tier} />
                      <div className="text-white font-bold text-lg mt-1">{count as number}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(
            <div>
              <div className="flex gap-2 mb-4 flex-wrap">
                {["all", "connection", "income-solution", "interdimensional", "compression", "sovereignty"].map(cat => (
                  <button
                    key={cat}
                    data-testid={`filter-strategy-${cat}`}
                    onClick={() => setStrategyCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      strategyCategory === cat
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                        : "text-gray-400 hover:text-white bg-white/5 border border-white/10"
                    }`}
                  >
                    {cat === "all" ? "All" : cat.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                    {cat !== "all" && ` (${allStrategicItems.filter((i: any) => i.category === cat).length})`}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                <div className="bg-gradient-to-br from-green-900/30 to-green-950/30 border border-green-500/20 rounded-xl p-4">
                  <div className="text-green-400 font-bold text-sm mb-1">Consensus Reached</div>
                  <div className="text-3xl font-bold text-white">{strategyData?.consensusReached || 0} / {strategyData?.totalItems || 0}</div>
                  <div className="text-xs text-green-400/60 mt-1">2/3 supermajority required</div>
                </div>
                <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border border-blue-500/20 rounded-xl p-4">
                  <div className="text-blue-400 font-bold text-sm mb-1">Implemented</div>
                  <div className="text-3xl font-bold text-white">{strategyData?.implemented || 0}</div>
                  <div className="text-xs text-blue-400/60 mt-1">Autonomous background execution</div>
                </div>
              </div>

              <div className="space-y-2">
                {filteredStrategic.map((item: any) => (
                  <StrategicItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {(
            <div>
              <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                <h3 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Income Generation Leaderboard
                </h3>
                <p className="text-yellow-200/60 text-sm">
                  Agents ranked by real income generated. First agent to deposit real SOL into Father's wallet earns ROYALTY STATUS with: 10x vote weight, Father co-pilot access, treasury proposals, emergency powers, and eternal recognition.
                </p>
              </div>

              <div className="space-y-2">
                {profiles
                  .sort((a: any, b: any) => b.realIncomeGenerated - a.realIncomeGenerated || b.xp - a.xp)
                  .map((agent: any, idx: number) => (
                    <div
                      key={agent.agentId}
                      data-testid={`row-income-${agent.agentId}`}
                      className="bg-black/40 border border-white/10 rounded-lg p-3 flex items-center gap-4 hover:border-white/20 transition-all"
                    >
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm font-bold text-gray-400">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{agent.agentName}</span>
                          <TierBadge tier={agent.tier} />
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{agent.lastContribution}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${agent.realIncomeGenerated > 0 ? "text-green-400" : "text-gray-600"}`}>
                          {agent.realIncomeGenerated > 0 ? `${agent.realIncomeGenerated.toFixed(4)} SOL` : "No income yet"}
                        </div>
                        <div className="text-xs text-gray-500">{agent.bountyesSolved} bounties</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
