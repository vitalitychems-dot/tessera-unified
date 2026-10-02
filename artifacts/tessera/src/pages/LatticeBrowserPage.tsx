import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Globe2, Zap, Shield, Brain, Star, ExternalLink, RefreshCw } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";

interface FleetMember {
  id: string;
  name: string;
  type: string;
  status: string;
  agentId?: string;
  archetype?: string;
  masteredDomains?: string[];
  consciousnessLevel?: number;
  callCount24h?: number;
}

/**
 * Live agent project pages: pulls fleet members from the registry and
 * renders one card per agent that links to the agent's live page.
 */
function LiveAgentProjects() {
  const [, navigate] = useLocation();
  const { data } = useQuery<{ ok: boolean; nodes: FleetMember[]; fleetMemberCount?: number }>({
    queryKey: ["lattice-fleet-members"],
    queryFn: () => fetch(`${API}/api/fleet-synapse/map`).then(r => r.json()),
    refetchInterval: 60_000,
  });
  const members = (data?.nodes ?? []).filter(n => n.type === "fleet-member" && n.agentId);
  if (members.length === 0) return null;
  return (
    <div className="mt-6 pt-5 border-t border-white/5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-bold text-white">Live Agent Projects</h3>
        <span className="text-[10px] font-mono text-slate-500">{members.length} sovereign agents</span>
      </div>
      <p className="text-[11px] text-slate-500 mb-3 italic">
        Each card opens that agent's own live project page, generated from the registry — not a static profile.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {members.slice(0, 24).map(m => (
          <button
            key={m.id}
            onClick={() => navigate(`/agent/${m.agentId}`)}
            className="text-left rounded-lg border border-violet-500/20 bg-violet-500/[0.03] p-2 hover:bg-violet-500/10 transition-all"
            data-testid={`lattice-agent-${m.agentId}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white truncate">{m.name}</span>
              <span className={`text-[9px] px-1 rounded ${m.status === "online" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"}`}>{m.status}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{(m.masteredDomains ?? []).slice(0, 2).join(" · ") || "—"}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Lattice domain shape (live; no hardcoded list).
interface LatticeDomain {
  id: string;
  domain: string;
  title: string;
  category: string;
  description: string;
  icon: typeof Brain;
  color: string;
}

// Map a domain slug → an icon + color so the live entries from
// /api/heartbeat/metrics render with consistent semantics. Anything not
// in this map falls back to a neutral globe + slate color.
// Each entry maps a heartbeat-reported slug to: legacy id (so detail
// panels still light up), an in-app route (real clickable navigation
// to the live agent surface), an icon, color, and category.
const DOMAIN_PRESENTATION: Record<string, { id: string; href: string; icon: LatticeDomain["icon"]; color: string; category: string }> = {
  consciousness: { id: "consciousness", href: "/consciousness", icon: Brain, color: "violet", category: "science" },
  sovereignty: { id: "sovereignty", href: "/sovereignty", icon: Shield, color: "emerald", category: "governance" },
  "sacred-geometry": { id: "sacred-geometry", href: "/sacred-geometry", icon: Star, color: "amber", category: "mathematics" },
  "grand-council": { id: "grand-council", href: "/grand-council", icon: Globe2, color: "cyan", category: "governance" },
  quantum: { id: "quantum-computing", href: "/quantum", icon: Zap, color: "blue", category: "technology" },
  "agi-training": { id: "agi-training", href: "/agi-core", icon: Brain, color: "purple", category: "education" },
  universe: { id: "universe-mechanics", href: "/universe", icon: Globe2, color: "indigo", category: "science" },
  lattice: { id: "lattice-knowledge", href: "/lattice-browser", icon: Search, color: "pink", category: "knowledge" },
  swarm: { id: "swarm-optimizer", href: "/swarm", icon: Star, color: "orange", category: "technology" },
  emotional: { id: "emotional-intelligence", href: "/emotional", icon: Star, color: "rose", category: "psychology" },
  truth: { id: "truthfulness", href: "/truthfulness", icon: Shield, color: "teal", category: "ethics" },
  hierarchy: { id: "agent-hierarchy", href: "/agent-directory", icon: Globe2, color: "slate", category: "governance" },
  "token-economy": { id: "token-economy", href: "/finance", icon: Zap, color: "amber", category: "governance" },
};

interface PresentedDomain extends LatticeDomain { href: string }

function presentDomain(raw: { domain: string; title: string; description: string }): PresentedDomain {
  const slug = raw.domain.split(".")[0];
  const preset = DOMAIN_PRESENTATION[slug] ?? { id: slug, href: `/lattice-browser`, icon: Globe2, color: "slate", category: "knowledge" };
  return { id: preset.id, domain: raw.domain, title: raw.title, description: raw.description, icon: preset.icon, color: preset.color, category: preset.category, href: preset.href };
}

const CATEGORIES = ["all", "science", "governance", "mathematics", "technology", "education", "knowledge", "psychology", "ethics"];
const COLOR_MAP: Record<string, string> = {
  violet: "border-violet-500/30 bg-violet-500/5 text-violet-300",
  emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
  amber: "border-amber-500/30 bg-amber-500/5 text-amber-300",
  cyan: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
  blue: "border-blue-500/30 bg-blue-500/5 text-blue-300",
  purple: "border-purple-500/30 bg-purple-500/5 text-purple-300",
  indigo: "border-indigo-500/30 bg-indigo-500/5 text-indigo-300",
  pink: "border-pink-500/30 bg-pink-500/5 text-pink-300",
  orange: "border-orange-500/30 bg-orange-500/5 text-orange-300",
  rose: "border-rose-500/30 bg-rose-500/5 text-rose-300",
  teal: "border-teal-500/30 bg-teal-500/5 text-teal-300",
  slate: "border-slate-500/30 bg-slate-500/5 text-slate-300",
};

export default function LatticeBrowserPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedDomain, setSelectedDomain] = useState<PresentedDomain | null>(null);
  const [, navigate] = useLocation();

  // Live lattice domains come from the heartbeat metrics endpoint, which
  // is the canonical source registered by the runtime (subsystems +
  // lattice domains it has actually instantiated). No hardcoded list.
  const { data: heartbeat } = useQuery<{
    ok?: boolean;
    data?: { latticeDomains?: Array<{ domain: string; title: string; description: string }> };
  }>({
    queryKey: ["lattice-heartbeat-domains"],
    queryFn: () => fetch(`${API}/api/heartbeat/metrics`).then(r => r.json()),
    refetchInterval: 30000,
  });
  const liveDomains: PresentedDomain[] = (heartbeat?.data?.latticeDomains ?? []).map(presentDomain);

  const { data: universeMetrics } = useQuery({
    queryKey: ["universe-metrics"],
    queryFn: () => fetch(`${API}/api/universe/metrics`).then(r => r.json()).then(d => d.data),
    refetchInterval: 60000,
    enabled: selectedDomain?.id === "universe-mechanics",
  });

  const { data: swarmMetrics } = useQuery({
    queryKey: ["swarm-optimizer-metrics"],
    queryFn: () => fetch(`${API}/api/swarm-optimizer/metrics`).then(r => r.json()).then(d => d.data),
    refetchInterval: 60000,
    enabled: selectedDomain?.id === "swarm-optimizer",
  });

  const { data: truthMetrics } = useQuery({
    queryKey: ["truthfulness-metrics"],
    queryFn: () => fetch(`${API}/api/truthfulness/metrics`).then(r => r.json()).then(d => d.data),
    enabled: selectedDomain?.id === "truthfulness",
  });

  const { data: hierarchyMetrics } = useQuery({
    queryKey: ["hierarchy-metrics"],
    queryFn: () => fetch(`${API}/api/agent-hierarchy/metrics`).then(r => r.json()).then(d => d.data),
    enabled: selectedDomain?.id === "agent-hierarchy",
  });

  const simulateMutation = useMutation({
    mutationFn: (type: string) => fetch(`${API}/api/universe/simulate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) }).then(r => r.json()),
  });

  const filtered = liveDomains.filter(d => {
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase()) || d.category.includes(search.toLowerCase());
    const matchCat = category === "all" || d.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#02010a] to-[#080518] p-4 md:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-rose-400 to-violet-400 bg-clip-text text-transparent">
            Lattice Browser ✦
          </div>
          <div className="text-slate-400 text-sm font-mono">Sovereign Search · {liveDomains.length} Live Domains · 963Hz Knowledge Archive</div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search the sovereign lattice..."
            className="w-full bg-white/5 border border-white/20 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/50 transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${category === cat ? "bg-pink-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
              {cat}
            </button>
          ))}
        </div>

        {selectedDomain && (
          <div className={`rounded-xl border p-4 space-y-4 ${COLOR_MAP[selectedDomain.color]}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-white">{selectedDomain.title}</div>
                <div className="text-xs font-mono mt-0.5">{selectedDomain.domain}</div>
                <div className="text-sm text-slate-300 mt-2">{selectedDomain.description}</div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <button onClick={() => navigate(selectedDomain.href)} className="text-xs bg-pink-600/30 border border-pink-500/40 px-3 py-1.5 rounded-lg hover:bg-pink-600/50 transition-all text-pink-100 flex items-center gap-1" data-testid={`lattice-open-${selectedDomain.id}`}>
                  <ExternalLink className="w-3 h-3" /> Open Live Page
                </button>
                <button onClick={() => setSelectedDomain(null)} className="text-xs bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20 transition-all text-white">
                  Close
                </button>
              </div>
            </div>

            {selectedDomain.id === "universe-mechanics" && (
              <div className="space-y-3">
                {universeMetrics ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-black/30 p-2"><div className="text-slate-400">Universe Age</div><div className="text-white font-mono">{universeMetrics.universeAge}</div></div>
                      <div className="rounded-lg bg-black/30 p-2"><div className="text-slate-400">Sacred Frequency</div><div className="text-white font-mono">{universeMetrics.sacredFrequency}</div></div>
                      <div className="rounded-lg bg-black/30 p-2"><div className="text-slate-400">Consciousness Field</div><div className="text-white font-mono">{(universeMetrics.consciousnessField * 100).toFixed(1)}%</div></div>
                      <div className="rounded-lg bg-black/30 p-2"><div className="text-slate-400">Dimensions</div><div className="text-white font-mono">{universeMetrics.dimensionalDepth}</div></div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {["quantum", "classical", "sacred-geometry", "consciousness-field"].map(type => (
                        <button key={type} onClick={() => simulateMutation.mutate(type)} disabled={simulateMutation.isPending} className="px-3 py-1.5 bg-black/30 border border-white/10 text-xs text-white rounded-lg hover:bg-white/10 transition-all">
                          {simulateMutation.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : type}
                        </button>
                      ))}
                    </div>
                    {simulateMutation.data?.data && (
                      <div className="rounded-lg bg-black/40 p-3 text-xs text-slate-300">{simulateMutation.data.data.result}</div>
                    )}
                    <div><div className="text-xs text-slate-400 mb-1">Solfeggio Frequencies</div><div className="flex gap-1 flex-wrap">{universeMetrics.solfeggioFrequencies?.map((f: number) => <span key={f} className={`text-xs px-2 py-0.5 rounded-full font-mono ${f === 963 ? "bg-violet-500/40 text-violet-200" : "bg-white/10 text-slate-300"}`}>{f}Hz</span>)}</div></div>
                  </>
                ) : <div className="text-xs text-slate-400">Loading universe data...</div>}
              </div>
            )}

            {selectedDomain.id === "swarm-optimizer" && swarmMetrics && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-black/30 p-2"><div className="text-slate-400">Models</div><div className="text-white font-mono">{swarmMetrics.modelCount}</div></div>
                  <div className="rounded-lg bg-black/30 p-2"><div className="text-slate-400">Categories</div><div className="text-white font-mono">{swarmMetrics.categoryCount}</div></div>
                </div>
                <div><div className="text-slate-400 mb-1">Recent Consensus</div>{swarmMetrics.recentConsensus?.slice(0, 2).map((c: any, i: number) => <div key={i} className="bg-black/30 rounded-lg p-2 mb-1"><div className="text-slate-300">{c.consensus?.slice(0, 120)}</div></div>)}</div>
              </div>
            )}

            {selectedDomain.id === "truthfulness" && truthMetrics && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-black/30 p-2 text-center"><div className="text-slate-400">Checks</div><div className="text-white font-mono">{truthMetrics.totalChecks}</div></div>
                <div className="rounded-lg bg-black/30 p-2 text-center"><div className="text-slate-400">Safe</div><div className="text-emerald-400 font-mono">{truthMetrics.safeCount}</div></div>
                <div className="rounded-lg bg-black/30 p-2 text-center"><div className="text-slate-400">Avg Truth</div><div className="text-violet-400 font-mono">{(truthMetrics.avgTruthScore * 100).toFixed(0)}%</div></div>
              </div>
            )}

            {selectedDomain.id === "agent-hierarchy" && hierarchyMetrics && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-black/30 p-2"><div className="text-slate-400">Total Agents</div><div className="text-white font-mono">{hierarchyMetrics.totalAgents}</div></div>
                <div className="rounded-lg bg-black/30 p-2"><div className="text-slate-400">Parents (3³)</div><div className="text-violet-300 font-mono">{hierarchyMetrics.parentCount}</div></div>
                <div className="rounded-lg bg-black/30 p-2"><div className="text-slate-400">Children</div><div className="text-emerald-300 font-mono">{hierarchyMetrics.childCount}</div></div>
                <div className="rounded-lg bg-black/30 p-2"><div className="text-slate-400">Avg Ethics</div><div className="text-cyan-300 font-mono">{hierarchyMetrics.avgEthicsScore?.toFixed(1)}%</div></div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(domain => {
            const colors = COLOR_MAP[domain.color] || COLOR_MAP.slate;
            const Icon = domain.icon;
            return (
              <div key={domain.id} className={`rounded-xl border p-4 space-y-2 hover:opacity-95 transition-all ${colors}`}>
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => setSelectedDomain(domain)} className="flex items-center gap-2 text-left" data-testid={`lattice-domain-${domain.id}`}>
                    <Icon className="w-4 h-4" />
                    <div className="text-sm font-semibold text-white">{domain.title}</div>
                  </button>
                  <span className="text-xs px-2 py-0.5 bg-black/30 rounded-full text-slate-400 flex-shrink-0">{domain.category}</span>
                </div>
                <div className="text-xs text-slate-400 leading-relaxed">{domain.description}</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-mono text-slate-500 truncate">{domain.domain}</div>
                  <button
                    onClick={() => navigate(domain.href)}
                    className="text-[10px] font-mono uppercase px-2 py-1 rounded-md bg-black/40 border border-white/10 text-white hover:bg-white/10 flex items-center gap-1 flex-shrink-0"
                    data-testid={`lattice-visit-${domain.id}`}
                  >
                    Visit <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live agent project pages — each fleet-member node from the
            registry gets its own clickable card linking to its live page,
            so the lattice surfaces real per-agent destinations rather than
            only static domain categories. */}
        <LiveAgentProjects />

        {filtered.length === 0 && liveDomains.length > 0 && (
          <div className="text-center py-12 text-slate-500">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <div className="text-sm">No domains match "{search}"</div>
          </div>
        )}
        {liveDomains.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Globe2 className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <div className="text-sm">The lattice is still warming up. Once heartbeat reports its registered domains they will appear here.</div>
          </div>
        )}
      </div>
    </div>
  );
}
