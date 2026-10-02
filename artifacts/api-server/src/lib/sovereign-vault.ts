import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  encryptPayload,
  decryptEnvelope,
  maybeRotate,
  getCurrentEpoch,
  type EncryptedEnvelope,
} from "./sovereign-astro-cipher";
import { logger } from "./logger";

interface VaultEntry {
  key: string;
  envelope: EncryptedEnvelope;
  updatedAt: string;
  notes?: string;
}

interface VaultFile {
  version: 1;
  entries: Record<string, VaultEntry>;
  lastRewrapEpoch?: string;
  lastRewrapAt?: string;
}

const VAULT_PATH =
  process.env.SOVEREIGN_VAULT_PATH ?? join(process.cwd(), "_evolutions", "sovereign-vault.json");

let _state: VaultFile = { version: 1, entries: {} };
let _loaded = false;

function ensureLoaded(): void {
  if (_loaded) return;
  try {
    if (existsSync(VAULT_PATH)) {
      const raw = readFileSync(VAULT_PATH, "utf8");
      const parsed = JSON.parse(raw) as VaultFile;
      if (parsed?.version === 1 && parsed.entries) _state = parsed;
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message, path: VAULT_PATH }, "SovereignVault: failed to load — starting fresh");
  }
  _loaded = true;
}

function persist(): void {
  try {
    mkdirSync(dirname(VAULT_PATH), { recursive: true });
    writeFileSync(VAULT_PATH, JSON.stringify(_state, null, 2), "utf8");
  } catch (err) {
    logger.warn({ err: (err as Error).message, path: VAULT_PATH }, "SovereignVault: persist failed");
  }
}

export function vaultPut(key: string, plaintext: string, notes?: string): VaultEntry {
  ensureLoaded();
  if (!key || typeof key !== "string") throw new Error("vaultPut: key required");
  const envelope = encryptPayload(plaintext, `vault:${key}`);
  const entry: VaultEntry = { key, envelope, updatedAt: new Date().toISOString(), notes };
  _state.entries[key] = entry;
  persist();
  return entry;
}

export function vaultGet(key: string): { key: string; plaintext: string; envelope: EncryptedEnvelope; updatedAt: string } | null {
  ensureLoaded();
  const entry = _state.entries[key];
  if (!entry) return null;
  const buf = decryptEnvelope(entry.envelope, `vault:${key}`);
  return { key, plaintext: buf.toString("utf8"), envelope: entry.envelope, updatedAt: entry.updatedAt };
}

export function vaultDelete(key: string): boolean {
  ensureLoaded();
  if (!_state.entries[key]) return false;
  delete _state.entries[key];
  persist();
  return true;
}

export function vaultList(): Array<{ key: string; epochId: string; updatedAt: string; notes?: string }> {
  ensureLoaded();
  return Object.values(_state.entries).map((e) => ({
    key: e.key,
    epochId: e.envelope.epochId,
    updatedAt: e.updatedAt,
    notes: e.notes,
  }));
}

export interface RewrapResult {
  rewrapped: number;
  failed: number;
  failedKeys: string[];
  fromEpochSpread: number;
  toEpochId: string;
  rotatedJustNow: boolean;
}

export function rewrapAll(): RewrapResult {
  ensureLoaded();
  const rotation = maybeRotate();
  const targetEpoch = getCurrentEpoch();
  let rewrapped = 0;
  let failed = 0;
  const failedKeys: string[] = [];
  const seenFromEpochs = new Set<string>();
  for (const entry of Object.values(_state.entries)) {
    if (entry.envelope.epochId === targetEpoch.epochId) continue;
    seenFromEpochs.add(entry.envelope.epochId);
    try {
      const decrypted = decryptEnvelope(entry.envelope, `vault:${entry.key}`);
      const fresh = encryptPayload(decrypted, `vault:${entry.key}`);
      entry.envelope = fresh;
      entry.updatedAt = new Date().toISOString();
      rewrapped++;
    } catch (err) {
      failed++;
      failedKeys.push(entry.key);
      logger.warn(
        { key: entry.key, epochId: entry.envelope.epochId, err: (err as Error).message },
        "SovereignVault: rewrap failed for entry — keeping prior envelope",
      );
    }
  }
  _state.lastRewrapEpoch = targetEpoch.epochId;
  _state.lastRewrapAt = new Date().toISOString();
  if (rewrapped > 0 || failed > 0) persist();
  return {
    rewrapped,
    failed,
    failedKeys,
    fromEpochSpread: seenFromEpochs.size,
    toEpochId: targetEpoch.epochId,
    rotatedJustNow: rotation.rotated,
  };
}

export function vaultStatus() {
  ensureLoaded();
  const epoch = getCurrentEpoch();
  const entries = Object.values(_state.entries);
  const epochCounts: Record<string, number> = {};
  for (const e of entries) {
    epochCounts[e.envelope.epochId] = (epochCounts[e.envelope.epochId] ?? 0) + 1;
  }
  return {
    path: VAULT_PATH,
    totalEntries: entries.length,
    currentEpochId: epoch.epochId,
    entriesPerEpoch: epochCounts,
    lastRewrapEpoch: _state.lastRewrapEpoch ?? null,
    lastRewrapAt: _state.lastRewrapAt ?? null,
  };
}
