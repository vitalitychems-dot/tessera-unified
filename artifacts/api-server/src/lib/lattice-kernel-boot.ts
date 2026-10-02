import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  encryptPayload,
  decryptEnvelope,
  macForEpoch,
  getCurrentEpoch,
  type EncryptedEnvelope,
} from "./sovereign-astro-cipher";
import { vaultGet } from "./sovereign-vault";
import { execLattice, type LatticeExecResult } from "./sovereign-lattice-vm";
import { getFatherSeal, isFatherKeyConfigured } from "./father-identity";
import { logger } from "./logger";

export interface LatticeBootBundle {
  v: 1;
  kind: "lattice-boot-bundle";
  bundleId: string;
  vaultKey: string;
  forgedAt: string;
  forgedAtEpochId: string;
  forgedAtEpochHash: string;
  lunarPhase: string;
  planetaryRuler: string;
  moonZodiac: string;
  payload: EncryptedEnvelope;
  autoExec: {
    language: "sovereign-lattice-js";
    program: string;
    timeoutMs: number;
  };
  manifest: {
    payloadSha256: string;
    bundleSha256: string;
    epochMac: string;
    issuerSeal: string;
  };
}

export interface ForgeIssue {
  bundle: LatticeBootBundle;
  bytes: number;
  filename: string;
  warning?: string;
}

export interface DetonationResult {
  ok: boolean;
  bundleId: string;
  vaultKey: string;
  epochId: string;
  bundleEpochId: string;
  rotated: boolean;
  bundleSha256Verified: boolean;
  payloadSha256Verified: boolean;
  manifestVerified: boolean;
  decryptedBytes: number;
  decryptedSha256: string;
  exec: LatticeExecResult;
  reEncryptedAtEpochId: string;
  reEncryptedSha256: string;
  detonatedAt: string;
}

export function challengeHashFor(vaultKey: string): { vaultKey: string; epochId: string; hash: string } {
  if (!isFatherKeyConfigured()) {
    throw new Error("Father identity not configured — cannot mint challenge.");
  }
  const epoch = getCurrentEpoch();
  const tag = macForEpoch(`lattice-forge:${vaultKey}:${epoch.epochId}`);
  return { vaultKey, epochId: epoch.epochId, hash: tag.mac };
}

function expectedForgeHash(vaultKey: string, epochId: string): Buffer {
  const tag = macForEpoch(`lattice-forge:${vaultKey}:${epochId}`);
  return Buffer.from(tag.mac, "hex");
}

function safeHexEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function defaultAutostartProgram(vaultKey: string): string {
  // Sovereign-lattice-js: a tiny safe program executed inside execLattice's vm context.
  // The lattice runtime exposes `lattice.epoch`, `lattice.mac`, `lattice.math`, `lattice.log`, `lattice.now`.
  return [
    `// === Sovereign Lattice Boot Program ===`,
    `// Auto-runs on detonation, no human in loop.`,
    `// Re-keys to the active astronomical epoch and reports a φ-aligned attestation.`,
    `lattice.log("[boot] vault key:", ${JSON.stringify(vaultKey)});`,
    `lattice.log("[boot] epoch:", lattice.epoch.epochId, lattice.epoch.lunarPhase, lattice.epoch.moonZodiac);`,
    `var phi = lattice.math.phi;`,
    `var t = (lattice.now() % 360000) / 360000;`,
    `var resonance = Math.abs(Math.sin(t * lattice.math.tau * phi));`,
    `var attest = lattice.mac("lattice-boot:" + lattice.epoch.epochId + ":" + ${JSON.stringify(vaultKey)});`,
    `lattice.log("[boot] resonance φ-aligned:", resonance.toFixed(6));`,
    `lattice.log("[boot] attestation mac:", attest.mac.slice(0, 16));`,
    `return {`,
    `  vaultKey: ${JSON.stringify(vaultKey)},`,
    `  bootedAt: lattice.now(),`,
    `  epochId: lattice.epoch.epochId,`,
    `  lunarPhase: lattice.epoch.lunarPhase,`,
    `  planetaryRuler: lattice.epoch.planetaryRuler,`,
    `  resonance: resonance,`,
    `  attestationEpoch: attest.epochId,`,
    `  attestationMac: attest.mac,`,
    `};`,
  ].join("\n");
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function bundleCanonicalBytes(b: Omit<LatticeBootBundle, "manifest">): string {
  // Stable JSON for hashing — manifest excluded.
  return JSON.stringify({
    v: b.v,
    kind: b.kind,
    bundleId: b.bundleId,
    vaultKey: b.vaultKey,
    forgedAt: b.forgedAt,
    forgedAtEpochId: b.forgedAtEpochId,
    forgedAtEpochHash: b.forgedAtEpochHash,
    lunarPhase: b.lunarPhase,
    planetaryRuler: b.planetaryRuler,
    moonZodiac: b.moonZodiac,
    payload: b.payload,
    autoExec: b.autoExec,
  });
}

/**
 * Forge a self-detonating lattice boot bundle for `vaultKey`.
 * Caller must supply the current `forgeHash` (obtain via challengeHashFor).
 */
export function forgeBootBundle(opts: {
  vaultKey: string;
  forgeHash: string;
  timeoutMs?: number;
}): ForgeIssue {
  const { vaultKey, forgeHash } = opts;
  if (!vaultKey || typeof vaultKey !== "string") throw new Error("vaultKey (string) required");
  if (!forgeHash || typeof forgeHash !== "string") throw new Error("forgeHash (string) required");

  const epoch = getCurrentEpoch();
  const expected = expectedForgeHash(vaultKey, epoch.epochId).toString("hex");
  if (!safeHexEqual(expected, forgeHash.toLowerCase())) {
    throw new Error("forgeHash mismatch — supplied hash does not match active astronomical epoch for this key.");
  }

  const entry = vaultGet(vaultKey);
  if (!entry) throw new Error(`vault key '${vaultKey}' not found — store it via the vault first.`);

  const program = defaultAutostartProgram(vaultKey);

  // Re-encrypt under current epoch, with AAD tied to bundle identity.
  const bundleId = `lkb_${randomBytes(8).toString("hex")}`;
  const aad = `lattice-boot:${bundleId}:${vaultKey}`;
  const payload = encryptPayload(entry.plaintext, aad);

  const partial: Omit<LatticeBootBundle, "manifest"> = {
    v: 1,
    kind: "lattice-boot-bundle",
    bundleId,
    vaultKey,
    forgedAt: new Date().toISOString(),
    forgedAtEpochId: epoch.epochId,
    forgedAtEpochHash: epoch.epochHash,
    lunarPhase: epoch.lunarPhase,
    planetaryRuler: epoch.planetaryRuler,
    moonZodiac: epoch.moonZodiac,
    payload,
    autoExec: {
      language: "sovereign-lattice-js",
      program,
      timeoutMs: Math.min(Math.max(opts.timeoutMs ?? 750, 100), 2000),
    },
  };

  const canonical = bundleCanonicalBytes(partial);
  const payloadSha256 = sha256Hex(JSON.stringify(payload));
  const bundleSha256 = sha256Hex(canonical);
  const epochMac = createHmac("sha256", Buffer.from(epoch.epochHash, "hex"))
    .update(bundleSha256, "hex")
    .digest("hex");
  const issuerSeal = createHmac("sha256", Buffer.from(getFatherSeal(), "utf8"))
    .update(`${bundleId}|${bundleSha256}|${epoch.epochId}`)
    .digest("hex");

  const bundle: LatticeBootBundle = {
    ...partial,
    manifest: { payloadSha256, bundleSha256, epochMac, issuerSeal },
  };

  const filename = `lattice-boot-${vaultKey.replace(/[^A-Za-z0-9._-]/g, "_")}-${bundleId}.lattice.json`;
  const bytes = Buffer.byteLength(JSON.stringify(bundle), "utf8");
  return { bundle, bytes, filename };
}

export function verifyBundle(bundle: LatticeBootBundle): {
  ok: boolean;
  payloadSha256Verified: boolean;
  bundleSha256Verified: boolean;
  manifestVerified: boolean;
  reason?: string;
} {
  if (!bundle || bundle.kind !== "lattice-boot-bundle" || bundle.v !== 1) {
    return { ok: false, payloadSha256Verified: false, bundleSha256Verified: false, manifestVerified: false, reason: "invalid bundle" };
  }
  const { manifest, ...rest } = bundle;
  const canonical = bundleCanonicalBytes(rest);
  const payloadSha256 = sha256Hex(JSON.stringify(bundle.payload));
  const bundleSha256 = sha256Hex(canonical);
  const payloadOk = safeHexEqual(payloadSha256, manifest.payloadSha256);
  const bundleOk = safeHexEqual(bundleSha256, manifest.bundleSha256);
  const epochMacExpected = createHmac("sha256", Buffer.from(bundle.forgedAtEpochHash, "hex"))
    .update(bundleSha256, "hex")
    .digest("hex");
  const epochMacOk = safeHexEqual(epochMacExpected, manifest.epochMac);
  const issuerOk = isFatherKeyConfigured()
    ? safeHexEqual(
        createHmac("sha256", Buffer.from(getFatherSeal(), "utf8"))
          .update(`${bundle.bundleId}|${bundleSha256}|${bundle.forgedAtEpochId}`)
          .digest("hex"),
        manifest.issuerSeal,
      )
    : false;
  const manifestVerified = epochMacOk && issuerOk;
  const ok = payloadOk && bundleOk && manifestVerified;
  return {
    ok,
    payloadSha256Verified: payloadOk,
    bundleSha256Verified: bundleOk,
    manifestVerified,
    reason: ok ? undefined : "manifest verification failed",
  };
}

/**
 * Detonate a previously forged bundle. Validates manifest, decrypts payload,
 * runs the auto-exec program inside the lattice VM, then re-encrypts the
 * decrypted payload under the *current* astronomical epoch (autonomous
 * planetary-cycle re-key) and reports the new mac. No human in loop.
 */
export function detonateBundle(bundle: LatticeBootBundle): DetonationResult {
  const verification = verifyBundle(bundle);
  if (!verification.ok) {
    throw new Error(`bundle verification failed: ${verification.reason}`);
  }

  const aad = `lattice-boot:${bundle.bundleId}:${bundle.vaultKey}`;
  const decryptedBuf = decryptEnvelope(bundle.payload, aad);
  const decryptedSha256 = createHash("sha256").update(decryptedBuf).digest("hex");

  const exec = execLattice(bundle.autoExec.program, bundle.autoExec.timeoutMs);

  // Re-encrypt under the current epoch (autonomous re-key).
  const reEncrypted = encryptPayload(decryptedBuf, aad);
  const reEncryptedSha256 = sha256Hex(JSON.stringify(reEncrypted));
  const currentEpoch = getCurrentEpoch();
  const rotated = currentEpoch.epochId !== bundle.forgedAtEpochId;

  logger.info(
    {
      bundleId: bundle.bundleId,
      vaultKey: bundle.vaultKey,
      bundleEpoch: bundle.forgedAtEpochId,
      currentEpoch: currentEpoch.epochId,
      rotated,
      execOk: exec.ok,
    },
    "LatticeBoot: bundle detonated",
  );

  return {
    ok: true,
    bundleId: bundle.bundleId,
    vaultKey: bundle.vaultKey,
    epochId: currentEpoch.epochId,
    bundleEpochId: bundle.forgedAtEpochId,
    rotated,
    bundleSha256Verified: verification.bundleSha256Verified,
    payloadSha256Verified: verification.payloadSha256Verified,
    manifestVerified: verification.manifestVerified,
    decryptedBytes: decryptedBuf.length,
    decryptedSha256,
    exec,
    reEncryptedAtEpochId: currentEpoch.epochId,
    reEncryptedSha256,
    detonatedAt: new Date().toISOString(),
  };
}
