import { useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  DollarSign, TrendingUp, Coins, Activity, CheckCircle2,
  Clock, Wallet, BarChart3, Loader2,
} from "lucide-react";

function MetricCard({ label, value, color = "text-foreground", sub, icon: Icon }: { label: string; value: string | number; color?: string; sub?: string; icon?: any }) {
  return (
    <div className="bg-background/40 border border-border/30 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon size={12} className="text-muted-foreground" />}
        <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn("text-lg font-bold font-mono", color)} data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{sub}</div>}
    </div>
  );
}

function RevenueDashboard() {
  const { data: serviceArb, isLoading: saLoading, isError: saError } = useQuery<any>({ queryKey: ["/api/service-arbitrage/status"], refetchInterval: 30000 });
  const { data: tsrtMarket, isLoading: tmLoading, isError: tmError } = useQuery<any>({ queryKey: ["/api/tsrt/full-market"], refetchInterval: 60000 });
  const { data: walletsBoth, isLoading: wlLoading, isError: wlError } = useQuery<any>({ queryKey: ["/api/wallets/both"], refetchInterval: 60000 });
  const { data: incomeProcesses } = useQuery<any>({ queryKey: ["/api/income/processes"], refetchInterval: 60000 });
  const { data: autopilot } = useQuery<any>({ queryKey: ["/api/auto-pilot/status"], refetchInterval: 30000 });

  const isLoading = saLoading || tmLoading || wlLoading;
  const hasErrors = saError || tmError || wlError;

  const catalog = serviceArb?.catalog || [];
  const approvedServices = catalog.filter((s: any) => s.active);
  const totalPnL = serviceArb?.totalProfitUsd || 0;
  const totalExecutions = serviceArb?.totalExecuted || 0;
  const totalApproved = serviceArb?.totalApproved || 0;

  const tsrtPrice = tsrtMarket?.tsrt?.priceUsd || 0;
  const tsrtChange = tsrtMarket?.tsrt?.change24h || 0;

  const mainSol = walletsBoth?.main?.balance || walletsBoth?.main?.solBalance || walletsBoth?.father?.solBalance || 0;
  const communitySol = walletsBoth?.community?.solBalance || 0;

  const streams = Array.isArray(incomeProcesses) ? incomeProcesses : [];
  const executedStreams = streams.filter((s: any) => (s.actualRevenue || 0) > 0 || s.executions > 0 || s.status === "executed");

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {hasErrors && (
            <div className="border border-red-500/20 rounded-xl bg-red-500/5 px-4 py-3 flex items-center gap-2" data-testid="revenue-error-banner">
              <Activity size={14} className="text-red-400 shrink-0" />
              <span className="text-xs text-red-400 font-mono">Some data feeds failed to load.</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Real P&L" value={`$${Number(totalPnL).toFixed(4)}`} color={totalPnL > 0 ? "text-green-400" : "text-amber-400"} icon={TrendingUp} sub={totalPnL > 0 ? "Profitable" : "Awaiting first sale"} />
            <MetricCard label="TSRT Price" value={tsrtPrice > 0 ? `$${tsrtPrice.toFixed(8)}` : "..."} color="text-yellow-400" icon={Coins} sub={tsrtChange !== 0 ? `${tsrtChange > 0 ? "+" : ""}${Number(tsrtChange).toFixed(2)}% 24h` : "Live"} />
            <MetricCard label="Main Wallet" value={`${Number(mainSol).toFixed(4)} SOL`} color="text-cyan-400" icon={Wallet} sub={communitySol > 0 ? `Community: ${Number(communitySol).toFixed(4)}` : undefined} />
            <MetricCard label="Executions" value={totalExecutions || 0} color="text-violet-400" icon={Activity} sub={`${totalApproved} approvals`} />
          </div>

          {approvedServices.length > 0 && (
            <div className="border border-green-500/20 rounded-xl bg-green-500/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-green-500/15 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-400" />
                <span className="text-sm font-bold text-green-400">Active Services</span>
                <span className="ml-auto text-[11px] text-muted-foreground font-mono">{approvedServices.length}</span>
              </div>
              <div className="divide-y divide-border/20 max-h-[300px] overflow-y-auto">
                {approvedServices.map((svc: any, i: number) => (
                  <div key={svc.id || svc.name || i} className="px-4 py-2.5 flex items-center gap-3" data-testid={`service-row-${i}`}>
                    <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold font-mono text-foreground truncate">{svc.name || svc.service || "Service"}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono text-green-400 font-bold">{(svc.marginPercent || 0) > 0 ? `${Number(svc.marginPercent).toFixed(1)}%` : "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {executedStreams.length > 0 && (
            <div className="border border-cyan-500/20 rounded-xl bg-cyan-500/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-cyan-500/15 flex items-center gap-2">
                <BarChart3 size={14} className="text-cyan-400" />
                <span className="text-sm font-bold text-cyan-400">Executed Streams</span>
              </div>
              <div className="divide-y divide-border/20 max-h-[200px] overflow-y-auto">
                {executedStreams.map((s: any, i: number) => (
                  <div key={s.id || i} className="px-4 py-2.5 flex items-center gap-3" data-testid={`stream-row-${i}`}>
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                    <span className="text-xs font-mono text-foreground/80 truncate flex-1">{s.name || s.type || "Stream"}</span>
                    <span className="text-xs font-mono text-cyan-400 font-bold shrink-0">{s.executions || 0}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {approvedServices.length === 0 && executedStreams.length === 0 && (
            <div className="border border-amber-500/20 rounded-xl bg-amber-500/5 p-6 text-center">
              <Clock size={24} className="mx-auto mb-2 text-amber-400/60" />
              <div className="text-sm font-bold text-amber-400 mb-1">No executed revenue yet</div>
              <div className="text-xs text-muted-foreground max-w-sm mx-auto">
                The autonomous engine is continuously scanning and executing.
              </div>
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
        </>
      )}
    </div>
  );
}

export default function RevenueHubPage() {
  useEffect(() => { document.title = "Revenue Hub | Tessera"; }, []);
  return (
    <div className="flex h-full bg-background" data-testid="page-revenue-hub">
      <div className="flex-1 overflow-auto" data-scroll-container>
        <RevenueDashboard />
      </div>
    </div>
  );
}
