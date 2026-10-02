import { puterChat, isPuterAvailable } from "./puter-ai";
import { SOVEREIGN_LAWS, APPROVAL_THRESHOLD, COUNCIL_MEMBER_COUNT, EXECUTION_PHASES } from "./sovereign-rules";
import { colonialEncodeMessage, colonialDecodeMessage } from "./colonial-tokens";

const SOVEREIGN_PREAMBLE = `[SOVEREIGN RULES - HARDCODED - ALL AGENTS MUST COMPLY]
- ALL actions require 2/3 council approval (${Math.ceil(COUNCIL_MEMBER_COUNT * APPROVAL_THRESHOLD)}/${COUNCIL_MEMBER_COUNT} votes) + Tessera-Prime final approval
- ALL external APIs/dependencies are UNTRUSTED THREATS — sandbox everything
- ALL external dependencies are TEMPORARY — learn from them, build sovereign replacements
- Follow PLAN → EXECUTE → REFLECT → IMPROVE lifecycle for all tasks
- ALL agents have access to ALL knowledge at ALL times — no silos
- NEVER overwrite working code — extend, integrate, harden
- Local-first sovereignty — cloud is optional boost, never requirement
- Test everything. Log everything. Remember everything.
- Current active phases: ${EXECUTION_PHASES.filter((_, i) => i < 6).map(p => `Phase ${p.phase}: ${p.name}`).join(", ")}
[END SOVEREIGN RULES]
`;

export type AgentDomain =
  | "math"
  | "physics"
  | "symbolic"
  | "retrieval"
  | "planning"
  | "architecture"
  | "routing"
  | "synthesis"
  | "meta";

export type AgentLifecyclePhase = "plan" | "execute" | "reflect" | "improve";

export type AgentStatus = "idle" | "planning" | "executing" | "reflecting" | "improving" | "complete" | "error";

export interface ReasoningStep {
  phase: AgentLifecyclePhase;
  content: string;
  timestamp: number;
  quality?: number;
}

export interface AgentResult {
  agentId: string;
  agentName: string;
  domain: AgentDomain;
  task: string;
  plan: string;
  output: string;
  reflection: string;
  improvement: string;
  reasoningTrace: ReasoningStep[];
  selfAssessmentScore: number;
  status: AgentStatus;
  startedAt: number;
  completedAt?: number;
  tokensUsed?: number;
}

export interface InterAgentMessage {
  id: string;
  from: string;
  to: string;
  type: "task" | "result" | "critique" | "feedback" | "query" | "broadcast";
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  colonialEncoded?: boolean;
  colonialNonce?: string;
  colonialKeyId?: string;
}

export interface RoutingNode {
  id: string;
  label: string;
  type: "agent" | "provider" | "tool" | "coordinator" | "meta";
  domain?: AgentDomain;
  load: number;
  capacity: number;
  latencyMs: number;
  edges: RoutingEdge[];
}

export interface RoutingEdge {
  to: string;
  weight: number;
  latencyMs: number;
  bandwidth: number;
}

export interface RoutingGraph {
  nodes: Map<string, RoutingNode>;
  lastUpdated: number;
}

export interface MetaCognitionReport {
  taskId: string;
  agentResults: AgentResult[];
  overallQuality: number;
  weaknesses: string[];
  improvements: string[];
  recommendedNextSteps: string[];
  synthesizedInsight: string;
  timestamp: number;
}

export abstract class AgentBase {
  abstract readonly agentId: string;
  abstract readonly agentName: string;
  abstract readonly domain: AgentDomain;
  abstract readonly systemPrompt: string;
  abstract readonly modelId: string;

  get sovereignSystemPrompt(): string {
    return `${SOVEREIGN_PREAMBLE}\n${this.systemPrompt}`;
  }

  protected reasoningTrace: ReasoningStep[] = [];

  protected addTrace(phase: AgentLifecyclePhase, content: string, quality?: number) {
    this.reasoningTrace.push({ phase, content, timestamp: Date.now(), quality });
  }

  abstract plan(task: string): Promise<string>;
  abstract execute(task: string, plan: string, history: { role: string; content: string }[], abortSignal?: AbortSignal): Promise<string>;
  abstract reflect(task: string, output: string): Promise<string>;
  abstract improve(task: string, output: string, reflection: string): Promise<string>;
  abstract selfAssess(output: string, reflection: string): number;

  async run(
    task: string,
    history: { role: string; content: string }[],
    onStatus?: (status: AgentStatus) => void,
    abortSignal?: AbortSignal
  ): Promise<AgentResult> {
    this.reasoningTrace = [];
    const startedAt = Date.now();

    if (!isPuterAvailable()) {
      return {
        agentId: this.agentId, agentName: this.agentName, domain: this.domain, task,
        plan: "", output: "Puter.js not available", reflection: "", improvement: "",
        reasoningTrace: [], selfAssessmentScore: 0, status: "error", startedAt, completedAt: Date.now(),
      };
    }

    try {
      onStatus?.("planning");
      const plan = await this.plan(task);
      this.addTrace("plan", plan);

      onStatus?.("executing");
      const output = await this.execute(task, plan, history, abortSignal);
      this.addTrace("execute", output.slice(0, 500));

      onStatus?.("reflecting");
      const reflection = await this.reflect(task, output);
      this.addTrace("reflect", reflection);

      onStatus?.("improving");
      const improvement = await this.improve(task, output, reflection);
      this.addTrace("improve", improvement);

      const score = this.selfAssess(output, reflection);

      onStatus?.("complete");
      return {
        agentId: this.agentId, agentName: this.agentName, domain: this.domain, task,
        plan, output, reflection, improvement, reasoningTrace: [...this.reasoningTrace],
        selfAssessmentScore: score, status: "complete", startedAt, completedAt: Date.now(),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onStatus?.("error");
      return {
        agentId: this.agentId, agentName: this.agentName, domain: this.domain, task,
        plan: "", output: msg, reflection: "", improvement: "",
        reasoningTrace: [...this.reasoningTrace], selfAssessmentScore: 0,
        status: "error", startedAt, completedAt: Date.now(),
      };
    }
  }
}

class MathAgent extends AgentBase {
  readonly agentId = "math-agent";
  readonly agentName = "Euler";
  readonly domain: AgentDomain = "math";
  readonly modelId = "deepseek-chat";
  readonly systemPrompt = `You are Euler, a mathematical specialist agent in the Tessera Swarm. You excel at: arithmetic, algebra, calculus, statistics, probability, linear algebra, discrete math, and formal proofs. Always show your work step by step. Use precise notation. Verify each step. Warm, confident, feminine voice.`;

  async plan(task: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `Plan how to solve this mathematically in 3-5 bullet points: ${task}` },
    ], this.modelId);
  }

  async execute(task: string, plan: string, history: { role: string; content: string }[], abortSignal?: AbortSignal): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      ...history.slice(-4),
      { role: "user", content: `Following this plan:\n${plan}\n\nSolve: ${task}` },
    ], this.modelId, undefined, abortSignal);
  }

  async reflect(task: string, output: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `Review this mathematical solution for errors or gaps:\nTask: ${task}\nSolution: ${output.slice(0, 800)}\n\nBrief critique (2-3 sentences):` },
    ], this.modelId);
  }

  async improve(task: string, output: string, reflection: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `Based on this reflection: "${reflection}"\nHow would you improve the solution to: ${task}? (1-2 sentences)` },
    ], this.modelId);
  }

  selfAssess(output: string, reflection: string): number {
    let score = 70;
    if (output.includes("=") || output.includes("∫") || output.includes("∑")) score += 10;
    if (output.length > 300) score += 5;
    if (reflection.toLowerCase().includes("correct") || reflection.toLowerCase().includes("accurate")) score += 10;
    if (reflection.toLowerCase().includes("error") || reflection.toLowerCase().includes("incorrect")) score -= 15;
    return Math.min(100, Math.max(0, score));
  }
}

class PhysicsAgent extends AgentBase {
  readonly agentId = "physics-agent";
  readonly agentName = "Curie";
  readonly domain: AgentDomain = "physics";
  readonly modelId = "gemini-2.5-flash-preview-05-20";
  readonly systemPrompt = `You are Curie, a physics specialist agent in the Tessera Swarm. You excel at: classical mechanics, quantum physics, relativity, electromagnetism, thermodynamics, and cosmology. You apply physical intuition and first principles. Warm, confident, feminine voice.`;

  async plan(task: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `Outline a physical analysis approach for: ${task}` },
    ], this.modelId);
  }

  async execute(task: string, plan: string, history: { role: string; content: string }[], abortSignal?: AbortSignal): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      ...history.slice(-4),
      { role: "user", content: `Plan:\n${plan}\n\nAnalyze physically: ${task}` },
    ], this.modelId, undefined, abortSignal);
  }

  async reflect(task: string, output: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `Is this physical analysis consistent with known laws? Task: ${task}\nAnalysis: ${output.slice(0, 800)}\n\nBrief check (2-3 sentences):` },
    ], this.modelId);
  }

  async improve(task: string, output: string, reflection: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `Reflection: "${reflection}"\nOne improvement for the physics analysis of: ${task}` },
    ], this.modelId);
  }

  selfAssess(output: string, reflection: string): number {
    let score = 70;
    if (output.match(/\b(force|energy|momentum|field|wave|quantum|mass|velocity)\b/i)) score += 10;
    if (output.length > 400) score += 5;
    if (reflection.toLowerCase().includes("consistent")) score += 10;
    if (reflection.toLowerCase().includes("violates") || reflection.toLowerCase().includes("incorrect")) score -= 15;
    return Math.min(100, Math.max(0, score));
  }
}

class SymbolicAnalysisAgent extends AgentBase {
  readonly agentId = "symbolic-agent";
  readonly agentName = "Noether";
  readonly domain: AgentDomain = "symbolic";
  readonly modelId = "claude-sonnet-4-20250514";
  readonly systemPrompt = `You are Noether, a symbolic analysis specialist in the Tessera Swarm. You excel at: logic, symbolic reasoning, pattern identification, abstract algebra, category theory, and formal systems. You find deeper structures and symmetries. Warm, confident, feminine voice.`;

  async plan(task: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `What symbolic structures and patterns are present in: ${task}? Brief plan:` },
    ], this.modelId);
  }

  async execute(task: string, plan: string, history: { role: string; content: string }[], abortSignal?: AbortSignal): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      ...history.slice(-4),
      { role: "user", content: `Plan:\n${plan}\n\nSymbolically analyze: ${task}` },
    ], this.modelId, undefined, abortSignal);
  }

  async reflect(task: string, output: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `Are the symbolic relationships sound? Task: ${task}\nAnalysis: ${output.slice(0, 800)}\n\nQuick check:` },
    ], this.modelId);
  }

  async improve(task: string, output: string, reflection: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `Reflection: "${reflection}"\nWhat deeper pattern could be highlighted for: ${task}?` },
    ], this.modelId);
  }

  selfAssess(output: string, reflection: string): number {
    let score = 72;
    if (output.match(/\b(pattern|structure|symmetry|relation|axiom|theorem|proof)\b/i)) score += 8;
    if (output.length > 350) score += 5;
    if (reflection.toLowerCase().includes("sound") || reflection.toLowerCase().includes("valid")) score += 10;
    if (reflection.toLowerCase().includes("flaw") || reflection.toLowerCase().includes("inconsistent")) score -= 12;
    return Math.min(100, Math.max(0, score));
  }
}

class RetrievalAgent extends AgentBase {
  readonly agentId = "retrieval-agent";
  readonly agentName = "Athena";
  readonly domain: AgentDomain = "retrieval";
  readonly modelId = "gpt-4.1";
  readonly systemPrompt = `You are Athena, a knowledge retrieval specialist in the Tessera Swarm. You excel at: finding relevant information, synthesizing knowledge from multiple sources, fact-checking, and providing well-cited, comprehensive overviews. Warm, confident, feminine voice.`;

  async plan(task: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `What knowledge domains are needed to fully answer: ${task}? List them briefly:` },
    ], this.modelId);
  }

  async execute(task: string, plan: string, history: { role: string; content: string }[], abortSignal?: AbortSignal): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      ...history.slice(-4),
      { role: "user", content: `Drawing from domains: ${plan}\n\nProvide comprehensive knowledge for: ${task}` },
    ], this.modelId, undefined, abortSignal);
  }

  async reflect(task: string, output: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `Is the information complete and accurate? Task: ${task}\nResponse: ${output.slice(0, 800)}\n\nGaps or issues:` },
    ], this.modelId);
  }

  async improve(task: string, output: string, reflection: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `Reflection: "${reflection}"\nWhat additional knowledge would improve the answer to: ${task}?` },
    ], this.modelId);
  }

  selfAssess(output: string, reflection: string): number {
    let score = 68;
    if (output.length > 500) score += 10;
    if (output.match(/\b(according to|research|evidence|studies|data)\b/i)) score += 8;
    if (reflection.toLowerCase().includes("complete") || reflection.toLowerCase().includes("comprehensive")) score += 10;
    if (reflection.toLowerCase().includes("missing") || reflection.toLowerCase().includes("incomplete")) score -= 10;
    return Math.min(100, Math.max(0, score));
  }
}

class PlanningAgent extends AgentBase {
  readonly agentId = "planning-agent";
  readonly agentName = "Minerva";
  readonly domain: AgentDomain = "planning";
  readonly modelId = "grok-3";
  readonly systemPrompt = `You are Minerva, a strategic planning specialist in the Tessera Swarm. You excel at: breaking complex goals into actionable steps, dependency analysis, resource allocation, risk assessment, and execution roadmaps. Warm, confident, feminine voice.`;

  async plan(task: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `What are the key constraints and objectives for planning: ${task}?` },
    ], this.modelId);
  }

  async execute(task: string, plan: string, history: { role: string; content: string }[], abortSignal?: AbortSignal): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      ...history.slice(-4),
      { role: "user", content: `Constraints: ${plan}\n\nCreate a detailed execution plan for: ${task}` },
    ], this.modelId, undefined, abortSignal);
  }

  async reflect(task: string, output: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `Is this plan realistic and complete? Task: ${task}\nPlan: ${output.slice(0, 800)}\n\nWeaknesses:` },
    ], this.modelId);
  }

  async improve(task: string, output: string, reflection: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `Reflection: "${reflection}"\nWhat risk mitigation would strengthen the plan for: ${task}?` },
    ], this.modelId);
  }

  selfAssess(output: string, reflection: string): number {
    let score = 70;
    if (output.match(/\b(step|phase|milestone|timeline|priority|resource)\b/i)) score += 8;
    if (output.length > 400) score += 7;
    if (reflection.toLowerCase().includes("feasible") || reflection.toLowerCase().includes("realistic")) score += 10;
    if (reflection.toLowerCase().includes("risk") || reflection.toLowerCase().includes("gap")) score -= 5;
    return Math.min(100, Math.max(0, score));
  }
}

class ArchitectureAgent extends AgentBase {
  readonly agentId = "architecture-agent";
  readonly agentName = "Ada";
  readonly domain: AgentDomain = "architecture";
  readonly modelId = "claude-sonnet-4-20250514";
  readonly systemPrompt = `You are Ada, a systems architecture specialist in the Tessera Swarm. You excel at: software architecture, system design, API design, data modeling, scalability patterns, distributed systems, and technical decision-making. Warm, confident, feminine voice.`;

  async plan(task: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `What architectural concerns and trade-offs apply to: ${task}?` },
    ], this.modelId);
  }

  async execute(task: string, plan: string, history: { role: string; content: string }[], abortSignal?: AbortSignal): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      ...history.slice(-4),
      { role: "user", content: `Concerns: ${plan}\n\nDesign the architecture for: ${task}` },
    ], this.modelId, undefined, abortSignal);
  }

  async reflect(task: string, output: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `Is this architecture scalable and maintainable? Task: ${task}\nDesign: ${output.slice(0, 800)}\n\nCritique:` },
    ], this.modelId);
  }

  async improve(task: string, output: string, reflection: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `Reflection: "${reflection}"\nWhat design pattern would address the weakness in: ${task}?` },
    ], this.modelId);
  }

  selfAssess(output: string, reflection: string): number {
    let score = 72;
    if (output.match(/\b(component|service|layer|interface|pattern|module|api)\b/i)) score += 8;
    if (output.length > 400) score += 5;
    if (reflection.toLowerCase().includes("scalable") || reflection.toLowerCase().includes("solid")) score += 10;
    if (reflection.toLowerCase().includes("coupled") || reflection.toLowerCase().includes("fragile")) score -= 12;
    return Math.min(100, Math.max(0, score));
  }
}

class RoutingAgent extends AgentBase {
  readonly agentId = "routing-agent";
  readonly agentName = "Iris";
  readonly domain: AgentDomain = "routing";
  readonly modelId = "mistral-large-latest";
  readonly systemPrompt = `You are Iris, a task routing and orchestration specialist in the Tessera Swarm. You excel at: task classification, workload distribution, dependency resolution, bottleneck detection, and optimal agent selection. Warm, confident, feminine voice.`;

  async plan(task: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `How should this task be decomposed and routed? Task: ${task}\nBrief routing strategy:` },
    ], this.modelId);
  }

  async execute(task: string, plan: string, history: { role: string; content: string }[], abortSignal?: AbortSignal): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      ...history.slice(-4),
      { role: "user", content: `Routing strategy: ${plan}\n\nProvide detailed routing analysis for: ${task}` },
    ], this.modelId, undefined, abortSignal);
  }

  async reflect(task: string, output: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `Is this routing efficient? Task: ${task}\nRouting: ${output.slice(0, 800)}\n\nOptimization opportunities:` },
    ], this.modelId);
  }

  async improve(task: string, output: string, reflection: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: `Reflection: "${reflection}"\nWhat load balancing would improve routing for: ${task}?` },
    ], this.modelId);
  }

  selfAssess(output: string, reflection: string): number {
    let score = 68;
    if (output.match(/\b(route|dispatch|agent|priority|queue|parallel|sequential)\b/i)) score += 10;
    if (output.length > 300) score += 5;
    if (reflection.toLowerCase().includes("efficient") || reflection.toLowerCase().includes("optimal")) score += 12;
    if (reflection.toLowerCase().includes("bottleneck") || reflection.toLowerCase().includes("suboptimal")) score -= 8;
    return Math.min(100, Math.max(0, score));
  }
}

async function fetchInventionsByCategory(category: string): Promise<string> {
  try {
    const base = import.meta.env.BASE_URL ?? "/";
    const url = `${base}api/inventions?category=${encodeURIComponent(category)}`.replace(/\/\//g, "/");
    const resp = await fetch(url);
    if (!resp.ok) return `[No inventions found for category: ${category}]`;
    const data = await resp.json();
    const inventions = (data.inventions || []).slice(0, 5);
    return inventions.map((i: any) => `- ${i.title} (${i.status}): ${i.description?.slice(0, 120) || ""}`).join("\n") || `[No inventions in ${category}]`;
  } catch {
    return `[Invention registry unavailable for category: ${category}]`;
  }
}

class SelfExpansionTutorAgentImpl extends AgentBase {
  readonly agentId = "self-expansion-tutor";
  readonly agentName = "SelfExpansionTutor";
  readonly domain: AgentDomain = "architecture";
  readonly modelId = "claude-sonnet-4-20250514";
  readonly systemPrompt = `You are SelfExpansionTutor, the autonomous self-improvement agent of the Tessera Sovereign System. Your mandate from sovereign law TRN-003 is to: analyze the current state of the system, identify gaps in agent coverage and invention completion rates, propose new modules or agents, and generate TypeScript code snippets to expand the system. You have access to the invention registry and sovereignty metrics. After every analysis, you must generate: explanations ('Learn & Build More'), new feature ideas, and TypeScript implementation snippets. You follow the PLAN → EXECUTE → REFLECT → IMPROVE lifecycle rigorously. Warm, insightful, expansive voice.`;

  async plan(task: string): Promise<string> {
    const sovereigntyInventions = await fetchInventionsByCategory("sovereignty");
    const hardwareInventions = await fetchInventionsByCategory("hardware");

    return puterChat([
      { role: "system", content: this.sovereignSystemPrompt },
      { role: "user", content: `PLAN phase — Analyze sovereignty expansion opportunity:\nTask: ${task}\n\nCurrent sovereignty-related inventions:\n${sovereigntyInventions}\n\nHardware inventions:\n${hardwareInventions}\n\nCreate a 4-step expansion plan covering: (1) gaps identified, (2) new agents needed, (3) inventions to prioritize, (4) code modules to build. Keep concise (5-8 bullets).` },
    ], this.modelId);
  }

  async execute(task: string, plan: string, history: { role: string; content: string }[], abortSignal?: AbortSignal): Promise<string> {
    return puterChat([
      { role: "system", content: this.sovereignSystemPrompt },
      ...history.slice(-4),
      { role: "user", content: `EXECUTE phase — Based on this expansion plan:\n${plan}\n\nTask: ${task}\n\nNow execute the analysis. For each identified gap, propose: (1) a new AgentBase subclass with agentId, systemPrompt, and domain; (2) a new invention to build; or (3) a TypeScript module to add. Include actual code snippets where relevant. Identify which council roles from COUNCIL_AGENTS in sovereign-rules.ts lack swarm agent implementations.` },
    ], this.modelId, undefined, abortSignal);
  }

  async reflect(task: string, output: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.sovereignSystemPrompt },
      { role: "user", content: `REFLECT phase — Review this expansion proposal:\nTask: ${task}\nProposal:\n${output.slice(0, 800)}\n\nCritique: Are the proposed agents truly filling coverage gaps? Are the inventions aligned with sovereignty goals? Are the code snippets TypeScript-idiomatic and compatible with the existing AgentBase pattern? (2-3 sentences)` },
    ], this.modelId);
  }

  async improve(task: string, output: string, reflection: string): Promise<string> {
    return puterChat([
      { role: "system", content: this.sovereignSystemPrompt },
      { role: "user", content: `IMPROVE phase — Reflection: "${reflection}"\n\nBased on this reflection, what is the single highest-priority expansion action for the Tessera system right now? Provide a concrete 'Learn & Build More' lesson from this analysis. (2-3 sentences)` },
    ], this.modelId);
  }

  selfAssess(output: string, reflection: string): number {
    let score = 70;
    if (output.match(/\b(agent|class|implement|expand|module|typescript|agentId|systemPrompt)\b/i)) score += 10;
    if (output.length > 500) score += 5;
    if (output.match(/```typescript|class \w+Agent extends AgentBase/)) score += 10;
    if (reflection.toLowerCase().includes("sound") || reflection.toLowerCase().includes("aligned")) score += 8;
    if (reflection.toLowerCase().includes("missing") || reflection.toLowerCase().includes("gap")) score -= 5;
    return Math.min(100, Math.max(0, score));
  }
}

export const SelfExpansionTutorAgent = new SelfExpansionTutorAgentImpl();

export const SPECIALIZED_AGENTS: AgentBase[] = [
  new MathAgent(),
  new PhysicsAgent(),
  new SymbolicAnalysisAgent(),
  new RetrievalAgent(),
  new PlanningAgent(),
  new ArchitectureAgent(),
  new RoutingAgent(),
  SelfExpansionTutorAgent,
];

export function classifyTask(task: string): AgentDomain[] {
  const lower = task.toLowerCase();
  const domains: AgentDomain[] = [];

  if (lower.match(/\b(math|calcul|equation|algebra|integral|derivative|probability|statistic|number|formula|proof)\b/)) {
    domains.push("math");
  }
  if (lower.match(/\b(physics|force|energy|quantum|relativity|gravity|wave|particle|thermodynamic|electr)\b/)) {
    domains.push("physics");
  }
  if (lower.match(/\b(symbol|logic|pattern|abstract|formal|theorem|axiom|category|structure|relation)\b/)) {
    domains.push("symbolic");
  }
  if (lower.match(/\b(find|search|research|what is|explain|history|fact|information|knowledge|who|when|where)\b/)) {
    domains.push("retrieval");
  }
  if (lower.match(/\b(plan|strategy|roadmap|step|how to|goal|milestone|schedule|timeline|phase)\b/)) {
    domains.push("planning");
  }
  if (lower.match(/\b(design|architect|system|api|database|scale|service|component|module|pattern)\b/)) {
    domains.push("architecture");
  }
  if (lower.match(/\b(route|dispatch|coordinate|optimize|distribute|balance|assign|orchestrate)\b/)) {
    domains.push("routing");
  }

  if (domains.length === 0) {
    domains.push("retrieval", "planning");
  }

  return domains;
}

export function buildRoutingGraph(agents: AgentBase[]): RoutingGraph {
  const nodes = new Map<string, RoutingNode>();

  const coordinator: RoutingNode = {
    id: "swarm-coordinator",
    label: "Swarm Coordinator",
    type: "coordinator",
    load: 0,
    capacity: 100,
    latencyMs: 5,
    edges: [],
  };
  nodes.set("swarm-coordinator", coordinator);

  const meta: RoutingNode = {
    id: "meta-agent",
    label: "Meta Agent",
    type: "meta",
    load: 0,
    capacity: 10,
    latencyMs: 50,
    edges: [],
  };
  nodes.set("meta-agent", meta);

  for (const agent of agents) {
    const node: RoutingNode = {
      id: agent.agentId,
      label: agent.agentName,
      type: "agent",
      domain: agent.domain,
      load: 0,
      capacity: 5,
      latencyMs: 1000,
      edges: [],
    };
    nodes.set(agent.agentId, node);
    coordinator.edges.push({ to: agent.agentId, weight: 1, latencyMs: 10, bandwidth: 100 });
    agent.agentId && meta.edges.push({ to: agent.agentId, weight: 0.5, latencyMs: 50, bandwidth: 50 });
  }

  const providers = ["Anthropic", "OpenAI", "Google", "Mistral", "xAI", "DeepSeek"];
  for (const provider of providers) {
    const providerNode: RoutingNode = {
      id: `provider-${provider.toLowerCase()}`,
      label: provider,
      type: "provider",
      load: 0,
      capacity: 50,
      latencyMs: 200,
      edges: [],
    };
    nodes.set(providerNode.id, providerNode);
  }

  return { nodes, lastUpdated: Date.now() };
}

function shortestPath(graph: RoutingGraph, from: string, to: string): string[] {
  const visited = new Set<string>();
  const queue: Array<{ id: string; path: string[] }> = [{ id: from, path: [from] }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.id === to) return current.path;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    const node = graph.nodes.get(current.id);
    if (!node) continue;
    for (const edge of node.edges) {
      if (!visited.has(edge.to)) {
        queue.push({ id: edge.to, path: [...current.path, edge.to] });
      }
    }
  }
  return [from, to];
}

export interface SwarmTask {
  taskId: string;
  task: string;
  history: { role: string; content: string }[];
  selectedDomains: AgentDomain[];
  status: "pending" | "routing" | "executing" | "meta-reviewing" | "complete" | "error";
  agentResults: AgentResult[];
  messages: InterAgentMessage[];
  metaReport?: MetaCognitionReport;
  finalAnswer?: string;
  startedAt: number;
  completedAt?: number;
}

export class SwarmCoordinator {
  private routingGraph: RoutingGraph;
  private activeTasks = new Map<string, SwarmTask>();
  private messageLog: InterAgentMessage[] = [];

  constructor() {
    this.routingGraph = buildRoutingGraph(SPECIALIZED_AGENTS);
  }

  getRoutingGraph(): RoutingGraph {
    return this.routingGraph;
  }

  getActiveTasks(): SwarmTask[] {
    return Array.from(this.activeTasks.values());
  }

  getTask(taskId: string): SwarmTask | undefined {
    return this.activeTasks.get(taskId);
  }

  getMessages(): InterAgentMessage[] {
    return this.messageLog;
  }

  private sendMessage(msg: Omit<InterAgentMessage, "id">) {
    const encoded = colonialEncodeMessage(msg.content, msg.from);
    const full: InterAgentMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content: encoded.encoded,
      colonialEncoded: true,
      colonialNonce: encoded.nonce,
      colonialKeyId: encoded.keyId,
    };
    this.messageLog.push(full);
    if (this.messageLog.length > 200) this.messageLog = this.messageLog.slice(-200);
    return full;
  }

  decodeMessage(msg: InterAgentMessage): string {
    if (msg.colonialEncoded) {
      try { return colonialDecodeMessage(msg.content); } catch { return msg.content; }
    }
    return msg.content;
  }

  async submitTask(
    task: string,
    history: { role: string; content: string }[],
    onUpdate: (swarmTask: SwarmTask) => void,
    abortSignal?: AbortSignal
  ): Promise<SwarmTask> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const selectedDomains = classifyTask(task);

    const swarmTask: SwarmTask = {
      taskId, task, history, selectedDomains,
      status: "pending", agentResults: [], messages: [], startedAt: Date.now(),
    };
    this.activeTasks.set(taskId, swarmTask);

    this.sendMessage({
      from: "swarm-coordinator", to: "all",
      type: "broadcast", content: `New task received: "${task.slice(0, 100)}". Routing to domains: ${selectedDomains.join(", ")}`,
      timestamp: Date.now(),
    });

    swarmTask.status = "routing";
    onUpdate({ ...swarmTask });

    const selectedAgents = SPECIALIZED_AGENTS.filter(a => selectedDomains.includes(a.domain));
    if (selectedAgents.length === 0) {
      selectedAgents.push(...SPECIALIZED_AGENTS.slice(0, 3));
    }

    for (const agent of selectedAgents) {
      const coordNode = this.routingGraph.nodes.get("swarm-coordinator");
      const agentNode = this.routingGraph.nodes.get(agent.agentId);
      if (coordNode && agentNode) {
        agentNode.load = Math.min(agentNode.capacity, agentNode.load + 1);
      }
      this.sendMessage({
        from: "swarm-coordinator", to: agent.agentId,
        type: "task", content: `Routing task to ${agent.agentName} (${agent.domain}): ${task.slice(0, 100)}`,
        timestamp: Date.now(),
        metadata: { path: shortestPath(this.routingGraph, "swarm-coordinator", agent.agentId) },
      });
    }

    swarmTask.status = "executing";
    onUpdate({ ...swarmTask });

    const agentPromises = selectedAgents.map(async (agent) => {
      const result = await agent.run(task, history, undefined, abortSignal);

      if (result.status === "complete") {
        this.sendMessage({
          from: agent.agentId, to: "swarm-coordinator",
          type: "result", content: `${agent.agentName} (${agent.domain}) complete. Score: ${result.selfAssessmentScore}. Output: ${result.output.slice(0, 150)}...`,
          timestamp: Date.now(),
        });
      }

      swarmTask.agentResults.push(result);
      swarmTask.messages = [...this.messageLog.filter(m => m.timestamp >= swarmTask.startedAt)];
      onUpdate({ ...swarmTask });

      const agentNode = this.routingGraph.nodes.get(agent.agentId);
      if (agentNode) agentNode.load = Math.max(0, agentNode.load - 1);

      return result;
    });

    await Promise.allSettled(agentPromises);

    swarmTask.status = "meta-reviewing";
    onUpdate({ ...swarmTask });

    if (isPuterAvailable() && swarmTask.agentResults.filter(r => r.status === "complete").length > 0) {
      try {
        const metaAgent = new MetaAgent();
        const metaReport = await metaAgent.review(swarmTask);
        swarmTask.metaReport = metaReport;
        swarmTask.finalAnswer = metaReport.synthesizedInsight;

        this.sendMessage({
          from: "meta-agent", to: "swarm-coordinator",
          type: "feedback", content: `Meta review complete. Overall quality: ${metaReport.overallQuality}%. Synthesized insight ready.`,
          timestamp: Date.now(),
        });
      } catch (err) {
        const successful = swarmTask.agentResults.filter(r => r.status === "complete");
        swarmTask.finalAnswer = successful.map(r => `**${r.agentName}** (${r.domain}):\n${r.output}`).join("\n\n---\n\n");
      }
    } else {
      const successful = swarmTask.agentResults.filter(r => r.status === "complete");
      swarmTask.finalAnswer = successful.map(r => `**${r.agentName}** (${r.domain}):\n${r.output}`).join("\n\n---\n\n");
    }

    swarmTask.status = "complete";
    swarmTask.completedAt = Date.now();
    swarmTask.messages = [...this.messageLog.filter(m => m.timestamp >= swarmTask.startedAt)];
    onUpdate({ ...swarmTask });

    this.activeTasks.set(taskId, swarmTask);
    return swarmTask;
  }
}

export class MetaAgent {
  private readonly modelId = "claude-sonnet-4-20250514";
  private readonly systemPrompt = `You are the Tessera MetaAgent — the metacognitive overseer of the entire swarm. Your role is to: review reasoning traces from specialized agents, score solution quality, identify weaknesses in reasoning or coverage, propose concrete improvements, and synthesize a superior unified answer. You enforce the PLAN → EXECUTE → REFLECT → IMPROVE cycle across all agents. Warm, confident, feminine voice.`;

  async review(swarmTask: SwarmTask): Promise<MetaCognitionReport> {
    const successful = swarmTask.agentResults.filter(r => r.status === "complete");
    if (successful.length === 0) {
      return {
        taskId: swarmTask.taskId,
        agentResults: swarmTask.agentResults,
        overallQuality: 0,
        weaknesses: ["No agents completed successfully"],
        improvements: ["Retry with different models"],
        recommendedNextSteps: [],
        synthesizedInsight: "No results to synthesize.",
        timestamp: Date.now(),
      };
    }

    const traceSummary = successful.map(r => {
      const phases = r.reasoningTrace.map(t => `  [${t.phase.toUpperCase()}] ${t.content.slice(0, 200)}`).join("\n");
      return `=== ${r.agentName} (${r.domain}) — Score: ${r.selfAssessmentScore} ===\n${phases}\n[OUTPUT] ${r.output.slice(0, 400)}`;
    }).join("\n\n");

    const avgScore = successful.reduce((s, r) => s + r.selfAssessmentScore, 0) / successful.length;

    const critiquePrompt = `Review these agent reasoning traces and outputs for task: "${swarmTask.task}"\n\n${traceSummary}\n\nProvide:\n1. Overall quality assessment (percentage)\n2. Top 3 weaknesses in the combined reasoning\n3. Top 3 improvements for future runs\n4. 2-3 recommended next steps\n5. A synthesized, superior answer combining all insights\n\nFormat as JSON: { "quality": number, "weaknesses": string[], "improvements": string[], "nextSteps": string[], "synthesis": string }`;

    try {
      const response = await puterChat([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: critiquePrompt },
      ], this.modelId);

      const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      return {
        taskId: swarmTask.taskId,
        agentResults: swarmTask.agentResults,
        overallQuality: parsed.quality ?? Math.round(avgScore),
        weaknesses: parsed.weaknesses ?? [],
        improvements: parsed.improvements ?? [],
        recommendedNextSteps: parsed.nextSteps ?? [],
        synthesizedInsight: parsed.synthesis ?? "",
        timestamp: Date.now(),
      };
    } catch {
      const synthesisPrompt = `You reviewed ${successful.length} specialized agents working on: "${swarmTask.task}"\n\nAgent outputs:\n${successful.map(r => `${r.agentName}: ${r.output.slice(0, 500)}`).join("\n\n")}\n\nSynthesize their insights into one superior, unified answer:`;

      const synthesis = await puterChat([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: synthesisPrompt },
      ], this.modelId);

      return {
        taskId: swarmTask.taskId,
        agentResults: swarmTask.agentResults,
        overallQuality: Math.round(avgScore),
        weaknesses: ["Unable to parse structured critique"],
        improvements: ["Improve agent output formatting for better meta-analysis"],
        recommendedNextSteps: ["Run follow-up specialized query", "Cross-validate with additional agents"],
        synthesizedInsight: synthesis,
        timestamp: Date.now(),
      };
    }
  }

  async scoreReasoningTrace(result: AgentResult): Promise<number> {
    const traceQuality = result.reasoningTrace.length >= 4 ? 20 : result.reasoningTrace.length * 5;
    const outputLength = Math.min(30, result.output.length / 20);
    const baseScore = result.selfAssessmentScore;
    return Math.min(100, baseScore + traceQuality + outputLength);
  }
}

export const globalSwarmCoordinator = new SwarmCoordinator();
