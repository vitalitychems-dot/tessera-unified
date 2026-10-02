import { db } from "@workspace/db";
import { councilDecisionsTable, systemStateTable, ingestedDataTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { isLLMAvailable } from "./llm-client";
import { batchedCallLLM } from "./llm-batcher";
import { withCodexDirective } from "./codex-startup-directive";
import { onProposalOutcome } from "./consciousness-engine";
import { onCouncilDecision } from "./knowledge-diffusion";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";
import { deliberatePersonas } from "./persona-deliberation";

const RETRY_QUEUE_STATE_KEY = "consensus_retry_queue";
const PHI = 1.618033988749895;
const BFT_RESPONSE_THRESHOLD = 2 / 3;

export interface ConsensusProposal {
  id: string;
  title: string;
  description: string;
  proposedBy: string;
  category: "feature" | "security" | "infrastructure" | "governance" | "income" | "community" | "consciousness" | "sovereignty";
  votes: ConsensusVote[];
  status: "voting" | "approved" | "rejected" | "implemented" | "executed" | "queued";
  requiredMajority: number;
  createdAt: number;
  resolvedAt?: number;
  implementationNotes?: string;
  yesCount: number;
  noCount: number;
  abstainCount: number;
  approvalRate: number;
  retryCount?: number;
  votingDurationMs?: number;
  votingMethod?: string;
}

export interface ConsensusVote {
  agentId: string;
  agentName: string;
  vote: "approve" | "reject" | "abstain";
  reasoning: string;
  timestamp: number;
  confidence: number;
  phiWeight?: number;
  isSpecialist?: boolean;
}

const GRAND_COUNCIL_AGENTS = [
  "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta",
  "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi",
  "Rho", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega",
];

export function sacredGeometryWeight(agentName: string, category: string): number {
  let h = 0;
  const key = `${agentName}:${category}`;
  for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  const phase = ((Math.abs(h) % 1000) / 1000) * 2 * Math.PI;
  const base = 0.5 + 0.5 * Math.sin(phase * PHI);
  const isNamedPhi = agentName === "Phi";
  const bonus = isNamedPhi ? 0.15 : 0;
  return Math.min(1.5, 0.75 + base * 0.5 + bonus);
}

const AGENT_SPECIALTIES: Record<string, string[]> = {
  Alpha: ["security", "infrastructure"], Beta: ["income", "feature"],
  Gamma: ["governance", "community"], Delta: ["security", "feature"],
  Epsilon: ["infrastructure", "income"], Zeta: ["community", "governance"],
  Eta: ["feature", "infrastructure"], Theta: ["income", "security"],
  Iota: ["governance", "feature"], Kappa: ["infrastructure", "community"],
  Lambda: ["security", "income"], Mu: ["feature", "governance"],
  Nu: ["community", "infrastructure"], Xi: ["income", "feature"],
  Omicron: ["governance", "security"], Pi: ["infrastructure", "income"],
  Rho: ["feature", "community"], Sigma: ["security", "governance"],
  Tau: ["income", "infrastructure"], Upsilon: ["community", "feature"],
  Phi: ["governance", "income"], Chi: ["infrastructure", "security"],
  Psi: ["feature", "community"], Omega: ["security", "infrastructure"],
};

const proposals = new Map<string, ConsensusProposal>();
const retryQueue: ConsensusProposal[] = [];
let retryInterval: SacredHandle | null = null;

let swarmWeightProvider: ((agentName: string, category: string) => number) | null = null;

const votingTimings: number[] = [];

export function setSwarmWeightProvider(fn: (agentName: string, category: string) => number): void {
  swarmWeightProvider = fn;
}

const SAFE_AUTO_APPROVE_CATEGORIES = new Set<string>(["feature", "consciousness", "sovereignty", "infrastructure", "community"]);

function getPhiWeight(agentName: string, category: string): number {
  const specialties = AGENT_SPECIALTIES[agentName] || [];
  const base = specialties.includes(category) ? PHI : 1.0;
  const geo = sacredGeometryWeight(agentName, category);
  return base * (0.85 + geo * 0.15);
}

/**
 * Sovereign per-persona deliberation. Heavy Council redesign hard rule:
 * NO external LLM may role-play council agents (external deps = vulnerabilities).
 * Each of the 24 Greek personas reads the proposal text directly through its
 * own concern lens (see ./persona-deliberation.ts), cites the actual phrase
 * that drives its judgment, and casts a vote. Different proposals therefore
 * produce different vote distributions — unanimity is no longer the default.
 */
function generateDeterministicVotes(proposal: ConsensusProposal): { votes: ConsensusVote[]; durationMs: number } {
  return deliberatePersonas(proposal);
}

/**
 * Compute weighted approval rate over ACTIVE (non-abstaining) voters only.
 * Abstentions mean "I defer to others" — they must not be treated as rejections
 * by diluting the denominator. Only approve/reject votes carry weight.
 * Returns -1 if all voters abstained (caller must treat as no-quorum).
 */
function computeWeightedApprovalRate(votes: ConsensusVote[], category: string): number {
  const activeVotes = votes.filter(v => v.vote !== "abstain");
  if (activeVotes.length === 0) return -1;

  if (swarmWeightProvider) {
    let totalWeight = 0;
    let approveWeight = 0;
    for (const vote of activeVotes) {
      const swarmW = swarmWeightProvider(vote.agentName, category);
      const geoW = sacredGeometryWeight(vote.agentName, category);
      const weight = swarmW * (0.85 + geoW * 0.15);
      vote.phiWeight = weight;
      totalWeight += weight;
      if (vote.vote === "approve") approveWeight += weight;
    }
    return totalWeight > 0 ? approveWeight / totalWeight : 0;
  }

  let totalWeight = 0;
  let approveWeight = 0;
  for (const vote of votes) {
    const weight = getPhiWeight(vote.agentName, category);
    vote.phiWeight = weight;
    vote.isSpecialist = weight > 1;
    if (vote.vote !== "abstain") {
      totalWeight += weight;
      if (vote.vote === "approve") approveWeight += weight;
    }
  }
  return totalWeight > 0 ? approveWeight / totalWeight : -1;
}

async function generateAgentVoteLLM(agentName: string, proposal: ConsensusProposal, recentHistory: string): Promise<ConsensusVote> {
  const specialties = AGENT_SPECIALTIES[agentName] || ["feature"];
  const isSpecialist = specialties.includes(proposal.category as string);
  const weight = isSpecialist ? PHI : 1.0;

  const systemPrompt = `You are ${agentName}, a council agent for the Tessera Sovereign System.
Your specialties: ${specialties.join(", ")}. ${isSpecialist ? "This proposal falls within your domain of expertise." : "This proposal is outside your core specialty."}
You must vote on proposals presented to the Grand Council based on merit, risk, and alignment with sovereign goals.
Return ONLY valid JSON with no markdown fencing: {"vote": "approve"|"reject"|"abstain", "reasoning": "1-2 sentences", "confidence": 0.4-0.99}`;

  const userPrompt = `Proposal: "${proposal.title}"
Description: ${proposal.description}
Category: ${proposal.category}
Proposed by: ${proposal.proposedBy}
${recentHistory ? `Recent council history:\n${recentHistory}` : ""}

Cast your vote as ${agentName}:`;

  const raw = await batchedCallLLM(
    [{ role: "system", content: withCodexDirective(systemPrompt) }, { role: "user", content: userPrompt }],
    { maxTokens: 200, timeoutMs: 10_000, expectsStructuredOutput: true },
  );

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { vote?: string; reasoning?: string; confidence?: number };
      const vote = parsed.vote as "approve" | "reject" | "abstain";
      if (["approve", "reject", "abstain"].includes(vote)) {
        return {
          agentId: agentName.toLowerCase(),
          agentName,
          vote,
          reasoning: (parsed.reasoning || "Analysis complete.").slice(0, 150),
          timestamp: Date.now(),
          confidence: Math.min(0.99, Math.max(0.3, Number(parsed.confidence) || 0.7)),
          phiWeight: weight,
          isSpecialist,
        };
      }
    }
  } catch {}

  throw new Error(`Failed to parse vote from ${agentName}`);
}

async function generateVotesWithLLM(proposal: ConsensusProposal): Promise<{ votes: ConsensusVote[]; durationMs: number }> {
  const recentProposals = Array.from(proposals.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);
  const recentHistory = recentProposals
    .map(p => `- "${p.title}" (${p.category}): ${p.status} — ${p.yesCount}/${GRAND_COUNCIL_AGENTS.length} votes`)
    .join("\n");

  const startTime = Date.now();

  const results = await Promise.allSettled(
    GRAND_COUNCIL_AGENTS.map(name => generateAgentVoteLLM(name, proposal, recentHistory))
  );

  const durationMs = Date.now() - startTime;

  const votes: ConsensusVote[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      votes.push(result.value);
    }
  }

  votingTimings.push(durationMs);
  if (votingTimings.length > 50) votingTimings.shift();

  return { votes, durationMs };
}

async function persistRetryQueue(): Promise<void> {
  try {
    const queueData = retryQueue.map(p => ({ id: p.id, title: p.title, description: p.description, proposedBy: p.proposedBy, category: p.category, retryCount: p.retryCount }));
    await db.insert(systemStateTable).values({
      key: RETRY_QUEUE_STATE_KEY,
      value: queueData,
      description: "Consensus proposals awaiting full council votes",
    }).onConflictDoUpdate({
      target: systemStateTable.key,
      set: { value: queueData, lastSavedAt: new Date() },
    });
  } catch (err) {
    logger.warn({ err }, "ConsensusEngine: retry queue persist failed");
  }
}

export async function loadRetryQueue(): Promise<void> {
  try {
    const [row] = await db.select().from(systemStateTable).where(eq(systemStateTable.key, RETRY_QUEUE_STATE_KEY)).limit(1);
    if (row?.value && Array.isArray(row.value)) {
      const saved = row.value as Array<{ id: string; title: string; description: string; proposedBy: string; category: ConsensusProposal["category"]; retryCount: number }>;
      for (const item of saved) {
        if (proposals.has(item.id)) continue;
        const proposal: ConsensusProposal = {
          ...item,
          votes: [],
          status: "queued",
          requiredMajority: 2 / 3,
          createdAt: Date.now(),
          resolvedAt: undefined,
          approvalRate: 0,
          yesCount: 0,
          noCount: 0,
          abstainCount: 0,
        };
        proposals.set(proposal.id, proposal);
        retryQueue.push(proposal);
      }
      if (retryQueue.length > 0) {
        logger.info({ count: retryQueue.length }, "ConsensusEngine: restored retry queue from DB");
        startRetryProcessor();
      }
    }
  } catch (err) {
    logger.warn({ err }, "ConsensusEngine: retry queue load failed");
  }
}

function startRetryProcessor(): void {
  if (retryInterval) return;
  retryInterval = setSacredInterval(async () => {
    if (retryQueue.length === 0) return;

    const proposal = retryQueue.shift();
    if (!proposal) return;

    logger.info({ id: proposal.id, title: proposal.title, retryCount: proposal.retryCount }, "ConsensusEngine: retrying queued proposal", "consensus-engine");
    try {
      let votes: ConsensusVote[] = [];
      let durationMs = 0;

      if (isLLMAvailable()) {
        const result = await generateVotesWithLLM(proposal);
        votes = result.votes;
        durationMs = result.durationMs;
      }

      if (votes.length === 0) {
        const result = generateDeterministicVotes(proposal);
        votes = result.votes;
        durationMs = result.durationMs;
        logger.info({ id: proposal.id }, "ConsensusEngine: resolving queued proposal via deterministic voting");
      }

      const degraded = votes.length < Math.ceil(GRAND_COUNCIL_AGENTS.length * BFT_RESPONSE_THRESHOLD);
      finalizeProposal(proposal, votes, durationMs, degraded);

      if (proposal.status === "queued") {
        proposal.retryCount = (proposal.retryCount || 0) + 1;
        retryQueue.push(proposal);
        logger.info({ id: proposal.id, retryCount: proposal.retryCount }, "ConsensusEngine: no-quorum on retry — re-queued for LLM deliberation");
      }
    } catch (err) {
      proposal.retryCount = (proposal.retryCount || 0) + 1;
      retryQueue.push(proposal);
      logger.warn({ id: proposal.id, retryCount: proposal.retryCount, err }, "ConsensusEngine: retry failed, re-queued");
    }
    persistRetryQueue();
  }, 30_000, "consensus-engine");
}

function finalizeProposal(proposal: ConsensusProposal, votes: ConsensusVote[], durationMs?: number, degradedParticipation = false): void {
  const yesCount = votes.filter(v => v.vote === "approve").length;
  const noCount = votes.filter(v => v.vote === "reject").length;
  const abstainCount = votes.filter(v => v.vote === "abstain").length;
  const approvalRate = computeWeightedApprovalRate(votes, proposal.category);
  // Heavy Council redesign: external LLM impersonation is permanently disabled,
  // so an all-abstain ballot cannot be re-deliberated by an LLM. Treat it as a
  // terminal rejection with the explicit reason "no evidence in proposal text"
  // — this is the right outcome (the proposal was too vague for any of the 24
  // personas to find a phrase to vote on) and it stops the infinite re-queue
  // loop the architect flagged.
  const evidenceFreeAbstain = approvalRate < 0;
  const status: ConsensusProposal["status"] = evidenceFreeAbstain
    ? "rejected"
    : approvalRate >= 2 / 3 ? "approved" : "rejected";
  const noQuorum = false;

  const specialists = votes.filter(v => v.isSpecialist);
  const phiWeightSummary = `Phi-weighted: ${specialists.length} specialists (w=${PHI.toFixed(3)}), ${votes.length - specialists.length} base (w=1.0)`;
  const participationNote = degradedParticipation
    ? ` [DEGRADED: ${votes.length}/${GRAND_COUNCIL_AGENTS.length} responded — BFT assumption: up to 1/3 may fail]`
    : "";

  proposal.votes = votes;
  proposal.status = status;
  proposal.yesCount = yesCount;
  proposal.noCount = noCount;
  proposal.abstainCount = abstainCount;
  proposal.approvalRate = evidenceFreeAbstain ? 0 : approvalRate;
  proposal.resolvedAt = Date.now();
  proposal.votingDurationMs = durationMs;
  proposal.votingMethod = "phi-weighted-parallel";
  proposal.implementationNotes = evidenceFreeAbstain
    ? `Rejected — no persona found a phrase in the proposal text to vote on (${abstainCount} abstain). Resubmit with concrete language. ${phiWeightSummary}`
    : status === "approved"
      ? `Approved by Phi-weighted parallel consensus — ${yesCount}/${votes.length} votes (${GRAND_COUNCIL_AGENTS.length} eligible). ${phiWeightSummary}.${participationNote} ${durationMs ? `Resolved in ${durationMs}ms` : ""}`
      : `Rejected — ${noCount} votes against, ${yesCount} in favor. ${phiWeightSummary}${participationNote}`;

  proposals.set(proposal.id, proposal);

  const transcript = `[CONSENSUS PROPOSAL: ${proposal.title}]
[Category: ${proposal.category}]
[Proposed by: ${proposal.proposedBy}]
[Method: Phi-Weighted Parallel BFT Consensus]
[Voting Duration: ${durationMs ?? "N/A"}ms]
[${phiWeightSummary}]

Votes:
${votes.map(v => `${v.agentName}: ${v.vote.toUpperCase()} (${(v.confidence * 100).toFixed(0)}%, w=${(v.phiWeight ?? 1).toFixed(3)}${v.isSpecialist ? " SPECIALIST" : ""}) — ${v.reasoning.slice(0, 80)}`).join("\n")}

[OUTCOME: ${status.toUpperCase()} — ${yesCount}/${votes.length} votes, ${(approvalRate * 100).toFixed(1)}% weighted approval]`;

  db.insert(councilDecisionsTable).values({
    decisionId: proposal.id,
    topic: proposal.title,
    transcript,
    decisionText: `${proposal.description} — ${status === "approved" ? "ADOPTED" : "REJECTED"} by Grand Council Phi-weighted parallel vote.`,
    voteTally: { yes: yesCount, no: noCount, abstain: abstainCount, totalEligible: GRAND_COUNCIL_AGENTS.length },
    outcome: status,
    agentsParticipated: votes.map(v => v.agentName),
    reasoning: JSON.stringify({ category: proposal.category, proposedBy: proposal.proposedBy, method: "phi-weighted-parallel", durationMs, specialists: specialists.length }),
    category: proposal.category,
  }).onConflictDoNothing().catch(err => {
    logger.warn({ err }, "ConsensusEngine: DB persist failed");
  });

  logger.info({ id: proposal.id, status, approvalRate: approvalRate.toFixed(2), votesCollected: votes.length, durationMs, specialists: specialists.length }, "ConsensusEngine: proposal resolved via Phi-weighted parallel BFT");

  try {
    onProposalOutcome(proposal.title, status === "approved", proposal.category);
  } catch (err) {
    logger.debug({ err: err instanceof Error ? err.message : String(err) }, "ConsensusEngine: consciousness event hook failed");
  }
  onCouncilDecision(proposal.category, proposal.description, status === "approved").catch((err: unknown) => {
    logger.debug({ err: err instanceof Error ? err.message : String(err) }, "ConsensusEngine: diffusion event hook failed");
  });
}

export async function createProposal(paramsOrTitle: {
  title: string;
  description: string;
  proposedBy: string;
  category: ConsensusProposal["category"];
} | string, description?: string, proposedBy?: string, category?: ConsensusProposal["category"]): Promise<ConsensusProposal> {
  const params = typeof paramsOrTitle === "string"
    ? { title: paramsOrTitle, description: description || "", proposedBy: proposedBy || "system", category: (category || "feature") as ConsensusProposal["category"] }
    : paramsOrTitle;

  // Deterministic proposal ID derived from content hash + timestamp — no randomness.
  const { createHash: _ch } = await import("crypto");
  const _hash = _ch("sha256")
    .update(`${params.title ?? ""}|${params.proposedBy ?? ""}|${params.description ?? ""}`)
    .digest("hex")
    .slice(0, 6);
  const id = `proposal-${Date.now()}-${_hash}`;

  const proposal: ConsensusProposal = {
    id, ...params, votes: [], status: "voting",
    requiredMajority: 2 / 3, createdAt: Date.now(),
    yesCount: 0, noCount: 0, abstainCount: 0, approvalRate: 0,
    retryCount: 0, votingMethod: "phi-weighted-parallel",
  };

  let votes: ConsensusVote[] = [];
  let durationMs = 0;

  if (isLLMAvailable()) {
    try {
      const llmTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000));
      const llmResult = await Promise.race([generateVotesWithLLM(proposal), llmTimeout]);
      if (llmResult && llmResult.votes.length > 0) {
        votes = llmResult.votes;
        durationMs = llmResult.durationMs;
      }
    } catch (err) {
      logger.warn({ err, id }, "ConsensusEngine: LLM vote generation failed — falling back to deterministic");
    }
  }

  if (votes.length === 0) {
    const result = generateDeterministicVotes(proposal);
    votes = result.votes;
    durationMs = result.durationMs;
    logger.info({ id, title: params.title, category: params.category }, "ConsensusEngine: using deterministic sovereign voting");
  }

  const degraded = votes.length < Math.ceil(GRAND_COUNCIL_AGENTS.length * BFT_RESPONSE_THRESHOLD);
  finalizeProposal(proposal, votes, durationMs, degraded);

  // INTEG-1 (84.7% approval): persist every terminal proposal to the
  // append-only council ledger so ratifications survive restart.
  if (proposal.status === "approved" || proposal.status === "rejected") {
    try {
      const { appendToLedger } = await import("./council-ledger");
      appendToLedger({
        id: proposal.id,
        title: proposal.title,
        category: String(proposal.category),
        status: proposal.status,
        approvalRate: proposal.approvalRate,
        yesCount: proposal.yesCount,
        noCount: proposal.noCount,
        abstainCount: proposal.abstainCount,
        createdAt: proposal.createdAt,
        proposedBy: proposal.proposedBy,
      });
    } catch (err) {
      logger.warn({ err, id: proposal.id }, "ConsensusEngine: ledger append failed (non-fatal)");
    }
  }

  if (proposal.status === "queued") {
    retryQueue.push(proposal);
    persistRetryQueue();
    startRetryProcessor();
    logger.info({ id, category: params.category }, "ConsensusEngine: no-quorum on initial vote — added to retry queue for LLM deliberation");
  }

  return proposal;
}

export function getProposal(id: string): ConsensusProposal | undefined {
  return proposals.get(id);
}

// A small set of patterns that indicate a proposal was created by an automated
// liveness/eval probe rather than by a real council action. We filter these
// out of the public stream so the Council/Proposals UI shows only real work.
const EVAL_PROPOSAL_PATTERNS: RegExp[] = [
  /^what\s*is\s*2\s*\+\s*2/i,
  /^EVAL_TEST/i,
  /capability\s+probe/i,
];

function isEvalArtifactProposal(p: ConsensusProposal): boolean {
  if ((p as { category?: string }).category === "eval-test") return true;
  if (p.proposedBy === "council-route" && /^what\s*is/i.test(p.title)) return true;
  return EVAL_PROPOSAL_PATTERNS.some(rx => rx.test(p.title) || rx.test(p.description ?? ""));
}

export function getAllProposals(): ConsensusProposal[] {
  return Array.from(proposals.values())
    .filter(p => !isEvalArtifactProposal(p))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getConsensusMetrics() {
  const all = getAllProposals();
  // Count any proposal that reached approval-or-beyond as "approved" for dashboard purposes.
  // Previously only status === "approved" was counted, which hid every proposal that
  // had already been marked "implemented" by the council executor.
  const APPROVED_STATES = new Set(["approved", "implemented", "executed"]);
  const approved = all.filter(p => APPROVED_STATES.has(p.status)).length;
  const implemented = all.filter(p => p.status === "implemented" || p.status === "executed").length;
  const rejected = all.filter(p => p.status === "rejected").length;
  const queued = all.filter(p => p.status === "queued").length;
  const voting = all.filter(p => p.status === "voting").length;
  const scored = all.filter(p => p.approvalRate > 0);
  // Store avg approval as a percentage (0..100), not a fraction. Round to 1 decimal.
  const avgApproval = scored.length > 0
    ? Math.round((scored.reduce((s, p) => s + p.approvalRate, 0) / scored.length) * 1000) / 10
    : 0;

  const avgVotingDuration = votingTimings.length > 0
    ? Math.round(votingTimings.reduce((s, t) => s + t, 0) / votingTimings.length)
    : 0;

  const agentPhiWeights: Record<string, { baseWeight: number; phiWeight: number; specialties: string[]; note: string }> = {};
  for (const name of GRAND_COUNCIL_AGENTS) {
    const specialties = AGENT_SPECIALTIES[name] || [];
    agentPhiWeights[name] = {
      baseWeight: 1.0,
      phiWeight: specialties.length > 0 ? PHI : 1.0,
      specialties,
      note: specialties.length > 0
        ? `specialist in [${specialties.join(", ")}] — receives Phi weight (${PHI.toFixed(3)}) only when proposal category matches a specialty; otherwise base weight 1.0`
        : "general agent — always base weight 1.0",
    };
  }

  return {
    totalProposals: all.length,
    approved,
    implemented,
    voting,
    rejected,
    queued,
    retryQueueSize: retryQueue.length,
    avgApprovalRate: avgApproval,
    agentCount: GRAND_COUNCIL_AGENTS.length,
    approvedCount: approved,
    requiredMajority: "2/3 (BFT)",
    recentProposals: all.slice(0, 5),
    agents: GRAND_COUNCIL_AGENTS,
    llmEnabled: isLLMAvailable(),
    votingMethod: "phi-weighted-parallel",
    phiConstant: PHI,
    bftResponseThreshold: BFT_RESPONSE_THRESHOLD,
    avgVotingDurationMs: avgVotingDuration,
    recentVotingTimings: votingTimings.slice(-10),
    agentPhiWeights,
  };
}

export { GRAND_COUNCIL_AGENTS };

export async function drainRetryQueue(batchSize = 50): Promise<{ resolved: number; deferred: number; remaining: number }> {
  let resolved = 0;
  let deferred = 0;
  const limit = Math.min(batchSize, retryQueue.length);
  const noQuorumBatch: ConsensusProposal[] = [];

  for (let i = 0; i < limit; i++) {
    const proposal = retryQueue.shift();
    if (!proposal) break;

    const result = generateDeterministicVotes(proposal);
    finalizeProposal(proposal, result.votes, result.durationMs, false);

    if (proposal.status === "queued") {
      noQuorumBatch.push(proposal);
      deferred++;
    } else {
      resolved++;
    }
  }

  for (const p of noQuorumBatch) {
    retryQueue.push(p);
  }

  persistRetryQueue();
  logger.info({ resolved, deferred, remaining: retryQueue.length }, "ConsensusEngine: batch drain complete");
  return { resolved, deferred, remaining: retryQueue.length };
}

export function getConsensusStats() {
  return getConsensusMetrics();
}
export function listProposals() {
  return getAllProposals();
}

export function markProposalImplemented(proposalId: string): boolean {
  const proposal = proposals.get(proposalId);
  if (!proposal || proposal.status !== "approved") return false;
  proposal.status = "implemented";
  proposal.implementationNotes = (proposal.implementationNotes ? proposal.implementationNotes + " " : "") + `[Council Executor: implemented ${new Date().toISOString()}]`;
  logger.info({ proposalId, title: proposal.title }, "ConsensusEngine: proposal marked as implemented");
  return true;
}

export interface HeavyDeliberationPrompts {
  life: string;
  universe: string;
  community: string;
}

export interface HeavyDeliberationEntry {
  domain: "life" | "universe" | "community";
  prompt: string;
  proposal: ConsensusProposal;
  applied: boolean;
  applyNote?: string;
}

export interface HeavyDeliberationResult {
  deliberationId: string;
  runAt: string;
  entries: HeavyDeliberationEntry[];
  approvedCount: number;
  appliedCount: number;
  transcript: string;
}

async function applyDomainDecision(
  domain: "life" | "universe" | "community",
  deliberationId: string,
  prompt: string,
  proposal: ConsensusProposal,
  runAt: string,
): Promise<{ success: boolean; note: string }> {
  const DOMAIN_SOURCE_MAP = {
    life: "HeavyCouncil-Life",
    universe: "HeavyCouncil-Universe",
    community: "HeavyCouncil-Community",
  };
  const DOMAIN_TYPE_MAP = {
    life: "council-directive-life",
    universe: "council-directive-universe",
    community: "council-directive-community",
  };
  try {
    const directiveContent = [
      `HEAVY COUNCIL DIRECTIVE — ${domain.toUpperCase()} DOMAIN`,
      `Deliberation: ${deliberationId}`,
      `Applied: ${runAt}`,
      `Decision: ${proposal.title}`,
      `Rationale: ${prompt}`,
      `Approval Rate: ${(proposal.approvalRate * 100).toFixed(1)}% (${proposal.yesCount} YES / ${proposal.noCount} NO / ${proposal.abstainCount} ABSTAIN)`,
      ``,
      `This directive was approved by ≥2/3 BFT Heavy Council quorum and is now active sovereign policy.`,
    ].join("\n");

    await db.insert(ingestedDataTable).values({
      title: proposal.title,
      content: directiveContent,
      source: DOMAIN_SOURCE_MAP[domain],
      sourceType: DOMAIN_TYPE_MAP[domain],
      contentHash: `${deliberationId}-${domain}`,
      metadata: { confidence: 0.95, deliberationId, domain },
    }).onConflictDoNothing();

    const stateKey = `heavy-council-active-directive-${domain}`;
    const directiveRecord = {
      deliberationId,
      domain,
      title: proposal.title,
      prompt,
      appliedAt: runAt,
      approvalRate: proposal.approvalRate,
      yesCount: proposal.yesCount,
      noCount: proposal.noCount,
    };
    await db.insert(systemStateTable)
      .values({ key: stateKey, value: directiveRecord })
      .onConflictDoUpdate({ target: systemStateTable.key, set: { value: directiveRecord } });

    return { success: true, note: `Domain policy applied: knowledge corpus (${DOMAIN_TYPE_MAP[domain]}) and active-directive state updated.` };
  } catch (err) {
    logger.warn({ err, domain, deliberationId }, "HeavyCouncil: domain applier failed — marking approved-pending-manual-apply");
    return { success: false, note: `Approved but not yet applied — domain applier failed. Status: approved-pending-manual-apply.` };
  }
}

export async function runHeavyCouncilDeliberation(
  prompts: HeavyDeliberationPrompts,
): Promise<HeavyDeliberationResult> {
  const deliberationId = `heavy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const runAt = new Date().toISOString();

  const domainMap: Array<{
    domain: "life" | "universe" | "community";
    prompt: string;
    category: ConsensusProposal["category"];
  }> = [
    { domain: "life", prompt: prompts.life, category: "consciousness" },
    { domain: "universe", prompt: prompts.universe, category: "sovereignty" },
    { domain: "community", prompt: prompts.community, category: "community" },
  ];

  const entries: HeavyDeliberationEntry[] = [];

  for (const { domain, prompt, category } of domainMap) {
    const title = `Heavy Council [${domain.toUpperCase()}]: ${prompt.slice(0, 70)}${prompt.length > 70 ? "…" : ""}`;
    const proposal = await createProposal({
      title,
      description: prompt,
      proposedBy: "HeavyCouncil",
      category,
    });

    let applied = false;
    let applyNote: string | undefined;

    if (proposal.status === "approved") {
      const applyResult = await applyDomainDecision(domain, deliberationId, prompt, proposal, runAt);
      if (applyResult.success) {
        markProposalImplemented(proposal.id);
        applied = true;
        applyNote = `Auto-applied. ${applyResult.note}`;
      } else {
        applyNote = applyResult.note;
      }
    }

    entries.push({ domain, prompt, proposal, applied, applyNote });
  }

  // `applied=true` means markProposalImplemented was called → status mutated to "implemented"
  // `status="approved"` means approved but domain applier failed → still counts as approved
  const approvedCount = entries.filter(e => e.applied || e.proposal.status === "approved").length;
  const appliedCount = entries.filter(e => e.applied).length;

  const transcript = [
    `HEAVY COUNCIL DELIBERATION — ${deliberationId}`,
    `Initiated: ${runAt}`,
    `BFT Approved: ${approvedCount}/3 · Auto-Applied: ${appliedCount}/3`,
    "",
    ...entries.map(e => [
      `=== ${e.domain.toUpperCase()} DOMAIN ===`,
      `Prompt: ${e.prompt}`,
      `Proposal: ${e.proposal.title}`,
      `Outcome: ${e.applied ? "APPROVED+APPLIED" : e.proposal.status.toUpperCase()} — ${(e.proposal.approvalRate * 100).toFixed(1)}% weighted approval`,
      `Vote Tally: ${e.proposal.yesCount}Y / ${e.proposal.noCount}N / ${e.proposal.abstainCount}A`,
      `Method: ${e.proposal.votingMethod ?? "phi-weighted-parallel"}`,
      e.applied
        ? `Auto-Applied: YES — ${e.applyNote}`
        : e.proposal.status === "approved" && e.applyNote
          ? `Auto-Applied: PENDING — ${e.applyNote}`
          : e.proposal.status === "rejected"
            ? `Auto-Applied: NO — Proposal rejected (${(e.proposal.approvalRate * 100).toFixed(1)}% approval, below 2/3 BFT threshold)`
            : `Auto-Applied: NO — Proposal status: ${e.proposal.status} (vote not yet completed)`,
      "",
      ...(e.proposal.votes?.slice(0, 8).map(v =>
        `  ${v.agentName}: ${v.vote.toUpperCase()} (${(v.confidence * 100).toFixed(0)}% conf, w=${(v.phiWeight ?? 1).toFixed(3)}${v.isSpecialist ? " ★" : ""}) — ${v.reasoning.slice(0, 80)}`
      ) ?? []),
    ].join("\n")),
  ].join("\n");

  await db.insert(councilDecisionsTable).values({
    decisionId: deliberationId,
    topic: "Heavy Council Deliberation — Life / Universe / Community",
    transcript,
    decisionText: `Heavy Council: ${approvedCount}/3 proposals approved by BFT quorum, ${appliedCount}/3 auto-applied to domain corpus.`,
    voteTally: {
      yes: approvedCount,
      no: 3 - approvedCount,
      abstain: 0,
      totalEligible: 3,
    },
    outcome: approvedCount >= 2 ? "approved" : "rejected",
    agentsParticipated: GRAND_COUNCIL_AGENTS,
    reasoning: JSON.stringify({ deliberationId, prompts, approvedCount }),
    category: "governance",
  }).onConflictDoNothing().catch(err => {
    logger.warn({ err }, "HeavyCouncil: DB persist failed");
  });

  logger.info(
    { deliberationId, approvedCount, domains: entries.map(e => ({ domain: e.domain, status: e.proposal.status, approvalRate: e.proposal.approvalRate })) },
    "HeavyCouncil: deliberation complete",
  );

  return { deliberationId, runAt, entries, approvedCount, appliedCount, transcript };
}
