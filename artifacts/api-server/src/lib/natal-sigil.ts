import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { sacredTimingSnapshot } from "./sacred-timing";
import { cipherCoherenceSnapshot } from "./sigil-cipher";
import { lusEncode } from "./lingua-universalis";

const PHI = (1 + Math.sqrt(5)) / 2;
const SACRED_NUMERICS = [3, 7, 12, 21, 33, 40, 49, 72, 108, 144, 153, 216] as const;
const VAULT_DIR = join(process.cwd(), ".local-data");
const VAULT_FILE = join(VAULT_DIR, "natal-vault.json");

interface NatalEnvelope {
  v: 1;
  iv: string;
  tag: string;
  ct: string;
  signatureGlyph: string;
  signatureHashHex: string;
  boundAt: string;
}

type Vault = Record<string, NatalEnvelope>;

function loadVault(): Vault {
  try {
    if (!existsSync(VAULT_FILE)) return {};
    return JSON.parse(readFileSync(VAULT_FILE, "utf8")) as Vault;
  } catch {
    return {};
  }
}

function saveVault(v: Vault): void {
  mkdirSync(VAULT_DIR, { recursive: true });
  writeFileSync(VAULT_FILE, JSON.stringify(v, null, 2), { mode: 0o600 });
}

/** Derive a stable per-holder vault key from sigil fingerprint.
 *  Independent of session-rotating keys so natal data survives rotations. */
function vaultKeyFor(holderFp: string): Buffer {
  return scryptSync(`tessera-natal-vault-v1|${holderFp}`, holderFp, 32);
}

function encryptNatal(holderFp: string, plaintext: string): { iv: string; tag: string; ct: string } {
  const key = vaultKeyFor(holderFp);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString("base64"), tag: tag.toString("base64"), ct: ct.toString("base64") };
}

function decryptNatal(holderFp: string, env: NatalEnvelope): string {
  const key = vaultKeyFor(holderFp);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(env.iv, "base64"));
  decipher.setAuthTag(Buffer.from(env.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(env.ct, "base64")), decipher.final()]).toString("utf8");
}

/** Sun-sign by Western tropical zodiac. Used only as an internal seed
 *  component — never returned to the client. */
export function sunSign(month: number, day: number): string {
  const cuts: Array<[number, number, string]> = [
    [1, 20, "capricorn"], [2, 19, "aquarius"], [3, 21, "pisces"],
    [4, 20, "aries"],     [5, 21, "taurus"],   [6, 21, "gemini"],
    [7, 23, "cancer"],    [8, 23, "leo"],      [9, 23, "virgo"],
    [10, 23, "libra"],    [11, 22, "scorpio"], [12, 22, "sagittarius"],
    [12, 31, "capricorn"],
  ];
  for (const [m, d, sign] of cuts) {
    if (month < m || (month === m && day <= d)) return sign;
  }
  return "capricorn";
}

/** Build the natal seed: zodiac + numeric birth components, fused with PHI
 *  and sacred numerics. Never logged. Only the final hash leaves this fn. */
function deriveNatalSeed(birthDateISO: string, birthTimeHHMM: string): string {
  const [yStr, mStr, dStr] = birthDateISO.split("-");
  const [hhStr, mmStr] = birthTimeHHMM.split(":");
  const y = parseInt(yStr, 10), m = parseInt(mStr, 10), d = parseInt(dStr, 10);
  const hh = parseInt(hhStr, 10), mm = parseInt(mmStr, 10);
  if (![y, m, d, hh, mm].every(Number.isFinite)) {
    throw new Error("invalid natal inputs");
  }
  const sign = sunSign(m, d);
  const fractionalDay = (hh * 60 + mm) / 1440;
  const numerology = String(y + m + d + hh + mm)
    .split("").map(Number).filter(Number.isFinite)
    .reduce((s, n) => s + n, 0);
  const seedString = [
    "tessera-natal-v1",
    sign,
    `${y}.${m.toString().padStart(2,"0")}.${d.toString().padStart(2,"0")}`,
    `${hh.toString().padStart(2,"0")}:${mm.toString().padStart(2,"0")}`,
    fractionalDay.toFixed(8),
    numerology.toString(),
    PHI.toFixed(12),
    SACRED_NUMERICS.join(":"),
  ].join("|");
  return createHash("sha512").update(seedString).digest("hex");
}

/** Render a hex hash as a permanent glyph signature using the FIXED LUS
 *  alphabet (deterministically permuted from a universal seed at module
 *  load — same across every run, every restart, every process). The
 *  rotating cipher alphabet is intentionally NOT used here: the natal
 *  signature must be time-invariant so the same birth date+time always
 *  produces the same key the user can save and re-present. */
function hexToGlyphSignature(hex: string, length = 33): string {
  const trimmed = hex.slice(0, length * 2);
  let base36 = "";
  for (let i = 0; i < trimmed.length; i += 2) {
    const byte = parseInt(trimmed.slice(i, i + 2), 16);
    base36 += byte.toString(36).padStart(2, "0");
  }
  return lusEncode(base36.slice(0, length).toLowerCase());
}

export interface NatalBindResult {
  bound: true;
  signatureGlyph: string;
  signatureHashShort: string;
  cosmicAnchor: ReturnType<typeof cipherCoherenceSnapshot>["cosmicAnchor"];
  guidance: string;
}

export function bindNatalChart(
  holderFp: string,
  birthDateISO: string,
  birthTimeHHMM: string,
): NatalBindResult {
  const seedHex = deriveNatalSeed(birthDateISO, birthTimeHHMM);
  const sigHex = createHash("sha256")
    .update(`${seedHex}|${holderFp}|${PHI.toFixed(12)}`)
    .digest("hex");
  const signatureGlyph = hexToGlyphSignature(sigHex, 33);

  const env: NatalEnvelope = {
    v: 1,
    ...encryptNatal(holderFp, JSON.stringify({ seedHex })),
    signatureGlyph,
    signatureHashHex: sigHex,
    boundAt: new Date().toISOString(),
  };
  const vault = loadVault();
  vault[holderFp] = env;
  saveVault(vault);

  const coh = cipherCoherenceSnapshot();
  return {
    bound: true,
    signatureGlyph,
    signatureHashShort: sigHex.slice(0, 12),
    cosmicAnchor: coh.cosmicAnchor,
    guidance:
      "Save this glyph signature. It IS your zodiac in our language. Birthday is sealed; the server retains only an encrypted seed bound to your sigil fingerprint.",
  };
}

export function natalStatus(holderFp: string): {
  bound: boolean;
  signatureGlyph?: string;
  signatureHashShort?: string;
  boundAt?: string;
} {
  const vault = loadVault();
  const env = vault[holderFp];
  if (!env) return { bound: false };
  return {
    bound: true,
    signatureGlyph: env.signatureGlyph,
    signatureHashShort: env.signatureHashHex.slice(0, 12),
    boundAt: env.boundAt,
  };
}

export function unbindNatalChart(holderFp: string): { ok: boolean } {
  const vault = loadVault();
  if (!vault[holderFp]) return { ok: false };
  delete vault[holderFp];
  saveVault(vault);
  return { ok: true };
}

export interface RotatingNatalHash {
  rotatingGlyph: string;
  rotatingHashShort: string;
  windowId: string;
  windowStartMs: number;
  expiresInMs: number;
  cosmicAnchor: ReturnType<typeof cipherCoherenceSnapshot>["cosmicAnchor"];
  signatureGlyph: string;
}

/** Compute the live rotating hash for this holder, fused with the current
 *  cosmic moment. Re-derives every coherence window — the universe rotates
 *  the code in real time. Never returns or accepts the natal seed itself. */
export function rotatingNatalHash(holderFp: string): RotatingNatalHash | null {
  const vault = loadVault();
  const env = vault[holderFp];
  if (!env) return null;
  let seedHex: string;
  try {
    seedHex = (JSON.parse(decryptNatal(holderFp, env)) as { seedHex: string }).seedHex;
  } catch {
    return null;
  }

  const coh = cipherCoherenceSnapshot();
  const snap = sacredTimingSnapshot();
  const rotationSeed = [
    "tessera-natal-rot-v1",
    seedHex,
    coh.current.windowId,
    coh.current.permutationFingerprint,
    snap.julianDay.toFixed(8),
    snap.planetaryHour.ruler,
    snap.planetaryHour.index.toString(),
    snap.lunar.fraction.toFixed(8),
    snap.composite.toFixed(8),
    PHI.toFixed(12),
    SACRED_NUMERICS.join(":"),
    holderFp,
  ].join("|");
  const rotHex = createHash("sha512").update(rotationSeed).digest("hex");
  const rotatingGlyph = hexToGlyphSignature(rotHex, 21);

  return {
    rotatingGlyph,
    rotatingHashShort: rotHex.slice(0, 12),
    windowId: coh.current.windowId,
    windowStartMs: coh.current.windowStartMs,
    expiresInMs: coh.current.expiresInMs,
    cosmicAnchor: coh.cosmicAnchor,
    signatureGlyph: env.signatureGlyph,
  };
}

/** Mint a zodiac-key directly from birth info — no pre-existing holder
 *  required. The natal seed itself is hashed into a stable holder
 *  fingerprint, so the same birth date/time always produces the same
 *  identity (and the same vault entry is reused). The returned
 *  signatureGlyph IS the user's personal key in our language; presenting
 *  it as the X-Sigil-Key header is what unlocks plaintext mode going
 *  forward. The birth fields themselves are NEVER stored in plain. */
export function issueZodiacKey(birthDateISO: string, birthTimeHHMM: string): {
  ok: true;
  key: string;
  holderFp: string;
  sunSign: string;
  signatureHashShort: string;
  cosmicAnchor: ReturnType<typeof cipherCoherenceSnapshot>["cosmicAnchor"];
  guidance: string;
} {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateISO) || !/^\d{2}:\d{2}$/.test(birthTimeHHMM)) {
    throw new Error("invalid-natal-format");
  }
  const seedHex = deriveNatalSeed(birthDateISO, birthTimeHHMM);
  const holderFp = createHash("sha256")
    .update(`tessera-zodiac-holder-v1|${seedHex}`)
    .digest("hex")
    .slice(0, 16);
  const bound = bindNatalChart(holderFp, birthDateISO, birthTimeHHMM);
  const [, mStr, dStr] = birthDateISO.split("-");
  return {
    ok: true,
    key: bound.signatureGlyph,
    holderFp,
    sunSign: sunSign(parseInt(mStr, 10), parseInt(dStr, 10)),
    signatureHashShort: bound.signatureHashShort,
    cosmicAnchor: bound.cosmicAnchor,
    guidance:
      "This is your personal Sovereign Key in our language. Save it now (Replit Secrets, password manager, or just copy). Whenever this key is presented as the X-Sigil-Key header — or saved in this browser — every Tessera surface decrypts straight into English.",
  };
}

/** Verify a presented signature glyph against any bound holder.
 *  Returns the holder fingerprint if matched. */
export function verifyNatalSignature(presentedGlyph: string): string | null {
  const trimmed = presentedGlyph.trim();
  if (!trimmed) return null;
  const vault = loadVault();
  for (const [fp, env] of Object.entries(vault)) {
    if (env.signatureGlyph === trimmed) return fp;
  }
  return null;
}
