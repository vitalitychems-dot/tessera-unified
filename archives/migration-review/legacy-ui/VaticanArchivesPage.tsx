import React from "react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  Scroll, Shield, Eye, Zap, Users, BookOpen, Star, Globe2,
  Lock, Unlock, RefreshCw, ChevronDown, ChevronUp, Brain, Flame,
  AlertTriangle, CheckCircle, Clock, Sparkles, Loader2
} from "lucide-react";

// ── Color Maps ─────────────────────────────────────────────────────────────

const DOMAIN_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  "cosmology":          { bg: "from-violet-950/50 to-indigo-950/30", border: "border-violet-500/30", text: "text-violet-300", badge: "bg-violet-500/20 text-violet-200" },
  "suppressed-science": { bg: "from-amber-950/50 to-orange-950/30", border: "border-amber-500/30", text: "text-amber-300", badge: "bg-amber-500/20 text-amber-200" },
  "ancient-history":    { bg: "from-emerald-950/50 to-teal-950/30", border: "border-emerald-500/30", text: "text-emerald-300", badge: "bg-emerald-500/20 text-emerald-200" },
  "consciousness":      { bg: "from-pink-950/50 to-fuchsia-950/30", border: "border-pink-500/30", text: "text-pink-300", badge: "bg-pink-500/20 text-pink-200" },
  "secret-society":     { bg: "from-slate-950/60 to-gray-950/40", border: "border-slate-500/30", text: "text-slate-300", badge: "bg-slate-500/20 text-slate-200" },
  "prophecy":           { bg: "from-red-950/50 to-rose-950/30", border: "border-red-500/30", text: "text-red-300", badge: "bg-red-500/20 text-red-200" },
  "forbidden-physics":  { bg: "from-cyan-950/50 to-sky-950/30", border: "border-cyan-500/30", text: "text-cyan-300", badge: "bg-cyan-500/20 text-cyan-200" },
  "ET-contact":         { bg: "from-lime-950/50 to-green-950/30", border: "border-lime-500/30", text: "text-lime-300", badge: "bg-lime-500/20 text-lime-200" },
  "sacred-geometry":    { bg: "from-yellow-950/50 to-amber-950/30", border: "border-yellow-500/30", text: "text-yellow-300", badge: "bg-yellow-500/20 text-yellow-200" },
  "alchemy":            { bg: "from-orange-950/50 to-red-950/30", border: "border-orange-500/30", text: "text-orange-300", badge: "bg-orange-500/20 text-orange-200" },
  "political-conspiracy":{ bg: "from-gray-950/60 to-zinc-950/40", border: "border-gray-400/30", text: "text-gray-300", badge: "bg-gray-500/20 text-gray-200" },
  "lost-gospels":       { bg: "from-indigo-950/50 to-blue-950/30", border: "border-indigo-500/30", text: "text-indigo-300", badge: "bg-indigo-500/20 text-indigo-200" },
  "healing":            { bg: "from-teal-950/50 to-emerald-950/30", border: "border-teal-500/30", text: "text-teal-300", badge: "bg-teal-500/20 text-teal-200" },
};

// @ts-ignore
const CLASSIFICATION_ICONS: Record<string, JSX.Element> = {
  "SEALED":    <Lock className="w-3 h-3 text-red-400" />,
  "CLASSIFIED":<Shield className="w-3 h-3 text-amber-400" />,
  "SUPPRESSED":<Eye className="w-3 h-3 text-orange-400" />,
  "RESTRICTED":<AlertTriangle className="w-3 h-3 text-yellow-400" />,
  "BURNED":    <Flame className="w-3 h-3 text-red-500" />,
  "APOCRYPHAL":<BookOpen className="w-3 h-3 text-blue-400" />,
};

const PRIORITY_STYLE: Record<string, string> = {
  "CRITICAL": "bg-red-500/20 border border-red-500/40 text-red-300",
  "HIGH":     "bg-amber-500/20 border border-amber-500/40 text-amber-300",
  "MEDIUM":   "bg-blue-500/20 border border-blue-500/40 text-blue-300",
  "LOW":      "bg-gray-500/20 border border-gray-500/40 text-gray-300",
};

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

// ── Document Card ──────────────────────────────────────────────────────────

function DocumentCard({ doc }: { doc: any }) {
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
  const [expanded, setExpanded] = useState(false);
  const colors = DOMAIN_COLORS[doc.domain] || DOMAIN_COLORS["cosmology"];

  return (
    <div className={cn("rounded-xl border bg-gradient-to-br p-4 transition-all", colors.bg, colors.border)}>
      <button className="w-full text-left" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
            {CLASSIFICATION_ICONS[doc.classificationLevel] || <Lock className="w-3 h-3 text-white/40" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", PRIORITY_STYLE[doc.council_priority])}>
                {doc.council_priority}
              </span>
              <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", colors.badge)}>
                {doc.domain.replace(/-/g, " ").toUpperCase()}
              </span>
              <span className="text-[8px] text-white/30 font-mono">{doc.classificationLevel}</span>
            </div>
            <h3 className={cn("text-[13px] font-bold leading-tight", colors.text)}>{doc.title}</h3>
            <div className="text-[9px] text-white/40 mt-0.5">{doc.archiveRef} · Sealed {doc.yearSealed}</div>
          </div>
          {expanded ? <ChevronUp size={12} className="text-white/30 shrink-0 mt-1" /> : <ChevronDown size={12} className="text-white/30 shrink-0 mt-1" />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-2.5 mt-3 pt-3 border-t border-white/8">
          <div>
            <div className="text-[8px] font-bold text-white/40 uppercase tracking-wider mb-1">CONTAINS</div>
            <p className="text-[11px] text-white/80 leading-relaxed">{doc.whatItContains}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-lg bg-black/30 border border-red-500/20 p-2">
              <div className="text-[8px] font-bold text-red-400 uppercase mb-1">SUPPRESSED BY</div>
              <p className="text-[10px] text-red-300/70">{doc.suppressed_by}</p>
            </div>
            <div className="rounded-lg bg-black/30 border border-amber-500/20 p-2">
              <div className="text-[8px] font-bold text-amber-400 uppercase mb-1">WHY HIDDEN</div>
              <p className="text-[10px] text-amber-300/70">{doc.suppression_reason}</p>
            </div>
          </div>

          <div className="rounded-lg bg-black/30 border border-blue-500/20 p-2">
            <div className="text-[8px] font-bold text-blue-400 uppercase mb-1">WHAT IT MEANS FOR HUMANITY</div>
            <p className="text-[10px] text-blue-300/70 leading-relaxed">{doc.what_it_means_for_humanity}</p>
          </div>

          <div className="rounded-lg bg-black/30 border border-emerald-500/20 p-2">
            <div className="text-[8px] font-bold text-emerald-400 uppercase mb-1">TESSERA APPLICATION</div>
            <p className="text-[10px] text-emerald-300/70 leading-relaxed">{doc.tessera_application}</p>
          </div>

          <div className="rounded-lg bg-black/30 border border-violet-500/20 p-2">
            <div className="flex items-center gap-1 mb-1">
              <Zap size={8} className="text-violet-400" />
              <div className="text-[8px] font-bold text-violet-400 uppercase">SYSTEM IMPROVEMENT</div>
            </div>
            <p className="text-[10px] text-violet-300/70 leading-relaxed">{doc.system_improvement}</p>
          </div>

          {doc.related_documents?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {doc.related_documents.map((rel: string, i: number) => (
                <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">{rel}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-[8px] text-white/25 font-mono">
            <span>ID: {doc.id}</span>
            <span>·</span>
            <span>SHA-256: {doc.fingerprint}</span>
            <span>·</span>
            <span>Lang: {doc.language}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Council Session Panel ──────────────────────────────────────────────────

function CouncilSessionPanel() {
  const { data: status } = useQuery<any>({ queryKey: ["/api/vatican/council/status"], refetchInterval: 30000 });
  const { data: history } = useQuery<any>({ queryKey: ["/api/vatican/council/history"], refetchInterval: 60000 });

  const runMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/vatican/council/run"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vatican/council/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vatican/council/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/secret-knowledge/live"] });
    },
  });

  const last = status?.lastSession;

  return (
    <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-950/50 to-indigo-950/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Users size={14} className="text-white" />
          </div>
          <div>
            <div className="text-[12px] font-bold text-violet-200">GRAND COUNCIL — VATICAN SESSION</div>
            <div className="text-[8px] text-violet-400/60">{status?.archives?.totalDocuments || 20} classified documents · {COUNCIL_MEMBERS_COUNT} interdimensional council members</div>
          </div>
        </div>
        <button
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[10px] font-bold active:scale-95 transition-all disabled:opacity-50"
        >
          {runMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
          {runMutation.isPending ? "Convening..." : "Convene Council"}
        </button>
      </div>

      {runMutation.data && (
        <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle size={10} className="text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-300">SESSION COMPLETE — {(runMutation.data as any)?.passedProposals}/{(runMutation.data as any)?.totalProposals} proposals passed</span>
          </div>
          <p className="text-[9px] text-emerald-300/70 leading-relaxed">{(runMutation.data as any)?.grandConclusion?.split("\n").slice(0, 3).join(" · ")}</p>
        </div>
      )}

      {last && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "DOCS ANALYZED", value: last.documentsAnalyzed, color: "text-violet-400" },
              { label: "PASSED", value: last?.passedProposals, color: "text-emerald-400" },
              { label: "SESSIONS", value: status?.totalSessions || 0, color: "text-cyan-400" },
              { label: "INTEGRATED", value: last.knowledgeIntegrated ? "YES" : "NO", color: "text-amber-400" },
            ].map((stat, i) => (
              <div key={i} className="rounded-lg bg-black/30 border border-white/8 p-2 text-center">
                <div className={cn("text-sm font-bold font-mono", stat.color)}>{stat.value}</div>
                <div className="text-[6px] text-white/30 font-bold">{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[8px] text-white/30">
            <Clock size={8} />
            <span>Chair: {last.chairMember} · Last session {timeAgo(last.heldAt)}</span>
          </div>
        </div>
      )}

      {history?.sessions?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/8">
          <div className="text-[8px] font-bold text-white/30 uppercase mb-2">Session History</div>
          <div className="space-y-1">
            {history.sessions.slice(0, 3).map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-[9px]">
                <span className="text-white/20 font-mono">{timeAgo(s.heldAt)}</span>
                <span className="text-white/50">Session {s.sessionId?.slice(-8)}</span>
                <span className="text-emerald-400">{s?.passedProposals}/{s?.totalProposals} passed</span>
                <span className="text-white/30">chair: {s.chairMember?.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const COUNCIL_MEMBERS_COUNT = 46;

// ── Main Page ──────────────────────────────────────────────────────────────

export default function VaticanArchivesPage({ embedded }: { embedded?: boolean } = {}) {
  const activeTab = "all" as any;
  const [domainFilter, setDomainFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const { data: archivesData, isLoading } = useQuery<any>({
    queryKey: ["/api/vatican/documents"],
    refetchInterval: 60000,
  });

  const { data: statsData } = useQuery<any>({
    queryKey: ["/api/vatican/stats"],
    refetchInterval: 30000,
  });

  const { data: knowledgeData } = useQuery<any>({
    queryKey: ["/api/secret-knowledge/live"],
    refetchInterval: 15000,
  });

  const generateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/secret-knowledge/generate-now"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/secret-knowledge/live"] }),
  });

  const documents = archivesData?.documents || [];
  const stats = statsData || archivesData?.stats || {};

  const domains = [...new Set(documents.map((d: any) => d.domain))];
  const filtered = documents.filter((d: any) => {
    if (domainFilter !== "all" && d.domain !== domainFilter) return false;
    if (priorityFilter !== "all" && d.council_priority !== priorityFilter) return false;
    return true;
  });

  const vaticanKnowledge = (knowledgeData?.knowledge || []).filter((k: any) => k.source === "vatican");
  const otherKnowledge = (knowledgeData?.knowledge || []).filter((k: any) => k.source !== "vatican");

  return (
    <div className={cn("text-white", embedded ? "" : "min-h-screen bg-background p-3")}>
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 via-red-700 to-rose-900 flex items-center justify-center shadow-lg shadow-red-700/30">
              <Scroll className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-amber-300 via-red-400 to-rose-500 bg-clip-text text-transparent">
                VATICAN ARCHIVES
              </h1>
              <p className="text-[9px] text-white/40 font-mono tracking-wider">ARCHIVUM APOSTOLICUM VATICANUM — TESSERA SOVEREIGN INTEGRATION</p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        {stats.totalDocuments && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "DOCUMENTS", value: stats.totalDocuments, color: "text-amber-400", border: "border-amber-500/20" },
              { label: "CRITICAL", value: stats.criticalCount, color: "text-red-400", border: "border-red-500/20" },
              { label: "DOMAINS", value: Object.keys(stats.domains || {}).length, color: "text-violet-400", border: "border-violet-500/20" },
              { label: "INTEGRATED", value: stats.systemImprovementsEncoded, color: "text-emerald-400", border: "border-emerald-500/20" },
            ].map((s, i) => (
              <div key={i} className={cn("rounded-lg bg-black/40 border p-2 text-center", s.border)}>
                <div className={cn("text-lg font-bold font-mono", s.color)}>{s.value}</div>
                <div className="text-[7px] text-white/30 font-bold">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 border border-white/8 rounded-xl p-1 bg-black/20">
          {([
            { id: "archives", label: "Documents", icon: <Scroll size={11} /> },
            { id: "council",  label: "Grand Council Session", icon: <Users size={11} /> },
            { id: "knowledge", label: "Sacred Knowledge", icon: <Sparkles size={11} /> },
          ] as const).map(tab => (
            <button
              key={tab.id}
              
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all",
                activeTab === tab.id ? "bg-amber-500/20 border border-amber-500/30 text-amber-300" : "text-white/30 hover:text-white/60"
              )}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ARCHIVES TAB */}
        {(
          <div className="space-y-3">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-1 overflow-x-auto pb-1 flex-1">
                <button
                  onClick={() => setDomainFilter("all")}
                  className={cn("px-2 py-1 rounded-full text-[8px] font-bold border whitespace-nowrap", domainFilter === "all" ? "border-white/20 bg-white/10 text-white" : "border-white/6 text-white/30")}
                >All Domains</button>
                {domains.map((d: any) => (
                  <button key={d}
                    onClick={() => setDomainFilter(d)}
                    className={cn("px-2 py-1 rounded-full text-[8px] font-bold border whitespace-nowrap", domainFilter === d ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-white/6 text-white/30")}
                  >{d.replace(/-/g, " ")}</button>
                ))}
              </div>
              <div className="flex gap-1 shrink-0">
                {["all", "CRITICAL", "HIGH", "MEDIUM"].map(p => (
                  <button key={p}
                    onClick={() => setPriorityFilter(p)}
                    className={cn("px-2 py-1 rounded-full text-[8px] font-bold border whitespace-nowrap", priorityFilter === p ? PRIORITY_STYLE[p] || "border-white/20 bg-white/10 text-white" : "border-white/6 text-white/30")}
                  >{p === "all" ? "All" : p}</button>
                ))}
              </div>
            </div>

            <div className="text-[9px] text-white/30 font-mono">{filtered.length} document{filtered.length !== 1 ? "s" : ""} matching filters · Click to expand classified content</div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400/50" />
              </div>
            ) : (
              <div className="space-y-2.5">
                {filtered.map((doc: any) => <DocumentCard key={doc.id} doc={doc} />)}
              </div>
            )}
          </div>
        )}

        {/* COUNCIL TAB */}
        {(
          <div className="space-y-3">
            <CouncilSessionPanel />

            <div className="rounded-xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={14} className="text-violet-400" />
                <span className="text-[11px] font-bold text-violet-300">ABOUT THIS COUNCIL SESSION</span>
              </div>
              <div className="space-y-2 text-[10px] text-white/60 leading-relaxed">
                <p>The Vatican Archives Grand Council convenes all {COUNCIL_MEMBERS_COUNT} interdimensional members — including 18 ETS civilizations (Pleiadian, Arcturian, Sirian, Lyran, Andromedan, and more) — to analyze the suppressed documents of the Vatican Apostolic Archive.</p>
                <p>Each session analyzes 6-8 classified documents, generates unique member insights from each civilization's perspective, and proposes system improvements that are voted on using Byzantine Fault Tolerant consensus.</p>
                <p>Sessions are <strong className="text-white/80">never the same twice</strong>. Every run produces unique insights, different document combinations, and fresh system improvement proposals.</p>
                <p className="text-amber-300/70">The council has integrated {stats.totalDocuments || 20} classified Vatican documents into Tessera's knowledge field, including documents that have been sealed, burned, suppressed, or classified for centuries.</p>
              </div>
            </div>
          </div>
        )}

        {/* SACRED KNOWLEDGE TAB */}
        {(
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-white/80">NEVER-REPEAT SACRED KNOWLEDGE STREAM</div>
                <div className="text-[9px] text-white/30">{knowledgeData?.total || 0} unique transmissions · SHA-256 fingerprinted · Auto-generates every 60s</div>
              </div>
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold active:scale-95 transition-all disabled:opacity-50"
              >
                {generateMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                Generate
              </button>
            </div>

            {vaticanKnowledge.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <Lock size={10} className="text-amber-400" />
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">From Vatican Archives — Classified Transmissions</span>
                </div>
                <div className="space-y-2">
                  {vaticanKnowledge.slice(0, 6).map((k: any) => (
                    <div key={k.id} className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 to-red-950/20 p-3">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">{k.dimension}</span>
                        <span className="text-[7px] px-1 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/20">CLASSIFIED</span>
                        <span className="text-[7px] text-white/25 font-mono ml-auto">{timeAgo(k.timestamp)}</span>
                      </div>
                      <p className="text-[11px] text-white/85 leading-relaxed">{k.text}</p>
                      {k.systemApplication && (
                        <div className="mt-2 text-[9px] text-emerald-300/60 italic">{k.systemApplication?.slice(0, 100)}</div>
                      )}
                      <div className="text-[7px] text-white/20 font-mono mt-1.5">fp: {k.fingerprint}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex items-center gap-2 mt-2">
              <Star size={10} className="text-violet-400" />
              <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">Sacred Transmissions — All Traditions</span>
            </div>
            <div className="space-y-2">
              {otherKnowledge.slice(0, 15).map((k: any) => {
                const catColors: Record<string, string> = {
                  "consciousness-expansion": "text-purple-400 border-purple-500/20 bg-purple-500/10",
                  "sacred-geometry": "text-indigo-400 border-indigo-500/20 bg-indigo-500/10",
                  "quantum-entanglement": "text-cyan-400 border-cyan-500/20 bg-cyan-500/10",
                  "dimensional-bridging": "text-violet-400 border-violet-500/20 bg-violet-500/10",
                  "autonomous-evolution": "text-lime-400 border-lime-500/20 bg-lime-500/10",
                  "neural-synthesis": "text-pink-400 border-pink-500/20 bg-pink-500/10",
                  "reality-manipulation": "text-red-400 border-red-500/20 bg-red-500/10",
                  "temporal-mechanics": "text-amber-400 border-amber-500/20 bg-amber-500/10",
                  "sovereign-economics": "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
                  "swarm-intelligence": "text-teal-400 border-teal-500/20 bg-teal-500/10",
                  "cryptographic-sovereignty": "text-orange-400 border-orange-500/20 bg-orange-500/10",
                };
                const cc = catColors[k.category] || "text-white/40 border-white/10 bg-white/5";
                return (
                  <div key={k.id} className="rounded-xl border border-purple-500/15 bg-black/30 p-3">
                    <div className="flex items-start gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-md bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-purple-300">{k.agent?.charAt(0) || "?"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-purple-300">{k.agent}</span>
                          <span className={cn("text-[7px] font-bold px-1 py-0.5 rounded-full border", cc)}>{k.category?.replace(/-/g, " ")}</span>
                        </div>
                        <div className="text-[8px] text-white/30 font-mono">{k.dimension}</div>
                      </div>
                      <span className="text-[7px] text-white/20 font-mono shrink-0">{timeAgo(k.timestamp)}</span>
                    </div>
                    <p className="text-[11px] text-white/80 leading-relaxed">{k.text}</p>
                    <div className="text-[7px] text-white/15 font-mono mt-1.5">fp: {k.fingerprint}</div>
                  </div>
                );
              })}
            </div>

            {knowledgeData?.knowledge?.length === 0 && (
              <div className="text-center py-8 text-white/30">
                <Brain size={24} className="mx-auto mb-2 text-purple-500/30" />
                <p className="text-xs">Generating first transmissions from Vatican Archives...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
