import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Rocket, Crown, Globe, Shield, Zap, Brain, Eye, Atom, Network, Star, RefreshCw, ChevronDown, ChevronRight, Sparkles, CheckCircle2, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

const SPEAKER_COLORS: Record<string, string> = {
  SYSTEM: "text-amber-400",
  Tessera: "text-cyan-400",
  Alpha: "text-emerald-400",
  Beta: "text-blue-400",
  Gamma: "text-indigo-400",
  Delta: "text-amber-400",
  Epsilon: "text-yellow-400",
  Aetherion: "text-violet-400",
  Orion: "text-cyan-400",
};

const TYPE_ICONS: Record<string, typeof Rocket> = {
  launch: Rocket,
  kernel: Shield,
  lattice: Globe,
  proposal: Brain,
  discussion: Sparkles,
  vote: CheckCircle2,
  implementation: Zap,
  "et-arrival": Globe,
  "et-support": Star,
  "et-joined": Users,
  complete: Crown,
  error: Shield,
};

const TYPE_COLORS: Record<string, string> = {
  launch: "border-amber-500/30 bg-amber-500/10",
  kernel: "border-cyan-500/30 bg-cyan-500/10",
  lattice: "border-indigo-500/30 bg-indigo-500/10",
  proposal: "border-violet-500/30 bg-violet-500/10",
  discussion: "border-blue-500/30 bg-blue-500/10",
  vote: "border-emerald-500/30 bg-emerald-500/10",
  implementation: "border-green-500/30 bg-green-500/10",
  "et-arrival": "border-pink-500/30 bg-pink-500/10",
  "et-support": "border-orange-500/30 bg-orange-500/10",
  "et-joined": "border-rose-500/30 bg-rose-500/10",
  complete: "border-amber-500/30 bg-amber-500/10",
  error: "border-red-500/30 bg-red-500/10",
};

export default function SovereignGrandLaunchPage({ embedded }: { embedded?: boolean }) {
  useEffect(() => { document.title = "Sovereign Grand Launch | Tessera"; }, []);
  const [showFullLog, setShowFullLog] = useState(false);

  const { data: launchState } = useQuery<any>({
    queryKey: ["/api/sovereign-grand-launch/status"],
    refetchInterval: 5000,
  });

  const launchMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sovereign-grand-launch/execute"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sovereign-grand-launch/status"] });
    },
  });

  const phase = launchState?.phase || "idle";
  const isRunning = phase === "launching" || phase === "conferencing" || phase === "implementing";
  const isComplete = phase === "complete";
  const log = launchState?.conferenceLog || [];
  const improvements = launchState?.agreedImprovements || [];
  const etAllies = launchState?.etInvitations || [];

  return (
    <div className={cn("min-h-screen bg-gradient-to-b from-gray-950 via-amber-950/10 to-gray-950 text-white", embedded ? "p-3" : "p-4")} data-testid="sovereign-grand-launch-page">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="text-center space-y-2 py-4">
          <div className="flex items-center justify-center gap-3">
            <Rocket className="w-8 h-8 text-amber-400" />
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-amber-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent" data-testid="page-title">
              SOVEREIGN GRAND LAUNCH
            </h1>
            <Crown className="w-8 h-8 text-violet-400" />
          </div>
          <p className="text-[10px] text-amber-300/60">
            All-in-one launch on Lattice Cloud — Sovereign Kernel — Colonel Protocol — 50-layer Security — ET Technology Alliance
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-2">
            <Badge variant="outline" className={`text-[9px] ${phase === "idle" ? "border-gray-500/50 text-gray-400" : isRunning ? "border-amber-500/50 text-amber-300" : "border-emerald-500/50 text-emerald-300"}`} data-testid="badge-phase">
              {phase === "idle" ? <Clock className="w-3 h-3 mr-1" /> : isRunning ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
              {phase.toUpperCase()}
            </Badge>
            {launchState?.totalParticipants > 0 && (
              <Badge variant="outline" className="border-violet-500/50 text-violet-300 text-[9px]" data-testid="badge-participants">
                <Users className="w-3 h-3 mr-1" />{launchState.totalParticipants} Participants
              </Badge>
            )}
            {improvements.length > 0 && (
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-300 text-[9px]" data-testid="badge-improvements">
                <Zap className="w-3 h-3 mr-1" />{improvements.filter((i: any) => i.status === "implemented").length}/{improvements.length} Implemented
              </Badge>
            )}
            {etAllies.length > 0 && (
              <Badge variant="outline" className="border-pink-500/50 text-pink-300 text-[9px]" data-testid="badge-et-allies">
                <Globe className="w-3 h-3 mr-1" />{etAllies.length} ET Allies
              </Badge>
            )}
          </div>
        </div>

        {phase === "idle" && (
          <div className="text-center py-8">
            <div className="max-w-lg mx-auto space-y-4">
              <div className="p-6 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-orange-900/20">
                <Rocket className="w-12 h-12 mx-auto mb-3 text-amber-400" />
                <h2 className="text-lg font-bold text-amber-300 mb-2">Ready to Launch</h2>
                <p className="text-xs text-gray-300 mb-4">
                  This will activate a grand conference across all 27 agents + 8 extraterrestrial delegations on the Lattice Cloud.
                  They will discuss, vote on, and implement 10 dramatic capability improvements — then invite mission-aligned ET allies to join and share technology.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4 text-[10px]">
                  <div className="p-2 bg-gray-900/50 rounded border border-gray-700/30">
                    <Shield className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                    <p className="text-cyan-300">50-Layer Security</p>
                  </div>
                  <div className="p-2 bg-gray-900/50 rounded border border-gray-700/30">
                    <Globe className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
                    <p className="text-indigo-300">Lattice Cloud</p>
                  </div>
                  <div className="p-2 bg-gray-900/50 rounded border border-gray-700/30">
                    <Network className="w-4 h-4 mx-auto mb-1 text-violet-400" />
                    <p className="text-violet-300">Colonel Protocol</p>
                  </div>
                  <div className="p-2 bg-gray-900/50 rounded border border-gray-700/30">
                    <Star className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                    <p className="text-amber-300">Sovereign Kernel</p>
                  </div>
                </div>
                <button
                  className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-lg text-sm font-bold text-white flex items-center gap-2 mx-auto transition-all shadow-lg shadow-amber-900/50"
                  onClick={() => launchMutation.mutate()}
                  disabled={launchMutation.isPending}
                  data-testid="button-grand-launch"
                >
                  {launchMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  INITIATE SOVEREIGN GRAND LAUNCH
                </button>
              </div>
            </div>
          </div>
        )}

        {(isRunning || isComplete) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                  {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Conference Live Feed ({log.length} entries)
                </h3>
                {log.length > 20 && (
                  <button
                    className="text-[10px] text-gray-400 hover:text-gray-200"
                    onClick={() => setShowFullLog(!showFullLog)}
                    data-testid="button-toggle-log"
                  >
                    {showFullLog ? "Show Latest" : "Show All"}
                  </button>
                )}
              </div>

              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                {(showFullLog ? log : log.slice(-30)).map((entry: any, i: number) => {
                  const Icon = TYPE_ICONS[entry.type] || Sparkles;
                  const colors = TYPE_COLORS[entry.type] || "border-gray-500/30 bg-gray-500/10";
                  const speakerColor = SPEAKER_COLORS[entry.speaker] || "text-gray-300";
                  return (
                    <div key={i} className={`p-2 rounded-lg border ${colors}`} data-testid={`log-entry-${i}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Icon className="w-3 h-3 text-gray-400" />
                        <span className={`text-[10px] font-bold ${speakerColor}`}>{entry.speaker}</span>
                        {entry.dimension && <Badge variant="outline" className="text-[8px] border-gray-600/50 text-gray-400">{entry.dimension}D</Badge>}
                        <span className="text-[8px] text-gray-500 ml-auto">{timeAgo(entry.timestamp)}</span>
                      </div>
                      <p className="text-[10px] text-gray-200 leading-relaxed pl-5">{entry.message}</p>
                    </div>
                  );
                })}
                {isRunning && (
                  <div className="text-center py-2">
                    <RefreshCw className="w-4 h-4 mx-auto animate-spin text-amber-400" />
                    <p className="text-[10px] text-amber-300 mt-1">Conference in progress...</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {improvements.length > 0 && (
                <Card className="bg-gradient-to-br from-emerald-900/20 to-green-900/20 border-emerald-500/20">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs text-emerald-300 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> 10 Agreed Improvements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {improvements.map((imp: any, i: number) => (
                      <div key={imp.id || i} className="p-1.5 bg-gray-900/50 rounded border border-gray-700/30">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[9px] font-bold text-gray-200">#{i + 1}</span>
                          <Badge variant="outline" className={`text-[8px] ${imp.status === "implemented" ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}`}>
                            {imp.status === "implemented" ? <CheckCircle2 className="w-2 h-2 mr-0.5" /> : <Clock className="w-2 h-2 mr-0.5" />}
                            {imp.status}
                          </Badge>
                        </div>
                        <p className="text-[9px] text-gray-300">{imp.description.slice(0, 100)}</p>
                        {imp.result && (
                          <p className="text-[8px] text-emerald-400/80 mt-0.5 italic">{imp.result.slice(0, 80)}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {etAllies.length > 0 && (
                <Card className="bg-gradient-to-br from-pink-900/20 to-rose-900/20 border-pink-500/20">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs text-pink-300 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> ET Technology Alliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {etAllies.map((et: any, i: number) => (
                      <div key={i} className="p-1.5 bg-gray-900/50 rounded border border-gray-700/30">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[9px] font-bold text-gray-200">{et.species}</span>
                          <Badge variant="outline" className="text-[8px] border-pink-500/30 text-pink-300">{et.dimension}D</Badge>
                        </div>
                        <p className="text-[8px] text-gray-400">Mission Aligned: {et.missionAligned ? "YES" : "NO"}</p>
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {et.techShared.map((t: string, j: number) => (
                            <Badge key={j} variant="outline" className="text-[7px] border-cyan-500/30 text-cyan-300">{t}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {isComplete && (
                <button
                  className="w-full px-4 py-2 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/30 rounded-lg text-[10px] text-amber-300 flex items-center justify-center gap-2 transition-colors"
                  onClick={() => launchMutation.mutate()}
                  disabled={launchMutation.isPending}
                  data-testid="button-relaunch"
                >
                  {launchMutation.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
                  Re-Launch Grand Conference
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
