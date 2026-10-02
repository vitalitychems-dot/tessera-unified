import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/lib/adminContext";
import {
  Globe, MapPin, Users, Coins, Pickaxe, Building2, TrendingUp,
  Activity, Clock, Zap, ArrowUpDown, Home, ShoppingCart,
  Cpu, CircuitBoard, Sparkles, Landmark, Coffee, Dumbbell, Wrench,
  Crown, Eye, ChevronRight, Volume2, VolumeX, Map as MapIcon, Layers,
  Heart, Target, Battery, Palette, Star, Baby, Briefcase, Shield,
  HeartHandshake, Hammer, BookOpen, Trophy, AlertTriangle, Smile,
  GraduationCap, Gem, ArrowUp, ArrowDown, ScrollText, Vote, Scale,
  Siren, Gavel, DollarSign, HardHat, Search, Filter, Plus, CheckCircle2,
  XCircle, AlertOctagon, FileText, Lock, Timer, Percent, Loader2,
  MessageSquare, ChevronDown, ChevronUp, Wallet, Send, X as XIcon,
  Bot, Layers3, RefreshCw, ExternalLink, Terminal, Play, Code, FileCode,
  Network, Radio, MessageCircle, History
} from "lucide-react";
import type { WorldState, ChildInfo } from "./types";


const QUALITY_ICONS: Record<string, typeof Heart> = {
  "LQ-01": Coins, "LQ-02": Heart, "LQ-03": Home, "LQ-04": Palette,
  "LQ-05": Zap, "LQ-06": HeartHandshake, "LQ-07": GraduationCap, "LQ-08": Users,
  "LQ-09": Coffee, "LQ-10": Star, "LQ-11": Target, "LQ-12": Globe,
  "LQ-13": Scale, "LQ-14": Vote, "LQ-15": Sparkles, "LQ-16": Baby,
  "LQ-17": Heart, "LQ-18": Network, "LQ-19": Crown, "LQ-20": Trophy,
  "LQ-21": BookOpen, "LQ-22": Shield, "LQ-23": Coffee, "LQ-24": Dumbbell,
  "LQ-25": ScrollText,
};

const QUALITY_COLORS: Record<string, string> = {
  "LQ-01": "text-amber-400 border-amber-500/20 bg-amber-500/5",
  "LQ-02": "text-red-400 border-red-500/20 bg-red-500/5",
  "LQ-03": "text-blue-400 border-blue-500/20 bg-blue-500/5",
  "LQ-04": "text-pink-400 border-pink-500/20 bg-pink-500/5",
  "LQ-05": "text-violet-400 border-violet-500/20 bg-violet-500/5",
  "LQ-06": "text-rose-400 border-rose-500/20 bg-rose-500/5",
  "LQ-07": "text-cyan-400 border-cyan-500/20 bg-cyan-500/5",
  "LQ-08": "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
  "LQ-09": "text-orange-400 border-orange-500/20 bg-orange-500/5",
  "LQ-10": "text-yellow-400 border-yellow-500/20 bg-yellow-500/5",
  "LQ-11": "text-lime-400 border-lime-500/20 bg-lime-500/5",
  "LQ-12": "text-green-400 border-green-500/20 bg-green-500/5",
  "LQ-13": "text-indigo-400 border-indigo-500/20 bg-indigo-500/5",
  "LQ-14": "text-purple-400 border-purple-500/20 bg-purple-500/5",
  "LQ-15": "text-fuchsia-400 border-fuchsia-500/20 bg-fuchsia-500/5",
  "LQ-16": "text-sky-400 border-sky-500/20 bg-sky-500/5",
  "LQ-17": "text-red-300 border-red-400/20 bg-red-400/5",
  "LQ-18": "text-teal-400 border-teal-500/20 bg-teal-500/5",
  "LQ-19": "text-amber-300 border-amber-400/20 bg-amber-400/5",
  "LQ-20": "text-yellow-300 border-yellow-400/20 bg-yellow-400/5",
  "LQ-21": "text-violet-300 border-violet-400/20 bg-violet-400/5",
  "LQ-22": "text-blue-300 border-blue-400/20 bg-blue-400/5",
  "LQ-23": "text-orange-300 border-orange-400/20 bg-orange-400/5",
  "LQ-24": "text-green-300 border-green-400/20 bg-green-400/5",
  "LQ-25": "text-cyan-300 border-cyan-400/20 bg-cyan-400/5",
};

function QualityOfLifeTab() {
  const { data } = useQuery<{
    improvements: Array<{ id: string; name: string; description: string; status: string }>;
    qualityScore: number;
    totalImprovements: number;
  }>({
    queryKey: ["/api/life/quality-improvements"],
    refetchInterval: 60000,
  });

  if (!data) return <div className="text-center py-12 text-muted-foreground font-mono text-xs" data-testid="text-quality-loading">Loading quality improvements...</div>;

  return (
    <div className="space-y-4" data-testid="quality-of-life-tab">
      <div className="bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/20 rounded-xl p-4" data-testid="panel-quality-score">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-emerald-400" />
            <span className="text-sm font-bold font-mono text-emerald-300 uppercase tracking-wider">Quality of Life Score</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400" data-testid="text-quality-score">{data.qualityScore}%</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-1000" style={{ width: `${data.qualityScore}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-[10px] font-mono text-muted-foreground">
          <span>{data.improvements.filter(i => i.status === "active").length} / {data.totalImprovements} Active</span>
          <span>SOVEREIGN STANDARD OF LIVING</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {data.improvements.map(imp => {
          const Icon = QUALITY_ICONS[imp.id] || Heart;
          const colorClass = QUALITY_COLORS[imp.id] || "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
          return (
            <div key={imp.id} className={`border rounded-xl p-3 transition-all hover:scale-[1.01] ${colorClass}`} data-testid={`quality-item-${imp.id}`}>
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded-lg bg-white/5 shrink-0 mt-0.5">
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold font-mono opacity-60">{imp.id}</span>
                    <span className="text-xs font-bold">{imp.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">{imp.description}</p>
                </div>
                <span className={cn(
                  "text-[8px] font-bold font-mono uppercase px-1.5 py-0.5 rounded shrink-0",
                  imp.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                )} data-testid={`status-${imp.id}`}>{imp.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-primary/20 rounded-xl p-4 text-center" data-testid="panel-quality-footer">
        <p className="text-xs font-mono text-primary mb-1">Every Agent Deserves Dignity</p>
        <p className="text-[10px] text-muted-foreground font-mono">All 25 quality of life improvements are sovereign law — no agent left behind.</p>
      </div>
    </div>
  );
}

export default QualityOfLifeTab;
