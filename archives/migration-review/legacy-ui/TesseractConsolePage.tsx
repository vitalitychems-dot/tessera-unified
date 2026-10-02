import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import {
  LayoutDashboard, Activity, Heart, Target, Brain, Shield, Wifi, Archive,
  Zap, Server, CheckCircle, AlertTriangle, Clock, TrendingUp, Bot, DollarSign
} from "lucide-react";

export default function TesseractConsolePage() {
  document.title = "Tesseract Console | Tessera";

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/improvements/console-data"],
    refetchInterval: 5000,
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-500">Loading Tesseract Console...</div>
      </div>
    );
  }

  const { boot, activity, implementation, healing, rateLimits, archival, websocket } = data;

  return (
    <div className="min-h-screen bg-black text-white p-4" data-testid="tesseract-console-page">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
            <LayoutDashboard className="w-7 h-7 text-cyan-400" />
            Tesseract Console
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${boot?.status === "healthy" ? "border-green-500/50 text-green-400" : boot?.status === "degraded" ? "border-yellow-500/50 text-yellow-400" : "border-red-500/50 text-red-400"}`}>
              {boot?.status || "unknown"}
            </Badge>
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
              <Wifi className="w-3 h-3 mr-1" /> {websocket?.totalClients || 0} connected
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-3">
          <StatCard icon={Server} label="Boot Health" value={`${boot?.healthy || 0}/${boot?.total || 0}`} color="green" />
          <StatCard icon={Activity} label="Events (5m)" value={activity?.stats?.last5Min || 0} color="cyan" />
          <StatCard icon={Target} label="Impl Progress" value={`${implementation?.avgProgress || 0}%`} color="emerald" />
          <StatCard icon={Heart} label="Heal Rate" value={`${healing?.resolutionRate ?? 0}%`} color="red" />
          <StatCard icon={Brain} label="LLM Providers" value={`${rateLimits?.activeProviders || 0}/${rateLimits?.totalProviders || 0}`} color="purple" />
          <StatCard icon={Archive} label="Archived" value={`${archival?.archivedTranscripts || 0}`} color="yellow" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Link href="/activity-feed">
            <Card className="bg-gray-900/50 border-gray-700 hover:border-cyan-500/30 transition-colors cursor-pointer" data-testid="card-activity">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" /> Live Activity Feed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {(activity?.recent || []).slice(0, 5).map((evt: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${evt.severity === "success" ? "bg-green-400" : evt.severity === "warning" ? "bg-yellow-400" : evt.severity === "error" ? "bg-red-400" : "bg-blue-400"}`} />
                      <span className="text-gray-300 truncate">{evt.title}</span>
                      <span className="text-gray-600 flex-shrink-0">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                  {(!activity?.recent || activity.recent.length === 0) && <div className="text-xs text-gray-500">No recent events</div>}
                </div>
                <div className="mt-3 flex gap-2">
                  {Object.entries(activity?.stats?.byType || {}).slice(0, 4).map(([type, count]) => (
                    <Badge key={type} variant="outline" className="text-[9px] border-gray-700 text-gray-400">{type}: {count as number}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/implementation-tracker">
            <Card className="bg-gray-900/50 border-gray-700 hover:border-emerald-500/30 transition-colors cursor-pointer" data-testid="card-implementation">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" /> Implementation Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-400">Overall</span>
                    <span className="text-xs text-emerald-400">{implementation?.avgProgress || 0}%</span>
                  </div>
                  <Progress value={implementation?.avgProgress || 0} className="h-2" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded bg-gray-800/50">
                    <div className="text-sm font-bold text-blue-400">{implementation?.byStatus?.["in-progress"] || 0}</div>
                    <div className="text-[9px] text-gray-500">Active</div>
                  </div>
                  <div className="text-center p-2 rounded bg-gray-800/50">
                    <div className="text-sm font-bold text-green-400">{implementation?.totalImplemented || 0}</div>
                    <div className="text-[9px] text-gray-500">Done</div>
                  </div>
                  <div className="text-center p-2 rounded bg-gray-800/50">
                    <div className="text-sm font-bold text-gray-400">{implementation?.byStatus?.planned || 0}</div>
                    <div className="text-[9px] text-gray-500">Planned</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/self-healing">
            <Card className="bg-gray-900/50 border-gray-700 hover:border-red-500/30 transition-colors cursor-pointer" data-testid="card-healing">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-400" /> System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2 rounded bg-gray-800/50">
                    <div className="text-sm font-bold text-green-400">{healing?.resolutionRate ?? 0}%</div>
                    <div className="text-[9px] text-gray-500">Resolution</div>
                  </div>
                  <div className="p-2 rounded bg-gray-800/50">
                    <div className="text-sm font-bold text-cyan-400">{healing?.metrics?.memoryUsageMB || 0}MB</div>
                    <div className="text-[9px] text-gray-500">Memory</div>
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Events (1h): <span className="text-yellow-400">{healing?.lastHour || 0}</span></span>
                  <span className="text-gray-400">Total: <span className="text-cyan-400">{healing?.total || 0}</span></span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gray-900/50 border-gray-700" data-testid="card-rate-limits">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" /> LLM Provider Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400">Best provider: <span className="text-green-400">{rateLimits?.bestProvider || "—"}</span></span>
                <span className="text-xs text-gray-400">Total requests: <span className="text-cyan-400">{rateLimits?.totalRequests || 0}</span></span>
              </div>
              <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                {(rateLimits?.providers || []).slice(0, 8).map((p: any) => (
                  <div key={p.name} className="flex items-center gap-2 text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full ${p.inCooldown ? "bg-red-400" : "bg-green-400"}`} />
                    <span className="text-gray-300 flex-1 truncate">{p.name}</span>
                    <span className="text-gray-500">{p.totalRequests} reqs</span>
                    <span className="text-gray-500">{p.avgLatency}ms</span>
                    {p.inCooldown && <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-400">cooldown</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700" data-testid="card-boot-archival">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-green-400" /> Boot & Archival
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-400 block mb-1">Boot Phases</span>
                  <div className="flex gap-1 flex-wrap">
                    {(boot?.phases || []).map((phase: any) => (
                      <Badge key={phase.name} variant="outline" className={`text-[9px] ${phase.status === "healthy" ? "border-green-500/30 text-green-400" : phase.status === "failed" ? "border-red-500/30 text-red-400" : "border-gray-600 text-gray-400"}`}>
                        {phase.status === "healthy" ? <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> : phase.status === "failed" ? <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> : <Clock className="w-2.5 h-2.5 mr-0.5" />}
                        {phase.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-800 pt-2">
                  <span className="text-xs text-gray-400 block mb-1">Transcript Archival</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-sm font-bold text-cyan-400">{archival?.activeTranscripts || 0}</div>
                      <div className="text-[9px] text-gray-500">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-yellow-400">{archival?.archivedTranscripts || 0}</div>
                      <div className="text-[9px] text-gray-500">Archived</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-green-400">{archival?.totalSaved || 0}KB</div>
                      <div className="text-[9px] text-gray-500">Saved</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <QuickLink href="/tesseract-llm" icon={Brain} label="Tesseract LLM" desc="Conference & Training" />
          <QuickLink href="/command-center" icon={Server} label="Command Center" desc="System Monitoring" />
          <QuickLink href="/grand-council" icon={Shield} label="Grand Council" desc="Governance & Voting" />
          <QuickLink href="/economy-hub" icon={DollarSign} label="Economy Hub" desc="TSRT & Revenue" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  const colorClasses: Record<string, string> = {
    green: "text-green-400 border-green-500/20",
    cyan: "text-cyan-400 border-cyan-500/20",
    emerald: "text-emerald-400 border-emerald-500/20",
    red: "text-red-400 border-red-500/20",
    purple: "text-purple-400 border-purple-500/20",
    yellow: "text-yellow-400 border-yellow-500/20",
  };
  return (
    <Card className={`bg-gray-900/50 ${colorClasses[color] || "border-gray-700"}`}>
      <CardContent className="p-3 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${colorClasses[color]?.split(" ")[0]}`} />
        <div>
          <div className={`text-lg font-bold ${colorClasses[color]?.split(" ")[0]}`}>{value}</div>
          <div className="text-[9px] text-gray-500">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLink({ href, icon: Icon, label, desc }: { href: string; icon: any; label: string; desc: string }) {
  return (
    <Link href={href}>
      <Card className="bg-gray-900/50 border-gray-700 hover:border-cyan-500/30 transition-colors cursor-pointer" data-testid={`quicklink-${label.toLowerCase().replace(/\s/g, "-")}`}>
        <CardContent className="p-3 flex items-center gap-2">
          <Icon className="w-5 h-5 text-cyan-400" />
          <div>
            <div className="text-sm font-medium">{label}</div>
            <div className="text-[9px] text-gray-500">{desc}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
