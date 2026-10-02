import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import {
  BookOpen, Search, Activity, BarChart3, Archive, CheckCircle2,
  Loader2, RefreshCw, Database, Zap, Clock, TrendingUp, Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

function timeSince(ms: number | string | undefined | null): string {
  if (ms == null) return "just now";
  let num: number;
  if (typeof ms === "string") {
    const parsed = Number(ms);
    num = Number.isFinite(parsed) ? parsed : new Date(ms).getTime();
  } else {
    num = ms;
  }
  if (!Number.isFinite(num)) return "just now";
  const d = Date.now() - num;
  if (d < 0 || !Number.isFinite(d)) return "just now";
  if (d < 60000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

const TYPE_COLORS: Record<string, string> = {
  training: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  benchmark: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  discussion: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  research: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  capability: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};

export default function KnowledgeBasePage() {
  useEffect(() => { document.title = "Knowledge Base | Tessera"; }, []);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<any>({
    queryKey: ["/api/knowledge/stats"],
    refetchInterval: 30000,
  });

  const { data: entries = [], isLoading: entriesLoading, refetch: refetchEntries } = useQuery<any[]>({
    queryKey: ["/api/knowledge/entries", typeFilter],
    queryFn: () => fetch(`/api/knowledge/entries?limit=50${typeFilter ? `&type=${typeFilter}` : ""}`).then(r => r.json()),
    refetchInterval: 60000,
  });

  const { data: feed = [], isLoading: feedLoading } = useQuery<any[]>({
    queryKey: ["/api/knowledge/feed"],
    refetchInterval: 10000,
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/knowledge/entries/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/stats"] });
    },
  });

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await apiRequest("POST", "/api/knowledge/retrieve", { query, topN: 8, agentId: "user-search" });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {}
    setSearching(false);
  };

  const displayEntries = searchResults.length > 0 ? searchResults : entries;

  return (
    <div className="flex h-full bg-background" data-testid="knowledge-base-page">
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
                <BookOpen size={20} className="text-emerald-400" />
                Knowledge Base
              </h1>
              <p className="text-[12px] text-muted-foreground font-mono mt-0.5">
                Indexed agent knowledge · semantic retrieval · injection pipeline
              </p>
            </div>
            <button onClick={() => { refetchStats(); refetchEntries(); }} className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground" data-testid="button-refresh-kb">
              <RefreshCw size={14} />
            </button>
          </div>

          {statsLoading ? (
            <div className="py-4 text-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" /></div>
          ) : stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Total Entries", value: stats.totalEntries || 0, icon: Database, color: "cyan" },
                { label: "Active", value: stats.activeEntries || 0, icon: CheckCircle2, color: "green" },
                { label: "Utilization", value: `${(stats.utilizationRate || 0).toFixed(1)}%`, icon: BarChart3, color: "violet" },
                { label: "Used Today", value: stats.recentlyUsed || 0, icon: TrendingUp, color: "orange" },
                { label: "Feed Events", value: stats.feedEvents || 0, icon: Activity, color: "emerald" },
              ].map(stat => (
                <div key={stat.label} className={cn("rounded-xl border p-3",
                  stat.color === "cyan" ? "border-cyan-500/20 bg-cyan-500/5" :
                  stat.color === "green" ? "border-green-500/20 bg-green-500/5" :
                  stat.color === "violet" ? "border-violet-500/20 bg-violet-500/5" :
                  stat.color === "orange" ? "border-orange-500/20 bg-orange-500/5" :
                  "border-emerald-500/20 bg-emerald-500/5")}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">{stat.label}</span>
                    <stat.icon size={11} className="text-muted-foreground/50" />
                  </div>
                  <div className="text-lg font-bold font-mono text-foreground" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={e => { setQuery(e.target.value); if (!e.target.value) setSearchResults([]); }}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="Search knowledge semantically..."
                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/40"
                    data-testid="input-kb-search"
                  />
                </div>
                <button onClick={handleSearch} disabled={searching || !query.trim()}
                  data-testid="button-kb-search"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-mono hover:bg-emerald-500/15 disabled:opacity-50 transition-all">
                  {searching ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                  Retrieve
                </button>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {["", "training", "benchmark", "research", "capability"].map(type => (
                  <button key={type || "all"} onClick={() => { setTypeFilter(type); setSearchResults([]); }}
                    data-testid={`filter-${type || "all"}`}
                    className={cn("px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all",
                      typeFilter === type ? "bg-white/10 border-white/20 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5")}>
                    <Filter size={9} className="inline mr-1" />{type || "All Types"}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-border/20 bg-background/30 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border/10 flex items-center gap-2">
                  <Database size={12} className="text-emerald-400" />
                  <span className="text-xs font-bold font-mono text-emerald-400">
                    {searchResults.length > 0 ? `${searchResults.length} Search Results` : `Knowledge Entries (${displayEntries.length})`}
                  </span>
                  {(entriesLoading || searching) && <Loader2 size={11} className="animate-spin text-muted-foreground ml-auto" />}
                </div>
                <div className="divide-y divide-border/10 max-h-[420px] overflow-y-auto">
                  {displayEntries.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground font-mono">
                      {entriesLoading ? "Loading..." : "No entries found"}
                    </div>
                  ) : displayEntries.map((entry: any, i: number) => (
                    <motion.div key={entry.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="px-4 py-3 hover:bg-white/2 transition-colors"
                      data-testid={`kb-entry-${i}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-mono font-bold uppercase", TYPE_COLORS[entry.type] || TYPE_COLORS.capability)}>
                              {entry.type}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">{entry.source}</span>
                            {entry.usageCount > 0 && (
                              <span className="text-[10px] text-emerald-400 font-mono">{entry.usageCount}x used</span>
                            )}
                          </div>
                          <p className="text-[12px] font-mono text-foreground/80 line-clamp-2 leading-relaxed">{entry.content}</p>
                          {entry.tags?.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {entry.tags.slice(0, 4).map((tag: string) => (
                                <span key={tag} className="text-[9px] px-1 py-0.5 rounded bg-white/5 text-muted-foreground font-mono">{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        {entry.status === "active" && (
                          <button onClick={() => archiveMutation.mutate({ id: entry.id, status: "archived" })}
                            disabled={archiveMutation.isPending}
                            data-testid={`button-archive-${entry.id}`}
                            className="shrink-0 p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all">
                            <Archive size={11} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
                <div className="px-3 py-2.5 border-b border-emerald-500/10 flex items-center gap-2">
                  <Activity size={12} className="text-emerald-400" />
                  <span className="text-xs font-bold font-mono text-emerald-400">Live Knowledge Feed</span>
                  {feedLoading && <Loader2 size={10} className="animate-spin text-muted-foreground ml-auto" />}
                </div>
                <div className="divide-y divide-border/10 max-h-[240px] overflow-y-auto">
                  {feed.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground font-mono">
                      <Clock size={16} className="mx-auto mb-1.5 opacity-50" />
                      Waiting for knowledge retrieval events...
                    </div>
                  ) : feed.slice(0, 20).map((event: any, i: number) => (
                    <div key={i} className="px-3 py-2" data-testid={`feed-event-${i}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-[10px] text-emerald-400 font-mono truncate flex-1">{event.agentId}</span>
                        <span className="text-[9px] text-muted-foreground font-mono shrink-0">{timeSince(event.usedAt)}</span>
                      </div>
                      <div className="text-[11px] text-foreground/70 font-mono line-clamp-1 pl-3.5">{event.querySnippet}</div>
                    </div>
                  ))}
                </div>
              </div>

              {stats?.byType && (
                <div className="rounded-xl border border-border/20 bg-background/30 p-3">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">By Type</div>
                  {Object.entries(stats.byType).map(([type, count]: [string, any]) => (
                    <div key={type} className="flex items-center gap-2 py-1">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-mono font-bold uppercase", TYPE_COLORS[type] || TYPE_COLORS.capability)}>
                        {type}
                      </span>
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500/40 rounded-full" style={{ width: `${Math.min(100, (count / (stats.totalEntries || 1)) * 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
