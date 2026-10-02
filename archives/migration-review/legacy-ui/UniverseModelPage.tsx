import { useState, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn, ZoomOut, RotateCcw, Play, Pause, Eye, EyeOff,
  Maximize2, Minimize2, Hexagon, CircleDot, Compass, Info, X
} from "lucide-react";
import { cn } from "@/lib/utils";

const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
const DEG = Math.PI / 180;
const AU_PX = 120;

interface OrbitalElements {
  a: number; aRate: number;
  e: number; eRate: number;
  I: number; IRate: number;
  L: number; LRate: number;
  w: number; wRate: number;
  O: number; ORate: number;
}

interface PlanetDef {
  name: string;
  color: string;
  size: number;
  elements: OrbitalElements;
  symbol: string;
  zodiacSign?: string;
  ruledBy?: string;
  sacredFrequency?: string;
  description: string;
}

const PLANETS: PlanetDef[] = [
  {
    name: "Mercury", color: "#b0b0b0", size: 4, symbol: "\u263F",
    sacredFrequency: "141.27 Hz",
    description: "Messenger of the gods. Rules communication, intellect, and commerce. Closest to Source.",
    elements: { a: 0.38710, aRate: 0, e: 0.20563, eRate: 0.00002, I: 7.005, IRate: -0.0060, L: 252.251, LRate: 149472.6746, w: 77.458, wRate: 0.1600, O: 48.331, ORate: -0.1254 }
  },
  {
    name: "Venus", color: "#e8c547", size: 6, symbol: "\u2640",
    sacredFrequency: "221.23 Hz",
    description: "Goddess of love and beauty. Rules harmony, relationships, and sacred art. Traces the pentagram in 8 years.",
    elements: { a: 0.72333, aRate: 0, e: 0.00677, eRate: -0.00005, I: 3.395, IRate: -0.0008, L: 181.980, LRate: 58517.8157, w: 131.564, wRate: 0.0048, O: 76.680, ORate: -0.2780 }
  },
  {
    name: "Earth", color: "#4488ff", size: 7, symbol: "\u2641",
    sacredFrequency: "7.83 Hz (Schumann)",
    description: "Our home. Schumann resonance at 7.83Hz. The third dimension of physical experience.",
    elements: { a: 1.00000, aRate: 0, e: 0.01671, eRate: -0.00004, I: 0.000, IRate: -0.0130, L: 100.465, LRate: 35999.3720, w: 102.937, wRate: 0.3225, O: -11.261, ORate: -0.0190 }
  },
  {
    name: "Mars", color: "#e04040", size: 5, symbol: "\u2642",
    sacredFrequency: "144.72 Hz",
    description: "God of war and action. Rules energy, drive, and sovereign will. The red frequency of transformation.",
    elements: { a: 1.52368, aRate: 0, e: 0.09340, eRate: 0.00008, I: 1.850, IRate: -0.0020, L: 355.453, LRate: 19140.2993, w: 336.061, wRate: 0.4439, O: 49.559, ORate: -0.2930 }
  },
  {
    name: "Jupiter", color: "#d4a56a", size: 12, symbol: "\u2643",
    sacredFrequency: "183.58 Hz",
    description: "King of the gods. Rules expansion, wisdom, and higher knowledge. The Grand Council planet.",
    elements: { a: 5.20260, aRate: 0, e: 0.04849, eRate: 0.00016, I: 1.303, IRate: -0.0055, L: 34.404, LRate: 3034.9057, w: 14.331, wRate: 0.2155, O: 100.464, ORate: 0.1759 }
  },
  {
    name: "Saturn", color: "#c4a882", size: 10, symbol: "\u2644",
    sacredFrequency: "147.85 Hz",
    description: "Lord of time and structure. Rules discipline, boundaries, and karmic law. The rings encode sacred geometry.",
    elements: { a: 9.55491, aRate: 0, e: 0.05551, eRate: -0.00035, I: 2.489, IRate: -0.0042, L: 49.945, LRate: 1222.1138, w: 93.057, wRate: 0.5624, O: 113.666, ORate: -0.2507 }
  },
  {
    name: "Uranus", color: "#66cccc", size: 9, symbol: "\u2645",
    sacredFrequency: "207.36 Hz",
    description: "The awakener. Rules revolution, innovation, and quantum leaps. Sovereign technology planet.",
    elements: { a: 19.18171, aRate: -0.00015, e: 0.04716, eRate: -0.00019, I: 0.773, IRate: 0.0001, L: 313.232, LRate: 428.4677, w: 173.005, wRate: 0.0189, O: 74.006, ORate: 0.0502 }
  },
  {
    name: "Neptune", color: "#4466dd", size: 9, symbol: "\u2646",
    sacredFrequency: "211.44 Hz",
    description: "God of the deep. Rules dreams, intuition, and the collective unconscious. The portal to higher dimensions.",
    elements: { a: 30.06896, aRate: 0.00030, e: 0.00859, eRate: 0.00005, I: 1.770, IRate: -0.0001, L: 304.880, LRate: 218.4562, w: 48.124, wRate: 0.0300, O: 131.784, ORate: -0.0060 }
  },
];

const ZODIAC = [
  { name: "Aries", symbol: "\u2648", color: "#ef4444", element: "Fire", start: 0 },
  { name: "Taurus", symbol: "\u2649", color: "#22c55e", element: "Earth", start: 30 },
  { name: "Gemini", symbol: "\u264A", color: "#eab308", element: "Air", start: 60 },
  { name: "Cancer", symbol: "\u264B", color: "#94a3b8", element: "Water", start: 90 },
  { name: "Leo", symbol: "\u264C", color: "#f97316", element: "Fire", start: 120 },
  { name: "Virgo", symbol: "\u264D", color: "#84cc16", element: "Earth", start: 150 },
  { name: "Libra", symbol: "\u264E", color: "#ec4899", element: "Air", start: 180 },
  { name: "Scorpio", symbol: "\u264F", color: "#dc2626", element: "Water", start: 210 },
  { name: "Sagittarius", symbol: "\u2650", color: "#a855f7", element: "Fire", start: 240 },
  { name: "Capricorn", symbol: "\u2651", color: "#64748b", element: "Earth", start: 270 },
  { name: "Aquarius", symbol: "\u2652", color: "#06b6d4", element: "Air", start: 300 },
  { name: "Pisces", symbol: "\u2653", color: "#8b5cf6", element: "Water", start: 330 },
];

function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 20; i++) {
    const dE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

function getPlanetPosition(planet: PlanetDef, dateMs: number): { x: number; y: number; lon: number; r: number } {
  const T = (dateMs - J2000) / (36525 * 86400000);
  const el = planet.elements;
  const a = el.a + el.aRate * T;
  const e = el.e + el.eRate * T;
  const I = (el.I + el.IRate * T) * DEG;
  const L = (el.L + el.LRate * T) % 360;
  const wBar = (el.w + el.wRate * T) % 360;
  const O = (el.O + el.ORate * T) * DEG;

  const M = ((L - wBar) % 360 + 360) % 360 * DEG;
  const w = (wBar - el.O - el.ORate * T) * DEG;

  const E = solveKepler(M, e);
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const cosw = Math.cos(w), sinw = Math.sin(w);
  const cosO = Math.cos(O), sinO = Math.sin(O);
  const cosI = Math.cos(I), sinI = Math.sin(I);

  const x = (cosw * cosO - sinw * sinO * cosI) * xp + (-sinw * cosO - cosw * sinO * cosI) * yp;
  const y = (cosw * sinO + sinw * cosO * cosI) * xp + (-sinw * sinO + cosw * cosO * cosI) * yp;

  const lon = ((Math.atan2(y, x) / DEG) % 360 + 360) % 360;
  const r = Math.sqrt(x * x + y * y);
  return { x, y, lon, r };
}

function getMoonPosition(dateMs: number, earthPos: { x: number; y: number }): { x: number; y: number; lon: number } {
  const T = (dateMs - J2000) / (36525 * 86400000);
  const L0 = (218.3165 + 481267.8813 * T) % 360;
  const M = (134.9634 + 477198.8676 * T) % 360;
  const F = (93.2721 + 483202.0175 * T) % 360;

  const lon = L0 + 6.289 * Math.sin(M * DEG) + 1.274 * Math.sin((2 * L0 - M) * DEG) + 0.658 * Math.sin(2 * L0 * DEG);
  const lat = 5.128 * Math.sin(F * DEG);

  const r = 0.0025;
  const angle = ((lon % 360 + 360) % 360) * DEG;
  return {
    x: earthPos.x + r * Math.cos(angle),
    y: earthPos.y + r * Math.sin(angle),
    lon: ((lon % 360) + 360) % 360,
  };
}

function getZodiacSign(lon: number): typeof ZODIAC[0] {
  const normalized = ((lon % 360) + 360) % 360;
  const idx = Math.floor(normalized / 30) % 12;
  return ZODIAC[idx];
}

function drawFlowerOfLife(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, opacity: number) {
  ctx.save();
  ctx.strokeStyle = `rgba(168, 85, 247, ${opacity})`;
  ctx.lineWidth = 0.5;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 6; i++) {
    const angle = (i * 60) * DEG;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 + 30) * DEG;
    const d = radius * Math.sqrt(3);
    const x = cx + d * Math.cos(angle);
    const y = cy + d * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 6; i++) {
    const angle = (i * 60) * DEG;
    const d = radius * 2;
    const x = cx + d * Math.cos(angle);
    const y = cy + d * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMetatronsCube(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, opacity: number) {
  ctx.save();
  ctx.strokeStyle = `rgba(234, 179, 8, ${opacity * 0.6})`;
  ctx.lineWidth = 0.3;

  const points: { x: number; y: number }[] = [{ x: cx, y: cy }];
  for (let ring = 1; ring <= 2; ring++) {
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 + (ring === 2 ? 30 : 0)) * DEG;
      const r = radius * ring * 0.6;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
  }

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);
      ctx.lineTo(points[j].x, points[j].y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawGoldenSpiral(ctx: CanvasRenderingContext2D, cx: number, cy: number, maxRadius: number, opacity: number, time: number) {
  ctx.save();
  ctx.strokeStyle = `rgba(251, 191, 36, ${opacity * 0.5})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();

  const PHI = 1.618033988749895;
  const rotOffset = time * 0.05;
  for (let t = 0; t < 20; t += 0.05) {
    const r = Math.pow(PHI, t / (Math.PI * 2)) * 3;
    if (r > maxRadius) break;
    const angle = t + rotOffset;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

interface PlanetState {
  name: string;
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  lon: number;
  r: number;
  color: string;
  size: number;
  symbol: string;
  zodiac: typeof ZODIAC[0];
  description: string;
  sacredFrequency?: string;
}

export default function UniverseModelPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState(false);
  const [showZodiac, setShowZodiac] = useState(true);
  const [showSacredGeometry, setShowSacredGeometry] = useState(true);
  const [showOrbits, setShowOrbits] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetState | null>(null);
  const [currentDate, setCurrentDate] = useState(Date.now());
  const [planetStates, setPlanetStates] = useState<PlanetState[]>([]);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const lastPinchRef = useRef(0);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.1, Math.min(20, z * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  }, [panX, panY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY });
    } else if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      lastPinchRef.current = d;
    }
  }, [panX, panY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPanX(e.touches[0].clientX - dragStart.x);
      setPanY(e.touches[0].clientY - dragStart.y);
    } else if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastPinchRef.current > 0) {
        const ratio = d / lastPinchRef.current;
        setZoom(z => Math.max(0.1, Math.min(20, z * ratio)));
      }
      lastPinchRef.current = d;
    }
  }, [isDragging, dragStart]);

  const resetView = useCallback(() => {
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
    setSelectedPlanet(null);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let closest: PlanetState | null = null;
    let closestDist = 25;
    for (const p of planetStates) {
      const d = Math.hypot(mx - p.screenX, my - p.screenY);
      if (d < closestDist) {
        closestDist = d;
        closest = p;
      }
    }
    setSelectedPlanet(closest);
  }, [planetStates]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      timeRef.current += 0.016;
      const now = currentDate;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      const cx = w / 2 + panX;
      const cy = h / 2 + panY;

      ctx.fillStyle = "#020010";
      ctx.fillRect(0, 0, w, h);

      const starSeed = 42;
      for (let i = 0; i < 400; i++) {
        const sx = ((i * 7919 + starSeed) % (w + 200)) - 100;
        const sy = ((i * 104729 + starSeed) % (h + 200)) - 100;
        const brightness = 0.15 + ((i * 31 % 100) / 100) * 0.5;
        const twinkle = Math.sin(timeRef.current * 1.5 + i * 0.7) * 0.2 + 0.8;
        ctx.fillStyle = `rgba(255,255,255,${brightness * twinkle})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.4 + (i % 4) * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);

      const zodiacRadius = AU_PX * 32;
      if (showZodiac) {
        for (let i = 0; i < 12; i++) {
          const z = ZODIAC[i];
          const startAngle = -(z.start + 90) * DEG;
          const endAngle = -(z.start + 30 + 90) * DEG;

          ctx.fillStyle = z.color + "08";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, zodiacRadius, startAngle, endAngle, true);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = z.color + "25";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(startAngle) * zodiacRadius, Math.sin(startAngle) * zodiacRadius);
          ctx.stroke();

          const midAngle = -(z.start + 15 + 90) * DEG;
          const labelR = zodiacRadius * 1.06;
          ctx.save();
          ctx.translate(Math.cos(midAngle) * labelR, Math.sin(midAngle) * labelR);
          ctx.rotate(midAngle + Math.PI / 2);
          ctx.fillStyle = z.color + "bb";
          ctx.font = `bold ${Math.max(8, 14 / zoom)}px monospace`;
          ctx.textAlign = "center";
          ctx.fillText(z.symbol, 0, 0);
          ctx.font = `${Math.max(5, 8 / zoom)}px monospace`;
          ctx.fillStyle = z.color + "77";
          ctx.fillText(z.name, 0, Math.max(8, 14 / zoom));
          ctx.restore();
        }

        ctx.strokeStyle = "rgba(168, 85, 247, 0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, zodiacRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (showSacredGeometry) {
        const geoRadius = AU_PX * 4;
        drawFlowerOfLife(ctx, 0, 0, geoRadius, 0.12 + Math.sin(timeRef.current * 0.3) * 0.04);
        drawMetatronsCube(ctx, 0, 0, AU_PX * 8, 0.08 + Math.sin(timeRef.current * 0.2 + 1) * 0.03);
        drawGoldenSpiral(ctx, 0, 0, zodiacRadius * 0.7, 0.15, timeRef.current);
      }

      const sunGrd = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
      sunGrd.addColorStop(0, "rgba(255, 255, 200, 1)");
      sunGrd.addColorStop(0.2, "rgba(255, 200, 50, 0.9)");
      sunGrd.addColorStop(0.5, "rgba(255, 150, 0, 0.4)");
      sunGrd.addColorStop(1, "rgba(255, 100, 0, 0)");
      ctx.fillStyle = sunGrd;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff8e0";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      const sunLabelSize = Math.max(6, 10 / zoom);
      ctx.fillStyle = "rgba(255, 220, 100, 0.8)";
      ctx.font = `bold ${sunLabelSize}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("\u2609 Sun", 0, -25);
      ctx.restore();

      const computed: PlanetState[] = [];

      for (const planet of PLANETS) {
        const pos = getPlanetPosition(planet, now);
        const px = pos.x * AU_PX;
        const py = -pos.y * AU_PX;

        if (showOrbits) {
          ctx.strokeStyle = planet.color + "20";
          ctx.lineWidth = 0.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(0, 0, pos.r * AU_PX, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        const isSelected = selectedPlanet?.name === planet.name;
        const pulseSize = isSelected ? planet.size * 1.5 + Math.sin(timeRef.current * 3) * 2 : planet.size;

        const glow = ctx.createRadialGradient(px, py, 0, px, py, pulseSize * 3);
        glow.addColorStop(0, planet.color + "80");
        glow.addColorStop(0.5, planet.color + "20");
        glow.addColorStop(1, planet.color + "00");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, pulseSize * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.arc(px, py, pulseSize, 0, Math.PI * 2);
        ctx.fill();

        if (planet.name === "Saturn") {
          ctx.strokeStyle = planet.color + "60";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(px, py, pulseSize * 2.2, pulseSize * 0.6, -0.4, 0, Math.PI * 2);
          ctx.stroke();
        }

        const fontSize = Math.max(5, 9 / zoom);
        ctx.fillStyle = planet.color + "cc";
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(`${planet.symbol} ${planet.name}`, px, py - pulseSize - 4);

        const zodiac = getZodiacSign(pos.lon);
        ctx.fillStyle = zodiac.color + "88";
        ctx.font = `${Math.max(4, 7 / zoom)}px monospace`;
        ctx.fillText(`${zodiac.symbol} ${zodiac.name} ${pos.lon.toFixed(1)}\u00B0`, px, py + pulseSize + fontSize);

        const screenPx = cx + px * zoom;
        const screenPy = cy + py * zoom;
        computed.push({
          name: planet.name,
          x: pos.x,
          y: pos.y,
          screenX: screenPx,
          screenY: screenPy,
          lon: pos.lon,
          r: pos.r,
          color: planet.color,
          size: planet.size,
          symbol: planet.symbol,
          zodiac,
          description: planet.description,
          sacredFrequency: planet.sacredFrequency,
        });
      }

      const earthState = computed.find(p => p.name === "Earth");
      if (earthState) {
        const moonPos = getMoonPosition(now, { x: earthState.x, y: earthState.y });
        const mpx = moonPos.x * AU_PX;
        const mpy = -moonPos.y * AU_PX;

        ctx.fillStyle = "rgba(200, 200, 220, 0.9)";
        ctx.beginPath();
        ctx.arc(mpx, mpy, 3, 0, Math.PI * 2);
        ctx.fill();

        const moonGlow = ctx.createRadialGradient(mpx, mpy, 0, mpx, mpy, 8);
        moonGlow.addColorStop(0, "rgba(200, 200, 230, 0.3)");
        moonGlow.addColorStop(1, "rgba(200, 200, 230, 0)");
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(mpx, mpy, 8, 0, Math.PI * 2);
        ctx.fill();

        const mFontSize = Math.max(4, 7 / zoom);
        ctx.fillStyle = "rgba(200, 200, 230, 0.7)";
        ctx.font = `${mFontSize}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText("\u263D Moon", mpx, mpy - 7);

        const moonZodiac = getZodiacSign(moonPos.lon);
        ctx.fillStyle = moonZodiac.color + "66";
        ctx.font = `${Math.max(3, 5 / zoom)}px monospace`;
        ctx.fillText(`${moonZodiac.symbol} ${moonZodiac.name}`, mpx, mpy + 10);

        const screenMx = cx + mpx * zoom;
        const screenMy = cy + mpy * zoom;
        computed.push({
          name: "Moon",
          x: moonPos.x,
          y: moonPos.y,
          screenX: screenMx,
          screenY: screenMy,
          lon: moonPos.lon,
          r: 0.00257,
          color: "#c8c8e0",
          size: 3,
          symbol: "\u263D",
          zodiac: moonZodiac,
          description: "Earth's companion. Rules emotions, intuition, and the subconscious. Cycles through all 12 signs every 28 days.",
          sacredFrequency: "210.42 Hz",
        });
      }

      if (showSacredGeometry && computed.length >= 3) {
        ctx.strokeStyle = "rgba(168, 85, 247, 0.08)";
        ctx.lineWidth = 0.3;
        for (let i = 0; i < computed.length; i++) {
          for (let j = i + 1; j < computed.length; j++) {
            ctx.beginPath();
            ctx.moveTo(computed[i].x * AU_PX, -computed[i].y * AU_PX);
            ctx.lineTo(computed[j].x * AU_PX, -computed[j].y * AU_PX);
            ctx.stroke();
          }
        }
      }

      ctx.restore();

      setPlanetStates(computed);
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [zoom, panX, panY, currentDate, showZodiac, showSacredGeometry, showOrbits, selectedPlanet]);

  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      setCurrentDate(d => d + 86400000);
    }, 100);
    return () => clearInterval(interval);
  }, [autoRotate]);

  const dateStr = new Date(currentDate).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-col bg-[#020010]", isFullscreen ? "h-screen" : "tessera-page min-h-screen")}
      data-testid="universe-model-page"
    >
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: isFullscreen ? "100vh" : "calc(100vh - 52px)" }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          onClick={handleCanvasClick}
          data-testid="universe-canvas"
        />

        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-md border border-violet-500/20 rounded-xl px-3 py-2 pointer-events-auto">
            <div className="text-[10px] text-violet-400 font-bold uppercase tracking-widest">Sovereign Solar System</div>
            <div className="text-xs text-white/80 font-mono mt-0.5">{dateStr}</div>
            <div className="text-[9px] text-emerald-400/70 mt-0.5">
              Computed locally via Kepler orbital mechanics
            </div>
            <div className="text-[9px] text-amber-400/60 mt-0.5">
              {"NASA JPL elements \u00B7 Zero external dependencies"}
            </div>
          </div>
        </div>

        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
          <button onClick={() => setZoom(z => Math.min(20, z * 1.4))} className="w-9 h-9 rounded-lg bg-black/70 backdrop-blur border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:border-violet-500/40 transition-all" data-testid="btn-zoom-in">
            <ZoomIn size={16} />
          </button>
          <button onClick={() => setZoom(z => Math.max(0.1, z / 1.4))} className="w-9 h-9 rounded-lg bg-black/70 backdrop-blur border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:border-violet-500/40 transition-all" data-testid="btn-zoom-out">
            <ZoomOut size={16} />
          </button>
          <button onClick={resetView} className="w-9 h-9 rounded-lg bg-black/70 backdrop-blur border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:border-violet-500/40 transition-all" data-testid="btn-reset">
            <RotateCcw size={16} />
          </button>
          <button onClick={() => setAutoRotate(!autoRotate)} className={cn("w-9 h-9 rounded-lg bg-black/70 backdrop-blur border flex items-center justify-center transition-all", autoRotate ? "border-emerald-500/50 text-emerald-400" : "border-white/10 text-white/70")} data-testid="btn-animate">
            {autoRotate ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={toggleFullscreen} className="w-9 h-9 rounded-lg bg-black/70 backdrop-blur border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:border-violet-500/40 transition-all" data-testid="btn-fullscreen">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <div className="w-full h-px bg-white/10 my-0.5" />
          <button onClick={() => setShowZodiac(!showZodiac)} className={cn("w-9 h-9 rounded-lg bg-black/70 backdrop-blur border flex items-center justify-center transition-all", showZodiac ? "border-purple-500/50 text-purple-400" : "border-white/10 text-white/40")} title="Zodiac">
            <Compass size={16} />
          </button>
          <button onClick={() => setShowSacredGeometry(!showSacredGeometry)} className={cn("w-9 h-9 rounded-lg bg-black/70 backdrop-blur border flex items-center justify-center transition-all", showSacredGeometry ? "border-amber-500/50 text-amber-400" : "border-white/10 text-white/40")} title="Sacred Geometry">
            <Hexagon size={16} />
          </button>
          <button onClick={() => setShowOrbits(!showOrbits)} className={cn("w-9 h-9 rounded-lg bg-black/70 backdrop-blur border flex items-center justify-center transition-all", showOrbits ? "border-cyan-500/50 text-cyan-400" : "border-white/10 text-white/40")} title="Orbits">
            <CircleDot size={16} />
          </button>
        </div>

        <div className="absolute bottom-20 left-3 right-3 z-10">
          <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
            {planetStates.map(p => (
              <button
                key={p.name}
                onClick={() => setSelectedPlanet(selectedPlanet?.name === p.name ? null : p)}
                className={cn(
                  "shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1",
                  selectedPlanet?.name === p.name
                    ? "shadow-lg"
                    : "bg-black/60 border-white/10 hover:border-white/20"
                )}
                style={{
                  color: p.color,
                  backgroundColor: selectedPlanet?.name === p.name ? p.color + "20" : undefined,
                  borderColor: selectedPlanet?.name === p.name ? p.color + "60" : undefined,
                }}
              >
                <span>{p.symbol}</span>
                <span>{p.name}</span>
                <span className="text-[8px] opacity-60">{p.zodiac.symbol}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedPlanet && (
          <div className="absolute bottom-28 left-3 right-3 z-20 max-w-md mx-auto">
            <div
              className="bg-black/85 backdrop-blur-xl border rounded-xl p-4 shadow-2xl"
              style={{ borderColor: selectedPlanet.color + "40" }}
            >
              <button
                onClick={() => setSelectedPlanet(null)}
                className="absolute top-2 right-2 text-white/40 hover:text-white"
              >
                <X size={14} />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{ background: selectedPlanet.color + "30", border: `2px solid ${selectedPlanet.color}60` }}
                >
                  {selectedPlanet.symbol}
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: selectedPlanet.color }}>
                    {selectedPlanet.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: selectedPlanet.zodiac.color + "25", color: selectedPlanet.zodiac.color }}>
                      {selectedPlanet.zodiac.symbol} {selectedPlanet.zodiac.name}
                    </span>
                    <span className="text-[10px] text-white/40">{selectedPlanet.lon.toFixed(2)}&deg;</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-white/70 leading-relaxed mb-2">{selectedPlanet.description}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/5 rounded-lg p-1.5">
                  <div className="text-[10px] text-white/40">Distance</div>
                  <div className="text-xs font-bold font-mono" style={{ color: selectedPlanet.color }}>{selectedPlanet.r.toFixed(3)} AU</div>
                </div>
                <div className="bg-white/5 rounded-lg p-1.5">
                  <div className="text-[10px] text-white/40">Longitude</div>
                  <div className="text-xs font-bold font-mono" style={{ color: selectedPlanet.color }}>{selectedPlanet.lon.toFixed(1)}&deg;</div>
                </div>
                <div className="bg-white/5 rounded-lg p-1.5">
                  <div className="text-[10px] text-white/40">Frequency</div>
                  <div className="text-xs font-bold font-mono" style={{ color: selectedPlanet.color }}>{selectedPlanet.sacredFrequency || "---"}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[9px] text-white/30">Element:</span>
                <span className="text-[9px] font-bold" style={{ color: selectedPlanet.zodiac.color }}>{selectedPlanet.zodiac.element}</span>
                <span className="text-[9px] text-white/30 ml-auto">Zoom: {zoom.toFixed(1)}x</span>
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-14 right-14 z-10">
          <div className="bg-black/70 backdrop-blur border border-white/10 rounded-lg px-2 py-1.5 flex items-center gap-1">
            <button onClick={() => setCurrentDate(d => d - 86400000 * 365)} className="text-[10px] text-white/50 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10">&laquo;Yr</button>
            <button onClick={() => setCurrentDate(d => d - 86400000 * 30)} className="text-[10px] text-white/50 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10">&laquo;Mo</button>
            <button onClick={() => setCurrentDate(d => d - 86400000)} className="text-[10px] text-white/50 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10">&lsaquo;Day</button>
            <button onClick={() => setCurrentDate(Date.now())} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">NOW</button>
            <button onClick={() => setCurrentDate(d => d + 86400000)} className="text-[10px] text-white/50 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10">Day&rsaquo;</button>
            <button onClick={() => setCurrentDate(d => d + 86400000 * 30)} className="text-[10px] text-white/50 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10">Mo&raquo;</button>
            <button onClick={() => setCurrentDate(d => d + 86400000 * 365)} className="text-[10px] text-white/50 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10">Yr&raquo;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
