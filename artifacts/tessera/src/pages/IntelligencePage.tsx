import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain, Zap, MessageSquare, RefreshCw, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader, SectionHeader } from "@/components/ui/sovereign";

interface ProviderCallRow {
  id: number;
  providerName: string;
  model: string;
  requestMessages: unknown;
  responseText: string | null;
  latencyMs: number | null;
  totalTokens: number | null;
  status: string;
  isExternal: boolean;
  isDryRun: boolean;
  calledAt: string;
}

interface ChatMessageLike {
  role?: string;
  content?: unknown;
}
function isChatMessageLike(v: unknown): v is ChatMessageLike {
  return typeof v === "object" && v !== null && ("role" in v || "content" in v);
}
function previewPrompt(req: unknown): string | null {
  // requestMessages is a JSON array typically [{role, content}]; tolerate
  // strings, arrays, and objects so we always render something readable.
  if (!req) return null;
  if (typeof req === "string") return req;
  if (Array.isArray(req)) {
    const messages = req.filter(isChatMessageLike);
    const last = messages.find(m => m.role === "user") ?? messages[messages.length - 1];
    if (last && last.content !== undefined) {
      return typeof last.content === "string" ? last.content : JSON.stringify(last.content);
    }
    return JSON.stringify(req);
  }
  if (typeof req === "object") return JSON.stringify(req);
  return String(req);
}

function relativeTime(iso: string): string {
  const dt = Date.now() - new Date(iso).getTime();
  if (dt < 60_000) return `${Math.round(dt / 1000)}s ago`;
  if (dt < 3_600_000) return `${Math.round(dt / 60_000)}m ago`;
  if (dt < 86_400_000) return `${Math.round(dt / 3_600_000)}h ago`;
  return `${Math.round(dt / 86_400_000)}d ago`;
}

interface ProviderRow {
  id: string;
  name: string;
  isExternal?: boolean;
  type?: string;
  tier?: number;
  models?: string[];
  capabilities?: string[];
}

export default function IntelligencePage() {
  useEffect(() => { document.title = "Intelligence | Tessera"; }, []);
  const [queryText, setQueryText] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");

  // Real recent provider calls from the sovereignty log.
  const { data: callsData, isLoading: callsLoading, refetch: refetchCalls } = useQuery<{ ok: boolean; calls: ProviderCallRow[] }>({
    queryKey: ["intel-recent-provider-calls"],
    queryFn: async () => (await fetch("/api/provider-sovereignty/calls?limit=12")).json(),
    refetchInterval: 20000,
  });
  const recentCalls = callsData?.calls ?? [];

  const { data: statsData } = useQuery<{
    ok: boolean;
    stats?: {
      total?: number;
      external?: number;
      internal?: number;
      avgExternalLatencyMs?: number | null;
      avgInternalLatencyMs?: number | null;
      successRate?: number;
    };
  }>({
    queryKey: ["intel-provider-stats"],
    queryFn: async () => (await fetch("/api/provider-sovereignty/stats")).json(),
    refetchInterval: 30000,
  });
  const stats = statsData?.stats;
  const avgLatencyMs = stats?.avgExternalLatencyMs ?? stats?.avgInternalLatencyMs ?? null;

  const { data: providersData } = useQuery<{ ok: boolean; providers: ProviderRow[] }>({
    queryKey: ["intel-providers"],
    queryFn: async () => (await fetch("/api/provider-sovereignty/providers")).json(),
    refetchInterval: 60_000,
  });
  const providers = providersData?.providers ?? [];
  useEffect(() => {
    if (!selectedProvider && providers.length > 0) setSelectedProvider(providers[0].id);
  }, [providers, selectedProvider]);

  return (
    <div className="p-4 pb-20 max-w-4xl mx-auto space-y-5">
      <PageHeader
        icon={Brain}
        title="Intelligence Engine"
        subtitle="Sovereign AGI — query, synthesize, and act on any domain of knowledge"
        iconColor="text-violet-400"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Calls (24h)", val: (stats?.total ?? 0).toLocaleString(), color: "violet" },
          { label: "External / Internal", val: `${stats?.external ?? 0} / ${stats?.internal ?? 0}`, color: "cyan" },
          { label: "Avg Latency", val: avgLatencyMs != null ? `${(avgLatencyMs / 1000).toFixed(2)}s` : "—", color: "emerald" },
          { label: "Success Rate", val: stats?.successRate != null ? `${Math.round(stats.successRate)}%` : "—", color: "amber" },
        ].map(({ label, val, color }) => (
          <GlassCard key={label} className="p-3 text-center">
            <div className={cn("text-xl font-bold font-mono", `text-${color}-400`)}>{val}</div>
            <div className="text-[9px] text-slate-500 font-mono mt-1">{label.toUpperCase()}</div>
          </GlassCard>
        ))}
      </div>

      <div className="space-y-4">
          <GlassCard className="p-4">
            <div className="text-[10px] text-slate-500 font-mono mb-2">INTELLIGENCE QUERY</div>
            <div className="flex gap-2 mb-3">
              <select
                value={selectedProvider}
                onChange={e => setSelectedProvider(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-slate-300 font-mono outline-none"
              >
                {providers.length === 0 && <option value="">(no providers registered)</option>}
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}{p.models && p.models[0] ? ` · ${p.models[0]}` : ""}</option>)}
              </select>
            </div>
            <textarea
              value={queryText}
              onChange={e => setQueryText(e.target.value)}
              placeholder="Ask the sovereign intelligence anything — market analysis, governance decisions, mesh status, knowledge synthesis..."
              rows={3}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500/30 resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-slate-600 font-mono">Provider: {selectedProvider || "—"}</span>
              <button
                disabled={!queryText.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-400 text-sm font-mono hover:bg-violet-500/25 transition-all disabled:opacity-40"
              >
                <Zap size={13} />
                Query Intelligence
              </button>
            </div>
          </GlassCard>

          <div className="flex items-center justify-between">
            <SectionHeader icon={MessageSquare} title="Recent Provider Calls (Live)" color="violet" />
            <button onClick={() => refetchCalls()} className="px-2 py-1 rounded-md text-[10px] font-mono bg-violet-500/10 border border-violet-500/25 text-violet-300 hover:bg-violet-500/20 flex items-center gap-1">
              <RefreshCw size={10} /> Refresh
            </button>
          </div>

          <div className="space-y-3">
            {callsLoading && (
              <GlassCard className="p-4 text-center text-slate-500 text-sm font-mono">Loading recent provider calls…</GlassCard>
            )}
            {!callsLoading && recentCalls.length === 0 && (
              <GlassCard className="p-4 text-center text-slate-500 text-sm">
                No provider calls have been logged yet. Once Tessera makes its first sovereign provider call, the real query/response history will appear here.
              </GlassCard>
            )}
            {recentCalls.map(call => {
              const ok = call.status === "success";
              const prompt = previewPrompt(call.requestMessages);
              return (
                <GlassCard key={call.id} className="p-4 hover:bg-white/[0.04] transition-all" data-testid={`intel-call-${call.id}`}>
                  <div className="flex items-start gap-2 mb-2">
                    <MessageSquare size={13} className="text-violet-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-300 leading-snug whitespace-pre-wrap break-words">
                      {prompt ? (prompt.length > 240 ? prompt.slice(0, 240) + "…" : prompt) : <span className="italic text-slate-500">(no prompt recorded)</span>}
                    </p>
                  </div>
                  {call.responseText && (
                    <div className={cn("ml-5 p-3 rounded-lg border text-xs leading-relaxed whitespace-pre-wrap break-words", ok ? "bg-black/20 border-white/5 text-slate-400" : "bg-red-500/5 border-red-500/20 text-red-300")}>
                      {call.responseText.length > 480 ? call.responseText.slice(0, 480) + "…" : call.responseText}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-2 ml-5 text-[9px] text-slate-600 font-mono flex-wrap">
                    <span>{call.providerName} · {call.model}</span>
                    {call.totalTokens != null && <span>{call.totalTokens.toLocaleString()} tokens</span>}
                    {call.latencyMs != null && <span>{call.latencyMs}ms</span>}
                    <span>{call.isExternal ? "external" : "internal"}{call.isDryRun ? " · dry-run" : ""}</span>
                    <span className={cn("font-bold uppercase", ok ? "text-emerald-400" : "text-red-400")}>{call.status}</span>
                    <span className="ml-auto">{relativeTime(call.calledAt)}</span>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {providers.length > 0 && (
            <div>
              <SectionHeader icon={Cpu} title="Registered Providers" color="cyan" />
              <div className="grid sm:grid-cols-2 gap-3 mt-2">
                {providers.map(p => (
                  <GlassCard key={p.id} className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-white">{p.name}</span>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase", p.isExternal ? "bg-amber-500/10 text-amber-400 border border-amber-500/25" : "bg-violet-500/10 text-violet-400 border border-violet-500/25")}>
                        {p.isExternal ? "external" : "internal"}
                      </span>
                    </div>
                    {p.type && <div className="text-[10px] text-slate-500 font-mono">{p.type}{p.tier != null ? ` · tier ${p.tier}` : ""}</div>}
                    {p.models && p.models.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.models.slice(0, 4).map(m => (
                          <span key={m} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300 font-mono">{m}</span>
                        ))}
                      </div>
                    )}
                    {p.capabilities && p.capabilities.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.capabilities.slice(0, 6).map(c => (
                          <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">{c}</span>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
