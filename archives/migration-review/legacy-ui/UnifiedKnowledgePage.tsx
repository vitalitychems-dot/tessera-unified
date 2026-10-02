import { useQuery } from "@tanstack/react-query";
import { Brain, Lock, Sparkles, Lightbulb, Activity, BookOpen, Eye, ScrollText, Search, AlertTriangle, TrendingUp, Database, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import OmniscientKnowledgePage from "./OmniscientKnowledgePage";
import UniversalKnowledgePage from "./UniversalKnowledgePage";
import AgentSecretsPage from "./AgentSecretsPage";
import KnowledgeSecretsPage from "./KnowledgeSecretsPage";
import SecretKnowledgePage from "./SecretKnowledgePage";
import DiscoveriesPage from "./DiscoveriesPage";

function ContinuouslyLearningBadge({ recentCount }: { recentCount: number }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-[10px] text-emerald-300 font-semibold tracking-wide">Continuously Learning</span>
      {recentCount > 0 && (
        <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-400 px-1 py-0">
          +{recentCount}
        </Badge>
      )}
    </div>
  );
}

function LiveFeedSection() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/knowledge/stats"], refetchInterval: 30000 });
  const { data: liveFeed } = useQuery<any>({ queryKey: ["/api/knowledge/feed"], refetchInterval: 10000 });

  const feedEntries = Array.isArray(liveFeed) ? liveFeed : (liveFeed?.entries || liveFeed?.feed || []);
  const recentCount = Array.isArray(feedEntries) ? Math.min(feedEntries.length, 12) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap pb-2 border-b border-violet-500/10">
        <ContinuouslyLearningBadge recentCount={recentCount} />
        {stats && (
          <div className="flex gap-1.5">
            <Badge variant="outline" className="border-violet-500/50 text-violet-300 text-[10px]">
              <Brain className="w-3 h-3 mr-1" />{stats.totalEntries || 0} total
            </Badge>
            <Badge variant="outline" className="border-cyan-500/50 text-cyan-300 text-[10px]">
              <Lightbulb className="w-3 h-3 mr-1" />{stats.categories || 0} categories
            </Badge>
          </div>
        )}
        <span className="text-[9px] text-slate-600 ml-auto">Refreshes every 10s</span>
      </div>
      <OmniscientKnowledgePage embedded initialTab="live" />
    </div>
  );
}

function SecretsSection() {
  return (
    <div className="space-y-4">
      <AgentSecretsPage embedded />
      <KnowledgeSecretsPage embedded />
      <SecretKnowledgePage embedded />
    </div>
  );
}

function SpongeSection() {
  const { data: synthesis, isLoading: synthLoading } = useQuery<any>({
    queryKey: ["/workspace-api/api/sovereignty/knowledge/global-synthesis"],
    refetchInterval: 60000,
  });
  const { data: gaps } = useQuery<any>({
    queryKey: ["/workspace-api/api/sovereignty/knowledge/gaps"],
    refetchInterval: 60000,
  });
  const { data: maturities } = useQuery<any>({
    queryKey: ["/workspace-api/api/sovereignty/knowledge/domain-maturities"],
    refetchInterval: 60000,
  });
  const { data: sourceHealth } = useQuery<any>({
    queryKey: ["/workspace-api/api/sovereignty/knowledge/source-health"],
    refetchInterval: 30000,
  });

  const synthData = synthesis?.data || synthesis;
  const gapData = gaps?.data || gaps || [];
  const matData = maturities?.data || maturities || [];
  const healthData = sourceHealth?.data || sourceHealth || [];

  if (synthLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
        <span className="ml-2 text-sm text-slate-400">Loading knowledge sponge...</span>
      </div>
    );
  }

  const sevColors: Record<string, string> = {
    critical: "border-red-500/40 text-red-300 bg-red-950/20",
    high: "border-amber-500/40 text-amber-300 bg-amber-950/20",
    medium: "border-cyan-500/40 text-cyan-300 bg-cyan-950/20",
    low: "border-slate-500/40 text-slate-300 bg-slate-950/20",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="border-violet-500/20 bg-violet-950/20 p-3 text-center">
          <p className="text-lg font-bold text-violet-300">{synthData?.totalNodes || 0}</p>
          <p className="text-[9px] text-slate-500 flex items-center justify-center gap-1"><Database size={8} />Nodes Absorbed</p>
        </Card>
        <Card className="border-cyan-500/20 bg-cyan-950/20 p-3 text-center">
          <p className="text-lg font-bold text-cyan-300">{synthData?.totalDomains || 0}</p>
          <p className="text-[9px] text-slate-500 flex items-center justify-center gap-1"><Brain size={8} />Domains</p>
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-950/20 p-3 text-center">
          <p className="text-lg font-bold text-emerald-300">{synthData?.avgCoverage || 0}%</p>
          <p className="text-[9px] text-slate-500 flex items-center justify-center gap-1"><TrendingUp size={8} />Avg Coverage</p>
        </Card>
        <Card className="border-amber-500/20 bg-amber-950/20 p-3 text-center">
          <p className="text-lg font-bold text-amber-300">{synthData?.sourceHealthSummary?.healthy || 0}/{synthData?.sourceHealthSummary?.total || 0}</p>
          <p className="text-[9px] text-slate-500 flex items-center justify-center gap-1"><Activity size={8} />Sources Healthy</p>
        </Card>
      </div>

      {synthData?.topInsights?.length > 0 && (
        <Card className="border-emerald-500/20 bg-emerald-950/10 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={12} className="text-emerald-400" />
            <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider">Top Insights</span>
          </div>
          <div className="space-y-1.5">
            {synthData.topInsights.map((insight: string, i: number) => (
              <p key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <Lightbulb size={10} className="text-emerald-400 mt-0.5 shrink-0" />
                {insight}
              </p>
            ))}
          </div>
        </Card>
      )}

      {synthData?.maturityDistribution && (
        <Card className="border-violet-500/20 bg-violet-950/10 p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={12} className="text-violet-400" />
            <span className="text-[10px] font-mono font-bold text-violet-300 uppercase tracking-wider">Domain Maturity</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(synthData.maturityDistribution).map(([level, count]) => (
              <Badge key={level} variant="outline" className="text-[9px] border-violet-500/30 text-violet-300">
                {level}: {count as number}
              </Badge>
            ))}
          </div>
          {matData.length > 0 && (
            <div className="mt-2 space-y-1">
              {matData.slice(0, 8).map((m: any) => (
                <div key={m.domain} className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-400 w-24 truncate">{m.domain}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{ width: `${Math.min(100, (m.coverage || 0))}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-violet-300 w-10 text-right">{m.level}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {Array.isArray(gapData) && gapData.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-950/10 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={12} className="text-amber-400" />
            <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">Knowledge Gaps ({gapData.length})</span>
          </div>
          <div className="space-y-1.5">
            {gapData.slice(0, 8).map((gap: any, i: number) => (
              <div key={i} className={cn("rounded-lg border p-2", sevColors[gap.severity] || sevColors.low)}>
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge variant="outline" className="text-[8px] border-current px-1 py-0">{gap.severity}</Badge>
                  <span className="text-[10px] font-medium">{gap.domain}</span>
                  <span className="text-[8px] ml-auto opacity-70">{gap.gapType}</span>
                </div>
                <p className="text-[9px] opacity-80">{gap.suggestion}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {Array.isArray(healthData) && healthData.length > 0 && (
        <Card className="border-cyan-500/20 bg-cyan-950/10 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Database size={12} className="text-cyan-400" />
            <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider">Live Sources</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            {healthData.map((src: any) => (
              <div key={src.sourceId || src.name} className={cn(
                "rounded-lg border p-1.5 text-center",
                src.healthy ? "border-emerald-500/30 bg-emerald-950/10" : "border-red-500/30 bg-red-950/10"
              )}>
                <span className="relative flex h-1.5 w-1.5 mx-auto mb-1">
                  <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", src.healthy ? "bg-emerald-500" : "bg-red-500")} />
                </span>
                <p className="text-[9px] text-slate-300 truncate">{src.name}</p>
                <p className="text-[8px] text-slate-500">{src.totalPolled || src.requestCount || 0} req</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function UnifiedKnowledgePage({ embedded }: { embedded?: boolean }) {
  return (
    <div
      className={cn("flex flex-col", embedded ? "" : "min-h-screen")}
      data-testid="unified-knowledge-page"
    >
      <div className="px-4 pt-4 pb-0 border-b border-violet-500/20 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-violet-400" />
          <h1 className="text-lg font-semibold text-slate-200" data-testid="heading-unified-knowledge">
            Knowledge Hub
          </h1>
          <Badge variant="outline" className="text-violet-400 border-violet-500/30 text-[10px] ml-auto">
            Unified
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        <div className="p-3 space-y-6">
          <LiveFeedSection />
          <div className="border-t border-violet-500/10 pt-4">
            <SpongeSection />
          </div>
          <div className="border-t border-violet-500/10 pt-4">
            <UniversalKnowledgePage embedded />
          </div>
          <div className="border-t border-violet-500/10 pt-4">
            <SecretsSection />
          </div>
          <div className="border-t border-violet-500/10 pt-4">
            <DiscoveriesPage embedded />
          </div>
          <div className="border-t border-violet-500/10 pt-4">
            <OmniscientKnowledgePage embedded initialTab="synthesis" />
          </div>
        </div>
      </div>
    </div>
  );
}
