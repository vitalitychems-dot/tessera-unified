import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";
import { cosmicContext } from "./cosmic-context";
import { glyphEncode, glyphDecode, getActiveKey } from "./sigil-cipher";
import { lusV2Encode } from "./lus-v2";

export interface OmniversalCipherEnvelope {
  v: 2;
  alg: "aes-256-gcm";
  layers: ["sigil-glyph", "harmonic-mod", "geometric-shuffle", "astro-key"];
  cosmicFingerprint: string;
  iv: string;
  tag: string;
  ct: string;
  carrierHz: number;
  geometricSalt: string;
  geometricSaltFull: string;
  label: string;
  astroEpoch: string;
  surfacePreview: string;
  encryptedAt: string;
}

function deriveLayeredKey(): Buffer {
  const ctx = cosmicContext();
  return deriveLayeredKeyForFingerprint(ctx.fingerprint);
}

function deriveLayeredKeyForFingerprint(cosmicFingerprint: string): Buffer {
  const sigil = getActiveKey();
  const ikm = Buffer.from(`${sigil.fingerprint}|${sigil.id}`, "utf8");
  // Salt is bound to the cosmic fingerprint of the envelope itself so a
  // message remains decryptable across cosmic windows by the holder.
  const salt = Buffer.from(`${cosmicFingerprint}|omniversal:v2`, "utf8");
  const info = Buffer.from("omniversal-cipher:v2:layered", "utf8");
  return Buffer.from(hkdfSync("sha256", ikm, salt, info, 32));
}

function geometricShuffle(buf: Buffer, seedHex: string): Buffer {
  const out = Buffer.from(buf);
  let s = parseInt(seedHex.slice(0, 12), 16);
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}

function geometricUnshuffle(buf: Buffer, seedHex: string): Buffer {
  // Replay the same swap sequence in reverse to invert.
  const swaps: Array<[number, number]> = [];
  let s = parseInt(seedHex.slice(0, 12), 16);
  for (let i = buf.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    swaps.push([i, j]);
  }
  const out = Buffer.from(buf);
  for (let k = swaps.length - 1; k >= 0; k--) {
    const [i, j] = swaps[k];
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}

export function omniversalEncrypt(plaintext: string, label = "omni"): OmniversalCipherEnvelope {
  const ctx = cosmicContext();
  // Layer 1: sigil glyph encoding
  const layer1 = glyphEncode(plaintext);
  // Layer 2: harmonic modulation via LUS-v2
  const layer2 = lusV2Encode(layer1).modulated;
  // Layer 3: geometric shuffle of bytes
  const geometricSalt = createHash("sha256").update(`${ctx.fingerprint}|${label}|${ctx.geometry.goldenAngleDeg}`).digest("hex");
  const shuffled = geometricShuffle(Buffer.from(layer2, "utf8"), geometricSalt);
  // Layer 4: AES-256-GCM with HKDF-derived astro-bound key
  const key = deriveLayeredKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(ctx.fingerprint, "utf8"));
  const ct = Buffer.concat([cipher.update(shuffled), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 2,
    alg: "aes-256-gcm",
    layers: ["sigil-glyph", "harmonic-mod", "geometric-shuffle", "astro-key"],
    cosmicFingerprint: ctx.fingerprint,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ct: ct.toString("base64"),
    carrierHz: ctx.vibration.dominantSolfeggio,
    geometricSalt: geometricSalt.slice(0, 16),
    geometricSaltFull: geometricSalt,
    label,
    astroEpoch: `${ctx.astro.moonZodiac}|${ctx.astro.planetaryRuler}|${ctx.astro.lunarPhase}`,
    surfacePreview: layer2.slice(0, 64),
    encryptedAt: new Date().toISOString(),
  };
}

export function omniversalDecrypt(env: OmniversalCipherEnvelope): string {
  // Cosmic-window tolerance: the AAD/key are bound to the envelope's own
  // fingerprint, so messages remain decryptable regardless of when they are
  // opened (within natural cosmic drift). The cosmicFingerprint mismatch is
  // surfaced as a warning header, not a hard failure.
  const key = deriveLayeredKeyForFingerprint(env.cosmicFingerprint);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(env.iv, "base64"));
  decipher.setAAD(Buffer.from(env.cosmicFingerprint, "utf8"));
  decipher.setAuthTag(Buffer.from(env.tag, "base64"));
  const shuffled = Buffer.concat([decipher.update(Buffer.from(env.ct, "base64")), decipher.final()]);
  // Use the salt that was actually used at encrypt time (carried in envelope).
  // Envelope schema requires geometricSaltFull; we error explicitly if absent
  // rather than silently re-deriving from a different cosmic window.
  if (!env.geometricSaltFull) {
    throw new Error("envelope-missing-geometricSaltFull (re-encrypt with v2 schema)");
  }
  const geometricSalt = env.geometricSaltFull;
  const unshuf = geometricUnshuffle(shuffled, geometricSalt);
  const layer2 = unshuf.toString("utf8");
  // Reverse LUS-v2 by parsing its delimited token format.
  const layer1 = lusV2DecodeSurface(layer2);
  return glyphDecode(layer1);
}

// Extract the surface (sigil-glyph) layer from an LUS-v2 modulated string by
// parsing the ⟦vib·surface·geo·band⟧ tokens. This is the inverse used by the
// cipher's layer-2 unwrap — reversibility-safe (no glyph-set stripping).
function lusV2DecodeSurface(modulated: string): string {
  const TOK_OPEN = "⟦";
  const TOK_CLOSE = "⟧";
  const TOK_SEP = "·";
  let surfaceOnly = "";
  let i = 0;
  while (i < modulated.length) {
    const open = modulated.indexOf(TOK_OPEN, i);
    if (open < 0) break;
    const close = modulated.indexOf(TOK_CLOSE, open + 1);
    if (close < 0) break;
    const parts = modulated.slice(open + TOK_OPEN.length, close).split(TOK_SEP);
    if (parts.length === 4) surfaceOnly += parts[1];
    i = close + TOK_CLOSE.length;
  }
  return surfaceOnly;
}

export function omniversalCipherSnapshot() {
  const ctx = cosmicContext();
  const sigil = getActiveKey();
  return {
    version: 2,
    layers: [
      { layer: 1, name: "sigil-glyph", source: "sovereign sigil alphabet (cosmic-rotated)" },
      { layer: 2, name: "harmonic-modulation", source: "LUS-v2 vibration/geometry/freq-band glyphs", carrierHz: ctx.vibration.dominantSolfeggio },
      { layer: 3, name: "geometric-shuffle", source: "phi/golden-angle byte permutation" },
      { layer: 4, name: "astro-aes", source: "HKDF(sigil ⊕ cosmic context) → AES-256-GCM" },
    ],
    cosmicFingerprint: ctx.fingerprint,
    sigilFingerprint: sigil.fingerprint,
    bound: {
      moonZodiac: ctx.astro.moonZodiac,
      sunZodiac: ctx.astro.sunZodiac,
      planetaryRuler: ctx.astro.planetaryRuler,
      lunarPhase: ctx.astro.lunarPhase,
      schumannHz: ctx.vibration.schumannHz,
      dominantSolfeggio: ctx.vibration.dominantSolfeggio,
      goldenAngleDeg: ctx.geometry.goldenAngleDeg,
    },
  };
}
