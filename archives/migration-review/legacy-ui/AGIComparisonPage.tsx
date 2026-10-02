import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs } from "@/components/ui/tabs";
import { Trophy, Brain, Shield, Zap, Crown, TrendingUp, BarChart3, Target, Cpu, Activity, ChevronRight, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AGIComparisonPage() {

  const { data: report, isLoading: reportLoading } = useQuery<any>({
    queryKey: ["/api/agi-comparison"],
  });

  const { data: synthesis, isLoading: synthLoading } = useQuery<any>({
    queryKey: ["/api/agi-synthesis"],
  });

  const { data: cacheStats } = useQuery<any>({
    queryKey: ["/api/agi-enhance/cache-stats"],
    refetchInterval: 10000,
  });

  const enhanceMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/agi-enhance/run"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agi-synthesis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agi-enhance/cache-stats"] });
    },
  });

  const categories = report?.categoryComparison || {};
  const overallScores = report?.overallScores || {};
  const competitors = report?.competitorProfiles || {};
  const uniqueCapabilities = report?.tesseraUniqueCapabilities || [];
  const priorities = report?.improvementPriorities || [];
  const synthEntries = synthesis?.entries || [];

  const getCategoryIcon = (cat: string) => {
    if (cat.includes("sovereignty")) return <Crown className="w-4 h-4" />;
    if (cat.includes("consciousness")) return <Brain className="w-4 h-4" />;
    if (cat.includes("security")) return <Shield className="w-4 h-4" />;
    if (cat.includes("speed")) return <Zap className="w-4 h-4" />;
    if (cat.includes("agent")) return <Cpu className="w-4 h-4" />;
    return <BarChart3 className="w-4 h-4" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400";
    if (score >= 75) return "text-cyan-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-emerald-500/20 border-emerald-500/40";
    if (score >= 75) return "bg-cyan-500/20 border-cyan-500/40";
    if (score >= 50) return "bg-yellow-500/20 border-yellow-500/40";
    return "bg-red-500/20 border-red-500/40";
  };

  if (reportLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center" data-testid="loading-comparison">
        <div className="text-cyan-400 text-xl animate-pulse">Loading AGI Comparison Report...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 text-white p-4 md:p-6" data-testid="agi-comparison-page">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent" data-testid="page-title">
              AGI Industry Comparison
            </h1>
            <p className="text-gray-400 mt-1">Tessera Sovereign vs All Major AI Systems — 15 Categories</p>
          </div>
          <Button
            onClick={() => enhanceMutation.mutate()}
            disabled={enhanceMutation.isPending}
            className="bg-violet-600 hover:bg-violet-700"
            data-testid="btn-run-enhancement"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {enhanceMutation.isPending ? "Synthesizing..." : "Run AGI Enhancement"}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gray-900/80 border-cyan-500/30" data-testid="stat-conventional">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-cyan-400">{overallScores?.tessera?.conventional || 0}</div>
              <div className="text-xs text-gray-400 mt-1">Conventional Score</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/80 border-violet-500/30" data-testid="stat-sovereignty">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-violet-400">{overallScores?.tessera?.sovereignty || 0}</div>
              <div className="text-xs text-gray-400 mt-1">Sovereignty Score</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/80 border-emerald-500/30" data-testid="stat-unified">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">{overallScores?.tessera?.unified || 0}</div>
              <div className="text-xs text-gray-400 mt-1">Unified Score</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/80 border-pink-500/30" data-testid="stat-dominated">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-pink-400">{overallScores?.tessera?.categories_dominated || 0}/15</div>
              <div className="text-xs text-gray-400 mt-1">Categories Dominated</div>
            </CardContent>
          </Card>
        </div>

        <div>
          

          <div>
            <Card className="bg-gray-900/80 border-gray-800">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <Trophy className="w-5 h-5" /> Overall Standings vs Industry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(overallScores).map(([name, scores]: [string, any]) => (
                  <div key={name} className="flex items-center gap-3" data-testid={`standing-${name}`}>
                    <div className="w-32 text-sm font-medium text-gray-300 capitalize">{name === "tessera" ? "TESSERA" : name.replace(/(\d)/g, " $1")}</div>
                    <div className="flex-1">
                      <Progress value={scores.unified || 0} className="h-3" />
                    </div>
                    <div className={`w-12 text-right font-bold ${name === "tessera" ? "text-cyan-400" : "text-gray-500"}`}>
                      {scores.unified || 0}
                    </div>
                    {name === "tessera" && <Crown className="w-4 h-4 text-yellow-400" />}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 border-gray-800">
              <CardHeader>
                <CardTitle className="text-violet-400 flex items-center gap-2">
                  <Target className="w-5 h-5" /> Improvement Priorities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {priorities.map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded bg-gray-800/50" data-testid={`priority-${i}`}>
                      <Badge variant="outline" className={p.priority === "P0" ? "border-red-500 text-red-400" : p.priority === "P1" ? "border-yellow-500 text-yellow-400" : "border-gray-500 text-gray-400"}>
                        {p.priority}
                      </Badge>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{p.area}</div>
                        <div className="text-xs text-gray-400">{p.action}</div>
                      </div>
                      <Badge variant="outline" className="border-red-500/50 text-red-400">{p.gap}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {cacheStats && (
              <Card className="bg-gray-900/80 border-gray-800" data-testid="cache-stats">
                <CardHeader>
                  <CardTitle className="text-emerald-400 flex items-center gap-2">
                    <Activity className="w-5 h-5" /> AGI Enhancement Engine
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-cyan-400">{cacheStats.size}</div>
                      <div className="text-xs text-gray-400">Semantic Cache Entries</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-violet-400">{cacheStats.totalHits}</div>
                      <div className="text-xs text-gray-400">Cache Hits</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-400">{(cacheStats.avgQuality * 100).toFixed(0)}%</div>
                      <div className="text-xs text-gray-400">Avg Quality</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            {Object.entries(categories).map(([key, cat]: [string, any]) => (
              <Card key={key} className="bg-gray-900/80 border-gray-800" data-testid={`category-${key}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(key)}
                      <span className="font-medium text-white">{cat.category}</span>
                    </div>
                    <Badge className={getScoreBg(cat.tessera?.score || 0)}>{cat.tessera?.score || 0}/100</Badge>
                  </div>
                  <div className="text-xs text-gray-400 mb-2">{cat.industryBenchmark}</div>
                  <div className="grid grid-cols-5 gap-2 text-center text-xs mb-2">
                    <div className={`p-1 rounded ${getScoreBg(cat.tessera?.score || 0)}`}>
                      <div className="font-bold text-cyan-400">Tessera</div>
                      <div className={getScoreColor(cat.tessera?.score || 0)}>{cat.tessera?.score || 0}</div>
                    </div>
                    <div className="p-1 rounded bg-gray-800">
                      <div className="font-bold text-gray-300">GPT-4o</div>
                      <div className={getScoreColor(cat.gpt4o || 0)}>{cat.gpt4o}</div>
                    </div>
                    <div className="p-1 rounded bg-gray-800">
                      <div className="font-bold text-gray-300">Claude</div>
                      <div className={getScoreColor(cat.claude35 || 0)}>{cat.claude35}</div>
                    </div>
                    <div className="p-1 rounded bg-gray-800">
                      <div className="font-bold text-gray-300">Gemini</div>
                      <div className={getScoreColor(cat.gemini15 || 0)}>{cat.gemini15}</div>
                    </div>
                    <div className="p-1 rounded bg-gray-800">
                      <div className="font-bold text-gray-300">DeepSeek</div>
                      <div className={getScoreColor(cat.deepseekV3 || 0)}>{cat.deepseekV3}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-1 text-xs">
                    <ChevronRight className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span className="text-cyan-300">{cat.tessera?.advantage}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 italic">{cat.gap}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            {Object.entries(competitors).map(([name, profile]: [string, any]) => (
              <Card key={name} className="bg-gray-900/80 border-gray-800" data-testid={`competitor-${name}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-white">{name}</span>
                      <span className="text-xs text-gray-500 ml-2">by {profile.company}</span>
                    </div>
                    <Badge className={getScoreBg(profile.score)}>{profile.score}/100</Badge>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">Params: {profile.params}</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {profile.strengths?.map((s: string) => (
                      <Badge key={s} variant="outline" className="border-emerald-500/40 text-emerald-400 text-xs">{s}</Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {profile.weaknesses?.map((w: string) => (
                      <Badge key={w} variant="outline" className="border-red-500/40 text-red-400 text-xs">{w}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-violet-400">AGI Knowledge Synthesis</h3>
              <Badge variant="outline" className="border-violet-500/40 text-violet-400">
                {synthEntries.length} insights
              </Badge>
            </div>
            {synthLoading ? (
              <div className="text-center text-gray-400 py-8">Loading synthesis data...</div>
            ) : synthEntries.length === 0 ? (
              <Card className="bg-gray-900/80 border-gray-800">
                <CardContent className="p-6 text-center">
                  <p className="text-gray-400 mb-3">No synthesis data yet. Run the AGI Enhancement cycle to generate insights.</p>
                  <Button onClick={() => enhanceMutation.mutate()} disabled={enhanceMutation.isPending} className="bg-violet-600 hover:bg-violet-700" data-testid="btn-first-synthesis">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AGI Insights
                  </Button>
                </CardContent>
              </Card>
            ) : (
              synthEntries.slice(0, 50).map((entry: any, i: number) => (
                <Card key={entry.id || i} className="bg-gray-900/60 border-gray-800" data-testid={`synthesis-${i}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="border-cyan-500/40 text-cyan-400 text-xs">{entry.category}</Badge>
                      <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">{entry.source}</Badge>
                      <Badge variant="outline" className={`text-xs ${entry.priority >= 80 ? "border-red-500/40 text-red-400" : entry.priority >= 60 ? "border-yellow-500/40 text-yellow-400" : "border-gray-500 text-gray-400"}`}>
                        P{entry.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-300">{entry.insight}</p>
                    {entry.implementationNotes && entry.implementationNotes !== "Analyze and integrate" && (
                      <p className="text-xs text-emerald-400 mt-1">→ {entry.implementationNotes}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div>
            <Card className="bg-gray-900/80 border-violet-500/30">
              <CardHeader>
                <CardTitle className="text-violet-400 flex items-center gap-2">
                  <Crown className="w-5 h-5" /> Capabilities No Other AI Has
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {uniqueCapabilities.map((cap: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded bg-gray-800/50 border border-violet-500/20" data-testid={`unique-${i}`}>
                      <Sparkles className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-200">{cap}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 border-cyan-500/30 mt-4">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" /> AGI Enhancement Systems Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 rounded bg-gray-800/50 border border-cyan-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium text-white">Chain-of-Thought</span>
                    </div>
                    <p className="text-xs text-gray-400">Auto-activates for math, reasoning, and complex queries</p>
                    <Badge className="mt-2 bg-emerald-500/20 border-emerald-500/40 text-emerald-400">ACTIVE</Badge>
                  </div>
                  <div className="p-3 rounded bg-gray-800/50 border border-violet-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-violet-400" />
                      <span className="text-sm font-medium text-white">Semantic Cache</span>
                    </div>
                    <p className="text-xs text-gray-400">Fuzzy-matches similar queries for instant responses</p>
                    <Badge className="mt-2 bg-emerald-500/20 border-emerald-500/40 text-emerald-400">ACTIVE</Badge>
                  </div>
                  <div className="p-3 rounded bg-gray-800/50 border border-pink-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-pink-400" />
                      <span className="text-sm font-medium text-white">Knowledge Synthesizer</span>
                    </div>
                    <p className="text-xs text-gray-400">Extracts actionable AGI insights from all knowledge sources</p>
                    <Badge className="mt-2 bg-emerald-500/20 border-emerald-500/40 text-emerald-400">ACTIVE</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
