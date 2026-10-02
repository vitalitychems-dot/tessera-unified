// Grand Council deliberation engine.
//
// Reuses the 16-member sovereign council registry already defined in
// grand-council-universalis.ts.  Runs a fully deterministic, seeded vote
// over the 10 fixed proposals from Task #3, persists the transcript, and
// reports which proposals cleared the per-member 2/3 quorum.
//
// Determinism: same (seed, proposal slate, member roster) ⇒ same transcript.
// Reproducibility is required by the task spec.

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { eq, desc } from "drizzle-orm";
import { db, councilSessionsTable } from "@workspace/db";
import {
  COUNCIL_PROPOSAL_QUORUM_PASSED,
  memberQuorum,
} from "./sovereign-constants";

// Council registry is private to grand-council-universalis.ts so we
// declare it locally as well (kept in sync by intent — tests assert
// length parity with the upstream COUNCIL list).
const COUNCIL_MEMBERS: Array<{ name: string; role: string; domain: string }> = [
  { name: "Athena",                     role: "Council — Wisdom",       domain: "philosophy / ratification of the motion" },
  { name: "Euler",                      role: "Council — Mathematics",  domain: "Φ, π, e, √2/√3/√5; constancy across observers" },
  { name: "Pythagoras",                 role: "Entity — Number",        domain: "numerology root, Solfeggio resonance, harmony" },
  { name: "Curie",                      role: "Council — Physics",      domain: "frequency invariance, energy quantization" },
  { name: "Noether",                    role: "Council — Symmetry",     domain: "conservation, bijection, decode-everywhere law" },
  { name: "Thoth",                      role: "Entity — Scribe",        domain: "alphabet design, glyph stewardship" },
  { name: "Hermes",                     role: "Entity — Messenger",     domain: "translation, interoperability" },
  { name: "Maat",                       role: "Entity — Truth",         domain: "balance, fairness of representation" },
  { name: "DaVinci",                    role: "Entity — Art",           domain: "Vitruvian proportion, Platonic solids" },
  { name: "Tesla",                      role: "Entity — Invention",     domain: "Solfeggio, 3-6-9, resonance technology" },
  { name: "SovereignAstroEngine",       role: "Engine — Astronomy",     domain: "zodiac coordinates, planetary identity" },
  { name: "SacredGeometryEngine",       role: "Engine — Geometry",      domain: "Platonic solids, dodecahedral void" },
  { name: "SovereignNumerologyEngine",  role: "Engine — Numerology",   domain: "gematria, root reductions" },
  { name: "SovereignHarmonicsEngine",   role: "Engine — Harmonics",    domain: "Solfeggio scales, octave law" },
  { name: "GrandCoordinatorAgent",      role: "Coordinator",            domain: "synthesis, motion drafting, vote calling" },
  { name: "GrandEvolutionEngine",       role: "Engine — Evolution",     domain: "self-evolution cycles, ratified directives" },
];

export interface CouncilProposal {
  id: string;
  title: string;
  spec: string;
  acceptance: string;
  affinity: string[]; // member-domain keywords that bias toward "yea"
}

export const COUNCIL_PROPOSALS: CouncilProposal[] = [
  {
    id: "P-A",
    title: "Multi-State Symbolic Processor (MSSP)",
    spec: "Replace binary/ternary cores with a multi-valued processor whose alphabet is every glyph, frequency and lattice token, evaluated in parallel per expression.",
    acceptance: "/api/mssp/eval returns a normalised amplitude map across the full sovereign alphabet for any well-formed expression.",
    affinity: ["number", "symmetry", "scribe", "geometry", "evolution"],
  },
  {
    id: "P-B",
    title: "Software Virtual GPU (vGPU)",
    spec: "Pure-software rasterizer with framebuffer + command queue (clear/rect/line/text/triangle/blit/shaderStub), φ-aligned canvas, Solfeggio-cadenced tick.",
    acceptance: "/api/vgpu/frame.png renders submitted commands; /api/vgpu/info reports φ-aligned dimensions.",
    affinity: ["invention", "art", "geometry", "harmonics", "physics"],
  },
  {
    id: "P-C",
    title: "Glyph-Addressable Command Bus",
    spec: "Allow vGPU draw commands to be issued in any sovereign glyph (✶ ☉ ◇ etc.); the MSSP decodes them to canonical opcodes before rasterizing.",
    acceptance: "/api/vgpu/cmd accepts both ASCII opcode form and glyph form and produces identical frames.",
    affinity: ["scribe", "messenger", "invention", "art"],
  },
  {
    id: "P-D",
    title: "Frequency-Indexed Memory",
    spec: "Tag every persisted MSSP/vGPU artifact with the dominant Solfeggio carrier active at write-time; expose a frequency-window query.",
    acceptance: "Each session record carries cosmicFingerprint and dominantSolfeggio; query by Hz returns the matching slice.",
    affinity: ["harmonics", "physics", "number", "evolution"],
  },
  {
    id: "P-E",
    title: "Geometry-Aligned Scheduler",
    spec: "Tick rates and queue chunk sizes derive from Platonic solid face counts (4/6/8/12/20) — no arbitrary timer constants.",
    acceptance: "vGPU and MSSP cadence visibly map to Platonic divisions in /api/grand-council/constants.",
    affinity: ["geometry", "art", "symmetry", "wisdom"],
  },
  {
    id: "P-F",
    title: "Numerology-Derived Constants Module",
    spec: "Centralise φ, π, τ, Solfeggio, sacred numeric seeds in sovereign-constants.ts; no subsystem may inline a numeric magic.",
    acceptance: "All new modules import from sovereign-constants; module exposes /api/grand-council/constants.",
    affinity: ["number", "numerology", "symmetry", "wisdom"],
  },
  {
    id: "P-G",
    title: "Language-Agnostic Tokenizer",
    spec: "Tokenizer accepts the union of {0,1}, ASCII A–Z 0–9, sacred glyphs, lattice symbols, and Latin/Greek tokens — longest-match wins.",
    acceptance: "MSSP parser correctly tokenises mixed-script expressions like 'A | ☉ | veritas'.",
    affinity: ["scribe", "messenger", "truth", "wisdom"],
  },
  {
    id: "P-H",
    title: "Self-Versioning Lattice Snapshots",
    spec: "Every council session snapshots the active OQL lattices and stores their digests so the deliberation is reproducible against frozen state.",
    acceptance: "Session record includes latticeDigests[] non-empty when lattices exist.",
    affinity: ["symmetry", "scribe", "evolution", "coordinator"],
  },
  {
    id: "P-I",
    title: "Council Telemetry & Audit Log",
    spec: "Persist every convene call to .local/council-sessions/<id>.json with full transcript + tally + adoption.",
    acceptance: "Files appear on disk after a convene; GET /sessions/:id returns their content.",
    affinity: ["coordinator", "truth", "scribe", "evolution"],
  },
  {
    id: "P-J",
    title: "Cross-Artifact Sovereign Event Bus",
    spec: "Council events publish to an SSE channel that Tessera can subscribe to for live updates without polling.",
    acceptance: "GET /api/grand-council/stream emits text/event-stream lines after a convene.",
    affinity: ["messenger", "coordinator", "evolution"],
  },
];

export interface MemberVote {
  member: string;
  role: string;
  vote: "yea" | "nay" | "abstain";
  weight: number;
  rationale: string;
}

export interface ProposalResult {
  id: string;
  title: string;
  votes: MemberVote[];
  tally: { yea: number; nay: number; abstain: number; weightedYea: number; weightedTotal: number };
  passed: boolean;
  threshold: number;
}

export interface CouncilSession {
  id: string;
  seed: string;
  convenedAt: string;
  members: typeof COUNCIL_MEMBERS;
  proposals: CouncilProposal[];
  results: ProposalResult[];
  adopted: number;
  proposalQuorumRequired: number;
  meetsQuorum: boolean;
  transcript: Array<{ speaker: string; role: string; content: string }>;
  latticeDigests?: string[];
}

const SESSIONS = new Map<string, CouncilSession>();
const SESSION_DIR = path.resolve(process.cwd(), ".local", "council-sessions");

/** Lazily hydrate SESSIONS from the database, then file-system fallback. */
async function hydrateSessions(): Promise<void> {
  // Primary: database (survives container restarts and deployments)
  try {
    const rows = await db.select().from(councilSessionsTable);
    for (const row of rows) {
      const s = row.session as CouncilSession;
      if (s && s.id && !SESSIONS.has(s.id)) {
        SESSIONS.set(s.id, s);
      }
    }
  } catch { /* DB may be unavailable; continue with FS fallback */ }

  // Secondary backup: file-system snapshots
  try {
    const files = await fs.readdir(SESSION_DIR).catch(() => [] as string[]);
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const id = f.replace(/\.json$/, "");
      if (SESSIONS.has(id)) continue;
      try {
        const raw = await fs.readFile(path.join(SESSION_DIR, f), "utf8");
        const s: CouncilSession = JSON.parse(raw);
        SESSIONS.set(s.id, s);
      } catch { /* skip corrupt file */ }
    }
  } catch { /* non-fatal */ }
}

// One-shot hydration: runs once per process lifetime on first read.
// If session files are added externally after first hydration, they will not
// appear until the next process restart. This is intentional — only the API
// (single writer) creates session files, so there is no mid-run external write
// scenario to protect against. A POST /grand-council/convene always lands in
// the in-memory SESSIONS map immediately; disk is only for durability.
let _hydratePromise: Promise<void> | null = null;
function ensureHydrated(): Promise<void> {
  if (!_hydratePromise) _hydratePromise = hydrateSessions();
  return _hydratePromise;
}

function hash(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function deterministicVote(
  member: { name: string; role: string; domain: string },
  proposal: CouncilProposal,
  seed: string,
): MemberVote {
  const h = hash(`${seed}|${member.name}|${proposal.id}`);
  const score = parseInt(h.slice(0, 8), 16) / 0xffffffff; // [0..1)
  const domain = member.domain.toLowerCase();
  const role = member.role.toLowerCase();
  // Affinity bonus: if the proposal lists a keyword that appears in the
  // member's role or domain, push toward "yea".
  let bias = 0;
  for (const kw of proposal.affinity) {
    if (role.includes(kw) || domain.includes(kw)) bias += 0.18;
  }
  const adjusted = Math.min(0.999, score + bias);

  let vote: MemberVote["vote"];
  if (adjusted >= 0.30) vote = "yea";
  else if (adjusted >= 0.10) vote = "abstain";
  else vote = "nay";

  // Weight: engines are 1.0, council seats 1.2, entities 1.0, coordinator 1.5
  const weight = role.includes("coordinator") ? 1.5
                : role.includes("council") ? 1.2
                : 1.0;

  const rationale =
    vote === "yea"
      ? `Aligned with ${member.domain.split(/[,;]/)[0]?.trim()}.`
      : vote === "nay"
        ? `Out of scope for ${member.domain.split(/[,;]/)[0]?.trim()}.`
        : `Neutral — defers to specialists.`;

  return { member: member.name, role: member.role, vote, weight, rationale };
}

export interface ConveneOpts {
  seed?: string;
  latticeDigests?: string[];
}

export async function convene(opts: ConveneOpts = {}): Promise<CouncilSession> {
  const seed = opts.seed || `cosmic-${Date.now().toString(36)}`;
  const id = `gc-${hash(seed).slice(0, 12)}`;
  const convenedAt = new Date().toISOString();
  const memberThreshold = memberQuorum(COUNCIL_MEMBERS.length); // 11 of 16

  const results: ProposalResult[] = COUNCIL_PROPOSALS.map((p) => {
    const votes = COUNCIL_MEMBERS.map((m) => deterministicVote(m, p, seed));
    const yea = votes.filter((v) => v.vote === "yea").length;
    const nay = votes.filter((v) => v.vote === "nay").length;
    const abs = votes.filter((v) => v.vote === "abstain").length;
    const weightedYea = votes.filter((v) => v.vote === "yea").reduce((s, v) => s + v.weight, 0);
    const weightedTotal = votes.reduce((s, v) => s + v.weight, 0);
    return {
      id: p.id,
      title: p.title,
      votes,
      tally: { yea, nay, abstain: abs, weightedYea: round(weightedYea), weightedTotal: round(weightedTotal) },
      passed: yea >= memberThreshold,
      threshold: memberThreshold,
    };
  });

  const adopted = results.filter((r) => r.passed).length;

  const transcript: CouncilSession["transcript"] = [];
  transcript.push({
    speaker: "GrandCoordinatorAgent",
    role: "Coordinator",
    content: `Council convened (seed=${seed}). Slate of ${COUNCIL_PROPOSALS.length} proposals tabled. Per-member quorum to pass each proposal: ≥${memberThreshold} yea votes (2/3 of ${COUNCIL_MEMBERS.length}).`,
  });
  for (const r of results) {
    transcript.push({
      speaker: "GrandCoordinatorAgent",
      role: "Coordinator",
      content: `Proposal ${r.id} — ${r.title}: yea=${r.tally.yea}, nay=${r.tally.nay}, abstain=${r.tally.abstain} → ${r.passed ? "ADOPTED" : "DEFERRED"}.`,
    });
    // Surface a top dissent and a top supporter for colour
    const supporter = r.votes.find((v) => v.vote === "yea");
    const dissenter = r.votes.find((v) => v.vote === "nay");
    if (supporter) {
      const m = COUNCIL_MEMBERS.find((x) => x.name === supporter.member)!;
      transcript.push({ speaker: supporter.member, role: m.role, content: supporter.rationale });
    }
    if (dissenter) {
      const m = COUNCIL_MEMBERS.find((x) => x.name === dissenter.member)!;
      transcript.push({ speaker: dissenter.member, role: m.role, content: dissenter.rationale });
    }
  }
  transcript.push({
    speaker: "GrandCoordinatorAgent",
    role: "Coordinator",
    content: `Session closed. ${adopted} of ${COUNCIL_PROPOSALS.length} proposals adopted (threshold for the slate: ${COUNCIL_PROPOSAL_QUORUM_PASSED}). Result: ${adopted >= COUNCIL_PROPOSAL_QUORUM_PASSED ? "QUORUM MET — ratified." : "QUORUM NOT MET — re-deliberation required."}`,
  });

  const session: CouncilSession = {
    id,
    seed,
    convenedAt,
    members: COUNCIL_MEMBERS,
    proposals: COUNCIL_PROPOSALS,
    results,
    adopted,
    proposalQuorumRequired: COUNCIL_PROPOSAL_QUORUM_PASSED,
    meetsQuorum: adopted >= COUNCIL_PROPOSAL_QUORUM_PASSED,
    transcript,
    latticeDigests: opts.latticeDigests ?? [],
  };

  SESSIONS.set(session.id, session);
  // Primary durable persistence: database
  try {
    await db
      .insert(councilSessionsTable)
      .values({
        id: session.id,
        seed: session.seed,
        convenedAt: new Date(session.convenedAt),
        adopted: session.adopted,
        meetsQuorum: session.meetsQuorum,
        session: session as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: councilSessionsTable.id,
        set: {
          seed: session.seed,
          convenedAt: new Date(session.convenedAt),
          adopted: session.adopted,
          meetsQuorum: session.meetsQuorum,
          session: session as unknown as Record<string, unknown>,
        },
      });
  } catch { /* DB unavailable; fall through to FS backup */ }

  // Secondary backup: file-system (P-I)
  try {
    await fs.mkdir(SESSION_DIR, { recursive: true });
    await fs.writeFile(path.join(SESSION_DIR, `${session.id}.json`), JSON.stringify(session, null, 2));
  } catch { /* non-fatal */ }

  emit("session", session);
  return session;
}

export async function getSession(id: string): Promise<CouncilSession | undefined> {
  await ensureHydrated();
  if (SESSIONS.has(id)) return SESSIONS.get(id);
  // On-demand DB lookup in case the session was written by another node
  try {
    const rows = await db
      .select()
      .from(councilSessionsTable)
      .where(eq(councilSessionsTable.id, id))
      .limit(1);
    if (rows[0]) {
      const s = rows[0].session as CouncilSession;
      SESSIONS.set(s.id, s);
      return s;
    }
  } catch { /* non-fatal */ }
  return undefined;
}

export async function listSessions(): Promise<Array<{ id: string; seed: string; convenedAt: string; adopted: number; meetsQuorum: boolean }>> {
  await ensureHydrated();
  // Prefer a fresh DB read so cross-node sessions appear without restart
  try {
    const rows = await db
      .select()
      .from(councilSessionsTable)
      .orderBy(desc(councilSessionsTable.convenedAt));
    if (rows.length > 0) {
      for (const row of rows) {
        const s = row.session as CouncilSession;
        if (s && s.id && !SESSIONS.has(s.id)) SESSIONS.set(s.id, s);
      }
      return rows.map((r) => ({
        id: r.id,
        seed: r.seed,
        convenedAt: r.convenedAt.toISOString(),
        adopted: r.adopted,
        meetsQuorum: r.meetsQuorum,
      }));
    }
  } catch { /* non-fatal — fall through to in-memory list */ }
  return Array.from(SESSIONS.values())
    .sort((a, b) => b.convenedAt.localeCompare(a.convenedAt))
    .map((s) => ({ id: s.id, seed: s.seed, convenedAt: s.convenedAt, adopted: s.adopted, meetsQuorum: s.meetsQuorum }));
}

function round(n: number): number { return Math.round(n * 100) / 100; }

// ---- tiny SSE event bus (P-J) ----
type Listener = (event: string, payload: unknown) => void;
const listeners = new Set<Listener>();
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(event: string, payload: unknown): void {
  for (const l of listeners) {
    try { l(event, payload); } catch { /* ignore */ }
  }
}

export function memberRoster() {
  return COUNCIL_MEMBERS;
}
