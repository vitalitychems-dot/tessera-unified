import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, RefreshCw, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/ui/sovereign";

interface Asset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  vol: string;
  mcap: string;
  category: string;
}

const ASSETS: Asset[] = [
  { symbol: "BTC", name: "Bitcoin", price: 67241, change24h: 2.4, vol: "$34.2B", mcap: "$1.32T", category: "Crypto" },
  { symbol: "ETH", name: "Ethereum", price: 3192, change24h: -0.8, vol: "$18.1B", mcap: "$384B", category: "Crypto" },
  { symbol: "TSRT", name: "Tessera Token", price: 0.314, change24h: 8.7, vol: "$4.2M", mcap: "$302M", category: "Sovereign" },
  { symbol: "SOL", name: "Solana", price: 142.5, change24h: 3.1, vol: "$5.8B", mcap: "$62B", category: "Crypto" },
  { symbol: "BNB", name: "Binance Coin", price: 581, change24h: 1.2, vol: "$2.1B", mcap: "$85B", category: "Crypto" },
  { symbol: "AAPL", name: "Apple Inc.", price: 213.32, change24h: 0.4, vol: "$62.1B", mcap: "$3.28T", category: "Equity" },
  { symbol: "NVDA", name: "NVIDIA Corp.", price: 887.64, change24h: 2.8, vol: "$41.3B", mcap: "$2.18T", category: "Equity" },
  { symbol: "EUR/USD", name: "Euro / US Dollar", price: 1.07831, change24h: -0.12, vol: "$420B", mcap: "—", category: "Forex" },
  { symbol: "GOLD", name: "Gold Spot", price: 2384.40, change24h: 0.6, vol: "$180B", mcap: "$14.7T", category: "Commodity" },
  { symbol: "OIL", name: "WTI Crude Oil", price: 84.12, change24h: -1.4, vol: "$42B", mcap: "—", category: "Commodity" },
];

const CATEGORIES = ["all", "Crypto", "Sovereign", "Equity", "Forex", "Commodity"];

const SENTIMENT = [
  { label: "Fear & Greed Index", val: 72, status: "Greed", color: "amber" },
  { label: "BTC Dominance", val: 52.4, status: "52.4%", color: "orange" },
  { label: "Market Momentum", val: 68, status: "Bullish", color: "emerald" },
  { label: "TSRT Sovereign Score", val: 94, status: "Strong", color: "violet" },
];

export default function MarketDashboardPage() {
  useEffect(() => { document.title = "Market Dashboard | Tessera"; }, []);
  const [cat, setCat] = useState("all");

  const filtered = cat === "all" ? ASSETS : ASSETS.filter(a => a.category === cat);

  return (
    <div className="p-4 pb-20 max-w-4xl mx-auto space-y-5">
      <PageHeader icon={BarChart3} title="Market Dashboard" subtitle="Live sovereign intelligence across crypto, equity, forex & commodities" iconColor="text-cyan-400" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SENTIMENT.map(({ label, val, status, color }) => (
          <GlassCard key={label} className="p-3">
            <div className={cn("text-sm font-bold font-mono", `text-${color}-400`)}>{status}</div>
            <div className="text-[9px] text-slate-500 font-mono mt-0.5">{label.toUpperCase()}</div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
              <div className={cn("h-full rounded-full", `bg-${color}-500`)} style={{ width: `${val}%` }} />
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap border-b border-white/5 pb-3">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)} className={cn("px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all", cat === c ? "bg-cyan-500/15 text-cyan-400" : "text-slate-500 hover:text-slate-300")}>
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="hidden sm:grid grid-cols-5 gap-2 px-4 text-[9px] text-slate-600 font-mono tracking-wider uppercase">
          <span>Asset</span>
          <span className="text-right">Price</span>
          <span className="text-right">24h Change</span>
          <span className="text-right">Volume</span>
          <span className="text-right">Mkt Cap</span>
        </div>
        {filtered.map(asset => (
          <GlassCard key={asset.symbol} className="p-3 hover:bg-white/[0.04] transition-all sm:grid sm:grid-cols-5 sm:gap-2 sm:items-center flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600/20 to-cyan-600/10 border border-white/10 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-slate-300">{asset.symbol[0]}</span>
              </div>
              <div>
                <div className="text-xs font-bold text-white">{asset.symbol}</div>
                <div className="text-[9px] text-slate-500 hidden sm:block">{asset.name}</div>
              </div>
            </div>
            <div className="text-sm font-bold font-mono text-slate-200 sm:text-right">
              ${asset.price < 10 ? asset.price.toFixed(4) : asset.price.toLocaleString()}
            </div>
            <div className={cn("text-xs font-mono font-bold sm:text-right flex items-center sm:justify-end gap-0.5", asset.change24h >= 0 ? "text-emerald-400" : "text-red-400")}>
              {asset.change24h >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {asset.change24h >= 0 ? "+" : ""}{asset.change24h}%
            </div>
            <div className="text-xs font-mono text-slate-400 sm:text-right">{asset.vol}</div>
            <div className="text-xs font-mono text-slate-500 sm:text-right">{asset.mcap}</div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
