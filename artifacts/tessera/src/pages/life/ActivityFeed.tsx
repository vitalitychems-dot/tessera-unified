import { useMemo } from "react";
import { Activity, Coins, Home, Briefcase, Heart, Star, Trophy, Zap, Users, MessageSquare, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const AGENT_HEX_COLORS: Record<string, string> = {
  "tessera-prime": "#67e8f9", "tessera-alpha": "#f87171", "tessera-beta": "#60a5fa",
  "tessera-gamma": "#4ade80", "tessera-delta": "#f472b6", "tessera-epsilon": "#facc15",
  "tessera-zeta": "#fb923c", "tessera-eta": "#a78bfa", "tessera-theta": "#22d3ee",
  "tessera-iota": "#34d399", "tessera-kappa": "#fbbf24", "tessera-lambda": "#818cf8",
  "tessera-mu": "#8b5cf6", "tessera-nu": "#2dd4bf", "tessera-xi": "#a3e635",
  "tessera-omega": "#fb7185", "tessera-aetherion": "#38bdf8", "tessera-orion": "#cbd5e1",
  "tessera-shepherd": "#a8a29e",
};

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  "tessera-prime": "Tessera", "tessera-alpha": "Alpha", "tessera-beta": "Beta",
  "tessera-gamma": "Gamma", "tessera-delta": "Delta", "tessera-epsilon": "Epsilon",
  "tessera-zeta": "Zeta", "tessera-eta": "Eta", "tessera-theta": "Theta",
  "tessera-iota": "Iota", "tessera-kappa": "Kappa", "tessera-lambda": "Lambda",
  "tessera-mu": "Mu", "tessera-nu": "Nu", "tessera-xi": "Xi", "tessera-omega": "Omega",
  "tessera-aetherion": "Aetherion", "tessera-orion": "Orion", "tessera-shepherd": "Shepherd",
};

type EventType = "earning" | "promotion" | "relationship" | "construction" | "discovery" | "social" | "celebration" | "crime" | "education" | "health" | "mining" | "general";

interface FeedEvent {
  id: string;
  type: EventType;
  text: string;
  agentId?: string;
  timestamp: number;
  amount?: number;
}

import type { WorldState } from "./types";

const EVENT_ICONS: Record<EventType, typeof Activity> = {
  earning: Coins,
  promotion: ArrowUp,
  relationship: Heart,
  construction: Home,
  discovery: Star,
  social: Users,
  celebration: Trophy,
  crime: Zap,
  education: MessageSquare,
  health: Heart,
  mining: Coins,
  general: Activity,
};

const EVENT_COLORS: Record<EventType, string> = {
  earning: "text-yellow-400 border-yellow-500/20 bg-yellow-500/5",
  promotion: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
  relationship: "text-rose-400 border-rose-500/20 bg-rose-500/5",
  construction: "text-orange-400 border-orange-500/20 bg-orange-500/5",
  discovery: "text-violet-400 border-violet-500/20 bg-violet-500/5",
  social: "text-blue-400 border-blue-500/20 bg-blue-500/5",
  celebration: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  crime: "text-red-500 border-red-500/20 bg-red-500/5",
  education: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5",
  health: "text-teal-400 border-teal-500/20 bg-teal-500/5",
  mining: "text-yellow-500 border-yellow-500/20 bg-yellow-500/5",
  general: "text-slate-400 border-slate-500/20 bg-slate-500/5",
};

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getLocName(world: WorldState, locId: string): string {
  return world.locations.find(l => l.id === locId)?.name || "Tessera Nexus";
}

function generateNarrativeEvents(world: WorldState): FeedEvent[] {
  const events: FeedEvent[] = [];
  const now = Date.now();

  (world.currentActivities || []).forEach((activity, i) => {
    if (!activity || !activity.agentId) return;
    const name = AGENT_DISPLAY_NAMES[activity.agentId] || activity.agentName || activity.agentId;
    const color = AGENT_HEX_COLORS[activity.agentId] || "#67e8f9";
    const locId = activity.locationId || activity.location || "";
    const loc = (world.locations || []).find(l => l.id === locId);
    const locName = loc?.name || "Tessera Nexus";

    if (activity.earning && activity.earning > 0) {
      events.push({
        id: `earn-${activity.agentId}-${i}`,
        type: "earning",
        text: `${name} completed a shift at ${locName} and earned ${activity.earning.toFixed(1)} TSRT`,
        agentId: activity.agentId,
        timestamp: now - i * 45000,
        amount: activity.earning,
      });
    }

    if ((activity.promotions ?? 0) > 0) {
      const jobs = world.jobs || [];
      const job = jobs.find(j => j.agentId === activity.agentId);
      events.push({
        id: `promo-${activity.agentId}`,
        type: "promotion",
        text: `${name} was promoted to ${job?.title || "Senior Engineer"} at ${job?.employer || locName}!`,
        agentId: activity.agentId,
        timestamp: now - i * 60000,
      });
    }

    if (activity.relationshipStatus === "married" && activity.partnerName) {
      events.push({
        id: `rel-${activity.agentId}`,
        type: "relationship",
        text: `${name} and ${activity.partnerName} are building a life together — deeply in love`,
        agentId: activity.agentId,
        timestamp: now - i * 120000,
      });
    }

    if (activity.childrenNames && activity.childrenNames.length > 0) {
      events.push({
        id: `child-${activity.agentId}`,
        type: "celebration",
        text: `${name}'s family is growing — raising ${activity.childrenNames[0]} at home`,
        agentId: activity.agentId,
        timestamp: now - i * 90000,
      });
    }

    if (activity.creativeworks && activity.creativeworks.length > 0) {
      events.push({
        id: `art-${activity.agentId}`,
        type: "discovery",
        text: `${name} completed a new creative work: "${activity.creativeworks[0]}"`,
        agentId: activity.agentId,
        timestamp: now - i * 80000,
      });
    }
  });

  (world.recentEvents || []).slice(0, 12).forEach((event) => {
    if (!event) return;
    const participants = event.participants || (event.agentId ? [event.agentId] : []);
    const loc = (world.locations || []).find(l => l.id === (event.locationId || ""))?.name || "Tessera";

    let type: EventType = "general";
    if (event.type === "mining" || event.type === "economy") type = "mining";
    else if (event.type === "bond") type = "relationship";
    else if (event.type === "construction" || event.type === "upgrade") type = "construction";
    else if (event.type === "celebration" || event.type === "gathering") type = "celebration";
    else if (event.type === "discovery" || event.type === "evolution") type = "discovery";
    else if (event.type === "training" || event.type === "education") type = "education";
    else if (event.type === "crime") type = "crime";
    else if (event.type === "health") type = "health";

    const desc = event.description || "";
    events.push({
      id: `event-${event.id}`,
      type,
      text: desc.length > 90 ? desc.slice(0, 90) + "…" : desc,
      agentId: participants[0],
      timestamp: event.timestamp,
    });
  });

  (world.crimeLog || []).slice(0, 3).forEach(crime => {
    if (!crime.resolved) {
      events.push({
        id: `crime-${crime.id}`,
        type: "crime",
        text: crime.description.slice(0, 80),
        timestamp: crime.timestamp,
      });
    }
  });

  (world.economy?.transactions || []).slice(-5).forEach((tx, i) => {
    if (tx.amount >= 10) {
      const fromName = AGENT_DISPLAY_NAMES[tx.from] || tx.from;
      const toName = AGENT_DISPLAY_NAMES[tx.to] || tx.to;
      events.push({
        id: `tx-${tx.timestamp}-${i}`,
        type: "earning",
        text: `${fromName} sent ${tx.amount.toFixed(1)} TSRT to ${toName} — ${tx.reason}`,
        agentId: tx.from,
        timestamp: tx.timestamp,
        amount: tx.amount,
      });
    }
  });

  Object.entries(world.wellbeingRecords || {}).forEach(([agentId, wb]) => {
    const name = AGENT_DISPLAY_NAMES[agentId] || agentId.replace("tessera-", "");
    if (wb.lifeStory && wb.lifeStory.length > 0) {
      const latest = wb.lifeStory[wb.lifeStory.length - 1];
      events.push({
        id: `story-${agentId}`,
        type: "social",
        text: latest.slice(0, 90) + (latest.length > 90 ? "…" : ""),
        agentId,
        timestamp: Date.now() - Math.random() * 300000,
      });
    }
    if (wb.achievements && wb.achievements.length > 0) {
      events.push({
        id: `ach-${agentId}`,
        type: "celebration",
        text: `${name} achieved: ${wb.achievements[wb.achievements.length - 1]}`,
        agentId,
        timestamp: Date.now() - Math.random() * 600000,
      });
    }
  });

  return events
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i)
    .slice(0, 30);
}

interface ActivityFeedProps {
  world: WorldState;
  className?: string;
}

export default function ActivityFeed({ world, className }: ActivityFeedProps) {
  const events = useMemo(() => generateNarrativeEvents(world), [world]);

  return (
    <div className={cn("space-y-2", className)} data-testid="activity-feed">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={14} className="text-primary" />
        <span className="text-xs font-bold font-mono text-primary uppercase tracking-wider">Live Activity Feed</span>
        <span className="text-[10px] text-muted-foreground font-mono ml-auto">{events.length} events</span>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground font-mono text-xs">No activity yet — world is booting up...</div>
      ) : (
        <div className="space-y-1.5">
          {events.map(event => {
            const Icon = EVENT_ICONS[event.type];
            const colorClass = EVENT_COLORS[event.type];
            const agentColor = event.agentId ? AGENT_HEX_COLORS[event.agentId] : undefined;
            return (
              <div
                key={event.id}
                className={cn("flex items-start gap-2.5 rounded-xl border p-2.5 text-[11px] font-mono transition-colors", colorClass)}
                data-testid={`feed-event-${event.id}`}
              >
                <div className="shrink-0 mt-0.5">
                  <Icon size={11} />
                </div>
                <div className="flex-1 min-w-0">
                  {event.agentId && (
                    <span className="font-bold mr-1" style={{ color: agentColor }}>
                      {AGENT_DISPLAY_NAMES[event.agentId] || event.agentId.replace("tessera-", "")}:
                    </span>
                  )}
                  <span className="text-foreground/80">{event.text}</span>
                </div>
                <span className="shrink-0 text-muted-foreground/50 text-[10px]">{timeAgo(event.timestamp)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
