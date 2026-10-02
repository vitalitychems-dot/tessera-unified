import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Zap, RefreshCw, ArrowUpDown, BarChart3, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, SectionHeader, PageHeader, TabBar } from "@/components/ui/sovereign";

interface Opportunity {
  id: string;
  category: string;
  asset: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  spreadPct: number;
  volume: string;
  status: "hot" | "active" | "fading";
}

const OPPORTUNITIES: Opportunity[] = [
  { id: "a1", category: "Sports", asset: "NFL Chiefs ML", buyExchange: "DraftKings", sellExchange: "FanDuel", buyPrice: -115, sellPrice: +108, spread: 22, spreadPct: 4.7, volume: "$12,400", status: "hot" },
  { id: "a2", category: "Sports", asset: "NBA Lakers O/U 218.5", buyExchange: "BetMGM", sellExchange: "Caesars", buyPrice: -108, sellPrice: +104, spread: 12, spreadPct: 2.3, volume: "$8,750", status: "active" },
  { id: "a3", category: "Crypto", asset: "BTC/USDT", buyExchange: "Binance", sellExchange: "Coinbase", buyPrice: 67241.0, sellPrice: 67318.5, spread: 77.5, spreadPct: 0.12, volume: "$340K", status: "active" },
  { id: "a4", category: "Crypto", asset: "ETH/USDT", buyExchange: "Kraken", sellExchange: "KuCoin", buyPrice: 3192.4, sellPrice: 3201.1, spread: 8.7, spreadPct: 0.27, volume: "$180K", status: "hot" },
  { id: "a5", category: "Sports", asset: "UFC 300 Main Event", buyExchange: "Pinnacle", sellExchange: "BetOnline", buyPrice: +185, sellPrice: +201, spread: 16, spreadPct: 3.2, volume: "$6,200", status: "fading" },
  { id: "a6", category: "Forex", asset: "EUR/USD", buyExchange: "OANDA", sellExchange: "IG Markets", buyPrice: 1.07812, sellPrice: 1.07834, spread: 0.00022, spreadPct: 0.02, volume: "$2.1M", status: "active" },
  { id: "a7", category: "Sports", asset: "MLB Yankees -1.5", buyExchange: "PointsBet", sellExchange: "bet365", buyPrice: +148, sellPrice: +162, spread: 14, spreadPct: 2.8, volume: "$5,100", status: "active" },
];

const STATUS_STYLES: Record<string, { text: string; bg: string; border: string; pulse: boolean }> = {
  hot: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", pulse: true },
  active: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", pulse: false },
  fading: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", pulse: false },
};

const TABS = ["all", "sports", "crypto", "forex"];

export default function ArbitragePage() {
  useEffect(() => { document.title = "Arbitrage | Tessera"; }, []);
  const [tab, setTab] = useState("all");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const filtered = tab === "all" ? OPPORTUNITIES : OPPORTUNITIES.filter(o => o.category.toLowerCase() === tab);

  const refresh = () => setLastRefresh(new Date());

  return (
    <div className="p-4 pb-20 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <PageHeader icon={ArrowUpDown} title="Arbitrage Scanner" subtitle="Real-time cross-exchange spread opportunities" iconColor="text-emerald-400" />
        <button onClick={refresh} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mt-1">
          <RefreshCw size={12} />
          <span className="font-mono">{lastRefresh.toLocaleTimeString()}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Hot Opportunities", val: OPPORTUNITIES.filter(o => o.status === "hot").length, color: "red" },
          { label: "Active", val: OPPORTUNITIES.filter(o => o.status === "active").length, color: "emerald" },
          { label: "Avg Spread", val: "2.1%", color: "cyan" },
          { label: "Est. Daily ROI", val: "4.8%", color: "violet" },
        ].map(({ label, val, color }) => (
          <GlassCard key={label} className="p-3 text-center">
            <div className={cn("text-xl font-bold font-mono", `text-${color}-400`)}>{val}</div>
            <div className="text-[9px] text-slate-500 font-mono mt-1">{label.toUpperCase()}</div>
          </GlassCard>
        ))}
      </div>

      <div className="flex gap-2 border-b border-white/5 pb-3">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all", tab === t ? "bg-emerald-500/15 text-emerald-400" : "text-slate-500 hover:text-slate-300")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(opp => {
          const s = STATUS_STYLES[opp.status];
          return (
            <GlassCard key={opp.id} className={cn("p-4 border", s.border, "hover:bg-white/[0.04] transition-all")}>
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{opp.asset}</span>
                    <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full border font-mono uppercase", s.bg, s.text, s.border, s.pulse && "animate-pulse")}>
                      {opp.status}
                    </span>
                    <span className="text-[9px] text-slate-600 font-mono">{opp.category}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                    <span>BUY: <span className="text-slate-300 font-mono">{opp.buyExchange}</span></span>
                    <span>→</span>
                    <span>SELL: <span className="text-slate-300 font-mono">{opp.sellExchange}</span></span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold font-mono text-emerald-400">+{opp.spreadPct}%</div>
                  <div className="text-[10px] text-slate-500 font-mono">Vol: {opp.volume}</div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-400/80">
        <AlertCircle size={14} className="shrink-0" />
        <span>Arbitrage data is for educational purposes. Always verify prices on exchanges before executing trades.</span>
      </div>
    </div>
  );
}
