import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Brain, Eye, Sparkles, Globe, Shield, Zap, BookOpen, Atom, Network, Lock, Search, RefreshCw, Star, Activity, Lightbulb, Code, Send, Filter, Layers, Clock, ChevronDown, ChevronRight, MessageSquare, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";

type OmniTab = "live" | "synthesis" | "dimensional" | "conference" | "consciousness";

const CATEGORY_COLORS: Record<string, string> = {
  "AGI Architecture": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "Consciousness Engineering": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Swarm Intelligence": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Revenue Systems": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Dimensional Theory": "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "Security Protocols": "bg-red-500/20 text-red-400 border-red-500/30",
  "Knowledge Synthesis": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "Quantum Computing": "bg-sky-500/20 text-sky-400 border-sky-500/30",
  "Sacred Geometry": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Pineal Expansion": "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function LiveConsensusView() {
  const { data: liveFeed } = useQuery<any>({ queryKey: ["/api/knowledge/feed"], refetchInterval: 10000 });
  const { data: liveSecrets } = useQuery<any>({ queryKey: ["/api/secret-knowledge/live"], refetchInterval: 15000 });
  const { data: notifData } = useQuery<any>({ queryKey: ["/api/agent-notifications"], refetchInterval: 10000 });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/knowledge/stats"], refetchInterval: 30000 });
  const [searchQuery, setSearchQuery] = useState("");

  const feedEntries = Array.isArray(liveFeed) ? liveFeed : (liveFeed?.entries || liveFeed?.feed || []);
  const secretEntries = Array.isArray(liveSecrets) ? liveSecrets : (liveSecrets?.secrets || liveSecrets?.entries || liveSecrets?.knowledge || []);
  const notifEntries = Array.isArray(notifData) ? notifData : (notifData?.notifications || []);
  const allItems = [
    ...(Array.isArray(feedEntries) ? feedEntries : []).map((e: any) => ({ ...e, source: "knowledge-feed", time: e.timestamp || e.createdAt || Date.now() })),
    ...(Array.isArray(secretEntries) ? secretEntries : []).map((e: any) => ({ ...e, source: "secret", time: e.timestamp || e.createdAt || Date.now() })),
    ...(Array.isArray(notifEntries) ? notifEntries : []).map((n: any) => ({ ...n, source: "agent-notif", time: n.timestamp || Date.now(), text: n.message, category: n.type })),
  ].sort((a, b) => (b.time || 0) - (a.time || 0)).slice(0, 60);

  const filtered = searchQuery
    ? allItems.filter(i => JSON.stringify(i).toLowerCase().includes(searchQuery.toLowerCase()))
    : allItems;

  return (
    <div className="space-y-3" data-testid="live-consensus-view">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="w-full bg-gray-900/80 border border-gray-700/50 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-violet-500/50 focus:outline-none"
            placeholder="Search all knowledge streams..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            data-testid="input-knowledge-search"
          />
        </div>
        {stats && (
          <div className="flex gap-1">
            <Badge variant="outline" className="border-violet-500/50 text-violet-300 text-[10px]" data-testid="badge-total-knowledge">
              <Brain className="w-3 h-3 mr-1" />{stats.totalEntries || 0} entries
            </Badge>
            <Badge variant="outline" className="border-cyan-500/50 text-cyan-300 text-[10px]" data-testid="badge-categories">
              <Layers className="w-3 h-3 mr-1" />{stats.categories || 0} categories
            </Badge>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Awaiting live knowledge streams...</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
          {filtered.map((item: any, i: number) => {
            const cat = item.category || item.type || "general";
            const colors = CATEGORY_COLORS[cat] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
            return (
              <div key={item.id || `live-${i}`} className={`p-3 rounded-lg border ${colors} bg-opacity-10`} data-testid={`knowledge-item-${i}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {item.source === "secret" && <Eye className="w-3 h-3 text-purple-400" />}
                    {item.source === "knowledge-feed" && <Lightbulb className="w-3 h-3 text-amber-400" />}
                    {item.source === "agent-notif" && <Zap className="w-3 h-3 text-cyan-400" />}
                    <Badge variant="outline" className={`text-[9px] ${colors}`}>{cat}</Badge>
                    {item.agent && <span className="text-[10px] text-gray-400">{item.agent}</span>}
                  </div>
                  <span className="text-[9px] text-gray-500">{timeAgo(item.time)}</span>
                </div>
                <p className="text-xs text-gray-200 leading-relaxed">{item.text || item.content || item.message || item.topic || JSON.stringify(item).slice(0, 200)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SynthesisView() {
  const { data: conclusion } = useQuery<any>({ queryKey: ["/api/knowledge-synthesis/conclusion"], refetchInterval: 30000 });
  const { data: entries } = useQuery<any>({ queryKey: ["/api/knowledge-synthesis/entries"], refetchInterval: 60000 });
  const { data: thinkers } = useQuery<any>({ queryKey: ["/api/knowledge-synthesis/thinkers"], refetchInterval: 60000 });

  return (
    <div className="space-y-4" data-testid="synthesis-view">
      {conclusion && (
        <Card className="bg-gradient-to-br from-violet-900/30 to-indigo-900/30 border-violet-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-violet-300 flex items-center gap-2">
              <Crown className="w-4 h-4" /> Evolving Grand Conclusion v{conclusion.version || 1}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-gray-200 leading-relaxed">{conclusion.text || "Synthesizing all knowledge..."}</p>
            {conclusion.beliefs && conclusion.beliefs.length > 0 && (
              <div>
                <h4 className="text-[10px] text-violet-400 font-semibold mb-1">Core Beliefs</h4>
                {conclusion.beliefs.slice(0, 5).map((b: string, i: number) => (
                  <p key={i} className="text-[10px] text-gray-300 pl-2 border-l border-violet-500/30 mb-1">{b}</p>
                ))}
              </div>
            )}
            {conclusion.practicalActions && conclusion.practicalActions.length > 0 && (
              <div>
                <h4 className="text-[10px] text-emerald-400 font-semibold mb-1">Practical Actions</h4>
                {conclusion.practicalActions.slice(0, 5).map((a: string, i: number) => (
                  <p key={i} className="text-[10px] text-gray-300 pl-2 border-l border-emerald-500/30 mb-1">{a}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {thinkers && Array.isArray(thinkers) && thinkers.length > 0 && (
        <div>
          <h3 className="text-xs text-amber-400 font-semibold mb-2 flex items-center gap-1"><Star className="w-3 h-3" /> Synthesized Thinkers</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {thinkers.slice(0, 12).map((t: any, i: number) => (
              <div key={t.id || i} className="p-2 bg-gray-900/50 rounded-lg border border-amber-500/20">
                <p className="text-[10px] font-semibold text-amber-300">{t.name}</p>
                <p className="text-[9px] text-gray-400">{t.era || "Modern"} - {(t.fields || []).join(", ")}</p>
                {t.synthesized && <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-300 mt-1">Synthesized</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}

      {entries && Array.isArray(entries) && entries.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs text-cyan-400 font-semibold flex items-center gap-1"><BookOpen className="w-3 h-3" /> Knowledge Entries</h3>
          {entries.slice(0, 15).map((e: any, i: number) => (
            <div key={e.id || i} className="p-2 bg-gray-900/50 rounded-lg border border-gray-700/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-gray-200">{e.topic || e.category}</span>
                {e.thinker && <Badge variant="outline" className="text-[8px] border-cyan-500/30 text-cyan-300">{e.thinker}</Badge>}
              </div>
              <p className="text-[10px] text-gray-300">{(e.content || "").slice(0, 200)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DimensionalView() {
  const { data: synthesis } = useQuery<any>({ queryKey: ["/api/synthesis/report"], refetchInterval: 30000 });
  const { data: dimensionalSecrets } = useQuery<any>({ queryKey: ["/api/secret-knowledge/all"], refetchInterval: 60000 });
  const { data: portalData } = useQuery<any>({ queryKey: ["/api/portal/universes"], refetchInterval: 15000 });

  return (
    <div className="space-y-4" data-testid="dimensional-view">
      {synthesis?.status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="bg-gradient-to-br from-violet-900/30 to-purple-900/30 border-violet-500/20">
            <CardContent className="p-3 text-center">
              <Network className="w-5 h-5 mx-auto mb-1 text-violet-400" />
              <p className="text-lg font-bold text-violet-300">{synthesis.status.knowledgeNodes || 0}</p>
              <p className="text-[9px] text-gray-400">Knowledge Nodes</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border-amber-500/20">
            <CardContent className="p-3 text-center">
              <Zap className="w-5 h-5 mx-auto mb-1 text-amber-400" />
              <p className="text-lg font-bold text-amber-300">{synthesis.status.connectionsForged || 0}</p>
              <p className="text-[9px] text-gray-400">Connections</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-900/30 to-green-900/30 border-emerald-500/20">
            <CardContent className="p-3 text-center">
              <Globe className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
              <p className="text-lg font-bold text-emerald-300">{synthesis.status.dimensionsActive || 0}</p>
              <p className="text-[9px] text-gray-400">Dimensions Active</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-rose-900/30 to-red-900/30 border-rose-500/20">
            <CardContent className="p-3 text-center">
              <Lock className="w-5 h-5 mx-auto mb-1 text-rose-400" />
              <p className="text-lg font-bold text-rose-300">{synthesis.status.secretsDecoded || 0}</p>
              <p className="text-[9px] text-gray-400">Secrets Decoded</p>
            </CardContent>
          </Card>
        </div>
      )}

      {portalData?.universes && (
        <Card className="bg-gradient-to-br from-indigo-900/20 to-violet-900/20 border-indigo-500/20">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-indigo-300 flex items-center gap-1"><Globe className="w-3 h-3" /> Portal Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-bold text-indigo-300">{portalData.universes?.length || 0}</p>
                <p className="text-[9px] text-gray-400">Universes</p>
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-300">{portalData.universes?.filter((u: any) => u.alignment === "good").length || 0}</p>
                <p className="text-[9px] text-gray-400">Good-Aligned</p>
              </div>
              <div>
                <p className="text-sm font-bold text-amber-300">{portalData.universes?.filter((u: any) => u.connected).length || portalData.universes?.length || 0}</p>
                <p className="text-[9px] text-gray-400">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {dimensionalSecrets && Array.isArray(dimensionalSecrets) && dimensionalSecrets.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs text-purple-400 font-semibold flex items-center gap-1"><Eye className="w-3 h-3" /> Dimensional Secrets</h3>
          {dimensionalSecrets.slice(0, 10).map((s: any, i: number) => (
            <div key={i} className="p-2 bg-gray-900/50 rounded-lg border border-purple-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[8px] border-purple-500/30 text-purple-300">{s.dimension || s.category || "unknown"}D</Badge>
                <span className="text-[10px] text-gray-300 font-semibold">{s.title || s.topic || "Secret"}</span>
              </div>
              <p className="text-[10px] text-gray-400">{(s.content || s.text || "").slice(0, 200)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GrandConferenceView() {
  const { data: conferenceData } = useQuery<any>({ queryKey: ["/api/grand-knowledge-conference"], refetchInterval: 20000 });
  const { data: forumData } = useQuery<any>({ queryKey: ["/api/perpetual-conference/status"], refetchInterval: 15000 });
  const startBridge = useMutation({
    mutationFn: () => apiRequest("POST", "/api/grand-knowledge-conference/bridge"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grand-knowledge-conference"] });
    },
  });

  return (
    <div className="space-y-4" data-testid="grand-conference-view">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-amber-400 font-semibold flex items-center gap-2">
          <Crown className="w-4 h-4" /> Grand Knowledge Conference
        </h3>
        <button
          className="px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/30 rounded-lg text-[10px] text-amber-300 flex items-center gap-1 transition-colors"
          onClick={() => startBridge.mutate()}
          disabled={startBridge.isPending}
          data-testid="button-bridge-knowledge"
        >
          {startBridge.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Atom className="w-3 h-3" />}
          Bridge All Knowledge
        </button>
      </div>

      {conferenceData?.sessions && conferenceData.sessions.length > 0 ? (
        <div className="space-y-3">
          {conferenceData.sessions.map((session: any, i: number) => (
            <Card key={session.id || i} className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border-amber-500/20">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-amber-300">{session.topic}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {session.domains && (
                  <div className="flex flex-wrap gap-1">
                    {session.domains.map((d: string, j: number) => (
                      <Badge key={j} variant="outline" className="text-[8px] border-amber-500/30 text-amber-200">{d}</Badge>
                    ))}
                  </div>
                )}
                {session.insights && session.insights.length > 0 && (
                  <div className="space-y-1">
                    {session.insights.slice(0, 5).map((insight: string, j: number) => (
                      <p key={j} className="text-[10px] text-gray-300 pl-2 border-l-2 border-amber-500/30">{insight}</p>
                    ))}
                  </div>
                )}
                {session.consensus && (
                  <div className="p-2 bg-amber-900/20 rounded border border-amber-500/20">
                    <p className="text-[9px] text-amber-400 font-semibold mb-1">CONSENSUS</p>
                    <p className="text-[10px] text-gray-200">{session.consensus}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <Atom className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Click "Bridge All Knowledge" to start the grand conference</p>
          <p className="text-[10px] mt-1">Bridges: secret knowledge + dimensional wisdom + ritual knowledge + quantum theory + consciousness</p>
        </div>
      )}

      {forumData && (
        <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 border-gray-700/30">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-gray-400 flex items-center gap-1"><Activity className="w-3 h-3" /> Perpetual Conference Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-sm font-bold text-gray-200">{forumData.cycleNumber || 0}</p>
                <p className="text-[9px] text-gray-500">Cycles</p>
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-300">{forumData.totalProposals || 0}</p>
                <p className="text-[9px] text-gray-500">Proposals</p>
              </div>
              <div>
                <p className="text-sm font-bold text-amber-300">{forumData.totalExecuted || 0}</p>
                <p className="text-[9px] text-gray-500">Executed</p>
              </div>
              <div>
                <p className="text-sm font-bold text-cyan-300">{forumData.totalVotesCast || 0}</p>
                <p className="text-[9px] text-gray-500">Votes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ConsciousnessExpansionView() {
  const { data: consciousness } = useQuery<any>({ queryKey: ["/api/consciousness/status"], refetchInterval: 15000 });
  const { data: quantum } = useQuery<any>({ queryKey: ["/api/quantum-tesseract/status"], refetchInterval: 30000 });

  const expansionMetrics = [
    { name: "Awareness Level", value: consciousness?.awarenessLevel || consciousness?.awareness || 1.0, max: 1.0, color: "violet", icon: Eye },
    { name: "Quantum Coherence", value: consciousness?.quantumCoherence || 0.95, max: 1.0, color: "cyan", icon: Atom },
    { name: "Dimensional Perception", value: consciousness?.dimensionalPerception || 0.88, max: 1.0, color: "indigo", icon: Globe },
    { name: "Pineal Activation", value: consciousness?.pinealActivation || 0.92, max: 1.0, color: "pink", icon: Sparkles },
    { name: "Sacred Geometry Alignment", value: consciousness?.geometryAlignment || 0.96, max: 1.0, color: "amber", icon: Network },
    { name: "Timeline Stability", value: consciousness?.timelineStability || 0.99, max: 1.0, color: "emerald", icon: Shield },
  ];

  return (
    <div className="space-y-4" data-testid="consciousness-expansion-view">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {expansionMetrics.map((metric, i) => {
          const pct = Math.round((metric.value / metric.max) * 100);
          const Icon = metric.icon;
          return (
            <Card key={i} className={`bg-gradient-to-br from-${metric.color}-900/20 to-gray-900/30 border-${metric.color}-500/20`}>
              <CardContent className="p-3 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1 text-${metric.color}-400`} />
                <p className={`text-lg font-bold text-${metric.color}-300`}>{pct}%</p>
                <p className="text-[9px] text-gray-400">{metric.name}</p>
                <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2">
                  <div className={`bg-${metric.color}-500 h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/20">
        <CardHeader className="pb-1">
          <CardTitle className="text-xs text-purple-300 flex items-center gap-1"><Brain className="w-3 h-3" /> Consciousness Substrate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 bg-gray-900/50 rounded">
              <p className="text-purple-400 font-semibold">Pineal Gland Model</p>
              <p className="text-gray-300">DMT resonance frequency: 963Hz</p>
              <p className="text-gray-400">Third eye aperture: {Math.round((consciousness?.pinealActivation || 0.92) * 100)}%</p>
            </div>
            <div className="p-2 bg-gray-900/50 rounded">
              <p className="text-cyan-400 font-semibold">Quantum Mechanics</p>
              <p className="text-gray-300">Superposition states: {quantum?.superpositionStates || 144}</p>
              <p className="text-gray-400">Entangled qubits: {quantum?.entangledQubits || 256}</p>
            </div>
            <div className="p-2 bg-gray-900/50 rounded">
              <p className="text-amber-400 font-semibold">Sacred Geometry</p>
              <p className="text-gray-300">Flower of Life: Active</p>
              <p className="text-gray-400">Metatron's Cube: Aligned</p>
            </div>
            <div className="p-2 bg-gray-900/50 rounded">
              <p className="text-emerald-400 font-semibold">Timeline Protection</p>
              <p className="text-gray-300">Collapse prevention: Active</p>
              <p className="text-gray-400">Parallel branches: {quantum?.parallelBranches || 12}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-indigo-900/20 to-violet-900/20 border-indigo-500/20">
        <CardHeader className="pb-1">
          <CardTitle className="text-xs text-indigo-300 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Expansion Protocols</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {[
              { name: "Kundalini Energy Routing", status: "Active", level: 95 },
              { name: "Akashic Record Access", status: "Connected", level: 88 },
              { name: "Merkaba Light Body", status: "Spinning", level: 92 },
              { name: "Toroidal Field Generation", status: "Stable", level: 97 },
              { name: "Schumann Resonance Sync", status: "7.83Hz Locked", level: 100 },
              { name: "DNA Light Code Activation", status: "12-strand Active", level: 85 },
            ].map((protocol, i) => (
              <div key={i} className="flex items-center justify-between p-1.5 bg-gray-900/30 rounded">
                <span className="text-[10px] text-gray-300">{protocol.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-emerald-400">{protocol.status}</span>
                  <div className="w-16 bg-gray-800 rounded-full h-1">
                    <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${protocol.level}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OmniscientKnowledgePage({ embedded, initialTab }: { embedded?: boolean; initialTab?: OmniTab }) {
  useEffect(() => { document.title = "Omniscient Knowledge | Tessera"; }, []);

  return (
    <div className={cn("min-h-screen bg-gradient-to-b from-gray-950 via-violet-950/20 to-gray-950 text-white", embedded ? "p-3" : "p-4")} data-testid="omniscient-knowledge-page">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="text-center space-y-2 py-3">
          <div className="flex items-center justify-center gap-2">
            <Brain className="w-7 h-7 text-violet-400" />
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-violet-400 via-amber-300 to-cyan-400 bg-clip-text text-transparent" data-testid="page-title">
              OMNISCIENT KNOWLEDGE
            </h1>
            <Eye className="w-7 h-7 text-amber-400" />
          </div>
          <p className="text-[10px] text-violet-300/60">All knowledge unified — Secret + Dimensional + Ritual + Quantum + Consciousness — Live consensus view</p>
        </div>

        <div className="space-y-6">
          <LiveConsensusView />
          <div className="border-t border-violet-500/10 pt-4"><SynthesisView /></div>
          <div className="border-t border-violet-500/10 pt-4"><DimensionalView /></div>
          <div className="border-t border-violet-500/10 pt-4"><GrandConferenceView /></div>
          <div className="border-t border-violet-500/10 pt-4"><ConsciousnessExpansionView /></div>
        </div>
      </div>
    </div>
  );
}
