import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Filter, RefreshCw, Zap, Shield, Brain, DollarSign, Bot, Wrench, Server } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  success: "bg-green-500/20 text-green-400 border-green-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
  critical: "bg-red-700/30 text-red-300 border-red-600/50",
};

const TYPE_ICONS: Record<string, any> = {
  "agent-action": Bot,
  vote: Zap,
  decision: Zap,
  conference: Activity,
  economy: DollarSign,
  consciousness: Brain,
  security: Shield,
  system: Server,
  "self-heal": Wrench,
  implementation: Wrench,
};

export default function ActivityFeedPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  document.title = "Activity Feed | Tessera";

  const { data: feed, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/improvements/activity-feed", typeFilter, severityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (severityFilter !== "all") params.set("severity", severityFilter);
      params.set("limit", "200");
      const res = await fetch(`/api/improvements/activity-feed?${params}`);
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/improvements/activity-stats"],
    refetchInterval: 10000,
  });

  return (
    <div className="min-h-screen bg-black text-white p-6" data-testid="activity-feed-page">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="page-title">
              <Activity className="w-8 h-8 text-cyan-400" />
              Unified Activity Feed
            </h1>
            <p className="text-gray-400 mt-1">Real-time timeline of all 45 agent actions, votes, and decisions</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh" className="border-cyan-500/30 text-cyan-400">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-gray-900/50 border-cyan-500/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400" data-testid="stat-total">{stats.total}</div>
                <div className="text-xs text-gray-400">Total Events</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-green-500/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-400" data-testid="stat-last-hour">{stats.lastHour}</div>
                <div className="text-xs text-gray-400">Last Hour</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-yellow-500/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400" data-testid="stat-last-5min">{stats.last5Min}</div>
                <div className="text-xs text-gray-400">Last 5 Min</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-400" data-testid="stat-types">{Object.keys(stats.byType || {}).length}</div>
                <div className="text-xs text-gray-400">Event Types</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex gap-4">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48 bg-gray-900 border-gray-700" data-testid="select-type-filter">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="agent-action">Agent Actions</SelectItem>
              <SelectItem value="vote">Votes</SelectItem>
              <SelectItem value="decision">Decisions</SelectItem>
              <SelectItem value="conference">Conference</SelectItem>
              <SelectItem value="economy">Economy</SelectItem>
              <SelectItem value="consciousness">Consciousness</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="self-heal">Self-Heal</SelectItem>
              <SelectItem value="implementation">Implementation</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-48 bg-gray-900 border-gray-700" data-testid="select-severity-filter">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg">Live Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading activity feed...</div>
            ) : !feed || feed.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No events matching filters</div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {feed.map((event: any) => {
                  const Icon = TYPE_ICONS[event.type] || Activity;
                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-cyan-500/30 transition-colors"
                      data-testid={`activity-event-${event.id}`}
                    >
                      <Icon className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{event.title}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${SEVERITY_COLORS[event.severity] || ""}`}>
                            {event.severity}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-gray-600 text-gray-400">
                            {event.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{event.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-500">{event.source}</span>
                          <span className="text-[10px] text-gray-600">{new Date(event.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
