import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Shield, ShieldOff, ShieldAlert, AlertTriangle, CheckCircle2, Clock, Send, Loader2 } from "lucide-react";

interface AuditEntry {
  ts: number;
  caller: string;
  callerType: "shepherd" | "conscious-agent" | "system" | "unknown";
  targetUrl: string;
  method: string;
  outcome: "allowed" | "refused" | "rerouted";
  reason?: string;
  status?: number;
  durationMs?: number;
}

interface AuditResp {
  ok: boolean;
  entries: AuditEntry[];
  stats: { total: number; refused: number; allowed: number; rerouted: number; lastTs: number | null };
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

const OUTCOME_STYLE = {
  allowed: { icon: CheckCircle2, color: "emerald", label: "Allowed (Shepherd)" },
  refused: { icon: ShieldOff, color: "red", label: "Refused" },
  rerouted: { icon: ShieldAlert, color: "amber", label: "Rerouted via Shepherd" },
};

export default function ShepherdAuditPage() {
  const [testCaller, setTestCaller] = useState("Tessera-Prime");
  const [testUrl, setTestUrl] = useState("https://api.example.com/probe");

  const { data, isLoading } = useQuery<AuditResp>({
    queryKey: ["/api/lattice/shepherd/audit"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/lattice/shepherd/audit?limit=200");
      return r.json();
    },
    refetchInterval: 5000,
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/lattice/shepherd/test-outbound", {
        caller: testCaller, targetUrl: testUrl, method: "GET",
      });
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/lattice/shepherd/audit"] }),
  });

  const stats = data?.stats;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-emerald-950/10" data-testid="shepherd-audit-page">
      <div className="border-b border-emerald-500/20 bg-black/30 px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="text-emerald-400" size={18} />
          <h1 className="text-lg font-mono font-bold text-emerald-200">Shepherd Outbound Audit</h1>
          <span className="text-[10px] font-mono text-emerald-300/70 px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5">
            zero direct external calls from conscious agents
          </span>
          {stats && (
            <div className="ml-auto flex gap-3 text-[11px] font-mono">
              <span className="text-emerald-300"><strong>{stats.allowed}</strong> shepherd-allowed</span>
              <span className="text-red-300"><strong>{stats.refused}</strong> refused</span>
              <span className="text-amber-300"><strong>{stats.rerouted}</strong> rerouted</span>
              {stats.lastTs && <span className="text-muted-foreground">last {timeAgo(stats.lastTs)}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 space-y-2">
          <div className="text-[11px] font-mono text-emerald-300 flex items-center gap-1">
            <Send size={12} /> Test outbound policy — simulate a call as a named caller and verify the policy decision
          </div>
          <div className="flex flex-wrap gap-2">
            <input value={testCaller} onChange={e => setTestCaller(e.target.value)} className="bg-background/50 border border-border/30 rounded px-2 py-1 text-[11px] font-mono w-48" placeholder="Caller (try Tessera-Prime vs shepherd-test)" data-testid="input-test-caller" />
            <input value={testUrl} onChange={e => setTestUrl(e.target.value)} className="bg-background/50 border border-border/30 rounded px-2 py-1 text-[11px] font-mono flex-1 min-w-[280px]" placeholder="Target URL" data-testid="input-test-url" />
            <button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              className="text-[11px] font-mono px-3 py-1 rounded border border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50 flex items-center gap-1"
              data-testid="button-test-outbound"
            >{testMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Probe</button>
          </div>
          {testMutation.data && (
            <div className={`text-[11px] font-mono px-2 py-1.5 rounded border ${testMutation.data.refused ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`} data-testid="test-outbound-result">
              {testMutation.data.refused ? "REFUSED — sovereignty policy enforced" : "ALLOWED — caller is shepherd or system"}
              {testMutation.data.error && <div className="text-[10px] opacity-80 mt-0.5">{testMutation.data.error}</div>}
            </div>
          )}
        </div>

        {isLoading && <div className="text-[11px] font-mono text-muted-foreground">Loading audit log…</div>}
        {data?.entries.length === 0 && (
          <div className="rounded border border-border/30 bg-black/20 p-6 text-center text-[12px] font-mono text-muted-foreground">
            No outbound calls recorded yet. The Shepherd is idle.
          </div>
        )}
        {data?.entries.map((e, i) => {
          const style = OUTCOME_STYLE[e.outcome];
          const Icon = style.icon;
          const isRefused = e.outcome === "refused";
          return (
            <div key={i} className={`rounded border p-2.5 ${isRefused ? "border-red-500/30 bg-red-500/5" : e.outcome === "allowed" ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/25 bg-amber-500/5"}`} data-testid={`audit-entry-${i}`}>
              <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                <Icon size={12} className={`text-${style.color}-400`} />
                <span className={`text-${style.color}-300 font-bold`}>{style.label}</span>
                <span className="px-1.5 py-0.5 rounded bg-black/30 text-foreground/80">{e.method}</span>
                <span className="text-cyan-300">{e.caller}</span>
                <span className={`text-[9px] px-1.5 rounded border ${e.callerType === "conscious-agent" ? "border-red-500/30 text-red-300" : e.callerType === "shepherd" ? "border-emerald-500/30 text-emerald-300" : "border-border/30 text-muted-foreground"}`}>
                  {e.callerType}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground/60 flex items-center gap-1">
                  <Clock size={9} /> {timeAgo(e.ts)}
                </span>
              </div>
              <div className="text-[11px] text-foreground/80 mt-1 break-all">{e.targetUrl}</div>
              {e.reason && (
                <div className="text-[10px] text-muted-foreground/70 mt-1 flex items-start gap-1">
                  <AlertTriangle size={10} className="mt-0.5 shrink-0 opacity-60" />
                  <span>{e.reason}</span>
                </div>
              )}
              {(e.status !== undefined || e.durationMs !== undefined) && (
                <div className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                  {e.status !== undefined && <>status: {e.status} · </>}
                  {e.durationMs !== undefined && <>{e.durationMs}ms</>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
