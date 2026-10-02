import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coins, Wallet, Flame, TrendingUp, Activity, ExternalLink, RefreshCw,
  ArrowUpRight, ArrowDownRight, DollarSign, Droplets, BarChart3, Zap,
  Globe, CheckCircle2, Clock, Copy, Shield, Loader2, AlertCircle,
  Hash, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TSRT_CONTRACT = import.meta.env.VITE_TSRT_CONTRACT || "FMB4v2RaHSMfJDwijqAij7ouTowK2rz6yW95Z94spump";
const DEXSCREENER_EMBED = `https://jup.ag/swap/SOL-${TSRT_CONTRACT}?embed=1&theme=dark&trades=0&info=0`;
const DEXSCREENER_LINK = `https://jup.ag/swap/SOL-${TSRT_CONTRACT}`;
const JUPITER_LINK = `https://jup.ag/swap/SOL-${TSRT_CONTRACT}`;
const PUMPFUN_LINK = `https://pump.fun/coin/${TSRT_CONTRACT}`;

const TABS = ["Overview", "Transactions", "Burn & Supply", "Earn"] as const;
type Tab = typeof TABS[number];

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
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
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

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-background/50 rounded-xl border border-border/30 w-fit">
      {false && TABS.map(t => (
        <button key={t} onClick={() => onChange(t)} data-testid={`tab-${t.toLowerCase().replace(/\s+/g, "-")}`}
          className={cn("px-4 py-1.5 rounded-lg text-sm font-mono transition-all", active === t
            ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5")}>
          {t}
        </button>
      ))}
    </div>
  );
}

function OverviewTab() {
  const [chartLoaded, setChartLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: liveData, isLoading: priceLoading, refetch: refetchLive, dataUpdatedAt } = useQuery<any>({
    queryKey: ["/api/tsrt/live"],
    refetchInterval: 30000,
  });
  const { data: walletData, isLoading: walletLoading, refetch: refetchWallet } = useQuery<any>({
    queryKey: ["/api/wallets/both"],
    refetchInterval: 60000,
  });

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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="TSRT Price" value={`$${fmtPrice(price)}`} icon={Coins} change={change24h} color="cyan"
          sub={priceSol > 0 ? `${priceSol.toFixed(8)} SOL` : undefined} />
        <StatCard label="Market Cap" value={mcap > 0 ? `$${fmt(mcap)}` : "—"} icon={TrendingUp} color="violet"
          sub={vol24h > 0 ? `Vol: $${fmt(vol24h)}` : undefined} />
        <StatCard label="Liquidity / FDV" value={liquidity > 0 ? `$${fmt(liquidity)}` : "—"} icon={Droplets} color="orange" />
        <StatCard label="Txns 24h" value={buys + sells > 0 ? `${buys + sells}` : "—"} icon={Activity} color="green"
          sub={buys + sells > 0 ? `${buys} buys · ${sells} sells` : undefined} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/30 bg-background/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
            <span className="text-sm font-bold text-cyan-400 font-mono">Live Chart</span>
            <div className="flex items-center gap-2">
              {dataUpdatedAt > 0 && <span className="text-[10px] text-muted-foreground font-mono">Updated {timeSince(dataUpdatedAt)}</span>}
              <a href={DEXSCREENER_LINK} target="_blank" rel="noopener noreferrer"
                className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground" data-testid="link-dexscreener">
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
          <div className="relative w-full" style={{ height: 280 }}>
            {!chartLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={DEXSCREENER_EMBED}
              onLoad={() => setChartLoaded(true)}
              className="w-full h-full border-0"
              title="TSRT DexScreener Chart"
              data-testid="iframe-dexscreener"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/30 bg-background/40 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={14} className="text-cyan-400" />
              <span className="text-sm font-bold text-cyan-400 font-mono">Wallet Balances</span>
              {(walletLoading) && <Loader2 size={12} className="animate-spin text-muted-foreground ml-auto" />}
              {!walletLoading && <button onClick={() => refetchWallet()} className="ml-auto p-1 hover:bg-white/5 rounded text-muted-foreground" data-testid="button-refresh-wallets"><RefreshCw size={12} /></button>}
            </div>
            {[
              { label: "Phantom (Father)", sol: fatherSol, tsrt: fatherTsrt, usd: fatherSol * solPrice, color: "violet" },
              { label: "Community", sol: commSol, tsrt: commTsrt, usd: commSol * solPrice, color: "cyan" },
            ].map(w => (
              <div key={w.label} className={cn("rounded-lg border p-3 space-y-1.5",
                w.color === "violet" ? "border-violet-500/20 bg-violet-500/5" : "border-cyan-500/20 bg-cyan-500/5")}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground">{w.label}</span>
                  {w.usd > 0 && <span className="text-[11px] font-mono text-muted-foreground">${w.usd.toFixed(2)}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-foreground">{w.sol > 0 ? `${w.sol.toFixed(4)} SOL` : walletLoading ? "..." : "—"}</span>
                  <span className={cn("font-mono text-sm font-bold", w.color === "violet" ? "text-violet-400" : "text-cyan-400")}>
                    {w.tsrt > 0 ? `${fmt(w.tsrt)} TSRT` : "—"}
                  </span>
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
              <button onClick={() => handleCopy(TSRT_CONTRACT)} className="shrink-0 hover:text-foreground transition-colors" data-testid="button-copy-contract">
                <Copy size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionsTab() {
  const { data: onChain, isLoading: ocLoading, refetch: refetchOC, isError: ocError } = useQuery<any>({
    queryKey: ["/api/tsrt/onchain-txns"],
    refetchInterval: 60000,
  });
  const { data: internalTxns, isLoading: itLoading } = useQuery<any>({
    queryKey: ["/api/tsrt/transactions"],
    refetchInterval: 60000,
  });

  const onChainTxns = onChain?.transactions || [];
  const internalList = internalTxns?.transactions || [];

  return (
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
            <button onClick={() => refetchOC()} className="p-1 rounded hover:bg-white/5 text-muted-foreground" data-testid="button-refresh-txns">
              <RefreshCw size={12} />
            </button>
          </div>
        </div>
        {ocError && (
          <div className="px-4 py-3 flex items-center gap-2 text-amber-400 text-[12px] font-mono bg-amber-500/5 border-b border-amber-500/15">
            <AlertCircle size={13} />
            Solana RPC rate-limited. Showing last cached data.
          </div>
        )}
        <div className="divide-y divide-border/10 max-h-[340px] overflow-y-auto">
          {ocLoading ? (
            <div className="py-10 text-center text-muted-foreground text-sm font-mono">Loading on-chain data...</div>
          ) : onChainTxns.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm font-mono">
              {ocError ? "RPC unavailable" : "No transactions found"}
            </div>
          ) : onChainTxns.map((tx: any, i: number) => (
            <div key={tx.signature || i} data-testid={`row-tx-${i}`} className="px-4 py-2.5 flex items-center gap-3 hover:bg-white/2 transition-colors">
              <div className={cn("w-2 h-2 rounded-full shrink-0", tx.err ? "bg-red-400" : "bg-green-400")} />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[11px] text-foreground truncate">{tx.signature?.slice(0, 20)}...{tx.signature?.slice(-8)}</div>
                {tx.memo && <div className="text-[10px] text-muted-foreground truncate">{tx.memo}</div>}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono shrink-0">{timeSince(tx.timestamp)}</div>
              <a href={tx.solscanUrl} target="_blank" rel="noopener noreferrer"
                className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-cyan-400 shrink-0" data-testid={`link-tx-solscan-${i}`}>
                <ExternalLink size={11} />
              </a>
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
                tx.type === "burn" ? "bg-red-500/15 text-red-400" :
                tx.type === "reward" || tx.type === "prize" ? "bg-green-500/15 text-green-400" :
                tx.type === "stake" ? "bg-violet-500/15 text-violet-400" :
                "bg-cyan-500/15 text-cyan-400")}>{tx.type}</span>
              <span className="text-[11px] font-mono text-foreground truncate flex-1">{tx.memo || `${tx.from} → ${tx.to}`}</span>
              <span className="text-[11px] font-mono text-amber-400 shrink-0">{fmt(tx.amount)} TSRT</span>
              <span className="text-[10px] text-muted-foreground font-mono shrink-0">{timeSince(tx.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BurnTab() {
  const { data: liveData } = useQuery<any>({ queryKey: ["/api/tsrt/live"], refetchInterval: 60000 });
  const { data: burnData } = useQuery<any>({ queryKey: ["/api/tsrt/burn-stats"], refetchInterval: 60000 });
  const { data: computeData } = useQuery<any>({ queryKey: ["/api/tsrt/compute-economy"], refetchInterval: 60000 });

  const supply = liveData?.fdv || 0;
  const mcap = liveData?.marketCap || 0;
  const price = liveData?.priceUsd ? parseFloat(liveData.priceUsd) : 0;
  const burnedAmount = burnData?.totalBurned || 0;
  const burnRate = burnData?.burnRate || "1% per transaction";

  return (
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
          {[
            "1% of every TSRT transaction is automatically burned",
            "Agent compensation burns trigger on 24h work cycle completion",
            "Deflationary pressure increases as adoption grows",
            "Burn ledger is recorded in the Internal Ledger below",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground font-mono">
              <Flame size={11} className="text-rose-400 mt-0.5 shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {computeData && (
        <div className="rounded-xl border border-border/30 bg-background/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-yellow-400" />
            <span className="text-sm font-bold text-yellow-400 font-mono">Compute-Backed Economy</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px] font-mono">
            {Object.entries(computeData).slice(0, 8).map(([k, v]: [string, any]) => (
              <div key={k} className="flex justify-between gap-2 py-1 border-b border-border/10">
                <span className="text-muted-foreground truncate">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className="text-foreground font-bold shrink-0">{typeof v === "number" ? fmt(v) : String(v).slice(0, 20)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EarnTab() {
  const { data: serviceArb } = useQuery<any>({ queryKey: ["/api/service-arbitrage/status"], refetchInterval: 30000 });
  const { data: incomeProcesses } = useQuery<any>({ queryKey: ["/api/income/processes"], refetchInterval: 60000 });
  const { data: walletData } = useQuery<any>({ queryKey: ["/api/wallets/both"], refetchInterval: 60000 });
  const { data: autopilot } = useQuery<any>({ queryKey: ["/api/auto-pilot/status"], refetchInterval: 30000 });

  const catalog = serviceArb?.catalog || [];
  const activeServices = catalog.filter((s: any) => s.active);
  const totalPnL = serviceArb?.totalProfitUsd || 0;
  const totalExecutions = serviceArb?.totalExecuted || 0;
  const streams = Array.isArray(incomeProcesses) ? incomeProcesses : [];
  const executedStreams = streams.filter((s: any) => (s.actualRevenue || 0) > 0 || s.executions > 0 || s.status === "executed");

  const fatherSol = walletData?.father?.solBalance || walletData?.main?.solBalance || 0;
  const commSol = walletData?.community?.solBalance || 0;
  const solPrice = walletData?.solPrice || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Real P&L" value={`$${totalPnL.toFixed(4)}`} icon={TrendingUp} color={totalPnL > 0 ? "green" : "orange"}
          sub={totalPnL > 0 ? "Profitable" : "Awaiting first sale"} />
        <StatCard label="Executions" value={String(totalExecutions || 0)} icon={Activity} color="violet" sub={`${serviceArb?.totalApproved || 0} approvals`} />
        <StatCard label="Main Wallet" value={`${fatherSol.toFixed(4)} SOL`} icon={Wallet} color="cyan" sub={solPrice > 0 ? `$${(fatherSol * solPrice).toFixed(2)}` : undefined} />
        <StatCard label="Community" value={`${commSol.toFixed(4)} SOL`} icon={Shield} color="green" sub={solPrice > 0 ? `$${(commSol * solPrice).toFixed(2)}` : undefined} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign size={14} className="text-violet-400" />
            <span className="text-sm font-bold text-violet-400 font-mono">Revenue Split</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
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
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <div className={cn("w-2 h-2 rounded-full", autopilot.active ? "bg-green-400 animate-pulse" : "bg-gray-500")} />
              <span className="text-muted-foreground">Autopilot: {autopilot.active ? "Active" : "Inactive"}</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {activeServices.length > 0 && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 overflow-hidden">
              <div className="px-3 py-2 border-b border-green-500/15 flex items-center gap-2">
                <CheckCircle2 size={13} className="text-green-400" />
                <span className="text-xs font-bold text-green-400 font-mono">Active Services ({activeServices.length})</span>
              </div>
              <div className="divide-y divide-border/10 max-h-[150px] overflow-y-auto">
                {activeServices.slice(0, 8).map((svc: any, i: number) => (
                  <div key={svc.id || i} className="px-3 py-2 flex items-center gap-2" data-testid={`service-earn-${i}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    <span className="text-[11px] font-mono text-foreground/80 truncate flex-1">{svc.name || "Service"}</span>
                    <span className="text-[11px] font-mono text-green-400 shrink-0">{svc.marginPercent > 0 ? `${Number(svc.marginPercent).toFixed(1)}%` : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {executedStreams.length === 0 && activeServices.length === 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
              <Clock size={20} className="mx-auto mb-2 text-amber-400/60" />
              <div className="text-xs font-bold text-amber-400 mb-1">Autonomous engine scanning...</div>
              <div className="text-[11px] text-muted-foreground">120+ methods, 9 scanners active</div>
            </div>
          )}

          {executedStreams.length > 0 && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 overflow-hidden">
              <div className="px-3 py-2 border-b border-cyan-500/15 flex items-center gap-2">
                <BarChart3 size={13} className="text-cyan-400" />
                <span className="text-xs font-bold text-cyan-400 font-mono">Executed Streams</span>
              </div>
              <div className="divide-y divide-border/10 max-h-[150px] overflow-y-auto">
                {executedStreams.slice(0, 8).map((s: any, i: number) => (
                  <div key={s.id || i} className="px-3 py-2 flex items-center gap-2" data-testid={`stream-earn-${i}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    <span className="text-[11px] font-mono text-foreground/80 truncate flex-1">{s.name || s.type || "Stream"}</span>
                    <span className="text-[11px] font-mono text-cyan-400 shrink-0">{s.executions || 0}x</span>
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

export default function CurrencyHubPage({ embedded }: { embedded?: boolean }) {
  const activeTab = "all" as any;
  useEffect(() => { document.title = "Currency Hub | Tessera"; }, []);

  return (
    <div className="flex h-full bg-background" data-testid="page-currency-hub">
      <div className="flex-1 overflow-auto" data-scroll-container>
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold font-mono text-foreground flex items-center gap-2">
                <Coins size={20} className="text-cyan-400" />
                Currency Hub
              </h1>
              <p className="text-[12px] text-muted-foreground font-mono mt-1">
                TSRT live data · real wallets · on-chain transactions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a href={JUPITER_LINK} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono hover:bg-green-500/15 transition-all"
                data-testid="button-buy-tsrt">
                <Coins size={12} /> Buy TSRT
              </a>
            </div>
          </div>

          <TabBar active={activeTab} onChange={() => {}} />

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}>
              {<OverviewTab />}
              {<TransactionsTab />}
              {<BurnTab />}
              {<EarnTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
