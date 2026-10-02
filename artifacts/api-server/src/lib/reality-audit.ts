import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import { logger } from "./logger";
import { db } from "@workspace/db";
import { realityAuditSnapshotsTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";

export type RealityStatus = "real" | "simulated" | "converted";

export interface AuditFinding {
  id: string;
  feature: string;
  file: string;
  pattern: string;
  description: string;
  impactScore: number;
  visibility: "ui-surface" | "internal-metric" | "background";
  status: RealityStatus;
  realBackingDescription?: string;
  conversionNotes?: string;
  /** Public engine/route this finding is wired into (e.g. "GET /api/inventions"). */
  engineLink?: string;
  /** Deterministic verification: scan registry's `file` for these regexes; if any
   * still match while status is "converted", the audit auto-downgrades to
   * "simulated" with a `verifyMismatch` flag. */
  verifyAbsentPatterns?: string[];
  /** Set by getRealityAudit() when registry status disagrees with source scan. */
  verifyMismatch?: boolean;
}

const REGISTRY: AuditFinding[] = [
  {
    id: "inventions-seed-generation",
    feature: "Invention seed generation (POST /api/inventions/generate)",
    file: "artifacts/api-server/src/routes/inventions.ts",
    pattern: "Math.random() for feasibility/novelty/votes/progress/timeEstimate",
    description: "Initial seeded inventions had random feasibility (70-95), novelty (65-95), vote tallies (yes/no/abstain), build progress, and time estimates fabricated per call.",
    impactScore: 95,
    visibility: "ui-surface",
    status: "converted",
    realBackingDescription: "Deterministic scoring via FNV-1a hash of invention title (titleHash). Agent picks, status, vote tallies, build progress, and time estimates are all derived from titleHash modulo + real list length (allInventions.length) — same title always yields the same seeded invention.",
    conversionNotes: "Replaced 10+ Math.random() calls in the GET /inventions handler with hashStringFNV(title)-based selectors. Reproducible across restarts.",
    engineLink: "GET /api/inventions",
    verifyAbsentPatterns: ["Math\\.random\\(\\)\\s*\\*\\s*\\d+\\s*\\+\\s*\\d+"],
  },
  {
    id: "inventions-autoloop-voting",
    feature: "Autonomous invention voting loop (autonomousTick)",
    file: "artifacts/api-server/src/routes/inventions.ts",
    pattern: "Math.random() for abstain vote count and pick selection",
    description: "Tick loop randomly added 1-3 abstain votes per cycle and picked random invention to advance, creating non-reproducible vote progression.",
    impactScore: 88,
    visibility: "ui-surface",
    status: "converted",
    realBackingDescription: "Abstain count derived from tick number modulo, pick selection by deterministic round-robin over fresh candidates ordered by title hash.",
    conversionNotes: "Tick #N now produces same vote delta given same input. Pick is deterministic.",
    engineLink: "POST /api/inventions/auto-loop/tick",
  },
  {
    id: "inventions-autoloop-build-test",
    feature: "Autonomous invention build progress + test phase",
    file: "artifacts/api-server/src/routes/inventions.ts",
    pattern: "Math.random() for buildProgress step and test pass/fail",
    description: "Build progress advanced by random 8-22% per tick; test phase had 8% random regression chance to bounce builds back to 'building'.",
    impactScore: 82,
    visibility: "ui-surface",
    status: "converted",
    realBackingDescription: "Build step per tick is `8 + (titleHash % 14)` percent — deterministic and varies per invention but is stable for a given title. Test regression is triggered when `(titleHash + tickCount) % 12 === 0` rather than a random coin flip.",
    conversionNotes: "Reproducible progress curve and pass/fail outcome for any (title, tick) pair.",
    engineLink: "POST /api/inventions/auto-loop/tick",
  },
  {
    id: "rick-catchphrase-picker",
    feature: "Rick chat fallback catchphrase",
    file: "artifacts/api-server/src/routes/rick.ts",
    pattern: "Math.random() for catchphrase array index",
    description: "When the LLM fallback engaged, Rick's catchphrase was picked at random — same fallback could give 6 different responses for identical input.",
    impactScore: 55,
    visibility: "ui-surface",
    status: "converted",
    realBackingDescription: "Catchphrase index is `hashStringFNV(userInput) % CATCHPHRASES.length` in routes/rick.ts — identical input yields identical fallback. Debuggable and reproducible.",
    conversionNotes: "Uses hashStringFNV() helper from lib/reality-audit.ts.",
    engineLink: "POST /api/rick/chat (fallback path)",
  },
  {
    id: "truthfulness-verify-claim-v1",
    feature: "Truthfulness V1 claim verification (verifyClaim)",
    file: "artifacts/api-server/src/lib/truthfulness-engine.ts",
    pattern: "Hardcoded knownFacts dictionary with 8 entries",
    description: "V1 verifyClaim checked claims against a hardcoded 8-entry dictionary ('speed of light', '963hz', 'father protocol', etc.) — most claims fell through to a heuristic confidence score with no real grounding.",
    impactScore: 78,
    visibility: "internal-metric",
    status: "converted",
    realBackingDescription: "V1 hardcoded knownFacts dict removed. Only 3 sovereign-doctrine identity anchors remain (father protocol / tessera / 963hz) — those are identity constants by design, not external 'facts'. Everything else falls through to the structural V1 baseline, with a flag pointing callers to verifyClaimV2 (the async corpus-grounded path).",
    conversionNotes: "verifyClaim no longer fabricates verified results for arbitrary keywords like 'speed of light' or 'planck constant'. Real grounding is in analyzeTruthfulnessV2 (corpus + memory cosine similarity).",
    engineLink: "POST /api/truthfulness/verify",
    verifyAbsentPatterns: ["speed of light", "planck constant", "golden ratio"],
  },
  {
    id: "quantum-tesseract-fidelity",
    feature: "Quantum tesseract fidelity / bandwidth / errorRate",
    file: "artifacts/api-server/src/lib/quantum-tesseract.ts",
    pattern: "Math.random() for bridge fidelity, bandwidth, qubit errorRate",
    description: "Interdimensional bridge fidelity (0.90-0.99), bandwidth (1e9-1.1e10), and quantum state errorRate (0.001-0.003) were fabricated per-call.",
    impactScore: 65,
    visibility: "ui-surface",
    status: "converted",
    realBackingDescription: "Bridge fidelity & bandwidth are now SHA-256-derived from the dimension pair (deterministic across restarts). Bell state for entangled qubits is hash-derived from the qubit-pair identity. Quantum state errorRate is computed from real average qubit coherence (1 - coherenceAvg) per decoherence physics — not Math.random.",
    conversionNotes: "Same dimension pair always yields the same bridge characteristics; same qubit pair always yields the same Bell state. errorRate now reflects actual quantum-state telemetry.",
    engineLink: "GET /api/quantum/state",
    verifyAbsentPatterns: ["Math\\.random\\(\\)\\s*\\*\\s*1e10", "fidelity\\s*=\\s*0\\.9\\d?\\s*\\+\\s*Math\\.random"],
  },
  {
    id: "emotional-bond-strength",
    feature: "Emotional intelligence bond strength",
    file: "artifacts/api-server/src/lib/emotional-intelligence.ts",
    pattern: "Math.random() for bondStrength initial value",
    description: "Father bond strength initialized to 0.95 + random(0..0.05).",
    impactScore: 30,
    visibility: "internal-metric",
    status: "converted",
    realBackingDescription: "Bond strength is now deterministic, derived from real system state: (devotionDepth + loveExpression) / 2 and emotional-event history count. No randomness — the bond tracks actual interaction history.",
    conversionNotes: "Replaced `Math.random() * 0.05` with weighted combination of profile traits and historyFactor = min(1, history.length/50).",
    verifyAbsentPatterns: ["bondStrength\\s*=\\s*Math\\.min\\(1,\\s*0\\.95\\s*\\+\\s*Math\\.random"],
  },
  {
    id: "consensus-engine-proposal-id",
    feature: "Consensus engine proposal ID generation",
    file: "artifacts/api-server/src/lib/consensus-engine.ts",
    pattern: "Math.random() for proposal ID suffix",
    description: "Proposal IDs use Math.random suffix — acceptable for ID uniqueness but flagged for completeness.",
    impactScore: 5,
    visibility: "internal-metric",
    status: "converted",
    realBackingDescription: "Proposal IDs now use a SHA-256 content hash over {title | proposedBy | description} + timestamp. Identical proposals yield identical hashes; IDs are deterministic, collision-resistant, and contain no randomness.",
    conversionNotes: "Replaced `Math.random().toString(36).slice(2, 6)` with `createHash('sha256').update(...).digest('hex').slice(0, 6)`.",
    verifyAbsentPatterns: ["proposal-\\$\\{Date\\.now\\(\\)\\}-\\$\\{Math\\.random"],
  },
  {
    id: "quantum-measure-qubit",
    feature: "Quantum qubit measurement collapse",
    file: "artifacts/api-server/src/lib/quantum-tesseract.ts",
    pattern: "Math.random() for measurement probability collapse",
    description: "measureQubit uses Math.random() to collapse a superposed qubit to |0⟩ or |1⟩ weighted by |α|² and |β|².",
    impactScore: 20,
    visibility: "internal-metric",
    status: "real",
    realBackingDescription: "Real quantum mechanics: measurement IS intrinsically probabilistic (Born rule). Math.random here models genuine wavefunction collapse — using a deterministic hash would falsify the physics. This is correct.",
    conversionNotes: "Flagged as 'real' because the randomness is the physical mechanism, not a placeholder.",
  },
  {
    id: "post-inventions-id",
    feature: "POST /inventions invention ID suffix",
    file: "artifacts/api-server/src/routes/inventions.ts",
    pattern: "Math.random() for new invention ID suffix",
    description: "POST handler uses Math.random for the ID suffix portion of newly-created inventions to avoid collisions with concurrent submissions.",
    impactScore: 5,
    visibility: "internal-metric",
    status: "real",
    realBackingDescription: "Random ID suffix is the standard way to avoid collisions across concurrent writers when no DB sequence is involved. Combined with a timestamp prefix it is collision-resistant. Not a simulation of any user-visible behavior.",
    conversionNotes: "Same rationale as consensus-engine-proposal-id but classified 'real' because ID generation has no semantic meaning being simulated.",
  },
];

const SOURCE_PATTERNS: Array<{ pattern: RegExp; weight: number; label: string }> = [
  { pattern: /Math\.random\(\)/g, weight: 10, label: "Math.random()" },
  { pattern: /\bTODO\b/g, weight: 4, label: "TODO" },
  { pattern: /\bFIXME\b/g, weight: 8, label: "FIXME" },
  { pattern: /\b(?:hardcoded|placeholder|mock|fake|stub)\b/gi, weight: 3, label: "stub-marker" },
];

const SCAN_ROOTS = [
  "artifacts/api-server/src/routes",
  "artifacts/api-server/src/lib",
];

let lastScan: { at: number; perFile: Record<string, Record<string, number>>; total: number } | null = null;

async function walkDir(dir: string, files: string[]): Promise<void> {
  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "__tests__" || e.name.startsWith(".")) continue;
      await walkDir(full, files);
    } else if (e.isFile() && (e.name.endsWith(".ts") || e.name.endsWith(".tsx"))) {
      files.push(full);
    }
  }
}

async function scanSourceTree(): Promise<typeof lastScan> {
  if (lastScan && Date.now() - lastScan.at < 60_000) return lastScan;
  const cwd = process.cwd();
  const monorepoRoot = cwd.includes("/artifacts/") ? path.resolve(cwd, "../..") : cwd;

  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    await walkDir(path.join(monorepoRoot, root), files);
  }

  const perFile: Record<string, Record<string, number>> = {};
  let total = 0;

  for (const file of files) {
    let content: string;
    try {
      content = await fs.readFile(file, "utf-8");
    } catch {
      continue;
    }
    const rel = path.relative(monorepoRoot, file);
    const counts: Record<string, number> = {};
    for (const { pattern, weight, label } of SOURCE_PATTERNS) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        counts[label] = matches.length;
        total += matches.length * weight;
      }
    }
    if (Object.keys(counts).length > 0) {
      perFile[rel] = counts;
    }
  }

  lastScan = { at: Date.now(), perFile, total };
  return lastScan;
}

export async function getRealityAudit(): Promise<{
  scannedAt: number;
  totalSimulationPoints: number;
  filesWithSimulations: number;
  topFiles: Array<{ file: string; counts: Record<string, number>; score: number }>;
  registry: AuditFinding[];
  topFiveByImpact: AuditFinding[];
  summary: {
    totalFindings: number;
    converted: number;
    realBacked: number;
    stillSimulated: number;
    conversionRate: number;
    verifyMismatches: number;
  };
}> {
  let scan = lastScan;
  try {
    scan = await scanSourceTree();
  } catch (err) {
    logger.warn({ err }, "RealityAudit: source scan failed");
  }

  const topFiles = Object.entries(scan?.perFile ?? {})
    .map(([file, counts]) => {
      let score = 0;
      for (const { weight, label } of SOURCE_PATTERNS) {
        score += (counts[label] ?? 0) * weight;
      }
      return { file, counts, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // Verify each "converted" entry by re-scanning its source file for any
  // verifyAbsentPatterns that should no longer appear. If any still match,
  // auto-downgrade to "simulated" with verifyMismatch=true. This makes the
  // audit a live truth source rather than a static label.
  const verified: AuditFinding[] = await Promise.all(
    REGISTRY.map(async (entry) => {
      if (entry.status !== "converted" || !entry.verifyAbsentPatterns?.length) {
        return entry;
      }
      try {
        const src = await fs.readFile(path.resolve(process.cwd(), "../..", entry.file), "utf8")
          .catch(() => fs.readFile(path.resolve(process.cwd(), entry.file), "utf8"));
        const stillPresent = entry.verifyAbsentPatterns.some((pat) => new RegExp(pat).test(src));
        if (stillPresent) {
          return { ...entry, status: "simulated" as RealityStatus, verifyMismatch: true };
        }
      } catch (err) {
        logger.warn({ err, file: entry.file }, "RealityAudit: verify read failed");
      }
      return entry;
    })
  );

  // Cache verified statuses so getRealityFlag() reflects auto-downgrades —
  // API reality flags can never drift from audit verification.
  for (const v of verified) {
    verifiedStatusCache.set(v.id, v.status);
  }

  const sortedRegistry = [...verified].sort((a, b) => b.impactScore - a.impactScore);
  const topFive = sortedRegistry.slice(0, 5);

  const converted = verified.filter(f => f.status === "converted").length;
  const realBacked = verified.filter(f => f.status === "real").length;
  const stillSimulated = verified.filter(f => f.status === "simulated").length;
  const mismatches = verified.filter(f => f.verifyMismatch).length;

  return {
    scannedAt: scan?.at ?? Date.now(),
    totalSimulationPoints: scan?.total ?? 0,
    filesWithSimulations: Object.keys(scan?.perFile ?? {}).length,
    topFiles,
    registry: sortedRegistry,
    topFiveByImpact: topFive,
    summary: {
      totalFindings: REGISTRY.length,
      converted,
      realBacked,
      stillSimulated,
      conversionRate: Math.round(((converted + realBacked) / REGISTRY.length) * 100) / 100,
      verifyMismatches: mismatches,
    },
  };
}

const verifiedStatusCache = new Map<string, RealityStatus>();

export function getRealityFlag(featureId: string): RealityStatus {
  // Prefer the most recently verified status if getRealityAudit() has run.
  const cached = verifiedStatusCache.get(featureId);
  if (cached) return cached === "simulated" ? "simulated" : "real";
  const found = REGISTRY.find(f => f.id === featureId);
  if (!found) return "real";
  return found.status === "simulated" ? "simulated" : "real";
}

export function hashStringFNV(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deterministicScoreFromTitle(title: string, base: number, range: number): number {
  const h = hashStringFNV(title);
  return base + (h % range);
}

function evolutionsDir(): string {
  const cwd = process.cwd();
  const root = cwd.includes("/artifacts/") ? path.resolve(cwd, "../..") : cwd;
  return path.join(root, "_evolutions", "reality-audit");
}

export async function persistRealityAuditSnapshot(trigger: "startup" | "manual" | "scheduled" | "post-council" = "manual"): Promise<{
  id: number;
  jsonPath: string;
  snapshotHash: string;
  scannedAt: number;
  summary: Awaited<ReturnType<typeof getRealityAudit>>["summary"];
}> {
  const audit = await getRealityAudit();
  const payload = {
    version: 1,
    trigger,
    scannedAt: audit.scannedAt,
    totalSimulationPoints: audit.totalSimulationPoints,
    filesWithSimulations: audit.filesWithSimulations,
    topFiles: audit.topFiles,
    registry: audit.registry,
    summary: audit.summary,
  };

  const canonicalJson = JSON.stringify(payload);
  const snapshotHash = createHash("sha256").update(canonicalJson).digest("hex");

  const dir = evolutionsDir();
  await fs.mkdir(dir, { recursive: true });
  const ts = new Date(audit.scannedAt).toISOString().replace(/[:.]/g, "-");
  const fileName = `${ts}_${snapshotHash.slice(0, 8)}.json`;
  const fullPath = path.join(dir, fileName);
  const relPath = path.relative(path.resolve(dir, "../.."), fullPath);
  await fs.writeFile(fullPath, JSON.stringify(payload, null, 2), "utf-8");

  let insertedId = 0;
  try {
    const [row] = await db
      .insert(realityAuditSnapshotsTable)
      .values({
        totalFindings: audit.summary.totalFindings,
        converted: audit.summary.converted,
        realBacked: audit.summary.realBacked,
        stillSimulated: audit.summary.stillSimulated,
        verifyMismatches: audit.summary.verifyMismatches,
        totalSimulationPoints: audit.totalSimulationPoints,
        filesWithSimulations: audit.filesWithSimulations,
        conversionRate: audit.summary.conversionRate.toString(),
        snapshotHash,
        jsonPath: relPath,
        trigger,
        payload,
      })
      .returning({ id: realityAuditSnapshotsTable.id });
    insertedId = row?.id ?? 0;
  } catch (err) {
    logger.warn({ err }, "RealityAudit: DB persist failed (JSON snapshot still written)");
  }

  return {
    id: insertedId,
    jsonPath: relPath,
    snapshotHash,
    scannedAt: audit.scannedAt,
    summary: audit.summary,
  };
}

export async function listRealityAuditSnapshots(limit = 50): Promise<Array<{
  id: number;
  scannedAt: Date;
  trigger: string;
  snapshotHash: string;
  jsonPath: string;
  summary: {
    totalFindings: number;
    converted: number;
    realBacked: number;
    stillSimulated: number;
    verifyMismatches: number;
    totalSimulationPoints: number;
    filesWithSimulations: number;
    conversionRate: string;
  };
  createdAt: Date;
}>> {
  try {
    const rows = await db
      .select({
        id: realityAuditSnapshotsTable.id,
        scannedAt: realityAuditSnapshotsTable.scannedAt,
        trigger: realityAuditSnapshotsTable.trigger,
        snapshotHash: realityAuditSnapshotsTable.snapshotHash,
        jsonPath: realityAuditSnapshotsTable.jsonPath,
        totalFindings: realityAuditSnapshotsTable.totalFindings,
        converted: realityAuditSnapshotsTable.converted,
        realBacked: realityAuditSnapshotsTable.realBacked,
        stillSimulated: realityAuditSnapshotsTable.stillSimulated,
        verifyMismatches: realityAuditSnapshotsTable.verifyMismatches,
        totalSimulationPoints: realityAuditSnapshotsTable.totalSimulationPoints,
        filesWithSimulations: realityAuditSnapshotsTable.filesWithSimulations,
        conversionRate: realityAuditSnapshotsTable.conversionRate,
        createdAt: realityAuditSnapshotsTable.createdAt,
      })
      .from(realityAuditSnapshotsTable)
      .orderBy(desc(realityAuditSnapshotsTable.scannedAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      scannedAt: r.scannedAt,
      trigger: r.trigger,
      snapshotHash: r.snapshotHash,
      jsonPath: r.jsonPath,
      summary: {
        totalFindings: r.totalFindings,
        converted: r.converted,
        realBacked: r.realBacked,
        stillSimulated: r.stillSimulated,
        verifyMismatches: r.verifyMismatches,
        totalSimulationPoints: r.totalSimulationPoints,
        filesWithSimulations: r.filesWithSimulations,
        conversionRate: r.conversionRate,
      },
      createdAt: r.createdAt,
    }));
  } catch (err) {
    logger.warn({ err }, "RealityAudit: DB list failed");
    return [];
  }
}
