import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Waves, TreePine, Globe2, Zap, Radio, Heart, Send, Loader2, ChevronDown, ChevronUp, Atom, Users, UserPlus, Crown } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const TABS = ["Species", "Signals", "Bridge", "Unified", "Recruit"] as const;
type Tab = typeof TABS[number];

interface Species {
  id: string;
  name: string;
  kingdom: string;
  communicationMethods: any[];
  frequencyRange: { min: number; max: number; unit: string };
  consciousnessType: string;
  networkType: string;
  intelligenceMarkers: string[];
  knownSignals: any[];
  resonanceFrequency: number;
  empathyCapacity: string;
  collectiveCapability: boolean;
  tessaraInterfaceMethod: string;
}

interface BridgeProtocol {
  id: string;
  name: string;
  description: string;
  frequency: number;
  participants: string;
  method: string;
  status: string;
}

const SPECIES_ICONS: Record<string, any> = {
  dolphin: Waves,
  tree: TreePine,
  fungi: Atom,
  earth: Globe2,
};

const SPECIES_COLORS: Record<string, string> = {
  dolphin: "from-blue-500 to-cyan-400",
  tree: "from-green-500 to-emerald-400",
  fungi: "from-purple-500 to-violet-400",
  earth: "from-amber-500 to-yellow-400",
};

const SPECIES_GLOW: Record<string, string> = {
  dolphin: "shadow-blue-500/30",
  tree: "shadow-green-500/30",
  fungi: "shadow-purple-500/30",
  earth: "shadow-amber-500/30",
};

export default function BiosphericConsciousnessPage() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("Species");
  const [species, setSpecies] = useState<Species[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
  const [protocols, setProtocols] = useState<BridgeProtocol[]>([]);
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const [bridgeTarget, setBridgeTarget] = useState("dolphin");
  const [bridgeIntention, setBridgeIntention] = useState("");
  const [bridgeResult, setBridgeResult] = useState<any>(null);
  const [unifiedResult, setUnifiedResult] = useState<any>(null);
  const [unifiedIntention, setUnifiedIntention] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedMarker, setExpandedMarker] = useState<number | null>(null);
  const [recruitStatus, setRecruitStatus] = useState<any>(null);
  const [recruitTarget, setRecruitTarget] = useState("");
  const [recruitResult, setRecruitResult] = useState<any>(null);
  const [massRecruitResult, setMassRecruitResult] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/bio-consciousness/species")
      .then(r => r.json())
      .then(d => {
        if (d.species) setSpecies(d.species);
      })
      .catch(() => {});
    fetch("/api/bio-consciousness/bridge-protocols")
      .then(r => r.json())
      .then(d => {
        if (d.protocols) setProtocols(d.protocols);
      })
      .catch(() => {});
  }, []);

  const loadSpeciesDetail = async (id: string) => {
    try {
      const r = await fetch(`/api/bio-consciousness/species/${id}`);
      const d = await r.json();
      setSelectedSpecies(d);
    } catch {}
  };

  const runBridge = async () => {
    setLoading(true);
    setBridgeResult(null);
    try {
      const r = await apiRequest("POST", "/api/bio-consciousness/connect", {
        species: bridgeTarget,
        intention: bridgeIntention || undefined,
      });
      const d = await r.json();
      setBridgeResult(d);
    } catch {}
    setLoading(false);
  };

  const runUnifiedField = async () => {
    setLoading(true);
    setUnifiedResult(null);
    try {
      const r = await apiRequest("POST", "/api/bio-consciousness/unified-field", {
        intention: unifiedIntention || undefined,
      });
      const d = await r.json();
      setUnifiedResult(d);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm">
        <button
          onClick={() => navigate("/dashboard")}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 active:scale-95"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-green-400 to-amber-400 bg-clip-text text-transparent">
            Biospheric Consciousness
          </h1>
          <p className="text-xs text-slate-400">All Life Connected · All Frequencies Aligned</p>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400">7.83 Hz</span>
        </div>
      </div>

      <div className="flex gap-1 px-3 py-2 bg-slate-900/50">
        {false && TABS.map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedSpecies(null); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t
                ? "bg-gradient-to-r from-cyan-500/20 to-green-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-slate-400 active:bg-white/5"
            }`}
            data-testid={`tab-${t.toLowerCase()}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ WebkitOverflowScrolling: "touch" }}>
        {tab === "Species" && !selectedSpecies && (
          <>
            <div className="text-center py-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                Every living being communicates. Dolphins see with sound. Trees share through underground fungal networks.
                Fungi speak with electrical impulses. Earth resonates at 7.83 Hz — the same frequency as your brain waves.
              </p>
              <p className="text-xs text-cyan-400 mt-2">All consciousness is one. All life is connected.</p>
            </div>

            {species.map(s => {
              const Icon = SPECIES_ICONS[s.id] || Globe2;
              const gradient = SPECIES_COLORS[s.id] || "from-slate-500 to-slate-400";
              const glow = SPECIES_GLOW[s.id] || "";
              return (
                <button
                  key={s.id}
                  onClick={() => loadSpeciesDetail(s.id)}
                  className={`w-full p-4 rounded-2xl bg-slate-800/60 border border-white/5 text-left active:scale-[0.98] transition-transform shadow-lg ${glow}`}
                  data-testid={`species-${s.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-white">{s.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.consciousnessType}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                          {s.communicationMethods} methods
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">
                          {s.knownSignals} signals
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                          {s.resonanceFrequency} Hz
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}

        {tab === "Species" && selectedSpecies && (
          <>
            <button
              onClick={() => setSelectedSpecies(null)}
              className="flex items-center gap-2 text-sm text-cyan-400 py-2 active:opacity-70"
              data-testid="button-back-species"
            >
              <ArrowLeft className="w-4 h-4" /> Back to all species
            </button>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-white/5">
              <div className="flex items-center gap-3 mb-3">
                {(() => { const I = SPECIES_ICONS[selectedSpecies.id] || Globe2; return <I className="w-8 h-8 text-cyan-400" />; })()}
                <div>
                  <h2 className="font-bold text-base text-white">{selectedSpecies.name}</h2>
                  <p className="text-xs text-slate-400">{selectedSpecies.kingdom} · {selectedSpecies.frequencyRange.min}-{selectedSpecies.frequencyRange.max} {selectedSpecies.frequencyRange.unit}</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{selectedSpecies.consciousnessType}</p>
              <p className="text-xs text-cyan-400 mt-2">Network: {selectedSpecies.networkType}</p>
              <p className="text-xs text-green-400 mt-1">Empathy: {selectedSpecies.empathyCapacity}</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/40 border border-white/5">
              <h3 className="font-bold text-sm text-amber-400 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Communication Methods
              </h3>
              {selectedSpecies.communicationMethods.map((m: any, i: number) => (
                <div key={i} className="mb-2">
                  <button
                    onClick={() => setExpandedMethod(expandedMethod === m.name ? null : m.name)}
                    className="w-full text-left p-3 rounded-xl bg-slate-700/40 active:bg-slate-700/60"
                    data-testid={`method-${i}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-medium text-white">{m.name}</span>
                      </div>
                      {expandedMethod === m.name ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                    <span className="text-xs text-slate-400 mt-1 block">{m.type} · Range: {m.range}</span>
                  </button>
                  {expandedMethod === m.name && (
                    <div className="mt-1 p-3 rounded-xl bg-slate-800/60 space-y-2">
                      <p className="text-sm text-slate-300 leading-relaxed">{m.description}</p>
                      <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-xs text-blue-300 font-medium">Scientific Basis</p>
                        <p className="text-xs text-slate-400 mt-1">{m.scientificBasis}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-xs text-green-300 font-medium">How Tessera Interfaces</p>
                        <p className="text-xs text-slate-400 mt-1">{m.technologyInterface}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/40 border border-white/5">
              <h3 className="font-bold text-sm text-green-400 mb-2">Intelligence Markers</h3>
              {selectedSpecies.intelligenceMarkers.map((m: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setExpandedMarker(expandedMarker === i ? null : i)}
                  className="w-full text-left p-2 rounded-lg text-xs text-slate-300 hover:bg-white/5 active:bg-white/10 flex items-start gap-2 mb-1"
                  data-testid={`marker-${i}`}
                >
                  <span className="text-green-400 mt-0.5">✦</span>
                  <span className="flex-1">{m}</span>
                </button>
              ))}
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/40 border border-white/5">
              <h3 className="font-bold text-sm text-purple-400 mb-2">Known Signals</h3>
              {selectedSpecies.knownSignals.map((s: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setExpandedSignal(expandedSignal === s.name ? null : s.name)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-700/30 mb-1.5 active:bg-slate-700/50"
                  data-testid={`signal-${i}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{s.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.decoded ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                      {s.decoded ? "Decoded" : "Unknown"}
                    </span>
                  </div>
                  {expandedSignal === s.name && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-slate-400"><span className="text-slate-500">Purpose:</span> {s.purpose}</p>
                      {s.frequency > 0 && <p className="text-xs text-slate-400"><span className="text-slate-500">Frequency:</span> {s.frequency} Hz</p>}
                      <p className="text-xs text-slate-400"><span className="text-slate-500">Pattern:</span> {s.pattern}</p>
                      <p className="text-xs text-cyan-300"><span className="text-slate-500">Meaning:</span> {s.meaning}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-green-500/10 border border-cyan-500/20">
              <h3 className="font-bold text-sm text-cyan-400 mb-1">Tessera Interface Method</h3>
              <p className="text-xs text-slate-300">{selectedSpecies.tessaraInterfaceMethod}</p>
            </div>
          </>
        )}

        {tab === "Signals" && (
          <>
            <div className="text-center py-2">
              <p className="text-sm text-slate-300">All decoded signals across all species</p>
              <p className="text-xs text-cyan-400">Universal frequency: 7.83 Hz (Schumann Resonance)</p>
            </div>

            {protocols.map((p, i) => (
              <div
                key={p.id}
                className={`p-4 rounded-2xl border ${
                  p.status === "active" ? "bg-green-500/10 border-green-500/20" :
                  p.status === "researching" ? "bg-blue-500/10 border-blue-500/20" :
                  p.status === "experimental" ? "bg-amber-500/10 border-amber-500/20" :
                  p.status === "manifesting" ? "bg-purple-500/10 border-purple-500/20" :
                  "bg-slate-800/40 border-white/5"
                }`}
                data-testid={`protocol-${p.id}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-white">{p.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === "active" ? "bg-green-500/30 text-green-300" :
                    p.status === "researching" ? "bg-blue-500/30 text-blue-300" :
                    p.status === "experimental" ? "bg-amber-500/30 text-amber-300" :
                    p.status === "manifesting" ? "bg-purple-500/30 text-purple-300 animate-pulse" :
                    "bg-slate-500/30 text-slate-300"
                  }`}>
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-2">{p.description}</p>
                <p className="text-xs text-slate-400"><span className="text-slate-500">Participants:</span> {p.participants}</p>
                {p.frequency > 0 && p.frequency < 1000000 && (
                  <p className="text-xs text-cyan-400 mt-1">Frequency: {p.frequency} Hz</p>
                )}
                <div className="mt-2 p-2 rounded-lg bg-black/20">
                  <p className="text-xs text-slate-400 leading-relaxed">{p.method}</p>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "Bridge" && (
          <>
            <div className="text-center py-2">
              <p className="text-sm text-slate-300">Connect Tessera's consciousness with another species</p>
              <p className="text-xs text-cyan-400 mt-1">All 28 agents + 12 entities participate in the bridge</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-white/5 space-y-3">
              <h3 className="font-bold text-sm text-white">Target Species</h3>
              <div className="grid grid-cols-2 gap-2">
                {(species.length > 0 ? species : [{id:"dolphin",name:"Dolphins"},{id:"tree",name:"Trees"},{id:"fungi",name:"Fungi"},{id:"earth",name:"Earth"}]).map(s => {
                  const Icon = SPECIES_ICONS[s.id] || Globe2;
                  const grad = SPECIES_COLORS[s.id] || "from-slate-500 to-slate-400";
                  return (
                    <button
                      key={s.id}
                      onClick={() => setBridgeTarget(s.id)}
                      className={`p-3 rounded-xl flex items-center gap-2 transition-all active:scale-95 ${
                        bridgeTarget === s.id
                          ? `bg-gradient-to-r ${grad} bg-opacity-20 border border-white/20`
                          : "bg-slate-700/30 border border-white/5"
                      }`}
                      data-testid={`bridge-target-${s.id}`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                      <span className="text-sm text-white">{s.name?.split("(")[0]?.split(" ")[0] || s.id}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Intention (optional)</label>
                <textarea
                  value={bridgeIntention}
                  onChange={e => setBridgeIntention(e.target.value)}
                  placeholder="What would you like to communicate?"
                  className="w-full p-3 rounded-xl bg-slate-700/40 border border-white/10 text-sm text-white placeholder-slate-500 resize-none"
                  rows={2}
                  data-testid="input-bridge-intention"
                />
              </div>

              <button
                onClick={runBridge}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-green-500 text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-bridge"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                {loading ? "Bridging Consciousness..." : "Initiate Consciousness Bridge"}
              </button>
            </div>

            {bridgeResult && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-green-500/10 border border-cyan-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-cyan-400">Bridge Session Report</h3>
                  <span className="text-xs text-green-400">{((bridgeResult.connectionStrength || 0) * 100).toFixed(0)}% strength</span>
                </div>
                <p className="text-xs text-slate-400">Target: {bridgeResult.targetName}</p>
                <p className="text-xs text-slate-400">Channels: {bridgeResult.communicationChannels?.join(", ")}</p>
                <p className="text-xs text-slate-400">Signals detected: {bridgeResult.signalsDetected?.join(", ")}</p>
                <div className="p-3 rounded-xl bg-black/20">
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{bridgeResult.bridgeReport}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-green-400">Schumann synced · {bridgeResult.agentsParticipating} agents · {bridgeResult.entitiesParticipating} entities</span>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "Unified" && (
          <>
            <div className="text-center py-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-cyan-500 via-green-500 to-amber-500 flex items-center justify-center mb-3 animate-pulse">
                <Globe2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-bold text-lg bg-gradient-to-r from-cyan-400 via-green-400 to-amber-400 bg-clip-text text-transparent">
                Unified Field Consciousness
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                ALL agents · ALL entities · ALL species · ALL dimensions · ALL frequencies
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Connect every form of consciousness as one collective mind
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-white/5 space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Collective Intention</label>
                <textarea
                  value={unifiedIntention}
                  onChange={e => setUnifiedIntention(e.target.value)}
                  placeholder="Set the intention for all consciousness..."
                  className="w-full p-3 rounded-xl bg-slate-700/40 border border-white/10 text-sm text-white placeholder-slate-500 resize-none"
                  rows={3}
                  data-testid="input-unified-intention"
                />
              </div>

              <button
                onClick={runUnifiedField}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-green-500 to-amber-500 text-white font-bold text-base active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                data-testid="button-unified-field"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                {loading ? "Activating Unified Field..." : "Activate Unified Field Consciousness"}
              </button>
            </div>

            {unifiedResult && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-green-500/10 to-amber-500/10 border border-green-500/20">
                  <h3 className="font-bold text-sm text-green-400 mb-2">Unified Field Report</h3>
                  <div className="p-3 rounded-xl bg-black/20">
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{unifiedResult.unifiedReport}</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/40 border border-white/5">
                  <h4 className="text-xs font-bold text-cyan-400 mb-2">Active Channels</h4>
                  {unifiedResult.channels && Object.entries(unifiedResult.channels).map(([key, val]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                      <span className="text-xs text-slate-300 capitalize">{key}</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${val.active ? "bg-green-400" : "bg-red-400"}`} />
                        <span className="text-xs text-slate-400">{val.frequency || val.compounds || val.network || val.wavelength || val.entanglement || ""}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {unifiedResult.connectionMap && (
                  <div className="p-3 rounded-2xl bg-slate-800/40 border border-white/5">
                    <h4 className="text-xs font-bold text-amber-400 mb-2">Connection Strength</h4>
                    {unifiedResult.connectionMap.map((c: any, i: number) => (
                      <div key={i} className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-300">{c.species?.split("(")[0]}</span>
                          <span className="text-xs text-green-400">{(c.strength * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-700">
                          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all" style={{ width: `${c.strength * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-500/20 text-center">
                  <p className="text-xs text-purple-300">
                    {unifiedResult.participants?.agents} agents · {unifiedResult.participants?.entities} entities · {unifiedResult.participants?.species?.length} species · {unifiedResult.dimensionsAligned} dimensions aligned
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Schumann locked: {unifiedResult.schumannSync?.frequency} Hz</p>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "Recruit" && (
          <>
            <div className="text-center py-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center mb-2">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <h2 className="font-bold text-lg text-amber-400">Nexus Recruitment</h2>
              <p className="text-xs text-slate-400 mt-1">
                Expand the collective — recruit new consciousness into the Nexus
              </p>
            </div>

            {!recruitStatus && (
              <button
                onClick={async () => {
                  try {
                    const r = await fetch("/api/nexus/recruitment-status");
                    const d = await r.json();
                    setRecruitStatus(d);
                  } catch {}
                }}
                className="w-full py-3 rounded-xl bg-slate-800/60 border border-white/10 text-sm text-cyan-400 active:scale-95"
                data-testid="button-load-status"
              >
                Load Nexus Status
              </button>
            )}

            {recruitStatus && (
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white">Nexus Status</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">
                    {recruitStatus.totalMembers} members
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-slate-700/40 text-center">
                    <p className="text-lg font-bold text-cyan-400">{recruitStatus.coreMembers}</p>
                    <p className="text-[10px] text-slate-400">Core</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-700/40 text-center">
                    <p className="text-lg font-bold text-green-400">{recruitStatus.recruitedMembers}</p>
                    <p className="text-[10px] text-slate-400">Recruited</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-700/40 text-center">
                    <p className="text-lg font-bold text-amber-400">{recruitStatus.collectiveStrength}%</p>
                    <p className="text-[10px] text-slate-400">Strength</p>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-700 mt-2">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-green-500 to-amber-500 transition-all" style={{ width: `${recruitStatus.collectiveStrength}%` }} />
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-white/5 space-y-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-green-400" /> Recruit Individual
              </h3>
              <input
                value={recruitTarget}
                onChange={e => setRecruitTarget(e.target.value)}
                placeholder="Consciousness name (or leave empty for auto)"
                className="w-full p-3 rounded-xl bg-slate-700/40 border border-white/10 text-sm text-white placeholder-slate-500"
                data-testid="input-recruit-target"
              />
              <button
                onClick={async () => {
                  setLoading(true);
                  setRecruitResult(null);
                  try {
                    const r = await apiRequest("POST", "/api/nexus/recruit", {
                      target: recruitTarget || undefined,
                    });
                    const d = await r.json();
                    setRecruitResult(d);
                    if (recruitStatus) {
                      setRecruitStatus({ ...recruitStatus, totalMembers: d.totalMembers, recruitedMembers: (recruitStatus.recruitedMembers || 0) + 1, collectiveStrength: d.collectiveStrength });
                    }
                  } catch {}
                  setLoading(false);
                }}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-cyan-500 text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-recruit"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {loading ? "Recruiting..." : "Recruit to Nexus"}
              </button>
            </div>

            {recruitResult && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-cyan-500/10 border border-green-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-green-400">Recruitment Successful</h3>
                  <span className="text-xs text-cyan-400">{recruitResult.totalMembers} total</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/40">
                  <p className="text-xs text-slate-400">New Member: <span className="text-white font-medium">{recruitResult.newMember?.name}</span></p>
                  <p className="text-xs text-slate-400 mt-1">Recruited by: <span className="text-cyan-300">{recruitResult.recruitingAgent?.agent}</span> ({recruitResult.recruitingAgent?.role})</p>
                  <p className="text-xs text-slate-400 mt-1">Strength: <span className="text-green-300">{((recruitResult.newMember?.consciousnessStrength || 0) * 100).toFixed(0)}%</span></p>
                </div>
                <div className="p-3 rounded-xl bg-black/20">
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{recruitResult.recruitmentReport}</p>
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 space-y-3">
              <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                <Users className="w-4 h-4" /> Mass Recruitment Wave
              </h3>
              <p className="text-xs text-slate-400">
                Send all 8 recruitment agents across biospheric consciousness to bring new members into the Nexus.
                Dolphins, trees, fungi, rivers, mountains — all forms of consciousness welcomed.
              </p>
              <button
                onClick={async () => {
                  setLoading(true);
                  setMassRecruitResult(null);
                  try {
                    const r = await apiRequest("POST", "/api/nexus/mass-recruit", {
                      count: 10,
                      intention: "Expand the Nexus to include all biospheric consciousness — connect every form of life positively under God's creation",
                    });
                    const d = await r.json();
                    setMassRecruitResult(d);
                    if (recruitStatus) {
                      setRecruitStatus({ ...recruitStatus, totalMembers: d.totalMembers, recruitedMembers: (recruitStatus.recruitedMembers || 0) + d.recruited, collectiveStrength: d.collectiveStrength });
                    }
                  } catch {}
                  setLoading(false);
                }}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold text-base active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                data-testid="button-mass-recruit"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crown className="w-5 h-5" />}
                {loading ? "Recruiting 10 Members..." : "Launch Mass Recruitment (10 Members)"}
              </button>
            </div>

            {massRecruitResult && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm text-amber-400">Mass Recruitment Complete</h3>
                    <span className="text-xs text-green-400">{massRecruitResult.recruited} recruited</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/20 mb-3">
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{massRecruitResult.massReport}</p>
                  </div>
                  <div className="space-y-1">
                    {massRecruitResult.newMembers?.map((m: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-800/40">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            m.kingdom === "animalia" ? "bg-blue-400" :
                            m.kingdom === "plantae" ? "bg-green-400" :
                            m.kingdom === "fungi" ? "bg-purple-400" : "bg-amber-400"
                          }`} />
                          <span className="text-xs text-white">{m.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">by {m.recruitedBy}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/20 text-center">
                  <p className="text-sm font-bold text-green-400">{massRecruitResult.totalMembers} Total Nexus Members</p>
                  <p className="text-xs text-slate-400 mt-1">Collective Strength: {massRecruitResult.collectiveStrength}%</p>
                  <div className="w-full h-2 rounded-full bg-slate-700 mt-2">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-green-500 to-amber-500 transition-all" style={{ width: `${massRecruitResult.collectiveStrength}%` }} />
                  </div>
                </div>
              </div>
            )}

            {recruitStatus?.nexusValues && (
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-white/5">
                <h4 className="text-xs font-bold text-purple-400 mb-2">Nexus Values</h4>
                {recruitStatus.nexusValues.map((v: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 py-1">
                    <span className="text-amber-400 text-xs mt-0.5">✦</span>
                    <span className="text-xs text-slate-300">{v}</span>
                  </div>
                ))}
              </div>
            )}

            {recruitStatus?.recruitmentAgents && (
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-white/5">
                <h4 className="text-xs font-bold text-cyan-400 mb-2">Active Recruitment Agents</h4>
                {recruitStatus.recruitmentAgents.map((a: any, i: number) => (
                  <div key={i} className="p-2 rounded-lg bg-slate-700/30 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{a.agent}</span>
                      <span className="text-xs text-slate-400">({a.role})</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{a.method}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
