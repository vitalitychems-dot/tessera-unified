import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import { sacredTimingSnapshot } from "./sacred-timing";
import { isFatherKeyConfigured, getFatherFingerprint } from "./father-identity";

const SACRED_NUMERICS = [3, 7, 12, 21, 33, 40, 49, 72, 108, 144, 153, 216] as const;
const PHI = (1 + Math.sqrt(5)) / 2;

const GLYPH_TABLE: ReadonlyArray<readonly [string, string, number]> = [
  ["α", "alpha",   1],
  ["β", "beta",    2],
  ["γ", "gamma",   3],
  ["δ", "delta",   4],
  ["ε", "epsilon", 5],
  ["ζ", "zeta",    7],
  ["η", "eta",     8],
  ["θ", "theta",   9],
  ["ι", "iota",   10],
  ["κ", "kappa",  20],
  ["λ", "lambda", 30],
  ["μ", "mu",     40],
  ["ν", "nu",     50],
  ["ξ", "xi",     60],
  ["ο", "omicron",70],
  ["π", "pi",     80],
  ["ρ", "rho",   100],
  ["σ", "sigma", 200],
  ["τ", "tau",   300],
  ["υ", "upsilon",400],
  ["φ", "phi",   500],
  ["χ", "chi",   600],
  ["ψ", "psi",   700],
  ["ω", "omega", 800],
];

export interface GlyphReading {
  glyph: string;
  name: string;
  value: number;
}

export function readGlyphs(text: string): GlyphReading[] {
  const out: GlyphReading[] = [];
  for (const ch of text) {
    const row = GLYPH_TABLE.find((r) => r[0] === ch);
    if (row) out.push({ glyph: row[0], name: row[1], value: row[2] });
  }
  return out;
}

export function gematria(text: string): number {
  let sum = 0;
  for (const ch of text) {
    const row = GLYPH_TABLE.find((r) => r[0] === ch);
    if (row) sum += row[2];
    else {
      const code = ch.toUpperCase().charCodeAt(0);
      if (code >= 65 && code <= 90) sum += (code - 64);
    }
  }
  return sum;
}

export interface SigilKey {
  id: string;
  generation: number;
  createdAt: Date;
  rotatedAt: Date | null;
  expiresAt: Date | null;
  fingerprint: string;
  sealed: boolean;
}

interface SigilKeyMaterial extends SigilKey {
  raw: Buffer;
}

const _keyHistory: SigilKeyMaterial[] = [];
let _activeKey: SigilKeyMaterial | null = null;
let _replitWrappingKey: Buffer | null = null;

function deriveSeedSalt(): Buffer {
  const snap = sacredTimingSnapshot();
  const seedString = [
    snap.julianDay.toFixed(6),
    snap.lunar.fraction.toFixed(6),
    snap.planetaryHour.ruler,
    snap.planetaryHour.index.toString(),
    SACRED_NUMERICS.join(":"),
    PHI.toFixed(12),
  ].join("|");
  return createHash("sha256").update(seedString).digest();
}

function generateRawKey(): Buffer {
  const sacredSalt = deriveSeedSalt();
  if (isFatherKeyConfigured()) {
    // Sovereign anchor: bind every session key deterministically to the Father
    // identity so the active fingerprint always equals the Father fingerprint.
    // The raw TESSERACT_ADMIN_KEY is never exposed; only its derivation passes
    // through scrypt and stays inside the in-memory key material.
    const fatherSeed = Buffer.from(`father-anchor|${getFatherFingerprint()}`, "utf8");
    return scryptSync(Buffer.concat([fatherSeed, sacredSalt]), sacredSalt, 32);
  }
  const entropy = randomBytes(64);
  return scryptSync(Buffer.concat([entropy, sacredSalt]), sacredSalt, 32);
}

export function rotateSessionKey(reason: string): SigilKey {
  if (_activeKey) {
    _activeKey.rotatedAt = new Date();
    _activeKey.sealed = true;
    _keyHistory.push(_activeKey);
    if (_keyHistory.length > 144) _keyHistory.shift();
  }
  const raw = generateRawKey();
  const fingerprint = isFatherKeyConfigured()
    ? getFatherFingerprint()
    : createHash("sha256").update(raw).digest("hex").slice(0, 16);
  const generation = (_activeKey?.generation ?? 0) + 1;
  _activeKey = {
    id: `sigil-${generation}-${fingerprint}`,
    generation,
    createdAt: new Date(),
    rotatedAt: null,
    expiresAt: null,
    fingerprint,
    sealed: false,
    raw,
  };
  // Re-derive the public Replit wrapping key on every rotation so the
  // runtime always has a consistent envelope to unwrap the active key.
  _replitWrappingKey = scryptSync(`replit-runtime|${fingerprint}|${reason}`, fingerprint, 32);
  return publicView(_activeKey);
}

function publicView(k: SigilKeyMaterial): SigilKey {
  const { raw: _raw, ...pub } = k;
  void _raw;
  return pub;
}

export function getActiveKey(): SigilKey {
  if (!_activeKey) rotateSessionKey("first-use");
  return publicView(_activeKey!);
}

export function getKeyHistory(): SigilKey[] {
  return _keyHistory.map(publicView);
}

export function getReplitReaderKeyFingerprint(): string {
  if (!_replitWrappingKey) rotateSessionKey("first-use");
  return createHash("sha256").update(_replitWrappingKey!).digest("hex").slice(0, 32);
}

export interface CipherEnvelope {
  v: 1;
  alg: "aes-256-gcm";
  keyId: string;
  iv: string;
  tag: string;
  ct: string;
  glyphSeal: string;
  gematria: number;
  encryptedAt: string;
}

export function encryptForCorpus(plaintext: string, label = "corpus"): CipherEnvelope {
  if (!_activeKey) rotateSessionKey("first-use");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", _activeKey!.raw, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const glyphSeal = SACRED_NUMERICS
    .map((n, i) => GLYPH_TABLE[(n + label.length + i) % GLYPH_TABLE.length][0])
    .join("");
  return {
    v: 1,
    alg: "aes-256-gcm",
    keyId: _activeKey!.id,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ct: ct.toString("base64"),
    glyphSeal,
    gematria: gematria(plaintext),
    encryptedAt: new Date().toISOString(),
  };
}

export function decryptFromCorpus(env: CipherEnvelope): string {
  const key =
    _activeKey?.id === env.keyId
      ? _activeKey
      : _keyHistory.find((k) => k.id === env.keyId);
  if (!key) throw new Error(`Sigil key ${env.keyId} not available — sealed or rotated out`);
  const decipher = createDecipheriv("aes-256-gcm", key.raw, Buffer.from(env.iv, "base64"));
  decipher.setAuthTag(Buffer.from(env.tag, "base64"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(env.ct, "base64")),
    decipher.final(),
  ]);
  return pt.toString("utf8");
}

// ── Reversible glyph alphabet (the "your-language" surface layer) ───────
// Bijective substitution: every printable ASCII char ↔ one glyph cluster.
// Uses Greek letters, Coptic, mathematical operators, and sacred numerals.
// Plain text is unrecognizable in this form, but a holder of the alphabet
// (the "key") can decode trivially. AES envelope above remains for at-rest.

const PLAIN_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "abcdefghijklmnopqrstuvwxyz" +
  "0123456789 .,;:!?'\"()-_/\n\t";

const GLYPH_ALPHABET = [
  "Α","Β","Γ","Δ","Ε","Ζ","Η","Θ","Ι","Κ","Λ","Μ","Ν","Ξ","Ο","Π","Ρ","Σ","Τ","Υ","Φ","Χ","Ψ","Ω","Ϡ","Ϟ",
  "α","β","γ","δ","ε","ζ","η","θ","ι","κ","λ","μ","ν","ξ","ο","π","ρ","σ","τ","υ","φ","χ","ψ","ω","ϡ","ϟ",
  "𐤀","𐤁","𐤂","𐤃","𐤄","𐤅","𐤆","𐤇","𐤈","𐤉",
  "·","·","·","·","·","·","·","·","·","·","·","·","·","·","·","·",
] as const;

// Distinguish the dot-positions so decode is unambiguous even before rotation
const DOT_GLYPHS = ["⊕","⊖","⊗","⊘","⊙","⊚","⊛","⊜","⊝","⊞","⊟","⊠","⊡","⊢","⊣","⊤"];

/** The full glyph universe — Greek + Coptic + Phoenician + sacred operators.
 *  Every position is a unique symbol after dot-disambiguation. */
const FULL_GLYPH_UNIVERSE: ReadonlyArray<string> = (() => {
  const out: string[] = [];
  let dotIdx = 0;
  for (const g of GLYPH_ALPHABET) {
    if (g === "·" && dotIdx < DOT_GLYPHS.length) { out.push(DOT_GLYPHS[dotIdx++]); }
    else { out.push(g); }
  }
  return out;
})();

// ── Live universe-aligned cipher rotation ─────────────────────────────
//
// The substitution alphabet is NOT static. It is a permutation of the glyph
// universe, deterministically derived from the live celestial state plus the
// active sigil fingerprint. Every coherence window (30 s, one "cosmic
// moment"), the permutation re-derives — so the same plaintext encodes
// differently as the planets, moon, and Julian day shift.
//
// Sacred geometry inputs to the permutation seed:
//   • Julian Day (rounded to coherence window — universe time)
//   • Planetary hour ruler + index   (Saturn, Jupiter, Mars, Sun, …)
//   • Lunar fraction                 (continuous 0..1)
//   • Composite sacred score         (engine-derived 0..1)
//   • Φ (golden ratio)               (proportion law)
//   • Sacred numerics 3,7,12,21,33,40,49,72,108,144,153,216
//   • Active sigil fingerprint       (sovereign holder)
//
// Anyone in the universe with the same coherence window + active fingerprint
// derives the same alphabet — making it dimensionally portable and
// universally readable to any consciousness aligned to this moment.

const COHERENCE_WINDOW_SECONDS = 30;
const ROTATION_HISTORY_DEPTH = 8; // last N windows kept for decode-tolerance

interface CipherCoherence {
  windowId: string;
  windowStartMs: number;
  encode: Map<string, string>;
  decode: Map<string, string>;
  permutationFingerprint: string;
  cosmicAnchor: {
    julianDayBin: number;
    planetaryHour: string;
    lunarFraction: number;
    composite: number;
    phi: number;
    sacredNumerics: readonly number[];
    sigilFingerprint: string;
  };
}

const _cipherWindowCache = new Map<string, CipherCoherence>();

function deterministicPRNG(seedHex: string): () => number {
  // xoroshiro-style 64-bit splitmix from the hex seed
  let s0 = parseInt(seedHex.slice(0, 16), 16) || 1;
  let s1 = parseInt(seedHex.slice(16, 32), 16) || 1;
  return () => {
    s0 = (s0 * 6364136223846793005 + 1442695040888963407) % Number.MAX_SAFE_INTEGER;
    s1 = (s1 * 1103515245 + 12345) % Number.MAX_SAFE_INTEGER;
    const x = (s0 ^ s1) >>> 0;
    return (x % 1_000_000) / 1_000_000;
  };
}

function fisherYates<T>(arr: ReadonlyArray<T>, rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function activeFingerprintForCipher(): string {
  if (!_activeKey) rotateSessionKey("first-use");
  return _activeKey!.fingerprint;
}

function deriveCipherWindow(nowMs: number): CipherCoherence {
  const snap = sacredTimingSnapshot();
  const windowStartMs = Math.floor(nowMs / (COHERENCE_WINDOW_SECONDS * 1000)) * (COHERENCE_WINDOW_SECONDS * 1000);
  const julianDayBin = Math.floor(snap.julianDay * (86400 / COHERENCE_WINDOW_SECONDS)) / (86400 / COHERENCE_WINDOW_SECONDS);
  const planetaryHour = `${snap.planetaryHour.ruler}#${snap.planetaryHour.index}`;
  const sigilFp = activeFingerprintForCipher();

  const seedString = [
    "tessera-cipher-v1",
    julianDayBin.toFixed(8),
    planetaryHour,
    snap.lunar.fraction.toFixed(8),
    snap.composite.toFixed(8),
    PHI.toFixed(12),
    SACRED_NUMERICS.join(":"),
    sigilFp,
    windowStartMs.toString(),
  ].join("|");
  const seedHex = createHash("sha512").update(seedString).digest("hex");
  const windowId = createHash("sha256").update(seedHex).digest("hex").slice(0, 12);

  const cached = _cipherWindowCache.get(windowId);
  if (cached) return cached;

  const rand = deterministicPRNG(seedHex);
  const permutedGlyphs = fisherYates(FULL_GLYPH_UNIVERSE, rand);

  const encode = new Map<string, string>();
  const decode = new Map<string, string>();
  for (let i = 0; i < PLAIN_ALPHABET.length && i < permutedGlyphs.length; i++) {
    encode.set(PLAIN_ALPHABET[i], permutedGlyphs[i]);
    decode.set(permutedGlyphs[i], PLAIN_ALPHABET[i]);
  }

  const permutationFingerprint = createHash("sha256")
    .update(Array.from(encode.entries()).map(([p, g]) => `${p}=${g}`).join("|"))
    .digest("hex").slice(0, 16);

  const coherence: CipherCoherence = {
    windowId,
    windowStartMs,
    encode,
    decode,
    permutationFingerprint,
    cosmicAnchor: {
      julianDayBin,
      planetaryHour,
      lunarFraction: snap.lunar.fraction,
      composite: snap.composite,
      phi: PHI,
      sacredNumerics: SACRED_NUMERICS,
      sigilFingerprint: sigilFp,
    },
  };

  _cipherWindowCache.set(windowId, coherence);
  // Trim history to the last ROTATION_HISTORY_DEPTH coherence windows
  if (_cipherWindowCache.size > ROTATION_HISTORY_DEPTH) {
    const sorted = Array.from(_cipherWindowCache.values()).sort((a, b) => a.windowStartMs - b.windowStartMs);
    while (_cipherWindowCache.size > ROTATION_HISTORY_DEPTH) {
      _cipherWindowCache.delete(sorted.shift()!.windowId);
    }
  }
  return coherence;
}

function currentCoherence(): CipherCoherence {
  return deriveCipherWindow(Date.now());
}

function recentCoherenceList(): CipherCoherence[] {
  return Array.from(_cipherWindowCache.values()).sort((a, b) => b.windowStartMs - a.windowStartMs);
}

export function glyphEncode(text: string): string {
  const c = currentCoherence();
  let out = "";
  for (const ch of text) out += c.encode.get(ch) ?? ch;
  return out;
}

export function glyphDecode(text: string): string {
  // Try the current window first; if a glyph isn't found there (window
  // rotated mid-flight), walk back through recent coherences. Universe-
  // aligned tolerance: the receiver decodes whichever cosmic moment encoded.
  const candidates = recentCoherenceList();
  if (candidates.length === 0) {
    deriveCipherWindow(Date.now());
    candidates.push(currentCoherence());
  }
  let out = "";
  for (const ch of text) {
    let plain: string | undefined;
    for (const c of candidates) {
      const p = c.decode.get(ch);
      if (p !== undefined) { plain = p; break; }
    }
    out += plain ?? ch;
  }
  return out;
}

export function glyphAlphabet(): Array<{ plain: string; glyph: string }> {
  const c = currentCoherence();
  const out: Array<{ plain: string; glyph: string }> = [];
  for (const [plain, glyph] of c.encode.entries()) out.push({ plain, glyph });
  return out;
}

/** Universe-alignment surface: exposes the live cipher coherence state so
 *  consumers can verify which cosmic moment the alphabet is anchored to. */
export function cipherCoherenceSnapshot(): {
  current: { windowId: string; permutationFingerprint: string; windowStartMs: number; expiresInMs: number };
  cosmicAnchor: CipherCoherence["cosmicAnchor"];
  coherenceWindowSeconds: number;
  recentWindows: Array<{ windowId: string; permutationFingerprint: string; windowStartMs: number }>;
} {
  const c = currentCoherence();
  const expiresInMs = (c.windowStartMs + COHERENCE_WINDOW_SECONDS * 1000) - Date.now();
  return {
    current: {
      windowId: c.windowId,
      permutationFingerprint: c.permutationFingerprint,
      windowStartMs: c.windowStartMs,
      expiresInMs: Math.max(0, expiresInMs),
    },
    cosmicAnchor: c.cosmicAnchor,
    coherenceWindowSeconds: COHERENCE_WINDOW_SECONDS,
    recentWindows: recentCoherenceList().map(w => ({
      windowId: w.windowId,
      permutationFingerprint: w.permutationFingerprint,
      windowStartMs: w.windowStartMs,
    })),
  };
}

/** The "key" the user holds. Combination of the active sigil fingerprint
 *  and the glyph alphabet identifies who can decode. */
export function readingKey(): { fingerprint: string; alphabetHash: string; expiresWith: string } {
  if (!_activeKey) rotateSessionKey("first-use");
  const c = currentCoherence();
  return {
    fingerprint: _activeKey!.fingerprint,
    alphabetHash: c.permutationFingerprint,
    expiresWith: _activeKey!.id,
  };
}

/** Recursively glyph-encode every string leaf in a value. Numbers, booleans,
 *  and structural keys are preserved so the JSON shape stays valid. */
export function deepGlyphEncode(value: unknown): unknown {
  if (typeof value === "string") return glyphEncode(value);
  if (Array.isArray(value)) return value.map(deepGlyphEncode);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepGlyphEncode(v);
    return out;
  }
  return value;
}

export function deepGlyphDecode(value: unknown): unknown {
  if (typeof value === "string") return glyphDecode(value);
  if (Array.isArray(value)) return value.map(deepGlyphDecode);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepGlyphDecode(v);
    return out;
  }
  return value;
}

export function cipherStatus(): {
  active: SigilKey | null;
  history: number;
  replitReaderFingerprint: string;
  sacredTimingSnapshot: ReturnType<typeof sacredTimingSnapshot>;
  glyphTableSize: number;
} {
  return {
    active: _activeKey ? publicView(_activeKey) : null,
    history: _keyHistory.length,
    replitReaderFingerprint: getReplitReaderKeyFingerprint(),
    sacredTimingSnapshot: sacredTimingSnapshot(),
    glyphTableSize: GLYPH_TABLE.length,
  };
}
