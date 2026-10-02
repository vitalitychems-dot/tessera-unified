import { useState, useMemo, useCallback } from "react";
import { Search, X, Brain, Lock, Flame, Zap, Sparkles } from "lucide-react";

export interface SearchableEntry {
  id: string;
  type: "conclusion" | "secret" | "ritual" | "cheat-code" | "live-knowledge";
  title: string;
  body: string;
  raw: any;
}

interface SearchResult {
  entry: SearchableEntry;
  score: number;
  titleMatch: boolean;
  bodyMatch: boolean;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded-sm px-0.5">{part}</mark>
    ) : (
      part
    )
  );
}

function fuzzyMatch(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  if (t.includes(q)) return q.length / t.length + 1;
  let score = 0;
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) { score++; qi++; }
  }
  return qi === q.length ? score / t.length : 0;
}

const TYPE_ICONS: Record<string, any> = {
  conclusion: Brain,
  secret: Lock,
  ritual: Flame,
  "cheat-code": Zap,
  "live-knowledge": Sparkles,
};

const TYPE_COLORS: Record<string, string> = {
  conclusion: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  secret: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  ritual: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  "cheat-code": "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  "live-knowledge": "text-purple-400 bg-purple-500/10 border-purple-500/30",
};

interface KnowledgeSearchProps {
  entries: SearchableEntry[];
  onSelectEntry?: (entry: SearchableEntry) => void;
}

export default function KnowledgeSearch({ entries, onSelectEntry }: KnowledgeSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    return entries
      .map(entry => {
        const titleScore = fuzzyMatch(entry.title, query);
        const bodyScore = fuzzyMatch(entry.body, query) * 0.6;
        const score = titleScore + bodyScore;
        return {
          entry,
          score,
          titleMatch: titleScore > 0,
          bodyMatch: bodyScore > 0,
        };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [query, entries]);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of results) {
      if (!groups[r.entry.type]) groups[r.entry.type] = [];
      groups[r.entry.type].push(r);
    }
    return groups;
  }, [results]);

  const handleSelect = useCallback(
    (entry: SearchableEntry) => {
      onSelectEntry?.(entry);
      setOpen(false);
      setQuery("");
    },
    [onSelectEntry]
  );

  return (
    <div className="relative w-full" data-testid="knowledge-search">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search across all knowledge, secrets, rituals..."
          className="w-full pl-8 pr-8 py-2 bg-slate-900/80 border border-slate-700/50 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:bg-slate-900 transition-all"
          data-testid="knowledge-search-input"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 bg-gray-950/98 border border-slate-700/60 rounded-xl shadow-2xl z-50 max-h-[60vh] overflow-y-auto backdrop-blur-sm"
          data-testid="knowledge-search-results"
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-500">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="p-2 space-y-3">
              <div className="px-2 pt-1 text-[10px] text-slate-500 font-semibold">
                {results.length} result{results.length !== 1 ? "s" : ""} across {Object.keys(grouped).length} categories
              </div>
              {Object.entries(grouped).map(([type, groupResults]) => {
                const Icon = TYPE_ICONS[type] || Sparkles;
                const colorClass = TYPE_COLORS[type] || "text-slate-400";
                return (
                  <div key={type}>
                    <div className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${colorClass.split(" ")[0]}`}>
                      <Icon size={10} />
                      {type.replace(/-/g, " ")} ({groupResults.length})
                    </div>
                    <div className="space-y-1">
                      {groupResults.map(r => (
                        <button
                          key={r.entry.id}
                          onClick={() => handleSelect(r.entry)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/70 transition-colors group"
                          data-testid={`search-result-${r.entry.id}`}
                        >
                          <div className={`text-[11px] font-semibold mb-0.5 ${colorClass.split(" ")[0]} group-hover:text-white transition-colors`}>
                            {highlight(r.entry.title, query)}
                          </div>
                          <div className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                            {highlight(r.entry.body, query)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {open && query.trim() && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
