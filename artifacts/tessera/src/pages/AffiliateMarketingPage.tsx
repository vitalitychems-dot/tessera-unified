import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, ExternalLink, Gift, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/ui/sovereign";

interface ExecutableLead {
  id: number;
  url: string;
  title: string | null;
  domain: string;
  source: string;
  kind: string;
  estimatedRewardUsd: { low: number; high: number; rationale: string };
}

interface FreeFinding {
  id: string;
  title: string;
  url: string;
  source: string;
  flair: string | null;
  score: number;
  commentsUrl: string;
  postedAt: number;
  validation: "ok" | "redirect" | "dead" | "blocked" | "pending";
}

interface CodeBounty {
  id: string;
  title: string;
  htmlUrl: string;
  repoFullName: string;
  labels: string[];
  comments: number;
  rewardHint: string | null;
  updatedAt: number;
}

const VALIDATION_STYLE: Record<FreeFinding["validation"], string> = {
  ok: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  redirect: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25",
  blocked: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  dead: "text-red-400 bg-red-500/10 border-red-500/25",
  pending: "text-slate-400 bg-slate-500/10 border-slate-500/25",
};

export default function AffiliateMarketingPage() {
  useEffect(() => { document.title = "Affiliate & Free Stuff | Tessera"; }, []);

  const { data: leadsData } = useQuery<{ ok: boolean; leads: ExecutableLead[] }>({
    queryKey: ["/api/leads/feed?kind=affiliate&limit=40"],
    refetchInterval: 120_000,
  });
  const { data: freeData } = useQuery<{ ok: boolean; findings: FreeFinding[]; lastRefresh: number }>({
    queryKey: ["/api/free-stuff?limit=40"],
    refetchInterval: 5 * 60_000,
  });
  const { data: bountyData } = useQuery<{ ok: boolean; bounties: CodeBounty[]; lastRefresh: number; attemptsCount: number }>({
    queryKey: ["/api/code-bounties?limit=40"],
    refetchInterval: 5 * 60_000,
  });

  const affiliateLeads = leadsData?.leads ?? [];
  const free = freeData?.findings ?? [];
  const bounties = bountyData?.bounties ?? [];

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto space-y-5">
      <PageHeader icon={TrendingUp} title="Affiliate · Free · Bounties" subtitle="Real affiliate-classified leads, validated free offerings, and live public code bounties." iconColor="text-emerald-400" />

      <div className="grid grid-cols-3 gap-2">
        <GlassCard className="p-3 text-center">
          <div className="text-base font-bold font-mono text-emerald-400">{affiliateLeads.length}</div>
          <div className="text-[9px] text-slate-500 font-mono mt-1">AFFILIATE LEADS</div>
        </GlassCard>
        <GlassCard className="p-3 text-center">
          <div className="text-base font-bold font-mono text-cyan-400">{free.filter(f => f.validation === "ok" || f.validation === "redirect").length}</div>
          <div className="text-[9px] text-slate-500 font-mono mt-1">FREE (VALIDATED)</div>
        </GlassCard>
        <GlassCard className="p-3 text-center">
          <div className="text-base font-bold font-mono text-amber-400">{bounties.length}</div>
          <div className="text-[9px] text-slate-500 font-mono mt-1">CODE BOUNTIES</div>
        </GlassCard>
      </div>

      <Section title="Affiliate-classified leads" icon={<TrendingUp size={14} className="text-emerald-400" />}>
        {affiliateLeads.length === 0 ? (
          <Empty>No affiliate leads classified yet — they appear as the ingestion pipeline harvests qualifying URLs.</Empty>
        ) : (
          affiliateLeads.map(l => (
            <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="block">
              <GlassCard className="p-3 hover:bg-white/[0.04] transition">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{l.title || l.domain}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">{l.domain}</div>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400 shrink-0">${l.estimatedRewardUsd.low}–${l.estimatedRewardUsd.high}</div>
                  <ExternalLink size={11} className="text-slate-500 shrink-0" />
                </div>
              </GlassCard>
            </a>
          ))
        )}
      </Section>

      <Section title="Free / promo offers (Reddit-sourced, link-validated)" icon={<Gift size={14} className="text-cyan-400" />}>
        {free.length === 0 ? (
          <Empty>Free-stuff scraper warming up. Findings will appear here within a few minutes.</Empty>
        ) : (
          free.map(f => (
            <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="block">
              <GlassCard className="p-3 hover:bg-white/[0.04] transition">
                <div className="flex items-start gap-2">
                  <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full border font-mono uppercase mt-0.5", VALIDATION_STYLE[f.validation])}>{f.validation}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{f.title}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      {f.source}{f.flair ? ` · ${f.flair}` : ""} · ↑{f.score}
                    </div>
                  </div>
                  <ExternalLink size={11} className="text-slate-500 shrink-0" />
                </div>
              </GlassCard>
            </a>
          ))
        )}
      </Section>

      <Section title="Public code bounties (live GitHub search)" icon={<Code2 size={14} className="text-amber-400" />}>
        {bounties.length === 0 ? (
          <Empty>Bounty refresher warming up. Live GitHub bounty issues appear here every 20 minutes.</Empty>
        ) : (
          bounties.map(b => (
            <a key={b.id} href={b.htmlUrl} target="_blank" rel="noreferrer" className="block">
              <GlassCard className="p-3 hover:bg-white/[0.04] transition">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{b.title}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      {b.repoFullName} · {b.comments} comments · {b.labels.slice(0, 3).join(", ")}
                    </div>
                  </div>
                  {b.rewardHint && <div className="text-[10px] font-mono text-emerald-400 shrink-0">{b.rewardHint}</div>}
                  <ExternalLink size={11} className="text-slate-500 shrink-0" />
                </div>
              </GlassCard>
            </a>
          ))
        )}
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-bold text-slate-200">{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs text-slate-500 italic p-3 rounded-lg bg-white/[0.02] border border-white/5">{children}</div>
  );
}
