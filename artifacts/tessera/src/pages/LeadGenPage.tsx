import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target, ExternalLink, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/ui/sovereign";

type LeadKind = "affiliate" | "service" | "access" | "knowledge" | "general";

interface ExecutableLead {
  id: number;
  url: string;
  title: string | null;
  source: string;
  domain: string;
  kind: LeadKind;
  discoveredAt: number;
  relevance: number;
  executionSteps: string[];
  estimatedRewardUsd: { low: number; high: number; rationale: string };
}

interface LeadsResp {
  ok: boolean;
  leads: ExecutableLead[];
  counts: Record<LeadKind, number>;
}

const KIND_STYLES: Record<LeadKind, string> = {
  affiliate: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  service: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25",
  access: "text-violet-400 bg-violet-500/10 border-violet-500/25",
  knowledge: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  general: "text-slate-400 bg-slate-500/10 border-slate-500/25",
};

export default function LeadGenPage() {
  useEffect(() => { document.title = "Leads | Tessera"; }, []);
  const [filter, setFilter] = useState<LeadKind | "all">("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const qs = filter === "all" ? "" : `?kind=${filter}`;
  const { data, isLoading } = useQuery<LeadsResp>({
    queryKey: [`/api/leads/feed${qs}`],
    refetchInterval: 90_000,
  });

  const leads = data?.leads ?? [];
  const counts = data?.counts ?? { affiliate: 0, service: 0, access: 0, knowledge: 0, general: 0 };

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto space-y-5">
      <PageHeader icon={Target} title="Executable Leads" subtitle="Real URLs harvested from the ingestion pipeline, classified and scored for execution." iconColor="text-amber-400" />

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {(Object.entries(counts) as Array<[LeadKind, number]>).map(([k, n]) => (
          <GlassCard key={k} className="p-2 text-center">
            <div className={cn("text-base font-bold font-mono", KIND_STYLES[k].split(" ")[0])}>{n}</div>
            <div className="text-[8px] text-slate-500 font-mono mt-0.5">{k.toUpperCase()}</div>
          </GlassCard>
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {(["all", "affiliate", "service", "access", "knowledge", "general"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase transition",
              filter === f ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" : "text-slate-500 hover:text-slate-300 border border-transparent"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {isLoading && <div className="text-xs text-slate-500 italic">Loading harvested leads…</div>}
        {!isLoading && leads.length === 0 && (
          <div className="text-xs text-slate-500 italic p-4 rounded-lg bg-white/[0.02] border border-white/5">
            No leads yet. The ingestion pipeline + link harvester will populate this feed in real time.
          </div>
        )}
        {leads.map(lead => {
          const isOpen = expanded === lead.id;
          return (
            <GlassCard key={lead.id} className="p-3 hover:bg-white/[0.04] transition">
              <button onClick={() => setExpanded(isOpen ? null : lead.id)} className="w-full text-left">
                <div className="flex items-start gap-2">
                  <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full border font-mono uppercase mt-0.5", KIND_STYLES[lead.kind])}>{lead.kind}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{lead.title || lead.domain}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">{lead.domain} · via {lead.source}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-mono text-emerald-400">${lead.estimatedRewardUsd.low}–${lead.estimatedRewardUsd.high}</div>
                    <ChevronDown size={11} className={cn("text-slate-500 transition", isOpen && "rotate-180")} />
                  </div>
                </div>
              </button>
              {isOpen && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                  <a href={lead.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono break-all">
                    <ExternalLink size={10} />
                    {lead.url}
                  </a>
                  <div className="text-[10px] text-slate-500 italic">{lead.estimatedRewardUsd.rationale}</div>
                  <ol className="space-y-1 text-[11px] text-slate-300 list-decimal pl-4">
                    {lead.executionSteps.map((step, i) => <li key={i}>{step}</li>)}
                  </ol>
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
