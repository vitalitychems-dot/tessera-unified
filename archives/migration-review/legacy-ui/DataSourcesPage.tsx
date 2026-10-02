import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database, Play, RefreshCw, Plus, Trash2, CheckCircle, XCircle,
  Clock, Activity, Globe, Rss, Code2, AlertTriangle, Search, ChevronDown, ChevronRight,
  ToggleLeft, ToggleRight, Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

interface DataSource {
  id: number;
  name: string;
  type: string;
  url: string | null;
  enabled: boolean;
  intervalSeconds: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  totalRuns: number;
  totalIngested: number;
  createdAt: string;
  updatedAt: string;
}

interface IngestionJob {
  id: number;
  sourceName: string;
  status: string;
  itemsIngested: number;
  itemsSkipped: number;
  errors: string[];
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

interface IngestedItem {
  id: number;
  source: string;
  sourceType: string;
  title: string | null;
  content: string;
  url: string | null;
  tags: string[];
  ingestedAt: string;
}

interface IngestionStats {
  totalItems: number;
  bySource: { source: string; count: number }[];
  byType: { sourceType: string; count: number }[];
  sources: DataSource[];
  recentJobs: IngestionJob[];
  jobStats: { total: number; success: number; failed: number };
}

const SOURCE_TYPE_ICONS: Record<string, typeof Globe> = {
  api: Globe,
  rss: Rss,
  manual: Code2,
};

const SOURCE_TYPE_COLORS: Record<string, string> = {
  api: "text-cyan-400 border-cyan-500/30 bg-cyan-950/20",
  rss: "text-orange-400 border-orange-500/30 bg-orange-950/20",
  manual: "text-violet-400 border-violet-500/30 bg-violet-950/20",
};

function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatInterval(seconds: number): string {
  if (seconds < 3600) return `${seconds / 60}m`;
  if (seconds < 86400) return `${seconds / 3600}h`;
  return `${seconds / 86400}d`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SourceCard({ source, onToggle, onTrigger, onDelete }: {
  source: DataSource;
  onToggle: (id: number, enabled: boolean) => void;
  onTrigger: (name: string) => void;
  onDelete: (id: number) => void;
}) {
  const Icon = SOURCE_TYPE_ICONS[source.type] || Globe;
  const colorClass = SOURCE_TYPE_COLORS[source.type] || SOURCE_TYPE_COLORS.api;

  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
  return (
    <Card className={`border-slate-700/30 bg-slate-900/40 p-4`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${colorClass} shrink-0`}>
          <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-200 truncate">{source.name}</span>
            <Badge variant="outline" className={`text-[9px] ${colorClass}`}>{source.type.toUpperCase()}</Badge>
            {source.lastError && (
              <Badge variant="outline" className="text-[9px] text-red-400 border-red-500/30">ERROR</Badge>
            )}
          </div>
          {source.url && (
            <p className="text-[10px] text-slate-600 truncate mt-0.5">{source.url}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-mono flex-wrap">
            <span className="flex items-center gap-1"><Clock size={10} />{formatInterval(source.intervalSeconds)} interval</span>
            <span className="flex items-center gap-1"><Activity size={10} />{source.totalRuns} runs</span>
            <span className="flex items-center gap-1"><Zap size={10} />{source.totalIngested} ingested</span>
            <span>Last: {timeAgo(source.lastRunAt)}</span>
          </div>
          {source.lastError && (
            <p className="text-[10px] text-red-400/70 mt-1 truncate">{source.lastError}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggle(source.id, !source.enabled)}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
            title={source.enabled ? "Disable" : "Enable"}
          >
            {source.enabled ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
          </button>
          <button
            onClick={() => onTrigger(source.name)}
            className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
            title="Run now"
          >
            <Play size={14} />
          </button>
          <button
            onClick={() => onDelete(source.id)}
            className="text-slate-500 hover:text-red-400 transition-colors p-1"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function DataSourcesPage({ embedded }: { embedded?: boolean }) {
  const activeTab = "all" as any;
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<IngestionStats>({
    queryKey: ["/api/ingestion/stats"],
    refetchInterval: 30000,
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery<{ jobs: IngestionJob[]; count: number }>({
    queryKey: ["/api/ingestion/jobs"],
    refetchInterval: 10000,
  });

  const { data: dataResult, isLoading: dataLoading } = useQuery<{ data: IngestedItem[]; count: number; total: number }>({
    queryKey: ["/api/ingestion/data", searchQuery, sourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (searchQuery) params.set("search", searchQuery);
      if (sourceFilter) params.set("source", sourceFilter);
      const res = await apiRequest("GET", `/api/ingestion/data?${params}`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: availableSources } = useQuery<{ sources: string[] }>({
    queryKey: ["/api/ingestion/sources/available"],
  });

  const triggerMutation = useMutation({
    mutationFn: (sourceName: string) => apiRequest("POST", `/api/ingestion/trigger/${encodeURIComponent(sourceName)}`, {}),
    onSuccess: async (res, sourceName) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/data"] });
      toast({ title: `${sourceName} ingested`, description: `${data.ingested} new items, ${data.skipped} skipped` });
    },
    onError: (err: Error) => toast({ title: "Ingestion failed", description: err.message, variant: "destructive" }),
  });

  const triggerAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ingestion/trigger-all", {}),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/data"] });
      const total = Object.values(data.results as Record<string, any>).reduce((sum: number, r: any) => sum + r.ingested, 0);
      toast({ title: "All sources ingested", description: `${total} total new items` });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      apiRequest("PATCH", `/api/ingestion/sources/${id}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/ingestion/stats"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ingestion/sources/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/stats"] });
      toast({ title: "Source deleted" });
    },
  });

  const addRssMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ingestion/rss", { name: newFeedName, url: newFeedUrl }),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/data"] });
      toast({ title: "RSS feed added", description: `${data.ingested} items ingested` });
      setNewFeedName("");
      setNewFeedUrl("");
    },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const sources = stats?.sources || [];
  const jobs = jobsData?.jobs || [];
  const ingestedData = dataResult?.data || [];
  const uniqueSources = [...new Set(ingestedData.map(d => d.source))];

  return (
    <div className={embedded ? "" : "h-[calc(100vh-44px)] flex flex-col"}>
      <div className="p-4 border-b border-cyan-500/20 shrink-0 bg-slate-950/40">
        <div className="flex items-center gap-2 mb-2">
          <Database size={18} className="text-cyan-400" />
          <h1 className="text-lg font-semibold text-slate-200">Data Sources</h1>
          <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 text-[10px] ml-auto">
            {stats?.totalItems ?? 0} items ingested
          </Badge>
          <Button
            size="sm"
            onClick={() => triggerAllMutation.mutate()}
            disabled={triggerAllMutation.isPending}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs"
          >
            <Play size={12} className="mr-1" />
            {triggerAllMutation.isPending ? "Running..." : "Run All"}
          </Button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Unified data ingestion — public APIs, RSS feeds, research papers, market data. All normalized into the vector knowledge base.
        </p>

        {stats && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: "Total Items", value: stats.totalItems, color: "text-cyan-400" },
              { label: "Sources", value: sources.length, color: "text-emerald-400" },
              { label: "Jobs Run", value: stats.jobStats.total, color: "text-violet-400" },
              { label: "Success Rate", value: stats.jobStats.total > 0 ? `${Math.round(stats.jobStats.success / stats.jobStats.total * 100)}%` : "—", color: "text-amber-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg border border-slate-700/30 bg-slate-900/40 p-2 text-center">
                <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
                <div className="text-[9px] font-mono text-slate-600">{label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1.5 flex-wrap">
          {(["overview", "sources", "jobs", "data", "add"] as const).map(tab => (
            <button
              key={tab}
              
              className={`text-[10px] px-2 py-1 rounded-md border transition-colors capitalize ${
                activeTab === tab
                  ? "bg-cyan-700/50 border-cyan-500/40 text-cyan-200"
                  : "border-slate-700/40 text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {(
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="border-slate-700/30 bg-slate-900/40 p-4">
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">By Source Type</div>
                  {(stats?.byType || []).map(t => (
                    <div key={t.sourceType} className="flex items-center justify-between py-1">
                      <span className="text-xs text-slate-300">{t.sourceType.toUpperCase()}</span>
                      <span className="text-xs font-mono text-cyan-400">{t.count}</span>
                    </div>
                  ))}
                </Card>
                <Card className="border-slate-700/30 bg-slate-900/40 p-4">
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">Top Sources</div>
                  {(stats?.bySource || []).slice(0, 8).map(s => (
                    <div key={s.source} className="flex items-center justify-between py-1">
                      <span className="text-[11px] text-slate-300 truncate max-w-[60%]">{s.source}</span>
                      <span className="text-xs font-mono text-emerald-400">{s.count}</span>
                    </div>
                  ))}
                </Card>
              </div>

              <Card className="border-slate-700/30 bg-slate-900/40 p-4">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">Recent Jobs</div>
                <div className="space-y-1.5">
                  {(stats?.recentJobs || []).slice(0, 5).map(job => (
                    <div key={job.id} className="flex items-center gap-2 text-[11px]">
                      {job.status === "completed" ? (
                        <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                      ) : job.status === "failed" ? (
                        <XCircle size={12} className="text-red-400 shrink-0" />
                      ) : (
                        <RefreshCw size={12} className="text-amber-400 animate-spin shrink-0" />
                      )}
                      <span className="text-slate-300 truncate flex-1">{job.sourceName}</span>
                      <span className="text-emerald-400 font-mono shrink-0">+{job.itemsIngested}</span>
                      <span className="text-slate-600 font-mono shrink-0">{formatDuration(job.durationMs)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {(
            <>
              {statsLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-500">
                  <RefreshCw size={16} className="animate-spin mr-2" />Loading...
                </div>
              ) : (
                <div className="space-y-2">
                  {sources.map(source => (
                    <SourceCard
                      key={source.id}
                      source={source}
                      onToggle={(id, enabled) => toggleMutation.mutate({ id, enabled })}
                      onTrigger={(name) => triggerMutation.mutate(name)}
                      onDelete={(id) => deleteMutation.mutate(id)}
                    />
                  ))}
                  {!sources.length && (
                    <div className="text-center py-8 text-slate-500 text-sm">No sources configured yet. Add some in the "Add" tab.</div>
                  )}
                </div>
              )}
            </>
          )}

          {(
            <>
              {jobsLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-500">
                  <RefreshCw size={16} className="animate-spin mr-2" />Loading...
                </div>
              ) : (
                <div className="space-y-2">
                  {jobs.map(job => (
                    <Card key={job.id} className={`border p-3 ${
                      job.status === "completed" ? "border-emerald-500/20 bg-emerald-950/10" :
                      job.status === "failed" ? "border-red-500/20 bg-red-950/10" :
                      "border-slate-700/30 bg-slate-900/40"
                    }`}>
                      <div className="flex items-center gap-2">
                        {job.status === "completed" ? (
                          <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                        ) : job.status === "failed" ? (
                          <XCircle size={14} className="text-red-400 shrink-0" />
                        ) : (
                          <RefreshCw size={14} className="text-amber-400 animate-spin shrink-0" />
                        )}
                        <span className="text-sm font-semibold text-slate-200 flex-1 truncate">{job.sourceName}</span>
                        <span className="text-[10px] font-mono text-slate-500">{new Date(job.startedAt).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] font-mono">
                        <span className="text-emerald-400">+{job.itemsIngested} new</span>
                        <span className="text-slate-500">{job.itemsSkipped} skipped</span>
                        <span className="text-slate-600">{formatDuration(job.durationMs)}</span>
                      </div>
                      {job.errors && job.errors.length > 0 && (
                        <p className="text-[10px] text-red-400/70 mt-1 truncate">{job.errors[0]}</p>
                      )}
                    </Card>
                  ))}
                  {!jobs.length && (
                    <div className="text-center py-8 text-slate-500 text-sm">No ingestion jobs yet. Trigger a source to start.</div>
                  )}
                </div>
              )}
            </>
          )}

          {(
            <>
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search ingested data..."
                    className="bg-slate-950/60 border-slate-700/40 text-slate-200 text-xs pl-8 h-8"
                  />
                </div>
                <select
                  value={sourceFilter}
                  onChange={e => setSourceFilter(e.target.value)}
                  className="bg-slate-950/60 border border-slate-700/40 text-slate-400 text-xs rounded-md px-2 h-8"
                >
                  <option value="">All sources</option>
                  {uniqueSources.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {dataLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-500">
                  <RefreshCw size={16} className="animate-spin mr-2" />Loading...
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-600 font-mono">{dataResult?.total ?? 0} total items — showing {ingestedData.length}</p>
                  {ingestedData.map(item => (
                    <Card key={item.id} className="border-slate-700/30 bg-slate-900/40 p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="outline" className={`text-[9px] ${SOURCE_TYPE_COLORS[item.sourceType] || SOURCE_TYPE_COLORS.api}`}>
                              {item.source}
                            </Badge>
                            {(item.tags || []).slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-[9px] text-slate-500 border-slate-700/40">
                                {tag}
                              </Badge>
                            ))}
                            <span className="text-[9px] text-slate-700 ml-auto">{timeAgo(item.ingestedAt)}</span>
                          </div>
                          {item.title && (
                            <p className="text-xs font-semibold text-slate-300 mb-1 line-clamp-1">{item.title}</p>
                          )}
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{item.content}</p>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-cyan-600 hover:text-cyan-400 truncate block mt-1"
                            >
                              {item.url.length > 80 ? item.url.slice(0, 80) + "..." : item.url}
                            </a>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {!ingestedData.length && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      No data found. {searchQuery ? "Try a different search." : "Trigger some sources to start ingesting."}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {(
            <div className="space-y-4 max-w-lg">
              <Card className="border-cyan-500/20 bg-cyan-950/10 p-4">
                <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Rss size={12} /> Add RSS / Atom Feed
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block">Feed Name</label>
                    <Input
                      value={newFeedName}
                      onChange={e => setNewFeedName(e.target.value)}
                      placeholder="e.g. TechCrunch, Nature News..."
                      className="bg-slate-950/60 border-slate-700/40 text-slate-200 text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block">Feed URL</label>
                    <Input
                      value={newFeedUrl}
                      onChange={e => setNewFeedUrl(e.target.value)}
                      placeholder="https://example.com/feed.rss"
                      className="bg-slate-950/60 border-slate-700/40 text-slate-200 text-xs h-8"
                    />
                  </div>
                  <Button
                    onClick={() => addRssMutation.mutate()}
                    disabled={!newFeedName || !newFeedUrl || addRssMutation.isPending}
                    className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs h-8"
                  >
                    {addRssMutation.isPending ? "Adding..." : "Add & Ingest Feed"}
                  </Button>
                </div>
              </Card>

              <Card className="border-slate-700/30 bg-slate-900/40 p-4">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Globe size={12} /> Built-in API Sources
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  These sources are pre-configured and can be triggered manually or on schedule.
                </p>
                <div className="space-y-1">
                  {(availableSources?.sources || []).map(name => (
                    <div key={name} className="flex items-center justify-between py-1.5 border-b border-slate-800/40">
                      <span className="text-xs text-slate-300">{name}</span>
                      <Button
                        size="sm"
                        onClick={() => triggerMutation.mutate(name)}
                        disabled={triggerMutation.isPending}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] h-6 px-2"
                      >
                        <Play size={10} className="mr-1" />Run
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
