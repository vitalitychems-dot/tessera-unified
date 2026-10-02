import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Brain, Search, Database, Zap, RefreshCw, Clock, Tag,
  ChevronDown, ChevronUp, Trash2, PlusCircle, History,
  Server, BookOpen, BarChart3, Layers
} from "lucide-react";

document.title = "Memory Dashboard | Tessera";

function formatDate(val: any): string {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function truncate(text: string, n: number) {
  return text.length <= n ? text : text.slice(0, n) + "…";
}

function SignificanceBadge({ sig }: { sig: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-900/50 text-red-300 border-red-700/50",
    high: "bg-orange-900/50 text-orange-300 border-orange-700/50",
    medium: "bg-blue-900/50 text-blue-300 border-blue-700/50",
    low: "bg-gray-800 text-gray-400 border-gray-700/50",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colors[sig] ?? colors.low} uppercase font-semibold`}>
      {sig}
    </span>
  );
}

type TabType = "knowledge" | "decisions" | "state" | "add";

export default function MemoryDashboardPage({ embedded }: { embedded?: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newContent, setNewContent] = useState("");
  const [newSource, setNewSource] = useState("user");
  const [newCategory, setNewCategory] = useState("general");
  const [decAction, setDecAction] = useState("");
  const [decRationale, setDecRationale] = useState("");
  const [decCategory, setDecCategory] = useState("system");
  const [decSignificance, setDecSignificance] = useState<"low" | "medium" | "high" | "critical">("medium");

  const statsQuery = useQuery<any>({
    queryKey: ["/api/memory/stats"],
    refetchInterval: 15000,
  });

  const embeddingsQuery = useQuery<any>({
    queryKey: ["/api/memory/embeddings"],
    queryFn: () => fetch("/api/memory/embeddings?limit=100").then(r => r.json()),
    refetchInterval: 30000,
  });

  const decisionsQuery = useQuery<any>({
    queryKey: ["/api/memory/decisions"],
    queryFn: () => fetch("/api/memory/decisions?limit=100").then(r => r.json()),
    refetchInterval: 15000,
  });

  const stateQuery = useQuery<any>({
    queryKey: ["/api/memory/state"],
    queryFn: () => fetch("/api/memory/state").then(r => r.json()),
    refetchInterval: 30000,
  });

  const storeMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/memory/store", body).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memory/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memory/embeddings"] });
      setNewContent("");
    },
  });

  const decisionMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/memory/decisions", body).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memory/decisions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memory/stats"] });
      setDecAction("");
      setDecRationale("");
    },
  });

  const deleteEmbeddingMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/memory/embeddings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memory/embeddings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memory/stats"] });
    },
  });

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const resp = await apiRequest("POST", "/api/memory/search", { query: searchQuery.trim(), topK: 20 });
      const data = await resp.json();
      setSearchResults(data.results ?? []);
    } catch {
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const stats = statsQuery.data;
  const embeddings = embeddingsQuery.data?.rows ?? [];
  const decisions = decisionsQuery.data?.decisions ?? [];
  const stateRows = stateQuery.data?.state ?? [];

  const TABS = [
    { key: "knowledge" as TabType, label: "Knowledge Store", icon: Database },
    { key: "decisions" as TabType, label: "Decision History", icon: History },
    { key: "state" as TabType, label: "System State", icon: Server },
    { key: "add" as TabType, label: "Add Memory", icon: PlusCircle },
  ];

  return (
    <div className={`${embedded ? "" : "pt-16"} min-h-screen bg-gray-950 text-gray-100`}>
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-violet-900/40 border border-violet-700/40">
            <Brain className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Persistent Memory</h1>
            <p className="text-xs text-gray-500">Vector memory store, decision history, and cross-session recall</p>
          </div>
          <button
            className="ml-auto text-gray-500 hover:text-gray-300 transition-colors"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/memory/stats"] });
              queryClient.invalidateQueries({ queryKey: ["/api/memory/embeddings"] });
              queryClient.invalidateQueries({ queryKey: ["/api/memory/decisions"] });
              queryClient.invalidateQueries({ queryKey: ["/api/memory/state"] });
            }}
            title="Refresh all"
            data-testid="refresh-memory"
          >
            <RefreshCw className={`w-4 h-4 ${statsQuery.isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-violet-950/40 border border-violet-700/30" data-testid="stat-total">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs text-violet-400 uppercase tracking-wide">Knowledge</span>
              </div>
              <p className="text-2xl font-bold text-violet-200">{stats.total ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">stored embeddings</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-700/30" data-testid="stat-vocab">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs text-blue-400 uppercase tracking-wide">Vocab</span>
              </div>
              <p className="text-2xl font-bold text-blue-200">{stats.vocabSize ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">unique terms</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/30" data-testid="stat-recent">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-400 uppercase tracking-wide">Recent</span>
              </div>
              <p className="text-2xl font-bold text-emerald-200">{stats.recentlyAdded ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">added in 24h</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-700/30" data-testid="stat-categories">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-400 uppercase tracking-wide">Categories</span>
              </div>
              <p className="text-2xl font-bold text-amber-200">{Object.keys(stats.byCategory ?? {}).length}</p>
              <p className="text-xs text-gray-500 mt-0.5">distinct categories</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Semantic memory search…"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
              data-testid="memory-search-input"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-2.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors min-w-[90px] flex items-center justify-center gap-1.5"
            data-testid="button-search"
          >
            {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Search className="w-3.5 h-3.5" /> Search</>}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="rounded-lg bg-gray-900 border border-violet-700/40 overflow-hidden" data-testid="search-results">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
              <span className="text-sm font-medium text-violet-300">
                {searchResults.length} semantic matches for &ldquo;{searchQuery}&rdquo;
              </span>
              <button
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                onClick={() => { setSearchResults([]); setSearchQuery(""); }}
              >
                Clear
              </button>
            </div>
            <div className="divide-y divide-gray-800/60 max-h-72 overflow-y-auto">
              {searchResults.map((r: any, i: number) => (
                <div key={i} className="p-3 hover:bg-gray-800/40 transition-colors" data-testid={`search-result-${i}`}>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-violet-900/50 text-violet-400 border border-violet-700/40">{r.category}</span>
                    <span className="text-xs text-green-400 font-mono">{(r.score * 100).toFixed(1)}% match</span>
                    <span className="text-xs text-gray-600 ml-auto">{r.source}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{truncate(r.content, 300)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        

        {true && (
          <div className="space-y-2" data-testid="knowledge-tab">
            {stats?.byCategory && Object.keys(stats.byCategory).length > 0 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {Object.entries(stats.byCategory as Record<string, number>).map(([cat, count]) => (
                  <span key={cat} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400">
                    <Tag className="w-3 h-3" /> {cat} <span className="text-violet-400 font-semibold">{count}</span>
                  </span>
                ))}
              </div>
            )}
            <div className="rounded-lg bg-gray-900 border border-gray-700/60 overflow-hidden">
              <div className="divide-y divide-gray-800/60 max-h-[480px] overflow-y-auto">
                {embeddingsQuery.isLoading && (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading knowledge…
                  </div>
                )}
                {!embeddingsQuery.isLoading && embeddings.length === 0 && (
                  <div className="py-12 text-center text-gray-500 text-sm">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No stored memories yet. Add some from the &ldquo;Add Memory&rdquo; tab.
                  </div>
                )}
                {embeddings.map((row: any) => {
                  const key = `emb-${row.id}`;
                  const expanded = expandedId === key;
                  return (
                    <div key={row.id} className="px-4 py-3 hover:bg-gray-800/30 transition-colors group" data-testid={`embedding-${row.id}`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-violet-900/40 text-violet-400 border border-violet-700/30">
                            {row.category}
                          </span>
                          <span className="text-xs text-gray-500">{row.source}</span>
                          {row.accessCount > 0 && (
                            <span className="text-xs text-emerald-500">accessed {row.accessCount}×</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-600">{formatDate(row.createdAt)}</span>
                          <button
                            className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => deleteEmbeddingMutation.mutate(row.id)}
                            title="Delete memory"
                            data-testid={`button-delete-emb-${row.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {expanded ? row.content : truncate(row.content, 250)}
                      </p>
                      {row.content.length > 250 && (
                        <button
                          className="text-xs text-violet-500 hover:text-violet-300 mt-1 flex items-center gap-0.5 transition-colors"
                          onClick={() => setExpandedId(expanded ? null : key)}
                        >
                          {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show more</>}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {true && (
          <div className="space-y-2" data-testid="decisions-tab">
            <div className="rounded-lg bg-gray-900 border border-gray-700/60 overflow-hidden">
              <div className="divide-y divide-gray-800/60 max-h-[520px] overflow-y-auto">
                {decisionsQuery.isLoading && (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading decisions…
                  </div>
                )}
                {!decisionsQuery.isLoading && decisions.length === 0 && (
                  <div className="py-12 text-center text-gray-500 text-sm">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No decisions logged yet.
                  </div>
                )}
                {decisions.map((dec: any) => {
                  const key = `dec-${dec.id}`;
                  const expanded = expandedId === key;
                  return (
                    <div key={dec.id} className="px-4 py-3 hover:bg-gray-800/30 transition-colors" data-testid={`decision-${dec.id}`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <SignificanceBadge sig={dec.significance} />
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700/40">
                            {dec.category}
                          </span>
                          <span className="text-xs text-gray-500">{dec.source}</span>
                        </div>
                        <span className="text-xs text-gray-600 shrink-0">{formatDate(dec.decidedAt)}</span>
                      </div>
                      <p className="text-sm font-medium text-white mb-1">{dec.action}</p>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {expanded ? dec.rationale : truncate(dec.rationale, 200)}
                      </p>
                      {dec.outcome && (
                        <p className="text-xs text-emerald-400 mt-1">Outcome: {dec.outcome}</p>
                      )}
                      {dec.rationale.length > 200 && (
                        <button
                          className="text-xs text-blue-500 hover:text-blue-300 mt-1 flex items-center gap-0.5 transition-colors"
                          onClick={() => setExpandedId(expanded ? null : key)}
                        >
                          {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show more</>}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {true && (
          <div className="space-y-2" data-testid="state-tab">
            <div className="rounded-lg bg-gray-900 border border-gray-700/60 overflow-hidden">
              <div className="divide-y divide-gray-800/60 max-h-[520px] overflow-y-auto">
                {stateQuery.isLoading && (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading state…
                  </div>
                )}
                {!stateQuery.isLoading && stateRows.length === 0 && (
                  <div className="py-12 text-center text-gray-500 text-sm">
                    <Server className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No system state saved yet. State is saved on startup.
                  </div>
                )}
                {stateRows.map((row: any) => {
                  const key = `state-${row.key}`;
                  const expanded = expandedId === key;
                  const valueStr = JSON.stringify(row.value, null, 2);
                  return (
                    <div key={row.key} className="px-4 py-3 hover:bg-gray-800/30 transition-colors" data-testid={`state-${row.key}`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <p className="text-sm font-mono font-medium text-cyan-300">{row.key}</p>
                          {row.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{row.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-600">Saved: {formatDate(row.lastSavedAt)}</p>
                          {row.restoredAt && (
                            <p className="text-xs text-blue-600">Restored: {formatDate(row.restoredAt)}</p>
                          )}
                        </div>
                      </div>
                      <pre className={`text-xs text-gray-400 font-mono bg-black/30 rounded p-2 overflow-x-auto leading-relaxed ${expanded ? "" : "max-h-24 overflow-hidden"}`}>
                        {valueStr}
                      </pre>
                      {valueStr.length > 200 && (
                        <button
                          className="text-xs text-cyan-500 hover:text-cyan-300 mt-1 flex items-center gap-0.5 transition-colors"
                          onClick={() => setExpandedId(expanded ? null : key)}
                        >
                          {expanded ? <><ChevronUp className="w-3 h-3" /> Collapse</> : <><ChevronDown className="w-3 h-3" /> Expand</>}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {true && (
          <div className="space-y-5" data-testid="add-tab">
            <div className="rounded-lg bg-gray-900 border border-violet-700/30 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-violet-300 flex items-center gap-2">
                <Database className="w-4 h-4" /> Store Knowledge Embedding
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-violet-500 focus:outline-none"
                    data-testid="select-category"
                  >
                    {["general", "conversation", "provider", "decision", "sovereignty", "agent", "system"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Source</label>
                  <input
                    value={newSource}
                    onChange={e => setNewSource(e.target.value)}
                    placeholder="e.g. user, agent, system"
                    className="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-violet-500 focus:outline-none"
                    data-testid="input-source"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Content to embed</label>
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Text content to store as a vector embedding…"
                  rows={4}
                  className="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-violet-500 focus:outline-none resize-none"
                  data-testid="input-content"
                />
              </div>
              <button
                onClick={() => storeMutation.mutate({ content: newContent, source: newSource, category: newCategory })}
                disabled={!newContent.trim() || storeMutation.isPending}
                className="px-5 py-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
                data-testid="button-store"
              >
                {storeMutation.isPending ? "Storing…" : "Store Embedding"}
              </button>
              {storeMutation.isSuccess && (
                <p className="text-xs text-emerald-400">Stored with ID: {storeMutation.data?.id}</p>
              )}
            </div>

            <div className="rounded-lg bg-gray-900 border border-blue-700/30 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-blue-300 flex items-center gap-2">
                <History className="w-4 h-4" /> Log a Decision
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Category</label>
                  <input
                    value={decCategory}
                    onChange={e => setDecCategory(e.target.value)}
                    placeholder="e.g. routing, provider, security"
                    className="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
                    data-testid="input-dec-category"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Significance</label>
                  <select
                    value={decSignificance}
                    onChange={e => setDecSignificance(e.target.value as any)}
                    className="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
                    data-testid="select-significance"
                  >
                    {["low", "medium", "high", "critical"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Action</label>
                <input
                  value={decAction}
                  onChange={e => setDecAction(e.target.value)}
                  placeholder="What was decided (e.g. route.switch, provider.select)"
                  className="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
                  data-testid="input-dec-action"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Rationale</label>
                <textarea
                  value={decRationale}
                  onChange={e => setDecRationale(e.target.value)}
                  placeholder="Why this decision was made…"
                  rows={3}
                  className="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none resize-none"
                  data-testid="input-dec-rationale"
                />
              </div>
              <button
                onClick={() => decisionMutation.mutate({ action: decAction, category: decCategory, rationale: decRationale, significance: decSignificance, source: "user" })}
                disabled={!decAction.trim() || !decRationale.trim() || decisionMutation.isPending}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
                data-testid="button-log-decision"
              >
                {decisionMutation.isPending ? "Logging…" : "Log Decision"}
              </button>
              {decisionMutation.isSuccess && (
                <p className="text-xs text-emerald-400">Decision logged with ID: {decisionMutation.data?.id}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
