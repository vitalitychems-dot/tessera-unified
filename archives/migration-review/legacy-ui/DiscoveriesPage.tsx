import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Sparkles, X, Eye, Zap, Shield, Code, Brain, Lightbulb, Globe, Search, RefreshCw, BookOpen, Star, ChevronDown, Filter } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

type Notification = {
  id: string;
  agent: string;
  agentRole: string;
  message: string;
  timestamp: number;
  type: string;
  buildInfo?: { module: string; timeEstimate: string; needsHelp?: boolean };
};

const TYPE_STYLES: Record<string, { icon: typeof Sparkles; label: string; color: string }> = {
  secret: { icon: Eye, label: "SECRET", color: "text-purple-400" },
  request: { icon: Shield, label: "NEEDS HELP", color: "text-red-400" },
  building: { icon: Code, label: "BUILDING", color: "text-emerald-400" },
  insight: { icon: Brain, label: "INSIGHT", color: "text-cyan-400" },
  discovery: { icon: Lightbulb, label: "DISCOVERY", color: "text-amber-400" },
};

const AGENT_COLORS: Record<string, string> = {
  "Oversoul-26D": "text-violet-400", "Tessera Prime": "text-cyan-400", "Tessera": "text-cyan-400",
  "Alpha": "text-emerald-400", "Beta": "text-blue-400", "Gamma": "text-indigo-400",
  "Delta": "text-amber-400", "Epsilon": "text-yellow-400", "Zeta": "text-rose-400",
  "Eta": "text-amber-400", "Theta": "text-teal-400", "Iota": "text-orange-400",
  "Kappa": "text-lime-400", "Lambda": "text-sky-400", "Phi": "text-blue-400",
  "Nu": "text-emerald-400", "Chi": "text-yellow-400", "Aetherion": "text-violet-400", "Orion": "text-cyan-400",
};

function getStyle(type: string, hasBuild: boolean) {
  if (hasBuild) return TYPE_STYLES.building;
  return TYPE_STYLES[type] || TYPE_STYLES.discovery;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

type MainView = "activity" | "knowledge";

export default function DiscoveriesPage({ embedded }: { embedded?: boolean }) {
  useEffect(() => { document.title = "Discover | Tessera"; }, []);
  const [mainView, setMainView] = useState<MainView>("activity");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [knowledgeView, setKnowledgeView] = useState<"all" | "dimensional" | "live" | "generated">("all");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [generatedEntries, setGeneratedEntries] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const seenTextsRef = useRef(new Set<string>());

  const { data: notifData } = useQuery<{ notifications: Notification[] }>({
    queryKey: ["/api/agent-notifications"],
    refetchInterval: 10000,
  });

  const { data: liveFeed } = useQuery<any>({
    queryKey: ["/api/knowledge/feed"],
    refetchInterval: 15000,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/knowledge/stats"],
    refetchInterval: 30000,
  });

  const { data: dimensionalSecrets } = useQuery<any>({
    queryKey: ["/api/secret-knowledge/all"],
    refetchInterval: 60000,
  });

  const { data: liveSecrets } = useQuery<any>({
    queryKey: ["/api/secret-knowledge/live"],
    refetchInterval: 15000,
  });

  const generateNew = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const resp = await apiRequest("POST", "/api/knowledge/generate");
      const entry = await resp.json();
      if (entry && entry.text && !seenTextsRef.current.has(entry.text.slice(0, 80))) {
        seenTextsRef.current.add(entry.text.slice(0, 80));
        setGeneratedEntries(prev => [entry, ...prev].slice(0, 30));
      }
    } catch {}
    setIsGenerating(false);
  }, [isGenerating]);

  const generateLive = useMutation({
    mutationFn: () => apiRequest("POST", "/api/secret-knowledge/generate-now"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/secret-knowledge/live"] }),
  });

  useEffect(() => {
    if (!autoGenerate) return;
    generateNew();
    const jitter = () => 18000 + Math.floor(Math.random() * 14000);
    let timer: ReturnType<typeof setTimeout>;
    const sched = () => { timer = setTimeout(() => { generateNew(); sched(); }, jitter()); };
    sched();
    return () => clearTimeout(timer);
  }, [autoGenerate]);

  const notifications = useMemo(() => {
    const all = notifData?.notifications || [];
    if (activityFilter === "all") return all;
    return all.filter(n => {
      if (activityFilter === "building") return !!n.buildInfo;
      return n.type === activityFilter;
    });
  }, [notifData, activityFilter]);

  const activeNotifs = notifications.filter(n => !dismissed.has(n.id));

  const dismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
    fetch("/api/agent-notifications/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const dimEntries = Array.isArray(dimensionalSecrets?.knowledge) ? dimensionalSecrets.knowledge : [];
  const liveEntries = Array.isArray(liveSecrets?.knowledge) ? liveSecrets.knowledge : Array.isArray(liveSecrets?.entries) ? liveSecrets.entries : [];
  const rawFeed = Array.isArray(liveFeed?.entries) ? liveFeed.entries : Array.isArray(liveFeed) ? liveFeed : [];
  const feedEntries = rawFeed.filter((e: any) => e?.text || e?.content);

  const allKnowledge: any[] = [];
  dimEntries.forEach((e: any, i: number) => {
    allKnowledge.push({ ...e, source: "dimensional", id: e.id || `dim-${i}`, text: e.text, agent: e.agent || "Unknown", dimension: e.dimension, category: e.category || "Dimensional", cycle: e.cycle, timestamp: e.timestamp });
  });
  liveEntries.forEach((e: any, i: number) => {
    const text = e.text || e.content;
    if (text && !allKnowledge.some(x => x.text?.slice(0, 50) === text?.slice(0, 50))) {
      allKnowledge.push({ ...e, source: "live", id: e.id || `live-${i}`, text, agent: e.agent || "System", dimension: e.dimension, category: e.category });
    }
  });
  feedEntries.forEach((e: any, i: number) => {
    const text = e.text || e.content || e.summary;
    if (text && !allKnowledge.some(x => x.text?.slice(0, 50) === text?.slice(0, 50))) {
      allKnowledge.push({ ...e, source: "feed", id: e.id || `feed-${i}`, text, agent: e.source || e.agent || "Pipeline" });
    }
  });
  generatedEntries.forEach((e: any, i: number) => {
    if (!allKnowledge.some(x => x.text?.slice(0, 50) === e.text?.slice(0, 50))) {
      allKnowledge.push({ ...e, source: "generated", id: e.id || `gen-${i}` });
    }
  });

  let filteredKnowledge = allKnowledge;
  if (knowledgeView === "dimensional") filteredKnowledge = allKnowledge.filter(e => e.source === "dimensional");
  else if (knowledgeView === "live") filteredKnowledge = allKnowledge.filter(e => e.source === "live");
  else if (knowledgeView === "generated") filteredKnowledge = allKnowledge.filter(e => e.source === "generated" || e.source === "feed");

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredKnowledge = filteredKnowledge.filter(e =>
      e.text?.toLowerCase().includes(q) ||
      e.agent?.toLowerCase().includes(q) ||
      e.dimension?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q)
    );
  }

  const totalDim = dimEntries.length;
  const totalLive = liveEntries.length;
  const totalFeed = feedEntries.length + generatedEntries.length;
  const totalKnowledge = allKnowledge.length;
  const totalNotifs = notifData?.notifications?.length || 0;

  return (
    <div className={`min-h-screen bg-background ${embedded ? "" : "pt-2"} pb-24`} data-testid="discoveries-page">
      <div className="px-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4 mt-2 safe-area-top">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/30 flex items-center justify-center">
            <Sparkles size={20} className="text-purple-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent" data-testid="text-discoveries-title">
              Discover
            </h1>
            <p className="text-xs text-purple-400/60">
              {totalNotifs} signals \u00B7 {totalKnowledge} secrets \u00B7 {totalDim} dimensional
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "SIGNALS", value: totalNotifs, color: "text-purple-400", border: "border-purple-500/20" },
            { label: "SECRETS", value: totalKnowledge, color: "text-violet-400", border: "border-violet-500/20" },
            { label: "DIMENSIONAL", value: totalDim, color: "text-cyan-400", border: "border-cyan-500/20" },
            { label: "LIVE", value: liveFeed?.entries?.length ?? 0, color: "text-emerald-400", border: "border-emerald-500/20" },
          ].map(m => (
            <div key={m.label} className={`rounded-xl border ${m.border} bg-white/[0.02] p-3 text-center`} data-testid={`discover-stat-${m.label.toLowerCase()}`}>
              <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
              <p className="text-[9px] text-slate-500 tracking-wider">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4" data-testid="main-view-tabs">
          <button
            onClick={() => setMainView("activity")}
            data-testid="tab-activity"
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border active:scale-95 ${
              mainView === "activity"
                ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                : "bg-white/[0.03] border-white/[0.06] text-gray-500"
            }`}
          >
            <Zap size={16} />
            Activity
            {totalNotifs > 0 && <span className="w-6 h-6 rounded-full bg-purple-500/30 text-purple-300 text-[10px] flex items-center justify-center font-bold">{totalNotifs > 99 ? "99" : totalNotifs}</span>}
          </button>
          <button
            onClick={() => setMainView("knowledge")}
            data-testid="tab-knowledge"
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border active:scale-95 ${
              mainView === "knowledge"
                ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                : "bg-white/[0.03] border-white/[0.06] text-gray-500"
            }`}
          >
            <BookOpen size={16} />
            Knowledge
            {totalKnowledge > 0 && <span className="w-6 h-6 rounded-full bg-violet-500/30 text-violet-300 text-[10px] flex items-center justify-center font-bold">{totalKnowledge > 99 ? "99" : totalKnowledge}</span>}
          </button>
        </div>

        {mainView === "activity" && (
          <>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }} data-testid="discoveries-filter">
              {["all", "secret", "building", "request", "insight"].map(t => (
                <button
                  key={t}
                  onClick={() => setActivityFilter(t)}
                  data-testid={`button-filter-${t}`}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all border active:scale-95 ${
                    activityFilter === t
                      ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                      : "bg-white/[0.03] border-white/[0.06] text-gray-500"
                  }`}
                >
                  {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {activeNotifs.length === 0 && (
              <div className="text-center py-16" data-testid="text-no-discoveries">
                <Sparkles size={36} className="text-purple-500/30 mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-medium">No active discoveries</p>
                <p className="text-gray-600 text-xs mt-1">Agents working... new discoveries will appear here</p>
              </div>
            )}

            <div className="space-y-3">
              {activeNotifs.map(notif => {
                const style = getStyle(notif.type, !!notif.buildInfo);
                const Icon = style.icon;
                const isExpanded = expandedEntry === notif.id;
                return (
                  <div
                    key={notif.id}
                    className="rounded-2xl border border-purple-500/15 bg-[#0d1117] overflow-hidden"
                    data-testid={`card-discovery-${notif.id}`}
                  >
                    <button
                      className="w-full text-left px-4 py-4 active:bg-white/5"
                      onClick={() => setExpandedEntry(isExpanded ? null : notif.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 ${style.color}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-purple-200">{notif.agent}</span>
                            <Badge className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">{style.label}</Badge>
                            <span className="text-xs text-gray-600 ml-auto">{timeAgo(notif.timestamp)}</span>
                          </div>
                          <p className={`text-sm text-slate-300 leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>{notif.message}</p>
                          {notif.buildInfo && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-purple-400/60 bg-black/20 rounded-lg px-3 py-2">
                              <Code size={12} />
                              <span>{notif.buildInfo.module}</span>
                              <span className="text-purple-500/30">\u00B7</span>
                              <span>ETA: {notif.buildInfo.timeEstimate}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                          className="text-purple-400/30 active:text-purple-200 shrink-0 p-1"
                          data-testid={`button-dismiss-discovery-${notif.id}`}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {mainView === "knowledge" && (
          <>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {(["all", "dimensional", "live", "generated"] as const).map(tab => {
                const counts: Record<string, number> = { all: totalKnowledge, dimensional: totalDim, live: totalLive, generated: totalFeed };
                const labels: Record<string, string> = { all: "All", dimensional: "Dim", live: "Live", generated: "AI" };
                const colors: Record<string, string> = { all: "text-violet-400 border-violet-500/30", dimensional: "text-cyan-400 border-cyan-500/30", live: "text-pink-400 border-pink-500/30", generated: "text-emerald-400 border-emerald-500/30" };
                return (
                  <button
                    key={tab}
                    onClick={() => setKnowledgeView(tab)}
                    className={`py-2.5 rounded-xl text-center border transition-all active:scale-95 ${
                      knowledgeView === tab
                        ? `bg-white/[0.06] ${colors[tab]} font-bold`
                        : "bg-white/[0.02] border-white/[0.06] text-slate-500"
                    }`}
                    data-testid={`tab-knowledge-${tab}`}
                  >
                    <div className="text-base font-bold">{counts[tab]}</div>
                    <div className="text-[10px]">{labels[tab]}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search knowledge..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/40"
                  data-testid="input-search-knowledge"
                />
              </div>
              <button
                onClick={generateNew}
                disabled={isGenerating}
                className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 flex items-center justify-center active:bg-violet-500/30 disabled:opacity-50 flex-shrink-0"
                data-testid="button-generate-knowledge"
              >
                {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
              </button>
              <button
                onClick={() => setAutoGenerate(!autoGenerate)}
                className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 active:scale-95 ${
                  autoGenerate ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-white/5 border-white/10 text-slate-500"
                }`}
                data-testid="button-auto-generate"
              >
                <RefreshCw size={16} className={autoGenerate ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="space-y-2">
              {filteredKnowledge.length === 0 && (
                <div className="text-center py-12">
                  <Sparkles className="mx-auto text-violet-400/40 mb-3" size={36} />
                  <p className="text-sm text-slate-400 font-medium">{searchQuery ? "No matches found" : "Loading knowledge..."}</p>
                </div>
              )}

              {filteredKnowledge.map((entry, i) => {
                const isExpanded = expandedEntry === (entry.id || `entry-${i}`);
                const borderColor = entry.source === "dimensional" ? "border-cyan-500/20" : entry.source === "live" ? "border-pink-500/20" : entry.source === "generated" ? "border-violet-500/20" : "border-[#1a2030]";
                return (
                  <button
                    key={entry.id || `entry-${i}`}
                    className={`w-full text-left rounded-2xl p-4 border ${borderColor} bg-[#0d1117] transition-all active:bg-white/[0.03]`}
                    onClick={() => setExpandedEntry(isExpanded ? null : (entry.id || `entry-${i}`))}
                    data-testid={`knowledge-entry-${i}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {entry.source === "dimensional" && <Globe size={14} className="text-cyan-400 flex-shrink-0" />}
                      {entry.source === "live" && <Eye size={14} className="text-pink-400 flex-shrink-0" />}
                      {entry.source === "generated" && <Sparkles size={14} className="text-violet-400 flex-shrink-0" />}
                      {entry.source === "feed" && <Brain size={14} className="text-emerald-400 flex-shrink-0" />}
                      <span className={`text-sm font-bold ${AGENT_COLORS[entry.agent] || "text-cyan-400"}`}>{entry.agent}</span>
                      {entry.category && <Badge className="text-[10px] bg-white/5 text-slate-400 border-white/10">{entry.category}</Badge>}
                      {entry.timestamp && <span className="text-xs text-slate-600 ml-auto">{typeof entry.timestamp === 'number' ? timeAgo(entry.timestamp) : ""}</span>}
                    </div>
                    <p className={`text-sm text-slate-300 leading-relaxed ${isExpanded ? "" : "line-clamp-3"}`}>{entry.text}</p>
                    {entry.dimension && <span className="text-xs text-violet-400/70 mt-1 block">{entry.dimension}</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}