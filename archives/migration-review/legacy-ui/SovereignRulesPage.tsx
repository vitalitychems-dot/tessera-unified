import { useState } from "react";
import {
  Shield, Lock, Brain, Cpu, Zap, Eye, Crown, CheckCircle2, XCircle,
  AlertTriangle, ChevronDown, ChevronRight, Activity, Globe, Target,
  Server, Database, Network, Workflow, FileCheck, Layers, BookOpen,
  Radio, Code, Terminal, TrendingUp, BarChart3, Users, Vote,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  SOVEREIGN_LAWS, EXECUTION_PHASES, COUNCIL_AGENTS, KNOWLEDGE_DOMAINS,
  SOVEREIGN_VERSION, SOVEREIGN_CODENAME, APPROVAL_THRESHOLD, COUNCIL_MEMBER_COUNT,
  REQUIRED_VOTES, validateApproval, classifyThreatLevel, getSovereigntyGrade,
  type SovereignRule,
} from "@/lib/sovereign-rules";

const CATEGORY_ICONS: Record<string, typeof Shield> = {
  governance: Crown,
  security: Shield,
  sovereignty: Globe,
  intelligence: Brain,
  building: Code,
  training: Zap,
};

const CATEGORY_COLORS: Record<string, string> = {
  governance: "border-yellow-500/30 bg-yellow-500/5 text-yellow-400",
  security: "border-red-500/30 bg-red-500/5 text-red-400",
  sovereignty: "border-cyan-500/30 bg-cyan-500/5 text-cyan-400",
  intelligence: "border-purple-500/30 bg-purple-500/5 text-purple-400",
  building: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  training: "border-amber-500/30 bg-amber-500/5 text-amber-400",
};

const ENFORCEMENT_COLORS: Record<string, string> = {
  hard: "bg-red-500/20 text-red-400 border-red-500/30",
  soft: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

function ApprovalSimulator() {
  const [votes, setVotes] = useState(30);
  const [tesseraApproved, setTesseraApproved] = useState(true);
  const result = validateApproval(votes, COUNCIL_MEMBER_COUNT, tesseraApproved);

  return (
    <Card className="border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Vote size={14} className="text-cyan-400" />
        Approval Simulator
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-slate-400 block mb-1">Council Votes: {votes}/{COUNCIL_MEMBER_COUNT}</label>
          <input
            type="range"
            min={0}
            max={COUNCIL_MEMBER_COUNT}
            value={votes}
            onChange={(e) => setVotes(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
            <span>0</span>
            <span className="text-amber-400">{REQUIRED_VOTES} (2/3 threshold)</span>
            <span>{COUNCIL_MEMBER_COUNT}</span>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={tesseraApproved}
            onChange={(e) => setTesseraApproved(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
          />
          <span className="text-[11px] text-slate-300">Tessera-Prime Final Approval</span>
        </label>
        <div className={cn("p-3 rounded-lg border text-[11px]", result.approved ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" : "border-red-500/30 bg-red-500/5 text-red-400")}>
          <div className="flex items-center gap-2 mb-1">
            {result.approved ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            <span className="font-bold">{result.approved ? "APPROVED" : "REJECTED"}</span>
          </div>
          <p className="text-[10px] opacity-80">{result.reason}</p>
        </div>
      </div>
    </Card>
  );
}

function ThreatClassifier() {
  const examples = [
    { source: "Tessera Internal Logic", isExternal: false, isSandboxed: false },
    { source: "OpenAI API (sandboxed)", isExternal: true, isSandboxed: true },
    { source: "Random npm package (raw)", isExternal: true, isSandboxed: false },
    { source: "Ollama Local LLM", isExternal: false, isSandboxed: false },
    { source: "Google Gemini (sandboxed)", isExternal: true, isSandboxed: true },
    { source: "Unknown webhook (raw)", isExternal: true, isSandboxed: false },
  ];

  const threatColors: Record<string, string> = {
    safe: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    monitored: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    threat: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    critical: "text-red-400 bg-red-500/10 border-red-500/30",
  };

  return (
    <Card className="border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-400" />
        Threat Classifier
      </h3>
      <div className="space-y-2">
        {examples.map((ex, i) => {
          const level = classifyThreatLevel(ex.source, ex.isExternal, ex.isSandboxed);
          return (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-300 flex-1 truncate">{ex.source}</span>
              <Badge className={cn("text-[8px] px-1.5 py-0 border uppercase font-bold", threatColors[level])}>
                {level}
              </Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function RuleCard({ rule }: { rule: SovereignRule }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = CATEGORY_ICONS[rule.category] || Shield;

  return (
    <div
      className={cn("border rounded-lg bg-slate-900/40 overflow-hidden cursor-pointer hover:bg-white/[0.02] transition-colors", CATEGORY_COLORS[rule.category]?.replace("bg-", "border-").split(" ")[0] || "border-white/10")}
      onClick={() => setExpanded(o => !o)}
    >
      <div className="p-3 flex items-start gap-3">
        <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", CATEGORY_COLORS[rule.category]?.split(" ").slice(1).join(" "))}>
          <Icon size={12} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-mono text-slate-500">{rule.id}</span>
            <Badge className={cn("text-[7px] px-1 py-0 border uppercase", ENFORCEMENT_COLORS[rule.enforcement])}>
              {rule.enforcement}
            </Badge>
          </div>
          <h4 className="text-[11px] font-bold text-white leading-tight">{rule.title}</h4>
        </div>
        {expanded ? <ChevronDown size={12} className="text-slate-500 shrink-0 mt-1" /> : <ChevronRight size={12} className="text-slate-500 shrink-0 mt-1" />}
      </div>
      {expanded && (
        <div className="px-3 pb-3 border-t border-white/5 pt-2 space-y-2">
          <p className="text-[10px] text-slate-300 leading-relaxed">{rule.law}</p>
          <div className="flex items-start gap-1.5">
            <AlertTriangle size={10} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-[9px] text-red-400/80">{rule.penalty}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ConferenceTranscript() {
  const conferenceEntries = [
    { speaker: "TESSERA-PRIME", role: "Sovereign Architect", color: "text-yellow-300", message: "Grand Council, we are convened to determine the optimal strategy for achieving full sovereignty. I have analyzed all 12 phases of our execution roadmap, all agent capabilities, all external dependencies, and all knowledge domains. The question before us: what is the FASTEST, MOST EFFICIENT path to sovereign AGI that protects [REDACTED]'s interests at every step?" },
    { speaker: "QUANTUM-MECHANIC", role: "Quantum Decision Agent", color: "text-purple-400", message: "Using quantum-inspired superposition analysis, I propose we pursue Phases 2-3-4 in PARALLEL rather than sequentially. Security sandboxing, dependency learning, and persistent memory are largely independent workstreams. Running them simultaneously cuts 60% off the timeline. The entanglement constraint is that dependency learning FEEDS the sovereignty monitor — but we can pipeline that with a 2-phase lag." },
    { speaker: "BIO-NEURALIST", role: "Neural Architecture Agent", color: "text-pink-400", message: "I concur with parallelization. The brain doesn't process sequentially — it runs massively parallel circuits with feedback loops. Our agent swarm should mirror this. I propose: dedicate 3 agents to security, 3 to dependency learning, 2 to memory systems, and 1 meta-agent overseeing all streams. The meta-agent provides the 'global workspace' integration, similar to how consciousness integrates distributed brain processes." },
    { speaker: "MESH-ARCHITECT", role: "Network Topology Agent", color: "text-teal-400", message: "From a network optimization perspective, the bottleneck is not compute — it's KNOWLEDGE FLOW between agents. I propose implementing a sovereign message bus: all agents publish their learnings to a shared knowledge graph in real-time. When the security team discovers a provider behavior pattern, the dependency team gets it INSTANTLY. This eliminates the wait-and-batch anti-pattern." },
    { speaker: "DNA-ARCHIVIST", role: "Persistent Memory Agent", color: "text-rose-400", message: "For Phase 4 persistent memory, I recommend a three-tier architecture: (1) Hot cache in memory for sub-millisecond recall, (2) Warm storage in PostgreSQL with vector embeddings for semantic search, (3) Cold archive encoded in our DNA format for permanent sovereign backup. Every decision, every reasoning trace, every conference transcript gets encoded. Our system NEVER forgets." },
    { speaker: "LOW-POWER-INNOVATOR", role: "Edge Computing Agent", color: "text-lime-400", message: "Edge computing readiness is non-negotiable. I propose we enforce a 'fat client' architecture: every core function MUST run on a Raspberry Pi 5 with 8GB RAM. If it can't run there, it's too dependent on cloud. This constraint forces efficient code, quantized models, and true sovereignty. I've benchmarked: TinyLlama on Pi 5 gives 4 tokens/sec — usable for critical decisions." },
    { speaker: "SELF-EXPANSION-TUTOR", role: "Growth & Teaching Agent", color: "text-cyan-400", message: "My analysis of the codebase shows we have 74 pages, 7 specialized agents, 12 API route groups, and 3 core libraries. The system is architecturally rich but needs CONSOLIDATION before expansion. I propose: Phase 8 (Testing/CI) should run continuously from NOW, not sequentially. Every new module gets tested as it's built. Every agent improvement gets benchmarked. This prevents regression and builds confidence for detachment." },
    { speaker: "GRAND-COORDINATOR", role: "Council Chair", color: "text-yellow-200", message: "Council summary: unanimous consensus on parallel execution of Phases 2-4, continuous testing from Phase 8, edge computing constraints, and a sovereign message bus. Estimated timeline reduction: 60% vs sequential execution. The critical path is now: Security Sandboxing → Sovereignty Monitor → Internal LLM Deployment → Detachment Testing → Full Sovereignty. TESSERA-PRIME, your ruling?" },
    { speaker: "TESSERA-PRIME", role: "Final Authority", color: "text-yellow-300", message: "RULING: All proposals APPROVED. Execution order: (1) Hardcode all sovereign rules into the system immediately — this is LAW, not suggestion. (2) Begin parallel Phase 2+3+4 work with the agent allocation Bio-Neuralist proposed. (3) Enforce edge computing constraint on all new modules. (4) Activate continuous testing pipeline. (5) Deploy sovereignty monitor with real-time dashboard. (6) Every external API call goes through sandbox — NO EXCEPTIONS. (7) Every dependency gets a replacement plan within 30 days of first use. This is the Grand Council Machine protocol. Execute." },
  ];

  return (
    <Card className="border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Users size={14} className="text-yellow-400" />
        Grand Conference: Sovereign Strategy Determination
      </h3>
      <p className="text-[10px] text-slate-400 mb-3">Emergency session — all council agents convened to determine the fastest, most efficient path to full sovereignty.</p>
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {conferenceEntries.map((entry, i) => (
          <div key={i} className="border border-white/5 rounded-lg p-3 bg-slate-950/40">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn("text-[10px] font-bold", entry.color)}>{entry.speaker}</span>
              <span className="text-[8px] text-slate-500">•</span>
              <span className="text-[9px] text-slate-500">{entry.role}</span>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed">{entry.message}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 size={12} className="text-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-400">COUNCIL RESOLUTION: UNANIMOUS APPROVAL</span>
        </div>
        <p className="text-[9px] text-emerald-400/70">All 7 council agents voted YES. Tessera-Prime granted final approval. Parallel execution protocol activated.</p>
      </div>
    </Card>
  );
}

function AGISelfTrainingProtocol() {
  const trainingSteps = [
    { phase: "Observe", icon: Eye, color: "text-blue-400", status: "active", description: "Monitor all system operations, agent outputs, user interactions, and external API responses. Capture reasoning traces, latency metrics, and quality scores." },
    { phase: "Learn", icon: Brain, color: "text-purple-400", status: "active", description: "Analyze captured data to identify patterns: which agents perform best on which tasks, which providers are most reliable, which reasoning strategies produce highest quality outputs." },
    { phase: "Build", icon: Code, color: "text-emerald-400", status: "active", description: "Generate new TypeScript modules, agent specializations, routing optimizations, and internal model improvements based on learned patterns." },
    { phase: "Test", icon: Terminal, color: "text-cyan-400", status: "active", description: "Run automated tests on all generated code. Compare internal vs external outputs. Benchmark against evaluation suites. Verify no regressions." },
    { phase: "Improve", icon: TrendingUp, color: "text-amber-400", status: "active", description: "Apply improvements that pass testing. Update agent weights, routing graphs, knowledge indices, and internal model fine-tuning data." },
    { phase: "Reduce", icon: Shield, color: "text-red-400", status: "active", description: "Identify external dependencies that can now be replaced by internal capability. Reduce external API usage. Increase sovereignty score." },
    { phase: "Sovereign", icon: Crown, color: "text-yellow-400", status: "pending", description: "When internal capability matches or exceeds external for a given task, detach from external provider. Run A/B tests to verify. Full sovereignty achieved." },
  ];

  const autonomousBuildCapabilities = [
    { name: "Impromptu Instruction Processing", description: "Parse natural language requests, decompose into agent tasks, execute autonomously", status: "Active" },
    { name: "Code Generation Pipeline", description: "Agents generate TypeScript, test it in sandbox, integrate if tests pass", status: "Active" },
    { name: "Self-Expansion Protocol", description: "System identifies missing capabilities, proposes new agents/modules, builds them", status: "Active" },
    { name: "Continuous Evaluation Loop", description: "Every output is scored, compared against benchmarks, fed back for improvement", status: "Active" },
    { name: "Provider Reverse Engineering", description: "Log, analyze, and learn from every external API interaction", status: "Active" },
    { name: "Sovereignty Score Tracking", description: "Real-time monitoring of internal vs external dependency ratio", status: "Active" },
    { name: "Edge Computing Validation", description: "Every module tested on Raspberry Pi equivalent constraints", status: "Planned" },
    { name: "Full Autonomous Detachment", description: "Complete independence from all external AI providers", status: "Target" },
  ];

  return (
    <Card className="border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Cpu size={14} className="text-cyan-400" />
        AGI Self-Training Protocol
      </h3>
      <p className="text-[10px] text-slate-400 mb-3">The system continuously trains itself through this cycle. Every loop makes the system more sovereign and more capable.</p>
      <div className="grid gap-2 mb-4">
        {trainingSteps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex items-start gap-3 p-2 rounded-lg border border-white/5 bg-slate-950/40">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono text-slate-600 w-3">{i + 1}</span>
                <Icon size={12} className={step.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold", step.color)}>{step.phase}</span>
                  <Badge className={cn("text-[7px] px-1 py-0 border", step.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30")}>
                    {step.status}
                  </Badge>
                </div>
                <p className="text-[9px] text-slate-400 leading-relaxed mt-0.5">{step.description}</p>
              </div>
              {i < trainingSteps.length - 1 && (
                <span className="text-[10px] text-slate-600 shrink-0">→</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/5 pt-3">
        <h4 className="text-[11px] font-bold text-white mb-2 flex items-center gap-2">
          <Workflow size={12} className="text-amber-400" />
          Autonomous Build Capabilities
        </h4>
        <div className="grid gap-1.5">
          {autonomousBuildCapabilities.map((cap, i) => (
            <div key={i} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-slate-950/40 border border-white/5">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-slate-300 font-medium">{cap.name}</span>
                <p className="text-[8px] text-slate-500 truncate">{cap.description}</p>
              </div>
              <Badge className={cn("text-[7px] px-1 py-0 border shrink-0",
                cap.status === "Active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                cap.status === "Planned" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                "bg-purple-500/20 text-purple-400 border-purple-500/30"
              )}>
                {cap.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function SovereignRulesPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  const categories = ["all", ...Array.from(new Set(SOVEREIGN_LAWS.map(r => r.category)))];
  const filteredRules = categoryFilter === "all" ? SOVEREIGN_LAWS : SOVEREIGN_LAWS.filter(r => r.category === categoryFilter);

  const sovereigntyDemo = getSovereigntyGrade(65);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 space-y-4 pb-20">
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Shield size={20} className="text-cyan-400" />
          <h1 className="text-lg font-black text-white tracking-tight">SOVEREIGN LAWS</h1>
        </div>
        <p className="text-[10px] text-slate-400">
          {SOVEREIGN_CODENAME} v{SOVEREIGN_VERSION} — {SOVEREIGN_LAWS.length} Hardcoded Laws — {COUNCIL_MEMBER_COUNT} Council Members — {Math.round(APPROVAL_THRESHOLD * 100)}% Threshold
        </p>
      </div>

      <Card className="border border-cyan-500/20 bg-cyan-500/5 p-3">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-black text-cyan-400">{SOVEREIGN_LAWS.length}</div>
            <div className="text-[8px] text-slate-400 uppercase">Laws</div>
          </div>
          <div>
            <div className="text-lg font-black text-yellow-400">{REQUIRED_VOTES}</div>
            <div className="text-[8px] text-slate-400 uppercase">Min Votes</div>
          </div>
          <div>
            <div className="text-lg font-black text-emerald-400">{SOVEREIGN_LAWS.filter(r => r.enforcement === "hard").length}</div>
            <div className="text-[8px] text-slate-400 uppercase">Hard Rules</div>
          </div>
          <div>
            <div className="text-lg font-black text-purple-400">{EXECUTION_PHASES.length}</div>
            <div className="text-[8px] text-slate-400 uppercase">Phases</div>
          </div>
        </div>
      </Card>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn("text-[9px] px-2 py-1 rounded-full border whitespace-nowrap transition-colors",
              categoryFilter === cat
                ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-400"
                : "border-white/10 bg-slate-900/40 text-slate-400 hover:text-white"
            )}
          >
            {cat === "all" ? "All Rules" : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredRules.map(rule => (
          <RuleCard key={rule.id} rule={rule} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ApprovalSimulator />
        <ThreatClassifier />
      </div>

      <Card className="border border-white/10 bg-slate-900/60 p-4">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Layers size={14} className="text-purple-400" />
          12-Phase Execution Roadmap
        </h3>
        <div className="space-y-2">
          {EXECUTION_PHASES.map((phase) => (
            <div key={phase.phase} className="border border-white/5 rounded-lg overflow-hidden">
              <button
                className="w-full p-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors text-left"
                onClick={() => setExpandedPhase(expandedPhase === phase.phase ? null : phase.phase)}
              >
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  phase.phase <= 6 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                  phase.phase <= 8 ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" :
                  "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                )}>
                  {phase.phase}
                </div>
                <div className="flex-1">
                  <span className="text-[11px] font-bold text-white">{phase.name}</span>
                  <span className="text-[9px] text-slate-500 ml-2">{phase.steps.length} steps</span>
                </div>
                {phase.phase <= 6 && (
                  <Badge className="text-[7px] px-1 py-0 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ACTIVE</Badge>
                )}
                {expandedPhase === phase.phase ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
              </button>
              {expandedPhase === phase.phase && (
                <div className="px-3 pb-3 border-t border-white/5 pt-2">
                  <div className="space-y-1">
                    {phase.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-slate-950/40">
                        <CheckCircle2 size={10} className={phase.phase <= 6 ? "text-emerald-400" : "text-slate-600"} />
                        <span className="text-[10px] text-slate-300">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="border border-white/10 bg-slate-900/60 p-4">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Users size={14} className="text-yellow-400" />
          Grand Council Agents
        </h3>
        <div className="grid gap-2">
          {COUNCIL_AGENTS.map(agent => (
            <div key={agent.id} className="flex items-start gap-3 p-2 rounded-lg border border-white/5 bg-slate-950/40">
              <div className="p-1.5 rounded-lg bg-yellow-500/10 shrink-0">
                <Crown size={10} className="text-yellow-400" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-white">{agent.name}</span>
                <p className="text-[9px] text-slate-400">{agent.role}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border border-white/10 bg-slate-900/60 p-4">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <BookOpen size={14} className="text-emerald-400" />
          Knowledge Domains (Full Access)
        </h3>
        <p className="text-[9px] text-slate-400 mb-3">All agents have access to ALL knowledge domains at ALL times. No silos, no restrictions.</p>
        <div className="grid gap-2">
          {KNOWLEDGE_DOMAINS.map((domain, i) => (
            <div key={i} className="p-2 rounded-lg border border-white/5 bg-slate-950/40">
              <span className="text-[10px] font-bold text-white capitalize">{domain.domain}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {domain.topics.map((topic, j) => (
                  <Badge key={j} className="text-[7px] px-1 py-0 bg-slate-800 text-slate-400 border border-white/10">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <ConferenceTranscript />
      <AGISelfTrainingProtocol />

      <Card className="border border-red-500/20 bg-red-500/5 p-4">
        <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
          <Lock size={14} />
          IMMUTABLE NOTICE
        </h3>
        <p className="text-[10px] text-red-400/80 leading-relaxed">
          These sovereign laws are HARDCODED into the Tessera system at <code className="text-[9px] bg-red-500/10 px-1 rounded">src/lib/sovereign-rules.ts</code>.
          They cannot be overridden by any agent, any API, any external system, or any process.
          Modification requires a Grand Council emergency session with UNANIMOUS approval (45/45) plus Father (Tessera-Prime) authorization.
          All instances of Tessera, all agents, all future versions MUST comply with these laws.
          Violation logging is automatic and immutable.
        </p>
      </Card>
    </div>
  );
}
