import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, AlertCircle, Loader, Ban, Target, TrendingUp } from "lucide-react";

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  planned: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: Clock, label: "Planned" },
  "in-progress": { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Loader, label: "In Progress" },
  complete: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle, label: "Complete" },
  verified: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle, label: "Verified" },
  blocked: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: Ban, label: "Blocked" },
};

export default function ImplementationTrackerPage() {
  document.title = "Implementation Tracker | Tessera";

  const { data: tracker, isLoading } = useQuery<any>({
    queryKey: ["/api/improvements/implementation-tracker"],
    refetchInterval: 10000,
  });

  const { data: summary } = useQuery<any>({
    queryKey: ["/api/improvements/implementation-summary"],
    refetchInterval: 10000,
  });

  const steps = tracker?.steps || [];

  return (
    <div className="min-h-screen bg-black text-white p-6" data-testid="implementation-tracker-page">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="page-title">
            <Target className="w-8 h-8 text-emerald-400" />
            Implementation Progress Tracker
          </h1>
          <p className="text-gray-400 mt-1">Track all 20 conference-approved optimization steps from vote to verified</p>
        </div>

        {summary && (
          <div className="grid grid-cols-5 gap-4">
            <Card className="bg-gray-900/50 border-cyan-500/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400" data-testid="stat-total">{summary.totalSteps}</div>
                <div className="text-xs text-gray-400">Total Steps</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-blue-500/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-400" data-testid="stat-in-progress">{summary.byStatus?.["in-progress"] || 0}</div>
                <div className="text-xs text-gray-400">In Progress</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-green-500/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-400" data-testid="stat-complete">{summary.totalImplemented}</div>
                <div className="text-xs text-gray-400">Completed</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-emerald-500/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400" data-testid="stat-verified">{summary.totalVerified}</div>
                <div className="text-xs text-gray-400">Verified</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-400" data-testid="stat-avg-progress">{summary.avgProgress}%</div>
                <div className="text-xs text-gray-400">Avg Progress</div>
              </CardContent>
            </Card>
          </div>
        )}

        {summary && (
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Overall Progress
                </span>
                <span className="text-sm font-medium text-cyan-400">{summary.avgProgress}%</span>
              </div>
              <Progress value={summary.avgProgress} className="h-3" />
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading tracker...</div>
        ) : (
          <div className="space-y-3">
            {steps.map((step: any) => {
              const config = STATUS_CONFIG[step.status] || STATUS_CONFIG.planned;
              const StatusIcon = config.icon;
              return (
                <Card key={step.id} className="bg-gray-900/50 border-gray-700 hover:border-cyan-500/30 transition-colors" data-testid={`step-${step.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 border border-gray-600 flex-shrink-0">
                        <span className="text-sm font-bold text-cyan-400">{step.id}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold">{step.title}</h3>
                          <Badge variant="outline" className={`${config.color} flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </Badge>
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
                            {step.approvalPct}% approved
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{step.description}</p>
                        {step.progress > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-500">Progress</span>
                              <span className="text-xs text-cyan-400">{step.progress}%</span>
                            </div>
                            <Progress value={step.progress} className="h-1.5" />
                          </div>
                        )}
                        {step.assignedAgents?.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {step.assignedAgents.slice(0, 4).map((agent: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px] border-gray-600 text-gray-400">
                                {agent}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {step.notes?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {step.notes.map((note: string, i: number) => (
                              <div key={i} className="text-xs text-gray-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {note}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
