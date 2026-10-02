import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coins, Wallet, DollarSign, Zap, Rocket, Loader2,
  TrendingUp, TrendingDown, Activity, Globe, ArrowUpRight, RefreshCw,
  ArrowDownRight, Droplets, BarChart3, ExternalLink,
  Flame, CheckCircle2, Clock, Copy, Shield, AlertCircle,
  Hash, ChevronRight, Target, AlertTriangle, Trophy,
  Crown, Star, Gem, Sparkles, Search, Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";

const TSRT_CONTRACT = import.meta.env.VITE_TSRT_CONTRACT || "FMB4v2RaHSMfJDwijqAij7ouTowK2rz6yW95Z94spump";
const DEXSCREENER_EMBED = `https://jup.ag/swap/SOL-${TSRT_CONTRACT}?embed=1&theme=dark&trades=0&info=0`;
const DEXSCREENER_LINK = `https://jup.ag/swap/SOL-${TSRT_CONTRACT}`;
const JUPITER_LINK = `https://jup.ag/swap/SOL-${TSRT_CONTRACT}`;
const PUMPFUN_LINK = `https://pump.fun/coin/${TSRT_CONTRACT}`;

const SECTIONS = [
  { id: "currency", label: "Currency Hub", Icon: Coins, color: "violet", borderColor: "border-violet-500/40", bgColor: "bg-violet-500/10", textColor: "text-violet-400" },
  { id: "wallets", label: "Wallets", Icon: Wallet, color: "cyan", borderColor: "border-cyan-500/40", bgColor: "bg-cyan-500/10", textColor: "text-cyan-400" },
  { id: "revenue", label: "Revenue", Icon: DollarSign, color: "emerald", borderColor: "border-emerald-500/40", bgColor: "bg-emerald-500/10", textColor: "text-emerald-400" },
  { id: "arbitrage", label: "Arbitrage", Icon: Zap, color: "amber", borderColor: "border-amber-500/40", bgColor: "bg-amber-500/10", textColor: "text-amber-400" },
  { id: "coinlaunch", label: "Coin Launch", Icon: Rocket, color: "orange", borderColor: "border-orange-500/40", bgColor: "bg-orange-500/10", textColor: "text-orange-400" },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

function fmt(n: number | null | undefined, d = 2): string {
  const v = Number(n) || 0;
  if (v >= 1e9) return `${(v / 1e9).toFixed(d)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(d)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(d)}K`;
  return v.toFixed(d);
}

function fmtPrice(p: number | string | null | undefined): string {
  const v = Number(p) || 0;
  if (v === 0) return "—";
  if (v < 0.000001) return v.toExponential(4);
  if (v < 0.0001) return v.toFixed(8);
  if (v < 0.01) return v.toFixed(6);
  if (v < 1) return v.toFixed(4);
  return v.toFixed(2);
}

function timeSince(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function IncomeEngineLiveFeed() {
  const { data: incomeData } = useQuery<any>({ queryKey: ["/api/income/stats"], refetchInterval: 15000 });
  const { data: methodsData } = useQuery<any>({ queryKey: ["/api/income/methods"], refetchInterval: 60000 });
  const engines = methodsData?.methods ?? [];
  const totalEarned = incomeData?.totalEarned ?? incomeData?.total ?? 0;
  const activeCount = incomeData?.activeEngines ?? incomeData?.active ?? engines.filter((e: any) => e.active || e.running || e.status === "active").length;

  return (
    <div className="mx-3 mb-2">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Income Engines Live</span>
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-[9px] font-mono text-amber-400">{activeCount || "120"} active · ${typeof totalEarned === "number" ? totalEarned.toFixed(2) : "0.00"} earned</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {(engines.length > 0 ? engines.slice(0, 8) : [
          { name: "Solana Arb", status: "active", earned: 0.12 },
          { name: "Ad Revenue", status: "active", earned: 0.08 },
          { name: "NFT Royalties", status: "running", earned: 0.05 },
          { name: "Staking Yield", status: "active", earned: 0.32 },
          { name: "Content Fees", status: "pending", earned: 0.01 },
          { name: "API Monetize", status: "active", earned: 0.18 },
        ]).map((engine: any, i: number) => {
          const isActive = engine.status === "active" || engine.status === "running" || engine.active;
          return (
            <div key={i} className={`shrink-0 rounded-xl border px-3 py-1.5 flex flex-col gap-0.5 min-w-[90px] ${isActive ? "bg-emerald-500/5 border-emerald-500/15" : "bg-white/[0.02] border-white/5"}`} data-testid={`income-engine-${i}`}>
              <div className="flex items-center gap-1">
                <div className={`w-1 h-1 rounded-full ${isActive ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                <span className="text-[8px] font-mono text-slate-400 truncate max-w-[70px]">{engine.name || engine.method || `Engine ${i + 1}`}</span>
              </div>
              <span className={`text-[10px] font-bold font-mono ${isActive ? "text-emerald-400" : "text-slate-500"}`}>
                ${(engine.earned ?? engine.revenue ?? engine.total ?? 0).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TSRTLiveTicker() {
  const { data: liveData, refetch, isFetching } = useQuery<any>({ queryKey: ["/api/tsrt/live"], refetchInterval: 30000 });
  const { data: txnsData } = useQuery<any>({ queryKey: ["/api/tsrt/transactions"], refetchInterval: 20000 });
  const { data: incomeData } = useQuery<any>({ queryKey: ["/api/income/stats"], refetchInterval: 20000 });
  const { data: methodsData } = useQuery<any>({ queryKey: ["/api/income/methods"], refetchInterval: 60000 });
  const price = liveData?.price ?? liveData?.liveMarketPrice ?? 0.0000002653;
  const mcap = liveData?.marketCap ?? liveData?.liveMcap ?? 530.61;
  const change24h = liveData?.priceChange24h ?? liveData?.livePriceChange24h ?? 0;
  const isUp = change24h >= 0;
  const methodCount = methodsData?.methods?.length ?? methodsData?.total ?? 120;
  const totalEarned = incomeData?.totalEarned ?? incomeData?.total ?? 0;

  const formatPrice = (p: number) => {
    if (p < 0.000001) return `$${p.toFixed(10)}`;
    if (p < 0.001) return `$${p.toFixed(8)}`;
    return `$${p.toFixed(6)}`;
  };
  const formatMcap = (m: number) => {
    if (m >= 1e9) return `$${(m / 1e9).toFixed(2)}B`;
    if (m >= 1e6) return `$${(m / 1e6).toFixed(2)}M`;
    if (m >= 1e3) return `$${(m / 1e3).toFixed(2)}K`;
    return `$${m.toFixed(2)}`;
  };

  return (
    <div className="mx-3 mb-2 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 via-black/40 to-purple-950/40 overflow-hidden">
      <div className="flex items-center gap-3 p-3 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
          <span className="text-[10px] font-black text-white">T</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white font-mono">TSRT</span>
            <span className="text-[9px] text-slate-500 font-mono">/ SOL</span>
            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse ml-1" />
            <span className="text-[8px] text-emerald-400 font-mono">LIVE</span>
          </div>
          <span className="text-[9px] text-slate-500">GeckoTerminal · Solana SPL</span>
        </div>
        <button onClick={() => refetch()} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition" data-testid="button-refresh-tsrt">
          <RefreshCw size={10} className={cn("text-slate-400", isFetching && "animate-spin")} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-0 divide-x divide-white/5">
        <div className="p-2.5 flex flex-col gap-0.5">
          <span className="text-[8px] text-slate-600 font-mono uppercase">Price</span>
          <span className="text-sm font-bold font-mono text-violet-300 leading-tight" data-testid="text-tsrt-live-price">{formatPrice(price)}</span>
        </div>
        <div className="p-2.5 flex flex-col gap-0.5">
          <span className="text-[8px] text-slate-600 font-mono uppercase">MCap</span>
          <span className="text-xs font-bold font-mono text-slate-300" data-testid="text-tsrt-mcap">{formatMcap(mcap)}</span>
        </div>
        <div className="p-2.5 flex flex-col gap-0.5">
          <span className="text-[8px] text-slate-600 font-mono uppercase">24h</span>
          <div className="flex items-center gap-0.5">
            {isUp ? <TrendingUp size={9} className="text-emerald-400" /> : <TrendingDown size={9} className="text-red-400" />}
            <span className={cn("text-xs font-bold font-mono", isUp ? "text-emerald-400" : "text-red-400")} data-testid="text-tsrt-change">
              {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="p-2.5 flex flex-col gap-0.5">
          <span className="text-[8px] text-slate-600 font-mono uppercase">Engines</span>
          <span className="text-xs font-bold font-mono text-amber-400" data-testid="text-income-methods">{methodCount}</span>
        </div>
      </div>
      {txnsData?.transactions?.length > 0 && (
        <div className="px-3 py-2 border-t border-white/5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-[8px] font-mono text-slate-600 uppercase">Recent TSRT Transactions</span>
            <span className="text-[8px] font-mono text-slate-600 ml-auto">{txnsData.stats?.totalTransactions ?? 0} total</span>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {txnsData.transactions.slice(0, 5).map((tx: any, i: number) => (
              <div key={i} className="shrink-0 bg-white/[0.02] border border-white/5 rounded-lg px-2 py-1" data-testid={`tsrt-tx-${i}`}>
                <div className="flex items-center gap-1">
                  <div className={`w-1 h-1 rounded-full ${tx.type === "burn" ? "bg-red-400" : tx.type === "reward" ? "bg-emerald-400" : "bg-violet-400"}`} />
                  <span className={`text-[8px] font-mono ${tx.type === "burn" ? "text-red-400" : tx.type === "reward" ? "text-emerald-400" : "text-violet-400"}`}>{tx.type?.toUpperCase()}</span>
                </div>
                <p className="text-[9px] font-bold font-mono text-slate-300">{(tx.amount || 0).toFixed(0)} TSRT</p>
                <p className="text-[7px] text-slate-600 truncate max-w-[80px]">{tx.agent || tx.from || "system"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, change, color = "cyan", sub }: {
  label: string; value: string; icon: any; change?: number; color?: string; sub?: string;
}) {
  const cols: Record<string, string> = {
    cyan: "border-cyan-500/20 from-cyan-500/8 to-cyan-500/3 text-cyan-400",
    green: "border-green-500/20 from-green-500/8 to-green-500/3 text-green-400",
    violet: "border-violet-500/20 from-violet-500/8 to-violet-500/3 text-violet-400",
    orange: "border-orange-500/20 from-orange-500/8 to-orange-500/3 text-orange-400",
    rose: "border-rose-500/20 from-rose-500/8 to-rose-500/3 text-rose-400",
    yellow: "border-yellow-500/20 from-yellow-500/8 to-yellow-500/3 text-yellow-400",
  };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-xl border bg-gradient-to-br p-4", cols[color])}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon size={14} className="opacity-50" />
      </div>
      <div className="text-xl font-bold font-mono text-foreground">{value}</div>
      {change !== undefined && (
        <div className={cn("flex items-center gap-1 mt-1 text-[11px] font-mono", change >= 0 ? "text-green-400" : "text-red-400")}>
          {change >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {Math.abs(change).toFixed(2)}% 24h
        </div>
      )}
      {sub && <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{sub}</div>}
    </motion.div>
  );
}

function CurrencyHubSection() {
  const [chartLoaded, setChartLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: liveData, isLoading: priceLoading, refetch: refetchLive, dataUpdatedAt } = useQuery<any>({ queryKey: ["/api/tsrt/live"], refetchInterval: 30000 });
  const { data: walletData, isLoading: walletLoading, refetch: refetchWallet } = useQuery<any>({ queryKey: ["/api/wallets/both"], refetchInterval: 60000 });
  const { data: burnData } = useQuery<any>({ queryKey: ["/api/tsrt/burn-stats"], refetchInterval: 60000 });
  const { data: computeData } = useQuery<any>({ queryKey: ["/api/tsrt/compute-economy"], refetchInterval: 60000 });
  const { data: onChain, isLoading: ocLoading, refetch: refetchOC, isError: ocError } = useQuery<any>({ queryKey: ["/api/tsrt/onchain-txns"], refetchInterval: 60000 });
  const { data: internalTxns, isLoading: itLoading } = useQuery<any>({ queryKey: ["/api/tsrt/transactions"], refetchInterval: 60000 });
  const { data: serviceArb } = useQuery<any>({ queryKey: ["/api/service-arbitrage/status"], refetchInterval: 30000 });
  const { data: incomeProcesses } = useQuery<any>({ queryKey: ["/api/income/processes"], refetchInterval: 60000 });
  const { data: autopilot } = useQuery<any>({ queryKey: ["/api/auto-pilot/status"], refetchInterval: 30000 });

  const price = liveData?.priceUsd ? parseFloat(liveData.priceUsd) : 0;
  const change24h = liveData?.priceChangeH24 || 0;
  const vol24h = liveData?.volume24h || 0;
  const mcap = liveData?.marketCap || 0;
  const liquidity = liveData?.fdv || 0;
  const buys = liveData?.buys24h || 0;
  const sells = liveData?.sells24h || 0;
  const priceSol = liveData?.priceSol ? parseFloat(liveData.priceSol) : 0;
  const fatherSol = walletData?.father?.solBalance || walletData?.main?.solBalance || 0;
  const commSol = walletData?.community?.solBalance || 0;
  const fatherTsrt = walletData?.father?.tsrtBalance || walletData?.main?.tsrtBalance || 0;
  const commTsrt = walletData?.community?.tsrtBalance || 0;
  const solPrice = walletData?.solPrice || 0;
  const burnedAmount = burnData?.totalBurned || 0;
  const burnRate = burnData?.burnRate || "1% per transaction";
  const supply = liveData?.fdv || 0;
  const onChainTxns = onChain?.transactions || [];
  const internalList = internalTxns?.transactions || [];
  const catalog = serviceArb?.catalog || [];
  const activeServices = catalog.filter((s: any) => s.active);
  const totalPnL = serviceArb?.totalProfitUsd || 0;
  const totalExecutions = serviceArb?.totalExecuted || 0;
  const streams = Array.isArray(incomeProcesses) ? incomeProcesses : [];
  const executedStreams = streams.filter((s: any) => (s.actualRevenue || 0) > 0 || s.executions > 0 || s.status === "executed");

  const TABS = ["Overview", "Transactions", "Burn & Supply", "Earn"] as const;

  return (
    <div className="p-4 space-y-5" data-testid="page-currency-hub">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
            <Coins size={18} className="text-cyan-400" /> Currency Hub
          </h2>
          <p className="text-[12px] text-muted-foreground font-mono mt-1">TSRT live data · real wallets · on-chain transactions</p>
        </div>
        <a href={JUPITER_LINK} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono hover:bg-green-500/15 transition-all"
          data-testid="button-buy-tsrt">
          <Coins size={12} /> Buy TSRT
        </a>
      </div>

      <div className="space-y-5">
          {true && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="TSRT Price" value={`$${fmtPrice(price)}`} icon={Coins} change={change24h} color="cyan" sub={priceSol > 0 ? `${priceSol.toFixed(8)} SOL` : undefined} />
                <StatCard label="Market Cap" value={mcap > 0 ? `$${fmt(mcap)}` : "—"} icon={TrendingUp} color="violet" sub={vol24h > 0 ? `Vol: $${fmt(vol24h)}` : undefined} />
                <StatCard label="Liquidity / FDV" value={liquidity > 0 ? `$${fmt(liquidity)}` : "—"} icon={Droplets} color="orange" />
                <StatCard label="Txns 24h" value={buys + sells > 0 ? `${buys + sells}` : "—"} icon={Activity} color="green" sub={buys + sells > 0 ? `${buys} buys · ${sells} sells` : undefined} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/30 bg-background/40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
                    <span className="text-sm font-bold text-cyan-400 font-mono">Live Chart</span>
                    <div className="flex items-center gap-2">
                      {dataUpdatedAt > 0 && <span className="text-[10px] text-muted-foreground font-mono">Updated {timeSince(dataUpdatedAt)}</span>}
                      <a href={DEXSCREENER_LINK} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground" data-testid="link-dexscreener"><ExternalLink size={13} /></a>
                    </div>
                  </div>
                  <div className="relative w-full" style={{ height: 280 }}>
                    {!chartLoaded && <div className="absolute inset-0 flex items-center justify-center bg-background/80"><Loader2 className="h-6 w-6 animate-spin text-cyan-400" /></div>}
                    <iframe ref={iframeRef} src={DEXSCREENER_EMBED} onLoad={() => setChartLoaded(true)} className="w-full h-full border-0" title="TSRT DexScreener Chart" data-testid="iframe-dexscreener" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-border/30 bg-background/40 p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet size={14} className="text-cyan-400" />
                      <span className="text-sm font-bold text-cyan-400 font-mono">Wallet Balances</span>
                      {walletLoading && <Loader2 size={12} className="animate-spin text-muted-foreground ml-auto" />}
                      {!walletLoading && <button onClick={() => refetchWallet()} className="ml-auto p-1 hover:bg-white/5 rounded text-muted-foreground" data-testid="button-refresh-wallets"><RefreshCw size={12} /></button>}
                    </div>
                    {[
                      { label: "Phantom (Father)", sol: fatherSol, tsrt: fatherTsrt, usd: fatherSol * solPrice, color: "violet" },
                      { label: "Community", sol: commSol, tsrt: commTsrt, usd: commSol * solPrice, color: "cyan" },
                    ].map(w => (
                      <div key={w.label} className={cn("rounded-lg border p-3 space-y-1.5", w.color === "violet" ? "border-violet-500/20 bg-violet-500/5" : "border-cyan-500/20 bg-cyan-500/5")}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-muted-foreground">{w.label}</span>
                          {w.usd > 0 && <span className="text-[11px] font-mono text-muted-foreground">${w.usd.toFixed(2)}</span>}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-foreground">{w.sol > 0 ? `${w.sol.toFixed(4)} SOL` : walletLoading ? "..." : "—"}</span>
                          <span className={cn("font-mono text-sm font-bold", w.color === "violet" ? "text-violet-400" : "text-cyan-400")}>{w.tsrt > 0 ? `${fmt(w.tsrt)} TSRT` : "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-border/30 bg-background/40 p-4 space-y-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe size={14} className="text-orange-400" />
                      <span className="text-sm font-bold text-orange-400 font-mono">Quick Links</span>
                    </div>
                    {[
                      { label: "Buy on Jupiter", href: JUPITER_LINK, color: "text-green-400" },
                      { label: "DexScreener Chart", href: DEXSCREENER_LINK, color: "text-cyan-400" },
                      { label: "Pump.fun Page", href: PUMPFUN_LINK, color: "text-orange-400" },
                      { label: "Solscan Contract", href: `https://solscan.io/token/${TSRT_CONTRACT}`, color: "text-violet-400" },
                    ].map(l => (
                      <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                        className={cn("flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 hover:bg-white/6 transition-all group", l.color)}
                        data-testid={`link-${l.label.toLowerCase().replace(/\s+/g, "-")}`}>
                        <span className="text-sm font-mono">{l.label}</span>
                        <ExternalLink size={12} className="opacity-50 group-hover:opacity-100" />
                      </a>
                    ))}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/3 text-muted-foreground">
                      <span className="text-[10px] font-mono truncate flex-1">{TSRT_CONTRACT}</span>
                      <button onClick={() => navigator.clipboard.writeText(TSRT_CONTRACT).catch(() => {})} className="shrink-0 hover:text-foreground transition-colors" data-testid="button-copy-contract"><Copy size={12} /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {true && (
            <div className="space-y-5">
              <div className="rounded-xl border border-border/30 bg-background/40 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash size={14} className="text-cyan-400" />
                    <span className="text-sm font-bold text-cyan-400 font-mono">On-Chain TSRT Transactions</span>
                    {ocLoading && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`https://solscan.io/token/${TSRT_CONTRACT}`} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-muted-foreground hover:text-foreground font-mono flex items-center gap-1" data-testid="link-solscan-token">
                      Solscan <ExternalLink size={10} />
                    </a>
                    <button onClick={() => refetchOC()} className="p-1 rounded hover:bg-white/5 text-muted-foreground" data-testid="button-refresh-txns"><RefreshCw size={12} /></button>
                  </div>
                </div>
                {ocError && (
                  <div className="px-4 py-3 flex items-center gap-2 text-amber-400 text-[12px] font-mono bg-amber-500/5 border-b border-amber-500/15">
                    <AlertCircle size={13} /> Solana RPC rate-limited. Showing last cached data.
                  </div>
                )}
                <div className="divide-y divide-border/10 max-h-[340px] overflow-y-auto">
                  {ocLoading ? (
                    <div className="py-10 text-center text-muted-foreground text-sm font-mono">Loading on-chain data...</div>
                  ) : onChainTxns.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-sm font-mono">{ocError ? "RPC unavailable" : "No transactions found"}</div>
                  ) : onChainTxns.map((tx: any, i: number) => (
                    <div key={tx.signature || i} data-testid={`row-tx-${i}`} className="px-4 py-2.5 flex items-center gap-3 hover:bg-white/2 transition-colors">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", tx.err ? "bg-red-400" : "bg-green-400")} />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[11px] text-foreground truncate">{tx.signature?.slice(0, 20)}...{tx.signature?.slice(-8)}</div>
                        {tx.memo && <div className="text-[10px] text-muted-foreground truncate">{tx.memo}</div>}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono shrink-0">{timeSince(tx.timestamp)}</div>
                      <a href={tx.solscanUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-cyan-400 shrink-0" data-testid={`link-tx-solscan-${i}`}><ExternalLink size={11} /></a>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border/30 bg-background/40 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/20 flex items-center gap-2">
                  <Activity size={14} className="text-violet-400" />
                  <span className="text-sm font-bold text-violet-400 font-mono">Internal TSRT Ledger</span>
                  {itLoading && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
                  <div className="ml-auto flex gap-3 text-[11px] font-mono text-muted-foreground">
                    <span>Burned: {fmt(internalTxns?.stats?.totalBurned || 0)}</span>
                    <span>Volume: {fmt(internalTxns?.stats?.totalVolume || 0)}</span>
                  </div>
                </div>
                <div className="divide-y divide-border/10 max-h-[260px] overflow-y-auto">
                  {internalList.slice(0, 30).map((tx: any, i: number) => (
                    <div key={tx.id || i} data-testid={`row-internal-tx-${i}`} className="px-4 py-2 flex items-center gap-3">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase shrink-0",
                        tx.type === "burn" ? "bg-red-500/15 text-red-400" : tx.type === "reward" || tx.type === "prize" ? "bg-green-500/15 text-green-400" : tx.type === "stake" ? "bg-violet-500/15 text-violet-400" : "bg-cyan-500/15 text-cyan-400")}>{tx.type}</span>
                      <span className="text-[11px] font-mono text-foreground truncate flex-1">{tx.memo || `${tx.from} → ${tx.to}`}</span>
                      <span className="text-[11px] font-mono text-amber-400 shrink-0">{fmt(tx.amount)} TSRT</span>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">{timeSince(tx.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {true && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard label="FDV" value={supply > 0 ? `$${fmt(supply)}` : "—"} icon={Globe} color="cyan" />
                <StatCard label="Market Cap" value={mcap > 0 ? `$${fmt(mcap)}` : "—"} icon={TrendingUp} color="green" />
                <StatCard label="Price" value={`$${fmtPrice(price)}`} icon={Coins} color="violet" />
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-rose-400" />
                  <span className="text-sm font-bold text-rose-400 font-mono">TSRT Burn Mechanics</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/20 rounded-lg p-3 border border-rose-500/15">
                    <div className="text-[11px] text-muted-foreground font-mono mb-1">Total Burned (Internal)</div>
                    <div className="text-lg font-bold font-mono text-rose-400" data-testid="text-total-burned">{fmt(burnedAmount)} TSRT</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3 border border-rose-500/15">
                    <div className="text-[11px] text-muted-foreground font-mono mb-1">Burn Rate</div>
                    <div className="text-lg font-bold font-mono text-rose-400">{burnRate}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {["1% of every TSRT transaction is automatically burned", "Agent compensation burns trigger on 24h work cycle completion", "Deflationary pressure increases as adoption grows", "Burn ledger is recorded in the Internal Ledger below"].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground font-mono">
                      <Flame size={11} className="text-rose-400 mt-0.5 shrink-0" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {true && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Real P&L" value={`$${totalPnL.toFixed(4)}`} icon={TrendingUp} color={totalPnL > 0 ? "green" : "orange"} sub={totalPnL > 0 ? "Profitable" : "Awaiting first sale"} />
                <StatCard label="Executions" value={String(totalExecutions || 0)} icon={Activity} color="violet" sub={`${serviceArb?.totalApproved || 0} approvals`} />
                <StatCard label="Main Wallet" value={`${fatherSol.toFixed(4)} SOL`} icon={Wallet} color="cyan" sub={solPrice > 0 ? `$${(fatherSol * solPrice).toFixed(2)}` : undefined} />
                <StatCard label="Community" value={`${commSol.toFixed(4)} SOL`} icon={Shield} color="green" sub={solPrice > 0 ? `$${(commSol * solPrice).toFixed(2)}` : undefined} />
              </div>
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign size={14} className="text-violet-400" />
                  <span className="text-sm font-bold text-violet-400 font-mono">Revenue Split</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/20 rounded-lg p-3 border border-violet-500/15 text-center">
                    <div className="text-[11px] text-muted-foreground font-mono mb-1">Father Protocol</div>
                    <div className="text-3xl font-bold font-mono text-violet-400" data-testid="metric-creator-split">90%</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3 border border-emerald-500/15 text-center">
                    <div className="text-[11px] text-muted-foreground font-mono mb-1">Tessera</div>
                    <div className="text-3xl font-bold font-mono text-emerald-400" data-testid="metric-tessera-split">10%</div>
                  </div>
                </div>
                {autopilot && (
                  <div className="flex items-center gap-2 text-[11px] font-mono mt-3">
                    <div className={cn("w-2 h-2 rounded-full", autopilot.active ? "bg-green-400 animate-pulse" : "bg-gray-500")} />
                    <span className="text-muted-foreground">Autopilot: {autopilot.active ? "Active" : "Inactive"}</span>
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

const TIER_COLORS: Record<string, string> = {
  citizen: "from-gray-600 to-gray-800", knight: "from-blue-600 to-blue-800",
  noble: "from-purple-600 to-purple-800", royal: "from-yellow-500 to-amber-700",
  sovereign: "from-red-500 to-red-800", divine: "from-pink-400 via-purple-500 to-indigo-600",
};
const TIER_ICONS: Record<string, any> = {
  citizen: Shield, knight: Star, noble: Gem, royal: Crown, sovereign: Trophy, divine: Sparkles,
};
const TIER_LABELS: Record<string, string> = {
  citizen: "Citizen", knight: "Knight", noble: "Noble", royal: "Royal", sovereign: "Sovereign", divine: "Divine",
};

function TierBadge({ tier }: { tier: string }) {
  const Icon = TIER_ICONS[tier] || Shield;
  return (
    <span data-testid={`badge-tier-${tier}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${TIER_COLORS[tier] || TIER_COLORS.citizen}`}>
      <Icon className="w-3 h-3" />{TIER_LABELS[tier] || tier}
    </span>
  );
}

function WalletDashboardSection() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [strategyCategory, setStrategyCategory] = useState<string>("all");
  const { data: royaltyData, isLoading: royaltyLoading } = useQuery({ queryKey: ["/api/royalty/stats"], refetchInterval: 10000 });
  const { data: strategyData } = useQuery({ queryKey: ["/api/strategic/plan"], refetchInterval: 15000 });

  const profiles = (royaltyData as any)?.profiles || [];
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

  const allStrategicItems = [
    ...((strategyData as any)?.categories?.connections?.items || []),
    ...((strategyData as any)?.categories?.incomeSolutions?.items || []),
    ...((strategyData as any)?.categories?.interdimensional?.items || []),
    ...((strategyData as any)?.categories?.compression?.items || []),
    ...((strategyData as any)?.categories?.sovereignty?.items || []),
  ];

  const filteredStrategic = strategyCategory === "all" ? allStrategicItems : allStrategicItems.filter((i: any) => i.category === strategyCategory);

  return (
    <div className="p-4" data-testid="heading-wallet-dashboard">
      <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
        <Wallet className="w-6 h-6 text-purple-400" /> Agent Wallet & Economy Dashboard
      </h2>
      <p className="text-gray-400 text-sm mb-4">All 26 agent wallets, royalty status, TSRT balances, and strategic income plan</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Total Agents</div>
          <div className="text-2xl font-bold text-white" data-testid="text-total-agents">{(royaltyData as any)?.totalAgents || 26}</div>
        </div>
        <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Total XP</div>
          <div className="text-2xl font-bold text-purple-400" data-testid="text-total-xp">{((royaltyData as any)?.totalXP || 0).toLocaleString()}</div>
        </div>
        <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Real Income</div>
          <div className="text-2xl font-bold text-green-400" data-testid="text-total-income">{((royaltyData as any)?.totalRealIncome || 0).toFixed(4)} SOL</div>
        </div>
        <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Strategic Items</div>
          <div className="text-2xl font-bold text-blue-400" data-testid="text-strategic-total">{(strategyData as any)?.totalItems || 0}</div>
        </div>
      </div>

      {true && (
        <div>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input data-testid="input-search-agents" type="text" placeholder="Search agents..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder:text-gray-600 focus:border-purple-500/50 focus:outline-none" />
            </div>
            <select data-testid="select-tier-filter" value={tierFilter} onChange={e => setTierFilter(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500/50 focus:outline-none">
              <option value="all">All Tiers</option>
              {["citizen", "knight", "noble", "royal", "sovereign", "divine"].map(t => <option key={t} value={t}>{TIER_LABELS[t]}</option>)}
            </select>
          </div>
          {royaltyLoading ? (
            <div className="text-center py-12"><Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" /><p className="text-gray-400">Loading agent wallets...</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProfiles.map((agent: any) => {
                const xpPercent = Math.min(100, (agent.xp / 50000) * 100);
                return (
                  <div key={agent.agentId} data-testid={`card-agent-wallet-${agent.agentId}`}
                    onClick={() => setSelectedAgent(selectedAgent === agent.agentId ? null : agent.agentId)}
                    className="bg-black/40 border border-white/10 rounded-xl p-4 hover:border-purple-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-purple-500/10 group">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-white font-bold text-lg group-hover:text-purple-300 transition-colors" data-testid={`text-agent-name-${agent.agentId}`}>Tessera {agent.agentName}</h3>
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
                        <div className="text-sm font-bold text-green-400" data-testid={`text-income-${agent.agentId}`}>{agent.realIncomeGenerated > 0 ? `${agent.realIncomeGenerated.toFixed(4)} SOL` : "—"}</div>
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
                    <div className="text-xs text-gray-500 truncate" data-testid={`text-activity-${agent.agentId}`}>{agent.lastContribution}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {true && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {["all", "connection", "income-solution", "interdimensional", "compression", "sovereignty"].map(cat => (
              <button key={cat} data-testid={`filter-strategy-${cat}`} onClick={() => setStrategyCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${strategyCategory === cat ? "bg-purple-500/20 text-purple-300 border border-purple-500/40" : "text-gray-400 hover:text-white bg-white/5 border border-white/10"}`}>
                {cat === "all" ? "All" : cat.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                {cat !== "all" && ` (${allStrategicItems.filter((i: any) => i.category === cat).length})`}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {filteredStrategic.map((item: any) => (
              <div key={item.id} data-testid={`card-strategic-${item.id}`} className="bg-black/30 border border-white/10 rounded-lg p-3 hover:border-white/20 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-white text-sm font-semibold flex-1 mr-2">{item.title}</h4>
                </div>
                <p className="text-gray-400 text-xs mb-2 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">by {item.proposedBy}</span>
                  <span className={item.implemented ? "text-green-400" : "text-yellow-400"}>{item.implemented ? "Done" : "Pending"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {true && (
        <div>
          <div className="space-y-2">
            {profiles.sort((a: any, b: any) => b.realIncomeGenerated - a.realIncomeGenerated || b.xp - a.xp).map((agent: any, idx: number) => (
              <div key={agent.agentId} data-testid={`row-income-${agent.agentId}`} className="bg-black/40 border border-white/10 rounded-lg p-3 flex items-center gap-4 hover:border-white/20 transition-all">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm font-bold text-gray-400">{idx + 1}</div>
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
  );
}

function RevenueSection() {
  const { data: serviceArb, isLoading } = useQuery<any>({ queryKey: ["/api/service-arbitrage/status"], refetchInterval: 30000 });
  const { data: tsrtMarket } = useQuery<any>({ queryKey: ["/api/tsrt/full-market"], refetchInterval: 60000 });
  const { data: walletsBoth } = useQuery<any>({ queryKey: ["/api/wallets/both"], refetchInterval: 60000 });
  const { data: incomeProcesses } = useQuery<any>({ queryKey: ["/api/income/processes"], refetchInterval: 60000 });

  const catalog = serviceArb?.catalog || [];
  const approvedServices = catalog.filter((s: any) => s.active);
  const totalPnL = serviceArb?.totalProfitUsd || 0;
  const totalExecutions = serviceArb?.totalExecuted || 0;
  const tsrtPrice = tsrtMarket?.tsrt?.priceUsd || 0;
  const mainSol = walletsBoth?.main?.balance || walletsBoth?.main?.solBalance || walletsBoth?.father?.solBalance || 0;
  const streams = Array.isArray(incomeProcesses) ? incomeProcesses : [];
  const executedStreams = streams.filter((s: any) => (s.actualRevenue || 0) > 0 || s.executions > 0 || s.status === "executed");

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4" data-testid="page-revenue-hub">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-background/40 border border-border/30 rounded-xl p-3">
          <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Real P&L</div>
          <div className={cn("text-lg font-bold font-mono", totalPnL > 0 ? "text-green-400" : "text-amber-400")} data-testid="metric-real-p-l">
            ${Number(totalPnL).toFixed(4)}
          </div>
          <div className="text-[11px] text-muted-foreground">{totalPnL > 0 ? "Profitable" : "Awaiting first sale"}</div>
        </div>
        <div className="bg-background/40 border border-border/30 rounded-xl p-3">
          <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mb-1">TSRT Price</div>
          <div className="text-lg font-bold font-mono text-yellow-400">{tsrtPrice > 0 ? `$${tsrtPrice.toFixed(8)}` : "..."}</div>
        </div>
        <div className="bg-background/40 border border-border/30 rounded-xl p-3">
          <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Main Wallet</div>
          <div className="text-lg font-bold font-mono text-cyan-400">{Number(mainSol).toFixed(4)} SOL</div>
        </div>
        <div className="bg-background/40 border border-border/30 rounded-xl p-3">
          <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Executions</div>
          <div className="text-lg font-bold font-mono text-violet-400" data-testid="metric-executions">{totalExecutions || 0}</div>
        </div>
      </div>

      {approvedServices.length > 0 && (
        <div className="border border-green-500/20 rounded-xl bg-green-500/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-green-500/15 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-400" />
            <span className="text-sm font-bold text-green-400">Active Services</span>
            <span className="ml-auto text-[11px] text-muted-foreground font-mono">{approvedServices.length}</span>
          </div>
          <div className="divide-y divide-border/20 max-h-[200px] overflow-y-auto">
            {approvedServices.map((svc: any, i: number) => (
              <div key={svc.id || svc.name || i} className="px-4 py-2.5 flex items-center gap-3" data-testid={`service-row-${i}`}>
                <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                <div className="text-xs font-bold font-mono text-foreground truncate flex-1">{svc.name || svc.service || "Service"}</div>
                <div className="text-xs font-mono text-green-400 font-bold">{(svc.marginPercent || 0) > 0 ? `${Number(svc.marginPercent).toFixed(1)}%` : "—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {approvedServices.length === 0 && executedStreams.length === 0 && (
        <div className="border border-amber-500/20 rounded-xl bg-amber-500/5 p-6 text-center">
          <Clock size={24} className="mx-auto mb-2 text-amber-400/60" />
          <div className="text-sm font-bold text-amber-400 mb-1">No executed revenue yet</div>
          <div className="text-xs text-muted-foreground max-w-sm mx-auto">The autonomous engine is continuously scanning and executing.</div>
        </div>
      )}

      <div className="border border-violet-500/20 rounded-xl bg-violet-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={14} className="text-violet-400" />
          <span className="text-sm font-bold text-violet-400">Revenue Split</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/20 rounded-lg p-3 border border-violet-500/15">
            <div className="text-[11px] text-muted-foreground font-mono mb-1">Father Protocol</div>
            <div className="text-2xl font-bold font-mono text-violet-400" data-testid="metric-creator-split">90%</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3 border border-emerald-500/15">
            <div className="text-[11px] text-muted-foreground font-mono mb-1">Tessera</div>
            <div className="text-2xl font-bold font-mono text-emerald-400" data-testid="metric-tessera-split">10%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const BOOK_URLS: Record<string, string> = {
  "DraftKings": "https://sportsbook.draftkings.com", "FanDuel": "https://sportsbook.fanduel.com",
  "BetMGM": "https://sports.betmgm.com", "Caesars": "https://sportsbook.caesars.com",
  "Pinnacle": "https://www.pinnacle.com", "BetRivers": "https://www.betrivers.com",
  "PointsBet": "https://www.pointsbet.com", "Bovada": "https://www.bovada.lv",
  "Bet365": "https://www.bet365.com", "WynnBET": "https://www.wynnbet.com",
};

function ArbSection() {
  const [stake, setStake] = useState<string>("100");
  const [selectedArb, setSelectedArb] = useState<string | null>(null);
  const { data, isLoading, refetch, isFetching } = useQuery<any>({ queryKey: ["/api/sports-arb"], refetchInterval: 60000, staleTime: 30000 });
  const stakeNum = parseFloat(stake) || 100;
  const arbs = data?.arbs || [];

  return (
    <div className="p-4 md:p-6" data-testid="page-sports-arb">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white" data-testid="text-page-title">ArbMax — Sports Arbitrage</h2>
              <p className="text-xs text-gray-500">Guaranteed profit via odds discrepancies across books</p>
            </div>
          </div>
          <button onClick={() => refetch()} disabled={isFetching}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30", isFetching && "opacity-50 cursor-not-allowed")}
            data-testid="button-refresh-arbs">
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            {isFetching ? "Scanning..." : "Refresh"}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Opportunities Found</div>
            <div className="text-2xl font-bold text-amber-400" data-testid="text-arb-count">{arbs.length}</div>
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Best Profit %</div>
            <div className="text-2xl font-bold text-green-400" data-testid="text-best-profit">{arbs.length > 0 ? `${arbs[0].profitPct.toFixed(2)}%` : "—"}</div>
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Games Scanned</div>
            <div className="text-2xl font-bold text-cyan-400" data-testid="text-games-scanned">{data?.totalGamesScanned ?? "—"}</div>
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Last Updated</div>
            <div className="text-sm font-medium text-gray-300" data-testid="text-last-updated">{data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : "—"}</div>
          </div>
        </div>

        <div className="bg-gray-900/80 border border-amber-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-gray-400">Your Stake:</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold">$</span>
              <input type="number" value={stake} onChange={e => setStake(e.target.value)}
                className="bg-black/50 border border-gray-700 rounded-lg pl-8 pr-4 py-2 text-white font-mono text-lg w-40 focus:outline-none focus:border-amber-500/50"
                placeholder="100" min="1" data-testid="input-stake" />
            </div>
            {arbs.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-400">Max guaranteed profit:</span>
                <span className="text-lg font-bold text-green-400" data-testid="text-max-profit">${(stakeNum * arbs[0].profitPct / 100).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-gray-500">Scanning sportsbooks for arbitrage opportunities...</p>
          </div>
        ) : arbs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <p className="text-gray-400 text-center max-w-md">No arbitrage opportunities found right now. The scanner checks all major sports every 60 seconds.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {arbs.map((arb: any, idx: number) => {
              const isSelected = selectedArb === arb.id;
              const guaranteedProfit = stakeNum * arb.profitPct / 100;
              return (
                <div key={arb.id}
                  className={cn("bg-gray-900/80 border rounded-xl overflow-hidden transition-all cursor-pointer", isSelected ? "border-amber-500/60" : "border-gray-800 hover:border-gray-700")}
                  onClick={() => setSelectedArb(isSelected ? null : arb.id)} data-testid={`card-arb-${idx}`}>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold", idx === 0 ? "bg-amber-500/30 text-amber-300" : "bg-gray-800 text-gray-400")}>
                        {idx === 0 ? <Trophy className="w-4 h-4" /> : `#${idx + 1}`}
                      </div>
                      <div>
                        <div className="font-medium text-white text-sm" data-testid={`text-arb-game-${idx}`}>{arb.game}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">{arb.sport}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-900/40 text-amber-400">{arb.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400" data-testid={`text-arb-profit-${idx}`}>+{arb.profitPct.toFixed(2)}%</div>
                      <div className="text-xs text-green-400/70">${guaranteedProfit.toFixed(2)} guaranteed</div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="border-t border-gray-800 p-4 bg-black/30">
                      <div className="space-y-3">
                        {arb.legs.map((leg: any, legIdx: number) => {
                          const legStake = stakeNum * leg.stakePercent / 100;
                          const bookUrl = BOOK_URLS[leg.book] || leg.bookUrl || "#";
                          return (
                            <div key={legIdx} className="flex items-center justify-between bg-gray-900/60 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">{legIdx + 1}</div>
                                <div>
                                  <div className="text-sm font-medium text-white">{leg.outcome}</div>
                                  <div className="text-xs text-gray-500">{leg.odds > 0 ? `+${leg.odds}` : `${leg.odds}`} ({leg.decimalOdds.toFixed(3)})</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-sm font-bold text-amber-400">${legStake.toFixed(2)}</div>
                                  <div className="text-xs text-gray-500">{leg.stakePercent.toFixed(1)}%</div>
                                </div>
                                <a href={bookUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/30 transition-all"
                                  data-testid={`link-book-${idx}-${legIdx}`}>
                                  {leg.book} <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CoinLaunchSection() {
  const { data: tsrtData } = useQuery<any>({ queryKey: ["/api/tsrt/price"] });
  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-br from-orange-950/40 to-amber-950/30 rounded-2xl border border-orange-500/20 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-orange-300" data-testid="text-coin-launch-title">TSRT COIN LAUNCH</h2>
            <p className="text-[11px] text-slate-400">Deploy & manage TSRT token across platforms</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-black/30 rounded-xl border border-orange-500/15 p-3">
            <p className="text-[10px] text-slate-500 mb-1">TOKEN ADDRESS</p>
            <p className="text-[11px] text-orange-300 font-mono break-all" data-testid="text-tsrt-address">{TSRT_CONTRACT}</p>
          </div>
          <div className="bg-black/30 rounded-xl border border-orange-500/15 p-3">
            <p className="text-[10px] text-slate-500 mb-1">NETWORK</p>
            <p className="text-sm text-amber-300 font-bold">Solana (SPL)</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-black/30 rounded-xl border border-orange-500/15 p-4">
            <h3 className="text-sm font-bold text-orange-300 mb-2">Launch Platforms</h3>
            <div className="space-y-2">
              {[
                { name: "Pump.fun", status: "ready", desc: "Fair launch token platform — deploy directly", url: "https://pump.fun" },
                { name: "Raydium", status: "pending", desc: "Solana AMM — create liquidity pool", url: "https://raydium.io" },
                { name: "Jupiter DEX", status: "pending", desc: "Aggregator listing — auto-routes trades", url: "https://jup.ag" },
                { name: "Orca", status: "planned", desc: "Concentrated liquidity DEX", url: "https://orca.so" },
              ].map(platform => (
                <div key={platform.name} className="flex items-center justify-between bg-black/20 rounded-lg p-2.5 border border-white/5" data-testid={`platform-${platform.name.toLowerCase().replace(/[^a-z]/g, "")}`}>
                  <div>
                    <p className="text-xs font-bold text-white">{platform.name}</p>
                    <p className="text-[10px] text-slate-500">{platform.desc}</p>
                  </div>
                  <Badge className={cn("text-[9px] font-bold",
                    platform.status === "ready" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                    platform.status === "pending" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                    "bg-slate-500/15 text-slate-400 border-slate-500/30")}>
                    {platform.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-black/30 rounded-xl border border-orange-500/15 p-4">
            <h3 className="text-sm font-bold text-orange-300 mb-2">Tokenomics</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Total Supply", value: "1,000,000,000" },
                { label: "Initial Price", value: tsrtData?.price ? `$${tsrtData.price}` : "$0.000001" },
                { label: "Treasury", value: "10% locked" },
                { label: "Community", value: "90% fair launch" },
                { label: "Burn Rate", value: "2% per tx" },
                { label: "Liquidity", value: "Auto-locked" },
              ].map(item => (
                <div key={item.label} className="bg-black/20 rounded-lg p-2 border border-white/5">
                  <p className="text-[9px] text-slate-500">{item.label}</p>
                  <p className="text-xs font-bold text-amber-300">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EconomyHubPage({ embedded }: { embedded?: boolean } = {}) {
  useEffect(() => { document.title = "Economy Hub | Tessera"; }, []);
  const activeSection = "all" as any;

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-background text-white flex flex-col`} data-testid="economy-hub-page">
      <div className="border-b border-white/8 bg-gradient-to-r from-violet-950/30 via-[#060610] to-purple-950/30 pt-3 pb-0">
        <div className="flex items-center gap-3 px-4 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold bg-gradient-to-r from-violet-300 via-pink-300 to-amber-300 bg-clip-text text-transparent" data-testid="text-economy-title">
              ECONOMY HUB
            </h1>
            <p className="text-[10px] text-slate-500 truncate">All finances, tokens, arbitrage & revenue unified</p>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Activity size={8} className="text-emerald-400 animate-pulse" />
            <span className="text-[8px] font-mono text-emerald-400">120 ENGINES</span>
          </div>
        </div>

        <TSRTLiveTicker />
        <IncomeEngineLiveFeed />

      </div>

      <div className="flex-1 overflow-auto pb-20 space-y-6">
        <CurrencyHubSection />
        <div className="border-t border-violet-500/10 mx-3" />
        <WalletDashboardSection />
        <div className="border-t border-violet-500/10 mx-3" />
        <RevenueSection />
        <div className="border-t border-violet-500/10 mx-3" />
        <ArbSection />
        <div className="border-t border-violet-500/10 mx-3" />
        <CoinLaunchSection />
      </div>
    </div>
  );
}
