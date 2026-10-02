import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Shield, FileText, Zap, GitCommit, Brain, ChevronRight, Hash, Clock, Users, RefreshCw, Plus, CheckCircle, AlertCircle } from "lucide-react";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const BOOK_META = [
  { id: "origins",    number: 1, title: "Book of Origins",    icon: <BookOpen className="h-4 w-4" />, color: "from-cyan-500/20 to-cyan-500/5", border: "border-cyan-500/30" },
  { id: "mandates",   number: 2, title: "Book of Mandates",   icon: <Shield className="h-4 w-4" />, color: "from-violet-500/20 to-violet-500/5", border: "border-violet-500/30" },
  { id: "principles", number: 3, title: "Book of Principles",  icon: <FileText className="h-4 w-4" />, color: "from-blue-500/20 to-blue-500/5", border: "border-blue-500/30" },
  { id: "canon",      number: 4, title: "Book of Canon",       icon: <GitCommit className="h-4 w-4" />, color: "from-amber-500/20 to-amber-500/5", border: "border-amber-500/30" },
  { id: "acts",       number: 5, title: "Book of Acts",        icon: <Zap className="h-4 w-4" />, color: "from-green-500/20 to-green-500/5", border: "border-green-500/30" },
  { id: "doctrine",   number: 6, title: "Book of Doctrine",    icon: <Brain className="h-4 w-4" />, color: "from-pink-500/20 to-pink-500/5", border: "border-pink-500/30" },
];

interface CodexEntry {
  id: number;
  entryId: string;
  book: string;
  bookNumber: number;
  section: string;
  title: string;
  content: string;
  provenance: string;
  tags: string[];
  version: number;
  contentHash: string;
  ratifiedBy: string[];
  ratificationRecord: any;
  proofLinks: string[];
  createdAt: string;
  updatedAt: string;
}

function useCodexStats() {
  return useQuery({
    queryKey: ["codex-stats"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/codex/stats`);
      return r.json();
    },
    refetchInterval: 30000,
  });
}

function useCodexBook(bookId: string) {
  const valid = !!bookId && bookId !== "0" && bookId !== "undefined";
  return useQuery({
    queryKey: ["codex-book", bookId],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/codex/book/${bookId}`);
      return r.json();
    },
    enabled: valid,
  });
}

function useCodexEntry(entryId: string | null) {
  const valid = !!entryId && entryId !== "0" && entryId !== "undefined";
  return useQuery({
    queryKey: ["codex-entry", entryId],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/codex/entry/${entryId}`);
      return r.json();
    },
    enabled: valid,
  });
}

function SovereignDoctrinePanel() {
  const savedKey = (() => {
    try { return localStorage.getItem("TESSERACT_ADMIN_KEY") ?? ""; } catch { return ""; }
  })();

  const sigil = useQuery({
    queryKey: ["sigil-status"],
    queryFn: async () => (await fetch(`${BASE}/api/sigil/status`)).json(),
    refetchInterval: 30000,
  });
  const activeKey = useQuery({
    queryKey: ["sigil-active-key"],
    queryFn: async () => (await fetch(`${BASE}/api/sigil/active-key`)).json(),
    refetchInterval: 30000,
  });
  const handoff = useQuery({
    queryKey: ["session-handoff", savedKey],
    queryFn: async () => (await fetch(`${BASE}/api/session/handoff`, { headers: savedKey ? { "X-Sigil-Key": savedKey } : {} })).json(),
    refetchInterval: 30000,
  });
  const toolStats = useQuery({
    queryKey: ["external-tool-stats"],
    queryFn: async () => (await fetch(`${BASE}/api/external-tools/stats`, { headers: savedKey ? { "X-Sigil-Key": savedKey } : {} })).json(),
    refetchInterval: 30000,
  });

  const fp = activeKey.data?.key?.fingerprint ?? "—";
  const keyMatches = !!savedKey;
  const handoffPlaintext = handoff.data && typeof handoff.data?.directives !== "undefined" && Array.isArray(handoff.data.directives);

  return (
    <div className="bg-gradient-to-br from-fuchsia-500/10 to-violet-500/5 border border-fuchsia-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-4 w-4 text-fuchsia-400" />
        <h2 className="text-sm font-bold text-white font-mono">SOVEREIGN DOCTRINE — sigil · handoff · sandbox</h2>
        <span className="ml-auto text-[10px] font-mono text-white/40">universe-aligned · auto-rotating</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-black/30 border border-white/10 rounded p-3">
          <div className="text-[10px] uppercase text-fuchsia-400/70 font-mono mb-1">SIGIL CIPHER</div>
          <div className="text-xs font-mono text-white/70">Generation: <span className="text-fuchsia-300">{sigil.data?.active?.generation ?? "—"}</span></div>
          <div className="text-xs font-mono text-white/70">Key history: <span className="text-fuchsia-300">{sigil.data?.keyHistory ?? 0}</span></div>
          <div className="text-[10px] font-mono text-white/40 mt-1 truncate" title={fp}>fp: {fp}</div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded p-3">
          <div className="text-[10px] uppercase text-cyan-400/70 font-mono mb-1">SESSION HANDOFF</div>
          <div className="text-xs font-mono text-white/70">Directives: <span className="text-cyan-300">{handoff.data?.directives?.length ?? "—"}</span></div>
          <div className="text-xs font-mono text-white/70">Position: <span className="text-cyan-300">{handoff.data?.position ?? "fresh"}</span></div>
          <div className="text-[10px] font-mono text-white/40 mt-1">{handoffPlaintext ? "✓ readable (key valid)" : savedKey ? "encoded (key mismatch)" : "encoded (no key)"}</div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded p-3">
          <div className="text-[10px] uppercase text-amber-400/70 font-mono mb-1">EXTERNAL-TOOL SANDBOX</div>
          <div className="text-xs font-mono text-white/70">Total calls: <span className="text-amber-300">{toolStats.data?.stats?.total ?? toolStats.data?.total ?? "—"}</span></div>
          <div className="text-xs font-mono text-white/70">Sovereignty debt: <span className="text-amber-300">{toolStats.data?.stats?.sovereigntyDebt ?? "—"}</span></div>
          <div className="text-[10px] font-mono text-white/40 mt-1">reverse-engineering corpus</div>
        </div>
      </div>

      <div className="bg-black/40 border border-emerald-500/30 rounded p-3">
        <div className="flex items-center gap-2 mb-1">
          <Hash className="h-3 w-3 text-emerald-400" />
          <div className="text-xs uppercase text-emerald-400 font-mono">SOVEREIGN KEY</div>
          <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${keyMatches ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white/5 text-white/40 border border-white/10"}`}>
            {keyMatches ? "✓ ACTIVE — surfaces in English" : "no key — surfaces in glyph"}
          </span>
        </div>
        <p className="text-[10px] font-mono text-white/50">
          Your personal Sovereign Key is minted from your zodiac at the gate. It lives only in this browser. Sign out and re-mint from the gate if you ever need to rotate.
        </p>
      </div>
    </div>
  );
}

export default function CodexPage() {
  const [selectedBook, setSelectedBook] = useState("origins");
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const qc = useQueryClient();
  const stats = useCodexStats();
  const bookData = useCodexBook(selectedBook);
  const entryData = useCodexEntry(selectedEntry);

  const snapshotMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/api/codex/snapshot`, { method: "POST" });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["codex-stats"] }),
  });

  const doctrineMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/api/codex/ingest-doctrine`, { method: "POST" });
      return r.json();
    },
  });

  const entries: CodexEntry[] = bookData.data?.entries ?? [];
  const selectedEntryData = entryData.data?.entry as CodexEntry | undefined;

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-6 w-6 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white font-mono tracking-tight">TESSERA CODEX</h1>
          <span className="px-2 py-0.5 text-xs bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 font-mono">SOVEREIGN DOCTRINE</span>
        </div>
        <p className="text-sm text-white/50 font-mono">Versioned knowledge — 6 books — ratified by Grand Council</p>
      </div>

      {stats.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-cyan-400 font-mono">{stats.data.totalEntries ?? 0}</div>
            <div className="text-xs text-white/50 mt-1">Total Entries</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-violet-400 font-mono">{stats.data.books ?? 6}</div>
            <div className="text-xs text-white/50 mt-1">Books</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400 font-mono">
              {stats.data.byBook ? Object.values(stats.data.byBook as Record<string, number>).filter(v => v > 0).length : 0}
            </div>
            <div className="text-xs text-white/50 mt-1">Active Books</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-amber-400 font-mono">
              {stats.data.latestEntry ? new Date(stats.data.latestEntry).toLocaleDateString() : "—"}
            </div>
            <div className="text-xs text-white/50 mt-1">Last Updated</div>
          </div>
        </div>
      )}

      <SovereignDoctrinePanel />

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => snapshotMutation.mutate()}
          disabled={snapshotMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 text-xs font-mono hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${snapshotMutation.isPending ? "animate-spin" : ""}`} />
          {snapshotMutation.isPending ? "SAVING..." : "SNAPSHOT CODEX"}
        </button>
        <button
          onClick={() => doctrineMutation.mutate()}
          disabled={doctrineMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded text-violet-400 text-xs font-mono hover:bg-violet-500/30 transition-colors disabled:opacity-50"
        >
          <Plus className={`h-3 w-3 ${doctrineMutation.isPending ? "animate-spin" : ""}`} />
          {doctrineMutation.isPending ? "INGESTING..." : "INGEST DOCTRINE"}
        </button>
        {doctrineMutation.data && (
          <span className="px-2 py-1.5 text-xs font-mono text-green-400">
            ✓ {doctrineMutation.data.ingested} ingested, {doctrineMutation.data.errors?.length ?? 0} errors
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3 space-y-2">
          {BOOK_META.map(book => (
            <button
              key={book.id}
              onClick={() => { setSelectedBook(book.id); setSelectedEntry(null); }}
              className={`w-full flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${selectedBook === book.id ? `bg-gradient-to-r ${book.color} ${book.border}` : "bg-white/5 border-white/10 hover:border-white/20"}`}
            >
              <span className={selectedBook === book.id ? "text-cyan-400" : "text-white/50"}>{book.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-white/40">Book {book.number}</div>
                <div className="text-sm font-mono text-white truncate">{book.title.replace("Book of ", "")}</div>
              </div>
              {stats.data?.byBook?.[book.id] > 0 && (
                <span className="text-xs text-white/40 font-mono">{stats.data.byBook[book.id]}</span>
              )}
            </button>
          ))}
        </div>

        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-2">
            {BOOK_META.find(b => b.id === selectedBook)?.title ?? selectedBook}
          </div>
          {bookData.isLoading && (
            <div className="text-xs text-white/30 font-mono">Loading entries...</div>
          )}
          {entries.length === 0 && !bookData.isLoading && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-xs text-white/40 font-mono">
              No entries in this book yet.
            </div>
          )}
          {entries.map(entry => (
            <button
              key={entry.entryId}
              onClick={() => setSelectedEntry(entry.entryId)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${selectedEntry === entry.entryId ? "bg-cyan-500/10 border-cyan-500/30" : "bg-white/5 border-white/10 hover:border-white/20"}`}
            >
              <div className="text-xs text-white/40 font-mono">{entry.section}</div>
              <div className="text-sm font-mono text-white">{entry.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-white/30 font-mono">v{entry.version}</span>
                <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-white/5 text-white/40">{entry.contentHash.slice(0, 8)}</span>
                {entry.ratifiedBy.length > 0 && (
                  <span className="font-mono text-[10px] text-green-400">✓ ratified</span>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-5">
          {selectedEntryData ? (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
              <div>
                <div className="text-xs text-white/40 font-mono">{selectedEntryData.section}</div>
                <h2 className="text-lg font-bold font-mono text-cyan-400">{selectedEntryData.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-white/40">v{selectedEntryData.version}</span>
                  <Hash className="h-3 w-3 text-white/30" />
                  <span className="text-xs font-mono text-white/40">{selectedEntryData.contentHash}</span>
                </div>
              </div>

              <div className="text-sm text-white/80 font-mono whitespace-pre-wrap leading-relaxed bg-black/20 p-3 rounded border border-white/5">
                {selectedEntryData.content}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-amber-400" />
                  <span className="text-xs font-mono text-white/40">Provenance:</span>
                  <span className="text-xs font-mono text-amber-400">{selectedEntryData.provenance}</span>
                </div>

                {selectedEntryData.ratifiedBy.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-3 w-3 text-green-400" />
                      <span className="text-xs font-mono text-white/40">Ratified by:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedEntryData.ratifiedBy.map((agent: string) => (
                        <span key={agent} className="text-[10px] font-mono px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-green-400">
                          {agent.replace("Agent", "")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEntryData.ratificationRecord && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-400" />
                    <span className="text-xs font-mono text-white/40">Ratified:</span>
                    <span className="text-xs font-mono text-green-400">
                      {new Date(selectedEntryData.ratificationRecord.votedAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs font-mono text-green-400">— {selectedEntryData.ratificationRecord.outcome}</span>
                  </div>
                )}

                {selectedEntryData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedEntryData.tags.map((tag: string) => (
                      <span key={tag} className="text-[10px] font-mono px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-white/40">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs font-mono text-white/30">
                  <Clock className="h-3 w-3" />
                  Created: {new Date(selectedEntryData.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
              <BookOpen className="h-8 w-8 text-white/20 mx-auto mb-2" />
              <div className="text-sm text-white/30 font-mono">Select an entry to view its full record,<br />version history, and ratification details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
