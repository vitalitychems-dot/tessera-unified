import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Brain, Zap, BarChart3, Play, Plus, RefreshCw, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PipelineEntry {
  id: string;
  source: string;
  content: string;
  category: string;
  usedForTraining: boolean;
  timesUsed: number;
  trainingImpact: number;
  extractedInsights: string[];
  lastUtilized?: number;
  addedAt: number;
}

interface PipelineStats {
  totalEntries: number;
  trainedEntries: number;
  unusedEntries: number;
  totalInsights: number;
  avgTrainingImpact: number;
  sourcesActive: string[];
  lastPipelineRun: number;
  knowledgeUtilizationRate: number;
}

const SOURCE_COLORS: Record<string, string> = {
  "knowledge-base": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  distilled: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "rllm-corpus": "bg-green-500/20 text-green-300 border-green-500/30",
  "repo-knowledge": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "sovereign-knowledge": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  interdimensional: "bg-pink-500/20 text-pink-300 border-pink-500/30",
};

export default function KnowledgePipelinePage({ embedded }: { embedded?: boolean }) {
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
  const [sourceFilter, setSourceFilter] = useState("all");
  const [newContent, setNewContent] = useState("");
  const [newSource, setNewSource] = useState("knowledge-base");
  const [newCategory, setNewCategory] = useState("general");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entriesData, isLoading: entriesLoading } = useQuery<{ entries: PipelineEntry[] }>({
    queryKey: ["/api/knowledge-pipeline/entries", sourceFilter !== "all" ? sourceFilter : undefined],
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<PipelineStats>({
    queryKey: ["/api/knowledge-pipeline/stats"],
    refetchInterval: 30000,
  });

  const { data: insightsData } = useQuery<{ insights: { insight: string; source: string; impact: number }[] }>({
    queryKey: ["/api/knowledge-pipeline/insights"],
  });

  const runMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/knowledge-pipeline/run", {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-pipeline/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-pipeline/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-pipeline/insights"] });
      toast({ title: "Pipeline Run Complete", description: `Processed ${data.processed} entries, extracted ${data.insights} insights` });
    },
  });

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/knowledge-pipeline/add", { content: newContent, source: newSource, category: newCategory }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-pipeline/entries"] });
      toast({ title: "Knowledge Added", description: "Entry added to training pipeline" });
      setNewContent("");
    },
  });

  const entries = (entriesData?.entries || []).filter(e => sourceFilter === "all" || e.source === sourceFilter);

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-background text-white`}>
      <div className="border-b border-[#1a1f2e] bg-gradient-to-r from-[#0a0f1a] to-[#090a0f] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/10 border border-purple-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Knowledge Pipeline</h1>
            <p className="text-xs text-slate-400">All stored knowledge actively training the unified LLM — nothing stored unused</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {statsData && (
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                {statsData.knowledgeUtilizationRate}% utilized
              </Badge>
            )}
            <Button onClick={() => runMutation.mutate()} disabled={runMutation.isPending} size="sm"
              className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30"
              data-testid="btn-run-pipeline">
              <Play className="w-4 h-4 mr-1" />
              {runMutation.isPending ? "Running..." : "Run Pipeline"}
            </Button>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {(["entries", "insights", "stats", "add"] as const).map(tab => (
            <button key={tab}  data-testid={`tab-pipeline-${tab}`}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}>
              {tab === "entries" ? "Knowledge Entries" : tab === "insights" ? "Extracted Insights" : tab === "stats" ? "Pipeline Stats" : "Add Knowledge"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {true && (
          <>
            {statsLoading ? <div className="text-slate-400 text-center py-12">Loading stats...</div> : statsData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[#0d1117] border border-purple-500/20 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-purple-400">{statsData.totalEntries}</div>
                    <div className="text-xs text-slate-400 mt-1">Total Entries</div>
                  </div>
                  <div className="bg-[#0d1117] border border-green-500/20 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-green-400">{statsData.trainedEntries}</div>
                    <div className="text-xs text-slate-400 mt-1">Trained Entries</div>
                  </div>
                  <div className="bg-[#0d1117] border border-yellow-500/20 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-400">{statsData.unusedEntries}</div>
                    <div className="text-xs text-slate-400 mt-1">Unused (Queue)</div>
                  </div>
                  <div className="bg-[#0d1117] border border-blue-500/20 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-blue-400">{statsData.totalInsights}</div>
                    <div className="text-xs text-slate-400 mt-1">Insights Extracted</div>
                  </div>
                </div>
                <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300">Knowledge Utilization Rate</span>
                    <span className="text-lg font-bold text-purple-400">{statsData.knowledgeUtilizationRate}%</span>
                  </div>
                  <div className="w-full bg-[#1a2030] rounded-full h-3">
                    <div className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500" style={{ width: `${statsData.knowledgeUtilizationRate}%` }} />
                  </div>
                </div>
                <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">Active Sources</h3>
                  <div className="flex flex-wrap gap-2">
                    {statsData.sourcesActive.map(s => <Badge key={s} className={`${SOURCE_COLORS[s] || ""}`}>{s}</Badge>)}
                  </div>
                  {statsData.lastPipelineRun > 0 && (
                    <div className="text-xs text-slate-500 mt-2">Last run: {new Date(statsData.lastPipelineRun).toLocaleString()}</div>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}

        {true && (
          <>
            <div className="flex gap-2 flex-wrap">
              {["all", "knowledge-base", "distilled", "rllm-corpus", "repo-knowledge", "sovereign-knowledge"].map(f => (
                <button key={f} onClick={() => setSourceFilter(f)} data-testid={`filter-source-${f}`}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${sourceFilter === f ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-slate-400 hover:text-slate-200 border border-[#1a2030]"}`}>
                  {f}
                </button>
              ))}
            </div>
            {entriesLoading ? <div className="text-slate-400 text-center py-12">Loading entries...</div> : (
              <div className="space-y-2">
                {entries.map(entry => (
                  <div key={entry.id} className={`bg-[#0d1117] border rounded-xl p-4 ${entry.usedForTraining ? "border-green-500/20" : "border-[#1a2030]"}`} data-testid={`entry-${entry.id}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${SOURCE_COLORS[entry.source] || ""}`}>{entry.source}</Badge>
                        <Badge className="text-xs bg-slate-500/20 text-slate-300 border-slate-500/30">{entry.category}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {entry.usedForTraining ? (
                          <span className="text-green-400 flex items-center gap-1"><Zap className="w-3 h-3" />trained</span>
                        ) : (
                          <span className="text-yellow-400">pending</span>
                        )}
                        {entry.trainingImpact > 0 && <span className="text-purple-400">impact: {entry.trainingImpact}</span>}
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{entry.content}</p>
                    {entry.extractedInsights.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {entry.extractedInsights.slice(0, 2).map((ins, i) => (
                          <div key={i} className="text-xs text-cyan-400 flex items-start gap-1">
                            <span className="text-cyan-600 mt-0.5">→</span><span>{ins}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {!entries.length && <div className="text-slate-500 text-center py-8">No entries in this source. Run the pipeline to process knowledge files.</div>}
              </div>
            )}
          </>
        )}

        {true && (
          <div className="space-y-2">
            {(insightsData?.insights || []).map((item, i) => (
              <div key={i} className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4">
                <div className="flex items-start justify-between mb-1">
                  <Badge className={`text-xs ${SOURCE_COLORS[item.source] || ""}`}>{item.source}</Badge>
                  <span className="text-xs text-purple-400">impact: {item.impact}</span>
                </div>
                <p className="text-sm text-slate-300">{item.insight}</p>
              </div>
            ))}
            {!insightsData?.insights?.length && <div className="text-slate-500 text-center py-8">No insights yet — run the pipeline to extract insights from stored knowledge</div>}
          </div>
        )}

        {true && (
          <div className="max-w-xl space-y-4">
            <div className="bg-[#0d1117] border border-purple-500/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-purple-300 mb-3">Add Knowledge to Pipeline</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Source</label>
                  <select value={newSource} onChange={e => setNewSource(e.target.value)} data-testid="select-source"
                    className="w-full bg-[#1a2030] border border-[#2a3040] rounded-lg px-3 py-2 text-white text-sm">
                    <option value="knowledge-base">Knowledge Base</option>
                    <option value="distilled">Distilled</option>
                    <option value="rllm-corpus">RLLM Corpus</option>
                    <option value="repo-knowledge">Repo Knowledge</option>
                    <option value="sovereign-knowledge">Sovereign Knowledge</option>
                    <option value="interdimensional">Interdimensional</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Category</label>
                  <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="general, trading, ai, sovereign..." className="bg-[#1a2030] border-[#2a3040] text-white text-sm" data-testid="input-category" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Knowledge Content</label>
                  <Textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Enter knowledge, insights, lessons, or data to add to the training pipeline..."
                    className="bg-[#1a2030] border-[#2a3040] text-white text-sm resize-none h-32" data-testid="input-knowledge-content" />
                </div>
                <Button onClick={() => addMutation.mutate()} disabled={!newContent || !newCategory || addMutation.isPending}
                  className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30"
                  data-testid="btn-add-knowledge">
                  {addMutation.isPending ? "Adding..." : "Add to Pipeline"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
