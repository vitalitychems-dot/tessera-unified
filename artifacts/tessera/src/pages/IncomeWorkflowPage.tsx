import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Workflow, RefreshCcw, Wallet, ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/ui/sovereign";
import { apiRequest } from "@/lib/queryClient";

interface OnChainDeposit {
  signature: string;
  amountSol: number;
  blockTime: number;
  explorerUrl: string;
}

interface WalletObservation {
  configured: boolean;
  walletAddress: string | null;
  network: string;
  balanceSol: number | null;
  totalReceivedSol: number;
  deposits: OnChainDeposit[];
  lastObservedAt: number;
  lastError: string | null;
}

interface IncomeStrategy {
  id: string;
  name: string;
  kind: "passive" | "active";
  status: "active" | "available" | "needs-config";
  description: string;
  requirement: string | null;
}

interface StrategiesResp {
  ok: boolean;
  walletReady: boolean;
  confirmedIncome: { asset: string; totalReceived: number; currentBalance: number | null };
  strategies: IncomeStrategy[];
}

interface WalletResp {
  ok: boolean;
  observation: WalletObservation;
}

const STATUS_BADGE: Record<IncomeStrategy["status"], string> = {
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  available: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25",
  "needs-config": "text-amber-400 bg-amber-500/10 border-amber-500/25",
};

export default function IncomeWorkflowPage() {
  useEffect(() => { document.title = "Income | Tessera"; }, []);
  const qc = useQueryClient();

  const { data: walletData } = useQuery<WalletResp>({
    queryKey: ["/api/income/wallet"],
    refetchInterval: 60_000,
  });

  const { data: stratData } = useQuery<StrategiesResp>({
    queryKey: ["/api/income/strategies"],
    refetchInterval: 60_000,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/income/wallet/refresh", {});
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/income/wallet"] });
      qc.invalidateQueries({ queryKey: ["/api/income/strategies"] });
    },
  });

  const obs = walletData?.observation;
  const strategies = stratData?.strategies ?? [];

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto space-y-5">
      <PageHeader icon={Workflow} title="Income" subtitle="Confirmed on-chain receipts and live revenue strategies — no projections, no fabricated balances." iconColor="text-emerald-400" />

      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={16} className="text-emerald-400" />
          <span className="text-sm font-bold text-emerald-300">Sovereign Wallet</span>
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-slate-400 hover:text-emerald-300 disabled:opacity-50 font-mono"
          >
            <RefreshCcw size={10} className={refreshMutation.isPending ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {!obs?.configured && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25">
            <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-200">
              No sovereign wallet configured. Set the <code className="text-amber-400 font-mono">SOVEREIGN_WALLET_ADDRESS</code> environment variable to begin observing real on-chain deposits.
            </div>
          </div>
        )}

        {obs?.configured && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                <div className="text-[9px] text-slate-500 font-mono">CURRENT BALANCE</div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {obs.balanceSol === null ? "—" : `${obs.balanceSol.toFixed(6)} SOL`}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/15">
                <div className="text-[9px] text-slate-500 font-mono">TOTAL RECEIVED</div>
                <div className="text-lg font-bold font-mono text-cyan-400">{obs.totalReceivedSol.toFixed(6)} SOL</div>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mb-2">
              Address: <span className="text-slate-300">{obs.walletAddress}</span> · network: {obs.network}
            </div>
            {obs.lastError && (
              <div className="text-[10px] text-red-400 font-mono mb-2">RPC error: {obs.lastError}</div>
            )}

            <div className="text-[10px] text-slate-500 font-mono tracking-widest mt-4 mb-2">CONFIRMED DEPOSITS</div>
            {obs.deposits.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-3 rounded-lg bg-white/[0.02] border border-white/5">
                No deposits observed yet. Any incoming SOL will appear here with the on-chain signature.
              </div>
            ) : (
              <div className="space-y-1.5">
                {obs.deposits.map(d => (
                  <a
                    key={d.signature}
                    href={d.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition"
                  >
                    <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-emerald-300 font-mono">+{d.amountSol.toFixed(6)} SOL</div>
                      <div className="text-[9px] text-slate-500 font-mono truncate">{d.signature}</div>
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono shrink-0">
                      {new Date(d.blockTime).toLocaleString()}
                    </div>
                    <ExternalLink size={10} className="text-slate-500 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </GlassCard>

      <div className="text-[10px] text-slate-500 font-mono tracking-widest">REVENUE STRATEGIES</div>
      <div className="space-y-2">
        {strategies.map(s => (
          <GlassCard key={s.id} className={cn("p-3 border", STATUS_BADGE[s.status].split(" ").pop())}>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-semibold text-white">{s.name}</span>
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-mono uppercase", STATUS_BADGE[s.status])}>
                {s.status.replace("-", " ")}
              </span>
              <span className="text-[9px] text-slate-600 font-mono">{s.kind}</span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">{s.description}</p>
            {s.requirement && (
              <p className="text-[10px] text-amber-300 mt-1 font-mono">⚠ {s.requirement}</p>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
