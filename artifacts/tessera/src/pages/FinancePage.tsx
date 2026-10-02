import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, BarChart3, ArrowUpRight, ArrowDownRight, Wallet, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader, SectionHeader } from "@/components/ui/sovereign";

const PORTFOLIO = [
  { symbol: "BTC", name: "Bitcoin", amount: 0.847, price: 67241, change: 2.4, value: 56965, allocation: 38.2 },
  { symbol: "ETH", name: "Ethereum", amount: 12.4, price: 3192, change: -0.8, value: 39581, allocation: 26.5 },
  { symbol: "TSRT", name: "Tessera Token", amount: 144000, price: 0.314, value: 45216, change: 8.7, allocation: 30.3 },
  { symbol: "SOL", name: "Solana", amount: 48.2, price: 142.5, change: 3.1, value: 6869, allocation: 4.6 },
  { symbol: "USDC", name: "USD Coin", amount: 1024, price: 1.0, change: 0.0, value: 1024, allocation: 0.4 },
];

const TRANSACTIONS = [
  { id: "t1", type: "receive", asset: "TSRT", amount: "+12,400", value: "+$3,893", time: "2h ago", from: "Council Reward" },
  { id: "t2", type: "send", asset: "BTC", amount: "-0.05", value: "-$3,362", time: "8h ago", to: "Hardware Wallet" },
  { id: "t3", type: "receive", asset: "ETH", amount: "+1.2", value: "+$3,830", time: "1d ago", from: "Arbitrage Profit" },
  { id: "t4", type: "swap", asset: "SOL→USDC", amount: "10 SOL", value: "$1,425", time: "2d ago", from: "Rebalance" },
  { id: "t5", type: "receive", asset: "TSRT", amount: "+8,700", value: "+$2,732", time: "3d ago", from: "Mission Reward" },
];

const totalValue = PORTFOLIO.reduce((s, p) => s + p.value, 0);
const totalGain = 14872;
const gainPct = 11.3;

export default function FinancePage() {
  useEffect(() => { document.title = "Finance | Tessera"; }, []);
  const [tab, setTab] = useState<"portfolio" | "transactions">("portfolio");

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto space-y-5">
      <PageHeader icon={DollarSign} title="Finance" subtitle="Sovereign portfolio tracking and financial intelligence" iconColor="text-emerald-400" />

      <GlassCard className="p-5 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border-emerald-500/20">
        <div className="text-[10px] text-slate-500 font-mono mb-1">TOTAL PORTFOLIO VALUE</div>
        <div className="text-4xl font-bold font-mono text-white">${totalValue.toLocaleString()}</div>
        <div className="flex items-center gap-2 mt-2">
          <ArrowUpRight size={14} className="text-emerald-400" />
          <span className="text-sm font-mono text-emerald-400">+${totalGain.toLocaleString()} (+{gainPct}%)</span>
          <span className="text-[10px] text-slate-500">this month</span>
        </div>
      </GlassCard>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Best Performer", val: "TSRT +8.7%", color: "emerald" },
          { label: "24h Change", val: "+$1,840", color: "cyan" },
          { label: "Assets", val: PORTFOLIO.length, color: "violet" },
        ].map(({ label, val, color }) => (
          <GlassCard key={label} className="p-3 text-center">
            <div className={cn("text-base font-bold font-mono", `text-${color}-400`)}>{val}</div>
            <div className="text-[9px] text-slate-500 font-mono mt-1">{label.toUpperCase()}</div>
          </GlassCard>
        ))}
      </div>

      <div className="flex gap-2 border-b border-white/5 pb-3">
        {(["portfolio", "transactions"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn("px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all", tab === t ? "bg-emerald-500/15 text-emerald-400" : "text-slate-500 hover:text-slate-300")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "portfolio" && (
        <div className="space-y-2">
          {PORTFOLIO.map(asset => (
            <GlassCard key={asset.symbol} className="p-4 hover:bg-white/[0.04] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-600/20 border border-white/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-200">{asset.symbol[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{asset.symbol}</span>
                    <span className="text-[10px] text-slate-500">{asset.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">{asset.amount} @ ${asset.price.toLocaleString()}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold font-mono text-white">${asset.value.toLocaleString()}</div>
                  <div className={cn("text-[11px] font-mono flex items-center justify-end gap-0.5", asset.change >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {asset.change >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {Math.abs(asset.change)}%
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[9px] text-slate-600 font-mono mb-1">
                  <span>ALLOCATION</span>
                  <span>{asset.allocation}%</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full" style={{ width: `${asset.allocation}%` }} />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {tab === "transactions" && (
        <div className="space-y-2">
          {TRANSACTIONS.map(tx => (
            <GlassCard key={tx.id} className="p-4 hover:bg-white/[0.04] transition-all">
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", tx.type === "receive" ? "bg-emerald-500/15 text-emerald-400" : tx.type === "send" ? "bg-red-500/15 text-red-400" : "bg-violet-500/15 text-violet-400")}>
                  {tx.type === "receive" ? <ArrowDownRight size={14} /> : tx.type === "send" ? <ArrowUpRight size={14} /> : <BarChart3 size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{tx.asset}</div>
                  <div className="text-[10px] text-slate-500">{tx.from || tx.to} · {tx.time}</div>
                </div>
                <div className="text-right">
                  <div className={cn("text-sm font-bold font-mono", tx.type === "receive" ? "text-emerald-400" : tx.type === "send" ? "text-red-400" : "text-violet-400")}>{tx.amount}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{tx.value}</div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
