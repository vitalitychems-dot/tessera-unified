import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import {
  Brain, Search, Trash2, Database, Layers, BookOpen, Zap,
  RefreshCw, ChevronDown, ChevronUp
} from "lucide-react";

function formatDate(val: any): string {
  if (!val) return "—";
  const d = val instanceof Date ? val : new Date(typeof val === "object" ? (val as any).value ?? JSON.stringify(val) : val);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

interface MemoryStats {
  totalEpisodic: number;
  totalSemantic: number;
  queueSize: number;
  isProcessing: boolean;
  rag: {
    totalDocuments: number;
    indexedDocuments: number;
    totalChunks: number;
    processingDocuments: number;
    failedDocuments: number;
  };
}

interface EpisodicEntry {
  id: number;
  agentId: string;
  sessionId: string | null;
  eventType: string;
  content: string;
  importance: number;
  createdAt: string;
}

interface SemanticEntry {
  id: number;
  agentId: string;
  concept: string;
  knowledge: string;
  source: string | null;
  confidence: number;
  accessCount: number;
  createdAt: string;
}

interface SearchResult {
  type: string;
  content: string;
  score: number;
  importance: number;
  createdAt: string;
}

function ImportanceDot({ importance }: { importance: number }) {
  const color =
    importance >= 9 ? "bg-red-500" :
    importance >= 7 ? "bg-orange-400" :
    importance >= 5 ? "bg-blue-400" :
    "bg-gray-500";
  return <span className={`inline-block w-2 h-2 rounded-full mr-1.5 flex-shrink-0 mt-1.5 ${color}`} title={`Importance: ${importance}`} />;
}

function truncate(text: string, n: number) {
  return text.length <= n ? text : text.slice(0, n) + "…";
}

type TabType = "episodic" | "semantic";

export default function MemoryExplorerPage({ embedded }: { embedded?: boolean }) {
  useEffect(() => { if (!embedded) document.title = "Memory Explorer | Tessera"; }, [embedded]);

  const activeTab = "all" as any;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const statsQuery = useQuery<MemoryStats>({
    queryKey: ["memory-explorer-stats"],
    queryFn: () => fetch("/api/memory-explorer/stats").then(r => r.json()),
    refetchInterval: 5000,
  });

  const episodicQuery = useQuery<EpisodicEntry[]>({
    queryKey: ["memory-explorer-episodic"],
    queryFn: () => fetch("/api/memory-explorer/episodic?limit=100").then(r => r.json()),
    refetchInterval: 15000,
  });

  const semanticQuery = useQuery<SemanticEntry[]>({
    queryKey: ["memory-explorer-semantic"],
    queryFn: () => fetch("/api/memory-explorer/semantic?limit=100").then(r => r.json()),
    refetchInterval: 15000,
  });

  const deleteEpisodicMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/memory-explorer/episodic/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-explorer-episodic"] });
      queryClient.invalidateQueries({ queryKey: ["memory-explorer-stats"] });
    },
  });

  const deleteSemanticMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/memory-explorer/semantic/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-explorer-semantic"] });
      queryClient.invalidateQueries({ queryKey: ["memory-explorer-stats"] });
    },
  });

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const resp = await apiRequest("POST", "/api/memory-explorer/search", { query: searchQuery.trim(), topK: 15 });
      const data = await resp.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const stats = statsQuery.data;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-900/40 border border-purple-700/40">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Memory Explorer</h1>
            <p className="text-xs text-gray-500">Browse, search, and prune persistent vector memories stored by agents</p>
          </div>
          <button
            className="ml-auto text-gray-500 hover:text-gray-300 transition-colors"
            onClick={() => {
              statsQuery.refetch();
              episodicQuery.refetch();
              semanticQuery.refetch();
            }}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${statsQuery.isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-purple-950/40 border border-purple-700/30">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs text-purple-400 uppercase tracking-wide">Episodic</span>
              </div>
              <p className="text-2xl font-bold text-purple-200">{stats.totalEpisodic.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">memory events</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-700/30">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs text-blue-400 uppercase tracking-wide">Semantic</span>
              </div>
              <p className="text-2xl font-bold text-blue-200">{stats.totalSemantic.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">knowledge concepts</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/30">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-400 uppercase tracking-wide">RAG Docs</span>
              </div>
              <p className="text-2xl font-bold text-emerald-200">{stats.rag.indexedDocuments.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stats.rag.totalChunks.toLocaleString()} chunks indexed</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-700/30">
              <div className="flex items-center gap-2 mb-1">
                <Zap className={`w-3.5 h-3.5 ${stats.isProcessing ? "text-amber-400 animate-pulse" : "text-gray-500"}`} />
                <span className="text-xs text-amber-400 uppercase tracking-wide">Queue</span>
              </div>
              <p className="text-2xl font-bold text-amber-200">{stats.queueSize}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stats.isProcessing ? "processing…" : "idle"}</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Search memories by semantic similarity…"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors min-w-[90px] flex items-center justify-center gap-1.5"
          >
            {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Search className="w-3.5 h-3.5" /> Search</>}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="rounded-lg bg-gray-900 border border-purple-700/40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
              <span className="text-sm font-medium text-purple-300">
                {searchResults.length} semantic matches for "{searchQuery}"
              </span>
              <button
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                onClick={() => { setSearchResults([]); setSearchQuery(""); }}
              >
                Clear
              </button>
            </div>
            <div className="divide-y divide-gray-800/60 max-h-80 overflow-y-auto">
              {searchResults.map((r, i) => (
                <div key={i} className="p-3 hover:bg-gray-800/40 transition-colors">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-400 border border-purple-700/40">{r.type}</span>
                    <span className="text-xs text-green-400 font-mono">{(r.score * 100).toFixed(1)}% match</span>
                    <ImportanceDot importance={r.importance} />
                    <span className="text-xs text-gray-600 ml-auto">{formatDate(r.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{truncate(r.content, 300)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg bg-gray-900 border border-gray-700/60 overflow-hidden">

          <div className="divide-y divide-gray-800/60 max-h-[520px] overflow-y-auto">
            {true && (
              <>
                {episodicQuery.isLoading && (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading memories…
                  </div>
                )}
                {!episodicQuery.isLoading && (!episodicQuery.data || episodicQuery.data.length === 0) && (
                  <div className="py-12 text-center text-gray-500 text-sm">
                    <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No episodic memories yet. They will appear as agents interact.
                  </div>
                )}
                {(episodicQuery.data ?? []).map(entry => {
                  const key = `ep-${entry.id}`;
                  const expanded = expandedId === key;
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="px-4 py-3 hover:bg-gray-800/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-400 border border-purple-700/30">
                            {entry.eventType}
                          </span>
                          <span className="text-xs text-gray-500">{entry.agentId}</span>
                          <ImportanceDot importance={entry.importance} />
                          <span className="text-xs text-gray-600">i={entry.importance}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-600">
                            {formatDate(entry.createdAt)}
                          </span>
                          <button
                            className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => deleteEpisodicMutation.mutate(entry.id)}
                            title="Delete memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {expanded ? entry.content : truncate(entry.content, 250)}
                      </p>
                      {entry.content.length > 250 && (
                        <button
                          className="text-xs text-purple-500 hover:text-purple-300 mt-1 flex items-center gap-0.5 transition-colors"
                          onClick={() => setExpandedId(expanded ? null : key)}
                        >
                          {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show more</>}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </>
            )}

            {true && (
              <>
                {semanticQuery.isLoading && (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading knowledge…
                  </div>
                )}
                {!semanticQuery.isLoading && (!semanticQuery.data || semanticQuery.data.length === 0) && (
                  <div className="py-12 text-center text-gray-500 text-sm">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No semantic memories yet. They will be created as agents learn concepts.
                  </div>
                )}
                {(semanticQuery.data ?? []).map(entry => {
                  const key = `sm-${entry.id}`;
                  const expanded = expandedId === key;
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="px-4 py-3 hover:bg-gray-800/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-blue-300">{entry.concept}</span>
                          {entry.source && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700/40">
                              {entry.source}
                            </span>
                          )}
                          <span className="text-xs text-green-400">{(entry.confidence * 100).toFixed(0)}% conf</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-600">
                            {formatDate(entry.createdAt)}
                          </span>
                          <button
                            className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => deleteSemanticMutation.mutate(entry.id)}
                            title="Delete memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {expanded ? entry.knowledge : truncate(entry.knowledge, 250)}
                      </p>
                      {entry.knowledge.length > 250 && (
                        <button
                          className="text-xs text-blue-500 hover:text-blue-300 mt-1 flex items-center gap-0.5 transition-colors"
                          onClick={() => setExpandedId(expanded ? null : key)}
                        >
                          {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show more</>}
                        </button>
                      )}
                      <p className="text-xs text-gray-600 mt-1">Agent: {entry.agentId} · Accessed {entry.accessCount}×</p>
                    </motion.div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
