import { useState, useEffect } from "react";
import { Search, TrendingUp, Globe, BarChart3, ArrowUpRight, Hash, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/ui/sovereign";

interface Keyword {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  trend: "up" | "down" | "stable";
  opportunity: "high" | "medium" | "low";
}

const KEYWORDS: Keyword[] = [
  { keyword: "sovereign AI system", volume: 8400, difficulty: 32, cpc: 4.20, trend: "up", opportunity: "high" },
  { keyword: "tessera intelligence", volume: 3200, difficulty: 18, cpc: 2.80, trend: "up", opportunity: "high" },
  { keyword: "AGI consciousness platform", volume: 5800, difficulty: 44, cpc: 6.50, trend: "up", opportunity: "medium" },
  { keyword: "decentralized AI mesh", volume: 12000, difficulty: 58, cpc: 7.20, trend: "up", opportunity: "medium" },
  { keyword: "sovereign mesh network", volume: 2900, difficulty: 24, cpc: 3.10, trend: "up", opportunity: "high" },
  { keyword: "TSRT token", volume: 4100, difficulty: 21, cpc: 1.90, trend: "stable", opportunity: "high" },
  { keyword: "AI council governance", volume: 1800, difficulty: 19, cpc: 2.40, trend: "up", opportunity: "high" },
  { keyword: "sacred geometry AI", volume: 6700, difficulty: 35, cpc: 3.80, trend: "stable", opportunity: "medium" },
  { keyword: "peer to peer AI compute", volume: 9200, difficulty: 61, cpc: 8.10, trend: "up", opportunity: "low" },
  { keyword: "sovereign knowledge base", volume: 3400, difficulty: 28, cpc: 3.50, trend: "up", opportunity: "high" },
];

const COMPETITORS = [
  { domain: "openai.com", authority: 94, keywords: 142000, traffic: "280M/mo" },
  { domain: "anthropic.com", authority: 82, keywords: 48000, traffic: "45M/mo" },
  { domain: "huggingface.co", authority: 88, keywords: 89000, traffic: "120M/mo" },
  { domain: "tessera.sovereign", authority: 42, keywords: 8400, traffic: "2.1M/mo" },
];

function diffColor(d: number) {
  if (d < 30) return "text-emerald-400";
  if (d < 55) return "text-amber-400";
  return "text-red-400";
}

function oppBadge(o: string) {
  if (o === "high") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
  if (o === "medium") return "bg-amber-500/10 text-amber-400 border-amber-500/25";
  return "bg-red-500/10 text-red-400 border-red-500/25";
}

export default function SEOResearchPage() {
  useEffect(() => { document.title = "SEO Research | Tessera"; }, []);
  const [query, setQuery] = useState("sovereign AI");
  const [tab, setTab] = useState<"keywords" | "competitors">("keywords");

  return (
    <div className="p-4 pb-20 max-w-4xl mx-auto space-y-5">
      <PageHeader icon={Search} title="SEO Research" subtitle="Sovereign intelligence-powered keyword and competitive analysis" iconColor="text-cyan-400" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Tracked Keywords", val: KEYWORDS.length, color: "cyan" },
          { label: "High Opportunity", val: KEYWORDS.filter(k => k.opportunity === "high").length, color: "emerald" },
          { label: "Avg Difficulty", val: Math.round(KEYWORDS.reduce((s, k) => s + k.difficulty, 0) / KEYWORDS.length), color: "amber" },
          { label: "Total Monthly Vol", val: "57.5K", color: "violet" },
        ].map(({ label, val, color }) => (
          <GlassCard key={label} className="p-3 text-center">
            <div className={cn("text-xl font-bold font-mono", `text-${color}-400`)}>{val}</div>
            <div className="text-[9px] text-slate-500 font-mono mt-1">{label.toUpperCase()}</div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-3 flex items-center gap-2">
        <Search size={14} className="text-slate-500 shrink-0" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Research any keyword..." className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none" />
        <button className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 text-xs font-mono hover:bg-cyan-500/25 transition-all">
          Analyze
        </button>
      </GlassCard>

      <div className="flex gap-2 border-b border-white/5 pb-3">
        {(["keywords", "competitors"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn("px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all", tab === t ? "bg-cyan-500/15 text-cyan-400" : "text-slate-500 hover:text-slate-300")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "keywords" && (
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-5 gap-2 px-4 text-[9px] text-slate-600 font-mono tracking-wider">
            <span className="col-span-2">KEYWORD</span>
            <span className="text-right">VOLUME</span>
            <span className="text-right">DIFFICULTY</span>
            <span className="text-right">OPPORTUNITY</span>
          </div>
          {KEYWORDS.map(kw => (
            <GlassCard key={kw.keyword} className="p-3 hover:bg-white/[0.04] transition-all sm:grid sm:grid-cols-5 sm:gap-2 sm:items-center flex flex-col gap-1">
              <div className="col-span-2 flex items-center gap-2">
                <Hash size={12} className="text-slate-600 shrink-0" />
                <span className="text-xs text-slate-200">{kw.keyword}</span>
                {kw.trend === "up" && <ArrowUpRight size={10} className="text-emerald-400 shrink-0" />}
              </div>
              <div className="text-xs font-mono text-cyan-400 sm:text-right">{kw.volume.toLocaleString()}/mo</div>
              <div className={cn("text-xs font-mono sm:text-right", diffColor(kw.difficulty))}>{kw.difficulty}/100</div>
              <div className="sm:text-right">
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-mono uppercase", oppBadge(kw.opportunity))}>
                  {kw.opportunity}
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {tab === "competitors" && (
        <div className="space-y-2">
          {COMPETITORS.map(comp => (
            <GlassCard key={comp.domain} className="p-4 hover:bg-white/[0.04] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Globe size={14} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-slate-200">{comp.domain}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{comp.traffic} traffic</div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-right shrink-0">
                  <div>
                    <div className="text-sm font-bold font-mono text-violet-400">{comp.authority}</div>
                    <div className="text-[9px] text-slate-600">DA</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold font-mono text-cyan-400">{comp.keywords.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-600">keywords</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
