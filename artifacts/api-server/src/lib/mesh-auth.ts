import { createHash, timingSafeEqual } from "crypto";

const MIN_TOKEN_LENGTH = 8;

function hashSimple(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function validateMeshToken(token: string | undefined | null): string | null {
  if (!token || token.trim().length < MIN_TOKEN_LENGTH) return null;
  return hashSimple(token.trim());
}

/**
 * Strict admin-token validator for privileged operations.
 * Requires process.env.SOVEREIGN_ADMIN_TOKEN to be set and to match the provided
 * token via constant-time comparison. Returns false if the env var is unset —
 * privileged endpoints MUST refuse to operate without an explicit configured secret.
 */
export function validateSovereignAdminToken(token: string | undefined | null): boolean {
  const configured = process.env["SOVEREIGN_ADMIN_TOKEN"];
  if (!configured || configured.length < MIN_TOKEN_LENGTH) return false;
  if (!token || typeof token !== "string") return false;
  const a = Buffer.from(token.trim());
  const b = Buffer.from(configured);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
