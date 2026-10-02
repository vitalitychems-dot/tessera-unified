import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Eye, Shield, Brain, TrendingUp, Database, Network, Heart, RefreshCw,
  Loader2, ChevronDown, ChevronRight, CheckCircle2, BookOpen, Lightbulb,
  BarChart3, Clock, Tag, ArrowRight, Users, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  optimization: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", dot: "bg-cyan-400" },
  governance: { bg: "bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-400", dot: "bg-violet-400" },
  security: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-400" },
  learning: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-400" },
  reliability: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", dot: "bg-amber-400" },
};

const MODULE_ICONS: Record<string, any> = {
  "LLM Router": Brain,
  "Swarm Intelligence": Network,
  "Security Fortress": Shield,
  "Improvement Engine": TrendingUp,
  "Memory Architecture": Database,
  "Fleet Coordinator": Network,
};

const EDU_MODULE_ICONS: Record<string, any> = {
  Brain, Network, Heart, TrendingUp, Database, Shield,
};

const EDU_MODULE_COLORS: Record<string, string> = {
  blue: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  rose: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  amber: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  purple: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  red: "text-red-400 border-red-500/30 bg-red-500/10",
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function DecisionCard({ entry }: { entry: any }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.optimization;
  const ModIcon = MODULE_ICONS[entry.module] || Brain;

  return (
    <div className={cn("rounded-xl border p-4 transition-all", cat.bg, cat.border)}>
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg border shrink-0", cat.bg, cat.border)}>
          <ModIcon size={14} className={cat.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn("text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", cat.bg, cat.border, cat.text)}>
              {entry.category}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">{entry.module}</span>
            <span className="ml-auto text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock size={9} /> {timeAgo(entry.timestamp)}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">{entry.decision}</h3>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              Confidence:
              <span className={cn("font-mono font-bold", entry.confidence >= 0.9 ? "text-emerald-400" : entry.confidence >= 0.7 ? "text-amber-400" : "text-red-400")}>
                {Math.round(entry.confidence * 100)}%
              </span>
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        {expanded ? "Hide" : "Show"} full rationale
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-border/20 pt-3">
          <div>
            <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider mb-1">Rationale</div>
            <p className="text-sm text-foreground/85 leading-relaxed">{entry.rationale}</p>
          </div>
          {entry.inputs?.length > 0 && (
            <div>
              <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider mb-1">Inputs Considered</div>
              <div className="flex flex-wrap gap-1">
                {entry.inputs.map((input: string, i: number) => (
                  <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded border border-border/30 bg-white/5 text-muted-foreground">{input}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider mb-1">Outcome</div>
            <p className="text-sm text-emerald-400/90 flex items-start gap-1.5">
              <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> {entry.outcome}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function EducationalCard({ mod }: { mod: any }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = EDU_MODULE_ICONS[mod.icon] || Brain;
  const colorCls = EDU_MODULE_COLORS[mod.color] || EDU_MODULE_COLORS.blue;

  return (
    <div className={cn("rounded-xl border p-4 transition-all cursor-pointer", colorCls)} onClick={() => setExpanded(!expanded)}>
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg border", colorCls)}>
          <Icon size={14} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{mod.title}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{mod.description}</p>
        </div>
        {expanded ? <ChevronDown size={12} className="text-muted-foreground shrink-0" /> : <ChevronRight size={12} className="text-muted-foreground shrink-0" />}
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/20">
          <p className="text-sm text-foreground/80 leading-relaxed">{mod.learnMore}</p>
        </div>
      )}
    </div>
  );
}

export default function TransparencyLedgerPage({ embedded }: { embedded?: boolean }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data, isLoading, refetch, isRefetching } = useQuery<any>({
    queryKey: ["/api/ux/transparency", selectedCategory],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "20" });
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      return fetch(`/api/ux/transparency?${params}`).then(r => r.json());
    },
    refetchInterval: 60000,
  });

  const entries: any[] = data?.entries || [];
  const categoryStats: Record<string, number> = data?.categoryStats || {};
  const educationalModules: any[] = data?.educationalModules || [];
  const onboardingSteps: any[] = data?.onboardingSteps || [];
  const avgConfidence = data?.avgConfidence || 0;
  const total = data?.total || 0;

  const categories = ["all", ...Object.keys(categoryStats)];

  const content = (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-24 md:pb-5">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Eye size={20} className="text-amber-400" />
              Transparency Ledger
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">System decisions, rationale, and educational resources</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
            <RefreshCw size={11} className={isRefetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/30 bg-black/20 p-3 text-center">
            <div className="text-xl font-bold text-foreground">{total}</div>
            <div className="text-[11px] text-muted-foreground">Decisions Logged</div>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
            <div className="text-xl font-bold text-emerald-400">{Math.round(avgConfidence * 100)}%</div>
            <div className="text-[11px] text-muted-foreground">Avg Confidence</div>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-center">
            <div className="text-xl font-bold text-cyan-400">{Object.keys(categoryStats).length}</div>
            <div className="text-[11px] text-muted-foreground">Categories</div>
          </div>
        </div>

        

        {true && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "text-[11px] font-mono px-2.5 py-1 rounded-full border transition-all capitalize",
                    selectedCategory === cat
                      ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                      : "border-border/40 bg-black/20 text-muted-foreground hover:border-amber-500/30 hover:text-foreground"
                  )}
                >
                  {cat}
                  {cat !== "all" && categoryStats[cat] ? ` (${categoryStats[cat]})` : ""}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-amber-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {entries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No decisions found</div>
                ) : entries.map((entry: any) => (
                  <DecisionCard key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </>
        )}

        {true && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Learn how each module in Tess works, why it exists, and what it does for you.</p>
            {educationalModules.map((mod: any) => (
              <EducationalCard key={mod.id} mod={mod} />
            ))}
          </div>
        )}

        {true && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">New here? Follow this guide to get the most out of Tess.</p>
            {onboardingSteps.map((step: any) => (
              <div key={step.step} className="rounded-xl border border-border/30 bg-black/20 p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full border border-amber-500/40 bg-amber-500/10 flex items-center justify-center text-sm font-bold text-amber-400 shrink-0">
                  {step.step}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-2">{step.description}</p>
                  <a
                    href={step.href}
                    className="inline-flex items-center gap-1.5 text-[12px] font-mono text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    {step.cta} <ArrowRight size={11} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      
      {content}
    </div>
  );
}
