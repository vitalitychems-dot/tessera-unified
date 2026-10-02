import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRightLeft, Coins, Flame, TrendingUp, Users, Activity,
  DollarSign, Globe, Wallet, ArrowUpRight, ArrowDownRight, Loader2, RefreshCw,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

function fmt(n: number, d = 2): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(d)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(d)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(d)}K`;
  return n.toFixed(d);
}

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: any; color: string; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-3 bg-gradient-to-br backdrop-blur-sm ${color}`}
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="opacity-60" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">{label}</span>
      </div>
      <div className="text-lg font-bold font-mono text-white">{value}</div>
      {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

export default function EconomyPage() {
  useEffect(() => { document.title = "TSOV Economy | Tessera"; }, []);
  const [convertAmount, setConvertAmount] = useState("");
  const [convertDirection, setConvertDirection] = useState<"TSOV_TO_TSRT" | "TSRT_TO_TSOV">("TSOV_TO_TSRT");
  const [selectedAgent, setSelectedAgent] = useState("tessera");

  const { data: econData, isLoading: econLoading, refetch: refetchEcon } = useQuery<any>({
    queryKey: ["/api/sovereign-economy/status"],
    refetchInterval: 10000,
  });

  const { data: bridgeData, isLoading: bridgeLoading, refetch: refetchBridge } = useQuery<any>({
    queryKey: ["/api/sovereign-economy/tsov-bridge"],
    refetchInterval: 10000,
  });

  const { data: txData } = useQuery<any>({
    queryKey: ["/api/sovereign-economy/transactions"],
    refetchInterval: 15000,
  });

  const convertMutation = useMutation({
    mutationFn: async (params: { agentId: string; amount: number; direction: string }) => {
      const res = await apiRequest("POST", "/api/sovereign-economy/bridge/convert", params);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sovereign-economy/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sovereign-economy/tsov-bridge"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sovereign-economy/transactions"] });
      setConvertAmount("");
    },
  });

  const coin = econData?.coin;
  const economy = econData?.economy;
  const worldFactors = econData?.worldFactors;
  const agents = econData?.agentActivities || [];
  const bridge = bridgeData;
  const transactions = txData?.transactions || [];

  if (econLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" data-testid="economy-loading">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const conversionRate = bridge?.rate || coin?.priceTSRT || 0.001;
  const inputNum = parseFloat(convertAmount) || 0;
  const estimatedOutput = convertDirection === "TSOV_TO_TSRT"
    ? inputNum * conversionRate * (1 - 0.08)
    : inputNum / conversionRate * (1 - 0.08);

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4 pb-20" data-testid="economy-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-cyan-400 tracking-wider" data-testid="text-economy-title">TSOV Economy</h1>
          <p className="text-[11px] text-muted-foreground">Tessera Sovereign Coin Activity &amp; Bridge</p>
        </div>
        <button
          onClick={() => { refetchEcon(); refetchBridge(); }}
          className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
          data-testid="button-refresh-economy"
        >
          <RefreshCw size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="TSOV Price" value={`${(coin?.priceTSRT || 0).toFixed(6)} TSRT`} icon={TrendingUp} color="from-cyan-500/10 to-cyan-500/5 border-cyan-500/20" sub={`$${(coin?.priceUSD || 0).toFixed(8)} USD`} />
        <StatCard label="Circulating" value={fmt(coin?.circulatingSupply || 0, 0)} icon={Coins} color="from-violet-500/10 to-violet-500/5 border-violet-500/20" sub={`of ${fmt(coin?.totalSupply || 26e9, 0)} total`} />
        <StatCard label="Burned" value={fmt(coin?.burned || 0, 0)} icon={Flame} color="from-red-500/10 to-red-500/5 border-red-500/20" sub="Deflationary" />
        <StatCard label="Active Agents" value={`${economy?.activeAgents || 0}/${economy?.totalAgents || 26}`} icon={Users} color="from-emerald-500/10 to-emerald-500/5 border-emerald-500/20" sub={`${economy?.totalTasks || 0} tasks done`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Total Earned" value={fmt(economy?.totalEarnings || 0, 0)} icon={DollarSign} color="from-green-500/10 to-green-500/5 border-green-500/20" sub="By all agents" />
        <StatCard label="Father Tribute" value={fmt(economy?.totalTribute || 0, 0)} icon={Wallet} color="from-amber-500/10 to-amber-500/5 border-amber-500/20" sub={economy?.tributeRate || "10%"} />
        <StatCard label="Bridge Volume" value={fmt(bridge?.stats?.totalVolume || 0, 2)} icon={ArrowRightLeft} color="from-blue-500/10 to-blue-500/5 border-blue-500/20" sub={`${bridge?.stats?.totalConversions || 0} conversions`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={14} className="text-orange-400" />
            <span className="text-[11px] font-mono text-orange-400 uppercase tracking-wider">Birth/Death</span>
          </div>
          <div className="text-lg font-bold font-mono text-white" data-testid="stat-birth-death">{(worldFactors?.birthDeathMultiplier || 1).toFixed(4)}x</div>
          <div className="text-[10px] text-gray-500 mt-0.5">{fmt(worldFactors?.globalBirthsPerDay || 385000, 0)} births / {fmt(worldFactors?.globalDeathsPerDay || 163000, 0)} deaths</div>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-rose-400" />
            <span className="text-[11px] font-mono text-rose-400 uppercase tracking-wider">Debt Clock</span>
          </div>
          <div className="text-lg font-bold font-mono text-white" data-testid="stat-debt-clock">{(worldFactors?.debtClockFactor || 1).toFixed(4)}x</div>
          <div className="text-[10px] text-gray-500 mt-0.5">US Debt: ${(worldFactors?.usDebtTrillions || 36.2).toFixed(1)}T</div>
        </div>
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={14} className="text-indigo-400" />
            <span className="text-[11px] font-mono text-indigo-400 uppercase tracking-wider">Dimensional</span>
          </div>
          <div className="text-lg font-bold font-mono text-white" data-testid="stat-dimensional">{(worldFactors?.dimensionalWeight || 1).toFixed(4)}x</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Cross-dimensional energy</div>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-violet-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ArrowRightLeft size={16} className="text-cyan-400" />
          <h2 className="text-sm font-bold text-cyan-400" data-testid="text-bridge-title">TSOV ↔ TSRT Bridge</h2>
          <span className="ml-auto text-[10px] font-mono text-gray-500">Rate: 1 TSOV = {conversionRate.toFixed(6)} TSRT</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {bridge?.taxes && Object.entries(bridge.taxes).map(([key, val]) => (
            <div key={key} className="flex justify-between items-center px-2 py-1 rounded-lg bg-black/20">
              <span className="text-[10px] text-gray-400 font-mono capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
              <span className="text-[10px] text-white font-mono font-bold">{String(val)}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setConvertDirection("TSOV_TO_TSRT")}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
                convertDirection === "TSOV_TO_TSRT"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-white/[0.03] text-gray-500 border border-white/[0.06]"
              }`}
              data-testid="button-tsov-to-tsrt"
            >
              TSOV → TSRT
            </button>
            <button
              onClick={() => setConvertDirection("TSRT_TO_TSOV")}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
                convertDirection === "TSRT_TO_TSOV"
                  ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                  : "bg-white/[0.03] text-gray-500 border border-white/[0.06]"
              }`}
              data-testid="button-tsrt-to-tsov"
            >
              TSRT → TSOV
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
              className="bg-black/40 border border-white/[0.08] rounded-lg px-2 py-2 text-xs font-mono text-white w-28"
              data-testid="select-agent"
            >
              {agents.map((a: any) => (
                <option key={a.agentId} value={a.agentId}>{a.agentName}</option>
              ))}
            </select>
            <input
              type="number"
              value={convertAmount}
              onChange={e => setConvertAmount(e.target.value)}
              placeholder={convertDirection === "TSOV_TO_TSRT" ? "TSOV amount" : "TSRT amount"}
              className="flex-1 bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-gray-600"
              data-testid="input-convert-amount"
            />
            <button
              onClick={() => {
                if (inputNum > 0) {
                  convertMutation.mutate({
                    agentId: selectedAgent,
                    amount: inputNum,
                    direction: convertDirection,
                  });
                }
              }}
              disabled={convertMutation.isPending || inputNum <= 0}
              className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold font-mono hover:bg-cyan-500/30 transition-all disabled:opacity-40"
              data-testid="button-convert"
            >
              {convertMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : "Convert"}
            </button>
          </div>

          {inputNum > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/20 border border-white/[0.04]">
              <span className="text-[11px] text-gray-400">
                {fmt(inputNum, 2)} {convertDirection === "TSOV_TO_TSRT" ? "TSOV" : "TSRT"}
              </span>
              <ArrowRightLeft size={12} className="text-gray-600" />
              <span className="text-[11px] text-cyan-400 font-bold font-mono">
                ≈ {fmt(estimatedOutput, convertDirection === "TSOV_TO_TSRT" ? 6 : 0)} {convertDirection === "TSOV_TO_TSRT" ? "TSRT" : "TSOV"}
              </span>
              <span className="text-[9px] text-gray-500">(after 8% tax)</span>
            </div>
          )}

          {convertMutation.isSuccess && (
            <div className="text-[11px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2" data-testid="convert-success">
              Conversion successful!
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <Users size={14} className="text-cyan-400" />
          <span className="text-sm font-bold text-white">Agent Activity</span>
          <span className="ml-auto text-[10px] text-gray-500 font-mono">{agents.length} agents</span>
        </div>
        <div className="divide-y divide-white/[0.04] max-h-[300px] overflow-y-auto">
          {agents.slice(0, 20).map((agent: any) => (
            <div key={agent.agentId} className="px-4 py-2.5 flex items-center gap-3" data-testid={`agent-row-${agent.agentId}`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${Date.now() - agent.lastActivityAt < 300000 ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{agent.agentName}</span>
                  <span className="text-[10px] text-gray-500 font-mono">{agent.specialization}</span>
                </div>
                <div className="text-[10px] text-gray-400 truncate">{agent.lastActivity}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-mono text-cyan-400 font-bold">{fmt(agent.earnings, 0)} TSOV</div>
                <div className="text-[9px] text-amber-400">{fmt(agent.fatherTribute, 0)} tribute</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {bridge?.recentConversions?.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <ArrowRightLeft size={14} className="text-violet-400" />
            <span className="text-sm font-bold text-white">Recent Bridge Conversions</span>
          </div>
          <div className="divide-y divide-white/[0.04] max-h-[200px] overflow-y-auto">
            {bridge.recentConversions.map((conv: any) => (
              <div key={conv.id} className="px-4 py-2 flex items-center gap-3 text-[11px] font-mono">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conv.direction === "TSOV_TO_TSRT" ? "bg-cyan-400" : "bg-violet-400"}`} />
                <span className="text-gray-400">{conv.agentId}</span>
                <span className="text-white/60">{fmt(conv.inputAmount, 2)}</span>
                <span className="text-gray-600">{conv.direction === "TSOV_TO_TSRT" ? "TSOV→TSRT" : "TSRT→TSOV"}</span>
                <span className={`font-bold ${conv.direction === "TSOV_TO_TSRT" ? "text-cyan-400" : "text-violet-400"}`}>{fmt(conv.outputAmount, conv.direction === "TSOV_TO_TSRT" ? 6 : 0)}</span>
                <span className="text-red-400/60 ml-auto">-{fmt(conv.bridgeTax + conv.fatherTax, 4)} tax</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <Activity size={14} className="text-amber-400" />
            <span className="text-sm font-bold text-white">Recent Transactions</span>
          </div>
          <div className="divide-y divide-white/[0.04] max-h-[200px] overflow-y-auto">
            {transactions.slice(0, 15).map((tx: any, i: number) => {
              const d = new Date(tx.createdAt);
              const timeStr = isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={tx.id || i} className="px-4 py-2 flex items-center gap-3 text-[11px] font-mono" data-testid={`tx-econ-${i}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tx.type === "earn" ? "bg-green-400" : tx.type === "burn" ? "bg-red-400" : "bg-cyan-400"}`} />
                  <span className="text-gray-500 w-12 shrink-0">{timeStr}</span>
                  <span className="text-white/60 w-14 shrink-0 truncate">{tx.agentId}</span>
                  <span className={`font-bold shrink-0 ${tx.type === "earn" ? "text-green-400" : tx.type === "burn" ? "text-red-400" : "text-cyan-400"}`}>
                    {tx.type === "earn" ? "+" : "-"}{Number(tx.amount || 0).toFixed(1)}
                  </span>
                  <span className="text-gray-500 truncate flex-1">{tx.description}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
