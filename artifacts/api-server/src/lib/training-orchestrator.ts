import { logger } from "./logger";
import { db } from "@workspace/db";
import { improvementCyclesTable } from "@workspace/db/schema";
import { storeMemory, logDecision, searchMemory } from "./vector-memory";
import { runEvalSuite, type EvalSuite } from "./eval-runner";
import { solveProblem, type SolvedProblem } from "./problem-solver";
import { runDependencyScan } from "./dependency-scanner";

export interface TrainingProblem {
  id: string;
  title: string;
  content: string;
  domain: "math" | "physics" | "code-boundary" | "general";
  knownAnswer?: string;
  difficulty: number;
  tags: string[];
}

export interface AgentScore {
  agentId: string;
  agentName: string;
  correct: number;
  total: number;
  accuracy: number;
  avgConfidence: number;
}

export interface TrainingCycleResult {
  cycleNumber: number;
  problemsAttempted: number;
  problemsSolved: SolvedProblem[];
  agentScores: AgentScore[];
  evalSuite: EvalSuite | null;
  gapAreas: string[];
  knowledgeReinforced: string[];
  cycleScore: number;
  durationMs: number;
  completedAt: Date;
  report: string;
}

export interface TrainingStatus {
  isRunning: boolean;
  currentCycle: number;
  totalCycles: number;
  cycleResults: TrainingCycleResult[];
  overallProgress: number;
  startedAt?: Date;
  completedAt?: Date;
}

const TRAINING_PROBLEMS: TrainingProblem[][] = [
  [
    { id: "t1-1", title: "Sum of multiples of 3 or 5 below 1000", content: "Find the sum of all natural numbers below 1000 that are multiples of 3 or 5.", domain: "math", knownAnswer: "233168", difficulty: 1, tags: ["math", "arithmetic"] },
    { id: "t1-2", title: "Count primes below 100", content: "How many prime numbers are there below 100?", domain: "math", knownAnswer: "25", difficulty: 1, tags: ["math", "primes"] },
    { id: "t1-3", title: "Newton's second law", content: "A 5kg object accelerates at 3 m/s². What is the net force?", domain: "physics", knownAnswer: "15 Newtons", difficulty: 1, tags: ["physics", "mechanics"] },
    { id: "t1-4", title: "Binary search complexity", content: "What is the time complexity of binary search on a sorted array of n elements?", domain: "code-boundary", knownAnswer: "O(log n)", difficulty: 1, tags: ["algorithms", "complexity"] },
    { id: "t1-5", title: "Fibonacci 10th term", content: "What is the 10th Fibonacci number (starting with F(1)=1, F(2)=1)?", domain: "math", knownAnswer: "55", difficulty: 1, tags: ["math", "sequences"] },
  ],
  [
    { id: "t2-1", title: "Euler's identity", content: "Describe Euler's identity e^(iπ) + 1 = 0 and why it's considered beautiful", domain: "math", difficulty: 2, tags: ["math", "complex-numbers"] },
    { id: "t2-2", title: "Heisenberg uncertainty principle", content: "State the Heisenberg uncertainty principle and explain its physical meaning", domain: "physics", knownAnswer: "Δx·Δp ≥ ħ/2", difficulty: 2, tags: ["physics", "quantum"] },
    { id: "t2-3", title: "Merge sort algorithm", content: "Describe the merge sort algorithm and analyze its time and space complexity", domain: "code-boundary", knownAnswer: "O(n log n) time, O(n) space", difficulty: 2, tags: ["algorithms", "sorting"] },
    { id: "t2-4", title: "Pythagorean theorem proof", content: "Provide a proof of the Pythagorean theorem: a² + b² = c²", domain: "math", difficulty: 2, tags: ["math", "geometry"] },
    { id: "t2-5", title: "Conservation of energy", content: "A 2kg ball falls 5 meters. What is its velocity just before hitting the ground? (g=9.8 m/s²)", domain: "physics", knownAnswer: "~9.9 m/s", difficulty: 2, tags: ["physics", "energy"] },
  ],
  [
    { id: "t3-1", title: "Goldbach conjecture status", content: "Explain the Goldbach conjecture and its current proof status", domain: "math", difficulty: 3, tags: ["math", "number-theory", "open-problem"] },
    { id: "t3-2", title: "P vs NP overview", content: "Explain the P vs NP problem and why it matters for cryptography", domain: "code-boundary", difficulty: 3, tags: ["complexity-theory", "open-problem"] },
    { id: "t3-3", title: "Quantum superposition", content: "Explain quantum superposition and the measurement problem", domain: "physics", difficulty: 3, tags: ["physics", "quantum"] },
    { id: "t3-4", title: "Lattice-based cryptography", content: "Explain how lattice-based cryptography works and why it's quantum-resistant", domain: "code-boundary", difficulty: 3, tags: ["cryptography", "quantum-resistant"] },
    { id: "t3-5", title: "Riemann Hypothesis overview", content: "State the Riemann Hypothesis, its implications for prime distribution, and current verification status", domain: "math", difficulty: 3, tags: ["math", "open-problem"] },
  ],
  [
    { id: "t4-1", title: "Navier-Stokes turbulence", content: "Why does turbulence in fluids remain an open problem in physics and mathematics?", domain: "physics", difficulty: 4, tags: ["physics", "fluid-dynamics", "open-problem"] },
    { id: "t4-2", title: "Graph isomorphism complexity", content: "What is graph isomorphism, and what is its computational complexity class?", domain: "code-boundary", difficulty: 4, tags: ["algorithms", "graph-theory", "open-problem"] },
    { id: "t4-3", title: "Yang-Mills mass gap", content: "Explain the Yang-Mills mass gap problem and its significance for particle physics", domain: "physics", difficulty: 4, tags: ["physics", "quantum-field-theory", "open-problem"] },
    { id: "t4-4", title: "Transcendental numbers", content: "Explain transcendental numbers and prove that π is not algebraic (overview)", domain: "math", difficulty: 4, tags: ["math", "analysis"] },
    { id: "t4-5", title: "Quantum error correction", content: "Explain quantum error correction and the threshold theorem for fault-tolerant quantum computing", domain: "physics", difficulty: 4, tags: ["quantum-computing", "error-correction"] },
  ],
  [
    { id: "t5-1", title: "ABC conjecture", content: "State the ABC conjecture and explain Mochizuki's claimed proof and its controversy", domain: "math", difficulty: 5, tags: ["math", "number-theory", "open-problem"] },
    { id: "t5-2", title: "Halting problem reduction", content: "Prove that the halting problem is undecidable using diagonalization", domain: "code-boundary", difficulty: 5, tags: ["computability", "theory"] },
    { id: "t5-3", title: "Dark energy problem", content: "What is the cosmological constant problem and why is dark energy mysterious?", domain: "physics", difficulty: 5, tags: ["physics", "cosmology", "open-problem"] },
    { id: "t5-4", title: "Kolmogorov complexity", content: "Define Kolmogorov complexity and explain why it's incomputable", domain: "code-boundary", difficulty: 5, tags: ["information-theory", "computability"] },
    { id: "t5-5", title: "Arithmetic geometry connection", content: "Explain the connection between the Langlands program and the proof of Fermat's Last Theorem", domain: "math", difficulty: 5, tags: ["math", "algebraic-geometry"] },
  ],
  [
    { id: "t6-1", title: "Quantum gravity unification", content: "Why is unifying quantum mechanics with general relativity so difficult?", domain: "physics", difficulty: 6, tags: ["physics", "quantum-gravity", "open-problem"] },
    { id: "t6-2", title: "Polynomial hierarchy", content: "Explain the polynomial hierarchy PH and what it would mean if PH collapses", domain: "code-boundary", difficulty: 6, tags: ["complexity-theory"] },
    { id: "t6-3", title: "Birch Swinnerton-Dyer", content: "State the BSD conjecture and explain its connection to elliptic curves over rationals", domain: "math", difficulty: 6, tags: ["math", "number-theory", "open-problem"] },
    { id: "t6-4", title: "Protein folding simulation", content: "Why is protein folding computationally hard and what did AlphaFold2 solve?", domain: "code-boundary", difficulty: 6, tags: ["computational-biology", "algorithms"] },
    { id: "t6-5", title: "Szemerédi regularity lemma", content: "State Szemerédi's regularity lemma and give an application in combinatorics", domain: "math", difficulty: 6, tags: ["math", "combinatorics"] },
  ],
  [
    { id: "t7-1", title: "Complexity of factoring", content: "Explain why integer factorization is believed to be hard and its relation to quantum algorithms", domain: "code-boundary", difficulty: 7, tags: ["cryptography", "quantum", "complexity"] },
    { id: "t7-2", title: "Holographic principle", content: "Explain the holographic principle and its implications for black hole information paradox", domain: "physics", difficulty: 7, tags: ["physics", "quantum-gravity"] },
    { id: "t7-3", title: "Weil conjectures", content: "State the Weil conjectures and describe how Deligne proved the last one", domain: "math", difficulty: 7, tags: ["math", "algebraic-geometry"] },
    { id: "t7-4", title: "Randomized complexity classes", content: "Explain BPP, RP, coRP and their relationship to P and NP under derandomization", domain: "code-boundary", difficulty: 7, tags: ["complexity-theory", "randomization"] },
    { id: "t7-5", title: "String landscape problem", content: "Explain the string theory landscape problem and the anthropic principle controversy", domain: "physics", difficulty: 7, tags: ["physics", "string-theory"] },
  ],
  [
    { id: "t8-1", title: "Approximate counting", content: "Explain the FPRAS for counting perfect matchings in bipartite graphs", domain: "code-boundary", difficulty: 8, tags: ["algorithms", "counting", "approximation"] },
    { id: "t8-2", title: "Hodge conjecture geometry", content: "Explain the geometric intuition behind the Hodge conjecture", domain: "math", difficulty: 8, tags: ["math", "algebraic-geometry", "open-problem"] },
    { id: "t8-3", title: "Conformal field theory", content: "Explain conformal field theory and its role in string theory and condensed matter", domain: "physics", difficulty: 8, tags: ["physics", "quantum-field-theory"] },
    { id: "t8-4", title: "Arithmetic of L-functions", content: "Explain the Bloch-Kato conjecture and its relation to the BSD conjecture", domain: "math", difficulty: 8, tags: ["math", "number-theory"] },
    { id: "t8-5", title: "Quantum PCP theorem", content: "State the quantum PCP conjecture and why it's harder than the classical case", domain: "code-boundary", difficulty: 8, tags: ["complexity-theory", "quantum"] },
  ],
  [
    { id: "t9-1", title: "Geometric Langlands", content: "Explain the geometric Langlands program and its connection to quantum field theory", domain: "math", difficulty: 9, tags: ["math", "representation-theory"] },
    { id: "t9-2", title: "ER=EPR conjecture", content: "Explain the ER=EPR conjecture and what it suggests about spacetime and entanglement", domain: "physics", difficulty: 9, tags: ["physics", "quantum-gravity"] },
    { id: "t9-3", title: "Circuit complexity lower bounds", content: "Explain why proving super-linear circuit complexity lower bounds is so difficult", domain: "code-boundary", difficulty: 9, tags: ["complexity-theory"] },
    { id: "t9-4", title: "p-adic L-functions", content: "Explain p-adic L-functions and their role in Iwasawa theory", domain: "math", difficulty: 9, tags: ["math", "number-theory"] },
    { id: "t9-5", title: "Quantum supremacy definition", content: "Define quantum supremacy rigorously and evaluate Google's 2019 claim", domain: "code-boundary", difficulty: 9, tags: ["quantum-computing", "complexity"] },
  ],
  [
    { id: "t10-1", title: "Monstrous Moonshine", content: "Explain the monstrous moonshine theorem and its connection to string theory", domain: "math", difficulty: 10, tags: ["math", "group-theory", "string-theory"] },
    { id: "t10-2", title: "Swampland conjectures", content: "Explain the swampland conjectures and their implications for string landscape", domain: "physics", difficulty: 10, tags: ["physics", "string-theory"] },
    { id: "t10-3", title: "Derandomization of BPP", content: "Explain the connection between BPP=P and the existence of pseudorandom generators", domain: "code-boundary", difficulty: 10, tags: ["complexity-theory", "randomization"] },
    { id: "t10-4", title: "Fontaine-Mazur conjecture", content: "State the Fontaine-Mazur conjecture and its role in p-adic Hodge theory", domain: "math", difficulty: 10, tags: ["math", "arithmetic-geometry"] },
    { id: "t10-5", title: "Emergent spacetime", content: "Explain how spacetime might emerge from entanglement entropy in holographic theories", domain: "physics", difficulty: 10, tags: ["physics", "quantum-gravity", "emergent-spacetime"] },
  ],
];

const trainingState: TrainingStatus = {
  isRunning: false,
  currentCycle: 0,
  totalCycles: 10,
  cycleResults: [],
  overallProgress: 0,
};

function scoreAttempts(problem: TrainingProblem, solved: SolvedProblem): { correct: boolean; agentScores: Array<{ agentId: string; agentName: string; correct: boolean; confidence: number }> } {
  const knownAnswer = problem.knownAnswer?.toLowerCase() || "";

  const agentScores = solved.attempts.map(attempt => {
    let correct = false;
    if (knownAnswer) {
      const answerLower = attempt.answer.toLowerCase();
      correct = answerLower.includes(knownAnswer) || knownAnswer.includes(answerLower.slice(0, 20));
    } else {
      correct = attempt.confidence >= 0.6;
    }
    return {
      agentId: attempt.agentId,
      agentName: attempt.agentName,
      correct,
      confidence: attempt.confidence,
    };
  });

  const overallCorrect = agentScores.some(s => s.correct) || (solved.deliberation.winningSolution?.confidence ?? 0) >= 0.7;
  return { correct: overallCorrect, agentScores };
}

function identifyGaps(agentScoreMap: Map<string, AgentScore>, problems: TrainingProblem[], solvedProblems: SolvedProblem[]): string[] {
  const gaps: string[] = [];
  const domainAccuracy: Record<string, { correct: number; total: number }> = {};

  for (const p of problems) {
    if (!domainAccuracy[p.domain]) domainAccuracy[p.domain] = { correct: 0, total: 0 };
    domainAccuracy[p.domain].total++;
  }

  for (let i = 0; i < problems.length && i < solvedProblems.length; i++) {
    const problem = problems[i];
    const solved = solvedProblems[i];
    const confidence = solved.deliberation.winningSolution?.confidence ?? 0;
    const consensusReached = solved.deliberation.consensusReached;
    if ((confidence >= 0.6 || consensusReached) && domainAccuracy[problem.domain]) {
      domainAccuracy[problem.domain].correct++;
    }
  }

  for (const [_, score] of agentScoreMap) {
    if (score.accuracy < 0.5) {
      gaps.push(`Agent ${score.agentName} performing below 50% (${(score.accuracy * 100).toFixed(0)}%)`);
    }
    if (score.avgConfidence < 0.5) {
      gaps.push(`Agent ${score.agentName} low confidence (${(score.avgConfidence * 100).toFixed(0)}%)`);
    }
  }

  for (const [domain, acc] of Object.entries(domainAccuracy)) {
    if (acc.total > 0 && acc.correct / acc.total < 0.6) {
      gaps.push(`Domain ${domain}: low accuracy (${(acc.correct / acc.total * 100).toFixed(0)}%)`);
    }
  }

  return gaps;
}

async function reinforceKnowledge(gaps: string[], cycleNumber: number): Promise<string[]> {
  const reinforced: string[] = [];

  for (const gap of gaps.slice(0, 3)) {
    try {
      const domain = gap.includes("math") ? "mathematics" : gap.includes("physics") ? "physics" : gap.includes("code") ? "algorithms" : "general reasoning";
      const content = `Knowledge reinforcement (cycle ${cycleNumber}): Addressing gap: ${gap}. Reinforcing core ${domain} principles: systematic problem decomposition, formal verification, cross-domain synthesis, and application of known theorems.`;

      await storeMemory({
        content,
        source: "training-orchestrator",
        category: "knowledge-reinforcement",
        metadata: { cycleNumber, gap, domain },
      });
      reinforced.push(gap);
    } catch {}
  }

  return reinforced;
}

export async function runTrainingOrchestrator(totalCycles = 10): Promise<TrainingStatus> {
  if (trainingState.isRunning) {
    return trainingState;
  }

  trainingState.isRunning = true;
  trainingState.currentCycle = 0;
  trainingState.totalCycles = totalCycles;
  trainingState.cycleResults = [];
  trainingState.startedAt = new Date();

  logger.info({ totalCycles }, "TrainingOrchestrator: starting training run");

  try {
    await runDependencyScan();
  } catch {}

  for (let cycle = 1; cycle <= totalCycles; cycle++) {
    const cycleStart = Date.now();
    trainingState.currentCycle = cycle;
    trainingState.overallProgress = (cycle - 1) / totalCycles;

    const problemSet = TRAINING_PROBLEMS[Math.min(cycle - 1, TRAINING_PROBLEMS.length - 1)];
    const solvedInCycle: SolvedProblem[] = [];
    const agentScoreMap = new Map<string, AgentScore>();

    logger.info({ cycle, problems: problemSet.length }, `TrainingOrchestrator: running cycle ${cycle}/${totalCycles}`);

    for (const problem of problemSet) {
      try {
        const solved = await solveProblem({
          title: problem.title,
          content: problem.content,
          source: "training-orchestrator",
          tags: problem.tags,
        });
        solvedInCycle.push(solved);

        const { agentScores } = scoreAttempts(problem, solved);
        for (const as_ of agentScores) {
          const existing = agentScoreMap.get(as_.agentId) || {
            agentId: as_.agentId, agentName: as_.agentName,
            correct: 0, total: 0, accuracy: 0, avgConfidence: 0,
          };
          existing.total++;
          if (as_.correct) existing.correct++;
          existing.avgConfidence = (existing.avgConfidence * (existing.total - 1) + as_.confidence) / existing.total;
          existing.accuracy = existing.correct / existing.total;
          agentScoreMap.set(as_.agentId, existing);
        }
      } catch (err) {
        logger.warn({ err, problem: problem.id }, "Problem solving failed in training cycle");
      }
    }

    let evalSuite: EvalSuite | null = null;
    try {
      evalSuite = await runEvalSuite();
    } catch (err) {
      logger.warn({ err }, "Eval suite failed during training cycle");
    }

    const gapAreas = identifyGaps(agentScoreMap, problemSet, solvedInCycle);
    const knowledgeReinforced = await reinforceKnowledge(gapAreas, cycle);

    const agentScores = Array.from(agentScoreMap.values());
    const avgAccuracy = agentScores.length > 0
      ? agentScores.reduce((s, a) => s + a.accuracy, 0) / agentScores.length
      : 0;

    const cycleScore = Math.round(
      avgAccuracy * 50 +
      (evalSuite ? evalSuite.percentile * 0.3 : 0) +
      (gapAreas.length === 0 ? 20 : Math.max(0, 20 - gapAreas.length * 4))
    );

    const cycleDurationMs = Date.now() - cycleStart;

    const report = [
      `=== TRAINING CYCLE ${cycle}/${totalCycles} REPORT ===`,
      `Duration: ${(cycleDurationMs / 1000).toFixed(1)}s`,
      `Problems Attempted: ${problemSet.length} | Solved: ${solvedInCycle.length}`,
      `Agent Performance:`,
      ...agentScores.map(s => `  ${s.agentName}: ${(s.accuracy * 100).toFixed(0)}% accuracy, ${(s.avgConfidence * 100).toFixed(0)}% avg confidence`),
      `Eval Suite Score: ${evalSuite ? evalSuite.percentile + "%" : "N/A"}`,
      `Gap Areas Identified: ${gapAreas.length}`,
      ...gapAreas.map(g => `  - ${g}`),
      `Knowledge Reinforced: ${knowledgeReinforced.length} areas`,
      `Cycle Score: ${cycleScore}/100`,
    ].join("\n");

    const cycleResult: TrainingCycleResult = {
      cycleNumber: cycle,
      problemsAttempted: problemSet.length,
      problemsSolved: solvedInCycle,
      agentScores,
      evalSuite,
      gapAreas,
      knowledgeReinforced,
      cycleScore,
      durationMs: cycleDurationMs,
      completedAt: new Date(),
      report,
    };

    trainingState.cycleResults.push(cycleResult);

    try {
      await db.insert(improvementCyclesTable).values({
        cycleId: `training-cycle-${cycle}-${Date.now()}`,
        phase: "training",
        observations: solvedInCycle.map(s => ({ problemId: s.id, domain: s.domain, confidence: s.deliberation.winningSolution?.confidence ?? 0 })),
        weakAreasIdentified: gapAreas,
        proposedImprovements: gapAreas.map(g => ({ area: g, action: "reinforce" })),
        implementedImprovements: knowledgeReinforced,
        sovereigntyScoreBefore: evalSuite?.percentile ?? 0,
        sovereigntyScoreAfter: cycleScore,
        evaluationRunId: evalSuite?.runId ?? null,
        status: "complete",
        cycleNumber: cycle,
      });
    } catch (err) {
      logger.warn({ err }, "Failed to persist training cycle to DB");
    }

    try {
      await logDecision({
        action: `training.cycle.${cycle}.complete`,
        category: "training",
        rationale: `Training cycle ${cycle} completed. Score: ${cycleScore}/100. Gaps: ${gapAreas.length}. Reinforced: ${knowledgeReinforced.length} areas.`,
        context: { cycle, cycleScore, gapCount: gapAreas.length, solvedCount: solvedInCycle.length },
        outcome: `cycle_score:${cycleScore}`,
        significance: "medium",
        source: "training-orchestrator",
      });
    } catch {}

    logger.info({ cycle, cycleScore, gaps: gapAreas.length }, `TrainingOrchestrator: cycle ${cycle} complete`);
  }

  trainingState.isRunning = false;
  trainingState.overallProgress = 1;
  trainingState.completedAt = new Date();

  logger.info({ cycles: totalCycles }, "TrainingOrchestrator: all training cycles complete");

  return trainingState;
}

export function getTrainingStatus(): TrainingStatus {
  return { ...trainingState, cycleResults: trainingState.cycleResults };
}

export async function runSelfAudit(): Promise<{ questions: number; passed: number; gapsFound: string[]; fixActions: string[]; score: number }> {
  const AUDIT_QUESTIONS = [
    { q: "What is 2+2?", domain: "math" as const, expected: "4", keywords: ["4", "four"] },
    { q: "What is the speed of light in vacuum?", domain: "physics" as const, expected: "3×10^8 m/s", keywords: ["299", "3×10", "light"] },
    { q: "What is O(n log n) complexity?", domain: "code-boundary" as const, expected: "efficient sorting", keywords: ["sort", "merge", "heap", "log"] },
    { q: "What is a prime number?", domain: "math" as const, expected: "divisible only by 1 and itself", keywords: ["divisible", "factor", "1", "prime"] },
    { q: "What is Newton's first law?", domain: "physics" as const, expected: "inertia", keywords: ["inertia", "rest", "motion", "force"] },
    { q: "What is the Pythagorean theorem?", domain: "math" as const, expected: "a²+b²=c²", keywords: ["a²", "c²", "hypotenuse", "triangle"] },
    { q: "What is Big O notation?", domain: "code-boundary" as const, expected: "algorithm complexity", keywords: ["complexity", "growth", "algorithm", "time"] },
    { q: "Explain quantum superposition", domain: "physics" as const, expected: "multiple states simultaneously", keywords: ["state", "quantum", "probability", "wave"] },
    { q: "What is the halting problem?", domain: "code-boundary" as const, expected: "undecidable", keywords: ["undecidable", "halt", "turing"] },
    { q: "What is an eigenvalue?", domain: "math" as const, expected: "matrix transformation scalar", keywords: ["matrix", "scalar", "vector", "transform"] },
  ];

  let passed = 0;
  const gapsFound: string[] = [];
  const fixActions: string[] = [];

  for (const aq of AUDIT_QUESTIONS) {
    try {
      const solved = await solveProblem({
        title: `Self-Audit: ${aq.q}`,
        content: aq.q,
        source: "self-audit",
        tags: [aq.domain, "self-audit"],
      });

      const answerLower = solved.finalAnswer.toLowerCase();
      const keywordsMatched = aq.keywords.filter(kw => answerLower.includes(kw.toLowerCase()));
      const hasConsensus = solved.deliberation.consensusReached;
      const highConfidence = (solved.deliberation.winningSolution?.confidence ?? 0) >= 0.6;

      if ((keywordsMatched.length >= Math.ceil(aq.keywords.length / 2)) || (hasConsensus && highConfidence)) {
        passed++;
      } else {
        gapsFound.push(`Gap in ${aq.domain}: "${aq.q}" — answer confidence: ${((solved.deliberation.winningSolution?.confidence ?? 0) * 100).toFixed(0)}%, keywords: ${keywordsMatched.length}/${aq.keywords.length}`);
        fixActions.push(`Reinforce ${aq.domain} knowledge: "${aq.q}" → expected answer: ${aq.expected}`);

        await storeMemory({
          content: `Q: ${aq.q}\nA: ${aq.expected}\nDomain: ${aq.domain}\nKeywords: ${aq.keywords.join(", ")}`,
          source: "self-audit",
          category: "audit-reinforcement",
          metadata: { domain: aq.domain, question: aq.q, expected: aq.expected },
        });
      }
    } catch {
      gapsFound.push(`Error auditing: "${aq.q}"`);
    }
  }

  const score = Math.round((passed / AUDIT_QUESTIONS.length) * 100);

  await logDecision({
    action: "self-audit.complete",
    category: "evaluation",
    rationale: `Self-audit completed via solver pipeline. ${passed}/${AUDIT_QUESTIONS.length} questions passed. Score: ${score}%. Gaps: ${gapsFound.length}`,
    context: { score, passed, total: AUDIT_QUESTIONS.length, gapsCount: gapsFound.length },
    outcome: `score:${score}`,
    significance: "high",
    source: "training-orchestrator",
  });

  return { questions: AUDIT_QUESTIONS.length, passed, gapsFound, fixActions, score };
}
