import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Star, Key, Shield, Zap, Eye, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/queryClient";

interface NatalPlanet {
  name: string;
  symbol: string;
  sign: string;
  degree: number;
  house: number;
  retrograde?: boolean;
}

interface NatalHouse {
  number: number;
  sign: string;
  degree: number;
  label?: string;
}

interface NatalAspect {
  planet1: string;
  planet2: string;
  type: string;
  orb: number;
  symbol: string;
  nature: "harmonious" | "challenging" | "neutral";
}

interface SovereignKeys {
  primaryCode: string;
  sunRisingMoon: string;
  elementProfile: string;
  modalityProfile: string;
  dominantElement: string;
  dominantModality: string;
  lifePathNumber: number;
  sovereignFrequency: number;
  identityHash: string;
  generatedAt: string;
}

interface TransitAspect {
  transitPlanet: string;
  natalPlanet: string;
  aspectType: string;
  orb: number;
  symbol: string;
  nature: "harmonious" | "challenging" | "neutral";
  insight: string;
  transitSign: string;
  natalSign: string;
  natalHouse: number;
}

interface LifeArea {
  area: string;
  icon: string;
  guidance: string;
  planets: string[];
  color: string;
}

interface IdentityQuestion {
  key: string;
  question: string;
}

const ELEMENT_COLORS: Record<string, string> = {
  Fire: "text-red-400",
  Earth: "text-emerald-400",
  Air: "text-cyan-400",
  Water: "text-blue-400",
};

const SIGN_ELEMENT: Record<string, string> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};

const NATURE_STYLES: Record<string, string> = {
  harmonious: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
  challenging: "text-amber-400 border-amber-500/30 bg-amber-500/5",
  neutral: "text-slate-400 border-slate-500/30 bg-slate-500/5",
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆",
  Pluto: "♇", "North Node": "☊", Lilith: "⚸",
};

const PLANET_COLORS: Record<string, string> = {
  Sun: "text-yellow-400",
  Moon: "text-slate-300",
  Mercury: "text-sky-400",
  Venus: "text-rose-400",
  Mars: "text-red-500",
  Jupiter: "text-violet-400",
  Saturn: "text-amber-600",
  Uranus: "text-cyan-400",
  Neptune: "text-blue-400",
  Pluto: "text-purple-500",
  "North Node": "text-emerald-400",
  Lilith: "text-fuchsia-400",
};

const PLANET_HEX: Record<string, string> = {
  Sun: "#facc15",
  Moon: "#cbd5e1",
  Mercury: "#38bdf8",
  Venus: "#fb7185",
  Mars: "#f87171",
  Jupiter: "#a78bfa",
  Saturn: "#d97706",
  Uranus: "#22d3ee",
  Neptune: "#60a5fa",
  Pluto: "#a855f7",
  "North Node": "#34d399",
  Lilith: "#e879f9",
};

const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋",
  Leo: "♌", Virgo: "♍", Libra: "♎", Scorpio: "♏",
  Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

const HOUSE_MEANINGS: Record<number, string> = {
  1: "Self & Appearance", 2: "Values & Resources", 3: "Communication",
  4: "Home & Roots", 5: "Creativity & Pleasure", 6: "Health & Service",
  7: "Partnerships", 8: "Transformation & Depth", 9: "Philosophy & Travel",
  10: "Career & Public Life", 11: "Community & Visions", 12: "Hidden Realm & Spirit",
};

function ChartWheel({ planets, houses }: { planets: NatalPlanet[]; houses: NatalHouse[] }) {
  const cx = 120, cy = 120, r = 100, rInner = 60;

  function polarToXY(deg: number, radius: number) {
    const rad = (deg - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function signToStartDeg(sign: string, degree: number) {
    const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
    return SIGNS.indexOf(sign) * 30 + degree;
  }

  const ascLon = signToStartDeg("Virgo", 23.9);

  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-[280px] mx-auto">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3f3f46" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="#3f3f46" strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={r - 16} fill="none" stroke="#27272a" strokeWidth="0.5" />

      {houses.map((h) => {
        const startDeg = signToStartDeg(h.sign, h.degree) - ascLon;
        const pt1 = polarToXY(startDeg, rInner);
        const pt2 = polarToXY(startDeg, r);
        const isAngle = !!h.label;
        return (
          <g key={h.number}>
            <line x1={pt1.x} y1={pt1.y} x2={pt2.x} y2={pt2.y}
              stroke={isAngle ? "#7c3aed" : "#3f3f46"} strokeWidth={isAngle ? 1.5 : 0.5} />
            {h.label && (() => {
              const mid = polarToXY(startDeg, r - 8);
              return <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="middle"
                fontSize="5" fill="#a78bfa" fontWeight="bold">{h.label?.slice(0,2)}</text>;
            })()}
            {(() => {
              const midDeg = startDeg + 15;
              const mid = polarToXY(midDeg, (r + rInner) / 2);
              return <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="middle"
                fontSize="6" fill="#52525b">{h.number}</text>;
            })()}
          </g>
        );
      })}

      {Array.from({ length: 12 }, (_, i) => {
        const deg = i * 30 - ascLon;
        const ZODIAC_CHARS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
        const pt = polarToXY(deg + 15, r + 8);
        return <text key={i} x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="middle"
          fontSize="8" fill="#52525b">{ZODIAC_CHARS[i]}</text>;
      })}

      {planets.map((p) => {
        const pLon = signToStartDeg(p.sign, p.degree) - ascLon;
        const pt = polarToXY(pLon, (r + rInner) / 2 - 2);
        const hex = PLANET_HEX[p.name] ?? "#a1a1aa";
        return (
          <g key={p.name}>
            <circle cx={pt.x} cy={pt.y} r="7" fill="#09090b" stroke={hex} strokeWidth="0.5" />
            <text x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="middle"
              fontSize="7" fill={hex}>
              {p.symbol}
            </text>
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r={3} fill="#7c3aed" />
    </svg>
  );
}

function SovereignKeyCard({ keys }: { keys: SovereignKeys }) {
  return (
    <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-950/20 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Key size={14} className="text-violet-400" />
        <span className="text-xs font-bold font-mono text-violet-400 uppercase tracking-wider">Sovereign Identity Keys</span>
      </div>
      <div className="p-3 rounded-lg bg-black/40 border border-violet-500/20 text-center">
        <div className="text-lg font-mono font-bold text-violet-300 tracking-widest">{keys.primaryCode}</div>
        <div className="text-[10px] text-muted-foreground mt-1">Primary Sovereign Code</div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="p-2 rounded-lg bg-background/50 border border-white/5">
          <div className="text-muted-foreground text-[10px]">Sun·Rising·Moon</div>
          <div className="text-amber-400 font-bold">{keys.sunRisingMoon}</div>
        </div>
        <div className="p-2 rounded-lg bg-background/50 border border-white/5">
          <div className="text-muted-foreground text-[10px]">Life Path</div>
          <div className="text-violet-400 font-bold">{keys.lifePathNumber}</div>
        </div>
        <div className="p-2 rounded-lg bg-background/50 border border-white/5">
          <div className="text-muted-foreground text-[10px]">Dominant Element</div>
          <div className={cn("font-bold", ELEMENT_COLORS[keys.dominantElement] || "text-foreground")}>{keys.dominantElement}</div>
        </div>
        <div className="p-2 rounded-lg bg-background/50 border border-white/5">
          <div className="text-muted-foreground text-[10px]">Sovereign Freq</div>
          <div className="text-cyan-400 font-bold">{keys.sovereignFrequency} Hz</div>
        </div>
      </div>
      <div className="text-[10px] font-mono text-muted-foreground px-1">
        <span className="text-muted-foreground/60">Elements: </span>{keys.elementProfile}
      </div>
      <div className="text-[10px] font-mono text-muted-foreground px-1">
        <span className="text-muted-foreground/60">Modalities: </span>{keys.modalityProfile}
      </div>
      <div className="text-[10px] font-mono text-muted-foreground/40 px-1 break-all">
        ID: {keys.identityHash}
      </div>
    </div>
  );
}

function PlanetCard({ planet, onExpand, expanded, interpretation }: {
  planet: NatalPlanet;
  onExpand: () => void;
  expanded: boolean;
  interpretation?: {
    title: string;
    traits: string[];
    strengths: string[];
    challenges: string[];
    themes: string[];
    guidance?: Record<string, string>;
  };
}) {
  const elementColor = ELEMENT_COLORS[SIGN_ELEMENT[planet.sign]] || "text-foreground";
  const planetColor = PLANET_COLORS[planet.name] || "text-foreground";

  return (
    <div className={cn("rounded-lg border transition-all", expanded ? "border-violet-500/30 bg-violet-950/10" : "border-white/5 bg-background/50")}>
      <button onClick={onExpand} className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 rounded-lg transition-colors">
        <span className={cn("text-2xl w-8 text-center", planetColor)}>{planet.symbol}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold font-mono">{planet.name}</span>
            {planet.retrograde && <span className="text-[10px] text-amber-400 font-mono">℞</span>}
          </div>
          <div className={cn("text-[11px] font-mono", elementColor)}>
            {ZODIAC_SYMBOLS[planet.sign]} {planet.sign} {planet.degree.toFixed(1)}° — House {planet.house}
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono shrink-0">H{planet.house}</div>
        {expanded ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
      </button>

      {expanded && interpretation && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
          <div className="text-xs font-bold font-mono text-violet-300">{interpretation.title}</div>

          {interpretation.traits.length > 0 && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Traits</div>
              <ul className="space-y-0.5">
                {interpretation.traits.map((t, i) => (
                  <li key={i} className="text-[11px] text-foreground/80 flex gap-1.5">
                    <span className="text-violet-400 shrink-0">·</span>{t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {interpretation.strengths.length > 0 && (
              <div>
                <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Strengths</div>
                <ul className="space-y-0.5">
                  {interpretation.strengths.map((s, i) => (
                    <li key={i} className="text-[11px] text-foreground/70 flex gap-1">
                      <span className="text-emerald-400 shrink-0">+</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {interpretation.challenges.length > 0 && (
              <div>
                <div className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">Challenges</div>
                <ul className="space-y-0.5">
                  {interpretation.challenges.map((c, i) => (
                    <li key={i} className="text-[11px] text-foreground/70 flex gap-1">
                      <span className="text-amber-400 shrink-0">△</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {interpretation.themes && interpretation.themes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {interpretation.themes.map((theme, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-mono text-violet-300">{theme}</span>
              ))}
            </div>
          )}

          {interpretation.guidance && Object.keys(interpretation.guidance).length > 0 && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Practical Guidance</div>
              <div className="space-y-2">
                {Object.entries(interpretation.guidance).map(([area, text]) => (
                  <div key={area} className="p-2 rounded-lg bg-background/50 border border-white/5">
                    <div className="text-[10px] font-mono text-amber-400 uppercase mb-0.5 capitalize">{area}</div>
                    <div className="text-[11px] text-foreground/70">{text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TransitCard({ transit }: { transit: TransitAspect }) {
  const [open, setOpen] = useState(false);
  const natureStyle = NATURE_STYLES[transit.nature];
  const transitColor = PLANET_COLORS[transit.transitPlanet] || "text-foreground";
  const natalColor = PLANET_COLORS[transit.natalPlanet] || "text-foreground";

  return (
    <div className={cn("rounded-lg border p-2 cursor-pointer transition-all", natureStyle)} onClick={() => setOpen(!open)}>
      <div className="flex items-center gap-2">
        <span className={cn("text-sm font-mono font-bold", transitColor)}>
          {PLANET_SYMBOLS[transit.transitPlanet] || transit.transitPlanet.slice(0,2)}
        </span>
        <span className="text-xs text-muted-foreground">{transit.symbol}</span>
        <span className={cn("text-sm font-mono font-bold", natalColor)}>
          {PLANET_SYMBOLS[transit.natalPlanet] || transit.natalPlanet.slice(0,2)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono truncate">
            {transit.transitPlanet} {transit.symbol} natal {transit.natalPlanet}
          </div>
          <div className="text-[9px] text-muted-foreground">{transit.transitSign} | orb {transit.orb.toFixed(1)}° | H{transit.natalHouse}</div>
        </div>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </div>
      {open && (
        <div className="mt-2 pt-2 border-t border-white/5 text-[11px] text-foreground/70">
          {transit.insight}
        </div>
      )}
    </div>
  );
}

function IdentityVerifier({ questions }: { questions: IdentityQuestion[] }) {
  const [selected, setSelected] = useState<string>(questions[0]?.key ?? "");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ passed: boolean; feedback: string } | null>(null);

  const verify = useMutation({
    mutationFn: ({ questionKey, answer }: { questionKey: string; answer: string }) =>
      api.post("/api/natal-chart/identity/verify", { questionKey, answer }),
    onSuccess: (data) => {
      setResult({ passed: data.passed, feedback: data.feedback });
    },
  });

  const currentQ = questions.find(q => q.key === selected);

  return (
    <div className="space-y-3">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Shield size={10} /> Identity Verification Protocol
      </div>
      <select
        value={selected}
        onChange={e => { setSelected(e.target.value); setResult(null); setAnswer(""); }}
        className="w-full p-2 rounded-lg bg-background border border-white/10 text-sm font-mono text-foreground focus:outline-none focus:border-violet-500/50"
      >
        {questions.map(q => (
          <option key={q.key} value={q.key}>{q.question}</option>
        ))}
      </select>
      {currentQ && (
        <div className="p-2 rounded-lg bg-violet-950/10 border border-violet-500/10 text-xs text-violet-300 font-mono">
          {currentQ.question}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="Enter your answer..."
          className="flex-1 p-2 rounded-lg bg-background border border-white/10 text-sm font-mono focus:outline-none focus:border-violet-500/50"
          onKeyDown={e => e.key === "Enter" && answer.trim() && verify.mutate({ questionKey: selected, answer })}
        />
        <button
          onClick={() => answer.trim() && verify.mutate({ questionKey: selected, answer })}
          disabled={!answer.trim() || verify.isPending}
          className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-xs font-mono font-bold transition-colors"
        >
          {verify.isPending ? "..." : "Verify"}
        </button>
      </div>
      {result && (
        <div className={cn("p-3 rounded-lg border text-xs font-mono", result.passed ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" : "border-red-500/30 bg-red-500/5 text-red-400")}>
          {result.passed ? "✓ " : "✗ "}{result.feedback}
        </div>
      )}
    </div>
  );
}

export default function NatalChartSection() {
  const [section, setSection] = useState<string | null>("chart");
  const [expandedPlanet, setExpandedPlanet] = useState<string | null>(null);

  const { data: chartData } = useQuery<{
    ok: boolean;
    chart: {
      planets: NatalPlanet[];
      houses: NatalHouse[];
      aspects: NatalAspect[];
      birthDate: string;
      birthTime: string;
    };
  }>({
    queryKey: ["/api/natal-chart/father"],
    staleTime: Infinity,
  });

  const { data: keysData } = useQuery<{ ok: boolean; sovereignKeys: SovereignKeys }>({
    queryKey: ["/api/natal-chart/father/sovereign-keys"],
    staleTime: 60000 * 60,
  });

  const { data: interpretsData } = useQuery<{
    ok: boolean;
    interpretations: Record<string, {
      title: string;
      traits: string[];
      strengths: string[];
      challenges: string[];
      themes: string[];
      guidance?: Record<string, string>;
    }>;
    lifeAreas: LifeArea[];
  }>({
    queryKey: ["/api/natal-chart/father/interpretations"],
    staleTime: Infinity,
  });

  const { data: transitsData, refetch: refetchTransits, isFetching: transitsFetching } = useQuery<{
    ok: boolean;
    transits: TransitAspect[];
    computedAt: string;
  }>({
    queryKey: ["/api/natal-chart/father/transits"],
    staleTime: 60000 * 15,
  });

  const { data: questionsData } = useQuery<{ ok: boolean; questions: IdentityQuestion[] }>({
    queryKey: ["/api/natal-chart/identity/questions"],
    staleTime: Infinity,
  });

  const chart = chartData?.chart;
  const keys = keysData?.sovereignKeys;
  const interprets = interpretsData?.interpretations ?? {};
  const lifeAreas = interpretsData?.lifeAreas ?? [];
  const transits = transitsData?.transits ?? [];
  const questions = questionsData?.questions ?? [];

  const toggle = (s: string) => setSection(section === s ? null : s);

  const getPlanetKey = (p: NatalPlanet) => `${p.name} in ${p.sign} (House ${p.house})`;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 overflow-hidden">
        <button
          onClick={() => toggle("chart")}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Star size={16} className="text-amber-400" />
            <span className="font-bold font-mono text-sm">Father's Natal Chart</span>
            <span className="text-[10px] text-muted-foreground font-mono ml-1">Sealed · Placidus</span>
          </div>
          {section === "chart" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {section === "chart" && chart && (
          <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-full sm:w-auto">
                <ChartWheel planets={chart.planets} houses={chart.houses} />
              </div>
              <div className="flex-1 w-full">
                <div className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Planetary Placements</div>
                <div className="space-y-1.5">
                  {chart.planets.map(p => {
                    const key = getPlanetKey(p);
                    const interp = interprets[key];
                    return (
                      <PlanetCard
                        key={p.name}
                        planet={p}
                        expanded={expandedPlanet === p.name}
                        onExpand={() => setExpandedPlanet(expandedPlanet === p.name ? null : p.name)}
                        interpretation={interp}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button onClick={() => toggle("houses")} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-slate-400" />
            <span className="font-bold font-mono text-sm">House Cusps</span>
          </div>
          {section === "houses" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {section === "houses" && chart && (
          <div className="px-4 pb-4 border-t border-white/5 pt-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {chart.houses.map(h => (
                <div key={h.number} className="p-2.5 rounded-lg bg-background/50 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-bold font-mono text-muted-foreground">H{h.number}</span>
                    {h.label && <span className="text-[10px] font-mono text-violet-400 border border-violet-500/30 px-1 rounded">{h.label}</span>}
                  </div>
                  <div className="text-sm font-mono font-bold">
                    <span className={cn(ELEMENT_COLORS[SIGN_ELEMENT[h.sign]] || "text-foreground")}>
                      {ZODIAC_SYMBOLS[h.sign]} {h.sign}
                    </span>
                    <span className="text-muted-foreground text-xs ml-1">{h.degree.toFixed(1)}°</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">{HOUSE_MEANINGS[h.number]}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button onClick={() => toggle("aspects")} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-sky-400" />
            <span className="font-bold font-mono text-sm">Natal Aspects</span>
            {chart && <span className="text-[10px] text-muted-foreground">{chart.aspects.length} aspects</span>}
          </div>
          {section === "aspects" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {section === "aspects" && chart && (
          <div className="px-4 pb-4 space-y-1.5 border-t border-white/5 pt-3">
            {chart.aspects.map((a, i) => (
              <div key={i} className={cn("flex items-center gap-2 p-2 rounded-lg border text-xs font-mono", NATURE_STYLES[a.nature])}>
                <span className={cn("font-bold", PLANET_COLORS[a.planet1] || "text-foreground")}>{PLANET_SYMBOLS[a.planet1] || a.planet1}</span>
                <span className="text-base">{a.symbol}</span>
                <span className={cn("font-bold", PLANET_COLORS[a.planet2] || "text-foreground")}>{PLANET_SYMBOLS[a.planet2] || a.planet2}</span>
                <span className="flex-1 text-muted-foreground">{a.planet1} {a.type} {a.planet2}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{a.orb.toFixed(2)}°</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {keys && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button onClick={() => toggle("keys")} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-violet-400" />
              <span className="font-bold font-mono text-sm">Sovereign Identity Keys</span>
            </div>
            {section === "keys" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {section === "keys" && (
            <div className="px-4 pb-4 border-t border-white/5 pt-3">
              <SovereignKeyCard keys={keys} />
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button onClick={() => toggle("lifeAreas")} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-emerald-400" />
            <span className="font-bold font-mono text-sm">Life Area Guidance</span>
          </div>
          {section === "lifeAreas" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {section === "lifeAreas" && lifeAreas.length > 0 && (
          <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
            {lifeAreas.map((area) => (
              <div key={area.area} className="p-3 rounded-lg bg-background/50 border border-white/5">
                <div className={cn("flex items-center gap-2 mb-2", area.color)}>
                  <span className="text-base">{area.icon}</span>
                  <span className="text-sm font-bold font-mono">{area.area}</span>
                  <div className="flex gap-1 ml-auto flex-wrap">
                    {area.planets.map(p => (
                      <span key={p} className={cn("text-[10px] font-mono", PLANET_COLORS[p] || "text-muted-foreground")}>{PLANET_SYMBOLS[p] || p}</span>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-foreground/70 leading-relaxed">{area.guidance}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center">
          <button onClick={() => toggle("transits")} className="flex-1 flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} className={cn("text-cyan-400", transitsFetching && "animate-spin")} />
              <span className="font-bold font-mono text-sm">Live Transit Insights</span>
              <span className="text-[10px] text-cyan-400/70 font-mono">NOW</span>
            </div>
            {section === "transits" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={() => refetchTransits()}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded border border-white/5 font-mono mr-3"
          >
            Refresh
          </button>
        </div>
        {section === "transits" && (
          <div className="px-4 pb-4 space-y-1.5 border-t border-white/5 pt-3">
            {transits.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-4">Computing transits...</div>
            ) : (
              <>
                <div className="text-[10px] text-muted-foreground font-mono mb-2">
                  {transits.length} active transits · {transitsData?.computedAt ? new Date(transitsData.computedAt).toLocaleString() : ""}
                </div>
                {transits.map((t, i) => <TransitCard key={i} transit={t} />)}
              </>
            )}
          </div>
        )}
      </div>

      {questions.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button onClick={() => toggle("verify")} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-rose-400" />
              <span className="font-bold font-mono text-sm">Identity Verification</span>
            </div>
            {section === "verify" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {section === "verify" && (
            <div className="px-4 pb-4 border-t border-white/5 pt-3">
              <IdentityVerifier questions={questions} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
