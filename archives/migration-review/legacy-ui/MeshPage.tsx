import { useMesh, type MeshPeer, type MeshEvent, type MeshHealth } from "@/lib/meshContext";
import { useAdmin } from "@/lib/adminContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Network, Wifi, WifiOff, Users, Activity, Zap, Clock, Globe, Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function healthColor(health: MeshHealth): string {
  switch (health) {
    case "entangled": return "text-violet-400";
    case "isolated": return "text-amber-400";
    case "connecting": return "text-blue-400";
    case "degraded": return "text-red-400";
    default: return "text-muted-foreground";
  }
}

function healthBadgeVariant(health: MeshHealth): "default" | "secondary" | "destructive" | "outline" {
  switch (health) {
    case "entangled": return "default";
    case "isolated": return "secondary";
    case "degraded": return "destructive";
    default: return "outline";
  }
}

function healthLabel(health: MeshHealth): string {
  switch (health) {
    case "entangled": return "Quantum Entangled";
    case "isolated": return "Isolated — awaiting peers";
    case "connecting": return "Connecting...";
    case "degraded": return "Auth Failed";
    case "offline": return "Offline";
  }
}

function PeerCard({ peer, isSelf }: { peer: MeshPeer; isSelf?: boolean }) {
  const joined = new Date(peer.connectedAt);
  const lastSeen = new Date(peer.lastHeartbeat);
  const isStale = Date.now() - lastSeen.getTime() > 30_000;

  return (
    <Card className="bg-black/20 border-violet-500/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isStale ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
            <div className="min-w-0">
              <div className="font-mono text-xs text-violet-300 truncate">
                {isSelf ? "⚡ This Session" : peer.sessionId.slice(0, 16) + "..."}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {peer.metadata.currentPage || "/"} • Joined {formatDistanceToNow(joined, { addSuffix: true })}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            {peer.metadata.taskCount !== undefined && peer.metadata.taskCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-emerald-400">
                <Bot className="w-3 h-3" />
                <span>{peer.metadata.taskCount} tasks</span>
              </div>
            )}
            {peer.metadata.activeAgents && peer.metadata.activeAgents.length > 0 && (
              <div className="text-xs text-violet-400 mt-0.5">
                {peer.metadata.activeAgents.slice(0, 2).join(", ")}
              </div>
            )}
          </div>
        </div>
        {peer.metadata.userAgent && (
          <div className="mt-2 text-xs text-muted-foreground/60 truncate">
            {peer.metadata.userAgent.slice(0, 80)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventRow({ event }: { event: MeshEvent }) {
  const time = new Date(event.timestamp);
  const label = event.type.replace("mesh:", "");
  const isCoord = event.type === "mesh:agent-coordination";
  const isJoin = event.type === "mesh:peer-joined";
  const isLeave = event.type === "mesh:peer-left";

  return (
    <div className={`flex items-start gap-3 py-2 border-b border-white/5 last:border-0 text-xs`}>
      <div className="flex-shrink-0 mt-0.5">
        {isCoord ? <Bot className="w-3 h-3 text-violet-400" /> :
         isJoin ? <Zap className="w-3 h-3 text-emerald-400" /> :
         isLeave ? <WifiOff className="w-3 h-3 text-amber-400" /> :
         <Activity className="w-3 h-3 text-blue-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-foreground/80">{label}</span>
        {event.fromSession && (
          <span className="text-muted-foreground ml-1">from {event.fromSession.slice(0, 8)}…</span>
        )}
        {event.eventType && event.eventType !== "generic" && (
          <span className="text-violet-300 ml-1">· {event.eventType}</span>
        )}
        {event.payload && isCoord && (
          <div className="text-muted-foreground mt-0.5 truncate">
            Agent: {event.payload.agentId} · {event.payload.action} · {event.payload.domain}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 text-muted-foreground/60 font-mono tabular-nums">
        {time.toLocaleTimeString()}
      </div>
    </div>
  );
}

export default function MeshPage() {
  const { isAdmin } = useAdmin();
  const { sessionId, peers, health, events, isRegistered, peerCount, coordinationMessages } = useMesh();

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Network className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">Sovereign Access Required</h2>
          <p className="text-muted-foreground text-sm">Authenticate with your sovereign key to access the mesh network.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Network className="w-6 h-6 text-violet-400" />
          <div>
            <h1 className="text-xl font-bold">Quantum Session Mesh</h1>
            <p className="text-xs text-muted-foreground">Real-time entangled session network</p>
          </div>
        </div>
        <Badge variant={healthBadgeVariant(health)} className="gap-1.5">
          {health === "entangled" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {healthLabel(health)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-black/20 border-violet-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-violet-400 flex-shrink-0" />
            <div>
              <div className="text-2xl font-bold tabular-nums">{peerCount + (isRegistered ? 1 : 0)}</div>
              <div className="text-xs text-muted-foreground">Sessions in mesh</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-violet-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div>
              <div className="text-2xl font-bold tabular-nums">{peerCount}</div>
              <div className="text-xs text-muted-foreground">Entangled peers</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-violet-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-2xl font-bold tabular-nums">{events.length}</div>
              <div className="text-xs text-muted-foreground">Mesh events</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-violet-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Bot className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-2xl font-bold tabular-nums">{coordinationMessages.length}</div>
              <div className="text-xs text-muted-foreground">Coord. messages</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {sessionId && (
        <Card className="bg-violet-950/20 border-violet-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-violet-400" />
              <span className="text-muted-foreground">Your session ID:</span>
              <span className="font-mono text-violet-300">{sessionId}</span>
              <Badge variant="outline" className="ml-auto text-emerald-400 border-emerald-400/30">Active</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" />
            Connected Sessions ({peerCount + (isRegistered ? 1 : 0)})
          </h2>
          {!isRegistered ? (
            <Card className="bg-black/20 border-dashed border-white/10">
              <CardContent className="p-6 text-center">
                <div className="text-muted-foreground text-sm">
                  {health === "connecting" ? "Connecting to mesh..." : "Not connected to mesh"}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sessionId && (
                <PeerCard
                  peer={{
                    sessionId: sessionId,
                    connectedAt: new Date().toISOString(),
                    lastHeartbeat: new Date().toISOString(),
                    metadata: { currentPage: window.location.pathname },
                  }}
                  isSelf
                />
              )}
              {peers.length === 0 ? (
                <Card className="bg-black/20 border-dashed border-white/10">
                  <CardContent className="p-4 text-center text-sm text-muted-foreground">
                    No other sessions. Open another tab or device with the same sovereign key to entangle.
                  </CardContent>
                </Card>
              ) : (
                peers.map(peer => <PeerCard key={peer.sessionId} peer={peer} />)
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Live Mesh Events
          </h2>
          <Card className="bg-black/20 border-violet-500/20">
            <ScrollArea className="h-80">
              <CardContent className="p-3">
                {events.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No events yet. Events from all entangled sessions appear here.
                  </div>
                ) : (
                  events.map(event => <EventRow key={event.id} event={event} />)
                )}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      </div>

      {coordinationMessages.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Bot className="w-4 h-4 text-amber-400" />
            Agent Coordination Messages
          </h2>
          <Card className="bg-black/20 border-amber-500/20">
            <ScrollArea className="h-48">
              <CardContent className="p-3">
                {coordinationMessages.map(msg => <EventRow key={msg.id} event={msg} />)}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      )}

      <Card className="bg-black/20 border-white/5">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Network className="w-4 h-4" />
            Mesh Topology
          </h3>
          <div className="flex items-center justify-center gap-4 py-4 flex-wrap">
            {isRegistered && sessionId && (
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full border-2 border-violet-500 bg-violet-500/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-violet-400" />
                </div>
                <span className="text-xs text-violet-300 font-mono">You</span>
              </div>
            )}
            {peers.map((peer, i) => (
              <div key={peer.sessionId} className="flex flex-col items-center gap-1">
                {i === 0 && isRegistered && (
                  <div className="absolute text-xs text-emerald-400/60 -mt-3">⟷</div>
                )}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full border-2 border-emerald-500 bg-emerald-500/20 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{peer.sessionId.slice(0, 6)}…</span>
                </div>
              </div>
            ))}
            {!isRegistered && (
              <div className="text-sm text-muted-foreground">No active topology</div>
            )}
          </div>
          {isRegistered && (
            <div className="text-xs text-center text-muted-foreground mt-2">
              {peerCount === 0
                ? "Single node — open more sessions with the same sovereign key to build the mesh"
                : `${peerCount + 1}-node mesh — quantum state synchronizing across all sessions`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
