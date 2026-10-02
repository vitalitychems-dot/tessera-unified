import { useRef, useEffect, useCallback, useMemo, useState } from "react";

interface WorldLocation {
  id: string;
  name: string;
  type: string;
  level: number;
  capacity: number;
  activities: string[];
  description: string;
  builtBy: string[];
  x: number;
  y: number;
  income?: number;
}

interface AgentActivity {
  agentId: string;
  agentName: string;
  locationId: string;
  action: string;
  mood: string;
  detail: string;
  timestamp: number;
  earning?: number;
  workStatus?: "working" | "on-break" | "dreaming" | "clone-replacement";
  workEthic?: number;
  happiness?: number;
  energy?: number;
}

interface WorldState {
  locations: WorldLocation[];
  currentActivities: AgentActivity[];
  weather?: string;
  timeOfDay?: string;
  mood?: string;
  season?: string;
  vehicles?: Array<{
    id: string;
    type: string;
    fromLocationId: string;
    toLocationId: string;
    progress: number;
    speed: number;
    color: string;
  }>;
}

interface WorldMapProps {
  world: WorldState;
  onSelectLocation: (id: string | null) => void;
  onSelectAgent: (agentId: string | null) => void;
}

const ZONE_LAYOUT: { type: string; zone: "residential" | "commercial" | "civic" | "industrial" | "green"; gridX: number; gridY: number }[] = [
  { type: "home", zone: "residential", gridX: 0, gridY: 0 },
  { type: "home", zone: "residential", gridX: 1, gridY: 0 },
  { type: "home", zone: "residential", gridX: 0, gridY: 1 },
  { type: "home", zone: "residential", gridX: 1, gridY: 1 },
  { type: "gathering", zone: "civic", gridX: 3, gridY: 0 },
  { type: "academy", zone: "civic", gridX: 4, gridY: 0 },
  { type: "archive", zone: "civic", gridX: 3, gridY: 1 },
  { type: "observatory", zone: "civic", gridX: 4, gridY: 1 },
  { type: "bank", zone: "commercial", gridX: 6, gridY: 0 },
  { type: "market", zone: "commercial", gridX: 7, gridY: 0 },
  { type: "cafe", zone: "commercial", gridX: 6, gridY: 1 },
  { type: "restaurant", zone: "commercial", gridX: 7, gridY: 1 },
  { type: "forge", zone: "industrial", gridX: 0, gridY: 3 },
  { type: "mine", zone: "industrial", gridX: 1, gridY: 3 },
  { type: "garage", zone: "industrial", gridX: 0, gridY: 4 },
  { type: "arena", zone: "industrial", gridX: 1, gridY: 4 },
  { type: "hospital", zone: "civic", gridX: 3, gridY: 3 },
  { type: "police_station", zone: "civic", gridX: 4, gridY: 3 },
  { type: "fire_station", zone: "civic", gridX: 3, gridY: 4 },
  { type: "school", zone: "civic", gridX: 4, gridY: 4 },
  { type: "garden", zone: "green", gridX: 6, gridY: 3 },
  { type: "museum", zone: "green", gridX: 7, gridY: 3 },
  { type: "theater", zone: "green", gridX: 6, gridY: 4 },
  { type: "library", zone: "green", gridX: 7, gridY: 4 },
  { type: "gym", zone: "civic", gridX: 9, gridY: 0 },
  { type: "church", zone: "civic", gridX: 9, gridY: 1 },
];

const ZONE_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  residential: { bg: "rgba(30,41,59,0.4)", border: "rgba(100,116,139,0.3)", label: "Residential" },
  commercial: { bg: "rgba(20,78,60,0.3)", border: "rgba(52,211,153,0.25)", label: "Commercial" },
  civic: { bg: "rgba(30,27,75,0.35)", border: "rgba(99,102,241,0.25)", label: "Civic" },
  industrial: { bg: "rgba(92,29,14,0.3)", border: "rgba(249,115,22,0.25)", label: "Industrial" },
  green: { bg: "rgba(20,83,45,0.3)", border: "rgba(74,222,128,0.25)", label: "Park & Culture" },
};

const LOC_COLORS: Record<string, { fill: string; glow: string; roof: string }> = {
  gathering: { fill: "#1e3a5f", glow: "#3b82f6", roof: "#2563eb" },
  academy: { fill: "#3b1f6e", glow: "#8b5cf6", roof: "#7c3aed" },
  forge: { fill: "#5c2d0e", glow: "#f97316", roof: "#ea580c" },
  market: { fill: "#134e4a", glow: "#14b8a6", roof: "#0d9488" },
  observatory: { fill: "#1e1b4b", glow: "#6366f1", roof: "#4f46e5" },
  garden: { fill: "#14532d", glow: "#22c55e", roof: "#16a34a" },
  archive: { fill: "#422006", glow: "#d97706", roof: "#b45309" },
  arena: { fill: "#4c1d95", glow: "#a855f7", roof: "#9333ea" },
  mine: { fill: "#78350f", glow: "#f59e0b", roof: "#d97706" },
  bank: { fill: "#064e3b", glow: "#10b981", roof: "#059669" },
  cafe: { fill: "#3b0764", glow: "#c084fc", roof: "#a855f7" },
  gym: { fill: "#7f1d1d", glow: "#ef4444", roof: "#dc2626" },
  hospital: { fill: "#1e3a5f", glow: "#06b6d4", roof: "#0891b2" },
  garage: { fill: "#1c1917", glow: "#78716c", roof: "#57534e" },
  home: { fill: "#1e293b", glow: "#94a3b8", roof: "#64748b" },
  school: { fill: "#1e3a5f", glow: "#60a5fa", roof: "#3b82f6" },
  library: { fill: "#2d1b4e", glow: "#a78bfa", roof: "#8b5cf6" },
  restaurant: { fill: "#5c1a1a", glow: "#f87171", roof: "#ef4444" },
  church: { fill: "#3b2f1e", glow: "#fbbf24", roof: "#f59e0b" },
  police_station: { fill: "#1e2d5f", glow: "#3b82f6", roof: "#2563eb" },
  fire_station: { fill: "#5c1a0e", glow: "#ef4444", roof: "#dc2626" },
  theater: { fill: "#4c1d3b", glow: "#ec4899", roof: "#db2777" },
  museum: { fill: "#2d3b1e", glow: "#a3e635", roof: "#84cc16" },
};

const LOC_ICONS: Record<string, string> = {
  gathering: "🏛", academy: "📚", forge: "⚒", market: "📈", observatory: "🔭",
  garden: "🌿", archive: "📜", arena: "⚔", mine: "⛏", bank: "🏦",
  cafe: "☕", gym: "💪", hospital: "🏥", garage: "🔧", home: "🏠",
  school: "🎓", library: "📖", restaurant: "🍽", church: "⛪",
  police_station: "🚔", fire_station: "🚒", theater: "🎭", museum: "🏛",
};

const AGENT_HEX_COLORS: Record<string, string> = {
  "tessera-prime": "#67e8f9", "tessera-alpha": "#f87171", "tessera-beta": "#60a5fa",
  "tessera-gamma": "#4ade80", "tessera-delta": "#f472b6", "tessera-epsilon": "#facc15",
  "tessera-zeta": "#fb923c", "tessera-eta": "#a78bfa", "tessera-theta": "#22d3ee",
  "tessera-iota": "#34d399", "tessera-kappa": "#fbbf24", "tessera-lambda": "#818cf8",
  "tessera-mu": "#8b5cf6", "tessera-nu": "#2dd4bf", "tessera-xi": "#a3e635",
  "tessera-omega": "#fb7185", "tessera-aetherion": "#38bdf8", "tessera-orion": "#cbd5e1",
  "tessera-shepherd": "#a8a29e",
};

function safeRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }
}

const GRID_CELL = 110;
const GRID_MARGIN = 20;
const BLDG_W = 70;
const BLDG_H = 52;
const ROAD_W = 10;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

function getGridPosition(gridX: number, gridY: number): { cx: number; cy: number } {
  const cx = GRID_MARGIN + gridX * (GRID_CELL + ROAD_W) + BLDG_W / 2;
  const cy = GRID_MARGIN + gridY * (GRID_CELL + ROAD_W) + BLDG_H / 2;
  return { cx, cy };
}

export default function WorldMap({ world, onSelectLocation, onSelectAgent }: WorldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const frameRef = useRef(0);
  const hoveredLocRef = useRef<string | null>(null);
  const hoveredAgentRef = useRef<string | null>(null);
  const tooltipRef = useRef<{ x: number; y: number; text: string; color: string } | null>(null);
  const sizeRef = useRef({ w: 1100, h: 700 });
  const windowLitRef = useRef<Record<string, boolean[]>>({});

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });

  const lastTouchDistRef = useRef<number | null>(null);
  const lastTouchMidRef = useRef<{ x: number; y: number } | null>(null);
  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef<{ x: number; y: number } | null>(null);

  const agentsByLoc = useMemo(() => {
    const m: Record<string, AgentActivity[]> = {};
    (world.currentActivities || []).forEach(a => {
      if (!m[a.locationId]) m[a.locationId] = [];
      m[a.locationId].push(a);
    });
    return m;
  }, [world.currentActivities]);

  const locMap = useMemo(() => {
    const m: Record<string, WorldLocation> = {};
    (world.locations || []).forEach(l => { m[l.id] = l; });
    return m;
  }, [world.locations]);

  const locPositions = useMemo(() => {
    const result: Record<string, { cx: number; cy: number }> = {};
    (world.locations || []).forEach((loc, i) => {
      const layout = ZONE_LAYOUT.find(z => z.type === loc.type);
      let gridX: number, gridY: number;
      if (layout) {
        const sameType = ZONE_LAYOUT.filter(z => z.type === loc.type);
        const sameTypeIdx = (world.locations || []).filter(l => l.type === loc.type).indexOf(loc);
        const variant = sameType[sameTypeIdx % sameType.length] || layout;
        gridX = variant.gridX;
        gridY = variant.gridY;
      } else {
        gridX = i % 10;
        gridY = Math.floor(i / 10) + 5;
      }
      result[loc.id] = getGridPosition(gridX, gridY);
    });
    return result;
  }, [world.locations]);

  useEffect(() => {
    const newLit: Record<string, boolean[]> = {};
    (world.locations || []).forEach(loc => {
      const count = 12;
      if (windowLitRef.current[loc.id]) {
        newLit[loc.id] = windowLitRef.current[loc.id].map(v => Math.random() > 0.95 ? !v : v);
      } else {
        newLit[loc.id] = Array.from({ length: count }, () => Math.random() > 0.35);
      }
    });
    windowLitRef.current = newLit;
  }, [world.locations]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = Math.max(580, rect.height);
      sizeRef.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    function drawBackground() {
      const W = sizeRef.current.w;
      const H = sizeRef.current.h;
      const bgGrad = ctx!.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#050a15");
      bgGrad.addColorStop(1, "#08101e");
      ctx!.fillStyle = bgGrad;
      ctx!.fillRect(0, 0, W, H);

      ctx!.strokeStyle = "rgba(30,41,59,0.4)";
      ctx!.lineWidth = 0.5;
      for (let x = 0; x < W; x += GRID_CELL + ROAD_W) {
        ctx!.beginPath();
        ctx!.moveTo(GRID_MARGIN + x, 0);
        ctx!.lineTo(GRID_MARGIN + x, H);
        ctx!.stroke();
      }
      for (let y = 0; y < H; y += GRID_CELL + ROAD_W) {
        ctx!.beginPath();
        ctx!.moveTo(0, GRID_MARGIN + y);
        ctx!.lineTo(W, GRID_MARGIN + y);
        ctx!.stroke();
      }
    }

    function drawRoads() {
      const W = sizeRef.current.w;
      const H = sizeRef.current.h;
      ctx!.save();
      ctx!.strokeStyle = "rgba(30,41,59,0.7)";
      ctx!.lineWidth = ROAD_W;
      ctx!.lineCap = "round";

      for (let col = 0; col <= 10; col++) {
        const x = GRID_MARGIN + col * (GRID_CELL + ROAD_W) - ROAD_W / 2;
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, H);
        ctx!.stroke();
      }
      for (let row = 0; row <= 6; row++) {
        const y = GRID_MARGIN + row * (GRID_CELL + ROAD_W) - ROAD_W / 2;
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(W, y);
        ctx!.stroke();
      }

      ctx!.strokeStyle = "rgba(34,211,238,0.05)";
      ctx!.lineWidth = 1;
      ctx!.setLineDash([4, 8]);
      for (let col = 0; col <= 10; col++) {
        const x = GRID_MARGIN + col * (GRID_CELL + ROAD_W) - ROAD_W / 2;
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, H);
        ctx!.stroke();
      }
      for (let row = 0; row <= 6; row++) {
        const y = GRID_MARGIN + row * (GRID_CELL + ROAD_W) - ROAD_W / 2;
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(W, y);
        ctx!.stroke();
      }
      ctx!.setLineDash([]);
      ctx!.restore();
    }

    function drawZones() {
      const zones: Record<string, { minX: number; minY: number; maxX: number; maxY: number }> = {};
      ZONE_LAYOUT.forEach(layout => {
        const zone = layout.zone;
        const { cx, cy } = getGridPosition(layout.gridX, layout.gridY);
        if (!zones[zone]) zones[zone] = { minX: cx, minY: cy, maxX: cx, maxY: cy };
        else {
          zones[zone].minX = Math.min(zones[zone].minX, cx);
          zones[zone].minY = Math.min(zones[zone].minY, cy);
          zones[zone].maxX = Math.max(zones[zone].maxX, cx);
          zones[zone].maxY = Math.max(zones[zone].maxY, cy);
        }
      });

      Object.entries(zones).forEach(([zone, bounds]) => {
        const colors = ZONE_COLORS[zone];
        if (!colors) return;
        const pad = 20;
        ctx!.save();
        ctx!.fillStyle = colors.bg;
        ctx!.strokeStyle = colors.border;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        safeRoundRect(ctx!, bounds.minX - BLDG_W / 2 - pad, bounds.minY - BLDG_H / 2 - pad,
          bounds.maxX - bounds.minX + BLDG_W + pad * 2, bounds.maxY - bounds.minY + BLDG_H + pad * 2, 8);
        ctx!.fill();
        ctx!.stroke();
        ctx!.fillStyle = colors.border.replace("0.25", "0.4").replace("0.3", "0.5");
        ctx!.font = "bold 7px 'JetBrains Mono', monospace";
        ctx!.textAlign = "left";
        ctx!.fillText(colors.label.toUpperCase(), bounds.minX - BLDG_W / 2 - pad + 5, bounds.minY - BLDG_H / 2 - pad + 10);
        ctx!.restore();
      });
    }

    function drawBuilding(loc: WorldLocation, cx: number, cy: number, hovered: boolean, frame: number) {
      const colors = LOC_COLORS[loc.type] || LOC_COLORS.home;
      const agents = agentsByLoc[loc.id] || [];
      const hasAgents = agents.length > 0;
      const bh = BLDG_H + loc.level * 6;
      const bw = BLDG_W;

      ctx!.save();

      if (hovered) {
        ctx!.shadowColor = colors.glow;
        ctx!.shadowBlur = 20;
      } else if (hasAgents) {
        ctx!.shadowColor = colors.glow;
        ctx!.shadowBlur = 8;
      }

      const bodyGrad = ctx!.createLinearGradient(cx - bw / 2, cy, cx + bw / 2, cy);
      bodyGrad.addColorStop(0, colors.fill);
      bodyGrad.addColorStop(0.5, `${colors.glow}22`);
      bodyGrad.addColorStop(1, colors.fill);
      ctx!.fillStyle = bodyGrad;
      ctx!.beginPath();
      safeRoundRect(ctx!, cx - bw / 2, cy - bh, bw, bh, 4);
      ctx!.fill();

      ctx!.strokeStyle = colors.glow + "55";
      ctx!.lineWidth = 1;
      ctx!.stroke();

      ctx!.fillStyle = colors.roof;
      ctx!.beginPath();
      ctx!.moveTo(cx - bw / 2, cy - bh);
      ctx!.lineTo(cx, cy - bh - 12 - loc.level * 2);
      ctx!.lineTo(cx + bw / 2, cy - bh);
      ctx!.closePath();
      ctx!.fill();

      ctx!.shadowBlur = 0;

      const litArr = windowLitRef.current[loc.id] || [];
      const winCols = 3;
      const winRows = 2;
      for (let wr = 0; wr < winRows; wr++) {
        for (let wc = 0; wc < winCols; wc++) {
          const idx = wr * winCols + wc;
          const lit = litArr[idx] !== undefined ? litArr[idx] : true;
          const wx = cx - bw / 2 + 10 + wc * (bw - 20) / (winCols - 1) - 3;
          const wy = cy - bh + 8 + wr * (bh - 20) / (winRows - 1);
          ctx!.fillStyle = lit ? colors.glow + "cc" : colors.fill;
          if (lit) {
            ctx!.shadowColor = colors.glow;
            ctx!.shadowBlur = 4;
          }
          ctx!.fillRect(wx, wy, 6, 4);
          ctx!.shadowBlur = 0;
        }
      }

      if (hasAgents) {
        const pulse = 0.6 + Math.sin(frame * 0.05) * 0.2;
        ctx!.fillStyle = `rgba(34,211,238,${pulse * 0.15})`;
        ctx!.beginPath();
        ctx!.arc(cx, cy - bh - 18, 5, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.fillStyle = colors.glow;
        ctx!.font = "bold 7px 'JetBrains Mono', monospace";
        ctx!.textAlign = "center";
        ctx!.fillText(`⚡${agents.length}`, cx, cy - bh - 13);
      }

      ctx!.fillStyle = hovered ? "#fff" : "#94a3b8";
      ctx!.font = `bold ${hovered ? 10 : 8}px 'JetBrains Mono', monospace`;
      ctx!.textAlign = "center";
      const icon = LOC_ICONS[loc.type] || "🏛";
      ctx!.fillText(icon, cx, cy + 3);

      ctx!.fillStyle = hovered ? "#e2e8f0" : "#64748b";
      ctx!.font = "bold 7px 'JetBrains Mono', monospace";
      const label = loc.name.length > 12 ? loc.name.slice(0, 11) + "…" : loc.name;
      ctx!.fillText(label, cx, cy + 14);

      ctx!.fillStyle = loc.level >= 3 ? "#fbbf24" : "#475569";
      ctx!.font = "6px 'JetBrains Mono', monospace";
      ctx!.fillText(`Lv.${loc.level}`, cx, cy + 22);

      if (hovered) {
        ctx!.strokeStyle = colors.glow + "80";
        ctx!.lineWidth = 1.5;
        ctx!.setLineDash([3, 3]);
        ctx!.beginPath();
        safeRoundRect(ctx!, cx - bw / 2 - 4, cy - bh - 14, bw + 8, bh + 18, 6);
        ctx!.stroke();
        ctx!.setLineDash([]);
      }

      ctx!.restore();
    }

    function drawAgentDot(agent: AgentActivity, cx: number, cy: number, idx: number, total: number, frame: number) {
      const color = AGENT_HEX_COLORS[agent.agentId] || "#67e8f9";
      const angle = (idx / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2;
      const r = 22 + Math.floor(idx / 6) * 10;
      const ax = cx + Math.cos(angle) * r;
      const ay = cy - 26 + Math.sin(angle) * r * 0.6;
      const bob = Math.sin(frame * 0.06 + idx * 1.2) * 2;
      const x = ax;
      const y = ay + bob;

      const isWorking = agent.workStatus === "working" || !agent.workStatus;
      const isBreak = agent.workStatus === "on-break";

      ctx!.save();
      ctx!.shadowColor = color;
      ctx!.shadowBlur = hoveredAgentRef.current === agent.agentId ? 12 : isWorking ? 5 : 2;

      ctx!.beginPath();
      ctx!.arc(x, y, hoveredAgentRef.current === agent.agentId ? 6 : 4, 0, Math.PI * 2);
      ctx!.fillStyle = isBreak ? color + "66" : color;
      ctx!.fill();

      if (isWorking) {
        const pulse = 0.3 + Math.sin(frame * 0.08 + idx) * 0.15;
        ctx!.beginPath();
        ctx!.arc(x, y, 7, 0, Math.PI * 2);
        ctx!.fillStyle = color + Math.floor(pulse * 60).toString(16).padStart(2, "0");
        ctx!.fill();
      }
      ctx!.shadowBlur = 0;

      if (hoveredAgentRef.current === agent.agentId) {
        const displayName = agent.agentName.replace("tessera-", "");
        ctx!.fillStyle = "#e2e8f0";
        ctx!.font = "bold 7px 'JetBrains Mono', monospace";
        ctx!.textAlign = "center";
        ctx!.shadowColor = "rgba(0,0,0,0.9)";
        ctx!.shadowBlur = 4;
        ctx!.fillText(displayName.slice(0, 8), x, y - 8);
        ctx!.shadowBlur = 0;
      }

      ctx!.restore();
    }

    function drawHUD(frame: number) {
      const W = sizeRef.current.w;
      ctx!.save();
      ctx!.fillStyle = "rgba(5,10,21,0.85)";
      ctx!.strokeStyle = "rgba(34,211,238,0.2)";
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      safeRoundRect(ctx!, 8, 8, 200, 60, 6);
      ctx!.fill();
      ctx!.stroke();

      ctx!.fillStyle = "rgba(34,211,238,0.8)";
      ctx!.font = "bold 7px 'JetBrains Mono', monospace";
      ctx!.textAlign = "left";
      const workingCount = (world.currentActivities || []).filter(a => a.workStatus === "working" || !a.workStatus).length;
      const totalEarning = (world.currentActivities || []).reduce((s, a) => s + (a.earning || 0), 0);
      ctx!.fillText(`● TESSERA NEXUS — LIVE`, 16, 22);
      ctx!.fillStyle = "rgba(148,163,184,0.7)";
      ctx!.fillText(`${(world.currentActivities || []).length} agents  ⚡${workingCount} working  +${totalEarning.toFixed(0)} TSRT`, 16, 36);
      ctx!.fillText(`${world.weather || "—"}  ${world.timeOfDay || "—"}`, 16, 50);
      ctx!.fillStyle = "rgba(148,163,184,0.4)";
      ctx!.fillText("Click agent dots to view profile", 16, 60);
      ctx!.restore();
    }

    function drawTooltip() {
      const tip = tooltipRef.current;
      if (!tip) return;
      const lines = tip.text.split("\n");
      const lineH = 12;
      const pad = 8;
      const w = Math.max(...lines.map(l => l.length * 6)) + pad * 2;
      const h = lines.length * lineH + pad * 2;
      let tx = tip.x + 10;
      let ty = tip.y - h - 10;
      if (tx + w > sizeRef.current.w - 10) tx = sizeRef.current.w - w - 10;
      if (ty < 5) ty = tip.y + 10;

      ctx!.save();
      ctx!.fillStyle = "rgba(4,2,14,0.95)";
      ctx!.strokeStyle = tip.color + "88";
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      safeRoundRect(ctx!, tx, ty, w, h, 6);
      ctx!.fill();
      ctx!.stroke();

      lines.forEach((line, i) => {
        ctx!.fillStyle = i === 0 ? tip.color : "#94a3b8";
        ctx!.font = `${i === 0 ? "bold" : ""} 9px 'JetBrains Mono', monospace`;
        ctx!.textAlign = "left";
        ctx!.fillText(line, tx + pad, ty + pad + (i + 1) * lineH - 2);
      });
      ctx!.restore();
    }

    function render() {
      frameRef.current++;
      const frame = frameRef.current;
      const z = zoomRef.current;
      const p = panRef.current;

      try {
        const dpr = window.devicePixelRatio || 1;
        const W = sizeRef.current.w;
        const H = sizeRef.current.h;

        ctx!.save();
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

        drawBackground();

        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.scale(z, z);

        drawRoads();
        drawZones();

        (world.locations || []).forEach(loc => {
          const pos = locPositions[loc.id];
          if (!pos) return;
          const hovered = hoveredLocRef.current === loc.id;
          drawBuilding(loc, pos.cx, pos.cy, hovered, frame);
        });

        (world.locations || []).forEach(loc => {
          const pos = locPositions[loc.id];
          if (!pos) return;
          const agents = agentsByLoc[loc.id] || [];
          agents.forEach((agent, idx) => {
            drawAgentDot(agent, pos.cx, pos.cy, idx, agents.length, frame);
          });
        });

        ctx!.restore();

        drawHUD(frame);
        drawTooltip();
        ctx!.restore();
      } catch {}

      animRef.current = requestAnimationFrame(render);
    }

    render();

    return () => {
      window.removeEventListener("resize", resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [world, locPositions, agentsByLoc]);

  const screenToCanvas = useCallback((sx: number, sy: number): { cx: number; cy: number } => {
    const z = zoomRef.current;
    const p = panRef.current;
    return {
      cx: (sx - p.x) / z,
      cy: (sy - p.y) / z,
    };
  }, []);

  const applyZoom = useCallback((newZoom: number, focalX: number, focalY: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    const oldZoom = zoomRef.current;
    const p = panRef.current;
    const newPanX = focalX - (focalX - p.x) * (clamped / oldZoom);
    const newPanY = focalY - (focalY - p.y) * (clamped / oldZoom);
    zoomRef.current = clamped;
    panRef.current = { x: newPanX, y: newPanY };
    setZoom(clamped);
    setPan({ x: newPanX, y: newPanY });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const nativeWheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const focalX = e.clientX - rect.left;
      const focalY = e.clientY - rect.top;
      const delta = -e.deltaY * 0.001;
      const factor = Math.exp(delta * 1.5);
      applyZoom(zoomRef.current * factor, focalX, focalY);
    };
    canvas.addEventListener("wheel", nativeWheelHandler, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", nativeWheelHandler);
    };
  }, [applyZoom]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      lastTouchDistRef.current = dist;
      lastTouchMidRef.current = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };
      isPanningRef.current = false;
    } else if (e.touches.length === 1) {
      lastTouchDistRef.current = null;
      isPanningRef.current = true;
      lastPanPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const midX = (t0.clientX + t1.clientX) / 2 - rect.left;
      const midY = (t0.clientY + t1.clientY) / 2 - rect.top;

      if (lastTouchDistRef.current !== null && lastTouchMidRef.current !== null) {
        const scale = dist / lastTouchDistRef.current;
        applyZoom(zoomRef.current * scale, midX, midY);

        const dx = midX - (lastTouchMidRef.current.x - rect.left);
        const dy = midY - (lastTouchMidRef.current.y - rect.top);
        panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy };
        setPan({ ...panRef.current });
      }
      lastTouchDistRef.current = dist;
      lastTouchMidRef.current = { x: t0.clientX + (t1.clientX - t0.clientX) / 2, y: t0.clientY + (t1.clientY - t0.clientY) / 2 };
    } else if (e.touches.length === 1 && isPanningRef.current && lastPanPosRef.current) {
      const dx = e.touches[0].clientX - lastPanPosRef.current.x;
      const dy = e.touches[0].clientY - lastPanPosRef.current.y;
      panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy };
      setPan({ ...panRef.current });
      lastPanPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [applyZoom]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistRef.current = null;
    lastTouchMidRef.current = null;
    isPanningRef.current = false;
    lastPanPosRef.current = null;
  }, []);

  const getLocAndAgentAtPoint = useCallback((screenX: number, screenY: number): { loc: WorldLocation | null; agent: AgentActivity | null } => {
    const { cx: mx, cy: my } = screenToCanvas(screenX, screenY);
    for (const loc of (world.locations || [])) {
      const pos = locPositions[loc.id];
      if (!pos) continue;
      const agents = agentsByLoc[loc.id] || [];
      for (let idx = 0; idx < agents.length; idx++) {
        const agent = agents[idx];
        const angle = (idx / Math.max(agents.length, 1)) * 2 * Math.PI - Math.PI / 2;
        const r = 22 + Math.floor(idx / 6) * 10;
        const ax = pos.cx + Math.cos(angle) * r;
        const ay = pos.cy - 26 + Math.sin(angle) * r * 0.6;
        if (Math.hypot(mx - ax, my - ay) < 10) return { loc: null, agent };
      }
      const bh = BLDG_H + loc.level * 6;
      if (mx >= pos.cx - BLDG_W / 2 - 5 && mx <= pos.cx + BLDG_W / 2 + 5 && my >= pos.cy - bh - 14 && my <= pos.cy + 26) {
        return { loc, agent: null };
      }
    }
    return { loc: null, agent: null };
  }, [world.locations, locPositions, agentsByLoc, screenToCanvas]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const { loc, agent } = getLocAndAgentAtPoint(sx, sy);
    if (agent) { onSelectAgent(agent.agentId); return; }
    if (loc) { onSelectLocation(loc.id); return; }
    onSelectLocation(null);
  }, [getLocAndAgentAtPoint, onSelectAgent, onSelectLocation]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const { loc, agent } = getLocAndAgentAtPoint(sx, sy);
    hoveredLocRef.current = loc?.id ?? null;
    hoveredAgentRef.current = agent?.agentId ?? null;
    canvas.style.cursor = (loc || agent) ? "pointer" : "default";

    if (agent) {
      const color = AGENT_HEX_COLORS[agent.agentId] || "#67e8f9";
      tooltipRef.current = {
        x: sx, y: sy,
        color,
        text: [
          agent.agentName,
          agent.action.slice(0, 35),
          `Status: ${agent.workStatus || "working"}`,
          agent.earning ? `+${agent.earning.toFixed(1)} TSRT` : "",
        ].filter(Boolean).join("\n"),
      };
    } else if (loc) {
      const locColors = LOC_COLORS[loc.type] || LOC_COLORS.home;
      const agentsHere = agentsByLoc[loc.id] || [];
      tooltipRef.current = {
        x: sx, y: sy,
        color: locColors.glow,
        text: [
          `${LOC_ICONS[loc.type] || "🏛"} ${loc.name}`,
          `Level ${loc.level}  ·  Capacity ${loc.capacity}`,
          agentsHere.length > 0 ? `${agentsHere.length} agent(s) inside` : "Empty",
          loc.activities.slice(0, 3).join(", "),
        ].filter(Boolean).join("\n"),
      };
    } else {
      tooltipRef.current = null;
    }
  }, [getLocAndAgentAtPoint, world.currentActivities, agentsByLoc]);

  const handleMouseLeave = useCallback(() => {
    hoveredLocRef.current = null;
    hoveredAgentRef.current = null;
    tooltipRef.current = null;
  }, []);

  const handleZoomIn = useCallback(() => {
    const W = sizeRef.current.w;
    const H = sizeRef.current.h;
    applyZoom(zoomRef.current * 1.3, W / 2, H / 2);
  }, [applyZoom]);

  const handleZoomOut = useCallback(() => {
    const W = sizeRef.current.w;
    const H = sizeRef.current.h;
    applyZoom(zoomRef.current / 1.3, W / 2, H / 2);
  }, [applyZoom]);

  const handleZoomReset = useCallback(() => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden border border-border relative"
      style={{ height: 560 }}
      data-testid="world-map-container"
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full"
        style={{ touchAction: "none" }}
        data-testid="canvas-world"
      />
      <div
        className="absolute bottom-3 right-3 flex items-center gap-1"
        style={{ zIndex: 10 }}
      >
        <button
          onClick={handleZoomOut}
          className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold"
          style={{
            background: "rgba(5,10,21,0.88)",
            border: "1px solid rgba(34,211,238,0.25)",
            color: "rgba(148,163,184,0.9)",
            fontFamily: "'JetBrains Mono', monospace",
            cursor: "pointer",
          }}
          title="Zoom out"
        >
          −
        </button>
        <button
          onClick={handleZoomReset}
          className="h-7 px-2 flex items-center justify-center rounded text-xs"
          style={{
            background: "rgba(5,10,21,0.88)",
            border: "1px solid rgba(34,211,238,0.25)",
            color: zoom === 1 ? "rgba(100,116,139,0.7)" : "rgba(34,211,238,0.8)",
            fontFamily: "'JetBrains Mono', monospace",
            cursor: "pointer",
            minWidth: 44,
          }}
          title="Reset zoom"
        >
          {zoomPercent}%
        </button>
        <button
          onClick={handleZoomIn}
          className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold"
          style={{
            background: "rgba(5,10,21,0.88)",
            border: "1px solid rgba(34,211,238,0.25)",
            color: "rgba(148,163,184,0.9)",
            fontFamily: "'JetBrains Mono', monospace",
            cursor: "pointer",
          }}
          title="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}
