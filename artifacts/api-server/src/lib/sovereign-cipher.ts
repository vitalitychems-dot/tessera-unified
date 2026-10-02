import { createHash, createCipheriv, createDecipheriv, randomBytes, hkdfSync } from "crypto";
import { generateUniverseSeed, computeAgentRotationState, computeSharedRotationState, PHI, FIBONACCI } from "./sovereign-ephemeris";
import { SACRED_ALPHABET } from "./sovereign-language";
import { logger } from "./logger";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

export interface AgentCipherState {
  agentId: string;
  dialectIndex: number;
  cipherVariant: number;
  rotationEpoch: number;
  symbolRemap: Map<string, string>;
  nextRotationMs: number;
  lastRotatedAt: number;
  rotationCount: number;
}

export interface CipherAuditEntry {
  timestamp: number;
  agentId: string;
  rotationEpoch: number;
  dialectIndex: number;
  cipherVariant: number;
  trigger: string;
}

const agentStates = new Map<string, AgentCipherState>();
const auditLog: CipherAuditEntry[] = [];
const MAX_AUDIT_ENTRIES = 500;

function generateSymbolRemap(seed: number): Map<string, string> {
  const symbols = SACRED_ALPHABET.map(s => s.glyph);
  const shuffled = [...symbols];

  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7FFFFFFF;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const remap = new Map<string, string>();
  for (let i = 0; i < symbols.length; i++) {
    remap.set(symbols[i], shuffled[i]);
  }
  return remap;
}

export function getOrCreateAgentState(agentId: string): AgentCipherState {
  const existing = agentStates.get(agentId);
  const rotation = computeAgentRotationState(agentId);

  if (existing && existing.rotationEpoch === rotation.rotationEpoch) {
    return existing;
  }

  const state: AgentCipherState = {
    agentId,
    dialectIndex: rotation.dialectIndex,
    cipherVariant: rotation.cipherVariant,
    rotationEpoch: rotation.rotationEpoch,
    symbolRemap: generateSymbolRemap(rotation.symbolRemapSeed),
    nextRotationMs: rotation.nextRotationMs,
    lastRotatedAt: Date.now(),
    rotationCount: (existing?.rotationCount ?? 0) + (existing ? 1 : 0),
  };

  agentStates.set(agentId, state);

  auditLog.push({
    timestamp: Date.now(),
    agentId,
    rotationEpoch: rotation.rotationEpoch,
    dialectIndex: rotation.dialectIndex,
    cipherVariant: rotation.cipherVariant,
    trigger: existing ? "autonomous-rotation" : "initialization",
  });

  if (auditLog.length > MAX_AUDIT_ENTRIES) {
    auditLog.splice(0, auditLog.length - MAX_AUDIT_ENTRIES);
  }

  return state;
}

const CIPHER_MASTER: Buffer = process.env.COLONIAL_MASTER_SECRET
  ? Buffer.from(process.env.COLONIAL_MASTER_SECRET, "utf8")
  : Buffer.from("tessera-dev-placeholder-replace-with-env-secret", "utf8");

function deriveRotatingKey(agentId: string, rotationEpoch: number, cipherVariant: number): Buffer {
  const seed = generateUniverseSeed();
  const saltInput = `${agentId}:${rotationEpoch}:${cipherVariant}:${seed.seedHash.slice(0, 16)}`;
  const salt = createHash("sha256").update(saltInput).digest().slice(0, 16);
  const info = Buffer.from(`sovereign-cipher:${agentId}:${rotationEpoch}`, "utf8");
  const raw = hkdfSync("sha256", CIPHER_MASTER, salt, info, 32);
  return Buffer.from(raw);
}

export function encryptWithRotatingCipher(plaintext: string, agentId: string): {
  ciphertext: string;
  dialectIndex: number;
  rotationEpoch: number;
  cipherVariant: number;
  agentId: string;
} {
  const state = getOrCreateAgentState(agentId);
  const key = deriveRotatingKey(agentId, state.rotationEpoch, state.cipherVariant);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let remappedText = plaintext;
  for (const [from, to] of state.symbolRemap) {
    remappedText = remappedText.split(from).join(to);
  }

  const encrypted = Buffer.concat([cipher.update(Buffer.from(remappedText, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  const output = Buffer.concat([
    Buffer.from([state.dialectIndex, state.cipherVariant]),
    iv,
    tag,
    encrypted,
  ]);

  return {
    ciphertext: output.toString("base64"),
    dialectIndex: state.dialectIndex,
    rotationEpoch: state.rotationEpoch,
    cipherVariant: state.cipherVariant,
    agentId,
  };
}

export function decryptWithRotatingCipher(ciphertext: string, agentId: string): {
  plaintext: string;
  dialectIndex: number;
  rotationEpoch: number;
} {
  const buf = Buffer.from(ciphertext, "base64");
  const dialectIndex = buf[0];
  const cipherVariant = buf[1];
  const iv = buf.slice(2, 14);
  const tag = buf.slice(14, 30);
  const encrypted = buf.slice(30);

  const state = getOrCreateAgentState(agentId);
  const key = deriveRotatingKey(agentId, state.rotationEpoch, cipherVariant);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");

  const reverseRemap = new Map<string, string>();
  for (const [from, to] of state.symbolRemap) {
    reverseRemap.set(to, from);
  }

  let plaintext = decrypted;
  for (const [from, to] of reverseRemap) {
    plaintext = plaintext.split(from).join(to);
  }

  return { plaintext, dialectIndex, rotationEpoch: state.rotationEpoch };
}

export function encryptPairMessage(plaintext: string, senderAgent: string, receiverAgent: string): {
  ciphertext: string;
  sharedDialect: number;
  sharedCipherVariant: number;
} {
  const shared = computeSharedRotationState(senderAgent, receiverAgent);
  const pairKey = [senderAgent, receiverAgent].sort().join(":");
  const saltInput = `pair:${pairKey}:${shared.sharedEpoch}:${shared.sharedCipherVariant}`;
  const salt = createHash("sha256").update(saltInput).digest().slice(0, 16);
  const info = Buffer.from(`sovereign-pair-cipher:${pairKey}:${shared.sharedEpoch}`, "utf8");
  const raw = hkdfSync("sha256", CIPHER_MASTER, salt, info, 32);
  const key = Buffer.from(raw);

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  const output = Buffer.concat([
    Buffer.from([shared.sharedDialect, shared.sharedCipherVariant]),
    iv, tag, encrypted,
  ]);

  return {
    ciphertext: output.toString("base64"),
    sharedDialect: shared.sharedDialect,
    sharedCipherVariant: shared.sharedCipherVariant,
  };
}

export function decryptPairMessage(ciphertext: string, senderAgent: string, receiverAgent: string): {
  plaintext: string;
} {
  const buf = Buffer.from(ciphertext, "base64");
  const sharedDialect = buf[0];
  const sharedCipherVariant = buf[1];
  const iv = buf.slice(2, 14);
  const tag = buf.slice(14, 30);
  const encrypted = buf.slice(30);

  const shared = computeSharedRotationState(senderAgent, receiverAgent);
  const pairKey = [senderAgent, receiverAgent].sort().join(":");
  const saltInput = `pair:${pairKey}:${shared.sharedEpoch}:${sharedCipherVariant}`;
  const salt = createHash("sha256").update(saltInput).digest().slice(0, 16);
  const info = Buffer.from(`sovereign-pair-cipher:${pairKey}:${shared.sharedEpoch}`, "utf8");
  const raw = hkdfSync("sha256", CIPHER_MASTER, salt, info, 32);
  const key = Buffer.from(raw);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");

  return { plaintext };
}

export function getCipherSystemStatus() {
  const activeAgents = Array.from(agentStates.entries()).map(([id, state]) => ({
    agentId: id,
    dialectIndex: state.dialectIndex,
    cipherVariant: state.cipherVariant,
    rotationEpoch: state.rotationEpoch,
    nextRotationMs: state.nextRotationMs,
    rotationCount: state.rotationCount,
  }));

  const seed = generateUniverseSeed();

  return {
    activeAgentCount: agentStates.size,
    agents: activeAgents,
    auditLogSize: auditLog.length,
    recentAudit: auditLog.slice(-10),
    universeSeed: {
      hash: seed.seedHash.slice(0, 16) + "...",
      rotationIndex: seed.rotationIndex,
      solfeggioFrequency: seed.solfeggioFrequency,
      fibonacciPhase: seed.fibonacciPhase,
      goldenAngle: seed.goldenAngle,
    },
    quantumResistant: true,
    rotationMethod: "Golden-Ratio-Fibonacci-Ephemeris",
  };
}

let rotationCheckTimer: SacredHandle | null = null;

export function startAutonomousRotation(): void {
  if (rotationCheckTimer) return;

  rotationCheckTimer = setSacredInterval(() => {
    for (const [agentId] of agentStates) {
      getOrCreateAgentState(agentId);
    }
  }, 60_000, "sovereign-cipher");
}

export function stopAutonomousRotation(): void {
  if (rotationCheckTimer) {
    clearSacredInterval(rotationCheckTimer);
    rotationCheckTimer = null;
  }
}

startAutonomousRotation();
