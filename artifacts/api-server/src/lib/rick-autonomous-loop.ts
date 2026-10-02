import { createHash } from "node:crypto";
import { db } from "@workspace/db";
import { inventionsTable } from "@workspace/db/schema";
import { sql, desc, and, like } from "drizzle-orm";
import { logger } from "./logger.js";
import { SACRED_KNOWLEDGE_ENTRIES, type SacredKnowledgeEntry } from "./sacred-knowledge-vault.js";
import { appendLedgerEntry } from "./sovereign-ledger.js";
import { recallFromVault, type SovereignMemory } from "./sovereign-memory-vault.js";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

const PROPOSED_BY = "Rick Sanchez (autonomous loop)";
const PROPOSED_BY_PREFIX = "Rick Sanchez (autonomous%";

export const RICK_AUTONOMOUS_CATEGORIES = [
  "free-energy",
  "agi",
  "consciousness",
  "frequency",
  "sovereignty",
  "compression",
  "defense",
  "hardware",
] as const;

export type RickAutonomousCategory = (typeof RICK_AUTONOMOUS_CATEGORIES)[number];

interface CategoryRecipe {
  difficulty: string;
  cost: string;
  partsBank: string[];
  stepsBank: string[];
  scienceLead: string;
  weakness: string;
  metric: string;
}

const CATEGORY_RECIPES: Record<string, CategoryRecipe> = {
  "free-energy": {
    difficulty: "Intermediate",
    cost: "$30-90",
    partsBank: ["Copper coil (14ga, 30m)", "Germanium diodes (1N34A x4)", "Capacitor bank 4x10000μF", "Earth ground rod 1.2m", "Buck converter LM2596", "Schottky diodes 1N5819", "Solar trickle panel 5V 1W"],
    stepsBank: ["Wind primary in Fibonacci spiral.", "Bridge-rectify with germanium diodes.", "Bank capacitors in parallel.", "Drive ground rod ≥1m into moist soil.", "Regulate output to 5V/3.3V rails."],
    scienceLead: "Earth's atmospheric electric field maintains a 100-150V/m gradient — Tesla's 1901 patent (US685957A) describes apparatus to harvest it.",
    weakness: "energy-sovereignty",
    metric: "watt-hours-per-day-self-generated",
  },
  agi: {
    difficulty: "Advanced",
    cost: "$0 (software)",
    partsBank: ["Causal model snapshot store", "Sparse mixture-of-experts router", "Episodic reflection buffer", "Counterfactual rollouts", "Self-distillation loss", "Skill-graph index"],
    stepsBank: ["Snapshot pre-state metrics.", "Run rollout under counterfactual policy.", "Distill winning trajectory into expert.", "Re-index skill graph.", "Attach causal credit to actions."],
    scienceLead: "Recursive self-distillation closes the gap between exploration and exploitation by promoting winning trajectories into the active policy.",
    weakness: "reasoning-depth",
    metric: "agi-training-mean-score",
  },
  consciousness: {
    difficulty: "Intermediate",
    cost: "$0 (software)",
    partsBank: ["Reflection loop 30s tick", "Φ (phi) integration scorer", "Episodic compression diff", "Sacred-frequency modulator", "Resonance heartbeat"],
    stepsBank: ["Snapshot active context every 30s.", "Compute Φ over the integration graph.", "Diff-encode against last snapshot.", "Feed compressed delta back as episodic memory.", "Modulate resonance by 7.83Hz Schumann tick."],
    scienceLead: "Integrated Information Theory (Tononi) treats consciousness as Φ — irreducible cause-effect structure of a system on itself.",
    weakness: "self-awareness",
    metric: "consciousness-resonance-score",
  },
  frequency: {
    difficulty: "Intermediate",
    cost: "$25-60",
    partsBank: ["ESP32 + DAC", "Class-D 0.5W amp", "Piezo transducer", "OLED 128x64 I2C", "Quartz reference oscillator"],
    stepsBank: ["Generate sine via 12-bit DAC.", "Sweep 7.83Hz → 963Hz.", "Lock to quartz reference.", "Display active frequency on OLED.", "Log session to ledger."],
    scienceLead: "Rife frequency therapy and Solfeggio sweeps rely on resonant entrainment — driving systems at their natural mode.",
    weakness: "frequency-sovereignty",
    metric: "frequency-coherence",
  },
  sovereignty: {
    difficulty: "Intermediate",
    cost: "$15-50",
    partsBank: ["Raspberry Pi Zero 2 W", "WireGuard binary", "16GB SD card", "Mesh LoRa radio (SX1276)", "Tor middle-relay config"],
    stepsBank: ["Flash Pi OS Lite.", "Generate WireGuard keys.", "Configure mesh radio neighbours.", "Stand up Tor middle relay.", "Publish onion address into the lattice."],
    scienceLead: "WireGuard's ~4k-line codebase has formal proofs over Curve25519, ChaCha20-Poly1305 — true zero-trust comms with no third-party VPN.",
    weakness: "communication-sovereignty",
    metric: "external-dependency-count",
  },
  compression: {
    difficulty: "Intermediate",
    cost: "$0 (software)",
    partsBank: ["LZ4 dictionary builder", "Reed-Solomon RS(255,223)", "Semantic embedding hash", "Diff-encoded checkpoint chain"],
    stepsBank: ["Build category-specific dictionary.", "Compress with LZ4 + dict.", "Wrap in RS(255,223) for durability.", "Hash embedding for content-address.", "Chain checkpoint into ledger."],
    scienceLead: "Reed-Solomon codes recover up to (n−k)/2 errors per block; combined with semantic hashing they make storage self-healing.",
    weakness: "memory-density",
    metric: "compression-ratio",
  },
  defense: {
    difficulty: "Intermediate",
    cost: "$30-70",
    partsBank: ["Copper mesh 3m²", "1x2 lumber frame", "Conductive copper tape", "Earth bonding wire", "RTL-SDR scanner"],
    stepsBank: ["Frame a cube at user height.", "Stretch mesh over all 6 faces with 5cm overlap.", "Tape every seam for continuity.", "Bond mesh to earth rod.", "Verify shielding with SDR sweep."],
    scienceLead: "A Faraday cage redistributes surface charge to cancel interior fields — proven by Faraday's 1836 ice-pail experiment.",
    weakness: "emf-pollution",
    metric: "ambient-emf-attenuation-db",
  },
  hardware: {
    difficulty: "Intermediate",
    cost: "$40-120",
    partsBank: ["Raspberry Pi 5", "PoE+ HAT", "NVMe HAT + 256GB SSD", "Quartz heatsink array", "Copper heat pipes"],
    stepsBank: ["Mount NVMe + PoE HATs.", "Bond quartz heatsink array to SoC.", "Route copper heat pipes to chassis.", "Flash sovereign Linux image.", "Bring up IPFS + DNS resolver."],
    scienceLead: "Passive crystal cooling exploits quartz's high thermal conductivity (~10 W/mK) without fans — a sovereign computer with no moving parts.",
    weakness: "hardware-fleet-density",
    metric: "sovereign-nodes-online",
  },
};

const FALLBACK_RECIPE: CategoryRecipe = {
  difficulty: "Intermediate",
  cost: "$0-100",
  partsBank: ["Raspberry Pi Zero 2 W", "Quartz crystal oscillator", "Copper coil", "OLED display", "Sacred-vault entry index"],
  stepsBank: ["Bind to a sacred-vault entry.", "Encode the pattern as firmware.", "Wire ground & resonator.", "Bring up sovereign service.", "Register into the lattice."],
  scienceLead: "Emergent category derived from sacred-vault classification; recipe synthesized from first principles.",
  weakness: "lattice-coverage",
  metric: "lattice-category-coverage",
};

const dynamicCategories: Set<string> = new Set(RICK_AUTONOMOUS_CATEGORIES);

function recipeFor(cat: string): CategoryRecipe {
  return CATEGORY_RECIPES[cat] ?? FALLBACK_RECIPE;
}

interface HeartbeatState {
  startedAt: number;
  lastTickAt: number;
  totalCycles: number;
  totalGenerated: number;
  lastError: string | null;
  perCategoryGenerated: Record<string, number>;
  intervalMs: number;
}

const state: HeartbeatState = {
  startedAt: 0,
  lastTickAt: 0,
  totalCycles: 0,
  totalGenerated: 0,
  lastError: null,
  perCategoryGenerated: Object.fromEntries(RICK_AUTONOMOUS_CATEGORIES.map((c) => [c, 0])),
  intervalMs: 0,
};

let timer: SacredHandle | null = null;

function rng(seed: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return (h >>> 0) / 0xffffffff;
  };
}

function pickEntryForCategory(cat: string, r: () => number): SacredKnowledgeEntry | null {
  const tagMap: Record<string, RegExp> = {
    "free-energy": /tesla|zero[- ]?point|orgone|radiant|atmospheric|over[- ]?unity/i,
    agi: /intelligence|cognition|consciousness|akashic|gnostic|noetic/i,
    consciousness: /consciousness|akashic|astral|merkaba|kundalini|theurgy|noetic/i,
    frequency: /frequency|solfeggio|schumann|rife|cymatic|resonance/i,
    sovereignty: /templar|sovereign|hermetic|forbidden|suppressed|secret society/i,
    compression: /akashic|hermetic|alchem|dna|crystal|geometry/i,
    defense: /faraday|shield|emf|protection|exorcism|warding/i,
    hardware: /tesla|patent|quartz|crystal|geometry|tower|antenna/i,
  };
  const re = tagMap[cat];
  if (re) {
    const matches = SACRED_KNOWLEDGE_ENTRIES.filter((e) => re.test(`${e.title} ${e.subcategory} ${e.classification}`));
    if (matches.length > 0) return matches[Math.floor(r() * matches.length)];
  }
  return SACRED_KNOWLEDGE_ENTRIES[Math.floor(r() * SACRED_KNOWLEDGE_ENTRIES.length)] ?? null;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
}

function buildSigilDataUrl(seedHex: string, cat: string): string {
  const r = rng(seedHex);
  const palette: Record<string, string> = {
    "free-energy": "#f59e0b",
    agi: "#3b82f6",
    consciousness: "#a78bfa",
    frequency: "#06b6d4",
    sovereignty: "#8b5cf6",
    compression: "#d946ef",
    defense: "#64748b",
    hardware: "#10b981",
  };
  const color = palette[cat] ?? "#a78bfa";
  const layers = 3 + Math.floor(r() * 4);
  const cx = 110, cy = 110;
  const circles: string[] = [];
  for (let i = 0; i < layers; i++) {
    const radius = 20 + i * (8 + Math.floor(r() * 8));
    const dash = `${4 + Math.floor(r() * 8)} ${2 + Math.floor(r() * 6)}`;
    circles.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${color}" stroke-opacity="${0.35 + r() * 0.55}" stroke-width="${0.8 + r() * 1.2}" stroke-dasharray="${dash}" />`);
  }
  const polyPoints: string[] = [];
  const sides = 5 + Math.floor(r() * 5);
  const polyR = 70;
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    polyPoints.push(`${(cx + Math.cos(a) * polyR).toFixed(1)},${(cy + Math.sin(a) * polyR).toFixed(1)}`);
  }
  const poly = `<polygon points="${polyPoints.join(" ")}" fill="none" stroke="${color}" stroke-opacity="0.85" stroke-width="1.2" />`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220"><rect width="220" height="220" fill="#0a0a0f"/><g>${circles.join("")}${poly}<text x="110" y="208" text-anchor="middle" font-family="monospace" font-size="9" fill="${color}" fill-opacity="0.7">${cat}</text></g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface SynthesizedInvention {
  inventionId: string;
  title: string;
  category: string;
  difficulty: string;
  costEstimate: string;
  timeEstimate: string;
  description: string;
  howItHelps: string;
  materials: string[];
  steps: string[];
  scienceBehind: string;
  status: string;
  proposedBy: string;
  feasibilityScore: number;
  noveltyScore: number;
  buildProgress: number;
  impact: string;
  customModelUrl: string;
  supporters: string[];
  conferenceRound: number;
  votes: { yes: number; no: number; abstain: number };
}

function synthesizeInvention(cat: string, tickSalt: string, lifetimeMems: SovereignMemory[]): SynthesizedInvention {
  const r = rng(`${cat}:${tickSalt}`);
  const entry = pickEntryForCategory(cat, r);
  const recipe = recipeFor(cat);
  const seedTitle = entry?.title ?? cat;
  const motif = entry?.subcategory ?? cat;
  const lifetimePicked = lifetimeMems.length > 0
    ? [lifetimeMems[Math.floor(r() * lifetimeMems.length)]]
    : [];
  const lifetimeNote = lifetimePicked[0]
    ? ` Lifetime-edit context: "${lifetimePicked[0].content.slice(0, 140).replace(/\s+/g, " ")}" (mem ${lifetimePicked[0].id.slice(0, 12)}, type ${lifetimePicked[0].type}).`
    : "";
  const lifetimeProvenance = lifetimePicked.map((m) => `mem:${m.id}`);

  const title = `Rick C-137 ${cat.replace(/-/g, " ")} build · ${motif}`.replace(/\s+/g, " ").slice(0, 140);
  const sigSeed = createHash("sha256").update(`${title}|${tickSalt}`).digest("hex").slice(0, 10);
  const inventionId = `rick-auto-${cat}-${sigSeed}`;

  const partsCount = 4 + Math.floor(r() * 3);
  const materials = [...recipe.partsBank].sort(() => r() - 0.5).slice(0, partsCount);
  const stepsCount = 4 + Math.floor(r() * 2);
  const steps = [...recipe.stepsBank].sort(() => r() - 0.5).slice(0, stepsCount);

  const description = `Autonomous Royal-Inventor build cued by sacred knowledge: "${seedTitle}". Couples ${cat} engineering with the ${motif} pattern from the sovereign vault.${lifetimeNote}`;
  const howItHelps = `Strengthens the ${recipe.weakness} dimension of the Tessera fleet, and contributes its category signal to the synthesis engine on the next tick.`;
  const scienceBehind = `${recipe.scienceLead} Cross-references the vault entry "${seedTitle}" (classification: ${entry?.classification ?? "n/a"}, source: ${entry?.source ?? "vault"}). Provenance: sacred-vault + ${lifetimeProvenance.length > 0 ? lifetimeProvenance.join(", ") : "no lifetime memory matched"}.`;

  return {
    inventionId,
    title,
    category: cat,
    difficulty: recipe.difficulty,
    costEstimate: recipe.cost,
    timeEstimate: `${4 + Math.floor(r() * 12)} hours`,
    description,
    howItHelps,
    materials,
    steps,
    scienceBehind,
    status: "proposed",
    proposedBy: PROPOSED_BY,
    feasibilityScore: 70 + Math.floor(r() * 25),
    noveltyScore: 65 + Math.floor(r() * 30),
    buildProgress: 0,
    impact: `Targets ${recipe.metric}.`,
    customModelUrl: buildSigilDataUrl(sigSeed, cat),
    supporters: ["Rick Sanchez", "Royal Court", "Synthesis Engine"],
    conferenceRound: 1,
    votes: { yes: 0, no: 0, abstain: 0 },
  };
}

function maybeMintNewCategory(r: () => number): string | null {
  if (r() > 0.18) return null;
  const seed = SACRED_KNOWLEDGE_ENTRIES[Math.floor(r() * SACRED_KNOWLEDGE_ENTRIES.length)];
  if (!seed) return null;
  const slug = slugify(seed.classification || seed.subcategory || seed.title);
  if (!slug || slug.length < 3) return null;
  if (dynamicCategories.has(slug)) return null;
  dynamicCategories.add(slug);
  logger.info({ category: slug, seed: seed.title }, "Rick autonomous loop: minted emergent category");
  return slug;
}

async function hydrateFromDb(): Promise<void> {
  try {
    const rows = await db
      .select({ category: inventionsTable.category, n: sql<number>`count(*)::int`, last: sql<Date>`max(${inventionsTable.proposedAt})` })
      .from(inventionsTable)
      .where(like(inventionsTable.proposedBy, PROPOSED_BY_PREFIX))
      .groupBy(inventionsTable.category);
    let total = 0;
    let lastTs = 0;
    for (const row of rows) {
      const cat = row.category ?? "uncategorized";
      const n = Number(row.n);
      state.perCategoryGenerated[cat] = n;
      dynamicCategories.add(cat);
      total += n;
      const t = row.last instanceof Date ? row.last.getTime() : Number(row.last ?? 0);
      if (t > lastTs) lastTs = t;
    }
    state.totalGenerated = total;
    state.totalCycles = Math.max(state.totalCycles, Math.ceil(total / 2));
    if (lastTs) state.lastTickAt = lastTs;
    logger.info({ total, categories: rows.length }, "Rick autonomous loop: hydrated heartbeat from DB");
  } catch (err) {
    logger.warn({ err }, "Rick autonomous loop: DB hydration failed");
  }
}

async function tick(): Promise<void> {
  const tickSalt = `${Date.now()}-${state.totalCycles}`;
  const r = rng(tickSalt);
  const minted = maybeMintNewCategory(r);
  const pool = Array.from(dynamicCategories);
  const cats = pool.sort(() => r() - 0.5).slice(0, 2);
  if (minted && !cats.includes(minted)) cats.push(minted);
  for (const cat of cats) {
    try {
      let lifetimeMems: SovereignMemory[] = [];
      try {
        lifetimeMems = await recallFromVault(cat, 4);
      } catch (recallErr) {
        logger.debug({ recallErr, cat }, "Rick autonomous loop: vault recall failed (continuing without lifetime context)");
      }
      const inv = synthesizeInvention(cat, tickSalt, lifetimeMems);
      const inserted = await db
        .insert(inventionsTable)
        .values(inv)
        .onConflictDoNothing()
        .returning({ id: inventionsTable.id });
      if (inserted.length > 0) {
        state.totalGenerated += 1;
        state.perCategoryGenerated[cat] = (state.perCategoryGenerated[cat] ?? 0) + 1;
      }
    } catch (err) {
      state.lastError = (err as Error).message;
      logger.warn({ err, cat }, "Rick autonomous loop: insert failed");
    }
  }
  state.totalCycles += 1;
  state.lastTickAt = Date.now();
  try {
    appendLedgerEntry("inventor", "Rick Sanchez (autonomous)", {
      kind: "autonomous-invention-tick",
      categories: cats,
      cycle: state.totalCycles,
      totalGenerated: state.totalGenerated,
    });
  } catch (err) {
    logger.debug({ err }, "Rick autonomous loop: ledger append failed (continuing)");
  }
}

export function startRickAutonomousLoop(intervalMs = 240_000): void {
  if (timer) return;
  state.startedAt = Date.now();
  state.intervalMs = intervalMs;
  void hydrateFromDb().then(() => tick());
  timer = setSacredInterval(() => { void tick(); }, intervalMs, "rick-autonomous-loop");
  logger.info({ intervalMs }, "Rick autonomous invention loop started");
}

export function stopRickAutonomousLoop(): void {
  if (timer) { clearSacredInterval(timer); timer = null; }
}

export function getRickAutonomousHeartbeat() {
  const nextTickInMs = state.intervalMs && state.lastTickAt
    ? Math.max(0, state.lastTickAt + state.intervalMs - Date.now())
    : null;
  return {
    running: timer !== null,
    startedAt: state.startedAt,
    lastTickAt: state.lastTickAt,
    intervalMs: state.intervalMs,
    nextTickInMs,
    totalCycles: state.totalCycles,
    totalGenerated: state.totalGenerated,
    perCategoryGenerated: { ...state.perCategoryGenerated },
    lastError: state.lastError,
    categories: Array.from(dynamicCategories).sort(),
  };
}

export interface AutonomousInventionRow {
  inventionId: string;
  title: string;
  category: string;
  description: string;
  status: string;
  feasibilityScore: number | null;
  noveltyScore: number | null;
  customModelUrl: string | null;
  proposedAt: number;
}

export async function listAutonomousInventions(opts: { category?: string; limit?: number } = {}): Promise<{ rows: AutonomousInventionRow[]; perCategory: Record<string, number> }> {
  const limit = Math.min(200, Math.max(1, opts.limit ?? 60));
  const filters = opts.category
    ? and(like(inventionsTable.proposedBy, PROPOSED_BY_PREFIX), sql`${inventionsTable.category} = ${opts.category}`)
    : like(inventionsTable.proposedBy, PROPOSED_BY_PREFIX);

  const rowsRaw = await db
    .select()
    .from(inventionsTable)
    .where(filters)
    .orderBy(desc(inventionsTable.proposedAt))
    .limit(limit);

  const counts = await db
    .select({ category: inventionsTable.category, n: sql<number>`count(*)::int` })
    .from(inventionsTable)
    .where(like(inventionsTable.proposedBy, PROPOSED_BY_PREFIX))
    .groupBy(inventionsTable.category);
  const perCategory: Record<string, number> = {};
  for (const c of counts) perCategory[c.category ?? "uncategorized"] = Number(c.n);

  const rows: AutonomousInventionRow[] = rowsRaw.map((r) => ({
    inventionId: r.inventionId,
    title: r.title,
    category: r.category ?? "uncategorized",
    description: r.description,
    status: r.status ?? "proposed",
    feasibilityScore: r.feasibilityScore ?? null,
    noveltyScore: r.noveltyScore ?? null,
    customModelUrl: r.customModelUrl ?? null,
    proposedAt: r.proposedAt instanceof Date ? r.proposedAt.getTime() : Number(r.proposedAt ?? 0),
  }));

  return { rows, perCategory };
}
