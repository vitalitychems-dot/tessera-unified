import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Brain, Search, Database, Cpu, RefreshCw, Zap, BookOpen, GitBranch, Shield, Network, Gem, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

document.title = "Knowledge Engine | Tessera";

const SOURCE_ICONS: Record<string, string> = {
  "arxiv_physics": "Physics",
  "arxiv_cs": "CS/AI",
  "wikipedia_quantum": "Wikipedia",
  "wikipedia_consciousness": "Wikipedia",
  "wikipedia_tesla": "Wikipedia",
  "github_trending": "GitHub",
  "hackernews": "HN",
  "sacred_geometry": "Sacred",
  "frequency_science": "Frequency",
  "mesh_knowledge": "Mesh",
  "sol_price": "Crypto",
  "btc_price": "Crypto",
  "synthesis": "Synthesis",
  "conference-proposal": "Conf Proposal",
  "conference-memory": "Conf Memory",
  "conference-result": "Conf Result",
  "sovereign": "Sovereign",
  "distilled": "Distilled",
  "evolution": "Evolution",
  "manual": "Manual",
};

const CATEGORY_ICONS: Record<string, typeof Brain> = {
  coding: Cpu,
  learning: BookOpen,
  security: Shield,
  networking: Network,
  perception: Gem,
  reasoning: Brain,
  memory: Database,
  economics: Zap,
  general: GitBranch,
};

export default function KnowledgeDashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ title: "", content: "", tags: "" });
  const [showAdd, setShowAdd] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/knowledge/stats"],
    refetchInterval: 30000,
  });

  const { data: searchResults } = useQuery<any>({
    queryKey: ["/api/knowledge/search", searchQuery],
    queryFn: () => fetch(`/api/knowledge/search?q=${encodeURIComponent(searchQuery)}&limit=15`).then(r => r.json()),
    enabled: searchQuery.length > 2,
  });

  const { data: capsData } = useQuery<any>({
    queryKey: ["/api/knowledge/capabilities"],
  });

  const refreshMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/knowledge/refresh"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/capabilities"] });
    },
  });

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/knowledge/add", {
      source: "manual",
      title: addForm.title,
      content: addForm.content,
      tags: addForm.tags.split(",").map(t => t.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/stats"] });
      setAddForm({ title: "", content: "", tags: "" });
      setShowAdd(false);
    },
  });

  const capabilities = capsData?.capabilities || [];
  const capsByCategory = capsData?.byCategory || {};
  const sources = stats?.sources || {};
  const recentRetrievals = stats?.recentRetrievals || [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-6xl mx-auto pb-24" data-testid="knowledge-dashboard">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Knowledge Engine</h1>
            <p className="text-xs text-muted-foreground">What Tessera actually knows — real data, real capabilities</p>
          </div>
        </div>
        <button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium hover:bg-violet-500/20 transition-colors flex items-center gap-1.5"
          data-testid="btn-refresh-index"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
          {refreshMutation.isPending ? "Rebuilding..." : "Rebuild Index"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Database} label="Knowledge Entries" value={stats?.totalEntries || 0} color="violet" />
        <StatCard icon={Cpu} label="Capabilities" value={capabilities.length} color="cyan" />
        <StatCard icon={BookOpen} label="Sources" value={Object.keys(sources).length} color="emerald" />
        <StatCard icon={Search} label="Retrievals" value={recentRetrievals.length} color="amber" />
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search knowledge — try 'quantum', 'security', 'income', 'consciousness'..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 text-sm"
            data-testid="input-knowledge-search"
          />
        </div>
      </div>

      {searchQuery.length > 2 && searchResults?.entries && (
        <div className="mb-6 space-y-2">
          <p className="text-xs text-muted-foreground">{searchResults.entries.length} results from {searchResults.totalSearched} entries</p>
          {searchResults.entries.map((entry: any, i: number) => (
            <div key={i} className="p-3 rounded-xl bg-card border border-border" data-testid={`search-result-${i}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-mono">{SOURCE_ICONS[entry.source] || entry.source}</span>
                {entry.score && <span className="text-[10px] text-muted-foreground">score: {entry.score.toFixed(3)}</span>}
              </div>
              {entry.title && <p className="text-sm font-medium text-foreground mb-0.5">{entry.title}</p>}
              <p className="text-xs text-muted-foreground leading-relaxed">{entry.content?.slice(0, 300)}</p>
              {entry.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {entry.tags.slice(0, 5).map((tag: string, ti: number) => (
                    <span key={ti} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="p-4 rounded-xl bg-card border border-border">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-violet-400" />
            Knowledge Sources
          </h3>
          <div className="space-y-1.5">
            {Object.entries(sources).sort(([,a]: any, [,b]: any) => b - a).map(([source, count]: any) => (
              <div key={source} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{SOURCE_ICONS[source] || source}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 rounded-full bg-violet-500/20 w-24">
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, (count / (stats?.totalEntries || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-foreground font-mono w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Capability Registry ({capabilities.length})
          </h3>
          <div className="space-y-1">
            {Object.entries(capsByCategory).map(([category, caps]: any) => {
              const Icon = CATEGORY_ICONS[category] || GitBranch;
              const isExpanded = expandedCat === category;
              return (
                <div key={category}>
                  <button
                    onClick={() => setExpandedCat(isExpanded ? null : category)}
                    className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-accent/50 transition-colors text-xs"
                    data-testid={`btn-cap-${category}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-foreground font-medium capitalize">{category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{caps.length}</span>
                      {isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="pl-6 py-1 space-y-0.5">
                      {caps.map((cap: any, i: number) => (
                        <div key={i} className="text-[11px] text-muted-foreground py-0.5 flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-cyan-500/50" />
                          {cap.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {recentRetrievals.length > 0 && (
        <div className="p-4 rounded-xl bg-card border border-border mb-6">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-amber-400" />
            Recent Knowledge Retrievals
          </h3>
          <div className="space-y-1">
            {recentRetrievals.slice().reverse().slice(0, 10).map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                <span className="text-muted-foreground truncate max-w-[60%]">{r.query}</span>
                <div className="flex items-center gap-3">
                  <span className="text-cyan-400 font-mono">{r.results} hits</span>
                  <span className="text-muted-foreground text-[10px]">{new Date(r.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          data-testid="btn-add-knowledge"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Knowledge Manually
        </button>
        {showAdd && (
          <div className="mt-3 p-4 rounded-xl bg-card border border-border space-y-3">
            <input
              value={addForm.title}
              onChange={e => setAddForm({ ...addForm, title: e.target.value })}
              placeholder="Title"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/30"
              data-testid="input-add-title"
            />
            <textarea
              value={addForm.content}
              onChange={e => setAddForm({ ...addForm, content: e.target.value })}
              placeholder="Knowledge content..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/30 resize-none"
              data-testid="input-add-content"
            />
            <input
              value={addForm.tags}
              onChange={e => setAddForm({ ...addForm, tags: e.target.value })}
              placeholder="Tags (comma-separated)"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/30"
              data-testid="input-add-tags"
            />
            <button
              onClick={() => addMutation.mutate()}
              disabled={!addForm.content || addMutation.isPending}
              className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-colors disabled:opacity-50"
              data-testid="btn-submit-knowledge"
            >
              {addMutation.isPending ? "Adding..." : "Add to Knowledge Engine"}
            </button>
          </div>
        )}
      </div>

      {statsLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  const colors: Record<string, string> = {
    violet: "from-violet-500/10 to-violet-500/5 border-violet-500/20 text-violet-400",
    cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400",
  };
  return (
    <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color]} border`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <Icon className="w-4 h-4 mb-1" />
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
