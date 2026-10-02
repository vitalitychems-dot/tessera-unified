import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain, Target, Code, Network, Play, Plus, ChevronDown, ChevronUp,
  Loader2, CheckCircle2, XCircle, Clock, Zap, GitBranch, Activity,
  BarChart3, Terminal, RefreshCw, Send, Sparkles, ArrowRight, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Tab = "overview" | "goals" | "traces" | "causal" | "codegen";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    complete: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    failed: "bg-red-500/20 text-red-300 border-red-500/30",
    generated: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    executed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  };
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${map[status] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30"}`}>
      {status}
    </span>
  );
}

function OverviewTab() {
  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/reasoning/dashboard"],
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        <span className="ml-2 text-sm text-slate-400">Loading reasoning dashboard...</span>
      </div>
    );
  }

  const stats = data?.stats ?? {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Goals", value: stats.goals?.active ?? 0, icon: Target, color: "blue" },
          { label: "Total Traces", value: stats.traces?.total ?? 0, icon: Brain, color: "violet" },
          { label: "Code Generated", value: stats.code?.total ?? 0, icon: Code, color: "emerald" },
          { label: "Causal Models", value: stats.causalModels?.total ?? 0, icon: Network, color: "amber" },
        ].map((stat, i) => (
          <div key={i} className={`rounded-xl border border-${stat.color}-500/20 bg-${stat.color}-500/5 p-3`}>
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon className={`w-3 h-3 text-${stat.color}-400`} />
              <span className="text-[9px] text-slate-500">{stat.label}</span>
            </div>
            <div className={`text-2xl font-bold text-${stat.color}-300`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-blue-300">Recent Goals</span>
          </div>
          {(data?.goals ?? []).length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">No goals yet. Create your first goal.</div>
          ) : (
            <div className="space-y-2">
              {(data?.goals ?? []).map((g: any) => (
                <div key={g.id} className="rounded-lg bg-black/20 p-2.5 border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white truncate flex-1 mr-2">{g.title}</span>
                    <StatusBadge status={g.status} />
                  </div>
                  <div className="text-[9px] text-slate-500 truncate">{g.objective}</div>
                  <div className="text-[9px] text-slate-600 mt-0.5">{(g.subTasks as any[])?.length ?? 0} sub-tasks • Priority {g.priority}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold text-violet-300">Recent Traces</span>
          </div>
          {(data?.traces ?? []).length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">No traces yet. Submit a reasoning query.</div>
          ) : (
            <div className="space-y-2">
              {(data?.traces ?? []).map((t: any) => (
                <div key={t.id} className="rounded-lg bg-black/20 p-2.5 border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white truncate flex-1 mr-2">{t.title}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="text-[9px] text-slate-500 truncate">{t.query}</div>
                  <div className="text-[9px] text-slate-600 mt-0.5">{(t.steps as any[])?.length ?? 0} steps • {t.model?.split("-")[0]}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Code className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300">Generated Code</span>
          </div>
          {(data?.code ?? []).length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">No code generated yet.</div>
          ) : (
            <div className="space-y-2">
              {(data?.code ?? []).map((c: any) => (
                <div key={c.id} className="rounded-lg bg-black/20 p-2.5 border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white truncate flex-1 mr-2">{c.description.slice(0, 40)}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-[9px] text-slate-500">{c.language} • {c.code?.length ?? 0} chars</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-300">Causal Models</span>
          </div>
          {(data?.causalModels ?? []).length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">No causal models yet.</div>
          ) : (
            <div className="space-y-2">
              {(data?.causalModels ?? []).map((m: any) => (
                <div key={m.id} className="rounded-lg bg-black/20 p-2.5 border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white truncate flex-1 mr-2">{m.title}</span>
                    <span className="text-[9px] text-amber-400">{m.domain}</span>
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {(m.nodes as any[])?.length ?? 0} nodes • {(m.edges as any[])?.length ?? 0} edges • {(m.counterfactuals as any[])?.length ?? 0} counterfactuals
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalsTab() {
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: goals = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/reasoning/goals"],
    refetchInterval: 10000,
  });

  const createGoal = useMutation({
    mutationFn: async (objective: string) => {
      const res = await apiRequest("POST", "/api/reasoning/goals", { objective });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reasoning/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reasoning/dashboard"] });
      setInput("");
      toast({ title: "Goal created", description: "Decomposed into sub-tasks successfully." });
    },
    onError: () => toast({ title: "Failed to create goal", variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/reasoning/goals/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/reasoning/goals"] }),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold text-blue-300">Goal Planner</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">Enter a high-level objective and the system will decompose it into ordered sub-tasks with dependencies.</p>
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) createGoal.mutate(input); }}
            placeholder="e.g. Build a multi-modal AI system with vision, language, and code capabilities..."
            className="bg-black/30 border-white/10 text-white flex-1 text-sm resize-none h-16"
          />
          <Button
            onClick={() => createGoal.mutate(input)}
            disabled={!input.trim() || createGoal.isPending}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 self-end px-3"
          >
            {createGoal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-400 mx-auto" /></div>
      ) : goals.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs">No goals yet. Create your first objective above.</div>
      ) : (
        <div className="space-y-2">
          {goals.map((goal: any) => (
            <div key={goal.id} className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === goal.id ? null : goal.id)}
                className="w-full p-3 flex items-center gap-3 text-left"
              >
                <Target className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{goal.title}</div>
                  <div className="text-[9px] text-slate-500 truncate">{goal.objective}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={goal.status} />
                  <span className="text-[9px] text-slate-600">P{goal.priority}</span>
                  {expanded === goal.id ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                </div>
              </button>

              {expanded === goal.id && (
                <div className="px-3 pb-3 border-t border-white/5 pt-2 space-y-3">
                  <div className="flex gap-2">
                    {["active", "complete", "pending"].map(s => (
                      <Button
                        key={s}
                        onClick={() => updateStatus.mutate({ id: goal.id, status: s })}
                        disabled={goal.status === s || updateStatus.isPending}
                        size="sm"
                        variant="outline"
                        className="text-[9px] h-6 px-2 border-white/10 text-slate-400 hover:text-white"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-600 mb-1.5 uppercase tracking-wider">Sub-Tasks</div>
                    <div className="space-y-1.5">
                      {(goal.subTasks as any[]).map((task: any, i: number) => (
                        <div key={i} className="rounded-lg bg-black/30 border border-white/5 p-2 flex items-start gap-2">
                          <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[8px] text-blue-400 shrink-0 mt-0.5">{task.priority}</div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-medium text-white">{task.title}</div>
                            <div className="text-[9px] text-slate-500 mt-0.5">{task.description}</div>
                            {((goal.dependencies as any)[task.id] || []).length > 0 && (
                              <div className="text-[8px] text-slate-600 mt-0.5">
                                Depends on: {((goal.dependencies as any)[task.id] || []).join(", ")}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TracesTab() {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: traces = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/reasoning/traces"],
    refetchInterval: 10000,
  });

  const runTrace = useMutation({
    mutationFn: async (q: string) => {
      const res = await apiRequest("POST", "/api/reasoning/traces", { query: q });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reasoning/traces"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reasoning/dashboard"] });
      setQuery("");
      toast({ title: "Reasoning trace complete", description: "Multi-step analysis finished." });
    },
    onError: () => toast({ title: "Failed to run reasoning trace", variant: "destructive" }),
  });

  const STEP_COLORS: Record<string, string> = {
    observation: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5",
    hypothesis: "text-violet-400 border-violet-500/30 bg-violet-500/5",
    analysis: "text-blue-400 border-blue-500/30 bg-blue-500/5",
    validation: "text-amber-400 border-amber-500/30 bg-amber-500/5",
    synthesis: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-bold text-violet-300">Multi-Step Reasoning Engine</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">Submit a complex query and the engine will reason through it step by step, building an auditable chain.</p>
        <div className="flex gap-2">
          <Textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) runTrace.mutate(query); }}
            placeholder="e.g. Why does distributed consensus fail under Byzantine fault conditions, and how can it be solved?"
            className="bg-black/30 border-white/10 text-white flex-1 text-sm resize-none h-16"
          />
          <Button
            onClick={() => runTrace.mutate(query)}
            disabled={!query.trim() || runTrace.isPending}
            className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 self-end px-3"
          >
            {runTrace.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400 mx-auto" /></div>
      ) : traces.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs">No traces yet. Submit a query above to start reasoning.</div>
      ) : (
        <div className="space-y-2">
          {traces.map((trace: any) => (
            <div key={trace.id} className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === trace.id ? null : trace.id)}
                className="w-full p-3 flex items-center gap-3 text-left"
              >
                <Brain className="w-4 h-4 text-violet-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{trace.title}</div>
                  <div className="text-[9px] text-slate-500 truncate">{trace.query}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={trace.status} />
                  <span className="text-[9px] text-slate-600">{(trace.steps as any[])?.length} steps</span>
                  {expanded === trace.id ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                </div>
              </button>

              {expanded === trace.id && (
                <div className="px-3 pb-3 border-t border-white/5 pt-2 space-y-2">
                  <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Reasoning Chain</div>
                  {(trace.steps as any[]).map((step: any, i: number) => (
                    <div key={i} className={`rounded-lg border p-2 flex gap-2 ${STEP_COLORS[step.type] ?? "text-slate-400 border-slate-500/30 bg-slate-500/5"}`}>
                      <div className="w-4 h-4 rounded-full bg-current/10 border border-current flex items-center justify-center text-[8px] shrink-0">{step.step}</div>
                      <div className="min-w-0">
                        <div className="text-[9px] font-bold uppercase tracking-wider opacity-70">{step.type}</div>
                        <div className="text-[10px] mt-0.5">{step.content}</div>
                      </div>
                    </div>
                  ))}
                  {trace.conclusion && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 mt-2">
                      <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-1">Conclusion</div>
                      <div className="text-[10px] text-slate-300">{trace.conclusion}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CausalTab() {
  const [domain, setDomain] = useState("");
  const [cfQuery, setCfQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: models = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/reasoning/causal"],
    refetchInterval: 15000,
  });

  const createModel = useMutation({
    mutationFn: async (d: string) => {
      const res = await apiRequest("POST", "/api/reasoning/causal", { domain: d, title: `Causal: ${d}` });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reasoning/causal"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reasoning/dashboard"] });
      setDomain("");
      setSelectedModel(data);
      toast({ title: "Causal model created", description: "Graph built with nodes and edges." });
    },
    onError: () => toast({ title: "Failed to create model", variant: "destructive" }),
  });

  const runCounterfactual = useMutation({
    mutationFn: async ({ modelId, query }: { modelId: number; query: string }) => {
      const res = await apiRequest("POST", "/api/reasoning/counterfactual", { modelId, query });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reasoning/causal"] });
      setSelectedModel(data.model);
      setCfQuery("");
      toast({ title: "Counterfactual analyzed", description: "What-if scenario computed." });
    },
    onError: () => toast({ title: "Failed to run counterfactual", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Network className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-amber-300">Causal Reasoning</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">Build causal graphs for a domain, then ask counterfactual "what if" questions to trace cause-effect relationships.</p>
        <div className="flex gap-2">
          <input
            value={domain}
            onChange={e => setDomain(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") createModel.mutate(domain); }}
            placeholder="e.g. software deployment pipeline, climate systems, market dynamics..."
            className="bg-black/30 border border-white/10 text-white text-sm px-3 py-2 rounded-lg flex-1 outline-none focus:border-amber-500/50"
          />
          <Button
            onClick={() => createModel.mutate(domain)}
            disabled={!domain.trim() || createModel.isPending}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-3"
          >
            {createModel.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {selectedModel && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-300">{selectedModel.title}</span>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px]">{selectedModel.domain}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">Nodes</div>
              {(selectedModel.nodes as any[]).map((node: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5 mb-1">
                  <div className={`w-2 h-2 rounded-full ${node.type === "cause" ? "bg-red-400" : node.type === "effect" ? "bg-emerald-400" : node.type === "feedback" ? "bg-violet-400" : "bg-amber-400"}`} />
                  <span className="text-[9px] text-slate-400">{node.label}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">Edges</div>
              {(selectedModel.edges as any[]).map((edge: any, i: number) => (
                <div key={i} className="flex items-center gap-1 mb-1 text-[9px] text-slate-400">
                  <span className="text-slate-500">{edge.from}</span>
                  <ArrowRight className="w-2 h-2 text-slate-600" />
                  <span className="text-slate-500">{edge.to}</span>
                  <span className="text-[8px] text-slate-600 ml-1">({Math.round(edge.strength * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 pt-3">
            <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Counterfactual Query</div>
            <div className="flex gap-2">
              <input
                value={cfQuery}
                onChange={e => setCfQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") runCounterfactual.mutate({ modelId: selectedModel.id, query: cfQuery }); }}
                placeholder="What if the initial condition changed? What if there was no mechanism?"
                className="bg-black/30 border border-white/10 text-white text-xs px-3 py-2 rounded-lg flex-1 outline-none focus:border-amber-500/50"
              />
              <Button
                onClick={() => runCounterfactual.mutate({ modelId: selectedModel.id, query: cfQuery })}
                disabled={!cfQuery.trim() || runCounterfactual.isPending}
                size="sm"
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-3"
              >
                {runCounterfactual.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          {(selectedModel.counterfactuals as any[]).length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-[9px] text-slate-600 uppercase tracking-wider">Counterfactual Analyses</div>
              {(selectedModel.counterfactuals as any[]).map((cf: any, i: number) => (
                <div key={i} className="rounded-lg bg-black/30 border border-white/5 p-2">
                  <div className="text-[9px] font-medium text-amber-300 mb-1">"{cf.query}"</div>
                  <div className="text-[9px] text-slate-400">{cf.analysis}</div>
                  <div className="text-[8px] text-slate-600 mt-1">Confidence: {Math.round((cf.confidence ?? 0) * 100)}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin text-amber-400 mx-auto" /></div>
      ) : models.length === 0 && !selectedModel ? (
        <div className="text-center py-6 text-slate-500 text-xs">No causal models yet. Build one above.</div>
      ) : (
        <div className="space-y-2">
          {models.map((m: any) => (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m)}
              className={`w-full rounded-lg border p-3 text-left transition-all ${selectedModel?.id === m.id ? "border-amber-500/40 bg-amber-500/10" : "border-white/10 bg-white/[0.02] hover:border-amber-500/20"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{m.title}</span>
                <span className="text-[9px] text-amber-400">{m.domain}</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">
                {(m.nodes as any[])?.length} nodes • {(m.edges as any[])?.length} edges • {(m.counterfactuals as any[])?.length} counterfactuals
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CodeGenTab() {
  const [description, setDescription] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [execResults, setExecResults] = useState<Record<number, any>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: codeItems = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/reasoning/codegen"],
    refetchInterval: 10000,
  });

  const generateCode = useMutation({
    mutationFn: async (desc: string) => {
      const res = await apiRequest("POST", "/api/reasoning/codegen", { description: desc, language: "typescript" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reasoning/codegen"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reasoning/dashboard"] });
      setDescription("");
      toast({ title: "Code generated", description: "TypeScript code and tests ready." });
    },
    onError: () => toast({ title: "Failed to generate code", variant: "destructive" }),
  });

  const executeCode = async (item: any) => {
    setExecutingId(item.id);
    try {
      const res = await apiRequest("POST", "/api/reasoning/execute", { codeId: item.id });
      const result = await res.json();
      setExecResults(prev => ({ ...prev, [item.id]: result }));
      queryClient.invalidateQueries({ queryKey: ["/api/reasoning/codegen"] });
      toast({ title: result.exitCode === 0 ? "Execution successful" : "Execution failed", variant: result.exitCode === 0 ? "default" : "destructive" });
    } catch {
      toast({ title: "Execution error", variant: "destructive" });
    }
    setExecutingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Code className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-emerald-300">Code Generation + Execution</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">Describe functionality in natural language. The engine generates TypeScript code with auto-tests, then executes it in a sandbox.</p>
        <div className="flex gap-2">
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) generateCode.mutate(description); }}
            placeholder="e.g. A function that validates email addresses and returns detailed error messages..."
            className="bg-black/30 border-white/10 text-white flex-1 text-sm resize-none h-16"
          />
          <Button
            onClick={() => generateCode.mutate(description)}
            disabled={!description.trim() || generateCode.isPending}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 self-end px-3"
          >
            {generateCode.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-emerald-400 mx-auto" /></div>
      ) : codeItems.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs">No code generated yet. Describe a function above.</div>
      ) : (
        <div className="space-y-2">
          {codeItems.map((item: any) => {
            const execResult = execResults[item.id] ?? item.executionResult;
            return (
              <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  className="w-full p-3 flex items-center gap-3 text-left"
                >
                  <Code className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{item.description.slice(0, 60)}</div>
                    <div className="text-[9px] text-slate-500">{item.language} • {item.code?.length} chars</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={item.status} />
                    <Button
                      onClick={e => { e.stopPropagation(); executeCode(item); }}
                      disabled={executingId === item.id}
                      size="sm"
                      className="h-6 px-2 text-[9px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                    >
                      {executingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    </Button>
                    {expanded === item.id ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                  </div>
                </button>

                {expanded === item.id && (
                  <div className="px-3 pb-3 border-t border-white/5 pt-2 space-y-3">
                    <div>
                      <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">Generated Code</div>
                      <pre className="text-[9px] text-slate-300 bg-black/40 rounded-lg p-3 overflow-x-auto border border-white/5 font-mono max-h-48">
                        {item.code}
                      </pre>
                    </div>
                    {item.tests && (
                      <div>
                        <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">Auto-Generated Tests</div>
                        <pre className="text-[9px] text-violet-300 bg-black/40 rounded-lg p-3 overflow-x-auto border border-violet-500/10 font-mono max-h-36">
                          {item.tests}
                        </pre>
                      </div>
                    )}
                    {execResult && (
                      <div>
                        <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Terminal className="w-3 h-3" /> Execution Result
                        </div>
                        <div className={`rounded-lg p-2 border font-mono text-[9px] ${execResult.exitCode === 0 ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300" : "bg-red-950/20 border-red-500/20 text-red-300"}`}>
                          {execResult.output && <div>{execResult.output}</div>}
                          {execResult.error && <div className="text-red-400 mt-1">Error: {execResult.error}</div>}
                          <div className="text-slate-600 mt-1">Exit code: {execResult.exitCode}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ReasoningDashboardPage() {
  const [tab, setTab] = useState<Tab>("overview");

  const tabs: { id: Tab; label: string; icon: typeof Brain }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "goals", label: "Goal Planner", icon: Target },
    { id: "traces", label: "Reasoning Traces", icon: Brain },
    { id: "causal", label: "Causal + Counterfactual", icon: Network },
    { id: "codegen", label: "Code Generation", icon: Code },
  ];

  return (
    <div className="min-h-screen bg-background text-white pb-20">
      <div className="border-b border-[#1a1f2e] bg-gradient-to-r from-[#0a0f1a] via-[#090d18] to-[#090a0f] px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-emerald-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold text-white truncate">Reasoning & Intelligence</h1>
            <p className="text-xs text-slate-400 hidden sm:block">Goal planning · Multi-step reasoning · Causal analysis · Code generation · Sandboxed execution</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">ACTIVE</Badge>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
          {false && tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap min-h-[36px] active:scale-95 select-none ${tab === t.id ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}
            >
              <t.icon className="w-3 h-3" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {tab === "overview" && <OverviewTab />}
        {tab === "goals" && <GoalsTab />}
        {tab === "traces" && <TracesTab />}
        {tab === "causal" && <CausalTab />}
        {tab === "codegen" && <CodeGenTab />}
      </div>
    </div>
  );
}
