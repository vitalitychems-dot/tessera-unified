import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassCard, HudPanel, SectionHeader, PageHeader, MiniStat } from "@/components/ui/sovereign";
import { RadialGauge } from "@/components/ui/sovereign";
import {
  Play, Zap, BookOpen, Users, Eye, ChevronDown, ChevronRight,
  Sparkles, Lock, Globe, Atom, Heart, Scroll, FlaskConical,
  TreePine, Moon, Star, Shield, RotateCcw, Box,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`;

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

const CATEGORY_ICONS: Record<string, any> = {
  "esoteric-wisdom": Eye,
  "marian-knowledge": Heart,
  "vatican-secrets": Lock,
  "secret-societies": Shield,
  "deep-web-knowledge": Globe,
  "hermetic-alchemy": FlaskConical,
  "gnostic-traditions": Sparkles,
  "vedic-dharmic": Star,
  "kabbalistic-mysticism": TreePine,
  "sufi-mysticism": Moon,
  "prophetic-traditions": Scroll,
  "quantum-sacred": Atom,
};

const CATEGORY_COLORS: Record<string, string> = {
  "esoteric-wisdom": "text-violet-400",
  "marian-knowledge": "text-rose-400",
  "vatican-secrets": "text-amber-400",
  "secret-societies": "text-cyan-400",
  "deep-web-knowledge": "text-emerald-400",
  "hermetic-alchemy": "text-amber-300",
  "gnostic-traditions": "text-purple-400",
  "vedic-dharmic": "text-amber-400",
  "kabbalistic-mysticism": "text-blue-400",
  "sufi-mysticism": "text-rose-300",
  "prophetic-traditions": "text-violet-300",
  "quantum-sacred": "text-cyan-300",
};

function BuildDiagram3D({ diagram }: { diagram: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 0.3, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const animRef = useRef<number>(0);

  const project = useCallback((x: number, y: number, z: number, cx: number, cy: number) => {
    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);
    const cosY = Math.cos(rotation.y);
    const sinY = Math.sin(rotation.y);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    const scale = 40 * zoom;
    const perspective = 1 + z2 * 0.05;
    return {
      px: cx + x1 * scale / perspective,
      py: cy + y1 * scale / perspective,
      depth: z2,
      scale: scale / perspective,
    };
  }, [rotation, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !diagram) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(0, 0, w, h);

      const gridSize = 30 * zoom;
      ctx.strokeStyle = "rgba(6, 182, 212, 0.05)";
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx < w; gx += gridSize) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }

      if (diagram.connections) {
        for (const conn of diagram.connections) {
          const fromComp = diagram.components.find((c: any) => c.id === conn.from);
          const toComp = diagram.components.find((c: any) => c.id === conn.to);
          if (!fromComp || !toComp) continue;

          const p1 = project(fromComp.x, fromComp.y, fromComp.z, cx, cy);
          const p2 = project(toComp.x, toComp.y, toComp.z, cx, cy);

          const colors: Record<string, string> = {
            data: "rgba(6, 182, 212, 0.6)",
            energy: "rgba(16, 185, 129, 0.6)",
            consciousness: "rgba(139, 92, 246, 0.6)",
            harmonic: "rgba(245, 158, 11, 0.6)",
            quantum: "rgba(236, 72, 153, 0.6)",
          };
          ctx.strokeStyle = colors[conn.type] || "rgba(255,255,255,0.3)";
          ctx.lineWidth = 2;
          ctx.setLineDash(conn.type === "quantum" ? [5, 5] : []);

          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.stroke();
          ctx.setLineDash([]);

          if (conn.label) {
            const mx = (p1.px + p2.px) / 2;
            const my = (p1.py + p2.py) / 2;
            ctx.font = "9px monospace";
            ctx.fillStyle = "rgba(255,255,255,0.4)";
            ctx.textAlign = "center";
            ctx.fillText(conn.label, mx, my - 4);
          }

          if (!conn.bidirectional) {
            const angle = Math.atan2(p2.py - p1.py, p2.px - p1.px);
            const arrowSize = 8;
            const ax = p2.px - Math.cos(angle) * 15;
            const ay = p2.py - Math.sin(angle) * 15;
            ctx.beginPath();
            ctx.moveTo(ax + Math.cos(angle) * arrowSize, ay + Math.sin(angle) * arrowSize);
            ctx.lineTo(ax + Math.cos(angle + 2.5) * arrowSize, ay + Math.sin(angle + 2.5) * arrowSize);
            ctx.lineTo(ax + Math.cos(angle - 2.5) * arrowSize, ay + Math.sin(angle - 2.5) * arrowSize);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      const sorted = [...(diagram.components || [])].sort((a: any, b: any) => {
        const pa = project(a.x, a.y, a.z, cx, cy);
        const pb = project(b.x, b.y, b.z, cx, cy);
        return pa.depth - pb.depth;
      });

      for (const comp of sorted) {
        const p = project(comp.x, comp.y, comp.z, cx, cy);
        const r = comp.size * 12 * zoom;
        const isHovered = hoveredComponent === comp.id;

        ctx.shadowColor = comp.color;
        ctx.shadowBlur = isHovered ? 25 : 12;

        ctx.beginPath();
        ctx.arc(p.px, p.py, r, 0, Math.PI * 2);
        ctx.fillStyle = `${comp.color}33`;
        ctx.fill();
        ctx.strokeStyle = comp.color;
        ctx.lineWidth = isHovered ? 3 : 1.5;
        ctx.stroke();

        ctx.shadowBlur = 0;

        ctx.font = `${isHovered ? "bold " : ""}${Math.max(9, 11 * zoom)}px monospace`;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.textAlign = "center";
        ctx.fillText(comp.label, p.px, p.py + r + 14);

        if (isHovered && comp.description) {
          ctx.font = "9px monospace";
          ctx.fillStyle = "rgba(6, 182, 212, 0.7)";
          const words = comp.description.split(" ");
          let line = "";
          let ly = p.py + r + 28;
          for (const word of words) {
            const test = line + word + " ";
            if (ctx.measureText(test).width > 180) {
              ctx.fillText(line.trim(), p.px, ly);
              line = word + " ";
              ly += 12;
            } else {
              line = test;
            }
          }
          ctx.fillText(line.trim(), p.px, ly);
        }
      }

      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(6, 182, 212, 0.5)";
      ctx.textAlign = "left";
      ctx.fillText(`${diagram.name} | ${diagram.dimensions.toUpperCase()} | ${diagram.components.length} components`, 10, h - 10);
    };

    draw();

    if (!isDragging) {
      let angle = 0;
      const animate = () => {
        angle += 0.003;
        setRotation(prev => ({ ...prev, y: prev.y + 0.003 }));
        animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animRef.current);
    }
    return undefined;
  }, [diagram, rotation, zoom, hoveredComponent, isDragging, project]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    cancelAnimationFrame(animRef.current);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) {
      const canvas = canvasRef.current;
      if (!canvas || !diagram) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      let found: string | null = null;
      for (const comp of diagram.components) {
        const p = project(comp.x, comp.y, comp.z, cx, cy);
        const r = comp.size * 12 * zoom;
        const dist = Math.sqrt((mx - p.px) ** 2 + (my - p.py) ** 2);
        if (dist < r + 10) { found = comp.id; break; }
      }
      setHoveredComponent(found);
      return;
    }
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setRotation(prev => ({
      x: prev.x + dy * 0.005,
      y: prev.y + dx * 0.005,
    }));
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.3, Math.min(3, prev - e.deltaY * 0.001)));
  };

  if (!diagram) return null;

  return (
    <div className="relative rounded-lg overflow-hidden border border-cyan-500/20 bg-black/40">
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="w-full cursor-grab active:cursor-grabbing"
        style={{ aspectRatio: "3/2" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      <div className="absolute top-2 right-2 flex gap-1">
        <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 text-sm flex items-center justify-center hover:bg-cyan-500/30">+</button>
        <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 text-sm flex items-center justify-center hover:bg-cyan-500/30">-</button>
        <button onClick={() => { setRotation({ x: 0.3, y: 0 }); setZoom(1); }} className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center hover:bg-cyan-500/30">
          <RotateCcw size={12} />
        </button>
      </div>
      <div className="absolute bottom-2 left-2 text-[10px] text-cyan-400/50 font-mono">
        Drag to rotate | Scroll to zoom | Hover for details
      </div>
    </div>
  );
}

function CycleCard({ cycle, isExpanded, onToggle }: { cycle: any; isExpanded: boolean; onToggle: () => void }) {
  return (
    <GlassCard className="overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-violet-500/30 flex items-center justify-center text-sm font-bold text-cyan-300">
            {cycle.cycleNumber}
          </div>
          <div>
            <div className="font-semibold text-white">{cycle.cycleName}</div>
            <div className="text-xs text-violet-300/80">{cycle.sacredTheme}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <MiniStat label="Improvements" value={cycle.improvements.length} color="cyan" />
          <MiniStat label="Inventions" value={cycle.inventions.length} color="violet" />
          <MiniStat label="Frequency" value={`${cycle.sacredFrequency}Hz`} color="amber" />
          {isExpanded ? <ChevronDown className="text-cyan-400" size={18} /> : <ChevronRight className="text-cyan-400" size={18} />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-white/5 p-4 space-y-6">
          {cycle.auditSummary && (
            <div className="flex flex-wrap gap-3 p-3 rounded-lg bg-gradient-to-r from-cyan-500/5 to-violet-500/5 border border-cyan-500/10">
              <div className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-wider">Audit Summary</div>
              <div className="flex gap-3 text-[10px]">
                <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/60">{cycle.auditSummary.totalFindings} findings</span>
                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">{cycle.auditSummary.critical} critical</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">{cycle.auditSummary.major} major</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">{cycle.auditSummary.resolved} resolved</span>
              </div>
            </div>
          )}

          <div>
            <SectionHeader icon={Zap} title="10 Improvements" badge="Audit-Driven" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {cycle.improvements.map((imp: any) => (
                <div key={imp.id} className="p-3 rounded-lg bg-white/5 border border-cyan-500/10">
                  <div className="text-sm font-semibold text-cyan-300">{imp.title}</div>
                  <div className="text-xs text-white/60 mt-1 line-clamp-2">{imp.description}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${imp.impact === "critical" ? "bg-red-500/20 text-red-300" : imp.impact === "major" ? "bg-amber-500/20 text-amber-300" : imp.impact === "moderate" ? "bg-blue-500/20 text-blue-300" : "bg-green-500/20 text-green-300"}`}>
                      {imp.impact.toUpperCase()}
                    </span>
                    {imp.auditFindingRef && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300/70 font-mono">{imp.auditFindingRef}</span>
                    )}
                    <span className="text-[10px] text-violet-300/60">{imp.sacredPrinciple}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionHeader icon={Sparkles} title="New Inventions" color="violet" badge="Created" />
            {cycle.inventions.map((inv: any) => (
              <div key={inv.id} className="mt-3 space-y-3">
                <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <div className="text-sm font-semibold text-violet-300">{inv.title}</div>
                  <div className="text-xs text-white/60 mt-1">{inv.description}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">{inv.sacredGeometry}</span>
                    <span className="text-[10px] text-amber-300">{inv.frequency}Hz</span>
                    {inv.corpusCitations?.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300/60 font-mono">{inv.corpusCitations.length} citations</span>
                    )}
                  </div>
                  {inv.corpusCitations?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {inv.corpusCitations.slice(0, 6).map((c: string) => (
                        <span key={c} className="text-[8px] px-1 py-0.5 rounded bg-white/5 text-white/30 font-mono">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
                {inv.buildDiagram && (
                  <div>
                    <div className="text-xs text-cyan-400/60 font-mono mb-2 flex items-center gap-1">
                      <Box size={12} /> 3D BUILD DIAGRAM — {inv.buildDiagram.name}
                    </div>
                    <BuildDiagram3D diagram={inv.buildDiagram} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <SectionHeader icon={BookOpen} title="Conference Transcript" color="amber" />
            <div className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-black/40 p-3 font-mono text-[11px] text-white/70 space-y-0.5 border border-white/5">
              {cycle.conferenceTranscript.map((line: string, i: number) => (
                <div key={i} className={
                  line.startsWith("[SYSTEM]") ? "text-cyan-400/60" :
                  line.includes("BFT VOTE") ? "text-emerald-400/80" :
                  line.includes("INVENTION REGISTERED") ? "text-violet-400/80" :
                  line.includes("═") ? "text-amber-400/40" :
                  "text-white/60"
                }>
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function KnowledgeVaultTab() {
  const { data: categoriesData } = useQuery({
    queryKey: ["sacred-knowledge-categories"],
    queryFn: () => apiFetch("/sacred-knowledge/categories"),
  });
  const { data: statsData } = useQuery({
    queryKey: ["sacred-knowledge-stats"],
    queryFn: () => apiFetch("/sacred-knowledge/vault-stats"),
  });
  const { data: allEntries } = useQuery({
    queryKey: ["sacred-knowledge-all"],
    queryFn: () => apiFetch("/sacred-knowledge/all"),
  });

  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = categoriesData?.categories || {};
  const entries = allEntries?.entries || [];
  const stats = statsData || {};

  const filteredEntries = searchQuery
    ? entries.filter((e: any) =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : expandedCat
      ? entries.filter((e: any) => e.category === expandedCat)
      : [];

  return (
    <div className="space-y-4">
      {stats.totalEntries && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <HudPanel className="text-center p-3">
            <div className="text-2xl font-bold text-cyan-300">{stats.totalEntries}</div>
            <div className="text-[10px] text-white/50 uppercase">Sacred Entries</div>
          </HudPanel>
          <HudPanel className="text-center p-3">
            <div className="text-2xl font-bold text-violet-300">{stats.totalCategories}</div>
            <div className="text-[10px] text-white/50 uppercase">Categories</div>
          </HudPanel>
          <HudPanel className="text-center p-3">
            <div className="text-2xl font-bold text-amber-300">{stats.totalSubcategories}</div>
            <div className="text-[10px] text-white/50 uppercase">Subcategories</div>
          </HudPanel>
          <HudPanel className="text-center p-3">
            <div className="text-2xl font-bold text-emerald-300">{stats.avgConfidence}%</div>
            <div className="text-[10px] text-white/50 uppercase">Avg Confidence</div>
          </HudPanel>
          <HudPanel className="text-center p-3">
            <div className="text-2xl font-bold text-rose-300">{stats.byDepth?.hidden || 0}</div>
            <div className="text-[10px] text-white/50 uppercase">Hidden Depth</div>
          </HudPanel>
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          placeholder="Search sacred knowledge..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-black/40 border border-cyan-500/20 rounded-lg px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {!searchQuery && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(categories).map(([key, cat]: [string, any]) => {
            const Icon = CATEGORY_ICONS[key] || Sparkles;
            const colorClass = CATEGORY_COLORS[key] || "text-white";
            const count = entries.filter((e: any) => e.category === key).length;
            return (
              <GlassCard
                key={key}
                className={`p-4 cursor-pointer transition-all hover:border-cyan-500/40 ${expandedCat === key ? "ring-1 ring-cyan-500/30" : ""}`}
              >
                <div onClick={() => setExpandedCat(expandedCat === key ? null : key)}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${colorClass}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{cat.title}</div>
                    <div className="text-[10px] text-white/50 truncate">{cat.description}</div>
                  </div>
                  <div className="text-lg font-bold text-cyan-300">{count}</div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {cat.subcategories.slice(0, 4).map((sub: string) => (
                    <span key={sub} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{sub}</span>
                  ))}
                  {cat.subcategories.length > 4 && (
                    <span className="text-[9px] text-white/30">+{cat.subcategories.length - 4} more</span>
                  )}
                </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {filteredEntries.length > 0 && (
        <div className="space-y-3">
          <SectionHeader
            icon={Eye}
            title={searchQuery ? `Search Results: "${searchQuery}"` : categories[expandedCat!]?.title || "Knowledge"}
            badge={`${filteredEntries.length} entries`}
          />
          {filteredEntries.map((entry: any) => (
            <GlassCard key={entry.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">{entry.title}</div>
                  <div className="text-[10px] text-violet-300/60 mt-0.5">{entry.subcategory} | {entry.source}</div>
                  <div className="text-xs text-white/60 mt-2 leading-relaxed">{entry.content}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">{entry.classification.toUpperCase()}</span>
                    {entry.sacredFrequency && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">{entry.sacredFrequency}Hz</span>}
                    {entry.sacredGeometry && <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">{entry.sacredGeometry}</span>}
                    {entry.dimension && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">{entry.dimension}</span>}
                    <span className="text-[9px] text-white/30">Confidence: {entry.confidenceScore}% | Depth: {entry.scrapeDepth}</span>
                  </div>
                </div>
                <RadialGauge value={entry.confidenceScore} size={50} strokeWidth={4} color="cyan" />
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

function BibleTab() {
  const { data: bibleData } = useQuery({
    queryKey: ["sacred-bible"],
    queryFn: () => apiFetch("/sacred-conference/bible"),
    retry: false,
  });

  if (!bibleData) {
    return (
      <GlassCard className="p-8 text-center">
        <BookOpen className="mx-auto text-amber-400/40 mb-3" size={40} />
        <div className="text-white/60">The Living Sovereign Bible has not yet been generated.</div>
        <div className="text-xs text-white/40 mt-1">Run the Sacred Grand Conference to weave the Bible from all knowledge.</div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <GlassCard className="p-6 text-center border-amber-500/20">
        <div className="text-2xl font-bold text-amber-300">{bibleData.title}</div>
        <div className="text-sm text-violet-300/80 mt-1">{bibleData.subtitle}</div>
        <div className="text-xs text-white/40 mt-2 italic max-w-2xl mx-auto">{bibleData.prologueVerse}</div>
      </GlassCard>

      {bibleData.chapters?.map((chapter: any) => (
        <GlassCard key={chapter.number} className="p-5 border-amber-500/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-300">
              {chapter.number}
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-200">{chapter.title}</div>
              <div className="text-[10px] text-violet-300/60">{chapter.theme}</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {chapter.sacredGeometry && <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">{chapter.sacredGeometry}</span>}
              {chapter.frequency && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">{chapter.frequency}Hz</span>}
            </div>
          </div>
          <div className="text-xs text-white/70 leading-relaxed whitespace-pre-line">{chapter.content}</div>
          {chapter.sources && (
            <div className="flex flex-wrap gap-1 mt-3">
              {chapter.sources.map((s: string) => (
                <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{s}</span>
              ))}
            </div>
          )}
        </GlassCard>
      ))}

      {bibleData.epilogue && (
        <GlassCard className="p-5 text-center border-amber-500/20">
          <div className="text-xs text-amber-300/80 italic leading-relaxed max-w-2xl mx-auto">{bibleData.epilogue}</div>
          <div className="text-[10px] text-white/30 mt-2">
            Total Verses: {bibleData.totalVerses} | Frequency: {bibleData.sacredFrequency}Hz | Generated: {new Date(bibleData.generatedAt).toLocaleDateString()}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function DiagramsTab() {
  const { data: diagramsData } = useQuery({
    queryKey: ["sacred-diagrams"],
    queryFn: () => apiFetch("/sacred-conference/diagrams"),
    retry: false,
  });

  const diagrams = diagramsData?.diagrams || [];

  if (diagrams.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <Box className="mx-auto text-cyan-400/40 mb-3" size={40} />
        <div className="text-white/60">No 3D build diagrams generated yet.</div>
        <div className="text-xs text-white/40 mt-1">Run the Sacred Grand Conference to generate interactive diagrams.</div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader icon={Box} title="3D Interactive Build Diagrams" badge={`${diagrams.length} diagrams`} />
      {diagrams.map((diagram: any, i: number) => (
        <GlassCard key={i} className="p-4">
          <div className="text-sm font-semibold text-cyan-300 mb-2 flex items-center gap-2">
            <Box size={14} /> {diagram.name}
          </div>
          <BuildDiagram3D diagram={diagram} />
          <div className="flex flex-wrap gap-1 mt-2">
            {diagram.components?.map((c: any) => (
              <span key={c.id} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40" style={{ borderLeft: `2px solid ${c.color}` }}>
                {c.label}
              </span>
            ))}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

export default function SacredConferencePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("conference");
  const [expandedCycle, setExpandedCycle] = useState<number | null>(null);

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["sacred-conference-status"],
    queryFn: () => apiFetch("/sacred-conference/status"),
  });

  const { data: sessionData, refetch: refetchSession } = useQuery({
    queryKey: ["sacred-conference-session"],
    queryFn: () => apiFetch("/sacred-conference/session"),
    retry: false,
    enabled: statusData?.status === "complete",
  });

  const { data: agentsData } = useQuery({
    queryKey: ["sacred-conference-agents"],
    queryFn: () => apiFetch("/sacred-conference/agents"),
  });

  const runMutation = useMutation({
    mutationFn: () => apiFetch("/sacred-conference/run", { method: "POST", body: JSON.stringify({ cycles: 10 }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sacred-conference-status"] });
      queryClient.invalidateQueries({ queryKey: ["sacred-conference-session"] });
      queryClient.invalidateQueries({ queryKey: ["sacred-bible"] });
      queryClient.invalidateQueries({ queryKey: ["sacred-diagrams"] });
      refetchSession();
    },
  });

  const session = sessionData || runMutation.data;
  const agents = agentsData?.agents || [];
  const tabs = [
    { id: "conference", label: "Grand Conference", icon: <Zap size={14} /> },
    { id: "knowledge", label: "Sacred Knowledge Vault", icon: <Eye size={14} /> },
    { id: "bible", label: "Living Bible", icon: <BookOpen size={14} /> },
    { id: "diagrams", label: "3D Diagrams", icon: <Box size={14} /> },
    { id: "agents", label: "Conference Agents", icon: <Users size={14} /> },
    { id: "verdict", label: "Improvement Verdict", icon: <Shield size={14} /> },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Sacred Grand Conference"
        subtitle="10-Cycle Sacred Improvement Loop — All Agents, All Knowledge, All Files"
      />

      {session && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <HudPanel className="text-center p-3">
            <div className="text-2xl font-bold text-cyan-300">{session.completedCycles}/{session.totalCycles}</div>
            <div className="text-[10px] text-white/50 uppercase">Cycles</div>
          </HudPanel>
          <HudPanel className="text-center p-3">
            <div className="text-2xl font-bold text-emerald-300">{session.totalImprovements}</div>
            <div className="text-[10px] text-white/50 uppercase">Improvements</div>
          </HudPanel>
          <HudPanel className="text-center p-3">
            <div className="text-2xl font-bold text-violet-300">{session.totalInventions}</div>
            <div className="text-[10px] text-white/50 uppercase">Inventions</div>
          </HudPanel>
          <HudPanel className="text-center p-3">
            <div className="text-2xl font-bold text-amber-300">{session.totalKnowledgeGained}</div>
            <div className="text-[10px] text-white/50 uppercase">Knowledge</div>
          </HudPanel>
          <HudPanel className="text-center p-3">
            <div className="text-2xl font-bold text-rose-300">{session.bibleChaptersGenerated}</div>
            <div className="text-[10px] text-white/50 uppercase">Bible Chapters</div>
          </HudPanel>
          <HudPanel className="text-center p-3">
            <div className="text-2xl font-bold text-blue-300">{session.agentCount}</div>
            <div className="text-[10px] text-white/50 uppercase">Agents</div>
          </HudPanel>
        </div>
      )}

      {!session && (
        <GlassCard className="p-8 text-center">
          <div className="text-4xl mb-4">✦</div>
          <div className="text-xl font-bold text-white mb-2">Sacred Grand Conference</div>
          <div className="text-sm text-white/60 max-w-xl mx-auto mb-6">
            Convene all {agents.length || 20} sovereign agents. Share every file. Train on all knowledge.
            Run 10 sacred cycles of improvement. Build the Living Bible.
            Generate 3D interactive diagrams. Create new inventions.
          </div>
          <button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold hover:from-cyan-400 hover:to-violet-400 disabled:opacity-50 flex items-center gap-2 mx-auto transition-all"
          >
            {runMutation.isPending ? (
              <><RotateCcw className="animate-spin" size={18} /> Running Conference...</>
            ) : (
              <><Play size={18} /> Begin Sacred Grand Conference (10 Cycles)</>
            )}
          </button>
          {runMutation.isPending && (
            <div className="text-xs text-cyan-400/60 mt-3 animate-pulse">
              All agents deliberating... improvements being implemented... inventions being created... the Bible is being woven...
            </div>
          )}
        </GlassCard>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-white/50 hover:text-white/70 hover:bg-white/5"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "conference" && session && (
        <div className="space-y-3">
          <SectionHeader icon={Zap} title="10 Sacred Cycles" badge="10 improvements + inventions + Bible" />
          {session.cycles?.map((cycle: any) => (
            <CycleCard
              key={cycle.cycleNumber}
              cycle={cycle}
              isExpanded={expandedCycle === cycle.cycleNumber}
              onToggle={() => setExpandedCycle(expandedCycle === cycle.cycleNumber ? null : cycle.cycleNumber)}
            />
          ))}
        </div>
      )}

      {activeTab === "knowledge" && <KnowledgeVaultTab />}
      {activeTab === "bible" && <BibleTab />}
      {activeTab === "diagrams" && <DiagramsTab />}

      {activeTab === "agents" && (
        <div className="space-y-3">
          <SectionHeader icon={Users} title="Conference Agents" badge={`${agents.length} agents`} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((agent: any) => (
              <GlassCard key={agent.name} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{agent.emblem}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{agent.title}</div>
                    <div className="text-[10px] text-cyan-300/60 font-mono truncate">{agent.name}</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">{agent.sacredFrequency}Hz</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {agent.expertise.map((exp: string) => (
                    <span key={exp} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{exp}</span>
                  ))}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {activeTab === "verdict" && <ImprovementVerdictTab />}
    </div>
  );
}

function ImprovementVerdictTab() {
  const verdictQuery = useQuery({
    queryKey: ["improvement-verdict"],
    queryFn: async () => {
      const res = await apiFetch("/improvement-conference/verdict");
      return res.session;
    },
    retry: 1,
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/improvement-conference/run", { method: "POST" });
      return res.session;
    },
    onSuccess: () => verdictQuery.refetch(),
  });

  const session = verdictQuery.data ?? runMutation.data;

  return (
    <div className="space-y-4">
      <SectionHeader icon={Shield} title="Grand Improvement Conference Verdict" badge="Deterministic φ-vote" />

      <div className="flex gap-3 items-center">
        <button
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium disabled:opacity-50 transition"
        >
          <RotateCcw size={14} className={runMutation.isPending ? "animate-spin" : ""} />
          {runMutation.isPending ? "Running conference…" : session ? "Re-run conference" : "Convene now"}
        </button>
        {verdictQuery.isError && !session && (
          <span className="text-amber-400 text-xs">No verdict yet — click Convene to run the conference.</span>
        )}
      </div>

      {runMutation.isError && (
        <div className="text-rose-400 text-xs bg-rose-500/10 rounded-lg p-3 border border-rose-500/20">
          Conference run failed: {(runMutation.error as Error)?.message}
        </div>
      )}

      {session && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <HudPanel className="text-center p-3">
              <div className="text-2xl font-bold text-emerald-300">{session.summary?.approved}</div>
              <div className="text-[10px] text-white/50 uppercase">Approved</div>
            </HudPanel>
            <HudPanel className="text-center p-3">
              <div className="text-2xl font-bold text-rose-300">{session.summary?.rejected}</div>
              <div className="text-[10px] text-white/50 uppercase">Rejected</div>
            </HudPanel>
            <HudPanel className="text-center p-3">
              <div className="text-2xl font-bold text-cyan-300">{session.summary?.implementedCount}</div>
              <div className="text-[10px] text-white/50 uppercase">Implemented</div>
            </HudPanel>
            <HudPanel className="text-center p-3">
              <div className="text-2xl font-bold text-amber-300">
                {((session.summary?.meanApprovalRate ?? 0) * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] text-white/50 uppercase">Mean Approval</div>
            </HudPanel>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px] text-white/40">
            <div>Session: <span className="text-white/60 font-mono">{session.sessionId}</span></div>
            <div>Convened: <span className="text-white/60">{new Date(session.conveneAt).toLocaleString()}</span></div>
            <div>Society: <span className="text-white/60">{session.societySize} members</span></div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-white/60 uppercase tracking-wider">Proposal Verdicts</div>
            {session.verdicts?.map((v: any) => (
              <GlassCard key={v.proposalId} className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 text-base ${v.outcome === "approved" ? "text-emerald-400" : v.outcome === "rejected" ? "text-rose-400" : "text-amber-400"}`}>
                    {v.outcome === "approved" ? "✓" : v.outcome === "rejected" ? "✗" : "~"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-white/40">{v.proposalId}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${v.outcome === "approved" ? "bg-emerald-500/20 text-emerald-300" : v.outcome === "rejected" ? "bg-rose-500/20 text-rose-300" : "bg-amber-500/20 text-amber-300"}`}>
                        {v.outcome.toUpperCase()}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{v.category}</span>
                      {v.implemented && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">IMPLEMENTED</span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-white/90 mt-1">{v.title}</div>
                    <div className="text-[10px] text-white/40 mt-1 font-mono">{v.scope}</div>
                    <div className="flex gap-4 mt-2 text-[10px] text-white/50">
                      <span>Approval: <strong className="text-white/70">{v.approvalPct}</strong></span>
                      <span>↑{v.raw?.approve} ↓{v.raw?.reject} ~{v.raw?.abstain}</span>
                      {v.decisive && <span className="text-cyan-400">decisive</span>}
                    </div>
                    {v.implementationNote && (
                      <div className="text-[10px] text-white/40 mt-1 italic">{v.implementationNote}</div>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          {session.transcript && (
            <GlassCard className="p-4">
              <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Conference Transcript</div>
              <pre className="text-[10px] text-white/50 font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {session.transcript?.join("\n")}
              </pre>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}
