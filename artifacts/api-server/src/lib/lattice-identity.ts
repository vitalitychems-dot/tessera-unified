import { createHash, createHmac, timingSafeEqual } from "node:crypto";

let cachedEphemeralDevSecret: string | null = null;

function getMasterSecret(): string {
  const explicit = process.env["SOVEREIGN_LATTICE_SECRET"];
  if (explicit && explicit.length >= 16) return explicit;
  const fallback = process.env["TESSERACT_ADMIN_KEY"] || process.env["FORUM_ADMIN_TOKEN"];
  if (fallback && fallback.length >= 16) {
    return createHash("sha256").update(`lattice-derive::${fallback}`).digest("hex");
  }
  if (process.env["NODE_ENV"] === "production") {
    throw new Error(
      "SOVEREIGN_LATTICE_SECRET (or TESSERACT_ADMIN_KEY / FORUM_ADMIN_TOKEN, ≥16 chars) MUST be set in production — refusing to derive lattice signatures from a hardcoded fallback.",
    );
  }
  if (!cachedEphemeralDevSecret) {
    cachedEphemeralDevSecret = createHash("sha256")
      .update(`lattice-ephemeral-dev::${process.pid}::${Date.now()}::${Math.random()}`)
      .digest("hex");
    // eslint-disable-next-line no-console
    console.warn("[lattice-identity] No master secret configured — using EPHEMERAL per-process dev secret. Set SOVEREIGN_LATTICE_SECRET to make signatures persistent across restarts.");
  }
  return cachedEphemeralDevSecret;
}

export function deriveAgentKey(agentName: string): string {
  const master = getMasterSecret();
  return createHmac("sha256", master).update(`agent::${agentName.trim().toLowerCase()}`).digest("hex");
}

export function getAgentPublicId(agentName: string): string {
  const key = deriveAgentKey(agentName);
  return createHash("sha256").update(`pub::${key}`).digest("hex").slice(0, 16);
}

export function signMessage(agentName: string, payload: string | object): string {
  const key = deriveAgentKey(agentName);
  const canonical = typeof payload === "string" ? payload : JSON.stringify(payload);
  return createHmac("sha256", key).update(canonical).digest("hex");
}

export function verifySignature(agentName: string, payload: string | object, signature: string): boolean {
  try {
    const expected = signMessage(agentName, payload);
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
