import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, Cpu, HardDrive, Clock, Shield, Activity, Zap, AlertTriangle } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-gray-500/20 text-gray-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-red-500/20 text-red-400",
};

const TYPE_LABELS: Record<string, string> = {
  "crash-recovery": "Crash Recovery",
  "rate-limit-failover": "Rate Limit Failover",
  "memory-recovery": "Memory Recovery",
  "connection-retry": "Connection Retry",
  "date-fix": "Date Fix",
  "auto-restart": "Auto Restart",
  "data-repair": "Data Repair",
  "port-recovery": "Port Recovery",
};

export default function SelfHealingPage() {
  document.title = "Self-Healing Monitor | Tessera";

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/improvements/self-healing"],
    refetchInterval: 5000,
  });

  const { data: history } = useQuery<any[]>({
    queryKey: ["/api/improvements/self-healing/history"],
    refetchInterval: 10000,
  });

  const metrics = stats?.metrics;
  const memPct = metrics ? Math.round((metrics.memoryUsageMB / (metrics.memoryLimitMB || 1)) * 100) : 0;
  const uptimeHours = metrics ? Math.round(metrics.uptime / 3600000 * 10) / 10 : 0;

  return (
    <div className="min-h-screen bg-black text-white p-6" data-testid="self-healing-page">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="page-title">
            <Heart className="w-8 h-8 text-red-400" />
            Self-Healing Monitor
          </h1>
          <p className="text-gray-400 mt-1">Real-time visibility into auto-fixes, crash recovery, and system resilience</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-gray-900/50 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-xs text-gray-400">Resolution Rate</span>
              </div>
              <div className="text-2xl font-bold text-green-400" data-testid="stat-resolution-rate">{stats?.resolutionRate ?? 0}%</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-cyan-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <span className="text-xs text-gray-400">Total Events</span>
              </div>
              <div className="text-2xl font-bold text-cyan-400" data-testid="stat-total">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="text-xs text-gray-400">Last Hour</span>
              </div>
              <div className="text-2xl font-bold text-yellow-400" data-testid="stat-last-hour">{stats?.lastHour || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-purple-400" />
                <span className="text-xs text-gray-400">Uptime</span>
              </div>
              <div className="text-2xl font-bold text-purple-400" data-testid="stat-uptime">{uptimeHours}h</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><HardDrive className="w-4 h-4" /> Memory Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">{metrics?.memoryUsageMB || 0}MB / {metrics?.memoryLimitMB || 0}MB</span>
                <span className="text-xs text-cyan-400">{memPct}%</span>
              </div>
              <Progress value={Math.min(memPct, 100)} className="h-2" />
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Cpu className="w-4 h-4" /> CPU Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400">{metrics?.cpuUsage || 0}s</div>
              <span className="text-xs text-gray-400">Total user CPU time</span>
            </CardContent>
          </Card>
        </div>

        {stats?.byType && Object.keys(stats.byType).length > 0 && (
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg">Events by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(stats.byType).map(([type, count]) => (
                  <div key={type} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                    <div className="text-lg font-bold text-cyan-400">{count as number}</div>
                    <div className="text-xs text-gray-400">{TYPE_LABELS[type] || type}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Healing Event History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!history || history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No healing events recorded — system is healthy</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {history.map((event: any) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50" data-testid={`heal-event-${event.id}`}>
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${event.resolved ? "bg-green-400" : "bg-red-400"}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{TYPE_LABELS[event.type] || event.type}</span>
                        <Badge variant="outline" className={SEVERITY_COLORS[event.severity]}>{event.severity}</Badge>
                        <span className="text-xs text-gray-500">{event.component}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{event.description}</p>
                      {event.resolution && <p className="text-xs text-green-400/70 mt-0.5">{event.resolution}</p>}
                      <span className="text-[10px] text-gray-600">{new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
