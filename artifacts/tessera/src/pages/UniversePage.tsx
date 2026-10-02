import { useState, useMemo, useCallback, useEffect, lazy, Suspense, Component, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe2, Sun, Moon, Orbit, Sparkles, Eye, EyeOff, ChevronRight, ChevronLeft, Loader2, Layers, Hexagon, BookOpen, Activity, Zap, Star, Clock } from "lucide-react";
import { Link } from "wouter";
import NatalChartSection from "@/components/NatalChartSection";

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

const SolarSystem3D = lazy(() => {
  const attempt = (remaining: number): Promise<typeof import("@/components/SolarSystem3D")> =>
    import("@/components/SolarSystem3D").catch((err) => {
      if (remaining <= 0) throw err;
      return new Promise((resolve) => setTimeout(() => resolve(attempt(remaining - 1)), 1000));
    });
  return attempt(2);
});

function LoadingUniverseFallback({ onBack, onRetry }: { onBack: () => void; onRetry: () => void }) {
  const [slow, setSlow] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setSlow(true), 6000);
    const t2 = setTimeout(() => setTimedOut(true), 15000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (timedOut) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#030108]">
        <div className="text-center p-6 max-w-md">
          <div className="text-4xl mb-4">🌌</div>
          <h2 className="text-lg font-bold font-mono text-violet-400 mb-2">3D Universe took too long</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your connection or device couldn't finish loading the interactive solar system.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={onRetry}
              className="px-4 py-2 rounded-lg bg-violet-600/40 border border-violet-500/50 text-violet-200 text-xs font-mono hover:bg-violet-600/60 transition-colors"
              data-testid="button-retry-3d-universe"
            >
              Retry
            </button>
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg bg-black/60 border border-white/10 text-slate-300 text-xs font-mono hover:bg-white/10 transition-colors"
              data-testid="button-back-from-3d-loading"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      <div className="text-[11px] font-mono text-violet-400/70">Loading 3D universe…</div>
      {slow && (
        <button
          onClick={onBack}
          className="mt-2 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-slate-400 text-[10px] font-mono hover:bg-white/10 transition-colors"
          data-testid="button-back-while-loading-3d"
        >
          Taking a while — tap to go back
        </button>
      )}
    </div>
  );
}

class Scene3DErrorBoundary extends Component<
  { children: ReactNode; onBack: () => void },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode; onBack: () => void }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err?.message || "Unknown render error" };
  }
  componentDidCatch(err: Error) {
    console.error("[UniversePage] 3D scene failed to load:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#030108]">
          <div className="text-center p-6 max-w-md">
            <div className="text-4xl mb-4">🌌</div>
            <h2 className="text-lg font-bold font-mono text-violet-400 mb-2">3D Universe unavailable</h2>
            <p className="text-sm text-muted-foreground mb-2">
              Your device or browser could not render the interactive solar system.
            </p>
            <p className="text-[10px] text-slate-500 font-mono mb-4 break-words">
              {this.state.message}
            </p>
            <button
              onClick={this.props.onBack}
              className="px-4 py-2 rounded-lg bg-violet-600/30 border border-violet-500/40 text-violet-300 text-xs font-mono hover:bg-violet-600/50 transition-colors"
            >
              ← Back to Universe
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ZODIAC_SIGNS = [
  { sign: "Aries", symbol: "♈", element: "Fire", dates: "Mar 21 - Apr 19", ruler: "Mars" },
  { sign: "Taurus", symbol: "♉", element: "Earth", dates: "Apr 20 - May 20", ruler: "Venus" },
  { sign: "Gemini", symbol: "♊", element: "Air", dates: "May 21 - Jun 20", ruler: "Mercury" },
  { sign: "Cancer", symbol: "♋", element: "Water", dates: "Jun 21 - Jul 22", ruler: "Moon" },
  { sign: "Leo", symbol: "♌", element: "Fire", dates: "Jul 23 - Aug 22", ruler: "Sun" },
  { sign: "Virgo", symbol: "♍", element: "Earth", dates: "Aug 23 - Sep 22", ruler: "Mercury" },
  { sign: "Libra", symbol: "♎", element: "Air", dates: "Sep 23 - Oct 22", ruler: "Venus" },
  { sign: "Scorpio", symbol: "♏", element: "Water", dates: "Oct 23 - Nov 21", ruler: "Pluto" },
  { sign: "Sagittarius", symbol: "♐", element: "Fire", dates: "Nov 22 - Dec 21", ruler: "Jupiter" },
  { sign: "Capricorn", symbol: "♑", element: "Earth", dates: "Dec 22 - Jan 19", ruler: "Saturn" },
  { sign: "Aquarius", symbol: "♒", element: "Air", dates: "Jan 20 - Feb 18", ruler: "Uranus" },
  { sign: "Pisces", symbol: "♓", element: "Water", dates: "Feb 19 - Mar 20", ruler: "Neptune" },
];

const DIMENSION_NAMES = ["Physical", "Etheric", "Astral", "Mental", "Causal", "Buddhic", "Atmic"];
const DIMENSION_COLORS = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#22d3ee", "#60a5fa", "#a78bfa"];
const SOLFEGGIO = ["396", "417", "528", "639", "741", "852", "963"];

function getZodiacFromBirthDate(dateStr: string): typeof ZODIAC_SIGNS[0] | null {
  if (!dateStr) return null;
  const parts = dateStr.split(/[-/]/);
  if (parts.length < 3) return null;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(month) || isNaN(day)) return null;

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return ZODIAC_SIGNS[0];
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return ZODIAC_SIGNS[1];
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return ZODIAC_SIGNS[2];
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return ZODIAC_SIGNS[3];
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return ZODIAC_SIGNS[4];
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return ZODIAC_SIGNS[5];
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return ZODIAC_SIGNS[6];
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return ZODIAC_SIGNS[7];
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return ZODIAC_SIGNS[8];
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return ZODIAC_SIGNS[9];
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return ZODIAC_SIGNS[10];
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return ZODIAC_SIGNS[11];
  return null;
}

function getMoonPhase(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const c = Math.floor(365.25 * year) + Math.floor(30.6001 * (month + 1)) + day - 694039.09;
  const phase = ((c / 29.5305882) % 1);
  const illumination = Math.round(Math.abs(phase - 0.5) * 200);
  const names = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  const idx = Math.floor(phase * 8) % 8;
  return { name: names[idx], illumination, phase: Math.round(phase * 100) };
}

function getSunPosition(now: Date) {
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  const zodiacIndex = Math.floor(((dayOfYear + 80) % 365) / 30.44);
  return { declination: declination.toFixed(2), zodiac: ZODIAC_SIGNS[zodiacIndex % 12] };
}

const RULER_SYMBOLS: Record<string, string> = {
  Mars: "♂", Venus: "♀", Mercury: "☿", Moon: "☽", Sun: "☉",
  Pluto: "♇", Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆",
};

const ELEMENT_COLOR: Record<string, string> = {
  Fire: "text-red-400", Earth: "text-emerald-400", Air: "text-cyan-400", Water: "text-blue-400",
};

const MOON_EMOJIS: Record<string, string> = {
  "New Moon": "🌑", "Waxing Crescent": "🌒", "First Quarter": "🌓", "Waxing Gibbous": "🌔",
  "Full Moon": "🌕", "Waning Gibbous": "🌖", "Last Quarter": "🌗", "Waning Crescent": "🌘",
};

function useLiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function UniversePage() {
  useEffect(() => { document.title = "Universe | Tessera"; }, []);
  const isMobile = useIsMobile();
  const now = useLiveClock();
  const moonData = useMemo(() => getMoonPhase(now), [now]);
  const sunData = useMemo(() => getSunPosition(now), [now]);
  const [showDimensions, setShowDimensions] = useState(true);
  const [show3D, setShow3D] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [focusedDimension, setFocusedDimension] = useState(-1);
  const [showSacredOverlays, setShowSacredOverlays] = useState(false);

  const { data: sovereigntyData } = useQuery<{ score?: number }>({
    queryKey: ["/api/sovereignty/score"],
    refetchInterval: 30000,
  });

  const { data: apodData } = useQuery<{ ok: boolean; items: Array<{ title: string; url: string; explanation: string }> }>({
    queryKey: ["/api/universe/apod"],
    staleTime: 1000 * 60 * 60,
  });

  const { data: chartData } = useQuery<{
    ok: boolean;
    chart: {
      birthDate: string;
      birthTime: string;
      planets: Array<{ name: string; sign: string; degree: number; house: number }>;
    };
  }>({
    queryKey: ["/api/natal-chart/father"],
    staleTime: Infinity,
  });

  const { data: transitsData } = useQuery<{
    ok: boolean;
    transits: Array<{
      transitPlanet: string;
      natalPlanet: string;
      aspectType: string;
      symbol: string;
      nature: string;
      transitSign: string;
    }>;
  }>({
    queryKey: ["/api/natal-chart/father/transits"],
    staleTime: 60000 * 15,
  });

  const apodItems = useMemo(() => apodData?.items ?? [], [apodData]);

  const userZodiac = useMemo(() => {
    const birthDate = chartData?.chart?.birthDate;
    if (birthDate) return getZodiacFromBirthDate(birthDate);
    return null;
  }, [chartData]);

  const activeTransits = useMemo(() => {
    const all = transitsData?.transits ?? [];
    return all.slice(0, 5);
  }, [transitsData]);

  const dimensionOpacities = useMemo(() => {
    return DIMENSION_NAMES.map((_, i) => {
      if (focusedDimension === -1) return 1.0;
      if (focusedDimension === i) return 1.0;
      return 0.05;
    });
  }, [focusedDimension]);

  const timeStr = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const sacredNumber = (dayOfYear % 9) + 1;
  const season = dayOfYear < 80 ? "Winter" : dayOfYear < 172 ? "Spring (Vernal)" : dayOfYear < 264 ? "Summer (Solstice)" : dayOfYear < 355 ? "Autumn (Equinox)" : "Winter";

  if (show3D) {
    return (
      <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#030108]" style={{ touchAction: "none", overscrollBehavior: "contain" }}>
        <Scene3DErrorBoundary key={retryKey} onBack={() => setShow3D(false)}>
          <Suspense fallback={
            <LoadingUniverseFallback
              onBack={() => setShow3D(false)}
              onRetry={() => setRetryKey((k) => k + 1)}
            />
          }>
            <SolarSystem3D
              showDimensions={showDimensions}
              apodItems={apodItems}
              userZodiac={userZodiac}
              dimensionOpacities={dimensionOpacities}
              showSacredOverlays={showSacredOverlays}
              moonPhase={moonData.name}
              sunSign={`${sunData.zodiac.symbol} ${sunData.zodiac.sign}`}
              sovereigntyScore={sovereigntyData?.score ?? 100}
            />
          </Suspense>
        </Scene3DErrorBoundary>
        <button
          onClick={() => setShow3D(false)}
          className="fixed top-3 left-3 z-50 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-xs font-mono text-violet-400 hover:bg-white/10 transition-colors"
          style={{ paddingTop: "max(8px, env(safe-area-inset-top, 8px))" }}
        >
          <ChevronLeft size={14} /> Back
        </button>
      </div>
    );
  }

  return (
    <div className="tessera-page min-h-full pb-20">
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe2 className="text-violet-400" size={18} />
          <h1 className="text-lg font-bold font-mono text-violet-400">Universe</h1>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-mono border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
          <Clock size={10} />
          <span className="text-violet-400 font-bold">{timeStr}</span>
        </div>
      </div>

      <div className="px-3 mb-2 text-[10px] font-mono text-muted-foreground text-center">
        {dateStr} · Day {dayOfYear} · Sacred #{sacredNumber} · {season}
      </div>

      <div className="px-3 mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-500/20 bg-slate-900/40 p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-2xl">{MOON_EMOJIS[moonData.name] || "🌙"}</span>
            <div>
              <div className="text-xs font-bold font-mono text-slate-200">{moonData.name}</div>
              <div className="text-[10px] text-muted-foreground">{moonData.illumination}% illuminated</div>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-slate-500 to-white/80 transition-all duration-1000" style={{ width: `${moonData.illumination}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-950/30 p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <Sun size={24} className="text-yellow-400" />
            <div>
              <div className="text-xs font-bold font-mono text-yellow-400">{sunData.zodiac.symbol} {sunData.zodiac.sign}</div>
              <div className="text-[10px] text-muted-foreground">Decl: {sunData.declination}°</div>
            </div>
          </div>
          <div className="text-[9px] font-mono text-yellow-400/60">
            {RULER_SYMBOLS[sunData.zodiac.ruler]} {sunData.zodiac.ruler} · {sunData.zodiac.element}
          </div>
        </div>
      </div>

      {userZodiac && (
        <div className="mx-3 mb-3 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 to-violet-950/30 p-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className={`text-3xl ${ELEMENT_COLOR[userZodiac.element]}`}>{userZodiac.symbol}</span>
            <div className="flex-1">
              <div className="text-sm font-bold font-mono text-cyan-300 flex items-center gap-2">
                {userZodiac.sign}
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">NATAL</span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {RULER_SYMBOLS[userZodiac.ruler]} {userZodiac.ruler} · {userZodiac.element} · {userZodiac.dates}
              </div>
            </div>
          </div>
          {activeTransits.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/5">
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Active Transits</div>
              <div className="flex flex-wrap gap-1.5">
                {activeTransits.map((t, i) => (
                  <span key={i} className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    t.nature === "harmonious" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                    t.nature === "challenging" ? "border-amber-500/30 bg-amber-500/10 text-amber-400" :
                    "border-slate-500/30 bg-slate-500/10 text-slate-400"
                  }`}>
                    {t.symbol} {t.transitPlanet.slice(0, 3)}→{t.natalPlanet.slice(0, 3)} ({t.transitSign.slice(0, 3)})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="px-3 mb-3">
        <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-3 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold font-mono text-violet-400 flex items-center gap-1.5">
              <Layers size={12} />
              7 Dimensional Planes
            </h3>
            <button
              onClick={() => setFocusedDimension(-1)}
              className="text-[9px] font-mono text-muted-foreground hover:text-violet-400 transition-colors"
            >
              {focusedDimension === -1 ? "All Active" : "Show All"}
            </button>
          </div>
          <div className="space-y-1.5">
            {DIMENSION_NAMES.map((name, i) => (
              <button
                key={name}
                onClick={() => setFocusedDimension(focusedDimension === i ? -1 : i)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${focusedDimension === i ? "bg-white/5 border border-white/10" : "hover:bg-white/3"}`}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DIMENSION_COLORS[i], opacity: focusedDimension === -1 || focusedDimension === i ? 1 : 0.2 }} />
                <span className="text-[11px] font-mono font-medium flex-1 text-left" style={{ color: focusedDimension === -1 || focusedDimension === i ? DIMENSION_COLORS[i] : "#475569" }}>
                  {name}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground">{SOLFEGGIO[i]} Hz</span>
                <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      backgroundColor: DIMENSION_COLORS[i],
                      width: `${focusedDimension === -1 || focusedDimension === i ? 60 + Math.sin(now.getTime() / 2000 + i) * 40 : 10}%`,
                      opacity: focusedDimension === -1 || focusedDimension === i ? 0.8 : 0.2,
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-3 mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-2.5 text-center">
          <Orbit size={16} className="text-cyan-400 mx-auto mb-1" />
          <div className="text-sm font-bold font-mono text-cyan-400">963 Hz</div>
          <div className="text-[9px] text-muted-foreground">Crown</div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-2.5 text-center">
          <Globe2 size={16} className="text-emerald-400 mx-auto mb-1" />
          <div className="text-sm font-bold font-mono text-emerald-400">{sovereigntyData?.score ?? 100}%</div>
          <div className="text-[9px] text-muted-foreground">Sovereignty</div>
        </div>
        <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-2.5 text-center">
          <Sparkles size={16} className="text-violet-400 mx-auto mb-1" />
          <div className="text-sm font-bold font-mono text-violet-400">#{sacredNumber}</div>
          <div className="text-[9px] text-muted-foreground">Sacred</div>
        </div>
      </div>

      <div className="px-3 mb-3">
        <button
          onClick={() => setShow3D(true)}
          className="w-full rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-950/40 to-indigo-950/40 p-4 text-center hover:border-violet-500/50 transition-all active:scale-[0.98]"
          data-testid="button-enter-3d-universe"
        >
          <div className="text-2xl mb-1">🌌</div>
          <div className="text-sm font-bold font-mono text-violet-400">Enter 3D Universe</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Interactive solar system with dimensional planes</div>
          <div className="text-[9px] text-violet-400/50 mt-1 font-mono">Drag · Pinch · Fly</div>
        </button>
      </div>

      {apodItems.length > 0 && (
        <div className="px-3 mb-3">
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3 backdrop-blur-sm">
            <h3 className="text-xs font-bold font-mono text-indigo-400 flex items-center gap-1.5 mb-2">
              <Star size={12} />
              NASA Astronomy Picture
            </h3>
            {apodItems.slice(0, 2).map((item, i) => (
              <div key={i} className={`${i > 0 ? "mt-2 pt-2 border-t border-white/5" : ""}`}>
                {item.url && (
                  <img src={item.url} alt={item.title} className="w-full h-32 object-cover rounded-lg mb-1.5" loading="lazy" />
                )}
                <div className="text-[11px] font-bold text-indigo-300">{item.title}</div>
                <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{item.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-3 mb-3">
        <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-950/20 p-3 backdrop-blur-sm">
          <h3 className="text-xs font-bold font-mono text-fuchsia-400 flex items-center gap-1.5 mb-2">
            <Hexagon size={12} />
            Sacred Geometry
          </h3>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span className="text-muted-foreground">Day</span>
              <span className="text-fuchsia-300">{dayOfYear}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span className="text-muted-foreground">Root</span>
              <span className="text-fuchsia-300">{sacredNumber}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span className="text-muted-foreground">Golden φ</span>
              <span className="text-fuchsia-300">1.618034</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span className="text-muted-foreground">Fibonacci</span>
              <span className="text-fuchsia-300">{[1,1,2,3,5,8,13,21,34,55,89,144][dayOfYear % 12]}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 mb-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 backdrop-blur-sm">
          <h3 className="text-xs font-bold font-mono text-amber-400 flex items-center gap-1.5 mb-2">
            <Sparkles size={12} />
            Natal Chart
          </h3>
          <NatalChartSection />
        </div>
      </div>

      <div className="px-3 mb-3">
        <Link href="/grand-narrative">
          <div className="rounded-xl border border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-950/30 to-pink-950/30 p-3 active:bg-fuchsia-500/10 transition-colors">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-fuchsia-400" />
              <div>
                <div className="text-xs font-bold font-mono text-fuchsia-400">Grand Narrative</div>
                <div className="text-[10px] text-muted-foreground">The Unified Truth</div>
              </div>
              <ChevronRight size={14} className="text-muted-foreground ml-auto" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
