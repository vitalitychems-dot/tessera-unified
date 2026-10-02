import { createHash, createHmac, randomBytes } from "crypto";
import { logger } from "./logger";

export type LedgerKind =
  | "council-meeting"
  | "council-decision"
  | "agent-attestation"
  | "red-team-finding"
  | "self-check"
  | "system-event"
  | "corpus-amendment"
  | "governance"
  | "inventor";

export interface LedgerEntry {
  index: number;
  ts: number;
  kind: LedgerKind;
  actor: string;
  payload: Record<string, unknown>;
  prevHash: string;
  hash: string;
  signature: string;
}

export interface LedgerVerification {
  ok: boolean;
  entries: number;
  firstBadIndex: number | null;
  reason?: string;
}

const GENESIS_HASH = "0".repeat(64);
const SECRET =
  process.env.SOVEREIGN_LEDGER_SECRET ||
  process.env.MESH_AUTH_SECRET ||
  "tessera-sovereign-ledger-v1";

const chain: LedgerEntry[] = [];
const MAX_ENTRIES = 5000;

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return "{" + keys.map(k => JSON.stringify(k) + ":" + canonicalize((value as Record<string, unknown>)[k])).join(",") + "}";
}

function hashEntry(e: Omit<LedgerEntry, "hash" | "signature">): string {
  const material = canonicalize({
    index: e.index,
    ts: e.ts,
    kind: e.kind,
    actor: e.actor,
    payload: e.payload,
    prevHash: e.prevHash,
  });
  return createHash("sha256").update(material).digest("hex");
}

function signHash(hash: string): string {
  return createHmac("sha256", SECRET).update(hash).digest("hex");
}

let _ledgerFrozen = false;
let _freezeReason = "";
export function freezeLedger(reason: string): void {
  _ledgerFrozen = true;
  _freezeReason = reason;
}
export function unfreezeLedger(): void {
  _ledgerFrozen = false;
  _freezeReason = "";
}
export function isLedgerFrozen(): { frozen: boolean; reason: string } {
  return { frozen: _ledgerFrozen, reason: _freezeReason };
}

export function appendLedgerEntry(
  kind: LedgerKind,
  actor: string,
  payload: Record<string, unknown>,
): LedgerEntry {
  if (_ledgerFrozen && actor !== "auto-healer") {
    throw new Error(`Ledger is quarantined: ${_freezeReason}. Writes suspended pending recovery.`);
  }
  const prev = chain[chain.length - 1];
  const base = {
    index: prev ? prev.index + 1 : 0,
    ts: Date.now(),
    kind,
    actor,
    payload,
    prevHash: prev ? prev.hash : GENESIS_HASH,
  };
  const hash = hashEntry(base);
  const signature = signHash(hash);
  const entry: LedgerEntry = { ...base, hash, signature };
  chain.push(entry);
  if (chain.length > MAX_ENTRIES) chain.splice(0, chain.length - MAX_ENTRIES);
  return entry;
}

export function verifyLedger(): LedgerVerification {
  let prevHash = chain.length > 0 && chain[0].index === 0 ? GENESIS_HASH : chain[0]?.prevHash ?? GENESIS_HASH;
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    if (e.prevHash !== prevHash) {
      return { ok: false, entries: chain.length, firstBadIndex: i, reason: "prevHash mismatch" };
    }
    const expected = hashEntry({ index: e.index, ts: e.ts, kind: e.kind, actor: e.actor, payload: e.payload, prevHash: e.prevHash });
    if (expected !== e.hash) {
      return { ok: false, entries: chain.length, firstBadIndex: i, reason: "hash mismatch (tamper detected)" };
    }
    const expectedSig = signHash(e.hash);
    if (expectedSig !== e.signature) {
      return { ok: false, entries: chain.length, firstBadIndex: i, reason: "signature mismatch" };
    }
    prevHash = e.hash;
  }
  return { ok: true, entries: chain.length, firstBadIndex: null };
}

export function getLedger(opts: { limit?: number; kind?: LedgerKind; since?: number } = {}): LedgerEntry[] {
  let out = chain;
  if (opts.kind) out = out.filter(e => e.kind === opts.kind);
  if (opts.since !== undefined) out = out.filter(e => e.ts >= opts.since!);
  if (opts.limit !== undefined) out = out.slice(-opts.limit);
  return out.slice();
}

export function getLedgerStats() {
  const byKind: Record<string, number> = {};
  for (const e of chain) byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
  const first = chain[0];
  const last = chain[chain.length - 1];
  return {
    entries: chain.length,
    byKind,
    firstTs: first?.ts ?? null,
    lastTs: last?.ts ?? null,
    lastHash: last?.hash ?? GENESIS_HASH,
    genesisHash: GENESIS_HASH,
  };
}

export interface AttestationKeypair {
  agentId: string;
  publicId: string;
  privateSecret: string;
  createdAt: number;
}

const agentKeys = new Map<string, AttestationKeypair>();

export function getOrCreateAgentKey(agentId: string): AttestationKeypair {
  const existing = agentKeys.get(agentId);
  if (existing) return existing;
  const privateSecret = randomBytes(32).toString("hex");
  const publicId = createHash("sha256").update(agentId + ":" + privateSecret).digest("hex").slice(0, 32);
  const kp: AttestationKeypair = { agentId, publicId, privateSecret, createdAt: Date.now() };
  agentKeys.set(agentId, kp);
  return kp;
}

export function attestAgentAction(
  agentId: string,
  actionKind: string,
  data: Record<string, unknown>,
): LedgerEntry {
  const kp = getOrCreateAgentKey(agentId);
  const material = canonicalize({ agentId, actionKind, data });
  const agentSig = createHmac("sha256", kp.privateSecret).update(material).digest("hex");
  return appendLedgerEntry("agent-attestation", agentId, {
    actionKind,
    data,
    agentPublicId: kp.publicId,
    agentSignature: agentSig,
  });
}

export function verifyAgentAttestation(entry: LedgerEntry): boolean {
  if (entry.kind !== "agent-attestation") return false;
  const agentId = entry.actor;
  const kp = agentKeys.get(agentId);
  if (!kp) return false;
  const { actionKind, data, agentSignature } = entry.payload as {
    actionKind: string;
    data: Record<string, unknown>;
    agentSignature: string;
  };
  const material = canonicalize({ agentId, actionKind, data });
  const expected = createHmac("sha256", kp.privateSecret).update(material).digest("hex");
  return expected === agentSignature;
}

export function listAgentKeys(): Array<{ agentId: string; publicId: string; createdAt: number }> {
  return Array.from(agentKeys.values()).map(k => ({
    agentId: k.agentId,
    publicId: k.publicId,
    createdAt: k.createdAt,
  }));
}

let seeded = false;
export function seedFoundingCouncilEntry(): void {
  if (seeded) return;
  seeded = true;
  try {
    appendLedgerEntry("council-meeting", "Grand Council", {
      session: "founding-meeting-2026-04-16",
      quorum: 24,
      majority: 0.667,
      motionsConsidered: 15,
      motionsPassed: 12,
      summary:
        "Founding audit-ledger session. 12 motions approved for implementation: cryptographic ledger, red-team agent, sovereign grammar, local embeddings, dream→response bridge, portal-gun router v2, sacred-geometry consensus weights, sovereign mockup library, prometheus metrics, agent attestation chain, transcript UI, sovereignty self-check.",
    });
    logger.info({ entries: chain.length }, "SovereignLedger: founding council meeting sealed");
  } catch (err) {
    logger.warn({ err }, "SovereignLedger: failed to seed founding entry");
  }
}
