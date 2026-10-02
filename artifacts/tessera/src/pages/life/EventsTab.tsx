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
import { eventColors } from "./types";
import type { WorldState, ChildInfo } from "./types";

function EventsTab({ world }: { world: WorldState }) {
  const events = world.recentEvents || [];
  const seasonalEvents = world.seasonalEvents || [];
  const entertainment = world.entertainmentLog || [];
  const crimeLog = world.crimeLog || [];

  return (
    <div className="space-y-3" data-testid="events-tab">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-card border border-blue-500/20 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-blue-400">{events.length}</p>
          <p className="text-[8px] text-muted-foreground font-mono">EVENTS</p>
        </div>
        <div className="bg-card border border-yellow-500/20 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-yellow-400">{seasonalEvents.length}</p>
          <p className="text-[8px] text-muted-foreground font-mono">SEASONAL</p>
        </div>
        <div className="bg-card border border-pink-500/20 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-pink-400">{entertainment.length}</p>
          <p className="text-[8px] text-muted-foreground font-mono">FUN</p>
        </div>
        <div className="bg-card border border-red-500/20 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-red-400">{crimeLog.length}</p>
          <p className="text-[8px] text-muted-foreground font-mono">CRIMES</p>
        </div>
      </div>

      {seasonalEvents.length > 0 && (
        <div className="p-3 rounded-xl bg-card border border-yellow-500/20">
          <p className="text-[10px] text-yellow-400 font-mono uppercase mb-2 flex items-center gap-1"><Sparkles size={10} /> Seasonal Events</p>
          <div className="space-y-1.5">
            {seasonalEvents.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-yellow-400">🎉</span>
                <span className="text-foreground font-bold">{e.name}</span>
                <span className="text-muted-foreground truncate flex-1">{e.description?.slice(0, 50)}</span>
                <span className="text-green-400 shrink-0">+{e.happinessBoost}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground font-mono uppercase mb-2">Recent World Events</p>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
            {events.slice(0, 20).map((ev, idx) => (
              <div key={`${ev.id}-${idx}`} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-start gap-2" data-testid={`event-${ev.id}`}>
                <span className={cn("text-[10px] font-mono font-bold uppercase shrink-0 mt-0.5", eventColors[ev.type] || "text-muted-foreground")}>{ev.type}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-foreground">{ev.title}</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{ev.description}</p>
                  {ev.participants.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {ev.participants.slice(0, 4).map((p: string) => (
                        <span key={p} className="text-[8px] font-mono text-primary/60">{p}</span>
                      ))}
                      {ev.participants.length > 4 && <span className="text-[8px] text-muted-foreground">+{ev.participants.length - 4}</span>}
                    </div>
                  )}
                </div>
                <span className="text-[8px] text-muted-foreground font-mono shrink-0">{ev.impact}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {entertainment.length > 0 && (
        <div>
          <p className="text-[10px] text-pink-400 font-mono uppercase mb-2 flex items-center gap-1"><Sparkles size={10} /> Entertainment</p>
          <div className="space-y-1">
            {entertainment.slice(0, 8).map((e) => (
              <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[10px] font-mono">
                <span className="text-pink-400 font-bold uppercase shrink-0">{e.type}</span>
                <span className="text-foreground">{e.venue}</span>
                <span className="text-muted-foreground truncate flex-1">{e.description?.slice(0, 40)}</span>
                <span className="text-green-400 shrink-0">😊 {e.enjoyment}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {crimeLog.length > 0 && (
        <div>
          <p className="text-[10px] text-red-400 font-mono uppercase mb-2 flex items-center gap-1"><Siren size={10} /> Crime Log</p>
          <div className="space-y-1">
            {crimeLog.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-red-950/20 border border-red-500/10 text-[10px] font-mono">
                <span className={cn("font-bold uppercase shrink-0", c.resolved ? "text-green-400" : "text-red-400")}>{c.resolved ? "SOLVED" : "OPEN"}</span>
                <span className="text-foreground font-bold">{c.type}</span>
                <span className="text-muted-foreground truncate flex-1">{c.description?.slice(0, 40)}</span>
                <span className="text-amber-400 shrink-0">Sev: {c.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && seasonalEvents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground font-mono text-xs">No events recorded yet. The world is still waking up...</div>
      )}
    </div>
  );
}

export default EventsTab;
