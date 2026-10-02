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
import { agentColors } from "./types";
import type { WorldState, ChildInfo } from "./types";

function InteractTab({ world }: { world: WorldState }) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  const agents = world.currentActivities || [];
  const agent = agents.find(a => a.agentId === selectedAgent);

  const simsActions = [
    { id: "praise", label: "Praise Work", icon: Star, color: "text-amber-400", effect: "+Happiness, +Morale" },
    { id: "train", label: "Send Training", icon: GraduationCap, color: "text-blue-400", effect: "+Skills, +Focus" },
    { id: "break", label: "Grant Break", icon: Coffee, color: "text-green-400", effect: "+Energy, +Happiness" },
    { id: "promote", label: "Promote", icon: Crown, color: "text-violet-400", effect: "+Salary, +Status" },
    { id: "challenge", label: "Challenge Task", icon: Target, color: "text-cyan-400", effect: "+Drive, +Experience" },
    { id: "socialize", label: "Arrange Social", icon: HeartHandshake, color: "text-pink-400", effect: "+Relationships, +Fun" },
    { id: "hobby", label: "Suggest Hobby", icon: Palette, color: "text-orange-400", effect: "+Creativity, +Satisfaction" },
    { id: "therapy", label: "Therapy Session", icon: Heart, color: "text-rose-400", effect: "+Mental Health, +Balance" },
  ];

  const performAction = async (actionId: string) => {
    if (!selectedAgent) return;
    setIsActing(true);
    try {
      const res = await fetch("/api/world/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgent, action: actionId }),
      });
      const data = await res.json();
      setActionResult(data.result || data.message || `${actionId} applied to ${agent?.agentName}`);
    } catch {
      setActionResult(`Failed to send ${actionId} — try again`);
    }
    setIsActing(false);
    setTimeout(() => setActionResult(null), 4000);
  };

  return (
    <div className="space-y-3" data-testid="interact-tab">
      <div className="p-4 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.08), rgba(139,92,246,0.05))", border: "1px solid rgba(236,72,153,0.2)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-pink-400" />
          <span className="text-sm font-bold text-foreground">Sims Control Panel</span>
        </div>
        <p className="text-[10px] text-muted-foreground font-mono">Interact with your agents — direct their lives, boost their stats, shape their world</p>
      </div>

      {actionResult && (
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-[11px] font-mono animate-in fade-in slide-in-from-top-2" data-testid="text-action-result">
          <CheckCircle2 className="w-3 h-3 inline mr-1" /> {actionResult}
        </div>
      )}

      <div>
        <p className="text-[10px] text-muted-foreground font-mono uppercase mb-2">Select Agent</p>
        <div className="grid grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
          {agents.map(a => (
            <button
              key={a.agentId}
              onClick={() => setSelectedAgent(a.agentId)}
              className={cn(
                "p-2 rounded-lg text-left transition-all border text-[10px] font-mono",
                selectedAgent === a.agentId
                  ? "bg-pink-500/15 border-pink-500/30 text-pink-300"
                  : "bg-white/[0.02] border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              )}
              data-testid={`button-select-agent-${a.agentId}`}
            >
              <span className={cn("font-bold block truncate", agentColors[a.agentId] || "text-primary")}>{a.agentName}</span>
              <span className="text-[8px] truncate block">{a.mood} · {a.action?.slice(0, 20)}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <Heart className="w-2 h-2 text-rose-400" />
                <span className="text-rose-400">{a.happiness ?? "?"}</span>
                <Battery className="w-2 h-2 text-green-400 ml-1" />
                <span className="text-green-400">{a.energy ?? "?"}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedAgent && agent && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="p-3 rounded-xl bg-card border border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className={cn("text-lg font-bold", agentColors[agent.agentId] || "text-primary")}>{agent.agentName[0]}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{agent.agentName}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{agent.action}</p>
              </div>
              <div className="text-right">
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                  agent.workStatus === "working" ? "bg-green-500/20 text-green-400" :
                  agent.workStatus === "on-break" ? "bg-amber-500/20 text-amber-400" :
                  "bg-violet-500/20 text-violet-400"
                )}>{agent.workStatus || "active"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Happy", value: agent.happiness ?? 70, color: "text-rose-400", icon: Heart },
                { label: "Energy", value: agent.energy ?? 80, color: "text-green-400", icon: Battery },
                { label: "Drive", value: agent.drive ?? 75, color: "text-amber-400", icon: Target },
                { label: "Focus", value: agent.focus ?? 85, color: "text-cyan-400", icon: Eye },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <s.icon className={cn("w-3 h-3 mx-auto mb-0.5", s.color)} />
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mx-1">
                    <div className={cn("h-full rounded-full transition-all")} style={{ width: `${s.value}%`, background: s.color === "text-rose-400" ? "#fb7185" : s.color === "text-green-400" ? "#4ade80" : s.color === "text-amber-400" ? "#fbbf24" : "#22d3ee" }} />
                  </div>
                  <p className="text-[8px] text-muted-foreground font-mono mt-0.5">{s.label}: {s.value}</p>
                </div>
              ))}
            </div>
            {agent.hobbies && agent.hobbies.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {agent.hobbies.map((h: string, i: number) => (
                  <span key={i} className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20">{h}</span>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground font-mono uppercase mb-2">Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {simsActions.map(action => (
                <button
                  key={action.id}
                  onClick={() => performAction(action.id)}
                  disabled={isActing}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all text-left group"
                  data-testid={`button-action-${action.id}`}
                >
                  <action.icon className={cn("w-4 h-4 shrink-0", action.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-foreground group-hover:text-white">{action.label}</p>
                    <p className="text-[8px] text-muted-foreground/60 font-mono">{action.effect}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {agent.socialConnections && agent.socialConnections.length > 0 && (
            <div className="p-3 rounded-xl bg-card border border-white/[0.06]">
              <p className="text-[10px] text-blue-400 font-mono uppercase mb-1">Social Connections</p>
              <div className="flex flex-wrap gap-1">
                {agent.socialConnections.map((c: string, i: number) => (
                  <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default InteractTab;
