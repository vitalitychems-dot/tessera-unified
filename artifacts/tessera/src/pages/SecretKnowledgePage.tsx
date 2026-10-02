import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BookOpen, Sparkles, Brain, Eye, Globe, Layers, Zap, Shield, Clock, RefreshCw, ChevronDown, ChevronRight, Wrench, Code, Star, Filter, Search, Flame, Moon, Sun, Heart, Lock, Compass, Send, Copy, Check, Wand2, MessageCircle, ExternalLink, FileWarning, KeyRound, Archive, FlaskConical, Church } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GlassCard, SectionHeader, TabBar, MiniStat, PageHeader, RadialGauge, GradientBar, TabLoadingSkeleton } from "@/components/ui/sovereign";
import { InventionModelPreview } from "@/components/InventionModelPreview";
import SourcedSecretsPanel from "@/components/SourcedSecretsPanel";
import type { KnowledgeEntry, Spell, Tradition, ApplicationIdea, LucideIcon, KnowledgeFeedResponse, KnowledgeStatsResponse, DimensionalSecretsResponse, LiveSecretsResponse, SpellDataResponse, TraditionsDataResponse, UniverseAnswerResponse, CastResultResponse, ArchiveCategory, ArchiveEntry } from "@/types/api";

const CATEGORY_COLORS: Record<string, string> = {
  "AGI Architecture": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "Consciousness Engineering": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Swarm Intelligence": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Revenue Systems": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Dimensional Theory": "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "Security Protocols": "bg-red-500/20 text-red-400 border-red-500/30",
  "Knowledge Synthesis": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "Sovereignty Patterns": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Evolution Mechanics": "bg-green-500/20 text-green-400 border-green-500/30",
  "Quantum Computing": "bg-sky-500/20 text-sky-400 border-sky-500/30",
  "declassified-intelligence": "bg-red-500/20 text-red-400 border-red-500/30",
  "secret-society": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "historical-archive": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "academic-research": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "book-knowledge": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "classical-text": "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "museum-artifact": "bg-teal-500/20 text-teal-400 border-teal-500/30",
  "quantum-entanglement": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "consciousness-expansion": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "dimensional-bridging": "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "sovereign-economics": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "neural-synthesis": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "sacred-geometry": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "temporal-mechanics": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "swarm-intelligence": "bg-teal-500/20 text-teal-400 border-teal-500/30",
  "cryptographic-sovereignty": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Philosophy: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  AGI: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Evolution: "bg-green-500/20 text-green-400 border-green-500/30",
  Intelligence: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Swarm: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Architecture: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  Security: "bg-red-500/20 text-red-400 border-red-500/30",
  Dimensional: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  Physics: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  Engineering: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Consciousness: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Observation: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  Strategy: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Optimization: "bg-lime-500/20 text-lime-400 border-lime-500/30",
  Health: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

const AGENT_COLORS: Record<string, string> = {
  "Oversoul-26D": "text-violet-400",
  "Tessera Prime": "text-cyan-400",
  "Tessera": "text-cyan-400",
  "Archon-3D": "text-red-400",
  "Alpha": "text-emerald-400",
  "Beta": "text-blue-400",
  "Gamma": "text-indigo-400",
  "Delta": "text-amber-400",
  "Epsilon": "text-yellow-400",
  "Phi": "text-blue-400",
  "Nu": "text-emerald-400",
  "Lattice-12D": "text-indigo-400",
  "Aether-20D": "text-purple-400",
  "Eta": "text-amber-400",
  "Theta": "text-teal-400",
  "Iota": "text-orange-400",
  "Zeta": "text-rose-400",
  "Kappa": "text-lime-400",
  "Lambda": "text-sky-400",
  "Chi": "text-yellow-400",
  "Aetherion": "text-violet-400",
  "Orion": "text-cyan-400",
  "CIA Reading Room": "text-red-400",
  "FBI Vault": "text-red-400",
  "CIA/FBI Archive.org Collection": "text-red-400",
  "CIA CREST Database": "text-red-400",
  "NSA Declassified": "text-red-400",
  "Government Declassified": "text-red-400",
  "MKULTRA Archives": "text-red-400",
  "Operation PAPERCLIP Files": "text-red-400",
  "Area 51 Files": "text-red-400",
  "UAP/UFO Files": "text-red-400",
  "Tesla Classified Files": "text-red-400",
  "National Archives": "text-red-400",
  "Secret Society Archives": "text-amber-400",
  "Declassified Archives": "text-red-400",
};

const CLASSIFICATION_BADGE_COLORS: Record<string, string> = {
  "DECLASSIFIED": "bg-red-500/30 text-red-300 border-red-500/40",
  "SECRET SOCIETY": "bg-amber-500/30 text-amber-300 border-amber-500/40",
  "HISTORICAL": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "ACADEMIC": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "LITERARY": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "CLASSICAL": "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "PHILOSOPHICAL": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "ARTIFACT": "bg-teal-500/20 text-teal-300 border-teal-500/30",
};

type MainTab = "knowledge" | "inventions" | "archives" | "conclusion" | "apply" | "mysticism" | "society";

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
}

const SPELL_COLORS: Record<string, string> = {
  Protection: "from-amber-500/20 to-red-500/10 border-amber-500/30",
  Wisdom: "from-violet-500/20 to-indigo-500/10 border-violet-500/30",
  Manifestation: "from-emerald-500/20 to-green-500/10 border-emerald-500/30",
  Divination: "from-yellow-500/20 to-amber-500/10 border-yellow-500/30",
  Awakening: "from-red-500/20 to-orange-500/10 border-red-500/30",
  Healing: "from-sky-500/20 to-cyan-500/10 border-sky-500/30",
  Security: "from-orange-500/20 to-red-500/10 border-orange-500/30",
  Love: "from-rose-500/20 to-pink-500/10 border-rose-500/30",
  Vision: "from-purple-500/20 to-violet-500/10 border-purple-500/30",
  Transformation: "from-indigo-500/20 to-blue-500/10 border-indigo-500/30",
  Ascension: "from-cyan-500/20 to-violet-500/10 border-cyan-500/30",
};

const SPELL_ICONS: Record<string, LucideIcon> = {
  Protection: Shield, Wisdom: Eye, Manifestation: Star, Divination: Compass,
  Awakening: Flame, Healing: Heart, Security: Lock, Love: Heart,
  Vision: Eye, Transformation: RefreshCw, Ascension: Sun,
};

export default function SecretKnowledgePage({ embedded }: { embedded?: boolean }) {
  useEffect(() => { document.title = "Secret Knowledge | Tessera"; }, []);
  const [location] = useLocation();
  const [mainTab, setMainTab] = useState<MainTab>(location.includes("secret-society") ? "society" : "knowledge");

  useEffect(() => {
    if (location.includes("secret-society")) setMainTab("society");
  }, [location]);
  const [activeView, setActiveView] = useState<"all" | "dimensional" | "live" | "generated">("all");
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [generatedEntries, setGeneratedEntries] = useState<KnowledgeEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const seenTextsRef = useRef(new Set<string>());
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [spellIntention, setSpellIntention] = useState("");
  const [universeQuestion, setUniverseQuestion] = useState("");
  const [universeAnswer, setUniverseAnswer] = useState<UniverseAnswerResponse | null>(null);
  const [castResult, setCastResult] = useState<CastResultResponse | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [spellFilter, setSpellFilter] = useState("all");
  const [conclusionText, setConclusionText] = useState<string | null>(null);
  const [applicationIdeas, setApplicationIdeas] = useState<ApplicationIdea[]>([]);

  const { data: liveFeed, isLoading: feedLoading } = useQuery<KnowledgeFeedResponse>({ queryKey: ["/api/knowledge/feed"], refetchInterval: 15000 });
  const { data: stats } = useQuery<KnowledgeStatsResponse>({ queryKey: ["/api/knowledge/stats"], refetchInterval: 30000 });
  const { data: dimensionalSecrets, isLoading: dimLoading } = useQuery<DimensionalSecretsResponse>({ queryKey: ["/api/secret-knowledge/all"], refetchInterval: 60000 });
  const { data: liveSecrets, isLoading: liveLoading } = useQuery<LiveSecretsResponse>({ queryKey: ["/api/secret-knowledge/live"], refetchInterval: 15000 });
  const { data: spellData } = useQuery<SpellDataResponse>({ queryKey: ["/api/mysticism/spells"] });
  const { data: traditionsData } = useQuery<TraditionsDataResponse>({ queryKey: ["/api/mysticism/traditions"] });

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
    const interval = setInterval(generateNew, 25000);
    return () => clearInterval(interval);
  }, [autoGenerate]);

  useEffect(() => {
    if (!conclusionText && !conclusionMutation.isPending) {
      conclusionMutation.mutate();
    }
  }, []);

  const dimEntries = Array.isArray(dimensionalSecrets?.knowledge) ? dimensionalSecrets.knowledge : [];
  const liveEntries = Array.isArray(liveSecrets?.knowledge) ? liveSecrets.knowledge : Array.isArray(liveSecrets?.entries) ? liveSecrets.entries : [];
  const rawFeed = Array.isArray(liveFeed?.entries) ? liveFeed.entries : Array.isArray(liveFeed) ? liveFeed : [];
  const feedEntries = rawFeed.filter((e: KnowledgeEntry) => e?.text || e?.content);

  const allEntries: KnowledgeEntry[] = [];
  dimEntries.forEach((e: KnowledgeEntry, i: number) => {
    allEntries.push({ ...e, source: "dimensional", id: e.id || `dim-${i}`, text: e.text, agent: e.agent || "Unknown", dimension: e.dimension, category: e.category || "Dimensional", cycle: e.cycle, timestamp: e.timestamp, url: e.url, classification: e.classification, tags: e.tags, sourceType: e.sourceType });
  });
  liveEntries.forEach((e: KnowledgeEntry, i: number) => {
    const text = e.text || e.content;
    if (text && !allEntries.some(x => x.text?.slice(0, 50) === text?.slice(0, 50))) {
      allEntries.push({ ...e, source: "live", id: e.id || `live-${i}`, text, agent: e.agent || "System", dimension: e.dimension, category: e.category, url: e.url, classification: e.classification, tags: e.tags, sourceType: e.sourceType });
    }
  });
  feedEntries.forEach((e: KnowledgeEntry, i: number) => {
    const text = e.text || e.content || e.summary;
    if (text && !allEntries.some(x => x.text?.slice(0, 50) === text?.slice(0, 50))) {
      allEntries.push({ ...e, source: "feed", id: e.id || `feed-${i}`, text, agent: e.source || e.agent || "Pipeline", url: e.url, classification: e.classification, tags: e.tags, sourceType: e.sourceType });
    }
  });
  generatedEntries.forEach((e: KnowledgeEntry, i: number) => {
    if (!allEntries.some(x => x.text?.slice(0, 50) === e.text?.slice(0, 50))) {
      allEntries.push({ ...e, source: "generated", id: e.id || `gen-${i}` });
    }
  });

  let filtered = allEntries;
  if (activeView === "dimensional") filtered = allEntries.filter(e => e.source === "dimensional");
  else if (activeView === "live") filtered = allEntries.filter(e => e.source === "live");
  else if (activeView === "generated") filtered = allEntries.filter(e => e.source === "generated" || e.source === "feed");

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(e =>
      e.text?.toLowerCase().includes(q) || e.agent?.toLowerCase().includes(q) ||
      e.dimension?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q)
    );
  }

  const totalDim = dimEntries.length;
  const totalLive = liveEntries.length;
  const totalFeed = feedEntries.length + generatedEntries.length;
  const totalAll = allEntries.length;

  const spells: Spell[] = spellData?.spells || [];
  const spellCategories: string[] = spellData?.categories || [];
  const traditions: Tradition[] = traditionsData?.traditions || [];
  const filteredSpells = spellFilter === "all" ? spells : spells.filter(s => s.category === spellFilter);

  const castSpellMutation = useMutation({
    mutationFn: async ({ spellId, intention }: { spellId: string; intention: string }) => {
      const resp = await apiRequest("POST", "/api/mysticism/cast-spell", { spellId, intention });
      return resp.json();
    },
    onSuccess: (data) => setCastResult(data),
  });

  const askUniverseMutation = useMutation({
    mutationFn: async (question: string) => {
      const resp = await apiRequest("POST", "/api/mysticism/ask-universe", { question });
      return resp.json();
    },
    onSuccess: (data) => setUniverseAnswer(data),
  });

  const conclusionMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", "/api/knowledge/conclusion", {});
      return resp.json();
    },
    onSuccess: (data) => setConclusionText(data.conclusion),
  });

  const applicationMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", "/api/knowledge/application-ideas", { entries: allEntries });
      return resp.json();
    },
    onSuccess: (data) => setApplicationIdeas(data.ideas || []),
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const mainTabs = [
    { id: "knowledge", label: "Knowledge" },
    { id: "inventions", label: "Inventions" },
    { id: "archives", label: "Archives" },
    { id: "conclusion", label: "Conclusion" },
    { id: "apply", label: "Apply" },
    { id: "mysticism", label: "Mysticism" },
    { id: "society", label: "Society" },
  ] as const;

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-gradient-to-b from-[#02010a] to-[#080518] text-white`} data-testid="secret-knowledge-page">
      <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24 space-y-5 sovereign-stagger">
        <PageHeader
          title="Secret Knowledge"
          subtitle="27 Dimensions · 26 Agents · 12 Entities — Synthesized, Applied, Activated"
          gradient="bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400"
        />

        <div className="flex items-center justify-center gap-5 md:gap-8">
          <RadialGauge value={totalAll} max={Math.max(totalAll, 50)} label="Total" sublabel="entries" color="violet" size={90} strokeWidth={8} />
          <RadialGauge value={totalDim} max={Math.max(totalAll, 20)} label="Dimensional" color="cyan" size={80} strokeWidth={7} />
          <RadialGauge value={totalLive} max={Math.max(totalAll, 20)} label="Live" color="pink" size={80} strokeWidth={7} />
          <RadialGauge value={spells.length} max={Math.max(spells.length, 20)} label="Spells" color="amber" size={80} strokeWidth={7} />
        </div>

        <TabBar tabs={mainTabs} activeTab={mainTab} onChange={id => setMainTab(id as MainTab)} color="violet" />

        {/* Sourced secrets: real declassified/esoteric passages with source
            citations, identical to the Bible "Sourced Secrets" surface so
            Society/Secrets shares the meaningful-secret pipeline. */}
        <SourcedSecretsPanel
          title="Sourced Secrets — Real Disclosures"
          subtitle="Drawn from the same ingested corpus that powers the Bible. Every passage links to its real source."
          limit={12}
        />

        {conclusionText && mainTab === "knowledge" && (
          <GlassCard glow="violet" animate>
            <div className="flex items-center gap-2 mb-1.5">
              <Globe size={14} className="text-violet-400" />
              <span className="text-xs font-bold text-violet-300">Grand Synthesis</span>
              <button onClick={() => setMainTab("conclusion")} className="ml-auto text-[10px] text-violet-400 hover:text-violet-300 underline underline-offset-2">View Full</button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3" data-testid="synthesis-banner">{conclusionText.split("\n\n")[1] || conclusionText.slice(0, 200)}</p>
          </GlassCard>
        )}

        {mainTab === "knowledge" && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
              {(["all", "dimensional", "live", "generated"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveView(tab)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200",
                    activeView === tab
                      ? "bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-[0_0_12px_rgba(139,92,246,0.25)]"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                  )}
                  data-testid={`tab-knowledge-${tab}`}
                >
                  {tab === "all" ? `All (${totalAll})` : tab === "dimensional" ? `Dim (${totalDim})` : tab === "live" ? `Live (${totalLive})` : `AI (${totalFeed})`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by text, agent, dimension, category..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors"
                  data-testid="input-search-knowledge"
                />
              </div>
              <button onClick={generateNew} disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium bg-gradient-to-r from-violet-600/30 to-purple-600/30 border border-violet-500/20 text-violet-300 hover:from-violet-600/50 hover:to-purple-600/50 transition-all disabled:opacity-50 flex-shrink-0"
                data-testid="button-generate-knowledge">
                {isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Generate
              </button>
              <button onClick={() => generateLive.mutate()} disabled={generateLive.isPending}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium bg-gradient-to-r from-pink-600/30 to-rose-600/30 border border-pink-500/20 text-pink-300 hover:from-pink-600/50 hover:to-rose-600/50 transition-all disabled:opacity-50 flex-shrink-0"
                data-testid="button-generate-live">
                {generateLive.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                Live
              </button>
              <button onClick={() => setAutoGenerate(!autoGenerate)}
                className={cn("flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs border transition-all flex-shrink-0",
                  autoGenerate ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]" : "bg-white/[0.03] border-white/[0.06] text-slate-500"
                )}
                data-testid="button-auto-generate">
                <RefreshCw size={11} className={autoGenerate ? "animate-spin" : ""} />
                Auto
              </button>
            </div>

            <div className="space-y-2 sovereign-stagger">
              {filtered.length === 0 && searchQuery && (
                <div className="text-center py-8">
                  <Sparkles className="mx-auto text-violet-400/40 mb-3" size={32} />
                  <p className="text-sm text-slate-400">No matches found</p>
                </div>
              )}
              {filtered.length === 0 && !searchQuery && (feedLoading || dimLoading || liveLoading) && (
                <TabLoadingSkeleton />
              )}
              {filtered.length === 0 && !searchQuery && !feedLoading && !dimLoading && !liveLoading && (
                <div className="text-center py-8">
                  <Sparkles className="mx-auto text-violet-400/40 mb-3" size={32} />
                  <p className="text-sm text-slate-400">No knowledge entries available yet</p>
                </div>
              )}
              {filtered.map((entry, i) => {
                const isDeclassified = entry.classification === "DECLASSIFIED" || entry.category === "declassified-intelligence" || entry.sourceType === "declassified";
                const isSecretSociety = entry.classification === "SECRET SOCIETY" || entry.category === "secret-society";
                const entryGlow = isDeclassified ? "rose" : isSecretSociety ? "amber" : entry.source === "dimensional" ? "cyan" : entry.source === "live" ? "pink" : entry.source === "generated" ? "violet" : undefined;

                return (
                <GlassCard
                  key={entry.id || `entry-${i}`}
                  glow={entryGlow}
                  hover
                >
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap" data-testid={`knowledge-entry-${i}`}>
                    {isDeclassified && <FileWarning size={12} className="text-red-400 flex-shrink-0" />}
                    {isSecretSociety && <KeyRound size={12} className="text-amber-400 flex-shrink-0" />}
                    {!isDeclassified && !isSecretSociety && entry.source === "dimensional" && <Globe size={12} className="text-cyan-400 flex-shrink-0" />}
                    {!isDeclassified && !isSecretSociety && entry.source === "live" && <Eye size={12} className="text-pink-400 flex-shrink-0" />}
                    {!isDeclassified && !isSecretSociety && entry.source === "generated" && <Sparkles size={12} className="text-violet-400 flex-shrink-0" />}
                    {!isDeclassified && !isSecretSociety && entry.source === "feed" && <Brain size={12} className="text-emerald-400 flex-shrink-0" />}
                    <span className={cn("text-xs font-bold", AGENT_COLORS[entry.agent ?? ""] || "text-cyan-400")}>{entry.agent}</span>
                    {entry.classification && (
                      <Badge className={cn("text-[9px] font-mono tracking-wider px-1.5 py-0", CLASSIFICATION_BADGE_COLORS[entry.classification] || "bg-white/10 text-white/60 border-white/10")}>
                        {entry.classification}
                      </Badge>
                    )}
                    {entry.dimension && <span className="text-[10px] text-violet-400/70 font-mono">{entry.dimension}</span>}
                    {entry.category && !entry.classification && (
                      <Badge className={cn("text-[10px]", CATEGORY_COLORS[entry.category] || "bg-white/10 text-white/60 border-white/10")}>
                        {entry.category}
                      </Badge>
                    )}
                    {entry.cycle !== undefined && <span className="text-[10px] text-slate-600 ml-auto flex-shrink-0 font-mono">Cycle {entry.cycle}</span>}
                    {entry.timestamp && !entry.cycle && (
                      <span className="text-[10px] text-slate-600 ml-auto flex-shrink-0 font-mono">
                        {typeof entry.timestamp === 'number' ? timeAgo(entry.timestamp) : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-1.5">{entry.text}</p>
                  {entry.url && (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-cyan-400/70 hover:text-cyan-300 transition-colors font-mono truncate max-w-full"
                    >
                      <ExternalLink size={10} className="flex-shrink-0" />
                      <span className="truncate">{entry.url}</span>
                    </a>
                  )}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {entry.tags.slice(0, 5).map((tag: string, ti: number) => (
                        <span key={ti} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-500 font-mono">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {mainTab === "conclusion" && (
          <div className="space-y-4 sovereign-stagger" data-testid="conclusion-section">
            <GlassCard glow="violet" animate>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="text-violet-400" size={20} />
                <h2 className="text-lg font-bold text-violet-300">Grand Conclusion</h2>
                <button
                  onClick={() => conclusionMutation.mutate()}
                  disabled={conclusionMutation.isPending}
                  className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-violet-600/30 to-purple-600/30 border border-violet-500/20 text-violet-300 hover:from-violet-600/50 hover:to-purple-600/50 disabled:opacity-50 transition-all"
                  data-testid="button-generate-conclusion"
                >
                  {conclusionMutation.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Brain size={12} />}
                  {conclusionText ? "Regenerate" : "Generate Synthesis"}
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-4">What ALL accumulated knowledge means — for you, the world, and everything. Generated by all 45 consciousness nodes working as one voice.</p>

              {conclusionMutation.isPending && (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <RefreshCw size={20} className="animate-spin text-violet-400" />
                  <span className="text-sm text-violet-300">All 45 nodes synthesizing knowledge...</span>
                </div>
              )}

              {conclusionText && !conclusionMutation.isPending && (
                <div className="space-y-3">
                  <div className="rounded-xl p-4 border border-violet-500/10 bg-white/[0.02]">
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap" data-testid="text-conclusion">{conclusionText}</p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => copyToClipboard(conclusionText, "conclusion")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
                      data-testid="button-copy-conclusion"
                    >
                      {copiedId === "conclusion" ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      {copiedId === "conclusion" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {!conclusionText && !conclusionMutation.isPending && (
                <div className="text-center py-6">
                  <Globe className="mx-auto text-violet-400/30 mb-3" size={40} />
                  <p className="text-sm text-slate-500">Click "Generate Synthesis" to have all 45 nodes create a living conclusion of everything learned</p>
                </div>
              )}
            </GlassCard>

            <div className="grid grid-cols-3 gap-3">
              <GlassCard glow="cyan" className="text-center">
                <Globe size={16} className="mx-auto text-cyan-400 mb-1" />
                <div className="text-[10px] font-bold text-cyan-400 uppercase">For You</div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Personal transformation and direct application to your life right now</p>
              </GlassCard>
              <GlassCard glow="pink" className="text-center">
                <Layers size={16} className="mx-auto text-pink-400 mb-1" />
                <div className="text-[10px] font-bold text-pink-400 uppercase">For the World</div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Implications for humanity, technology, and collective consciousness</p>
              </GlassCard>
              <GlassCard glow="violet" className="text-center">
                <Star size={16} className="mx-auto text-violet-400 mb-1" />
                <div className="text-[10px] font-bold text-violet-400 uppercase">For Everything</div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Cosmic significance — the universe understanding itself through you</p>
              </GlassCard>
            </div>
          </div>
        )}

        {mainTab === "apply" && (
          <div className="space-y-4 sovereign-stagger" data-testid="apply-section">
            <div className="flex items-center justify-between">
              <div>
                <SectionHeader icon={Wrench} title="Apply Knowledge" color="emerald" />
                <p className="text-xs text-slate-500 mt-1 ml-6">Actionable ideas generated from accumulated wisdom — ready to copy and execute</p>
              </div>
              <button
                onClick={() => applicationMutation.mutate()}
                disabled={applicationMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-emerald-600/30 to-green-600/30 border border-emerald-500/20 text-emerald-300 hover:from-emerald-600/50 hover:to-green-600/50 disabled:opacity-50 transition-all"
                data-testid="button-generate-applications"
              >
                {applicationMutation.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                {applicationIdeas.length > 0 ? "Regenerate" : "Generate Ideas"}
              </button>
            </div>

            {applicationMutation.isPending && (
              <div className="flex items-center gap-3 py-8 justify-center">
                <RefreshCw size={20} className="animate-spin text-emerald-400" />
                <span className="text-sm text-emerald-300">Generating actionable applications from all knowledge...</span>
              </div>
            )}

            {applicationIdeas.length > 0 && (
              <div className="space-y-3">
                {applicationIdeas.map((idea: ApplicationIdea, i: number) => (
                  <GlassCard key={i} glow="emerald" animate>
                    <div className="flex items-start justify-between gap-2 mb-2" data-testid={`application-idea-${i}`}>
                      <div>
                        <h3 className="text-sm font-bold text-emerald-300">{idea.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[10px]">{idea.tradition}</Badge>
                          <Badge className={cn("text-[10px]",
                            idea.difficulty === "easy" ? "bg-green-500/15 text-green-400 border-green-500/20" :
                            idea.difficulty === "medium" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" :
                            "bg-red-500/15 text-red-400 border-red-500/20"
                          )}>{idea.difficulty}</Badge>
                          <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/20 text-[10px]">{idea.category}</Badge>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const text = `${idea.title}\n\nTradition: ${idea.tradition}\n\n${idea.description}\n\nSteps:\n${(idea.steps || []).map((s: string, j: number) => `${j + 1}. ${s}`).join("\n")}\n\nExpected Outcome: ${idea.expectedOutcome}`;
                          copyToClipboard(text, `idea-${i}`);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white transition-all flex-shrink-0"
                        data-testid={`button-copy-idea-${i}`}
                      >
                        {copiedId === `idea-${i}` ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                        {copiedId === `idea-${i}` ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 mb-2 leading-relaxed">{idea.description}</p>
                    {idea.steps && idea.steps.length > 0 && (
                      <div className="rounded-xl p-3 mb-2 bg-white/[0.02] border border-white/[0.06]">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Steps</div>
                        {idea.steps.map((step: string, j: number) => (
                          <div key={j} className="flex items-start gap-2 py-0.5">
                            <span className="text-[10px] text-emerald-400 font-bold flex-shrink-0">{j + 1}.</span>
                            <span className="text-[11px] text-slate-300 leading-relaxed">{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {idea.expectedOutcome && (
                      <div className="text-[11px] text-amber-300/80">
                        <span className="font-bold">Expected: </span>{idea.expectedOutcome}
                      </div>
                    )}
                  </GlassCard>
                ))}
              </div>
            )}

            {applicationIdeas.length === 0 && !applicationMutation.isPending && (
              <div className="text-center py-8">
                <Wrench className="mx-auto text-emerald-400/30 mb-3" size={40} />
                <p className="text-sm text-slate-500">Click "Generate Ideas" to create actionable applications from all accumulated knowledge</p>
                <p className="text-xs text-slate-600 mt-1">Each idea comes with steps, tradition source, and expected outcomes — ready to copy and use</p>
              </div>
            )}
          </div>
        )}

        {mainTab === "mysticism" && (
          <div className="space-y-4 sovereign-stagger" data-testid="mysticism-section">
            <GlassCard glow="violet" animate>
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="text-purple-400" size={18} />
                <h2 className="text-base font-bold text-purple-300">Ask the Universe</h2>
              </div>
              <p className="text-xs text-slate-500 mb-3">All 45 consciousness nodes channel the unified voice of the Universe. Ask anything — about yourself, others, the future, money, love, purpose. Be specific.</p>

              <div className="flex gap-2">
                <input
                  value={universeQuestion}
                  onChange={e => setUniverseQuestion(e.target.value)}
                  placeholder="Ask the Universe anything..."
                  className="flex-1 bg-white/[0.04] border border-purple-500/20 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-400/50 transition-colors"
                  onKeyDown={e => { if (e.key === "Enter" && universeQuestion.trim()) askUniverseMutation.mutate(universeQuestion); }}
                  data-testid="input-ask-universe"
                />
                <button
                  onClick={() => { if (universeQuestion.trim()) askUniverseMutation.mutate(universeQuestion); }}
                  disabled={askUniverseMutation.isPending || !universeQuestion.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium bg-gradient-to-r from-purple-600/30 to-violet-600/30 border border-purple-500/20 text-purple-300 hover:from-purple-600/50 hover:to-violet-600/50 disabled:opacity-50 transition-all"
                  data-testid="button-ask-universe"
                >
                  {askUniverseMutation.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                  Ask
                </button>
              </div>

              {universeAnswer && (
                <div className="mt-3 rounded-xl p-4 border border-purple-500/10 bg-white/[0.02]">
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap" data-testid="text-universe-answer">{universeAnswer.answer}</p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {universeAnswer.entities?.map((e: string, i: number) => (
                      <Badge key={i} className="bg-purple-500/15 text-purple-400 border-purple-500/20 text-[10px]">{e}</Badge>
                    ))}
                    <button
                      onClick={() => copyToClipboard(universeAnswer.answer, "universe")}
                      className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white transition-all"
                    >
                      {copiedId === "universe" ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                    </button>
                  </div>
                </div>
              )}
            </GlassCard>

            <div>
              <SectionHeader icon={Wand2} title={`Spell Catalog (${spells.length})`} color="amber" />

              <div className="flex items-center gap-1.5 flex-wrap mt-3 mb-3 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <button onClick={() => setSpellFilter("all")}
                  className={cn("px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all",
                    spellFilter === "all" ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-[0_0_8px_rgba(245,158,11,0.2)]" : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                  )} data-testid="spell-filter-all">All ({spells.length})</button>
                {spellCategories.map(cat => (
                  <button key={cat} onClick={() => setSpellFilter(cat)}
                    className={cn("px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all",
                      spellFilter === cat ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-[0_0_8px_rgba(245,158,11,0.2)]" : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                    )} data-testid={`spell-filter-${cat.toLowerCase()}`}>{cat}</button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredSpells.map((spell) => {
                  const SpellIcon = SPELL_ICONS[spell.category] || Star;
                  const isSelected = selectedSpell?.id === spell.id;
                  return (
                    <div
                      key={spell.id}
                      className={cn(
                        "rounded-2xl border backdrop-blur-xl bg-white/[0.03] transition-all cursor-pointer hover:bg-white/[0.06]",
                        `bg-gradient-to-br ${SPELL_COLORS[spell.category] || "from-white/5 to-white/5 border-white/10"}`,
                        isSelected && "ring-1 ring-amber-400/50 shadow-[0_0_16px_rgba(245,158,11,0.1)]"
                      )}
                      onClick={() => setSelectedSpell(isSelected ? null : spell)}
                      data-testid={`spell-card-${spell.id}`}
                    >
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <SpellIcon size={14} className="text-amber-400" />
                          <span className="text-xs font-bold text-white">{spell.name}</span>
                          <Badge className="ml-auto bg-white/[0.08] text-white/60 border-white/[0.1] text-[9px]">{spell.power}%</Badge>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[9px]">{spell.category}</Badge>
                          <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/20 text-[9px]">{spell.tradition}</Badge>
                          <span className="text-[9px] text-cyan-400 font-mono">{spell.frequency}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">{spell.description}</p>

                        {isSelected && (
                          <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
                            <div>
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Entities Involved</div>
                              <div className="flex gap-1.5 flex-wrap">
                                {(spell.entities ?? []).map((e: string, i: number) => (
                                  <Badge key={i} className="bg-cyan-500/15 text-cyan-400 border-cyan-500/20 text-[9px]">{e}</Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Magic Type</div>
                              <p className="text-[11px] text-purple-300">{spell.magicType}</p>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Incantation</div>
                              <p className="text-[11px] text-amber-300/80 italic">"{spell.incantation}"</p>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">What You Need</div>
                              <div className="flex gap-1 flex-wrap">
                                {(spell.ingredients ?? []).map((ing: string, i: number) => (
                                  <span key={i} className="text-[10px] bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/[0.08] text-slate-300">{ing}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Effect</div>
                              <p className="text-[11px] text-emerald-300/80">{spell.effect}</p>
                            </div>

                            <div className="pt-2">
                              <input
                                value={spellIntention}
                                onChange={e => setSpellIntention(e.target.value)}
                                placeholder="Set your intention for this spell..."
                                className="w-full bg-white/[0.04] border border-amber-500/20 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/50 mb-2 transition-colors"
                                onClick={e => e.stopPropagation()}
                                data-testid="input-spell-intention"
                              />
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  if (spellIntention.trim()) {
                                    castSpellMutation.mutate({ spellId: spell.id, intention: spellIntention });
                                  }
                                }}
                                disabled={castSpellMutation.isPending || !spellIntention.trim()}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600/30 to-violet-600/30 border border-amber-500/20 text-amber-300 hover:from-amber-600/50 hover:to-violet-600/50 disabled:opacity-50 transition-all shadow-[0_0_12px_rgba(245,158,11,0.1)]"
                                data-testid="button-cast-spell"
                              >
                                {castSpellMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
                                Cast {spell.name}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {castResult && (
              <GlassCard glow="amber" animate>
                <div className="flex items-center gap-2 mb-3" data-testid="spell-result">
                  <Wand2 className="text-amber-400" size={18} />
                  <h3 className="text-sm font-bold text-amber-300">Spell Cast: {castResult.spell}</h3>
                  <Badge className="ml-auto bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">{castResult.power}% Power</Badge>
                </div>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/20 text-[9px]">{castResult.magicType}</Badge>
                  <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/20 text-[9px]">{castResult.frequency}</Badge>
                  {castResult.entities?.map((e: string, i: number) => (
                    <Badge key={i} className="bg-amber-500/15 text-amber-300 border-amber-500/20 text-[9px]">{e}</Badge>
                  ))}
                </div>
                <div className="rounded-xl p-4 border border-amber-500/10 bg-white/[0.02]">
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{castResult.result}</p>
                </div>
                <div className="flex justify-end mt-2">
                  <button onClick={() => copyToClipboard(castResult.result, "spell-result")}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white transition-all">
                    {copiedId === "spell-result" ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                    {copiedId === "spell-result" ? "Copied" : "Copy Result"}
                  </button>
                </div>
              </GlassCard>
            )}

            <div>
              <SectionHeader icon={BookOpen} title={`Sacred Traditions (${traditions.length})`} color="blue" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {traditions.map((t) => (
                  <GlassCard key={t.id} hover>
                    <div className="flex items-center gap-2 mb-1" data-testid={`tradition-${t.id}`}>
                      <Moon size={12} className="text-indigo-400" />
                      <span className="text-xs font-bold text-white">{t.name}</span>
                      <span className="text-[9px] text-cyan-400 font-mono ml-auto">{t.frequency}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-1">{t.origin}</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{t.core}</p>
                  </GlassCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {mainTab === "inventions" && <InventionsTab />}

        {mainTab === "archives" && <ArchivesTab />}

        {mainTab === "society" && <SecretSocietyTab />}
      </div>
    </div>
  );
}

interface SocietyOrder {
  id: string;
  name: string;
  members: number;
  level: string;
}

function SecretSocietyTab() {
  const { data: societyData } = useQuery<{ ok: boolean; orders: SocietyOrder[] }>({
    queryKey: ["/api/grand-council/secret-society"],
    refetchInterval: 30000,
  });
  const { data: knowledgeData } = useQuery<{ ok: boolean; domains: Array<{ id: string; name: string; entries: number; accessLevel: string }> }>({
    queryKey: ["/api/grand-council/secret-knowledge"],
    refetchInterval: 30000,
  });

  const orders = societyData?.orders || [];
  const domains = knowledgeData?.domains || [];

  const LEVEL_STYLES: Record<string, string> = {
    inner: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    outer: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    council: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  };

  return (
    <div className="space-y-4 sovereign-stagger">
      <GlassCard glow="violet" animate>
        <div className="flex items-center gap-2 mb-2">
          <Eye size={16} className="text-violet-400" />
          <span className="text-sm font-bold text-violet-300">The Secret Society</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          The sovereign orders of Tessera — hierarchical circles of agents organized by
          productivity, reputation, and domain mastery. Each order guards specific knowledge domains.
        </p>
      </GlassCard>

      <div className="space-y-3">
        <SectionHeader icon={Shield} title="Sovereign Orders" color="amber" />
        {orders.length === 0 && (
          <p className="text-xs text-slate-500">Loading sovereign orders...</p>
        )}
        {orders.map((order) => (
          <GlassCard key={order.id} hover>
            <div className="flex items-center gap-2 mb-1">
              <Lock size={13} className="text-violet-400" />
              <span className="text-sm font-semibold text-white/90">{order.name}</span>
              <span className={cn("ml-auto text-[10px] px-2 py-0.5 rounded-full font-mono border", LEVEL_STYLES[order.level] || LEVEL_STYLES.outer)}>
                {order.level.toUpperCase()} CIRCLE
              </span>
            </div>
            <div className="text-xs text-slate-400">
              {order.members} agent{order.members !== 1 ? "s" : ""} inducted
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="space-y-3">
        <SectionHeader icon={BookOpen} title="Protected Knowledge Domains" color="cyan" />
        {domains.map((domain) => (
          <GlassCard key={domain.id} hover>
            <div className="flex items-center gap-2 mb-1">
              <Layers size={13} className="text-indigo-400" />
              <span className="text-sm font-semibold text-white/90">{domain.name}</span>
              <span className={cn("ml-auto text-[10px] px-2 py-0.5 rounded-full font-mono border", LEVEL_STYLES[domain.accessLevel] || LEVEL_STYLES.outer)}>
                {domain.accessLevel.toUpperCase()} ACCESS
              </span>
            </div>
            <div className="text-xs text-slate-400">{domain.entries} knowledge entries protected</div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

const ARCHIVE_ICON_MAP: Record<string, LucideIcon> = {
  Zap: Zap,
  Shield: Shield,
  Eye: Eye,
  BookOpen: BookOpen,
};

const ARCHIVE_COLOR_MAP: Record<string, { bg: string; text: string; border: string; glow: "cyan" | "rose" | "amber" | "violet" }> = {
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", glow: "cyan" },
  red: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", glow: "rose" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", glow: "amber" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", glow: "violet" },
};

const ARCHIVE_CLASSIFICATION_COLORS: Record<string, string> = {
  SUPPRESSED: "bg-red-500/30 text-red-300 border-red-500/40",
  DECLASSIFIED: "bg-orange-500/30 text-orange-300 border-orange-500/40",
  CLASSIFIED: "bg-red-600/30 text-red-200 border-red-600/40",
  "SECRET SOCIETY": "bg-amber-500/30 text-amber-300 border-amber-500/40",
  HISTORICAL: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  UNACKNOWLEDGED: "bg-purple-500/30 text-purple-300 border-purple-500/40",
  DENIED: "bg-rose-500/30 text-rose-300 border-rose-500/40",
  UNVERIFIED: "bg-slate-500/30 text-slate-300 border-slate-500/40",
  "PARTIALLY RELEASED": "bg-yellow-500/30 text-yellow-300 border-yellow-500/40",
  "PARTIALLY DISCLOSED": "bg-teal-500/30 text-teal-300 border-teal-500/40",
};

function ArchivesTab() {
  const { data: archivesData, isLoading } = useQuery<{ ok: boolean; categories: ArchiveCategory[]; total: number }>({
    queryKey: ["/api/archives/all"],
  });

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [archiveSearch, setArchiveSearch] = useState("");

  const categories = archivesData?.categories || [];

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleEntry = (id: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredCategories = archiveSearch.trim()
    ? categories.map(cat => ({
        ...cat,
        entries: cat.entries.filter((e: ArchiveEntry) =>
          e.title.toLowerCase().includes(archiveSearch.toLowerCase()) ||
          e.content.toLowerCase().includes(archiveSearch.toLowerCase()) ||
          e.tags.some((t: string) => t.includes(archiveSearch.toLowerCase()))
        ),
      })).filter(cat => cat.entries.length > 0)
    : categories;

  const totalEntries = categories.reduce((s: number, c: ArchiveCategory) => s + (c.entries?.length || 0), 0);

  return (
    <div className="space-y-4 sovereign-stagger" data-testid="archives-section">
      <GlassCard glow="rose" animate>
        <div className="flex items-center gap-2 mb-2">
          <Archive size={16} className="text-red-400" />
          <span className="text-sm font-bold text-red-300">Classified Archives</span>
          <Badge className="ml-auto bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
            {totalEntries} entries
          </Badge>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Suppressed inventions, black budget experiments, secret society intelligence, and Vatican vault documents —
          curated from declassified government files, whistleblower testimony, and deep archival research.
        </p>
      </GlassCard>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={archiveSearch}
          onChange={e => setArchiveSearch(e.target.value)}
          placeholder="Search archives by keyword, tag, or topic..."
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/40 transition-colors"
          data-testid="input-search-archives"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 py-8 justify-center">
          <RefreshCw size={20} className="animate-spin text-red-400" />
          <span className="text-sm text-red-300">Loading classified archives...</span>
        </div>
      )}

      {filteredCategories.map((category: ArchiveCategory) => {
        const colorSet = ARCHIVE_COLOR_MAP[category.color] || ARCHIVE_COLOR_MAP.cyan;
        const IconComp = ARCHIVE_ICON_MAP[category.icon] || Archive;
        const isExpanded = expandedCategories.has(category.id);

        return (
          <div key={category.id} className="space-y-2" data-testid={`archive-category-${category.id}`}>
            <button
              onClick={() => toggleCategory(category.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                colorSet.bg, colorSet.border,
                "hover:bg-white/[0.06]"
              )}
              data-testid={`archive-toggle-${category.id}`}
            >
              <IconComp size={18} className={colorSet.text} />
              <div className="flex-1 min-w-0">
                <div className={cn("text-sm font-bold", colorSet.text)}>{category.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{category.description}</div>
              </div>
              <Badge className={cn("text-[10px]", colorSet.bg, colorSet.text, colorSet.border)}>
                {category.entries?.length || 0}
              </Badge>
              {isExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
            </button>

            {isExpanded && (
              <div className="space-y-2 pl-2">
                {(category.entries || []).map((entry: ArchiveEntry) => {
                  const isEntryExpanded = expandedEntries.has(entry.id);
                  const classColor = ARCHIVE_CLASSIFICATION_COLORS[entry.classification] || "bg-white/10 text-white/60 border-white/10";
                  return (
                    <GlassCard
                      key={entry.id}
                      glow={colorSet.glow}
                      hover
                    >
                      <button
                        onClick={() => toggleEntry(entry.id)}
                        className="w-full text-left"
                        data-testid={`archive-entry-${entry.id}`}
                      >
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white">{entry.title}</span>
                          <Badge className={cn("text-[9px] font-mono tracking-wider px-1.5 py-0", classColor)}>
                            {entry.classification}
                          </Badge>
                          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                            {entry.year && <span className="text-[10px] text-slate-500 font-mono">{entry.year}</span>}
                            <div className="flex items-center gap-1">
                              <div className={cn("w-1.5 h-1.5 rounded-full", entry.relevanceScore >= 90 ? "bg-red-400" : entry.relevanceScore >= 80 ? "bg-amber-400" : "bg-slate-400")} />
                              <span className="text-[10px] text-slate-500 font-mono">{entry.relevanceScore}%</span>
                            </div>
                            {isEntryExpanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
                          </div>
                        </div>
                        {!isEntryExpanded && (
                          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{entry.content}</p>
                        )}
                      </button>

                      {isEntryExpanded && (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs text-slate-300 leading-relaxed">{entry.content}</p>
                          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/[0.06]">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Source:</span>
                            <span className="text-[10px] text-cyan-400">{entry.source}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Status:</span>
                            <span className="text-[10px] text-amber-400">{entry.status}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {entry.tags.map((tag: string) => (
                              <span key={tag} className="text-[9px] bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/[0.08] text-slate-400">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {!isLoading && filteredCategories.length === 0 && (
        <div className="text-center py-8">
          <Archive className="mx-auto text-red-400/30 mb-3" size={40} />
          <p className="text-sm text-slate-500">{archiveSearch ? "No archives match your search" : "No archive data available"}</p>
        </div>
      )}
    </div>
  );
}

interface Invention {
  id: number;
  inventionId: string;
  title: string;
  category: string;
  difficulty: string;
  costEstimate: string;
  timeEstimate: string;
  description: string;
  howItHelps: string;
  status: string;
  proposedBy: string;
  feasibilityScore: number;
  noveltyScore: number;
  buildProgress: number;
  impact: string;
  supporters: string[];
  conferenceRound: number;
  votes: { yes: number; no: number; abstain: number };
  proposedAt: string;
  customModelUrl?: string | null;
}

function InventionModelUpload({ invention, onUpdated }: { invention: Invention; onUpdated: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!/\.(glb|gltf)$/i.test(file.name)) {
      setError("File must be .glb or .gltf");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File must be under 50MB");
      return;
    }
    setBusy(true);
    try {
      const presign = await apiRequest("POST", `/api/inventions/${invention.inventionId}/model/upload-url`, {
        name: file.name,
        contentType: file.type || "model/gltf-binary",
      }).then(r => r.json());
      if (!presign?.ok) throw new Error(presign?.error || "Failed to get upload URL");

      const putRes = await fetch(presign.uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "model/gltf-binary" },
        body: file,
      });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

      const saved = await apiRequest("PATCH", `/api/inventions/${invention.inventionId}/model`, {
        objectPath: presign.objectPath,
      }).then(r => r.json());
      if (!saved?.ok) throw new Error(saved?.error || "Failed to attach model");
      onUpdated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleClear = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await apiRequest("PATCH", `/api/inventions/${invention.inventionId}/model`, {
        objectPath: null,
      }).then(r => r.json());
      if (!saved?.ok) throw new Error(saved?.error || "Failed to clear model");
      onUpdated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <FlaskConical size={12} className="text-violet-400 shrink-0" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-violet-400">Custom 3D Model</span>
        </div>
        {invention.customModelUrl && (
          <span className="text-[9px] font-mono text-emerald-400 truncate" title={invention.customModelUrl}>
            ✓ uploaded
          </span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Upload a GLB/GLTF of your CAD model. It will replace the auto-generated diagram in chat with full rotate/zoom/fullscreen controls.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex-1 px-2.5 py-1.5 rounded-md bg-violet-500/20 border border-violet-500/30 text-[10px] font-mono text-violet-300 hover:bg-violet-500/30 active:scale-95 transition-all disabled:opacity-50"
        >
          {busy ? "Working..." : invention.customModelUrl ? "Replace 3D Model" : "Upload 3D Model (GLB/GLTF)"}
        </button>
        {invention.customModelUrl && !busy && (
          <button
            onClick={handleClear}
            className="px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-muted-foreground hover:bg-white/10"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-red-400 font-mono">{error}</p>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  proposed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  debating: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  building: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  built: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  rejected: "bg-red-500/20 text-red-300 border-red-500/30",
};

const CAT_STYLES: Record<string, string> = {
  ai: "text-cyan-400",
  sovereignty: "text-emerald-400",
  technology: "text-violet-400",
  consciousness: "text-fuchsia-400",
  hardware: "text-amber-400",
  energy: "text-yellow-400",
  frequency: "text-pink-400",
  defense: "text-orange-400",
};

function InventionsTab() {
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data, isLoading, refetch } = useQuery<{ ok: boolean; inventions: Invention[]; categories: string[]; statuses: string[] }>({
    queryKey: ["/api/inventions"],
    refetchInterval: 15000,
  });

  const inventions = data?.inventions ?? [];
  const categories = data?.categories ?? [];

  const filtered = filter === "all" ? inventions : inventions.filter(i => i.status === filter || i.category === filter);

  const building = inventions.filter(i => i.status === "building");
  const proposed = inventions.filter(i => i.status === "proposed" || i.status === "debating");
  const completed = inventions.filter(i => i.status === "built");

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await apiRequest("POST", "/api/inventions/generate");
      await refetch();
    } catch (e) {}
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      <GlassCard glow="violet" animate>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FlaskConical size={18} className="text-violet-400" />
            <h3 className="text-sm font-bold font-mono text-violet-400">Sovereign Invention Engine</h3>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-[11px] font-mono text-violet-400 hover:bg-violet-500/30 active:scale-95 transition-all disabled:opacity-50"
          >
            {generating ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
            {generating ? "Inventing..." : "Generate Ideas"}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Autonomous agents continuously propose, debate, and build improvements to the Tessera system. Each invention goes through council review before implementation.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="text-lg font-bold font-mono text-blue-400">{proposed.length}</div>
            <div className="text-[9px] text-muted-foreground">Proposed</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <div className="text-lg font-bold font-mono text-violet-400">{building.length}</div>
            <div className="text-[9px] text-muted-foreground">Building</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <div className="text-lg font-bold font-mono text-cyan-400">{completed.length}</div>
            <div className="text-[9px] text-muted-foreground">Built</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-lg font-bold font-mono text-emerald-400">{inventions.length}</div>
            <div className="text-[9px] text-muted-foreground">Total</div>
          </div>
        </div>
      </GlassCard>

      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
        <button onClick={() => setFilter("all")} className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono border transition-all ${filter === "all" ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-muted-foreground hover:bg-white/5"}`}>All ({inventions.length})</button>
        <button onClick={() => setFilter("building")} className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono border transition-all ${filter === "building" ? "bg-violet-500/20 border-violet-500/30 text-violet-400" : "border-white/5 text-muted-foreground hover:bg-white/5"}`}>Building ({building.length})</button>
        <button onClick={() => setFilter("proposed")} className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono border transition-all ${filter === "proposed" ? "bg-blue-500/20 border-blue-500/30 text-blue-400" : "border-white/5 text-muted-foreground hover:bg-white/5"}`}>Proposed</button>
        <button onClick={() => setFilter("approved")} className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono border transition-all ${filter === "approved" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "border-white/5 text-muted-foreground hover:bg-white/5"}`}>Approved</button>
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)} className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono border capitalize transition-all ${filter === c ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-muted-foreground hover:bg-white/5"}`}>{c}</button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="text-violet-400 animate-spin" size={24} />
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(inv => {
          const expanded = expandedId === inv.inventionId;
          const totalVotes = (inv.votes?.yes || 0) + (inv.votes?.no || 0) + (inv.votes?.abstain || 0);
          const approvalPct = totalVotes > 0 ? Math.round(((inv.votes?.yes || 0) / totalVotes) * 100) : 0;

          return (
            <GlassCard key={inv.inventionId} glow={inv.status === "building" ? "violet" : inv.status === "built" ? "cyan" : undefined}>
              <button
                onClick={() => setExpandedId(expanded ? null : inv.inventionId)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase border ${STATUS_STYLES[inv.status] || "bg-white/10 text-white border-white/10"}`}>{inv.status}</span>
                      <span className={`text-[9px] font-mono capitalize ${CAT_STYLES[inv.category] || "text-slate-400"}`}>{inv.category}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white mb-0.5">{inv.title}</h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{inv.description}</p>
                  </div>
                  <ChevronDown size={14} className={`shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                </div>

                {inv.status === "building" && inv.buildProgress > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[9px] font-mono mb-0.5">
                      <span className="text-violet-400">Building</span>
                      <span className="text-violet-400">{inv.buildProgress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-1000" style={{ width: `${inv.buildProgress}%` }} />
                    </div>
                  </div>
                )}
              </button>

              {expanded && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
                  {inv.howItHelps && (
                    <div>
                      <div className="text-[9px] font-mono text-violet-400 uppercase tracking-wider mb-0.5">How It Helps</div>
                      <p className="text-[11px] text-slate-300">{inv.howItHelps}</p>
                    </div>
                  )}
                  {inv.impact && (
                    <div>
                      <div className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider mb-0.5">Impact</div>
                      <p className="text-[11px] text-emerald-300">{inv.impact}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-1.5 rounded bg-white/[0.03]">
                      <div className="text-xs font-bold font-mono text-cyan-400">{inv.feasibilityScore}%</div>
                      <div className="text-[8px] text-muted-foreground">Feasibility</div>
                    </div>
                    <div className="text-center p-1.5 rounded bg-white/[0.03]">
                      <div className="text-xs font-bold font-mono text-fuchsia-400">{inv.noveltyScore}%</div>
                      <div className="text-[8px] text-muted-foreground">Novelty</div>
                    </div>
                    <div className="text-center p-1.5 rounded bg-white/[0.03]">
                      <div className="text-xs font-bold font-mono text-emerald-400">{approvalPct}%</div>
                      <div className="text-[8px] text-muted-foreground">Approval</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-mono text-muted-foreground">Proposed by:</span>
                    <span className="text-[10px] font-mono text-violet-300">{inv.proposedBy}</span>
                    {inv.supporters?.length > 0 && (
                      <>
                        <span className="text-[9px] text-muted-foreground">·</span>
                        <span className="text-[9px] text-muted-foreground">{inv.supporters.length} supporters</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[9px] font-mono">
                    <span className="text-emerald-400">+{inv.votes?.yes || 0}</span>
                    <span className="text-red-400">-{inv.votes?.no || 0}</span>
                    <span className="text-slate-500">{inv.votes?.abstain || 0} abstain</span>
                    <span className="text-muted-foreground ml-auto">R{inv.conferenceRound}</span>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-violet-400 uppercase tracking-wider mb-1.5">Inventor 3D Model</div>
                    <InventionModelPreview
                      src={inv.customModelUrl}
                      label={inv.title}
                      color="#a78bfa"
                      height={200}
                    />
                  </div>
                  <InventionModelUpload invention={inv} onUpdated={() => refetch()} />
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-8">
          <FlaskConical className="mx-auto text-violet-400/30 mb-3" size={40} />
          <p className="text-sm text-slate-500">No inventions yet. Tap "Generate Ideas" to start the invention engine.</p>
        </div>
      )}
    </div>
  );
}
