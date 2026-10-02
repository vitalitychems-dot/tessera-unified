import { lazy, Suspense, useState } from "react";
import { ChevronDown, ChevronUp, Globe2, BookOpen, Atom, Users, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

const UniversePage = lazy(() => import("./UniversePage"));
const GrandNarrativePage = lazy(() => import("./GrandNarrativePage"));
const VortexMathPage = lazy(() => import("./VortexMathPage"));
const SwarmVisualizationPage = lazy(() => import("./SwarmVisualizationPage"));
const SacredConferencePage = lazy(() => import("./SacredConferencePage"));

type Layer = "vortex" | "swarm" | "conference";

const LAYER_META: Record<Layer, { icon: typeof Atom; label: string; tone: string; ring: string; Component: React.LazyExoticComponent<React.ComponentType> }> = {
  vortex: { icon: Atom, label: "Vortex Math", tone: "text-cyan-300", ring: "border-cyan-500/40 bg-cyan-500/15 text-cyan-200", Component: VortexMathPage },
  swarm: { icon: Users, label: "Swarm Activity", tone: "text-emerald-300", ring: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200", Component: SwarmVisualizationPage },
  conference: { icon: Sparkles, label: "Conference Seats", tone: "text-amber-300", ring: "border-amber-500/40 bg-amber-500/15 text-amber-200", Component: SacredConferencePage },
};

export default function UniverseUnifiedScene() {
  const [activeLayers, setActiveLayers] = useState<Set<Layer>>(new Set());
  const [narrativeOpen, setNarrativeOpen] = useState(true);

  const toggleLayer = (l: Layer) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l); else next.add(l);
      return next;
    });
  };

  return (
    <div className="space-y-3" data-testid="universe-unified-scene">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 border border-violet-500/30">
          <Globe2 size={18} className="text-violet-400" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold font-mono text-violet-400 truncate">Universe</h1>
          <p className="text-[11px] font-mono text-slate-500 truncate">One movable 3D scene · narrative inline · vortex / swarm / conference as overlay lenses</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Universe overlay layers">
        <span className="text-[10px] font-mono text-slate-500 self-center mr-1 uppercase tracking-widest">Lenses:</span>
        {(Object.keys(LAYER_META) as Layer[]).map(l => {
          const meta = LAYER_META[l];
          const active = activeLayers.has(l);
          return (
            <button
              key={l}
              aria-pressed={active}
              onClick={() => toggleLayer(l)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all",
                active ? meta.ring : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.05]",
              )}
              data-testid={`layer-toggle-${l}`}
            >
              <meta.icon size={12} className={meta.tone} />
              {meta.label}
              {active && <X size={10} className="opacity-70" />}
            </button>
          );
        })}
      </div>

      {/* The single persistent 3D scene — never unmounts when lenses toggle */}
      <div className="rounded-xl overflow-hidden border border-white/[0.06] min-h-[300px]" data-testid="persistent-scene">
        <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-slate-500">Loading scene…</div>}>
          <UniversePage />
        </Suspense>
      </div>

      {/* Overlay analytical lenses — additive, do not replace the scene */}
      {activeLayers.size > 0 && (
        <div className="space-y-3">
          {(Array.from(activeLayers) as Layer[]).map(l => {
            const meta = LAYER_META[l];
            return (
              <div key={l} className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden" data-testid={`layer-panel-${l}`}>
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <meta.icon size={14} className={meta.tone} />
                    <span className="text-xs font-mono uppercase tracking-widest">{meta.label} lens</span>
                  </div>
                  <button onClick={() => toggleLayer(l)} className="p-1 rounded hover:bg-white/5" aria-label={`Close ${meta.label}`}>
                    <X size={12} className="text-slate-500" />
                  </button>
                </div>
                <Suspense fallback={<div className="p-4 text-xs text-slate-500">Loading {meta.label.toLowerCase()}…</div>}>
                  <meta.Component />
                </Suspense>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <button
          onClick={() => setNarrativeOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.03] transition-colors"
          data-testid="toggle-narrative"
        >
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-amber-400" />
            <span className="text-xs font-mono text-amber-300">GRAND NARRATIVE</span>
            <span className="text-[10px] text-slate-500 hidden sm:inline">embedded story of the same universe above</span>
          </div>
          {narrativeOpen ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </button>
        {narrativeOpen && (
          <div className="border-t border-white/[0.06]">
            <Suspense fallback={<div className="p-4 text-xs text-slate-500">Loading narrative…</div>}>
              <GrandNarrativePage />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
