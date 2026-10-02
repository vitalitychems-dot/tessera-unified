import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Brain, Zap, CheckCircle, AlertCircle, Clock, Loader2,
  GitBranch, MessageSquare, ChevronDown, ChevronUp, Activity,
  Network, Search, TrendingUp, Layers, Shield, Target
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  globalSwarmCoordinator,
  type SwarmTask,
  type AgentResult,
  type InterAgentMessage,
  classifyTask,
  SPECIALIZED_AGENTS,
} from "@/lib/swarm-agents";

const DOMAIN_COLORS: Record<string, string> = {
  math: "text-blue-400 border-blue-500/30 bg-blue-500/5",
  physics: "text-purple-400 border-purple-500/30 bg-purple-500/5",
  symbolic: "text-yellow-400 border-yellow-500/30 bg-yellow-500/5",
  retrieval: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
  planning: "text-orange-400 border-orange-500/30 bg-orange-500/5",
  architecture: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5",
  routing: "text-pink-400 border-pink-500/30 bg-pink-500/5",
  synthesis: "text-violet-400 border-violet-500/30 bg-violet-500/5",
  meta: "text-red-400 border-red-500/30 bg-red-500/5",
};

const DOMAIN_ICONS: Record<string, any> = {
  math: TrendingUp,
  physics: Zap,
  symbolic: GitBranch,
  retrieval: Search,
  planning: Target,
  architecture: Layers,
  routing: Network,
  meta: Brain,
};

const STATUS_ICONS: Record<string, any> = {
  idle: Clock,
  planning: Brain,
  executing: Zap,
  reflecting: MessageSquare,
  improving: TrendingUp,
  complete: CheckCircle,
  error: AlertCircle,
};

const STATUS_COLORS: Record<string, string> = {
  idle: "text-slate-400",
  planning: "text-blue-400",
  executing: "text-yellow-400",
  reflecting: "text-purple-400",
  improving: "text-orange-400",
  complete: "text-emerald-400",
  error: "text-red-400",
};

function AgentCard({ result }: { result: AgentResult }) {
  const [expanded, setExpanded] = useState(false);
  const domainClass = DOMAIN_COLORS[result.domain] || "text-slate-400 border-slate-500/30 bg-slate-500/5";
  const StatusIcon = STATUS_ICONS[result.status] || Clock;
  const statusColor = STATUS_COLORS[result.status] || "text-slate-400";
  const DomainIcon = DOMAIN_ICONS[result.domain] || Brain;

  const duration = result.completedAt && result.startedAt
    ? ((result.completedAt - result.startedAt) / 1000).toFixed(1)
    : null;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${domainClass}`}>
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-8 h-8 rounded-lg border border-current/20 flex items-center justify-center flex-shrink-0`}>
          <DomainIcon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-xs sm:text-sm text-white">{result.agentName}</span>
            <Badge className={`text-xs border ${domainClass}`}>{result.domain}</Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusIcon className={`w-3 h-3 ${statusColor} ${result.status === "executing" || result.status === "planning" ? "animate-pulse" : ""}`} />
            <span className={`text-xs ${statusColor}`}>{result.status}</span>
            {duration && <span className="text-xs text-slate-500">· {duration}s</span>}
            {result.selfAssessmentScore > 0 && (
              <span className="text-xs text-slate-500">· Score: {result.selfAssessmentScore}%</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {result.status === "complete" && (
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
          {expanded ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-current/10 p-3 space-y-3">
          {result.reasoningTrace.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1">
                <GitBranch className="w-3 h-3" /> REASONING TRACE (PLAN → EXECUTE → REFLECT → IMPROVE)
              </p>
              <div className="space-y-1.5">
                {result.reasoningTrace.map((step, i) => {
                  const phaseColors: Record<string, string> = {
                    plan: "text-blue-400 border-blue-500/20",
                    execute: "text-yellow-400 border-yellow-500/20",
                    reflect: "text-purple-400 border-purple-500/20",
                    improve: "text-emerald-400 border-emerald-500/20",
                  };
                  const phaseColor = phaseColors[step.phase] || "text-slate-400 border-slate-500/20";
                  return (
                    <div key={i} className={`text-xs rounded-lg p-2 bg-black/20 border ${phaseColor}`}>
                      <span className="font-bold uppercase text-[10px]">[{step.phase}]</span>
                      <span className="ml-2 opacity-80">{step.content.slice(0, 200)}{step.content.length > 200 ? "..." : ""}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result.output && (
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1.5">OUTPUT</p>
              <div className="text-xs text-slate-300 leading-relaxed bg-black/20 rounded-lg p-2.5 max-h-40 overflow-y-auto">
                {result.output}
              </div>
            </div>
          )}

          {result.improvement && (
            <div>
              <p className="text-xs font-bold text-emerald-400 mb-1.5">PROPOSED IMPROVEMENT</p>
              <div className="text-xs text-slate-300 leading-relaxed bg-emerald-500/5 rounded-lg p-2.5">
                {result.improvement}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageFeed({ messages }: { messages: InterAgentMessage[] }) {
  const typeColors: Record<string, string> = {
    task: "text-blue-400",
    result: "text-emerald-400",
    critique: "text-orange-400",
    feedback: "text-purple-400",
    query: "text-yellow-400",
    broadcast: "text-cyan-400",
  };

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
      {messages.slice(-20).reverse().map((msg) => (
        <div key={msg.id} className="flex gap-2 text-xs">
          <span className="text-slate-600 flex-shrink-0 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          <span className={`font-medium flex-shrink-0 ${typeColors[msg.type] || "text-slate-400"}`}>[{msg.type.toUpperCase()}]</span>
          <span className="text-slate-400 flex-shrink-0">{msg.from} → {msg.to}:</span>
          <span className="text-slate-300 truncate">{msg.content}</span>
        </div>
      ))}
    </div>
  );
}

function RoutingGraphViz() {
  const { data } = useQuery<any>({ queryKey: ["/api/swarm/routing-graph"], staleTime: 60000 });

  const nodes = data?.nodes || [
    { id: "swarm-coordinator", label: "Coordinator", type: "coordinator" },
    { id: "meta-agent", label: "MetaAgent", type: "meta" },
    { id: "math-agent", label: "Euler", type: "agent", domain: "math" },
    { id: "physics-agent", label: "Curie", type: "agent", domain: "physics" },
    { id: "symbolic-agent", label: "Noether", type: "agent", domain: "symbolic" },
    { id: "retrieval-agent", label: "Athena", type: "agent", domain: "retrieval" },
    { id: "planning-agent", label: "Minerva", type: "agent", domain: "planning" },
    { id: "architecture-agent", label: "Ada", type: "agent", domain: "architecture" },
    { id: "routing-agent", label: "Iris", type: "agent", domain: "routing" },
  ];

  const agentNodes = nodes.filter((n: any) => n.type === "agent");
  const typeGradients: Record<string, string> = {
    coordinator: "from-emerald-500/40 to-cyan-500/20 border-emerald-500/40",
    meta: "from-red-500/30 to-orange-500/20 border-red-500/30",
    agent: "from-slate-500/20 to-slate-600/10 border-slate-500/20",
    provider: "from-violet-500/20 to-purple-500/10 border-violet-500/20",
  };

  return (
    <div className="bg-[#080c14] rounded-xl border border-[#1a2030] p-4">
      <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5">
        <Network className="w-3.5 h-3.5 text-cyan-400" /> GEOMETRY-BASED ROUTING GRAPH
      </h4>
      <div className="relative">
        <div className="flex justify-center mb-3">
          <div className={`bg-gradient-to-br ${typeGradients.coordinator} border rounded-xl px-3 py-2 text-center`}>
            <div className="text-xs font-bold text-emerald-300">Swarm Coordinator</div>
            <div className="text-[10px] text-slate-500">Task Router · Load Balancer</div>
          </div>
        </div>
        <div className="flex justify-center mb-1">
          <div className="w-px h-4 bg-emerald-500/30" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {agentNodes.map((node: any) => {
            const DomainIcon = DOMAIN_ICONS[node.domain] || Brain;
            const dClass = DOMAIN_COLORS[node.domain] || "text-slate-400 border-slate-500/30 bg-slate-500/5";
            return (
              <div key={node.id} className={`border rounded-lg p-2 text-center ${dClass}`}>
                <DomainIcon className="w-3 h-3 mx-auto mb-1" />
                <div className="text-[10px] font-bold">{node.label}</div>
                <div className="text-[9px] opacity-60">{node.domain}</div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center mb-1">
          <div className="w-px h-4 bg-red-500/30" />
        </div>
        <div className="flex justify-center">
          <div className={`bg-gradient-to-br ${typeGradients.meta} border rounded-xl px-3 py-2 text-center`}>
            <div className="text-xs font-bold text-red-300">MetaAgent (PLAN→EXECUTE→REFLECT→IMPROVE)</div>
            <div className="text-[10px] text-slate-500">Reasoning Auditor · Quality Scorer</div>
          </div>
        </div>
      </div>
      <div className="mt-3 text-[10px] text-slate-600 text-center">
        Algorithm: BFS shortest-path + load-balanced routing · {nodes.length} nodes
      </div>
    </div>
  );
}

function MetaCognitionPanel({ report }: { report: NonNullable<SwarmTask["metaReport"]> }) {
  const qualityColor = report.overallQuality >= 80 ? "text-emerald-400" : report.overallQuality >= 60 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="bg-[#0a0e18] border border-red-500/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-red-400" />
        <h4 className="text-xs font-bold text-red-300">META-AGENT COGNITION REPORT</h4>
        <span className={`ml-auto text-sm font-bold ${qualityColor}`}>{report.overallQuality}%</span>
      </div>

      <div className="text-[10px] text-slate-500 leading-relaxed bg-black/20 rounded-lg p-2.5 max-h-36 overflow-y-auto">
        <p className="text-slate-300 text-xs">{report.synthesizedInsight.slice(0, 600)}{report.synthesizedInsight.length > 600 ? "..." : ""}</p>
      </div>

      {report.weaknesses.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-orange-400 mb-1">IDENTIFIED WEAKNESSES</p>
          <ul className="space-y-0.5">
            {report.weaknesses.map((w, i) => (
              <li key={i} className="text-[10px] text-slate-400 flex gap-1.5">
                <AlertCircle className="w-2.5 h-2.5 text-orange-400 mt-0.5 flex-shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.improvements.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-emerald-400 mb-1">IMPROVEMENT PROPOSALS</p>
          <ul className="space-y-0.5">
            {report.improvements.map((imp, i) => (
              <li key={i} className="text-[10px] text-slate-400 flex gap-1.5">
                <TrendingUp className="w-2.5 h-2.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                {imp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.recommendedNextSteps.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-cyan-400 mb-1">RECOMMENDED NEXT STEPS</p>
          <ul className="space-y-0.5">
            {report.recommendedNextSteps.map((step, i) => (
              <li key={i} className="text-[10px] text-slate-400 flex gap-1.5">
                <Target className="w-2.5 h-2.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AISwarmTab() {
  const [taskInput, setTaskInput] = useState("");
  const [activeTask, setActiveTask] = useState<SwarmTask | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showGraph, setShowGraph] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const detectedDomains = taskInput.trim() ? classifyTask(taskInput) : [];

  const handleSubmit = useCallback(async () => {
    if (!taskInput.trim() || isRunning) return;

    abortRef.current = new AbortController();
    setIsRunning(true);
    setActiveTask(null);

    try {
      await globalSwarmCoordinator.submitTask(
        taskInput.trim(),
        [],
        (updated) => setActiveTask({ ...updated }),
        abortRef.current.signal
      );
    } catch (err) {
      console.error("Swarm task error:", err);
    } finally {
      setIsRunning(false);
    }
  }, [taskInput, isRunning]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
  }, []);

  const completedAgents = activeTask?.agentResults.filter(r => r.status === "complete") || [];
  const errorAgents = activeTask?.agentResults.filter(r => r.status === "error") || [];
  const totalAgents = activeTask?.agentResults.length || 0;

  return (
    <div className="p-3 sm:p-4 space-y-4 pb-20">
      <div className="bg-gradient-to-r from-red-500/10 via-orange-500/5 to-yellow-500/10 rounded-xl border border-red-500/20 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-bold text-red-300">AI Swarm Hub — Phase 6</h3>
          <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs ml-auto">METACOGNITION</Badge>
        </div>
        <p className="text-xs text-slate-400">
          7 specialized agents · PLAN → EXECUTE → REFLECT → IMPROVE · MetaAgent quality review · Geometry-based routing
        </p>
      </div>

      <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-xs font-bold text-slate-300">Submit Swarm Task</span>
        </div>

        {detectedDomains.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-slate-500">Routing to:</span>
            {detectedDomains.map(d => {
              const dClass = DOMAIN_COLORS[d] || "text-slate-400 border-slate-500/30";
              const DomainIcon = DOMAIN_ICONS[d] || Brain;
              return (
                <span key={d} className={`text-[10px] border rounded-full px-2 py-0.5 flex items-center gap-1 ${dClass}`}>
                  <DomainIcon className="w-2.5 h-2.5" />{d}
                </span>
              );
            })}
          </div>
        )}

        <textarea
          className="w-full bg-[#080c14] border border-[#1a2030] rounded-xl p-3 text-sm text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-red-500/40 transition-colors"
          rows={3}
          placeholder="Enter a complex task — math, physics, planning, system design, research..."
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
        />

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!taskInput.trim() || isRunning}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            {isRunning ? "Swarm Running..." : "Run Swarm"}
          </button>
          {isRunning && (
            <button
              onClick={handleStop}
              className="px-4 py-2.5 rounded-xl bg-slate-500/20 border border-slate-500/30 text-slate-300 text-sm hover:bg-slate-500/30 transition-all"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {activeTask && (
        <>
          <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-slate-300">Swarm Status</span>
              <Badge className={`ml-auto text-xs border ${
                activeTask.status === "complete" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                activeTask.status === "error" ? "bg-red-500/20 text-red-300 border-red-500/30" :
                "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
              }`}>
                {activeTask.status.toUpperCase()}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center max-w-full">
              <div className="bg-[#080c14] rounded-lg p-2">
                <div className="text-sm font-bold text-emerald-400">{completedAgents.length}</div>
                <div className="text-[10px] text-slate-500">Complete</div>
              </div>
              <div className="bg-[#080c14] rounded-lg p-2">
                <div className="text-sm font-bold text-yellow-400">{totalAgents - completedAgents.length - errorAgents.length}</div>
                <div className="text-[10px] text-slate-500">Running</div>
              </div>
              <div className="bg-[#080c14] rounded-lg p-2">
                <div className="text-sm font-bold text-red-400">{errorAgents.length}</div>
                <div className="text-[10px] text-slate-500">Failed</div>
              </div>
            </div>
            {activeTask.status === "complete" && activeTask.completedAt && (
              <div className="text-xs text-slate-500 text-center mt-2">
                Completed in {((activeTask.completedAt - activeTask.startedAt) / 1000).toFixed(1)}s · {completedAgents.length} agents · {activeTask.selectedDomains.join(", ")}
              </div>
            )}
          </div>

          {activeTask.agentResults.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-slate-400">AGENT RESULTS</span>
                <span className="text-xs text-slate-600">({activeTask.agentResults.length} agents)</span>
              </div>
              <div className="space-y-2">
                {activeTask.agentResults.map((result) => (
                  <AgentCard key={result.agentId} result={result} />
                ))}
              </div>
            </div>
          )}

          {activeTask.metaReport && (
            <MetaCognitionPanel report={activeTask.metaReport} />
          )}

          {activeTask.finalAnswer && activeTask.status === "complete" && (
            <div className="bg-[#0a0e18] border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <h4 className="text-xs font-bold text-emerald-300">UNIFIED SWARM ANSWER</h4>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                {activeTask.finalAnswer}
              </div>
            </div>
          )}

          {activeTask.messages.length > 0 && (
            <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center gap-2 p-3 text-left"
                onClick={() => setShowMessages(!showMessages)}
              >
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-bold text-slate-300">INTER-AGENT COMMUNICATION</span>
                <span className="text-xs text-slate-600 ml-1">({activeTask.messages.length} messages)</span>
                {showMessages ? <ChevronUp className="w-3 h-3 text-slate-500 ml-auto" /> : <ChevronDown className="w-3 h-3 text-slate-500 ml-auto" />}
              </button>
              {showMessages && (
                <div className="px-3 pb-3">
                  <MessageFeed messages={activeTask.messages} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center gap-2 p-3 text-left"
          onClick={() => setShowGraph(!showGraph)}
        >
          <Network className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-bold text-slate-300">ROUTING GRAPH</span>
          {showGraph ? <ChevronUp className="w-3 h-3 text-slate-500 ml-auto" /> : <ChevronDown className="w-3 h-3 text-slate-500 ml-auto" />}
        </button>
        {showGraph && (
          <div className="px-3 pb-3">
            <RoutingGraphViz />
          </div>
        )}
      </div>

      <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-3.5 h-3.5 text-violet-400" />
          <h4 className="text-xs font-bold text-slate-300">SPECIALIZED AGENTS</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SPECIALIZED_AGENTS.map((agent) => {
            const dClass = DOMAIN_COLORS[agent.domain] || "text-slate-400 border-slate-500/30 bg-slate-500/5";
            const DomainIcon = DOMAIN_ICONS[agent.domain] || Brain;
            return (
              <div key={agent.agentId} className={`border rounded-xl p-3 ${dClass}`}>
                <div className="flex items-center gap-2 mb-1">
                  <DomainIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-xs font-bold text-white">{agent.agentName}</span>
                  <Badge className={`ml-auto text-[10px] border ${dClass}`}>{agent.domain}</Badge>
                </div>
                <div className="text-[10px] text-slate-500">Model: {agent.modelId.split("-").slice(0, 2).join("-")}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">PLAN → EXECUTE → REFLECT → IMPROVE</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
