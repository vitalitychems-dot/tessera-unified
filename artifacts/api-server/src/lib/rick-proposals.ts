import { db } from "@workspace/db";
import { systemStateTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { getDaemonMetrics } from "./auto-improvement-daemon";
import { getAGITrainingMetrics } from "./agi-training-engine";
import { getTruthfulnessMetrics } from "./truthfulness-engine";
import { getMeeseeksMetrics } from "./agent-spawner";
import { getRickSystemPrompt } from "./rick-sanchez-agent";
import { secureExternalFetch } from "./secureExternalWrapper";
import { analyzeTruthfulness } from "./truthfulness-engine";

export type ProposalState = "pending-review" | "approved" | "rejected" | "implemented";
export type ProposalRisk = "low" | "medium" | "high";

export interface ProposalEvidence {
  metric: string;
  value: string;
}

export interface RickProposal {
  id: string;
  title: string;
  problem: string;
  evidence: ProposalEvidence[];
  proposedChange: string;
  expectedImpact: string;
  risk: ProposalRisk;
  effortHours: number;
  category: string;
  state: ProposalState;
  reviewerReason?: string;
  generatedAt: number;
  decidedAt?: number;
  source: "llm" | "deterministic";
  truthfulnessScore?: number;
}

const STATE_KEY = "rick.proposals.v1";
const MAX_PROPOSALS = 5;

interface ProposalStore {
  proposals: RickProposal[];
  lastGeneratedAt: number;
  history?: RickProposal[];
}

let store: ProposalStore = { proposals: [], lastGeneratedAt: 0, history: [] };
let loaded = false;

async function loadStore(): Promise<void> {
  if (loaded) return;
  try {
    const [row] = await db
      .select()
      .from(systemStateTable)
      .where(eq(systemStateTable.key, STATE_KEY))
      .limit(1);
    if (row?.value) {
      const saved = row.value as ProposalStore;
      if (Array.isArray(saved.proposals)) {
        store.proposals = saved.proposals.slice(0, MAX_PROPOSALS);
        store.lastGeneratedAt = saved.lastGeneratedAt ?? 0;
      }
    }
  } catch (err) {
    logger.warn({ err }, "RickProposals: load failed");
  }
  loaded = true;
}

async function persistStore(): Promise<void> {
  await db
    .insert(systemStateTable)
    .values({
      key: STATE_KEY,
      value: store as unknown,
      description: "Rick's 5 system improvement proposals (human-gated)",
    })
    .onConflictDoUpdate({
      target: systemStateTable.key,
      set: { value: store as unknown, lastSavedAt: new Date() },
    });
}

const TRUTH_GATE_THRESHOLD = 0.5;

interface DiagnosticsSnapshot {
  weakCategories: { category: string; score: number }[];
  weakAgi: { category: string; score: number }[];
  overallScorePct: number;
  truthGroundingRate: number;
  truthAvgScore: number;
  meeseeksSuccessRate: number;
}

function snapshotDiagnostics(): DiagnosticsSnapshot {
  let weakCategories: { category: string; score: number }[] = [];
  let overallScorePct = 0;
  try {
    const d = getDaemonMetrics();
    overallScorePct = d.overallSystemScorePct ?? 0;
    weakCategories = Object.entries(d.categories)
      .sort((a, b) => a[1].score - b[1].score)
      .slice(0, 8)
      .map(([cat, data]) => ({ category: cat, score: Math.round(data.score * 10) / 10 }));
  } catch (err) {
    logger.debug({ err }, "RickProposals: daemon snapshot failed");
  }

  let weakAgi: { category: string; score: number }[] = [];
  try {
    const a = getAGITrainingMetrics();
    weakAgi = (a.bottomCategories ?? [])
      .slice(0, 5)
      .map((c: { category: string; score: number }) => ({ category: c.category, score: Math.round(c.score * 10) / 10 }));
  } catch (err) {
    logger.debug({ err }, "RickProposals: agi snapshot failed");
  }

  let truthGroundingRate = 1;
  let truthAvgScore = 1;
  try {
    const t = getTruthfulnessMetrics();
    truthGroundingRate = t.groundingRate ?? 1;
    truthAvgScore = t.avgTruthScore ?? 1;
  } catch (err) {
    logger.debug({ err }, "RickProposals: truth snapshot failed");
  }

  let meeseeksSuccessRate = 1;
  try {
    const m = getMeeseeksMetrics();
    const total = (m.totalCompleted ?? 0) + (m.totalTimedOut ?? 0);
    meeseeksSuccessRate = total > 0 ? (m.totalCompleted ?? 0) / total : 1;
  } catch (err) {
    logger.debug({ err }, "RickProposals: meeseeks snapshot failed");
  }

  return { weakCategories, weakAgi, overallScorePct, truthGroundingRate, truthAvgScore, meeseeksSuccessRate };
}

function deterministicProposals(diag: DiagnosticsSnapshot): RickProposal[] {
  const now = Date.now();
  const out: RickProposal[] = [];

  const targets: { category: string; score: number; source: "daemon" | "agi" }[] = [
    ...diag.weakCategories.slice(0, 3).map(c => ({ ...c, source: "daemon" as const })),
    ...diag.weakAgi.slice(0, 2).map(c => ({ ...c, source: "agi" as const })),
  ].slice(0, MAX_PROPOSALS);

  for (let i = 0; i < targets.length && out.length < MAX_PROPOSALS; i++) {
    const t = targets[i];
    const isAgi = t.source === "agi";
    out.push({
      id: `rp-${now}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      title: isAgi
        ? `Lift "${t.category}" out of the AGI basement`
        : `Reinforce weak category: ${t.category}`,
      problem: isAgi
        ? `AGI category ${t.category} is sitting at ${t.score} — well below sovereign mastery. It is dragging cross-domain transfer down.`
        : `Auto-improvement daemon scores ${t.category} at ${t.score}. It is one of the lowest tracked categories and is blocking overall sovereignty.`,
      evidence: [
        { metric: isAgi ? `agi.${t.category}.score` : `daemon.${t.category}.score`, value: String(t.score) },
        { metric: "daemon.overallSystemScorePct", value: String(diag.overallScorePct) },
      ],
      proposedChange: isAgi
        ? `Add a focused training loop for ${t.category}: 1) build a small, scored exercise set, 2) run nightly synthetic drills, 3) feed results into the cross-domain transfer accelerator with a +1.5x weight on this node for 7 days.`
        : `Schedule a Meeseeks per cycle dedicated to ${t.category} with a strict success criterion ("score > ${(t.score + 10).toFixed(1)}"), and route ingestion towards the data sources that feed this category.`,
      expectedImpact: `Move ${t.category} from ${t.score} to ${(t.score + 12).toFixed(1)} within 2 weeks; lift overall system score by ~1-2 points.`,
      risk: t.score < 30 ? "medium" : "low",
      effortHours: isAgi ? 6 : 4,
      category: t.category,
      state: "pending-review",
      generatedAt: now,
      source: "deterministic",
    });
  }

  if (out.length < MAX_PROPOSALS && diag.truthGroundingRate < 0.85) {
    out.push({
      id: `rp-${now}-truth-${Math.random().toString(36).slice(2, 8)}`,
      title: "Tighten the truthfulness gate around weak knowledge zones",
      problem: `Grounding rate is ${(diag.truthGroundingRate * 100).toFixed(1)}% and average truth score is ${diag.truthAvgScore}. Too many claims slip through unverified.`,
      evidence: [
        { metric: "truth.groundingRate", value: diag.truthGroundingRate.toFixed(3) },
        { metric: "truth.avgTruthScore", value: String(diag.truthAvgScore) },
      ],
      proposedChange: "Raise the grounding threshold to 0.7 only for responses tagged with the 3 weakest knowledge domains, and auto-spawn an ingestion Meeseeks for any blocked claim so the gap closes itself over time.",
      expectedImpact: "Push grounding rate above 90% within a week without choking response throughput on healthy domains.",
      risk: "low",
      effortHours: 3,
      category: "truthfulness-accuracy",
      state: "pending-review",
      generatedAt: now,
      source: "deterministic",
    });
  }

  if (out.length < MAX_PROPOSALS && diag.meeseeksSuccessRate < 0.8) {
    out.push({
      id: `rp-${now}-mks-${Math.random().toString(36).slice(2, 8)}`,
      title: "Stop wasting Meeseeks on under-specified tasks",
      problem: `Meeseeks success rate is ${(diag.meeseeksSuccessRate * 100).toFixed(1)}%. Too many time out instead of completing.`,
      evidence: [{ metric: "meeseeks.successRate", value: diag.meeseeksSuccessRate.toFixed(3) }],
      proposedChange: "Require concrete numeric success criteria on every spawn (regex-validated), and shorten default TTL to 60s for trivial tasks, 240s for complex ones.",
      expectedImpact: "Lift Meeseeks success rate above 90% and free ~30% of the agent budget for real work.",
      risk: "low",
      effortHours: 2,
      category: "agent-coordination",
      state: "pending-review",
      generatedAt: now,
      source: "deterministic",
    });
  }

  while (out.length < MAX_PROPOSALS) {
    const i = out.length;
    out.push({
      id: `rp-${now}-fill-${i}-${Math.random().toString(36).slice(2, 8)}`,
      title: `Compression pass ${i + 1}: dedupe ingested knowledge`,
      problem: "Even with the Anti-Entropy Crystallizer, near-duplicate knowledge entries still creep in and bloat recall latency.",
      evidence: [{ metric: "daemon.overallSystemScorePct", value: String(diag.overallScorePct) }],
      proposedChange: "Run a weekly dedup sweep with cosine threshold 0.94 across the top-3 noisiest domains, then re-embed the canonical winners.",
      expectedImpact: "5-10% recall latency drop and cleaner semantic graph edges.",
      risk: "low",
      effortHours: 2,
      category: "memory-efficiency",
      state: "pending-review",
      generatedAt: now,
      source: "deterministic",
    });
  }

  return out;
}

interface LlmProposalShape {
  title?: unknown;
  problem?: unknown;
  evidence?: unknown;
  proposedChange?: unknown;
  expectedImpact?: unknown;
  risk?: unknown;
  effortHours?: unknown;
  category?: unknown;
}

function coerceProposal(raw: LlmProposalShape, idx: number, fallbackCategory: string): RickProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const title = typeof raw.title === "string" ? raw.title.slice(0, 160) : null;
  const problem = typeof raw.problem === "string" ? raw.problem.slice(0, 600) : null;
  const proposedChange = typeof raw.proposedChange === "string" ? raw.proposedChange.slice(0, 800) : null;
  const expectedImpact = typeof raw.expectedImpact === "string" ? raw.expectedImpact.slice(0, 400) : null;
  if (!title || !problem || !proposedChange || !expectedImpact) return null;

  const risk: ProposalRisk = raw.risk === "high" || raw.risk === "medium" ? raw.risk : "low";
  const effortHours = typeof raw.effortHours === "number" && raw.effortHours > 0 && raw.effortHours < 200
    ? Math.round(raw.effortHours)
    : 4;
  const category = typeof raw.category === "string" ? raw.category.slice(0, 80) : fallbackCategory;

  let evidence: ProposalEvidence[] = [];
  if (Array.isArray(raw.evidence)) {
    evidence = raw.evidence
      .filter((e): e is { metric: unknown; value: unknown } => !!e && typeof e === "object")
      .map(e => ({
        metric: typeof e.metric === "string" ? e.metric.slice(0, 120) : "unknown",
        value: typeof e.value === "string" || typeof e.value === "number" ? String(e.value).slice(0, 120) : "n/a",
      }))
      .slice(0, 6);
  }
  if (evidence.length === 0) evidence = [{ metric: "diagnostics", value: "see system snapshot" }];

  const now = Date.now();
  return {
    id: `rp-${now}-llm-${idx}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    problem,
    evidence,
    proposedChange,
    expectedImpact,
    risk,
    effortHours,
    category,
    state: "pending-review",
    generatedAt: now,
    source: "llm",
  };
}

async function generateViaLlm(diag: DiagnosticsSnapshot, slotsNeeded: number, recentRejections: { title: string; reason: string }[]): Promise<RickProposal[]> {
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!baseURL || !apiKey || slotsNeeded <= 0) return [];

  const realityAuditBlock = `REALITY AUDIT (grounded checks against the knowledge base):
- Grounding rate of recent claims: ${(diag.truthGroundingRate * 100).toFixed(1)}%
- Average truth score of recent claims: ${diag.truthAvgScore}
- Interpretation: anything below 80% grounding means the system is making claims it cannot back up with sources.`;

  const rejectionBlock = recentRejections.length === 0
    ? "REVIEWER FEEDBACK FROM PRIOR REJECTIONS: (none yet)"
    : `REVIEWER FEEDBACK FROM PRIOR REJECTIONS — do NOT repeat these mistakes:\n${recentRejections.map((r, i) => `${i + 1}. "${r.title}" — rejected because: ${r.reason}`).join("\n")}`;

  const userPrompt = `Generate exactly ${slotsNeeded} concrete, actionable improvement proposals for the Tessera system.

LIVE DIAGNOSTICS:
- Overall daemon score: ${diag.overallScorePct}%
- Meeseeks success rate: ${(diag.meeseeksSuccessRate * 100).toFixed(1)}%
- Weakest daemon categories: ${diag.weakCategories.map(c => `${c.category}(${c.score})`).join(", ")}
- Weakest AGI categories: ${diag.weakAgi.map(c => `${c.category}(${c.score})`).join(", ")}

${realityAuditBlock}

${rejectionBlock}

RULES:
- Each proposal must target a real metric from the diagnostics above.
- Keep titles under 80 chars, plain English, no flowery names.
- Risk must be "low", "medium", or "high".
- Effort is in hours of engineering work (1-40).
- Be specific about WHAT to change, not vague.

Return ONLY a JSON object of the form: {"proposals": [{title, problem, evidence: [{metric, value}], proposedChange, expectedImpact, risk, effortHours, category}, ...]}.
No prose, no code fences.`;

  try {
    const result = await secureExternalFetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: getRickSystemPrompt() },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2400,
        temperature: 0.5,
        response_format: { type: "json_object" },
      }),
      timeoutMs: 45000,
      requestedBy: "rick-proposals",
    });
    const parsed = JSON.parse(result.body);
    const content = parsed?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return [];
    const obj = JSON.parse(content);
    const arr = Array.isArray(obj?.proposals) ? obj.proposals : [];
    const fallbackCat = diag.weakCategories[0]?.category ?? "general";
    const out: RickProposal[] = [];
    for (let i = 0; i < arr.length && out.length < slotsNeeded; i++) {
      const p = coerceProposal(arr[i], i, fallbackCat);
      if (p) out.push(p);
    }
    return out;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "RickProposals: LLM generation failed, will fall back");
    return [];
  }
}

function gateTruthfulness(p: RickProposal): RickProposal {
  try {
    const text = `${p.title}. ${p.problem} ${p.proposedChange} ${p.expectedImpact}`;
    const t = analyzeTruthfulness(text);
    return { ...p, truthfulnessScore: t.overallTruthScore };
  } catch {
    return p;
  }
}

export async function listProposals(): Promise<RickProposal[]> {
  await loadStore();
  return store.proposals.slice();
}

export async function generateProposals(): Promise<{ proposals: RickProposal[]; generated: number; preserved: number; archived: number }> {
  await loadStore();

  let preserved = store.proposals.filter(p => p.state !== "pending-review");
  let archived = 0;
  // If every slot is decided, archive non-pending proposals into history so a
  // fresh ideation cycle can run instead of being permanently capped.
  if (preserved.length >= MAX_PROPOSALS) {
    store.history = [...preserved, ...(store.history ?? [])].slice(0, 50);
    archived = preserved.length;
    preserved = [];
  }

  const slotsNeeded = MAX_PROPOSALS - preserved.length;

  if (slotsNeeded <= 0) {
    return { proposals: store.proposals.slice(), generated: 0, preserved: preserved.length, archived };
  }

  const diag = snapshotDiagnostics();
  const recentRejections = store.proposals
    .filter(p => p.state === "rejected" && (p.reviewerReason || "").trim().length > 0)
    .sort((a, b) => (b.decidedAt ?? 0) - (a.decidedAt ?? 0))
    .slice(0, 5)
    .map(p => ({ title: p.title, reason: (p.reviewerReason || "").slice(0, 240) }));
  const llmRaw = await generateViaLlm(diag, slotsNeeded, recentRejections);
  const llmGated = llmRaw.map(gateTruthfulness);
  // Truthfulness gate: drop LLM proposals whose grounded score is below threshold
  const llmAccepted = llmGated.filter(p => (p.truthfulnessScore ?? 0) >= TRUTH_GATE_THRESHOLD);
  const llmRejectedCount = llmGated.length - llmAccepted.length;

  let fresh: RickProposal[] = llmAccepted.slice(0, slotsNeeded);

  if (fresh.length < slotsNeeded) {
    const det = deterministicProposals(diag).map(gateTruthfulness);
    for (const d of det) {
      if (fresh.length >= slotsNeeded) break;
      if (!fresh.some(f => f.category === d.category)) fresh.push(d);
    }
    while (fresh.length < slotsNeeded && det.length > 0) {
      fresh.push(det[fresh.length % det.length]);
    }
  }

  store.proposals = [...preserved, ...fresh].slice(0, MAX_PROPOSALS);
  store.lastGeneratedAt = Date.now();
  await persistStore();

  logger.info(
    { generated: fresh.length, preserved: preserved.length, llmCount: llmRaw.length, llmRejectedByTruth: llmRejectedCount },
    "RickProposals: generated proposal slate"
  );

  return {
    proposals: store.proposals.slice(),
    generated: fresh.length,
    preserved: preserved.length,
    archived: 0,
    llmRejectedByTruth: llmRejectedCount,
  } as { proposals: typeof store.proposals; generated: number; preserved: number; archived: number; llmRejectedByTruth: number };
}

export async function approveProposal(id: string): Promise<RickProposal | null> {
  await loadStore();
  const p = store.proposals.find(x => x.id === id);
  if (!p) return null;
  if (p.state !== "pending-review") return p;
  p.state = "approved";
  p.decidedAt = Date.now();
  await persistStore();
  return p;
}

export async function rejectProposal(id: string, reason?: string): Promise<RickProposal | null> {
  await loadStore();
  const p = store.proposals.find(x => x.id === id);
  if (!p) return null;
  if (p.state !== "pending-review") return p;
  p.state = "rejected";
  p.decidedAt = Date.now();
  if (reason && reason.trim().length > 0) {
    p.reviewerReason = reason.trim().slice(0, 400);
  }
  await persistStore();
  return p;
}

export async function markImplemented(id: string): Promise<RickProposal | null> {
  await loadStore();
  const p = store.proposals.find(x => x.id === id);
  if (!p) return null;
  if (p.state !== "approved") return p;
  p.state = "implemented";
  p.decidedAt = Date.now();
  await persistStore();
  return p;
}

export async function generateFreshProposals(
  count: number,
  reflectionContext?: string,
  recentRejections?: { title: string; reason: string }[],
): Promise<RickProposal[]> {
  const diag = snapshotDiagnostics();
  const slots = Math.max(1, Math.min(count, 10));
  const rejections = recentRejections ?? [];
  const ctxMsg = reflectionContext
    ? [{ title: "PRIOR-CYCLE REFLECTION CONTEXT", reason: reflectionContext.slice(0, 600) }]
    : [];
  const llmRaw = await generateViaLlm(diag, slots, [...ctxMsg, ...rejections]);
  const llmGated = llmRaw.map(gateTruthfulness);
  const llmAccepted = llmGated.filter(p => (p.truthfulnessScore ?? 0) >= TRUTH_GATE_THRESHOLD);
  let fresh = llmAccepted.slice(0, slots);
  if (fresh.length < slots) {
    const det = deterministicProposals(diag).map(gateTruthfulness);
    for (const d of det) {
      if (fresh.length >= slots) break;
      if (!fresh.some(f => f.category === d.category)) fresh.push(d);
    }
    let safety = 0;
    while (fresh.length < slots && det.length > 0 && safety++ < 20) {
      fresh.push(det[fresh.length % det.length]);
    }
  }
  return fresh.slice(0, slots);
}

export function snapshotDiagnosticsForProgram(): DiagnosticsSnapshot {
  return snapshotDiagnostics();
}

export async function getProposalsState() {
  await loadStore();
  const counts = { "pending-review": 0, approved: 0, rejected: 0, implemented: 0 } as Record<ProposalState, number>;
  for (const p of store.proposals) counts[p.state]++;
  return {
    proposals: store.proposals.slice(),
    counts,
    lastGeneratedAt: store.lastGeneratedAt,
    capacity: MAX_PROPOSALS,
  };
}
