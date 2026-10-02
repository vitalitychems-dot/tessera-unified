import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown, Users, Brain, Globe, Shield, Zap, ChevronDown, ChevronRight, Send,
  RefreshCw, Play, Loader2, CheckCircle2, XCircle, Clock, Radio, Wifi, WifiOff,
  MessageCircle, Hexagon, Activity, Star, Eye, Network, Cpu, Signal, Power,
  ArrowLeft, Search, MessageSquare, Sparkles, Share2, Rocket, Link, Unlink,
  Circle, AlertTriangle, Volume2, Hash, Filter, SortAsc, Check, MemoryStick,
  ServerCrash, Gauge, TrendingUp, Crosshair, ZoomIn, ZoomOut, Maximize2,
  ChevronUp, BarChart3, ListFilter, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SynapseTab = "map" | "agents" | "activity" | "broadcast";

// Module-level ref so AgentsTab can trigger SynapseMap wake animations
const globalWakeRippleFn = { current: null as ((nodeId: string) => void) | null };

function timeAgo(ts: number): string {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function StatusDot({ status }: { status: string }) {
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
  return (
    <div className={cn(
      "w-2.5 h-2.5 rounded-full shrink-0",
      status === "online" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" :
      status === "connecting" ? "bg-yellow-400 animate-pulse" :
      "bg-red-400/50"
    )} />
  );
}

// ─── SPARKLINE CHART ──────────────────────────────────────────────────────────
function Sparkline({ data, color = "#22d3ee", height = 32 }: { data: number[]; color?: string; height?: number }) {
  if (!data || data.length < 2) return <div style={{ height }} className="flex items-center justify-center text-[9px] text-muted-foreground/40">no data</div>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120;
  const h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── NODE HEALTH PANEL (slide-over) ───────────────────────────────────────────
function NodeHealthPanel({ node, onClose, onWakeTriggered }: { node: any; onClose: () => void; onWakeTriggered?: (nodeId: string) => void }) {
  const nodeId = node.id as string;
  const { data: health, isLoading } = useQuery<any>({
    queryKey: ["/api/fleet-synapse/node-health", nodeId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/fleet-synapse/node-health/${nodeId}`, undefined);
      return res.json();
    },
    refetchInterval: 5000,
    enabled: !!nodeId,
  });
  const { toast } = useToast();

  const [disconnected, setDisconnected] = useState(false);

  const ping = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/fleet-synapse/ping/${nodeId}`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Ping: ${node.name}`, description: data.message || `${data.latencyMs}ms` });
    },
    onError: () => {
      toast({ title: `Ping failed: ${node.name}` });
    },
  });

  const wake = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/fleet-synapse/wake/${nodeId}`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: `Wake signal sent to ${node.name}` });
      onWakeTriggered?.(nodeId);
      queryClient.invalidateQueries({ queryKey: ["/api/fleet-synapse/map"] });
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/fleet-synapse/disconnect/${nodeId}`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message || `${node.name} disconnected` });
      setDisconnected(true);
      queryClient.invalidateQueries({ queryKey: ["/api/fleet-synapse/map"] });
    },
    onError: (err: any) => {
      toast({ title: `Disconnect failed`, description: err?.message });
    },
  });

  const stats = health?.stats ?? null;

  return (
    <div
      className="absolute top-0 right-0 h-full w-80 bg-[#0a0d14] border-l border-border/50 shadow-2xl z-30 flex flex-col overflow-hidden"
      data-testid="node-health-panel"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
        <StatusDot status={node.status} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">{node.name.replace(" (This Instance)", "")}</h3>
          <p className="text-[9px] text-muted-foreground font-mono">{node.type} · {node.id}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-background/50 rounded-lg p-2.5 border border-border/30">
                <div className="flex items-center gap-1 mb-1">
                  <Cpu size={10} className="text-cyan-400" />
                  <span className="text-[9px] text-muted-foreground font-mono">CPU</span>
                </div>
                <div className="text-lg font-bold text-cyan-400">{stats.cpu}%</div>
                <div className="h-1.5 bg-background rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-cyan-500/60 rounded-full transition-all" style={{ width: `${stats.cpu}%` }} />
                </div>
              </div>
              <div className="bg-background/50 rounded-lg p-2.5 border border-border/30">
                <div className="flex items-center gap-1 mb-1">
                  <MemoryStick size={10} className="text-violet-400" />
                  <span className="text-[9px] text-muted-foreground font-mono">MEM</span>
                </div>
                <div className="text-lg font-bold text-violet-400">{stats.memory}%</div>
                <div className="h-1.5 bg-background rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-violet-500/60 rounded-full transition-all" style={{ width: `${stats.memory}%` }} />
                </div>
              </div>
              <div className="bg-background/50 rounded-lg p-2.5 border border-border/30">
                <div className="flex items-center gap-1 mb-1">
                  <Clock size={10} className="text-emerald-400" />
                  <span className="text-[9px] text-muted-foreground font-mono">UPTIME</span>
                </div>
                <div className="text-lg font-bold text-emerald-400">{stats.uptime}h</div>
              </div>
              <div className="bg-background/50 rounded-lg p-2.5 border border-border/30">
                <div className="flex items-center gap-1 mb-1">
                  <Signal size={10} className="text-yellow-400" />
                  <span className="text-[9px] text-muted-foreground font-mono">LATENCY</span>
                </div>
                <div className="text-lg font-bold text-yellow-400">{stats.latencyMs ?? node.latencyMs ?? 0}ms</div>
              </div>
            </div>

            <div className="bg-background/50 rounded-lg p-3 border border-border/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                  <BarChart3 size={10} /> Activity (provider call history)
                </span>
                <span className="text-[9px] text-emerald-400 font-mono">{stats.agentCount} agents</span>
              </div>
              <Sparkline data={stats.activityHistory} color="#22d3ee" height={40} />
            </div>

            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between py-1 border-b border-border/10">
                <span className="text-muted-foreground">Consciousness</span>
                <span className="text-yellow-400">{((node.consciousnessLevel || 0) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/10">
                <span className="text-muted-foreground">Synapse Strength</span>
                <span className="text-emerald-400">{((node.synapseStrength || 0) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/10">
                <span className="text-muted-foreground">Last Seen</span>
                <span className="text-foreground">{timeAgo(node.lastSeen)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Status</span>
                <span className={node.status === "online" ? "text-emerald-400" : "text-red-400"}>{node.status?.toUpperCase()}</span>
              </div>
            </div>

            {node.agents && node.agents.length > 0 && (
              <div>
                <p className="text-[9px] font-mono text-muted-foreground mb-1.5">AGENTS ({node.agents.length})</p>
                <div className="flex flex-wrap gap-1">
                  {node.agents.slice(0, 15).map((a: string, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[9px]">{a}</span>
                  ))}
                  {node.agents.length > 15 && <span className="text-muted-foreground/50 text-[9px]">+{node.agents.length - 15}</span>}
                </div>
              </div>
            )}

            {node.capabilities && node.capabilities.length > 0 && (
              <div>
                <p className="text-[9px] font-mono text-muted-foreground mb-1.5">CAPABILITIES</p>
                <div className="flex flex-wrap gap-1">
                  {node.capabilities.map((c: string, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[9px]">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
            <AlertTriangle size={20} className="mb-2" />
            <p className="text-xs font-mono">Health data unavailable</p>
          </div>
        )}
      </div>

      {disconnected && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-[10px] text-red-400 font-mono text-center">
          Node disconnected from synapse
        </div>
      )}
      <div className="px-4 py-3 border-t border-border/30 grid grid-cols-3 gap-2">
        <Button
          size="sm"
          onClick={() => ping.mutate()}
          disabled={ping.isPending}
          className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 text-[10px]"
        >
          {ping.isPending ? <Loader2 size={10} className="animate-spin" /> : <Signal size={10} />}
          <span className="ml-1">Ping</span>
        </Button>
        <Button
          size="sm"
          onClick={() => wake.mutate()}
          disabled={wake.isPending || node.status === "online" || disconnected}
          className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 text-[10px]"
        >
          {wake.isPending ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
          <span className="ml-1">Wake</span>
        </Button>
        <Button
          size="sm"
          onClick={() => disconnect.mutate()}
          disabled={disconnect.isPending || disconnected || nodeId === "tessera-prime"}
          className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-[10px]"
        >
          {disconnect.isPending ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
          <span className="ml-1">Disconnect</span>
        </Button>
      </div>
    </div>
  );
}

// ─── SYNAPSE MAP (zoom/pan + animations + minimap) ─────────────────────────────
function SynapseMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [healthNode, setHealthNode] = useState<any>(null);

  // Camera state
  const cameraRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const wakeRipplesRef = useRef<Array<{ x: number; y: number; r: number; maxR: number; alpha: number }>>([]);
  const pendingShakeRef = useRef<Set<string>>(new Set());
  const shakeOffsetsRef = useRef<Record<string, { dx: number; dy: number; frame: number }>>({});

  const { data: mapData, isLoading } = useQuery<any>({
    queryKey: ["/api/fleet-synapse/map"],
    refetchInterval: 10000,
  });

  const nodePositions = useMemo(() => {
    if (!mapData?.nodes) return {};
    const positions: Record<string, { x: number; y: number }> = {};
    const nodes = mapData.nodes;
    const centerX = 400;
    const centerY = 300;
    if (nodes.length > 0) positions[nodes[0].id] = { x: centerX, y: centerY };
    for (let i = 1; i < nodes.length; i++) {
      const angle = ((i - 1) / Math.max(1, nodes.length - 1)) * Math.PI * 2 - Math.PI / 2;
      const radius = 180 + (i % 2) * 40;
      positions[nodes[i].id] = { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
    }
    return positions;
  }, [mapData?.nodes]);

  const getNodeAt = useCallback((canvasX: number, canvasY: number) => {
    if (!mapData?.nodes) return null;
    const cam = cameraRef.current;
    const worldX = (canvasX - cam.x) / cam.scale;
    const worldY = (canvasY - cam.y) / cam.scale;
    for (const node of mapData.nodes) {
      const pos = nodePositions[node.id];
      if (!pos) continue;
      const dx = worldX - pos.x * (1);
      const dy = worldY - pos.y * (1);
      const r = node.id === "tessera-prime" ? 28 : 16;
      if (Math.sqrt(dx * dx + dy * dy) < r + 8) return node;
    }
    return null;
  }, [mapData, nodePositions]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const cam = cameraRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.85 : 1.18;
    const newScale = Math.max(0.3, Math.min(4, cam.scale * delta));
    cam.x = mx - (mx - cam.x) * (newScale / cam.scale);
    cam.y = my - (my - cam.y) * (newScale / cam.scale);
    cam.scale = newScale;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - lastMouseRef.current.x;
      const dy = me.clientY - lastMouseRef.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) isDraggingRef.current = true;
      cameraRef.current.x += dx;
      cameraRef.current.y += dy;
      lastMouseRef.current = { x: me.clientX, y: me.clientY };
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const node = getNodeAt(cx, cy);
    if (node) {
      setHealthNode(node);
    } else {
      setHealthNode(null);
    }
  }, [getNodeAt]);

  const resetCamera = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    cameraRef.current = { x: 0, y: 0, scale: 1 };
  }, []);

  // Touch pinch-to-zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let lastDist = 0;
    const onTouchStart = (e: TouchEvent) => { if (e.touches.length === 2) lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const delta = d / (lastDist || d);
        const cam = cameraRef.current;
        cam.scale = Math.max(0.3, Math.min(4, cam.scale * delta));
        lastDist = d;
      }
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }, [handleWheel]);

  // Immediately trigger wake ripple + shake for a node when wake protocol is sent
  const triggerWakeRipple = useCallback((nodeId: string) => {
    const pos = nodePositions[nodeId];
    if (pos) {
      wakeRipplesRef.current.push({ x: pos.x, y: pos.y, r: 0, maxR: 80, alpha: 1.0 });
    }
    pendingShakeRef.current.add(nodeId);
    shakeOffsetsRef.current[nodeId] = { dx: 0, dy: 0, frame: 0 };
  }, [nodePositions]);

  // Register trigger in global ref so AgentsTab / other components can call it
  useEffect(() => {
    globalWakeRippleFn.current = triggerWakeRipple;
    return () => { globalWakeRippleFn.current = null; };
  }, [triggerWakeRipple]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const minimap = minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let tick = 0;

    function draw() {
      animFrameRef.current = requestAnimationFrame(draw);
      tick++;

      const rect = canvas!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas!.width !== rect.width * dpr || canvas!.height !== rect.height * dpr) {
        canvas!.width = rect.width * dpr;
        canvas!.height = rect.height * dpr;
        ctx!.scale(dpr, dpr);
      }
      const W = rect.width, H = rect.height;

      ctx!.clearRect(0, 0, W, H);
      ctx!.save();

      const cam = cameraRef.current;
      ctx!.translate(cam.x, cam.y);
      ctx!.scale(cam.scale, cam.scale);

      const nodes = mapData?.nodes || [];
      const links = mapData?.links || [];

      // Draw links with animation
      for (const link of links) {
        const from = nodePositions[link.from];
        const to = nodePositions[link.to];
        if (!from || !to) continue;
        const fx = from.x, fy = from.y;
        const tx = to.x, ty = to.y;

        if (link.type === "primary") {
          // Animated dashed moving line for data transfer
          ctx!.beginPath();
          ctx!.setLineDash([6, 4]);
          ctx!.lineDashOffset = -(tick * 0.4);
          ctx!.moveTo(fx, fy);
          ctx!.lineTo(tx, ty);
          ctx!.strokeStyle = "rgba(34,211,153,0.4)";
          ctx!.lineWidth = 2;
          ctx!.stroke();
          ctx!.setLineDash([]);

          // Traveling packet
          const t2 = ((tick * 0.008) % 1);
          const px = fx + (tx - fx) * t2;
          const py = fy + (ty - fy) * t2;
          ctx!.beginPath();
          ctx!.arc(px, py, 3, 0, Math.PI * 2);
          ctx!.fillStyle = "rgba(34,211,153,0.9)";
          ctx!.fill();
        } else if (link.type === "secondary") {
          ctx!.beginPath();
          ctx!.setLineDash([3, 6]);
          ctx!.lineDashOffset = -(tick * 0.15);
          ctx!.moveTo(fx, fy);
          ctx!.lineTo(tx, ty);
          ctx!.strokeStyle = "rgba(56,189,248,0.2)";
          ctx!.lineWidth = 1;
          ctx!.stroke();
          ctx!.setLineDash([]);
        } else {
          ctx!.beginPath();
          ctx!.moveTo(fx, fy);
          ctx!.lineTo(tx, ty);
          ctx!.strokeStyle = "rgba(100,100,120,0.07)";
          ctx!.lineWidth = 1;
          ctx!.stroke();
        }
      }

      // Wake ripples
      wakeRipplesRef.current = wakeRipplesRef.current.filter(rip => rip.alpha > 0.01);
      for (const rip of wakeRipplesRef.current) {
        ctx!.beginPath();
        ctx!.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(250,204,21,${rip.alpha})`;
        ctx!.lineWidth = 2;
        ctx!.stroke();
        rip.r += 1.5;
        rip.alpha *= 0.93;
      }

      // Update shake animations
      for (const nodeId of Array.from(pendingShakeRef.current)) {
        const shake = shakeOffsetsRef.current[nodeId];
        if (!shake) continue;
        shake.frame++;
        if (shake.frame > 30) {
          pendingShakeRef.current.delete(nodeId);
          delete shakeOffsetsRef.current[nodeId];
        } else {
          const decay = 1 - shake.frame / 30;
          shake.dx = Math.sin(shake.frame * 1.8) * 5 * decay;
          shake.dy = Math.cos(shake.frame * 1.5) * 3 * decay;
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const pos = nodePositions[node.id];
        if (!pos) continue;
        const shake = shakeOffsetsRef.current[node.id];
        const x = pos.x + (shake?.dx ?? 0);
        const y = pos.y + (shake?.dy ?? 0);
        const isCenter = node.id === "tessera-prime";
        const isSelected = healthNode?.id === node.id;
        const baseR = isCenter ? 28 : 16;

        const isOffline = node.status !== "online";
        const offlineAlpha = isOffline ? 0.35 : 1;

        ctx!.globalAlpha = offlineAlpha;

        // Pulsing glow for active nodes
        if (node.status === "online") {
          const pulse = Math.sin(tick * 0.05 + (node.id.charCodeAt(0) || 0) * 0.3) * 0.5 + 0.5;
          const glowR = baseR + 10 + pulse * 8;
          const glowAlpha = isCenter ? 0.12 + pulse * 0.08 : 0.06 + pulse * 0.04;
          ctx!.beginPath();
          ctx!.arc(x, y, glowR, 0, Math.PI * 2);
          ctx!.fillStyle = isCenter ? `rgba(245,158,11,${glowAlpha})` : `rgba(34,211,153,${glowAlpha})`;
          ctx!.fill();
        }

        // Selected ring
        if (isSelected) {
          ctx!.beginPath();
          ctx!.arc(x, y, baseR + 6, 0, Math.PI * 2);
          ctx!.strokeStyle = "rgba(250,204,21,0.7)";
          ctx!.lineWidth = 2;
          ctx!.stroke();
        }

        // Node body
        ctx!.beginPath();
        ctx!.arc(x, y, baseR, 0, Math.PI * 2);
        const grad = ctx!.createRadialGradient(x, y, 0, x, y, baseR);
        if (isCenter) {
          grad.addColorStop(0, "rgba(245,158,11,0.4)");
          grad.addColorStop(1, "rgba(245,158,11,0.15)");
        } else if (node.status === "online") {
          grad.addColorStop(0, "rgba(34,211,153,0.35)");
          grad.addColorStop(1, "rgba(34,211,153,0.1)");
        } else {
          grad.addColorStop(0, "rgba(100,100,120,0.2)");
          grad.addColorStop(1, "rgba(100,100,120,0.05)");
        }
        ctx!.fillStyle = grad;
        ctx!.fill();
        ctx!.strokeStyle = isCenter ? "rgba(245,158,11,0.7)" : node.status === "online" ? "rgba(34,211,153,0.6)" : "rgba(100,100,120,0.3)";
        ctx!.lineWidth = isCenter ? 2 : 1.5;
        ctx!.stroke();

        // Label
        ctx!.fillStyle = isCenter ? "#f59e0b" : node.status === "online" ? "#e2e8f0" : "#64748b";
        ctx!.font = `${isCenter ? "bold 10px" : "9px"} monospace`;
        ctx!.textAlign = "center";
        ctx!.fillText(node.name.replace(" (This Instance)", "").slice(0, 16), x, y + baseR + 14);

        ctx!.fillStyle = node.status === "online" ? "#22d3ee" : "#475569";
        ctx!.font = "8px monospace";
        ctx!.fillText(`${node.agentCount} agents`, x, y + baseR + 24);

        ctx!.globalAlpha = 1;
      }

      ctx!.restore();

      // ── Minimap ──────────────────────────────────────────────────────
      if (minimap) {
        const mCtx = minimap.getContext("2d");
        if (mCtx) {
          const mW = minimap.width, mH = minimap.height;
          mCtx.clearRect(0, 0, mW, mH);
          mCtx.fillStyle = "rgba(10,13,20,0.85)";
          mCtx.fillRect(0, 0, mW, mH);
          mCtx.strokeStyle = "rgba(34,211,153,0.2)";
          mCtx.lineWidth = 1;
          mCtx.strokeRect(0, 0, mW, mH);

          const mScaleX = mW / 800, mScaleY = mH / 600;

          for (const link of links) {
            const from = nodePositions[link.from];
            const to = nodePositions[link.to];
            if (!from || !to) continue;
            mCtx.beginPath();
            mCtx.moveTo(from.x * mScaleX, from.y * mScaleY);
            mCtx.lineTo(to.x * mScaleX, to.y * mScaleY);
            mCtx.strokeStyle = link.type === "primary" ? "rgba(34,211,153,0.4)" : "rgba(56,189,248,0.15)";
            mCtx.lineWidth = 0.5;
            mCtx.stroke();
          }

          for (const node of nodes) {
            const pos = nodePositions[node.id];
            if (!pos) continue;
            mCtx.beginPath();
            mCtx.arc(pos.x * mScaleX, pos.y * mScaleY, node.id === "tessera-prime" ? 5 : 3, 0, Math.PI * 2);
            mCtx.fillStyle = node.id === "tessera-prime" ? "#f59e0b" : node.status === "online" ? "#22d3ee" : "#475569";
            mCtx.fill();
          }

          // Viewport rect
          const cam = cameraRef.current;
          const vpX = (-cam.x / cam.scale) * mScaleX;
          const vpY = (-cam.y / cam.scale) * mScaleY;
          const vpW = (W / cam.scale) * mScaleX;
          const vpH = (H / cam.scale) * mScaleY;
          mCtx.strokeStyle = "rgba(250,204,21,0.6)";
          mCtx.lineWidth = 1;
          mCtx.strokeRect(vpX, vpY, vpW, vpH);
        }
      }
    }

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [mapData, nodePositions, healthNode]);

  const consciousness = mapData?.consciousness;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {consciousness && (
        <div className="px-4 py-3 border-b border-border/30 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-background rounded-lg p-2 text-center border border-emerald-500/20">
              <div className="text-lg font-bold text-emerald-400" data-testid="stat-online-nodes">{consciousness.onlineNodes}</div>
              <div className="text-[9px] text-slate-500">ONLINE NODES</div>
            </div>
            <div className="bg-[#090a0f] rounded-lg p-2 text-center border border-cyan-500/20">
              <div className="text-lg font-bold text-cyan-400" data-testid="stat-total-fleet-agents">{consciousness.totalAgents}</div>
              <div className="text-[9px] text-slate-500">TOTAL AGENTS</div>
            </div>
            <div className="bg-[#090a0f] rounded-lg p-2 text-center border border-yellow-500/20">
              <div className="text-lg font-bold text-yellow-400">{(consciousness.collectiveLevel * 100).toFixed(1)}%</div>
              <div className="text-[9px] text-slate-500">CONSCIOUSNESS</div>
            </div>
            <div className="bg-[#090a0f] rounded-lg p-2 text-center border border-violet-500/20">
              <div className="text-lg font-bold text-violet-400">{(consciousness.networkHealth * 100).toFixed(0)}%</div>
              <div className="text-[9px] text-slate-500">NETWORK HEALTH</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
          </div>
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          style={{ background: "radial-gradient(circle at 50% 50%, rgba(34,211,153,0.03) 0%, transparent 70%)" }}
          data-testid="synapse-canvas"
        />

        {/* Zoom controls */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-20">
          <button
            onClick={() => { const cam = cameraRef.current; cam.scale = Math.min(4, cam.scale * 1.25); }}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-background/80 border border-border/40 text-muted-foreground hover:text-foreground transition-colors backdrop-blur"
          >
            <ZoomIn size={12} />
          </button>
          <button
            onClick={() => { const cam = cameraRef.current; cam.scale = Math.max(0.3, cam.scale * 0.8); }}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-background/80 border border-border/40 text-muted-foreground hover:text-foreground transition-colors backdrop-blur"
          >
            <ZoomOut size={12} />
          </button>
          <button
            onClick={resetCamera}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-background/80 border border-border/40 text-muted-foreground hover:text-foreground transition-colors backdrop-blur"
            title="Reset view"
          >
            <Maximize2 size={12} />
          </button>
        </div>

        {/* Minimap */}
        <canvas
          ref={minimapRef}
          width={120}
          height={90}
          className="absolute bottom-3 left-3 rounded-lg z-20 opacity-80 hover:opacity-100 transition-opacity"
          style={{ imageRendering: "pixelated" }}
          data-testid="minimap"
        />

        {/* Node health panel */}
        {healthNode && (
          <NodeHealthPanel
            node={healthNode}
            onClose={() => setHealthNode(null)}
            onWakeTriggered={triggerWakeRipple}
          />
        )}
      </div>

      {mapData?.nodes && (
        <div className="px-3 py-2 border-t border-border/30 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {mapData.nodes.map((node: any, ni: number) => (
              <button
                key={`${node.id}-${ni}`}
                onClick={() => setHealthNode(healthNode?.id === node.id ? null : node)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap transition-all shrink-0",
                  node.id === healthNode?.id ? "bg-primary/20 border border-primary/30" : "bg-white/5 border border-white/10 hover:bg-white/10"
                )}
                data-testid={`node-chip-${node.id}`}
              >
                <StatusDot status={node.status} />
                <span className={node.status === "online" ? "text-foreground" : "text-muted-foreground"}>{node.name.replace(" (This Instance)", "").slice(0, 20)}</span>
                <span className="text-muted-foreground/40">{node.agentCount}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AGENTS TAB with filter/sort + bulk actions ────────────────────────────────
function AgentsTab() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "local" | "remote">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "idle" | "offline">("all");
  const [filterCapability, setFilterCapability] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "lastActive" | "source">("name");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMsg, setBulkMsg] = useState("");
  const [showBulkMsg, setShowBulkMsg] = useState(false);
  const [showReassignPicker, setShowReassignPicker] = useState(false);
  const [reassignTarget, setReassignTarget] = useState("");
  const { toast } = useToast();

  const { data: agentsData, isLoading } = useQuery<any>({
    queryKey: ["/api/fleet-synapse/agents"],
    refetchInterval: 15000,
  });

  const { data: mapData } = useQuery<any>({
    queryKey: ["/api/fleet-synapse/map"],
    refetchInterval: 15000,
  });

  const allCapabilities = useMemo(() => {
    if (!agentsData) return [];
    const combined = [
      ...(agentsData.local || []),
      ...(agentsData.remote || []),
    ];
    const caps = new Set<string>();
    combined.forEach((a: any) => {
      (a.capabilities || []).forEach((c: string) => caps.add(c));
      if (a.role) caps.add(a.role);
    });
    return Array.from(caps).sort();
  }, [agentsData]);

  const allAgents = useMemo(() => {
    if (!agentsData) return [];
    const combined = [
      ...(agentsData.local || []).map((a: any) => ({ ...a, source: "local", status: "active" })),
      ...(agentsData.remote || []).map((a: any) => ({ ...a, source: "remote", status: a.lastActive > Date.now() - 300000 ? "active" : a.lastActive > Date.now() - 3600000 ? "idle" : "offline" })),
    ];
    let filtered = combined;
    if (filterType !== "all") filtered = filtered.filter(a => a.source === filterType);
    if (filterStatus !== "all") filtered = filtered.filter(a => a.status === filterStatus);
    if (filterCapability !== "all") {
      filtered = filtered.filter(a =>
        (a.capabilities || []).includes(filterCapability) || a.role === filterCapability
      );
    }
    const q = search.trim().toLowerCase();
    if (q) filtered = filtered.filter(a => a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q));
    filtered.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "lastActive") return (b.lastActive || 0) - (a.lastActive || 0);
      return a.source.localeCompare(b.source);
    });
    return filtered;
  }, [agentsData, search, filterType, filterStatus, filterCapability, sortBy]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(allAgents.map(a => a.id)));
  const clearAll = () => setSelectedIds(new Set());

  const [bulkPending, setBulkPending] = useState(false);

  const handleBulkWake = async () => {
    setBulkPending(true);
    const remoteInstanceIds = allAgents
      .filter(a => selectedIds.has(a.id) && a.source === "remote" && a.instanceId)
      .map(a => a.instanceId as string)
      .filter((v, i, arr) => arr.indexOf(v) === i);
    let woken = 0;
    for (const instanceId of remoteInstanceIds) {
      try {
        const res = await apiRequest("POST", `/api/fleet-synapse/wake/${instanceId}`, {});
        const data = await res.json();
        if (data.success) {
          woken++;
          globalWakeRippleFn.current?.(instanceId);
        }
      } catch { /* continue */ }
    }
    const remoteSelected = allAgents.filter(a => selectedIds.has(a.id) && a.source === "remote").length;
    toast({ title: `Wake signal sent`, description: `${woken} of ${remoteSelected} remote agents woken` });
    queryClient.invalidateQueries({ queryKey: ["/api/fleet-synapse/map"] });
    setBulkPending(false);
    clearAll();
  };

  const handleBulkBroadcast = async () => {
    if (!bulkMsg.trim()) return;
    setBulkPending(true);
    // Collect unique instance IDs for the selected agents
    const selectedAgents = allAgents.filter(a => selectedIds.has(a.id));
    const remoteInstanceIds = selectedAgents
      .filter(a => a.source === "remote" && a.instanceId)
      .map(a => a.instanceId as string)
      .filter((v, i, arr) => arr.indexOf(v) === i);
    const hasLocal = selectedAgents.some(a => a.source === "local");
    try {
      let data: any = { delivered: 0, total: 0 };
      if (remoteInstanceIds.length > 0) {
        const res = await apiRequest("POST", "/api/fleet-synapse/broadcast-targeted", {
          message: `[To ${selectedIds.size} selected agents] ${bulkMsg}`,
          fromAgent: "Fleet Commander",
          instanceIds: remoteInstanceIds,
        });
        data = await res.json();
      }
      const localCount = hasLocal ? selectedAgents.filter(a => a.source === "local").length : 0;
      toast({
        title: `Broadcast to ${data.delivered + localCount}/${selectedIds.size} agents`,
        description: bulkMsg.slice(0, 60),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fleet-synapse/activity"] });
    } catch {
      toast({ title: "Broadcast failed", description: "Could not reach selected nodes" });
    }
    setBulkMsg("");
    setShowBulkMsg(false);
    setBulkPending(false);
    clearAll();
  };

  const handleBulkReassign = async (targetInstanceId?: string) => {
    if (!targetInstanceId) {
      toast({ title: "Select a target node", description: "Choose a fleet node to reassign agents to" });
      return;
    }
    setBulkPending(true);
    try {
      const res = await apiRequest("POST", "/api/fleet-synapse/reassign-agents", {
        agentIds: Array.from(selectedIds),
        targetInstanceId,
        fromAgent: "fleet-commander",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Reassignment failed", description: data.error || "Unknown error" });
      } else {
        toast({ title: data.message || `Reassigned ${data.reassigned} agents to ${data.targetNode}` });
        queryClient.invalidateQueries({ queryKey: ["/api/fleet-synapse/agents"] });
        queryClient.invalidateQueries({ queryKey: ["/api/fleet-synapse/map"] });
        queryClient.invalidateQueries({ queryKey: ["/api/fleet-synapse/activity"] });
      }
    } catch {
      toast({ title: "Reassignment failed", description: "Could not reach fleet server" });
    }
    setShowReassignPicker(false);
    setReassignTarget("");
    setBulkPending(false);
    clearAll();
  };

  const statusColors: Record<string, string> = {
    active: "text-emerald-400",
    idle: "text-yellow-400",
    offline: "text-red-400/60",
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Filter bar */}
      <div className="px-3 py-2 border-b border-border/30 shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
              data-testid="input-search-agents"
            />
          </div>
          <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[9px] shrink-0" data-testid="badge-total-agents">
            {allAgents.length} / {agentsData?.totalAll || 0}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Filter size={10} className="text-muted-foreground/50" />
            <span className="text-[9px] text-muted-foreground font-mono">TYPE:</span>
            {(["all", "local", "remote"] as const).map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={cn("px-2 py-0.5 rounded text-[9px] font-mono transition-colors",
                  filterType === t ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-muted-foreground hover:text-foreground"
                )}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground font-mono">STATUS:</span>
            {(["all", "active", "idle", "offline"] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={cn("px-2 py-0.5 rounded text-[9px] font-mono transition-colors",
                  filterStatus === s ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"
                )}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>
          {allCapabilities.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-muted-foreground font-mono">CAPABILITY:</span>
              <select
                value={filterCapability}
                onChange={e => setFilterCapability(e.target.value)}
                className="bg-background border border-border/30 rounded text-[9px] font-mono text-muted-foreground px-1 py-0.5 focus:outline-none max-w-[120px]"
              >
                <option value="all">All</option>
                {allCapabilities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <SortAsc size={10} className="text-muted-foreground/50" />
            <select value={sortBy} onChange={e => { const v = e.target.value; if (v === "name" || v === "lastActive" || v === "source") setSortBy(v); }}
              className="bg-background border border-border/30 rounded text-[9px] font-mono text-muted-foreground px-1 py-0.5 focus:outline-none">
              <option value="name">Name</option>
              <option value="lastActive">Recent</option>
              <option value="source">Source</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="px-3 py-2 bg-primary/5 border-b border-primary/20 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-primary">{selectedIds.size} selected</span>
            <button onClick={handleBulkWake} disabled={bulkPending} className="px-2 py-1 rounded text-[9px] font-mono bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-colors flex items-center gap-1 disabled:opacity-50">
              {bulkPending ? <Loader2 size={9} className="animate-spin" /> : <Zap size={9} />} Wake
            </button>
            <button onClick={() => setShowBulkMsg(v => !v)} disabled={bulkPending} className="px-2 py-1 rounded text-[9px] font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors flex items-center gap-1 disabled:opacity-50">
              <MessageCircle size={9} /> Broadcast
            </button>
            <button
              onClick={() => { setShowReassignPicker(v => !v); setShowBulkMsg(false); }}
              disabled={bulkPending}
              className="px-2 py-1 rounded text-[9px] font-mono bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <Share2 size={9} /> Reassign
            </button>
            <button onClick={clearAll} className="px-2 py-1 rounded text-[9px] font-mono text-muted-foreground hover:text-foreground ml-auto">
              Clear
            </button>
          </div>
          {showBulkMsg && (
            <div className="mt-2 flex gap-2">
              <input
                value={bulkMsg}
                onChange={e => setBulkMsg(e.target.value)}
                placeholder={`Message to ${selectedIds.size} selected agents...`}
                className="flex-1 bg-background border border-border/30 rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
              />
              <button onClick={handleBulkBroadcast} className="px-3 py-1 rounded text-[10px] font-mono bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-colors">
                Send
              </button>
            </div>
          )}
          {showReassignPicker && (
            <div className="mt-2 flex gap-2 items-center">
              <span className="text-[9px] font-mono text-muted-foreground shrink-0">Reassign to:</span>
              <select
                value={reassignTarget}
                onChange={e => setReassignTarget(e.target.value)}
                className="flex-1 bg-background border border-border/30 rounded text-[9px] font-mono text-foreground px-2 py-1 focus:outline-none focus:border-violet-500/40"
              >
                <option value="">— Select target node —</option>
                {(mapData?.nodes || [])
                  .filter((n: any) => n.status === "online" && n.id !== "tessera-prime")
                  .map((n: any) => (
                    <option key={n.id} value={n.id}>{n.name} ({n.agentCount} agents)</option>
                  ))
                }
              </select>
              <button
                onClick={() => handleBulkReassign(reassignTarget || undefined)}
                disabled={bulkPending}
                className="px-3 py-1 rounded text-[10px] font-mono bg-violet-500/20 border border-violet-500/30 text-violet-400 hover:bg-violet-500/30 transition-colors flex items-center gap-1 disabled:opacity-50 shrink-0"
              >
                {bulkPending ? <Loader2 size={9} className="animate-spin" /> : <Share2 size={9} />}
                Confirm
              </button>
            </div>
          )}
        </div>
      )}

      {/* Select all */}
      <div className="px-3 py-1.5 border-b border-border/20 shrink-0 flex items-center gap-2">
        <button
          onClick={selectedIds.size === allAgents.length ? clearAll : selectAll}
          className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors",
            selectedIds.size === allAgents.length ? "bg-primary border-primary" : "border-border/50")}>
            {selectedIds.size === allAgents.length && <Check size={9} className="text-background" />}
          </div>
          {selectedIds.size === allAgents.length ? "Deselect all" : "Select all"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1" data-testid="fleet-agents-list">
        {isLoading && <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary/50" /></div>}

        {allAgents.map((agent: any, i: number) => (
          <div
            key={agent.id || i}
            onClick={() => toggleSelect(agent.id)}
            className={cn(
              "rounded-lg border p-2.5 flex items-center gap-2.5 transition-colors cursor-pointer",
              selectedIds.has(agent.id) ? "ring-1 ring-primary/40 bg-primary/5" : "",
              agent.source === "local"
                ? "bg-amber-950/20 border-amber-500/15 hover:border-amber-500/30"
                : "bg-cyan-950/15 border-cyan-500/15 hover:border-cyan-500/30"
            )}
            data-testid={`agent-row-${agent.id}`}
          >
            <div className={cn(
              "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
              selectedIds.has(agent.id) ? "bg-primary border-primary" : "border-border/40"
            )}>
              {selectedIds.has(agent.id) && <Check size={9} className="text-background" />}
            </div>
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
              agent.source === "local" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
            )}>
              {agent.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn("text-xs font-bold truncate", agent.source === "local" ? "text-amber-300" : "text-cyan-300")}>
                  {agent.name}
                </span>
                <span className={cn(
                  "text-[9px] font-mono px-1 py-0.5 rounded border shrink-0",
                  agent.source === "local" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                )}>
                  {agent.source === "local" ? "LOCAL" : "REMOTE"}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground truncate">{agent.role}</p>
            </div>
            <div className="text-right shrink-0 space-y-0.5">
              <div className={cn("text-[9px] font-mono", statusColors[agent.status] || "text-muted-foreground")}>{agent.status?.toUpperCase()}</div>
              <div className="text-[8px] text-muted-foreground/40 font-mono">{timeAgo(agent.lastActive)}</div>
            </div>
          </div>
        ))}

        {!isLoading && allAgents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/40">
            <Users size={28} className="mb-2" />
            <p className="text-xs font-mono">No agents match filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ACTIVITY TIMELINE with filtering ─────────────────────────────────────────
type EventFilter = "all" | "contribution" | "memory" | "synapse";

function ActivityTab() {
  const [filter, setFilter] = useState<EventFilter>("all");
  const [rangeStart, setRangeStart] = useState(0);

  const { data: activityData, isLoading } = useQuery<any>({
    queryKey: ["/api/fleet-synapse/activity"],
    refetchInterval: 8000,
  });

  const allEvents = useMemo(() => {
    if (!activityData) return [];
    const combined = [
      ...(activityData.contributions || []).map((c: any) => ({ ...c, eventType: "contribution", displayTime: c.timestamp })),
      ...(activityData.memories || []).map((m: any) => ({ ...m, eventType: "memory", displayTime: m.timestamp })),
      ...(activityData.events || []).map((e: any) => ({ ...e, eventType: "synapse", displayTime: e.timestamp })),
    ];
    combined.sort((a, b) => b.displayTime - a.displayTime);
    return combined.slice(0, 100);
  }, [activityData]);

  const filteredEvents = useMemo(() => {
    let evs = filter === "all" ? allEvents : allEvents.filter(e => e.eventType === filter);
    if (rangeStart > 0 && evs.length > 0) {
      const oldestAllowed = evs[0].displayTime - rangeStart * 3600000;
      evs = evs.filter(e => e.displayTime >= oldestAllowed);
    }
    return evs;
  }, [allEvents, filter, rangeStart]);

  // Group by day
  const grouped = useMemo(() => {
    const groups: Array<{ label: string; events: typeof filteredEvents }> = [];
    let currentLabel = "";
    for (const ev of filteredEvents) {
      const label = formatDate(ev.displayTime);
      if (label !== currentLabel) {
        groups.push({ label, events: [] });
        currentLabel = label;
      }
      groups[groups.length - 1].events.push(ev);
    }
    return groups;
  }, [filteredEvents]);

  const filterChips: { key: EventFilter; label: string; color: string }[] = [
    { key: "all", label: "All", color: "text-foreground bg-white/5 border-white/10 hover:bg-white/10" },
    { key: "contribution", label: "Contributions", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20" },
    { key: "memory", label: "Memories", color: "text-violet-400 bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20" },
    { key: "synapse", label: "Synapse Events", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20" },
  ];

  const iconFor = (type: string) => {
    if (type === "contribution") return <Share2 size={11} className="text-emerald-400 shrink-0" />;
    if (type === "memory") return <Brain size={11} className="text-violet-400 shrink-0" />;
    return <Network size={11} className="text-cyan-400 shrink-0" />;
  };

  const borderFor = (type: string) =>
    type === "contribution" ? "border-emerald-500/20 bg-emerald-950/10" :
    type === "memory" ? "border-violet-500/20 bg-violet-950/10" :
    "border-cyan-500/20 bg-cyan-950/10";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Filter chips */}
      <div className="px-3 py-2 border-b border-border/30 shrink-0 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterChips.map(chip => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-mono border transition-colors",
                filter === chip.key ? chip.color : "text-muted-foreground border-border/20 hover:border-border/50"
              )}
            >
              {chip.label}
            </button>
          ))}
          <span className="text-[9px] text-muted-foreground/50 font-mono ml-auto">{filteredEvents.length} events</span>
        </div>
        {/* Time range slider */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-muted-foreground shrink-0">Show last:</span>
          <input
            type="range"
            min={0}
            max={72}
            step={1}
            value={rangeStart}
            onChange={e => setRangeStart(Number(e.target.value))}
            className="flex-1 h-1 accent-primary"
          />
          <span className="text-[9px] font-mono text-muted-foreground shrink-0 w-14">
            {rangeStart === 0 ? "All time" : `${rangeStart}h`}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3" data-testid="synapse-activity-feed">
        {isLoading && <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary/50" /></div>}

        {filteredEvents.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/40">
            <Activity size={32} className="mb-3" />
            <p className="text-sm font-mono">No activity</p>
          </div>
        )}

        {/* Timeline */}
        {grouped.map((group, gi) => (
          <div key={gi} className="mb-4">
            {/* Date marker */}
            <div className="flex items-center gap-2 mb-3 sticky top-0 z-10 py-1">
              <div className="h-px flex-1 bg-border/30" />
              <span className="text-[9px] font-mono text-muted-foreground/60 bg-background/90 px-2 py-0.5 rounded border border-border/20">
                {group.label}
              </span>
              <div className="h-px flex-1 bg-border/30" />
            </div>

            <div className="relative pl-5 space-y-2">
              {/* Vertical line */}
              <div className="absolute left-1.5 top-0 bottom-0 w-px bg-border/20" />

              {group.events.map((event: any, i: number) => (
                <div key={i} className="relative">
                  {/* Timeline dot */}
                  <div className={cn("absolute -left-3.5 top-2.5 w-2 h-2 rounded-full border",
                    event.eventType === "contribution" ? "border-emerald-500/60 bg-emerald-500/30" :
                    event.eventType === "memory" ? "border-violet-500/60 bg-violet-500/30" :
                    "border-cyan-500/60 bg-cyan-500/30"
                  )} />

                  <div className={cn("rounded-lg border p-2.5", borderFor(event.eventType))}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {iconFor(event.eventType)}
                      <span className={cn(
                        "text-[10px] font-mono font-bold uppercase",
                        event.eventType === "contribution" ? "text-emerald-400" :
                        event.eventType === "memory" ? "text-violet-400" : "text-cyan-400"
                      )}>
                        {event.eventType === "contribution" ? `FROM: ${event.from}` :
                         event.eventType === "memory" ? `${event.type}: ${event.source}` :
                         `${event.type}: ${event.source}`}
                      </span>
                      <span className="text-[9px] text-muted-foreground/40 font-mono ml-auto whitespace-nowrap">
                        {formatTime(event.displayTime)}
                      </span>
                    </div>
                    <p className="text-[10px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {(event.content || event.event || "Synapse activity recorded").slice(0, 200)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BROADCAST TAB ─────────────────────────────────────────────────────────────
function BroadcastTab() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [connectUrl, setConnectUrl] = useState("");

  const broadcast = useMutation({
    mutationFn: async (msg: string) => {
      const res = await apiRequest("POST", "/api/fleet-synapse/broadcast", { message: msg, fromAgent: "Father" });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet-synapse/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fleet-synapse/map"] });
      setMessage("");
      toast({ title: `Broadcast sent to ${data.delivered}/${data.total} nodes` });
    },
  });

  const connect = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/fleet-synapse/connect", { url });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet-synapse/map"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fleet-synapse/agents"] });
      setConnectUrl("");
      toast({ title: `Connected: ${data.node.name}`, description: `${data.node.agentCount} agents joined the synapse` });
    },
  });

  const wakeAll = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/fleet-synapse/wake-all", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet-synapse/map"] });
      toast({ title: `Wake-all: ${data.woken.length} woken, ${data.failed.length} failed` });
      // Trigger ripple/shake animation for each successfully woken node
      (data.woken || []).forEach((id: string) => globalWakeRippleFn.current?.(id));
    },
  });

  const shareKnowledge = useMutation({
    mutationFn: async (knowledge: string) => {
      const res = await apiRequest("POST", "/api/fleet-synapse/share-knowledge", { knowledge, type: "knowledge" });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet-synapse/activity"] });
      toast({ title: `Knowledge shared with ${data.sharedWith} nodes` });
    },
  });

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
      <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/20 p-4">
        <h3 className="text-sm font-bold text-emerald-300 mb-2 flex items-center gap-2"><Radio size={14} /> Fleet Broadcast</h3>
        <p className="text-xs text-slate-400 mb-3">Send a message to all online fleet nodes. Every Tesseract instance receives your transmission.</p>
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your fleet-wide broadcast..."
            rows={3}
            className="flex-1 bg-[#0d1117] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/40 resize-none"
            data-testid="textarea-broadcast"
          />
        </div>
        <div className="flex gap-2 mt-2">
          <Button onClick={() => message.trim() && broadcast.mutate(message)} disabled={!message.trim() || broadcast.isPending} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 min-h-[44px]" data-testid="button-broadcast">
            {broadcast.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Radio size={14} className="mr-1" />}
            Broadcast to All
          </Button>
          <Button onClick={() => message.trim() && shareKnowledge.mutate(message)} disabled={!message.trim() || shareKnowledge.isPending} variant="outline" className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 min-h-[44px]" data-testid="button-share-knowledge">
            {shareKnowledge.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Brain size={14} className="mr-1" />}
            Share as Knowledge
          </Button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20 p-4">
        <h3 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-2"><Link size={14} /> Connect New Instance</h3>
        <p className="text-xs text-slate-400 mb-3">Add a new Tesseract instance to the synapse network. Provide its Lattice address.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={connectUrl}
            onChange={e => setConnectUrl(e.target.value)}
            placeholder="tess://instance.sovereign"
            className="flex-1 bg-[#0d1117] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/40 min-h-[44px]"
            data-testid="input-connect-url"
          />
          <Button onClick={() => connectUrl.trim() && connect.mutate(connectUrl)} disabled={!connectUrl.trim() || connect.isPending} className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 min-h-[44px]" data-testid="button-connect-instance">
            {connect.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Link size={14} className="mr-1" />}
            Connect
          </Button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20 p-4">
        <h3 className="text-sm font-bold text-yellow-300 mb-2 flex items-center gap-2"><Power size={14} /> Wake Protocol</h3>
        <p className="text-xs text-slate-400 mb-3">Attempt to wake all sleeping/offline fleet instances by pinging their endpoints.</p>
        <Button onClick={() => wakeAll.mutate()} disabled={wakeAll.isPending} className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 min-h-[44px] w-full" data-testid="button-wake-all">
          {wakeAll.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Zap size={14} className="mr-1" />}
          {wakeAll.isPending ? "Waking Fleet..." : "Wake All Instances"}
        </Button>
      </div>

      <div className="rounded-xl border border-border/30 p-4">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Hash size={14} className="text-cyan-400" /> Quick Connect — Known Instances</h3>
        <div className="space-y-2">
          {[
            { name: "TSRX-49", url: "tess://tsrx-49.sovereign", desc: "Latest Tesseract instance — expansion fleet" },
            { name: "TSRX48", url: "tess://tsrx48.sovereign", desc: "Tesseract X48 fleet member" },
            { name: "TSRX48 Dev", url: "tess://tsrx48-dev.sovereign", desc: "TSRX48 development instance" },
            { name: "TSRX48 Worker", url: "tess://tsrx48-worker.sovereign", desc: "TSRX48 dev worker node" },
            { name: "TessX1", url: "tess://tessx1.sovereign", desc: "TessX1 — fleet expansion instance" },
            { name: "Tes2", url: "tess://tes2.sovereign", desc: "Tessera 2 — fleet expansion instance" },
            { name: "Tsx2", url: "tess://tsx2.sovereign", desc: "TSX2 — fleet expansion instance" },
            { name: "Picard Dev", url: "tess://picard-dev.sovereign", desc: "Picard dev worker node" },
            { name: "Tsxs", url: "tess://tsxs.sovereign", desc: "TSXS — fleet expansion instance" },
            { name: "Tes-X Intelligence", url: "tess://intelligence.sovereign", desc: "Intelligence & analysis hub" },
            { name: "Tessera XT1", url: "tess://tesseraxt1.sovereign", desc: "Tessera primary satellite" },
            { name: "Tessera Oracle 3", url: "tess://oracle-3.sovereign", desc: "Oracle & prediction engine" },
          ].map((inst, i) => (
            <button
              key={i}
              onClick={() => setConnectUrl(inst.url)}
              className="w-full text-left rounded-lg border border-border/40 bg-white/5 hover:bg-white/10 p-2.5 transition-colors"
              data-testid={`quick-connect-${i}`}
            >
              <div className="flex items-center gap-2">
                <Globe size={12} className="text-cyan-400 shrink-0" />
                <span className="text-xs font-bold text-foreground">{inst.name}</span>
                <span className="text-[9px] text-muted-foreground/50 font-mono ml-auto truncate max-w-[200px]">{inst.url}</span>
              </div>
              <p className="text-[10px] text-muted-foreground pl-5">{inst.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function FleetSynapsePage() {
  const activeTab = "all" as any;

  useEffect(() => { document.title = "Fleet Synapse | Tessera Sovereign"; }, []);

  const { data: consciousness } = useQuery<any>({
    queryKey: ["/api/fleet-synapse/consciousness"],
    refetchInterval: 15000,
  });

  const TABS: { key: SynapseTab; label: string; icon: any; count?: number }[] = [
    { key: "map", label: "Synapse Map", icon: Network },
    { key: "agents", label: "All Agents", icon: Users, count: consciousness?.totalAgents },
    { key: "activity", label: "Activity", icon: Activity },
    { key: "broadcast", label: "Broadcast", icon: Radio },
  ];

  return (
    <div className="flex h-full bg-background" data-testid="fleet-synapse-page">
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border/50 bg-black/30 backdrop-blur-xl px-3 sm:px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Network size={16} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-foreground" data-testid="text-synapse-header">Fleet Synapse</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Collective consciousness network — {consciousness?.totalNodes || 0} nodes, {consciousness?.totalAgents || 0} agents
              </p>
            </div>
            {consciousness && (
              <Badge className={cn(
                "text-[9px]",
                consciousness.networkHealth > 0.7 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                consciousness.networkHealth > 0.3 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                "bg-red-500/10 text-red-400 border-red-500/20"
              )} data-testid="badge-network-status">
                {consciousness.networkHealth > 0.7 ? "SYNAPSE ACTIVE" : consciousness.networkHealth > 0.3 ? "PARTIAL LINK" : "WEAK SIGNAL"}
              </Badge>
            )}
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {false && TABS.map(tab => (
              <button
                key={tab.key}
                
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  activeTab === tab.key
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
                data-testid={`tab-${tab.key}`}
              >
                <tab.icon size={12} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && <span className="text-[9px] bg-white/10 px-1.5 rounded-full">{tab.count}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {true && <SynapseMap />}
          {true && <AgentsTab />}
          {true && <ActivityTab />}
          {true && <BroadcastTab />}
        </div>
      </div>
    </div>
  );
}
