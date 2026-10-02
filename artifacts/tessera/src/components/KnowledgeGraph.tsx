import { useRef, useEffect, useState, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export interface GraphNode {
  id: string;
  label: string;
  type: "conclusion" | "secret" | "ritual" | "cheat-code" | "live-knowledge";
  connections: string[];
  summary?: string;
}

const NODE_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  conclusion: { fill: "#0e7490", stroke: "#22d3ee", text: "#cffafe" },
  secret: { fill: "#9f1239", stroke: "#fb7185", text: "#ffe4e6" },
  ritual: { fill: "#92400e", stroke: "#fbbf24", text: "#fef3c7" },
  "cheat-code": { fill: "#065f46", stroke: "#34d399", text: "#d1fae5" },
  "live-knowledge": { fill: "#4c1d95", stroke: "#a78bfa", text: "#ede9fe" },
};

interface Vec2 { x: number; y: number; }
interface SimNode extends GraphNode, Vec2 {
  vx: number; vy: number; pinned: boolean;
}

function initForce(nodes: GraphNode[], width: number, height: number): SimNode[] {
  const cx = width / 2, cy = height / 2;
  return nodes.map((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    const r = Math.min(width, height) * 0.32;
    return { ...n, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, vx: 0, vy: 0, pinned: false };
  });
}

function tick(nodes: SimNode[], W: number, H: number) {
  const repel = 3000;
  const attract = 0.03;
  const damp = 0.85;
  const cx = W / 2, cy = H / 2;

  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].pinned) continue;
    let fx = (cx - nodes[i].x) * 0.006;
    let fy = (cy - nodes[i].y) * 0.006;

    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist2 = dx * dx + dy * dy + 1;
      const f = repel / dist2;
      fx += (dx / Math.sqrt(dist2)) * f;
      fy += (dy / Math.sqrt(dist2)) * f;
    }

    for (const connId of nodes[i].connections) {
      const conn = nodes.find(n => n.id === connId);
      if (!conn) continue;
      const dx = conn.x - nodes[i].x;
      const dy = conn.y - nodes[i].y;
      fx += dx * attract;
      fy += dy * attract;
    }

    nodes[i].vx = (nodes[i].vx + fx) * damp;
    nodes[i].vy = (nodes[i].vy + fy) * damp;
  }

  for (const node of nodes) {
    if (!node.pinned) {
      node.x = Math.max(30, Math.min(W - 30, node.x + node.vx));
      node.y = Math.max(30, Math.min(H - 30, node.y + node.vy));
    }
  }
}

interface TooltipState { node: SimNode; x: number; y: number }

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  onNodeClick?: (node: GraphNode) => void;
  className?: string;
}

export default function KnowledgeGraph({ nodes: rawNodes, onNodeClick, className = "" }: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<SimNode[]>([]);
  const rafRef = useRef<number>(0);
  const dragRef = useRef<{ node: SimNode; ox: number; oy: number } | null>(null);
  const [tooltip, setTooltip] = useState<{ node: SimNode; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Vec2>({ x: 0, y: 0 });
  const panRef = useRef<{ start: Vec2; offsetStart: Vec2 } | null>(null);

  const W = 600, H = 380;

  useEffect(() => {
    if (rawNodes.length === 0) return;
    simRef.current = initForce(rawNodes, W, H);
  }, [rawNodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    function draw() {
      ctx!.clearRect(0, 0, W, H);
      ctx!.save();
      ctx!.translate(offset.x, offset.y);
      ctx!.scale(zoom, zoom);

      const nodes = simRef.current;
      if (frame < 200) tick(nodes, W, H);
      frame++;

      for (const node of nodes) {
        for (const connId of node.connections) {
          const target = nodes.find(n => n.id === connId);
          if (!target) continue;
          const color = NODE_COLORS[node.type] || NODE_COLORS["live-knowledge"];
          ctx!.beginPath();
          ctx!.moveTo(node.x, node.y);
          ctx!.lineTo(target.x, target.y);
          ctx!.strokeStyle = color.stroke + "44";
          ctx!.lineWidth = 1;
          ctx!.stroke();
        }
      }

      for (const node of nodes) {
        const color = NODE_COLORS[node.type] || NODE_COLORS["live-knowledge"];
        const r = 18;
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx!.fillStyle = color.fill;
        ctx!.fill();
        ctx!.strokeStyle = color.stroke;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();

        ctx!.fillStyle = color.text;
        ctx!.font = "bold 8px system-ui";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        const label = node.label.length > 12 ? node.label.slice(0, 11) + "…" : node.label;
        ctx!.fillText(label, node.x, node.y);
      }

      ctx!.restore();
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [zoom, offset]);

  const getNodeAt = useCallback((cx: number, cy: number) => {
    const wx = (cx - offset.x) / zoom;
    const wy = (cy - offset.y) / zoom;
    return simRef.current.find(n => {
      const dx = n.x - wx, dy = n.y - wy;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    }) || null;
  }, [zoom, offset]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const node = getNodeAt(cx, cy);
    if (node) {
      dragRef.current = { node, ox: cx - node.x * zoom - offset.x, oy: cy - node.y * zoom - offset.y };
      node.pinned = true;
    } else {
      panRef.current = { start: { x: cx, y: cy }, offsetStart: { ...offset } };
    }
  }, [getNodeAt, zoom, offset]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;

    if (dragRef.current) {
      const n = dragRef.current.node;
      n.x = (cx - dragRef.current.ox - offset.x) / zoom;
      n.y = (cy - dragRef.current.oy - offset.y) / zoom;
      return;
    }

    if (panRef.current) {
      setOffset({
        x: panRef.current.offsetStart.x + (cx - panRef.current.start.x),
        y: panRef.current.offsetStart.y + (cy - panRef.current.start.y),
      });
      return;
    }

    const node = getNodeAt(cx, cy);
    if (node) {
      setTooltip({ node, x: cx, y: cy });
      (canvasRef.current as any).style.cursor = "pointer";
    } else {
      setTooltip(null);
      (canvasRef.current as any).style.cursor = "default";
    }
  }, [getNodeAt, zoom, offset]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      const moved = Math.abs(cx - (dragRef.current.node.x * zoom + offset.x + dragRef.current.ox)) < 5;
      if (moved) onNodeClick?.(dragRef.current.node);
      dragRef.current.node.pinned = false;
      dragRef.current = null;
    }
    panRef.current = null;
  }, [onNodeClick, zoom, offset]);

  const onClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const node = getNodeAt(cx, cy);
    if (node) onNodeClick?.(node);
  }, [getNodeAt, onNodeClick]);

  const reset = () => { setZoom(1); setOffset({ x: 0, y: 0 }); };

  return (
    <div className={`relative rounded-xl border border-violet-500/20 bg-gray-950/80 overflow-hidden ${className}`} data-testid="knowledge-graph">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-violet-500/10">
        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Knowledge Graph</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors">
            <ZoomIn size={11} />
          </button>
          <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.3))} className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors">
            <ZoomOut size={11} />
          </button>
          <button onClick={reset} className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors">
            <RotateCcw size={11} />
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="w-full"
        style={{ maxHeight: 300, touchAction: "none" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onClick={onClick}
      />

      {tooltip && (
        <div
          className="absolute bg-gray-900/95 border border-slate-600/60 rounded-lg p-2.5 shadow-xl pointer-events-none z-50 max-w-[200px]"
          style={{ left: Math.min(tooltip.x + 12, W - 220), top: Math.min(tooltip.y + 12, H - 80) }}
        >
          <div className="text-[10px] font-bold text-white mb-1">{tooltip.node.label}</div>
          {tooltip.node.summary && (
            <div className="text-[9px] text-slate-400 leading-relaxed line-clamp-3">{tooltip.node.summary}</div>
          )}
          <div className="text-[8px] text-violet-400 mt-1 uppercase font-semibold">{tooltip.node.type.replace(/-/g, " ")}</div>
          {tooltip.node.connections.length > 0 && (
            <div className="text-[8px] text-slate-500 mt-0.5">{tooltip.node.connections.length} connection{tooltip.node.connections.length !== 1 ? "s" : ""}</div>
          )}
        </div>
      )}

      <div className="absolute bottom-2 left-3 flex items-center gap-2 flex-wrap">
        {Object.entries(NODE_COLORS).map(([type, c]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full border" style={{ background: c.fill, borderColor: c.stroke }} />
            <span className="text-[8px] text-slate-500">{type.replace(/-/g, " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
