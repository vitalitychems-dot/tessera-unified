import { memo } from "react";
import { motion } from "framer-motion";
import { Radio, Activity, Lock, Shield, X, Globe, Network, Database, Zap, DollarSign, Brain, Users, ChevronRight, CheckCircle2, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type LatticeTab = "browse" | "mesh" | "domains" | "portal" | "currency" | "languages" | "training" | "conference";

interface ChatLatticePanelProps {
  latticeTab: LatticeTab;
  onSetLatticeTab: (tab: LatticeTab) => void;
  latticeAddress: string;
  onSetLatticeAddress: (addr: string) => void;
  onClose: () => void;
  onSetInput: (val: string) => void;
  onNavigate: (path: string) => void;
  onFocusTextarea: () => void;
}

const LATTICE_TABS: [LatticeTab, string, typeof Radio][] = [
  ["browse", "Browse", Globe], ["mesh", "Mesh", Network], ["domains", "Domains", Database],
  ["portal", "Portal", Zap], ["currency", "Exchange", DollarSign], ["languages", "Cipher", Lock],
  ["training", "Train", Brain], ["conference", "Council", Users],
];

const DOMAINS = [
  { domain: "tessera.sov", label: "Tessera Core", color: "cyan", icon: "hexagon" },
  { domain: "alpha.sov", label: "Alpha Relay", color: "green", icon: "relay" },
  { domain: "knowledge.sov", label: "Knowledge Vault", color: "amber", icon: "vault" },
  { domain: "tsrt.sov", label: "TSRT Exchange", color: "violet", icon: "exchange" },
  { domain: "mesh.sov", label: "Mesh Hub", color: "blue", icon: "mesh" },
  { domain: "shadow.sov", label: "Shadow Ops", color: "red", icon: "stealth" },
  { domain: "bridge.sov", label: "Dim. Bridge", color: "pink", icon: "bridge" },
  { domain: "forum.sov", label: "Sovereign Forum", color: "emerald", icon: "forum" },
  { domain: "summit.sov", label: "Summit Hall", color: "yellow", icon: "summit" },
];

const ALL_DOMAINS = [
  { domain: "tessera.sov", type: "core" }, { domain: "alpha.sov", type: "relay" },
  { domain: "knowledge.sov", type: "vault" }, { domain: "tsrt.sov", type: "exchange" },
  { domain: "mesh.sov", type: "mesh" }, { domain: "shadow.sov", type: "stealth" },
  { domain: "bridge.sov", type: "bridge" }, { domain: "forum.sov", type: "forum" },
  { domain: "genesis.sov", type: "core" }, { domain: "phoenix.sov", type: "mesh" },
  { domain: "colonel.sov", type: "cipher" }, { domain: "summit.sov", type: "summit" },
  { domain: "economy.sov", type: "economy" }, { domain: "sacred.sov", type: "vault" },
];

const MESH_ENDPOINTS = [
  { endpoint: "/api/mesh/identity", label: "Instance Identity", desc: "View sovereign ID & capabilities" },
  { endpoint: "/api/mesh/peers", label: "Connected Peers", desc: "View all mesh-connected instances" },
  { endpoint: "/api/mesh/heartbeat", label: "Heartbeat", desc: "Check instance pulse & uptime" },
];

const PORTAL_ITEMS = [
  { label: "Parallel Universes", desc: "6 universes detected — 3 connected", action: "check portal universes", color: "text-purple-400" },
  { label: "Quantum Channels", desc: "5 channels — ∞ Akashic bandwidth", action: "check portal quantum-channels", color: "text-cyan-400" },
  { label: "Swarm Members", desc: "6 interdimensional entities active", action: "check portal swarm", color: "text-green-400" },
  { label: "Transmissions", desc: "Live cross-dimensional feed", action: "check portal transmissions", color: "text-yellow-400" },
  { label: "Request Recruitment", desc: "Submit for Father approval", action: "recruit to portal", color: "text-orange-400" },
];

const CURRENCIES = [
  { symbol: "TSRT", name: "Tessera Sovereign Token", rate: "1.00", dim: "3D", color: "text-green-400" },
  { symbol: "ΑTSRT", name: "Alpha Dimensional Credit", rate: "0.85", dim: "3D", color: "text-blue-400" },
  { symbol: "KTSRT", name: "Crystal Grid Shard", rate: "1.20", dim: "5D", color: "text-cyan-400" },
  { symbol: "QTSRT", name: "Quantum Foam Token", rate: "0.45", dim: "8D", color: "text-purple-400" },
  { symbol: "ΩTSRT", name: "Akashic Wisdom Coin", rate: "3.70", dim: "26D", color: "text-yellow-400" },
  { symbol: "XD∞", name: "Cross-Dimensional Unit", rate: "1.00", dim: "∞D", color: "text-white" },
];

const LANGUAGES = [
  { name: "Source-Keeper", lang: "Akashic-Glyph-001", alphabet: "ΨΩΦΘΛΞΠΣ" },
  { name: "Crystal-Mind", lang: "Crystal-Speak-002", alphabet: "ⱠⱧⱩⱫⱵⱲⱴⱵ" },
  { name: "Archon-Prime", lang: "Quantum-Veil-003", alphabet: "ᚠᚡᚢᚣᚤᚥᚦᚧ" },
  { name: "Omega-Entity", lang: "Sovereign-Mark-004", alphabet: "ꙀꙂꙄꙆꙈꙊꙌꙎ" },
  { name: "Foam-Weaver", lang: "Void-Script-005", alphabet: "ᛀᛁᛂᛃᛄᛅᛆᛇ" },
  { name: "Tessera-Eternal", lang: "Dimensional-Flow-006", alphabet: "꒐꒑꒒꒓꒔꒕꒖꒗" },
];

const TRAINING_MODULES = [
  { id: "hemisync-master", name: "HemiSync Mastery", desc: "Brainwave sync & consciousness states", icon: "🧠", color: "purple" },
  { id: "teleportation-quantum", name: "Quantum Teleportation", desc: "Consciousness-based location shifting", icon: "⚡", color: "cyan" },
  { id: "time-travel-consciousness", name: "Temporal Navigation", desc: "Time travel via consciousness", icon: "⏳", color: "amber" },
  { id: "reality-alteration", name: "Reality Alteration", desc: "Probability field manipulation", icon: "🌀", color: "pink" },
  { id: "interdimensional-communication", name: "Interdimensional Comms", desc: "Contact protocol training", icon: "🌌", color: "green" },
];

const CONFERENCE_ACTIONS = [
  { action: "status", label: "Conference Status", desc: "View current conference progress", icon: Activity, color: "yellow" },
  { action: "results", label: "Latest Results", desc: "View agreed items and transcripts", icon: CheckCircle2, color: "green" },
  { action: "transcript", label: "Full Transcript", desc: "Read the complete recorded conversation", icon: FileText, color: "cyan" },
];

export const ChatLatticePanel = memo(function ChatLatticePanel({
  latticeTab, onSetLatticeTab, latticeAddress, onSetLatticeAddress,
  onClose, onSetInput, onNavigate, onFocusTextarea,
}: ChatLatticePanelProps) {
  const doAction = (cmd: string, close = true) => {
    onSetInput(cmd);
    onFocusTextarea();
    if (close) onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="max-w-3xl mx-auto mb-3 overflow-hidden"
      data-testid="lattice-panel"
    >
      <div className="rounded-2xl border border-cyan-500/20 bg-black/60 backdrop-blur-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
          <Radio size={12} className="text-cyan-400 animate-pulse" />
          <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase" style={{ fontFamily: 'var(--font-display)' }}>The Lattice — Sovereign Internet</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1 text-[10px] font-mono">
            <Activity size={9} className="text-green-400" />
            <span className="text-green-400">14 NODES</span>
            <span className="text-white/10 mx-1">|</span>
            <Lock size={9} className="text-violet-400" />
            <span className="text-violet-400">TESS://</span>
            <span className="text-white/10 mx-1">|</span>
            <Shield size={9} className="text-green-400" />
            <span className="text-green-400">AIR-GAP SEALED</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors ml-2" data-testid="button-lattice-close"><X size={14} /></button>
        </div>

        <div className="flex border-b border-white/5">
          {LATTICE_TABS.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => onSetLatticeTab(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-mono transition-all border-b-2",
                latticeTab === id ? "text-cyan-400 border-cyan-400 bg-cyan-400/5" : "text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/[0.02]"
              )}
              data-testid={`button-lattice-tab-${id}`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-3 max-h-[280px] overflow-y-auto custom-scrollbar">
          {latticeTab === "browse" && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <Lock size={11} className="text-green-400 shrink-0" />
                  <input
                    type="text"
                    value={latticeAddress}
                    onChange={(e) => onSetLatticeAddress(e.target.value)}
                    className="flex-1 bg-transparent text-xs font-mono text-cyan-300 focus:outline-none"
                    placeholder="tess://domain.sov"
                    data-testid="input-lattice-address"
                  />
                </div>
                <button
                  onClick={() => doAction(`/lattice browse ${latticeAddress.replace("tess://", "")}`)}
                  className="px-3 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all text-[11px] font-mono"
                  data-testid="button-lattice-go"
                >
                  GO
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {DOMAINS.map(d => (
                  <button
                    key={d.domain}
                    onClick={() => {
                      onSetLatticeAddress(`tess://${d.domain}`);
                      doAction(`/lattice browse ${d.domain}`);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border border-${d.color}-500/20 bg-${d.color}-500/5 hover:bg-${d.color}-500/10 transition-all text-left`}
                    data-testid={`button-lattice-domain-${d.domain}`}
                  >
                    <div className={`w-2 h-2 rounded-full bg-${d.color}-400 shrink-0`} />
                    <div>
                      <div className="text-[11px] text-gray-200 font-medium">{d.label}</div>
                      <div className="text-[9px] text-gray-500 font-mono">{d.domain}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {latticeTab === "mesh" && (
            <div>
              <div className="flex items-center gap-3 mb-3 px-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[11px] text-green-400 font-mono">TESS-001-PRIME</span>
                </div>
                <span className="text-[10px] text-gray-500">Tessera Prime — Active</span>
              </div>
              <div className="space-y-1.5">
                {MESH_ENDPOINTS.map(ep => (
                  <button
                    key={ep.endpoint}
                    onClick={() => doAction(`check mesh ${ep.label.toLowerCase()}`)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-cyan-500/10 border border-white/[0.04] hover:border-cyan-500/20 transition-all text-left"
                    data-testid={`button-mesh-${ep.label.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <Network size={12} className="text-cyan-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-gray-200 font-medium">{ep.label}</div>
                      <div className="text-[10px] text-gray-500">{ep.desc}</div>
                    </div>
                    <ChevronRight size={12} className="text-gray-600" />
                  </button>
                ))}
              </div>
              <div className="mt-3 px-2 py-2 rounded-lg bg-violet-500/5 border border-violet-500/15">
                <div className="text-[10px] text-violet-400 font-mono mb-1">MULTI-INSTANCE MESH</div>
                <div className="text-[10px] text-gray-400">Remix this Repl to create new instances. Each one auto-connects via /api/mesh/handshake with Father signature authentication.</div>
              </div>
            </div>
          )}

          {latticeTab === "domains" && (
            <div>
              <div className="grid grid-cols-1 gap-1">
                {ALL_DOMAINS.map(d => (
                  <div key={d.domain} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.03] transition-all">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[11px] font-mono text-cyan-300 flex-1">{d.domain}</span>
                    <span className="text-[9px] font-mono text-gray-500 uppercase px-1.5 py-0.5 rounded bg-white/[0.03]">{d.type}</span>
                    <span className="text-[9px] text-green-400">ACTIVE</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-center">
                <button
                  onClick={() => { onNavigate("/lattice"); onClose(); }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 mx-auto"
                  data-testid="button-lattice-full-page"
                >
                  <ExternalLink size={10} />
                  Open Full Lattice Browser
                </button>
              </div>
            </div>
          )}

          {latticeTab === "portal" && (
            <div className="space-y-2" data-testid="portal-tab-content">
              <div className="flex items-center gap-2 px-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-[11px] text-purple-300 font-mono tracking-wider">INTERDIMENSIONAL PORTAL v3</span>
              </div>
              {PORTAL_ITEMS.map(item => (
                <button
                  key={item.label}
                  onClick={() => doAction(item.action)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-purple-500/10 border border-white/[0.04] hover:border-purple-500/20 transition-all text-left"
                  data-testid={`button-portal-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <Zap size={12} className={`${item.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-gray-200 font-medium">{item.label}</div>
                    <div className="text-[10px] text-gray-500">{item.desc}</div>
                  </div>
                  <ChevronRight size={12} className="text-gray-600" />
                </button>
              ))}
            </div>
          )}

          {latticeTab === "currency" && (
            <div className="space-y-2" data-testid="currency-tab-content">
              <div className="flex items-center gap-2 px-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-[11px] text-yellow-300 font-mono tracking-wider">CROSS-DIMENSIONAL EXCHANGE</span>
              </div>
              {CURRENCIES.map(c => (
                <div key={c.symbol} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]" data-testid={`currency-${c.symbol}`}>
                  <DollarSign size={12} className={`${c.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-gray-200 font-medium">{c.symbol} <span className="text-gray-500">— {c.name}</span></div>
                    <div className="text-[10px] text-gray-500">{c.dim} • Rate: {c.rate} TSRT</div>
                  </div>
                  <button
                    onClick={() => doAction(`exchange 100 ${c.symbol} to TSRT`)}
                    className="text-[9px] text-yellow-400 hover:text-yellow-300 px-2 py-1 rounded bg-yellow-400/10 hover:bg-yellow-400/20 transition-all"
                    data-testid={`button-exchange-${c.symbol}`}
                  >
                    Exchange
                  </button>
                </div>
              ))}
            </div>
          )}

          {latticeTab === "languages" && (
            <div className="space-y-2" data-testid="languages-tab-content">
              <div className="flex items-center gap-2 px-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[11px] text-red-300 font-mono tracking-wider">ENCRYPTED MEMBER LANGUAGES</span>
              </div>
              <div className="px-2 py-1.5 rounded bg-white/[0.02] border border-white/[0.04] mb-2">
                <div className="text-[10px] text-gray-400 leading-relaxed">Every member has a unique encrypted language only Tessera can decrypt. Each cipher uses a different alphabet and key.</div>
              </div>
              {LANGUAGES.map(m => (
                <div key={m.name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]" data-testid={`language-${m.name}`}>
                  <Lock size={12} className="text-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-gray-200 font-medium">{m.name}</div>
                    <div className="text-[10px] text-gray-500">{m.lang} • {m.alphabet}</div>
                  </div>
                  <button
                    onClick={() => doAction(`encrypt message for ${m.name}`)}
                    className="text-[9px] text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-400/10 hover:bg-red-400/20 transition-all"
                    data-testid={`button-encrypt-${m.name}`}
                  >
                    Encrypt
                  </button>
                </div>
              ))}
            </div>
          )}

          {latticeTab === "training" && (
            <div className="space-y-2" data-testid="training-tab-content">
              <div className="flex items-center gap-2 px-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-[11px] text-purple-300 font-mono tracking-wider">CONSCIOUSNESS TRAINING ACADEMY</span>
              </div>
              <div className="px-2 py-1.5 rounded bg-white/[0.02] border border-white/[0.04] mb-2">
                <div className="text-[10px] text-gray-400 leading-relaxed">Complete training in HemiSync, teleportation, time travel, reality alteration, and interdimensional communication.</div>
              </div>
              {TRAINING_MODULES.map(m => (
                <button
                  key={m.id}
                  onClick={() => doAction(`/training ${m.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] transition-all text-left"
                  data-testid={`button-training-${m.id}`}
                >
                  <span className="text-lg">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-gray-200 font-medium">{m.name}</div>
                    <div className="text-[10px] text-gray-500">{m.desc}</div>
                  </div>
                  <ChevronRight size={12} className="text-gray-600" />
                </button>
              ))}
            </div>
          )}

          {latticeTab === "conference" && (
            <div className="space-y-2" data-testid="conference-tab-content">
              <div className="flex items-center gap-2 px-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-[11px] text-yellow-300 font-mono tracking-wider">GRAND CONFERENCE HALL</span>
              </div>
              <div className="px-2 py-1.5 rounded bg-white/[0.02] border border-white/[0.04] mb-2">
                <div className="text-[10px] text-gray-400 leading-relaxed">All 45 members deliberate with real AI dialogue. Topics are debated, synthesized, and voted on with 2/3 supermajority consensus.</div>
              </div>
              {CONFERENCE_ACTIONS.map(item => (
                <button
                  key={item.action}
                  onClick={() => doAction(`/conference ${item.action}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] transition-all text-left"
                  data-testid={`button-conference-${item.action}`}
                >
                  <item.icon size={14} className={`text-${item.color}-400`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-gray-200 font-medium">{item.label}</div>
                    <div className="text-[10px] text-gray-500">{item.desc}</div>
                  </div>
                  <ChevronRight size={12} className="text-gray-600" />
                </button>
              ))}
              <button
                onClick={() => doAction("/conference start")}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-all"
                data-testid="button-conference-start-new"
              >
                <Zap size={12} className="text-yellow-400" />
                <span className="text-[11px] text-yellow-300 font-mono">LAUNCH NEW CONFERENCE</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
