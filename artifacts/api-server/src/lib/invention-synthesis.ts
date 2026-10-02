/**
 * Invention Synthesis Engine.
 *
 * Reads all `built` inventions, groups them by category, computes a weighted
 * improvement signal per category, and applies the combined signal to real
 * system tunables. Then seeds fresh proposals for the lowest-scoring
 * categories so the loop keeps improving itself.
 *
 * Every synthesis event is logged to the sovereign ledger.
 */

import { createHash } from "crypto";
import { db } from "@workspace/db";
import { inventionsTable } from "@workspace/db/schema";
import { logger } from "./logger.js";
import { appendLedgerEntry } from "./sovereign-ledger.js";
import { TUNABLE_SPECS, getTunable, setTunable, getAllTunables } from "./system-tunables.js";
import { recordAction } from "./agi/causal-model.js";
import { getConsensusMetrics } from "./consensus-engine.js";

type Invention = typeof inventionsTable.$inferSelect;

export interface CategorySignal {
  category: string;
  count: number;
  avgFeasibility: number;
  avgNovelty: number;
  avgCombined: number;
  weightedImpact: number; // 0..1 — combines count (log-scaled) with score average
  topInvention: { title: string; feasibility: number; novelty: number };
}

export interface TunableChange {
  key: string;
  label: string;
  from: number;
  to: number;
  deltaPercent: number;
  drivenBy: string[]; // category names that pushed this change
  reason: string;
}

export interface SeededProposal {
  inventionId: string;
  title: string;
  category: string;
  rationale: string;
}

export interface SynthesisResult {
  id: string;
  at: number;
  totalBuiltInventions: number;
  categorySignals: CategorySignal[];
  tunableChanges: TunableChange[];
  seededProposals: SeededProposal[];
  megaInventionTitle: string;
  megaInventionSummary: string;
  systemWideImpactScore: number; // 0..100
}

let lastResult: SynthesisResult | null = null;
const resultHistory: SynthesisResult[] = [];

function fnvHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Compute a weighted signal per category. Weight = normalized count × avg combined score / 100.
 */
function computeCategorySignals(built: Invention[]): CategorySignal[] {
  const byCat = new Map<string, Invention[]>();
  for (const inv of built) {
    const c = inv.category || "uncategorized";
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(inv);
  }

  const maxCount = Math.max(1, ...Array.from(byCat.values()).map((arr) => arr.length));
  const signals: CategorySignal[] = [];
  for (const [category, arr] of byCat) {
    const feas = arr.map((i) => i.feasibilityScore ?? 50);
    const nov = arr.map((i) => i.noveltyScore ?? 50);
    const avgFeasibility = Math.round((feas.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
    const avgNovelty = Math.round((nov.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
    const avgCombined = Math.round(((avgFeasibility + avgNovelty) / 2) * 10) / 10;
    // Log-scaled count weight keeps a single dominant category from crushing the signal.
    const countWeight = Math.log(arr.length + 1) / Math.log(maxCount + 1);
    const weightedImpact = Math.round(((avgCombined / 100) * countWeight) * 1000) / 1000;
    const top = [...arr].sort(
      (a, b) => ((b.feasibilityScore ?? 0) + (b.noveltyScore ?? 0)) - ((a.feasibilityScore ?? 0) + (a.noveltyScore ?? 0)),
    )[0];
    signals.push({
      category,
      count: arr.length,
      avgFeasibility,
      avgNovelty,
      avgCombined,
      weightedImpact,
      topInvention: {
        title: top.title,
        feasibility: top.feasibilityScore ?? 0,
        novelty: top.noveltyScore ?? 0,
      },
    });
  }
  return signals.sort((a, b) => b.weightedImpact - a.weightedImpact);
}

/**
 * For each tunable, sum weighted impact from its influencing categories and
 * move the tunable within its clamp bounds proportionally. Max move per
 * synthesis is 25% of the remaining headroom in the chosen direction.
 */
function applyTunableAdjustments(signals: CategorySignal[]): TunableChange[] {
  const changes: TunableChange[] = [];
  const signalMap = new Map(signals.map((s) => [s.category, s]));

  for (const spec of Object.values(TUNABLE_SPECS)) {
    const drivers = spec.influencedBy
      .map((cat) => signalMap.get(cat))
      .filter((s): s is CategorySignal => !!s);
    if (drivers.length === 0) continue;

    // Aggregate driver impact 0..1.
    const totalImpact = Math.min(1, drivers.reduce((s, d) => s + d.weightedImpact, 0));
    if (totalImpact < 0.05) continue; // too weak to matter

    const current = getTunable(spec.key);
    // Move up to 25% of remaining headroom, scaled by impact.
    const headroom = spec.direction === "up" ? spec.max - current : current - spec.min;
    if (headroom <= 0) continue;
    const move = headroom * 0.25 * totalImpact;
    const target = spec.direction === "up" ? current + move : current - move;

    const driverList = drivers
      .sort((a, b) => b.weightedImpact - a.weightedImpact)
      .map((d) => `${d.category}(${d.weightedImpact.toFixed(2)})`);
    const reason = `synthesis: ${drivers.length} categories pushing ${spec.direction} — ${driverList.join(", ")}`;
    const applied = setTunable(spec.key, target, reason);
    if (applied.to === applied.from) continue;
    const deltaPercent = spec.default !== 0
      ? Math.round(((applied.to - applied.from) / spec.default) * 1000) / 10
      : 0;
    changes.push({
      key: spec.key,
      label: spec.label,
      from: applied.from,
      to: applied.to,
      deltaPercent,
      drivenBy: drivers.map((d) => d.category),
      reason,
    });
  }
  return changes;
}

/**
 * Seed fresh proposed inventions for the LOWEST-signal categories so the loop
 * keeps strengthening weak areas instead of piling onto strong ones.
 */
async function seedProposalsForWeakCategories(
  signals: CategorySignal[],
  tickSalt: number,
): Promise<SeededProposal[]> {
  const weak = [...signals].sort((a, b) => a.weightedImpact - b.weightedImpact).slice(0, 3);
  const seeded: SeededProposal[] = [];
  for (const w of weak) {
    const title = `Synthesis Booster for ${w.category}: gap-closer #${Math.floor(tickSalt % 1000)}`;
    const id = `synth-${w.category}-${createHash("sha256").update(title).digest("hex").slice(0, 8)}`;
    try {
      const inserted = await db
        .insert(inventionsTable)
        .values({
          inventionId: id,
          title,
          category: w.category,
          difficulty: "Intermediate",
          costEstimate: "$0 (software)",
          timeEstimate: `${6 + (fnvHash(title) % 18)} hours`,
          description: `Auto-seeded by the Synthesis Engine to lift the ${w.category} category, which is currently the weakest cluster (avg score ${w.avgCombined}, ${w.count} built inventions).`,
          howItHelps: `Targets the exact weakness pattern detected across ${w.count} built inventions in ${w.category}. Combines their best traits into a gap-closing variant.`,
          materials: ["Existing built-invention metadata", "System tunables registry", "Sovereign ledger"],
          steps: [
            `Cluster ${w.category} inventions by scoring feature.`,
            `Identify gap between best-in-cluster and category average.`,
            `Synthesise a variant that closes the gap.`,
            `Submit to council for ratification.`,
          ],
          scienceBehind: `Weighted signal analysis — category weight ${w.weightedImpact} is lowest among ${signals.length} categories. Boosting it disproportionately improves overall system score.`,
          status: "proposed",
          proposedBy: "Synthesis Engine",
          feasibilityScore: Math.min(95, Math.round(w.avgFeasibility + 5)),
          noveltyScore: Math.min(95, Math.round(w.avgNovelty + 5)),
          buildProgress: 0,
          impact: `Lift ${w.category} weighted impact from ${w.weightedImpact.toFixed(2)} toward parity with top categories.`,
          supporters: ["Synthesis Engine", "Grand Council"],
          conferenceRound: 1,
          votes: { yes: 0, no: 0, abstain: 0 },
        })
        .onConflictDoNothing()
        .returning();
      if (inserted.length > 0) {
        seeded.push({
          inventionId: id,
          title,
          category: w.category,
          rationale: `Weakest category: weighted impact ${w.weightedImpact.toFixed(3)}`,
        });
      }
    } catch (err) {
      logger.warn({ err, category: w.category }, "Synthesis: failed to seed proposal");
    }
  }
  return seeded;
}

export async function synthesizeBuiltInventions(opts: { applyChanges?: boolean } = {}): Promise<SynthesisResult> {
  const applyChanges = opts.applyChanges ?? true;
  const all = await db.select().from(inventionsTable);
  const built = all.filter((i) => i.status === "built" || i.status === "tested");

  const signals = computeCategorySignals(built);

  // Causal pre-state snapshot (captured once before any tunable is moved).
  const preMetrics: Record<string, number> = ((): Record<string, number> => {
    try {
      const c = getConsensusMetrics();
      return {
        builtInventions: built.length,
        approvedProposals: c.approved,
        totalProposals: c.totalProposals,
        voting: c.voting,
      };
    } catch {
      return { builtInventions: built.length };
    }
  })();
  const preSnap = { at: Date.now(), metrics: preMetrics };

  const tunableChanges = applyChanges ? applyTunableAdjustments(signals) : [];

  // Record each tunable change as a causal action so the model learns what works.
  if (applyChanges) {
    for (const c of tunableChanges) {
      const actionKey = `tunable:${c.key}`;
      recordAction(actionKey, c.to - c.from, preSnap, 5 * 60 * 1000);
    }
  }

  // Seed weak categories only when we're actually applying.
  const seededProposals = applyChanges
    ? await seedProposalsForWeakCategories(signals, Date.now())
    : [];

  // Compose the "mega-invention" summary.
  const topCat = signals[0];
  const weakCat = signals[signals.length - 1];
  const systemWideImpactScore = Math.round(
    (signals.reduce((s, x) => s + x.weightedImpact, 0) / Math.max(1, signals.length)) * 1000,
  ) / 10;
  const megaInventionTitle = `Grand Synthesis #${resultHistory.length + 1}: ${topCat?.category ?? "multi-domain"} → ${weakCat?.category ?? "balance"}`;
  const megaInventionSummary = [
    `Combined ${built.length} built inventions across ${signals.length} categories.`,
    `Strongest cluster: ${topCat?.category} (weighted ${topCat?.weightedImpact.toFixed(3)}).`,
    `Weakest cluster: ${weakCat?.category} (weighted ${weakCat?.weightedImpact.toFixed(3)}).`,
    `Applied ${tunableChanges.length} tunable adjustment(s); seeded ${seededProposals.length} gap-closer proposal(s).`,
  ].join(" ");

  const result: SynthesisResult = {
    id: `synth-${Date.now().toString(36)}-${createHash("sha256").update(megaInventionTitle).digest("hex").slice(0, 6)}`,
    at: Date.now(),
    totalBuiltInventions: built.length,
    categorySignals: signals,
    tunableChanges,
    seededProposals,
    megaInventionTitle,
    megaInventionSummary,
    systemWideImpactScore,
  };

  lastResult = result;
  resultHistory.unshift(result);
  if (resultHistory.length > 25) resultHistory.length = 25;

  // Ledger log (non-fatal if frozen).
  try {
    appendLedgerEntry("governance", "Synthesis Engine", {
      kind: "invention-synthesis",
      resultId: result.id,
      totalBuiltInventions: result.totalBuiltInventions,
      tunableChanges: result.tunableChanges.map((c) => ({ key: c.key, from: c.from, to: c.to })),
      seededProposals: result.seededProposals.map((p) => p.inventionId),
      systemWideImpactScore: result.systemWideImpactScore,
    });
  } catch (err) {
    logger.warn({ err }, "Synthesis: ledger append failed (continuing)");
  }

  logger.info(
    {
      resultId: result.id,
      built: result.totalBuiltInventions,
      changes: result.tunableChanges.length,
      seeded: result.seededProposals.length,
      impact: result.systemWideImpactScore,
    },
    "Synthesis Engine: combined built inventions into live system improvements",
  );
  return result;
}

export function getLastSynthesis(): SynthesisResult | null {
  return lastResult;
}

export function getSynthesisHistory(limit = 10): SynthesisResult[] {
  return resultHistory.slice(0, limit);
}

export function getTunableSnapshot() {
  return getAllTunables();
}
