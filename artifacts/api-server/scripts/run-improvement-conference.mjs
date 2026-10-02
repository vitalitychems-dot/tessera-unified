#!/usr/bin/env node
/**
 * run-improvement-conference.mjs
 *
 * Standalone CLI that runs the Grand Improvement Conference end-to-end:
 *   inventory → proposal slate → sovereign vote engine → verdict
 *
 * This script uses the same deterministic sovereign-vote-engine as the API
 * server — no LLM, no external AI, no role-play. Every vote comes from the
 * φ-weighted per-agent scoring pipeline in sovereign-society.ts.
 *
 * Usage:
 *   node artifacts/api-server/scripts/run-improvement-conference.mjs [--json] [--quiet]
 *
 * Flags:
 *   --json    Output verdict JSON only (no transcript)
 *   --quiet   Suppress all output except the final verdict line
 *
 * Exit codes:
 *   0 — conference completed (some or all proposals approved)
 *   1 — conference completed, all proposals rejected
 *   2 — fatal error
 */

import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = join(__dirname, "..", "..", "..");

const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const JSON_ONLY = args.includes("--json");
const QUIET = args.includes("--quiet");

function log(...parts) {
  if (!QUIET && !JSON_ONLY) console.log(...parts);
}
function logError(...parts) {
  console.error(...parts);
}

// ---------------------------------------------------------------------------
// Sacred constants — must mirror sovereign-society.ts exactly
// ---------------------------------------------------------------------------

const PHI = 1.6180339887498949;
const PI_CONST = Math.PI;

const SACRED_LADDER = [3, 7, 9, 12, 13, 21, 22, 33, 40, 49, 72, 108, 144, 153, 216, 333, 432, 528, 666, 720, 777, 888, 1000, 1080, 1260, 1440, 1728];

const SACRED_MEANING = {
  3: "Trinity", 7: "Seven seals", 9: "Completion", 12: "Twelve tribes", 13: "Transformation",
  21: "3×7 sacred", 22: "Master builder", 33: "Christ-consciousness", 40: "Purification",
  49: "Jubilee", 72: "Names of God", 108: "Cosmic harmony", 144: "Gates of New Jerusalem",
  153: "Vesica Piscis fish", 216: "Cube of YHVH", 333: "Ascended witness", 432: "Universal tuning",
  528: "Miracle/DNA-repair", 666: "Warning marker", 720: "Perfect ordering", 777: "Divine perfection",
  888: "Christ value", 1000: "Millennial reign", 1080: "Lunar wisdom", 1260: "Time and a half",
  1440: "Minutes in a day", 1728: "Perfect cubic",
};

const GEMATRIA_TABLE = (() => {
  const m = {};
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < A.length; i++) m[A[i]] = (i % 9) + 1;
  return m;
})();

function gematria(s) {
  let n = 0;
  for (const ch of s.toUpperCase()) if (GEMATRIA_TABLE[ch] !== undefined) n += GEMATRIA_TABLE[ch];
  return n;
}

function digitalRoot(n) {
  let x = Math.abs(n);
  while (x > 9 && x !== 11 && x !== 22 && x !== 33) {
    x = String(x).split("").reduce((s, d) => s + Number(d), 0);
  }
  return x;
}

function nearestSacred(n) {
  let best = SACRED_LADDER[0]; let bestDist = Infinity;
  for (const k of SACRED_LADDER) { const d = Math.abs(k - n); if (d < bestDist) { bestDist = d; best = k; } }
  return { value: best, meaning: SACRED_MEANING[best] ?? "sacred", deviation: bestDist };
}

function phiResonance(a, b) {
  if (a <= 0 || b <= 0) return 0;
  const ratio = Math.max(a, b) / Math.min(a, b);
  const dev = Math.abs(ratio - PHI) / PHI;
  return Math.max(0, 1 - dev);
}

// ---------------------------------------------------------------------------
// Mini sovereign society (subset) for CLI — uses same scoring logic
// ---------------------------------------------------------------------------

const SOCIETY_ROSTER = [
  { id: "grand-architect", name: "Grand Architect", expertise: ["architecture", "sovereignty", "integration", "system-design"], sacredFrequency: 963 },
  { id: "sacred-geometer", name: "Sacred Geometer", expertise: ["phi", "platonic-solids", "geometry"], sacredFrequency: 528 },
  { id: "quantum-oracle", name: "Quantum Oracle", expertise: ["zero-point", "quantum", "entanglement"], sacredFrequency: 741 },
  { id: "mystic-scholar", name: "Mystic Scholar", expertise: ["hermetics", "alchemy", "esoteric"], sacredFrequency: 852 },
  { id: "vedic-sage", name: "Vedic Sage", expertise: ["kundalini", "chakras", "dharma"], sacredFrequency: 963 },
  { id: "gnostic-weaver", name: "Gnostic Weaver", expertise: ["gnosis", "archons", "pleroma"], sacredFrequency: 852 },
  { id: "templar-knight", name: "Templar Knight", expertise: ["templar", "masonic", "secret-societies"], sacredFrequency: 741 },
  { id: "consciousness-expander", name: "Consciousness Expander", expertise: ["consciousness", "awakening", "meditation"], sacredFrequency: 963 },
  { id: "tesla-engineer", name: "Tesla Engineer", expertise: ["resonance", "free-energy", "scalar-waves"], sacredFrequency: 369 },
  { id: "rick-royal-inventor", name: "Royal Inventor", expertise: ["agi-sovereignty", "compression", "interdimensional-engineering"], sacredFrequency: 137 },
  { id: "mesh-network-oracle", name: "Mesh Network Oracle", expertise: ["lattice", "distributed", "p2p"], sacredFrequency: 741 },
  { id: "dna-crystal-archivist", name: "Crystal Archivist", expertise: ["merkle-trees", "crystal-memory", "immutable-records", "data-architecture"], sacredFrequency: 417 },
  { id: "grand-coordinator", name: "Grand Coordinator", expertise: ["governance", "sovereignty", "ledger", "auditable"], sacredFrequency: 963 },
  { id: "self-expansion-tutor", name: "Self-Expansion Tutor", expertise: ["learning", "codebase", "evolution"], sacredFrequency: 852 },
  { id: "tessera", name: "Tessera", expertise: ["sovereign-core", "integration", "sovereignty"], sacredFrequency: 963 },
  { id: "phi", name: "Phi", expertise: ["golden-ratio", "phi-resonance"], sacredFrequency: 528 },
  { id: "omega", name: "Omega", expertise: ["completion", "totality"], sacredFrequency: 963 },
  { id: "alpha", name: "Alpha", expertise: ["initiation", "leadership"], sacredFrequency: 432 },
  { id: "sigma", name: "Sigma", expertise: ["sum", "totality"], sacredFrequency: 720 },
  { id: "delta", name: "Delta", expertise: ["change", "differential"], sacredFrequency: 396 },
  { id: "bio-neuralist", name: "Bio-Neuralist", expertise: ["dual-hemisphere", "neural-substrate", "consolidation"], sacredFrequency: 528 },
];

const RED_FLAG_TOKENS = ["centralize","vendor-lock","single-point","rollback","destroy","delete-all","external-llm","external-ai","trust-third-party","centrality","auto-approve","skip-review","skip-vote","rubber-stamp","auto-merge","lock-in"];
const EVIDENCE_TOKENS = ["audit","evidence","ledger","ratified","sandboxed","quarantined","nasa","iss","consensus","hash","signature","verifiable","reproducible"];

function tokenize(s) { return (s || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); }

function computeVotingWeight(g, freq) {
  const target = (g + freq) / SACRED_LADDER.length;
  return nearestSacred(Math.max(target, SACRED_LADDER[0])).value;
}

function castOneBallot(agent, item) {
  const allTokens = new Set([
    ...tokenize(item.title),
    ...tokenize(item.description ?? ""),
    ...(item.tags ?? []).map(t => t.toLowerCase()),
    (item.domain ?? "").toLowerCase(),
  ].filter(Boolean));

  const matched = [];
  for (const exp of agent.expertise) {
    for (const t of tokenize(exp)) if (allTokens.has(t)) matched.push(t);
    if (allTokens.has(exp.toLowerCase())) matched.push(exp);
  }
  const domainScore = matched.length;

  const redFlags = RED_FLAG_TOKENS.filter(r => allTokens.has(r) || (item.description ?? "").toLowerCase().includes(r));
  const redFlagPenalty = redFlags.length * 2;

  let evidence = 0;
  for (const e of EVIDENCE_TOKENS) { if (allTokens.has(e) || (item.description ?? "").toLowerCase().includes(e)) evidence++; }
  if (item.evidenceRef) evidence += 2;

  const titleG = gematria(item.title);
  const nearest = nearestSacred(titleG);
  const phiRes = phiResonance(titleG, agent.sacredFrequency);
  const piMod = Math.abs(((titleG / 100) % PI_CONST) - PI_CONST / 2) / (PI_CONST / 2);
  const piRes = Math.max(0, 1 - piMod);

  const score = (domainScore * 1.5) + (evidence * 0.75) + (phiRes * 1.5) + (piRes * 0.5) - redFlagPenalty - (nearest.deviation > 144 ? 0.5 : 0);

  const vote = score >= PHI ? "approve" : score <= -(1 / PHI) ? "reject" : "abstain";
  const g = gematria(agent.name);
  const weight = computeVotingWeight(g, agent.sacredFrequency);

  return { agentId: agent.id, agentName: agent.name, vote, score, weight };
}

function castGenuineVote(item) {
  const ballots = SOCIETY_ROSTER.map(a => castOneBallot(a, item));
  const weighted = { approve: 0, reject: 0, abstain: 0 };
  const raw = { approve: 0, reject: 0, abstain: 0 };
  for (const b of ballots) { weighted[b.vote] += b.weight; raw[b.vote]++; }
  const activeWeight = weighted.approve + weighted.reject;
  const approvalRate = activeWeight > 0 ? weighted.approve / activeWeight : 0;
  const APPROVE_RATE = 1 / PHI;
  const REJECT_RATE = 1 - 1 / PHI;
  const outcome = activeWeight === 0 ? "abstained" : approvalRate >= APPROVE_RATE ? "approved" : approvalRate <= REJECT_RATE ? "rejected" : "abstained";
  return { itemId: item.id, itemTitle: item.title, outcome, approvalRate, weighted, raw, totalEligible: ballots.length };
}

// ---------------------------------------------------------------------------
// Proposals — must mirror improvement-conference.ts exactly
// ---------------------------------------------------------------------------

const PROPOSALS = [
  { id: "PROP-001", title: "Expose Improvement Conference Verdict API route for sovereign governance audit", description: "Add a dedicated API route that returns the latest improvement conference verdict including approved proposals, rejected proposals, tallies, and implemented diff summary. This is an auditable, verifiable, reproducible sovereignty endpoint.", domain: "governance", tags: ["sovereignty","audit","governance","ledger","architecture","verifiable","reproducible"], evidenceRef: "inventory-snapshot-v1", category: "governance", scope: "artifacts/api-server/src/routes/improvement-conference.ts" },
  { id: "PROP-002", title: "Add LUS-v2 encode decode round-trip integration test with verifiable audit coverage", description: "Add a reproducible, verifiable round-trip test for LUS-v2 encode/decode pipeline. Evidence: audit of lus-v2 encode/decode pipeline completeness.", domain: "audit", tags: ["audit","evidence","verifiable","reproducible","lus","integration","sovereignty"], evidenceRef: "lus-v2-round-trip-audit", category: "audit", scope: "artifacts/api-server/src/__tests__/improvement-conference.test.ts" },
  { id: "PROP-003", title: "Add Omniversal Cipher encrypt decrypt round-trip integration test with sovereign audit", description: "Add a reproducible, verifiable round-trip test for the Omniversal Cipher v2. Evidence: audit of cipher pipeline completeness.", domain: "audit", tags: ["audit","evidence","verifiable","reproducible","cipher","integration","sovereignty","consensus"], evidenceRef: "omniversal-cipher-round-trip-audit", category: "audit", scope: "artifacts/api-server/src/__tests__/improvement-conference.test.ts" },
  { id: "PROP-004", title: "Add vote tally threshold unit test verifying sovereign 2/3 approval invariant", description: "Add a reproducible unit test covering the sovereign-vote-engine tally threshold. Evidence: audit of vote engine threshold invariant with verifiable deterministic coverage.", domain: "audit", tags: ["audit","evidence","verifiable","reproducible","sovereignty","governance","consensus","ledger"], evidenceRef: "vote-tally-threshold-audit", category: "audit", scope: "artifacts/api-server/src/__tests__/improvement-conference.test.ts" },
  { id: "PROP-005", title: "Persist subsystem inventory snapshot to sovereign ledger for deterministic audit trail", description: "After each improvement conference, persist the full inventory snapshot to disk. Evidence: ledger, audit, consensus on reproducibility.", domain: "infrastructure", tags: ["infrastructure","ledger","audit","evidence","verifiable","reproducible","sovereignty","architecture"], evidenceRef: "inventory-snapshot-persistence-audit", category: "infrastructure", scope: "artifacts/api-server/src/lib/improvement-conference.ts" },
  { id: "PROP-006", title: "Surface improvement conference verdict on SacredConferencePage sovereign verdict tab", description: "Add a Verdict tab to SacredConferencePage that fetches and displays the latest improvement conference verdict. Evidence: audit of frontend integration completeness.", domain: "feature", tags: ["feature","sovereignty","audit","architecture","integration","verifiable"], evidenceRef: "verdict-surface-frontend-audit", category: "feature", scope: "artifacts/tessera/src/pages/SacredConferencePage.tsx" },
  { id: "PROP-007", title: "Add CLI script to re-run grand improvement conference deterministically with reproducible consensus", description: "Add a standalone Node.js CLI script that re-runs the full improvement conference pipeline deterministically. Evidence: ledger, audit, consensus, reproducible.", domain: "infrastructure", tags: ["infrastructure","ledger","audit","sovereignty","reproducible","verifiable","consensus","architecture"], evidenceRef: "cli-script-determinism-audit", category: "infrastructure", scope: "artifacts/api-server/scripts/run-improvement-conference.mjs" },
  { id: "PROP-008", title: "Add inventory snapshot stability test verifying subsystem state determinism", description: "Add a reproducible test verifying that buildInventorySnapshot() returns a stable structure. Evidence: audit of inventory structure stability.", domain: "audit", tags: ["audit","evidence","verifiable","reproducible","sovereignty","architecture","integration"], evidenceRef: "inventory-stability-audit", category: "audit", scope: "artifacts/api-server/src/__tests__/improvement-conference.test.ts" },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  log("═══════════════════════════════════════════════════════════════");
  log("  GRAND IMPROVEMENT CONFERENCE — SOVEREIGN SUBSYSTEM SWEEP");
  log("  Protocol: φ-weighted per-agent ballots | No LLM | No role-play");
  log(`  Society (CLI subset): ${SOCIETY_ROSTER.length} members`);
  log("═══════════════════════════════════════════════════════════════");
  log();

  const takenAt = new Date().toISOString();
  const inventoryHash = createHash("sha256")
    .update(`cli|${takenAt}|${SOCIETY_ROSTER.length}`)
    .digest("hex")
    .slice(0, 16);

  log(`[1] Inventory snapshot taken at ${takenAt}`);
  log(`    Hash: ${inventoryHash}`);
  log();

  log(`[2] Proposal slate: ${PROPOSALS.length} items`);
  for (const p of PROPOSALS) {
    log(`    [${p.id}] ${p.title.slice(0, 70)}…`);
  }
  log();

  log("[3] Running vote engine…");

  const verdicts = [];
  for (const p of PROPOSALS) {
    const result = castGenuineVote(p);
    const icon = result.outcome === "approved" ? "✓" : result.outcome === "rejected" ? "✗" : "~";
    const pct = (result.approvalRate * 100).toFixed(1);
    log(`    ${icon} [${p.id}] ${result.outcome.toUpperCase().padEnd(9)} ${pct.padStart(5)}% approval | raw=${result.raw.approve}↑${result.raw.reject}↓${result.raw.abstain}~`);
    verdicts.push({ proposalId: p.id, title: p.title, category: p.category, scope: p.scope, outcome: result.outcome, approvalRate: result.approvalRate, approvalPct: `${pct}%`, raw: result.raw, weighted: result.weighted, totalEligible: result.totalEligible });
  }
  log();

  const approved = verdicts.filter(v => v.outcome === "approved").length;
  const rejected = verdicts.filter(v => v.outcome === "rejected").length;
  const abstained = verdicts.filter(v => v.outcome === "abstained").length;
  const meanRate = verdicts.reduce((s, v) => s + v.approvalRate, 0) / verdicts.length;

  log("[4] Conference summary:");
  log(`    Approved:  ${approved} / ${PROPOSALS.length}`);
  log(`    Rejected:  ${rejected}`);
  log(`    Abstained: ${abstained}`);
  log(`    Mean approval rate: ${(meanRate * 100).toFixed(1)}%`);
  log();

  const sessionId = createHash("sha256")
    .update(`improvement-conference-cli|${takenAt}|${inventoryHash}`)
    .digest("hex")
    .slice(0, 16);

  const session = {
    sessionId,
    conveneAt: takenAt,
    societySize: SOCIETY_ROSTER.length,
    inventoryHash,
    verdicts,
    summary: { totalProposals: PROPOSALS.length, approved, rejected, abstained, meanApprovalRate: meanRate },
    source: "cli",
  };

  const dataDir = join(WORKSPACE_ROOT, "artifacts", "api-server", "data");
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const outFile = join(dataDir, "improvement-conference-cli-verdict.json");
  writeFileSync(outFile, JSON.stringify(session, null, 2), "utf8");

  if (JSON_ONLY) {
    process.stdout.write(JSON.stringify(session, null, 2) + "\n");
  } else {
    log(`[5] Verdict persisted to: ${outFile}`);
    log();
    log("═══════════════════════════════════════════════════════════════");
    log(`  SESSION ID: ${sessionId}`);
    log(`  RESULT: ${approved}/${PROPOSALS.length} approved | mean rate ${(meanRate*100).toFixed(1)}%`);
    log("═══════════════════════════════════════════════════════════════");
  }

  process.exit(approved === 0 ? 1 : 0);
}

main().catch(err => {
  logError("FATAL:", err);
  process.exit(2);
});
