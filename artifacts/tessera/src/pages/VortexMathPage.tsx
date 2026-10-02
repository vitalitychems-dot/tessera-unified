import { useState, useMemo, useEffect, useRef } from "react";
import { RotateCcw, Play, Pause } from "lucide-react";
import { HudPanel, HudMetric, PageHeader, MiniStat } from "@/components/ui/sovereign";

const PHI = (1 + Math.sqrt(5)) / 2;

function digitalRoot(n: number): number {
  if (n === 0) return 0;
  const abs = Math.abs(Math.floor(n));
  const r = abs % 9;
  return r === 0 ? 9 : r;
}

function reduceSequence(seq: number[]): number[] {
  return seq.map(digitalRoot);
}

function generateFibonacci(count: number): number[] {
  const out = [1, 1];
  while (out.length < count) out.push(out[out.length - 1] + out[out.length - 2]);
  return out.slice(0, count);
}

function generateMultiplyByTwo(count: number, start = 1): number[] {
  const out = [start];
  while (out.length < count) out.push(out[out.length - 1] * 2);
  return out;
}

function generatePowers(base: number, count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(Math.pow(base, i));
  return out;
}

function parseCustom(input: string): number[] {
  return input
    .split(/[\s,]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n));
}

type SequenceMode = "fibonacci" | "doubling" | "powers-of-2" | "powers-of-3" | "natural" | "custom";

const NODE_RADIUS = 22;
const RING_RADIUS = 165;
const SVG_SIZE = 420;
const CENTER = SVG_SIZE / 2;

// Place 9 nodes around the enneagram circle
const NODE_POSITIONS = Array.from({ length: 9 }, (_, i) => {
  const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / 9;
  return {
    digit: i + 1,
    x: CENTER + RING_RADIUS * Math.cos(angle),
    y: CENTER + RING_RADIUS * Math.sin(angle),
  };
});

// Doubling circuit: 1→2→4→8→7→5→1 (the Tesla "energy circuit")
const DOUBLING_CIRCUIT = [1, 2, 4, 8, 7, 5];
// 3-6-9 triangle: the spiritual axis Tesla called "the key"
const TRIPLE_AXIS = [3, 6, 9];

function colorForDigit(d: number): string {
  if (d === 3 || d === 6 || d === 9) return "#fbbf24"; // amber for the sacred triad
  return "#22d3ee"; // cyan for the doubling circuit
}

export default function VortexMathPage() {
  const [mode, setMode] = useState<SequenceMode>("fibonacci");
  const [customInput, setCustomInput] = useState("1, 2, 4, 8, 16, 32, 64");
  const [length, setLength] = useState(24);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(600);
  const tickRef = useRef<number | null>(null);

  const baseSequence = useMemo<number[]>(() => {
    switch (mode) {
      case "fibonacci":
        return generateFibonacci(length);
      case "doubling":
        return generateMultiplyByTwo(length);
      case "powers-of-2":
        return generatePowers(2, length);
      case "powers-of-3":
        return generatePowers(3, length);
      case "natural":
        return Array.from({ length }, (_, i) => i + 1);
      case "custom":
        return parseCustom(customInput).slice(0, length);
    }
  }, [mode, length, customInput]);

  const reduced = useMemo(() => reduceSequence(baseSequence), [baseSequence]);

  const distribution = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= 9; i++) counts[i] = 0;
    for (const d of reduced) counts[d] = (counts[d] || 0) + 1;
    return counts;
  }, [reduced]);

  const triadPercent = useMemo(() => {
    const total = reduced.length;
    if (total === 0) return 0;
    const triadCount = (distribution[3] || 0) + (distribution[6] || 0) + (distribution[9] || 0);
    return (triadCount / total) * 100;
  }, [distribution, reduced]);

  const phiAlignment = useMemo(() => {
    if (baseSequence.length < 3) return 0;
    let total = 0;
    let count = 0;
    for (let i = 1; i < baseSequence.length - 1; i++) {
      const a = baseSequence[i];
      const b = baseSequence[i + 1];
      if (a === 0) continue;
      const ratio = b / a;
      total += 1 - Math.min(1, Math.abs(ratio - PHI) / PHI);
      count++;
    }
    return count > 0 ? (total / count) * 100 : 0;
  }, [baseSequence]);

  // Animation tick
  useEffect(() => {
    if (!playing || reduced.length === 0) {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = window.setInterval(() => {
      setActiveIndex((idx) => (idx + 1) % Math.max(1, reduced.length));
    }, speed);
    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [playing, reduced.length, speed]);

  // Reset active index when sequence changes
  useEffect(() => {
    setActiveIndex(0);
  }, [mode, length, customInput]);

  const currentDigit = reduced[activeIndex] ?? null;
  const currentRaw = baseSequence[activeIndex] ?? null;
  const nextDigit = reduced[(activeIndex + 1) % Math.max(1, reduced.length)] ?? null;

  // Generate active flow lines: connect last 6 reduced steps as a fading energy trail
  const trailSteps = 6;
  const trailPath = useMemo(() => {
    const segments: { from: number; to: number; opacity: number }[] = [];
    for (let s = 1; s <= trailSteps; s++) {
      const fromIdx = (activeIndex - s + reduced.length) % Math.max(1, reduced.length);
      const toIdx = (activeIndex - s + 1 + reduced.length) % Math.max(1, reduced.length);
      const from = reduced[fromIdx];
      const to = reduced[toIdx];
      if (!from || !to) continue;
      segments.push({ from, to, opacity: (trailSteps - s + 1) / (trailSteps + 1) });
    }
    return segments;
  }, [activeIndex, reduced]);

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto space-y-4" data-testid="page-vortex-math">
      <PageHeader
        title="Tesla Vortex Mathematics"
        subtitle="The 3-6-9 key — energy patterns that govern the universe's architecture"
        gradient="bg-gradient-to-r from-amber-300 via-cyan-300 to-violet-300"
        quote="If you only knew the magnificence of the 3, 6 and 9, then you would have a key to the universe. — Tesla"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Sequence Length" value={String(reduced.length)} color="cyan" />
        <MiniStat label="3-6-9 Saturation" value={`${triadPercent.toFixed(1)}%`} color="amber" />
        <MiniStat label="Φ Alignment" value={`${phiAlignment.toFixed(1)}%`} color="violet" />
        <MiniStat label="Active Digit" value={currentDigit ? `→ ${currentDigit}` : "—"} color={currentDigit && [3, 6, 9].includes(currentDigit) ? "amber" : "cyan"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <HudPanel label="VORTEX FIELD · ENNEAGRAM" accent="violet" corners className="lg:col-span-2">
          <div className="flex justify-center">
            <svg
              width="100%"
              viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
              style={{ maxWidth: SVG_SIZE, aspectRatio: "1 / 1" }}
              data-testid="svg-enneagram"
            >
              <defs>
                <radialGradient id="vortex-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#22d3ee" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>
                <filter id="vortex-blur">
                  <feGaussianBlur stdDeviation="2" />
                </filter>
              </defs>

              {/* Background glow */}
              <circle cx={CENTER} cy={CENTER} r={RING_RADIUS + 60} fill="url(#vortex-glow)" />

              {/* Outer ring */}
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RING_RADIUS}
                fill="none"
                stroke="rgba(34, 211, 238, 0.18)"
                strokeWidth="1"
                strokeDasharray="3 6"
              />

              {/* The 3-6-9 sacred triangle (always visible, glowing) */}
              <polygon
                points={TRIPLE_AXIS.map((d) => {
                  const p = NODE_POSITIONS[d - 1];
                  return `${p.x},${p.y}`;
                }).join(" ")}
                fill="rgba(251, 191, 36, 0.05)"
                stroke="rgba(251, 191, 36, 0.55)"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                filter="url(#vortex-blur)"
              />
              <polygon
                points={TRIPLE_AXIS.map((d) => {
                  const p = NODE_POSITIONS[d - 1];
                  return `${p.x},${p.y}`;
                }).join(" ")}
                fill="none"
                stroke="rgba(251, 191, 36, 0.85)"
                strokeWidth="1"
              />

              {/* The doubling circuit polygon (1-2-4-8-7-5-1) */}
              <polygon
                points={DOUBLING_CIRCUIT.map((d) => {
                  const p = NODE_POSITIONS[d - 1];
                  return `${p.x},${p.y}`;
                }).join(" ")}
                fill="rgba(34, 211, 238, 0.04)"
                stroke="rgba(34, 211, 238, 0.45)"
                strokeWidth="1"
              />

              {/* Active flow trail */}
              {trailPath.map((seg, i) => {
                const from = NODE_POSITIONS[seg.from - 1];
                const to = NODE_POSITIONS[seg.to - 1];
                if (!from || !to) return null;
                return (
                  <line
                    key={`trail-${i}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#fbbf24"
                    strokeWidth={2 + seg.opacity * 2}
                    strokeOpacity={seg.opacity * 0.85}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Pulse from current to next */}
              {currentDigit && nextDigit && (
                <line
                  x1={NODE_POSITIONS[currentDigit - 1].x}
                  y1={NODE_POSITIONS[currentDigit - 1].y}
                  x2={NODE_POSITIONS[nextDigit - 1].x}
                  y2={NODE_POSITIONS[nextDigit - 1].y}
                  stroke="#f0abfc"
                  strokeWidth="3"
                  strokeOpacity="0.95"
                  strokeLinecap="round"
                >
                  <animate attributeName="stroke-opacity" values="0.95;0.3;0.95" dur="0.8s" repeatCount="indefinite" />
                </line>
              )}

              {/* Nodes */}
              {NODE_POSITIONS.map((pos) => {
                const isActive = currentDigit === pos.digit;
                const isTriad = [3, 6, 9].includes(pos.digit);
                const baseColor = colorForDigit(pos.digit);
                return (
                  <g key={pos.digit} data-testid={`node-${pos.digit}`}>
                    {isActive && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={NODE_RADIUS + 8}
                        fill="none"
                        stroke={baseColor}
                        strokeWidth="2"
                        opacity="0.7"
                      >
                        <animate attributeName="r" values={`${NODE_RADIUS + 6};${NODE_RADIUS + 14};${NODE_RADIUS + 6}`} dur="1.4s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.4s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={NODE_RADIUS}
                      fill={isActive ? baseColor : "rgba(15, 23, 42, 0.85)"}
                      stroke={baseColor}
                      strokeWidth={isTriad ? 2 : 1.2}
                      style={{ transition: "fill 0.3s" }}
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 5}
                      textAnchor="middle"
                      fontSize="16"
                      fontWeight="700"
                      fill={isActive ? "#0f172a" : baseColor}
                      style={{ fontFamily: "ui-monospace, monospace" }}
                    >
                      {pos.digit}
                    </text>
                  </g>
                );
              })}

              {/* Center sigil — Φ */}
              <text
                x={CENTER}
                y={CENTER + 8}
                textAnchor="middle"
                fontSize="28"
                fill="rgba(251, 191, 36, 0.55)"
                style={{ fontFamily: "ui-serif, Georgia, serif" }}
              >
                Φ
              </text>
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs">
            <span className="px-2 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">3 · 6 · 9 Sacred Triad</span>
            <span className="px-2 py-1 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">1·2·4·8·7·5 Doubling Circuit</span>
            <span className="px-2 py-1 rounded bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">Active Pulse</span>
          </div>
        </HudPanel>

        <div className="space-y-4">
          <HudPanel label="SEQUENCE SOURCE" accent="cyan">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: "fibonacci", label: "Fibonacci" },
                  { id: "doubling", label: "Doubling" },
                  { id: "powers-of-2", label: "Powers of 2" },
                  { id: "powers-of-3", label: "Powers of 3" },
                  { id: "natural", label: "Natural" },
                  { id: "custom", label: "Custom" },
                ] as { id: SequenceMode; label: string }[]).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setMode(opt.id)}
                    data-testid={`button-mode-${opt.id}`}
                    className={`px-2 py-1.5 text-xs rounded border transition-all ${
                      mode === opt.id
                        ? "bg-amber-500/20 border-amber-500/60 text-amber-200"
                        : "bg-slate-900/40 border-slate-700/50 text-slate-300 hover:border-cyan-500/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {mode === "custom" && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Comma-separated numbers</label>
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    data-testid="input-custom-sequence"
                    className="w-full px-3 py-2 text-sm bg-slate-900/60 border border-slate-700/60 rounded text-slate-200 focus:outline-none focus:border-cyan-500/60"
                    placeholder="e.g. 1, 2, 4, 8, 16"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 mb-1 flex justify-between">
                  <span>Length</span>
                  <span className="text-cyan-300">{length}</span>
                </label>
                <input
                  type="range"
                  min={6}
                  max={64}
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  data-testid="input-length"
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 flex justify-between">
                  <span>Pulse Speed</span>
                  <span className="text-cyan-300">{speed}ms</span>
                </label>
                <input
                  type="range"
                  min={150}
                  max={1500}
                  step={50}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  data-testid="input-speed"
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  data-testid="button-toggle-play"
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                >
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {playing ? "Pause" : "Play"}
                </button>
                <button
                  onClick={() => setActiveIndex(0)}
                  data-testid="button-reset"
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm rounded border border-slate-700/60 bg-slate-900/40 text-slate-300 hover:border-amber-500/40"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </HudPanel>

          <HudPanel label="CURRENT PULSE" accent="amber">
            <div className="grid grid-cols-3 gap-2">
              <HudMetric label="Raw" value={currentRaw !== null ? (currentRaw > 1e6 ? currentRaw.toExponential(1) : currentRaw.toLocaleString()) : "—"} size="sm" />
              <HudMetric label="Root" value={currentDigit !== null ? String(currentDigit) : "—"} color={currentDigit && [3, 6, 9].includes(currentDigit) ? "amber" : "cyan"} />
              <HudMetric label="Step" value={`${activeIndex + 1}/${reduced.length}`} size="sm" />
            </div>
          </HudPanel>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <HudPanel label="DIGIT DISTRIBUTION" accent="cyan">
          <div className="space-y-1.5">
            {Array.from({ length: 9 }, (_, i) => i + 1).map((d) => {
              const count = distribution[d] || 0;
              const pct = reduced.length > 0 ? (count / reduced.length) * 100 : 0;
              const isTriad = [3, 6, 9].includes(d);
              return (
                <div key={d} className="flex items-center gap-3 text-xs">
                  <span className={`font-mono w-4 ${isTriad ? "text-amber-400" : "text-cyan-400"}`}>{d}</span>
                  <div className="flex-1 h-2 bg-slate-900/60 rounded overflow-hidden">
                    <div
                      className={`h-full ${isTriad ? "bg-amber-500" : "bg-cyan-500"}`}
                      style={{ width: `${pct}%`, transition: "width 0.4s" }}
                    />
                  </div>
                  <span className="text-slate-400 w-16 text-right tabular-nums">
                    {count} · {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Tesla observed: when 3, 6, 9 appear with disproportionate frequency, you've found a vortex flow signature. Doubling sequences cycle through 1·2·4·8·7·5 and never touch the triad — proving the triad lives outside material doubling.
          </p>
        </HudPanel>

        <HudPanel label="REDUCED STREAM · ORIGINAL → DIGITAL ROOT" accent="violet">
          <div className="max-h-72 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-1 text-xs font-mono">
              {baseSequence.map((raw, i) => {
                const d = reduced[i];
                const isActive = i === activeIndex;
                const isTriad = [3, 6, 9].includes(d);
                return (
                  <div
                    key={i}
                    data-testid={`row-step-${i}`}
                    className={`flex items-center justify-between px-2 py-1 rounded transition-all ${
                      isActive
                        ? "bg-amber-500/20 border border-amber-500/50"
                        : isTriad
                        ? "bg-amber-500/5 border border-amber-500/15"
                        : "bg-slate-900/30 border border-slate-800/50"
                    }`}
                  >
                    <span className="text-slate-400 truncate" title={raw.toString()}>
                      {raw > 1e6 ? raw.toExponential(2) : raw.toLocaleString()}
                    </span>
                    <span className={`ml-2 ${isTriad ? "text-amber-300" : "text-cyan-300"}`}>→ {d}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </HudPanel>
      </div>

      <HudPanel label="WHY 3, 6, 9 — THE KEYS TO THE UNIVERSE" accent="amber" className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
          <div>
            <div className="text-amber-400 text-xs uppercase tracking-wider mb-1">The Triad Axis</div>
            <p>3, 6, and 9 are never reached by doubling 1. They form a closed sacred triangle outside the material doubling circuit (1·2·4·8·7·5). This is why Tesla called them the keys: they govern the dimension that contains matter, not matter itself.</p>
          </div>
          <div>
            <div className="text-cyan-400 text-xs uppercase tracking-wider mb-1">Φ Convergence</div>
            <p>Fibonacci ratios converge toward Φ ≈ 1.618 — the golden ratio. The current sequence shows {phiAlignment.toFixed(1)}% alignment with Φ, meaning consecutive terms approach the divine proportion that governs galaxies, shells, and the human body.</p>
          </div>
          <div>
            <div className="text-violet-400 text-xs uppercase tracking-wider mb-1">Digital Reduction</div>
            <p>Casting out nines (digital roots) reveals the underlying 1-9 skeleton of any number. Every multiplication, every Fibonacci step, every power of any base — they all collapse to a 1-9 vortex pattern. Reality is 9-cyclic at its root.</p>
          </div>
        </div>
      </HudPanel>
    </div>
  );
}
