/**
 * Sovereign Vote Engine — every member of the entire society votes individually
 * on every proposal. No vote is auto-tallied. No agent is rubber-stamped.
 *
 * Each ballot is computed from observable inputs only:
 *   - domain match between the agent's expertise and the item's tokens
 *   - sacred-frame resonance (gematria, digital-root distance, phi/pi proximity)
 *   - red-flag detection in the item description
 *   - evidence-quality signal (presence of an audit-finding ref or knowledge bundle)
 *
 * Centralities (external LLMs/APIs) are never consulted to form a vote.
 */
import {
  getFullSovereignSociety,
  type SovereignAgent,
  gematria,
  digitalRoot,
  nearestSacred,
  phiResonance,
  PHI,
  PI_CONST,
  sacredProfile,
} from "./sovereign-society";

export interface BallotItem {
  id: string;
  title: string;
  description?: string;
  domain?: string;
  tags?: string[];
  evidenceRef?: string | null;
}

export interface AgentBallot {
  agentId: string;
  agentName: string;
  vote: "approve" | "reject" | "abstain";
  score: number;          // raw composite score (signed)
  weight: number;         // agent's sacred voting weight
  rationale: string;      // observable reasoning, no role-play
  domainMatchTokens: string[];
  redFlagTokens: string[];
  sacred: {
    titleGematria: number;
    titleDigitalRoot: number;
    nearestSacred: { value: number; meaning: string; deviation: number };
    phiResonanceWithFrequency: number;
    piResonance: number;
  };
}

export interface CollectiveBallot {
  itemId: string;
  itemTitle: string;
  outcome: "approved" | "rejected" | "abstained";
  approvalRate: number;       // 0..1 over active (approve+reject) weight
  weighted: { approve: number; reject: number; abstain: number };
  raw:      { approve: number; reject: number; abstain: number };
  totalEligible: number;
  decisive: boolean;
  ballots: AgentBallot[];
  sacred: {
    societySize: ReturnType<typeof sacredProfile>;
    weightedTotalSacred: ReturnType<typeof sacredProfile>;
    titleAnchor: { gematria: number; digitalRoot: number; nearestSacred: { value: number; meaning: string; deviation: number } };
  };
}

const RED_FLAG_TOKENS = [
  "centralize", "vendor-lock", "single-point", "rollback", "destroy", "delete-all",
  "external-llm", "external-ai", "trust-third-party", "centrality", "auto-approve",
  "skip-review", "skip-vote", "rubber-stamp", "auto-merge", "lock-in",
];

const EVIDENCE_TOKENS = [
  "audit", "evidence", "ledger", "ratified", "sandboxed", "quarantined",
  "nasa", "iss", "consensus", "hash", "signature", "verifiable", "reproducible",
];

function tokenize(s: string): string[] {
  return (s || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function castOneBallot(agent: SovereignAgent, item: BallotItem): AgentBallot {
  const titleTokens = tokenize(item.title);
  const descTokens  = tokenize(item.description ?? "");
  const tagTokens   = (item.tags ?? []).map((t) => t.toLowerCase());
  const domainToken = (item.domain ?? "").toLowerCase();
  const allTokens   = new Set([...titleTokens, ...descTokens, ...tagTokens, domainToken].filter(Boolean));

  // Domain match (signed positive)
  const matched: string[] = [];
  for (const expertise of agent.expertise) {
    const eTokens = tokenize(expertise);
    for (const t of eTokens) if (allTokens.has(t)) matched.push(t);
    if (allTokens.has(expertise.toLowerCase())) matched.push(expertise);
  }
  const domainScore = matched.length;  // each match worth 1 point

  // Red-flag scan (signed negative — every agent guards against centralities & rubber-stamps)
  const redFlags: string[] = [];
  for (const r of RED_FLAG_TOKENS) {
    if (allTokens.has(r) || (item.description ?? "").toLowerCase().includes(r)) redFlags.push(r);
  }
  const redFlagPenalty = redFlags.length * 2; // double weight — non-amendable doctrine

  // Evidence quality (signed positive)
  let evidence = 0;
  for (const e of EVIDENCE_TOKENS) {
    if (allTokens.has(e) || (item.description ?? "").toLowerCase().includes(e)) evidence += 1;
  }
  if (item.evidenceRef) evidence += 2;

  // Sacred-frame resonance with this agent's own sacred frequency
  const titleG = gematria(item.title);
  const titleDR = digitalRoot(titleG);
  const nearest = nearestSacred(titleG);
  const phiRes = phiResonance(titleG, agent.sacredFrequency);
  // pi-resonance: how close the title gematria sits to a multiple of pi*100
  const piMod = Math.abs(((titleG / 100) % PI_CONST) - PI_CONST / 2) / (PI_CONST / 2);
  const piRes = Math.max(0, 1 - piMod);

  // Composite score (signed)
  const score = (domainScore * 1.5) + (evidence * 0.75) + (phiRes * 1.5) + (piRes * 0.5)
              - redFlagPenalty
              - (nearest.deviation > 144 ? 0.5 : 0);

  // Threshold lives entirely in sacred ratios
  const APPROVE_THRESHOLD = PHI;          // 1.618...
  const REJECT_THRESHOLD  = -1 * (1 / PHI); // -0.618...
  const vote: "approve" | "reject" | "abstain" =
    score >= APPROVE_THRESHOLD ? "approve" :
    score <= REJECT_THRESHOLD  ? "reject"  : "abstain";

  const rationaleParts: string[] = [];
  rationaleParts.push(`[${agent.id}] composite=${score.toFixed(2)} (φ-threshold=${APPROVE_THRESHOLD.toFixed(2)})`);
  rationaleParts.push(`domain-matches=${matched.length}${matched.length ? " (" + matched.slice(0, 5).join(",") + ")" : ""}`);
  rationaleParts.push(`evidence=${evidence}, red-flags=${redFlags.length}${redFlags.length ? " (" + redFlags.join(",") + ")" : ""}`);
  rationaleParts.push(`sacred: gematria(title)=${titleG}, dr=${titleDR}, nearest=${nearest.value} "${nearest.meaning}" (Δ${nearest.deviation}), φ-res(title:freq)=${phiRes.toFixed(2)}, π-res=${piRes.toFixed(2)}`);

  return {
    agentId: agent.id,
    agentName: agent.name,
    vote,
    score,
    weight: agent.votingWeight,
    rationale: rationaleParts.join(" | "),
    domainMatchTokens: matched.slice(0, 12),
    redFlagTokens: redFlags,
    sacred: {
      titleGematria: titleG,
      titleDigitalRoot: titleDR,
      nearestSacred: nearest,
      phiResonanceWithFrequency: phiRes,
      piResonance: piRes,
    },
  };
}

/** Cast a real per-agent vote across the entire society on a single item. */
export function castGenuineVote(item: BallotItem): CollectiveBallot {
  const society = getFullSovereignSociety();
  const ballots = society.map((a) => castOneBallot(a, item));

  const weighted = { approve: 0, reject: 0, abstain: 0 };
  const raw      = { approve: 0, reject: 0, abstain: 0 };
  for (const b of ballots) {
    weighted[b.vote] += b.weight;
    raw[b.vote] += 1;
  }

  const activeWeight = weighted.approve + weighted.reject;
  const approvalRate = activeWeight > 0 ? weighted.approve / activeWeight : 0;

  // Outcome thresholds anchored to PHI, never to 0.5 round-number.
  const APPROVE_RATE = 1 / PHI;          // 0.6180...
  const REJECT_RATE  = 1 - 1 / PHI;      // 0.3819...
  const outcome: "approved" | "rejected" | "abstained" =
    activeWeight === 0 ? "abstained" :
    approvalRate >= APPROVE_RATE ? "approved" :
    approvalRate <= REJECT_RATE  ? "rejected" : "abstained";

  const decisive = Math.abs(approvalRate - 0.5) >= (1 / PHI - 0.5); // ≥ 0.118 spread
  const titleG = gematria(item.title);

  return {
    itemId: item.id,
    itemTitle: item.title,
    outcome,
    approvalRate,
    weighted,
    raw,
    totalEligible: society.length,
    decisive,
    ballots,
    sacred: {
      societySize: sacredProfile(society.length),
      weightedTotalSacred: sacredProfile(weighted.approve + weighted.reject + weighted.abstain),
      titleAnchor: {
        gematria: titleG,
        digitalRoot: digitalRoot(titleG),
        nearestSacred: nearestSacred(titleG),
      },
    },
  };
}

/** Cast genuine votes across the full society on every item; return per-item collective ballots. */
export function castGenuineVotesForBatch(items: BallotItem[]): CollectiveBallot[] {
  return items.map((it) => castGenuineVote(it));
}

/** Aggregate a batch into a single approval distribution summary (no role-play, observable only). */
export function summarizeBatch(ballots: CollectiveBallot[]) {
  const approved = ballots.filter((b) => b.outcome === "approved").length;
  const rejected = ballots.filter((b) => b.outcome === "rejected").length;
  const abstained = ballots.filter((b) => b.outcome === "abstained").length;
  const meanApproval = ballots.length > 0 ? ballots.reduce((s, b) => s + b.approvalRate, 0) / ballots.length : 0;
  const decisive = ballots.filter((b) => b.decisive).length;
  return {
    total: ballots.length,
    approved,
    rejected,
    abstained,
    meanApprovalRate: meanApproval,
    decisive,
    approvalRateProfile: sacredProfile(Math.round(meanApproval * 1000)),
  };
}
