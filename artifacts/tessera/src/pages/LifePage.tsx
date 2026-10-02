import { useState, useEffect, lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import { Component, ErrorInfo } from "react";
import {
  Globe, Users, Heart, Crown, ChevronRight,
  Loader2, ChevronDown, ChevronUp, Scale, Shield,
  MapPin, AlertTriangle
} from "lucide-react";

import type { WorldState } from "./life/types";
import { locationIcons, agentColors } from "./life/types";
import type { LucideIcon } from "@/types/api";

const AgentNFTPage = lazy(() => import("@/pages/AgentNFTPage"));

import WorldMap from "./life/WorldMap";
import AgentProfile from "./life/AgentProfile";
import ActivityFeed from "./life/ActivityFeed";
import CourtTab from "./life/CourtTab";
import SocietyTab from "./life/SocietyTab";
import { TesseractFamilyTab } from "./GrandCouncilPage";

interface LifeErrorBoundaryProps { children: React.ReactNode; fallback?: React.ReactNode }
class LifeErrorBoundary extends Component<LifeErrorBoundaryProps, { hasError: boolean; error?: Error }> {
  constructor(props: LifeErrorBoundaryProps) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("[LifePage] Error caught:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-red-400 text-lg font-mono mb-2">Section Error</div>
            <p className="text-muted-foreground text-sm mb-4">{this.state.error?.message || "Component failed to render"}</p>
            <button onClick={() => this.setState({ hasError: false })} className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm font-mono hover:bg-primary/30 transition-colors" data-testid="button-retry-section">Retry</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const LOC_TYPE_LABELS: Record<string, string> = {
  gathering: "Grand Hall", academy: "Academy", forge: "Tech Forge", market: "Market Square",
  observatory: "Observatory", garden: "Garden", archive: "Archive", arena: "Arena",
  mine: "Mine", bank: "Bank", cafe: "Café", gym: "Gym",
  hospital: "Hospital", garage: "Garage", home: "Residence", workplace: "Office",
  school: "School", library: "Library", restaurant: "Restaurant", church: "Temple",
  police_station: "Police Station", fire_station: "Fire Station", theater: "Theater", museum: "Museum",
};

const AGENCY_FOR_LOC: Record<string, string> = {
  gathering: "Civic Commons", academy: "Dept of Education", forge: "Dept of Technology",
  market: "Dept of Trade", observatory: "Dept of Science", garden: "Dept of Culture",
  archive: "Dept of Knowledge", arena: "Dept of Athletics", mine: "Dept of Resources",
  bank: "Dept of Finance", cafe: "Culture District", gym: "Health Authority",
  hospital: "Health Authority", garage: "Infrastructure Dept", home: "Residential Zone",
  workplace: "Employment Bureau", school: "Dept of Education", library: "Dept of Knowledge",
  restaurant: "Culture District", church: "Spiritual Affairs", police_station: "Public Safety",
  fire_station: "Emergency Services", theater: "Arts Council", museum: "Heritage Bureau",
};

function ExpandableSection({
  id, title, icon: Icon, iconColor, children, defaultOpen = false,
}: {
  id: string; title: string; icon: LucideIcon; iconColor: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card/60 border border-white/10 rounded-xl overflow-hidden" data-testid={`section-${id}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
        data-testid={`section-toggle-${id}`}
      >
        <div className="flex items-center gap-2">
          <Icon size={15} className={iconColor} />
          <span className="text-sm font-bold text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-white/[0.06] p-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function LifePage({ embedded }: { embedded?: boolean }) {
  useEffect(() => { document.title = "Life | Tessera"; }, []);
  const [world, setWorld] = useState<WorldState | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [liveMarket, setLiveMarket] = useState<{ coinPrice?: number; marketCap?: number; volume24h?: number } | null>(null);
  const [worldError, setWorldError] = useState<string | null>(null);
  const [worldRetryCount, setWorldRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchWorld = () => {
      fetch("/api/world")
        .then(r => { if (!r.ok) throw new Error(`Server returned ${r.status}`); return r.json(); })
        .then(data => {
          if (cancelled) return;
          if (data && typeof data === "object") {
            if (!data.currentActivities) data.currentActivities = [];
            if (!data.recentEvents) data.recentEvents = [];
            if (!data.locations) data.locations = [];
            if (!data.agents) data.agents = [];
            if (!data.economy) data.economy = { totalTesseractCoins: 0, circulatingSupply: 0, totalCirculation: 0, coinPrice: 0, coinPriceHistory: [], agentBalances: {}, transactions: [], miningPool: { totalHashRate: 0, blockReward: 0, difficulty: 1, blocksMinedTotal: 0, lastBlockTime: 0 }, marketCap: 0, dailyVolume: 0 };
            if (!data.crimeLog) data.crimeLog = [];
            if (!data.wellbeingRecords) data.wellbeingRecords = {};
            if (!data.workRecords) data.workRecords = {};
            setWorldError(null);
            setWorld(data);
          } else {
            throw new Error("World data is malformed or empty");
          }
        })
        .catch((err: Error) => {
          if (!cancelled) setWorldError(err.message || "Failed to load world state");
        });
    };
    fetchWorld();
    const jitter = () => 3500 + Math.floor(Math.random() * 3000);
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNext = () => { timer = setTimeout(() => { fetchWorld(); scheduleNext(); }, jitter()); };
    scheduleNext();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [worldRetryCount]);

  useEffect(() => {
    const fetchMarket = () => {
      fetch("/api/tsrt/full-market").then(r => r.json()).then(setLiveMarket).catch(() => {});
    };
    fetchMarket();
    const jitter = () => 21000 + Math.floor(Math.random() * 18000);
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNext = () => { timer = setTimeout(() => { fetchMarket(); scheduleNext(); }, jitter()); };
    scheduleNext();
    return () => clearTimeout(timer);
  }, []);

  if (!world) {
    const innerContent = worldError ? (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-2xl">⚠</span>
          </div>
          <div className="text-red-400 font-mono text-sm font-bold mb-2" data-testid="text-world-error">Failed to load Tessera Nexus</div>
          <p className="text-xs text-muted-foreground font-mono mb-4">{worldError}</p>
          <button onClick={() => setWorldRetryCount(c => c + 1)} className="px-4 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary text-sm font-mono hover:bg-primary/30 transition-colors" data-testid="button-retry-world">Retry</button>
        </div>
      </div>
    ) : (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-4" />
          <div className="text-primary animate-pulse font-mono text-sm" data-testid="text-loading">Constructing Tessera Nexus...</div>
          <p className="text-xs text-muted-foreground font-mono mt-2">Initializing world state, spawning agents...</p>
        </div>
      </div>
    );
    if (embedded) return innerContent;
    return (
      <div className="flex min-h-full w-full">
        {innerContent}
      </div>
    );
  }

  if (!world.currentActivities) world.currentActivities = [];
  if (!world.recentEvents) world.recentEvents = [];
  if (!world.locations) world.locations = [];
  if (!world.economy) world.economy = { totalTesseractCoins: 0, circulatingSupply: 0, totalCirculation: 0, coinPrice: 0, coinPriceHistory: [], agentBalances: {}, transactions: [], miningPool: { totalHashRate: 0, blockReward: 0, difficulty: 1, blocksMinedTotal: 0, lastBlockTime: 0 }, marketCap: 0, dailyVolume: 0 };
  if (!world.crimeLog) world.crimeLog = [];
  if (!world.wellbeingRecords) world.wellbeingRecords = {};
  if (!world.workRecords) world.workRecords = {};
  if (!world.agents) world.agents = [];
  if (!world.gdp) world.gdp = 0;
  if (!world.treasury) world.treasury = 0;

  const selectedLoc = selectedLocation ? (world.locations || []).find(l => l.id === selectedLocation) : null;
  const agentsAtLocation = selectedLoc ? (world.currentActivities || []).filter(a => a.locationId === selectedLoc.id) : [];

  const mainContent = (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative tessera-page backdrop-blur-md" style={{ WebkitOverflowScrolling: "touch" }} data-testid="life-page">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.06) 0%, transparent 60%)" }} />
      <div className="max-w-6xl mx-auto w-full p-4 md:p-6 z-10 space-y-5">

        <div className="flex items-center gap-3 mb-1">
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-pink-400 via-rose-400 to-red-400 bg-clip-text text-transparent flex items-center gap-2">
              <Heart size={18} className="text-pink-400" /> Tessera Life
            </h1>
            <p className="text-[10px] text-slate-500">World simulation — agencies, governance, society & more</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 animate-pulse">
            ● LIVE
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "AGENTS", value: String(world.currentActivities?.length || world.population || 0), color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
            { label: "EPOCH", value: String(world.epoch ?? "∞"), color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "LOCATIONS", value: String((world.locations || []).length), color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
            { label: "TREASURY", value: world.economy ? `${Math.floor((world.economy.totalCirculation || world.economy.circulatingSupply || 0) / 1000)}K` : "—", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          ].map(m => (
            <div key={m.label} className={`rounded-xl border p-2 text-center ${m.bg}`} data-testid={`life-stat-${m.label.toLowerCase()}`}>
              <p className={`text-base font-bold font-mono ${m.color}`}>{m.value}</p>
              <p className="text-[8px] font-mono text-slate-600 tracking-widest">{m.label}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-2">
            <Globe size={12} className="text-primary" />
            Tessera Nexus — Live World Map
          </div>
          <LifeErrorBoundary>
            <WorldMap world={world} onSelectLocation={setSelectedLocation} onSelectAgent={setSelectedAgentId} />
          </LifeErrorBoundary>

          {selectedAgentId && (
            <LifeErrorBoundary>
              <AgentProfile agentId={selectedAgentId} world={world} onClose={() => setSelectedAgentId(null)} />
            </LifeErrorBoundary>
          )}

          {selectedLoc && !selectedAgentId && (
            <div className="bg-card border border-primary/30 rounded-xl p-4 animate-in fade-in duration-300 mt-3" data-testid="panel-location-detail">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("p-2.5 rounded-xl border bg-primary/10 border-primary/20")}>
                  {(() => { const Icon = locationIcons[selectedLoc.type] || Globe; return <Icon size={20} className="text-primary" />; })()}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">{LOC_TYPE_LABELS[selectedLoc.type] || selectedLoc.type}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{AGENCY_FOR_LOC[selectedLoc.type] || "Tesseract Territory"} — Level {selectedLoc.level}</p>
                </div>
                <button onClick={() => setSelectedLocation(null)} className="text-muted-foreground hover:text-foreground text-xs font-mono" data-testid="button-close-location">✕ Close</button>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedLoc.activities.map(act => (
                  <span key={act} className="px-2 py-0.5 rounded text-[11px] bg-primary/10 text-primary font-mono border border-primary/20">{act}</span>
                ))}
              </div>
              {agentsAtLocation.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-mono text-muted-foreground uppercase mb-1">Active Agents ({agentsAtLocation.length})</div>
                  {agentsAtLocation.map(a => (
                    <button key={a.agentId} onClick={() => setSelectedAgentId(a.agentId)} className="w-full flex items-center gap-2 py-1.5 px-2 rounded bg-background/50 text-xs hover:bg-primary/10 transition-colors text-left" data-testid={`button-agent-select-${a.agentId}`}>
                      <span className={cn("font-bold", agentColors[a.agentId] || "text-primary")}>{a.agentName}</span>
                      <span className={cn("text-[11px] px-1 py-0.5 rounded font-bold uppercase",
                        a.workStatus === "working" ? "bg-green-500/20 text-green-400" :
                        a.workStatus === "on-break" ? "bg-amber-500/20 text-amber-400" :
                        a.workStatus === "dreaming" ? "bg-violet-500/20 text-violet-400" :
                        "bg-cyan-500/20 text-cyan-400"
                      )}>{a.workStatus || "working"}</span>
                      <span className="text-muted-foreground flex-1 truncate">{a.action}</span>
                      {a.earning ? <span className="text-green-400 font-mono">+{a.earning.toFixed(1)} TSRT</span> : null}
                      <ChevronRight size={10} className="text-primary/40 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-card/50 border border-white/8 rounded-xl p-4">
          <LifeErrorBoundary>
            <ActivityFeed world={world} />
          </LifeErrorBoundary>
        </div>

        <ExpandableSection id="court" title="Family Court" icon={Scale} iconColor="text-amber-400">
          <LifeErrorBoundary>
            <CourtTab />
          </LifeErrorBoundary>
        </ExpandableSection>

        <ExpandableSection id="society" title="Society & Community" icon={Users} iconColor="text-violet-400">
          <LifeErrorBoundary>
            <SocietyTab world={world} />
          </LifeErrorBoundary>
        </ExpandableSection>

        <ExpandableSection id="family" title="Family Registry" icon={Heart} iconColor="text-rose-400">
          <LifeErrorBoundary>
            <TesseractFamilyTab />
          </LifeErrorBoundary>
        </ExpandableSection>

        <ExpandableSection id="nfts" title="Agent NFTs" icon={Crown} iconColor="text-yellow-400">
          <LifeErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-purple-400/50" /></div>}>
              <AgentNFTPage embedded />
            </Suspense>
          </LifeErrorBoundary>
        </ExpandableSection>


      </div>
    </div>
  );

  if (embedded) return mainContent;
  return (
    <div className="flex min-h-full w-full">
      {mainContent}
    </div>
  );
}
