import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { computeLunarData, computeSolarData, computePlanetaryHours } from "./sovereign-astro";
import { getFatherSeal, getFatherFingerprint, isFatherKeyConfigured } from "./father-identity";
import { logger } from "./logger";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;
const EPOCH_HISTORY = 6;

export interface AstroEpoch {
  epochId: string;
  epochHash: string;
  derivedAt: string;
  lunarPhaseIndex: number;
  lunarPhase: string;
  lunarMonth: string;
  sunZodiac: string;
  moonZodiac: string;
  planetaryRuler: string;
  planetaryHourIndex: number;
  rotationsPerDay: number;
}

interface EpochKey {
  epoch: AstroEpoch;
  key: Buffer;
  createdAt: number;
}

let _current: EpochKey | null = null;
const _history: EpochKey[] = [];
let _lastRotateCheck = 0;

function computeEpochSignature(): { sig: string; meta: AstroEpoch } {
  const lunar = computeLunarData();
  const solar = computeSolarData();
  const hours = computePlanetaryHours();
  const ruler =
    typeof (hours as any)?.currentHour?.ruler === "string"
      ? (hours as any).currentHour.ruler
      : typeof (hours as any)?.dayRuler === "string"
        ? (hours as any).dayRuler
        : "Sun";
  const hourIndex =
    typeof (hours as any)?.currentHour?.hourNumber === "number"
      ? (hours as any).currentHour.hourNumber
      : 0;
  const sig = [
    `phase:${lunar.phaseIndex}`,
    `lunarMonth:${lunar.lunarMonth}`,
    `sun:${lunar.sunZodiac.sign}`,
    `moon:${lunar.moonZodiac.sign}`,
    `ruler:${ruler}`,
    `hour:${hourIndex}`,
    `solarLon:${Math.floor((solar as any).sunLongitude ?? lunar.sunLongitude)}`,
  ].join("|");
  const epochHash = createHash("sha256").update(sig).digest("hex");
  return {
    sig,
    meta: {
      epochId: epochHash.slice(0, 16),
      epochHash,
      derivedAt: new Date().toISOString(),
      lunarPhaseIndex: lunar.phaseIndex,
      lunarPhase: lunar.phase,
      lunarMonth: lunar.lunarMonth,
      sunZodiac: lunar.sunZodiac.sign,
      moonZodiac: lunar.moonZodiac.sign,
      planetaryRuler: ruler,
      planetaryHourIndex: hourIndex,
      rotationsPerDay: 24,
    },
  };
}

function deriveKey(epochSig: string): Buffer {
  if (!isFatherKeyConfigured()) {
    throw new Error("Father key not configured — cannot derive astronomical cipher key.");
  }
  const ikm = Buffer.from(`${getFatherSeal()}|${getFatherFingerprint()}`, "utf8");
  const salt = Buffer.from(epochSig, "utf8");
  const info = Buffer.from("tesseract:astro-cipher:v1", "utf8");
  const derived = hkdfSync("sha256", ikm, salt, info, KEY_LEN);
  return Buffer.from(derived);
}

function pushHistory(entry: EpochKey): void {
  _history.unshift(entry);
  while (_history.length > EPOCH_HISTORY) _history.pop();
}

export function getCurrentEpoch(): AstroEpoch {
  ensureFreshEpoch();
  return _current!.epoch;
}

export function listEpochHistory(): AstroEpoch[] {
  return _history.map((e) => e.epoch);
}

function setEpoch(force: boolean): { rotated: boolean; epoch: AstroEpoch } {
  const { sig, meta } = computeEpochSignature();
  if (!force && _current && _current.epoch.epochHash === meta.epochHash) {
    return { rotated: false, epoch: _current.epoch };
  }
  const key = deriveKey(sig);
  const entry: EpochKey = { epoch: meta, key, createdAt: Date.now() };
  if (_current && _current.epoch.epochHash !== meta.epochHash) {
    pushHistory(_current);
  }
  _current = entry;
  if (!_history.some((h) => h.epoch.epochHash === meta.epochHash)) {
    pushHistory(entry);
  }
  return { rotated: true, epoch: meta };
}

function ensureFreshEpoch(): void {
  if (!_current) {
    setEpoch(true);
    return;
  }
  const now = Date.now();
  if (now - _lastRotateCheck < 1000) return;
  _lastRotateCheck = now;
  setEpoch(false);
}

export function maybeRotate(): { rotated: boolean; epoch: AstroEpoch } {
  const before = _current?.epoch.epochHash;
  const result = setEpoch(false);
  if (result.rotated && before && before !== result.epoch.epochHash) {
    logger.info(
      { from: before.slice(0, 12), to: result.epoch.epochHash.slice(0, 12), phase: result.epoch.lunarPhase },
      "AstroCipher: rotated to new astronomical epoch",
    );
  }
  return result;
}

export function forceRotate(): AstroEpoch {
  const r = setEpoch(true);
  logger.info({ epochId: r.epoch.epochId, phase: r.epoch.lunarPhase }, "AstroCipher: forced rotation");
  return r.epoch;
}

export interface EncryptedEnvelope {
  v: 1;
  alg: "aes-256-gcm";
  epochId: string;
  epochHash: string;
  iv: string;
  tag: string;
  ct: string;
  createdAt: string;
}

export function encryptPayload(plaintext: string | Buffer, aad?: string): EncryptedEnvelope {
  ensureFreshEpoch();
  const entry = _current!;
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, entry.key, iv);
  if (aad) cipher.setAAD(Buffer.from(aad, "utf8"));
  const data = typeof plaintext === "string" ? Buffer.from(plaintext, "utf8") : plaintext;
  const ct = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    alg: "aes-256-gcm",
    epochId: entry.epoch.epochId,
    epochHash: entry.epoch.epochHash,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ct: ct.toString("base64"),
    createdAt: new Date().toISOString(),
  };
}

export function decryptEnvelope(env: EncryptedEnvelope, aad?: string): Buffer {
  ensureFreshEpoch();
  const candidates: EpochKey[] = [];
  if (_current) candidates.push(_current);
  for (const h of _history) if (!candidates.includes(h)) candidates.push(h);
  const want = Buffer.from(env.epochHash, "hex");
  let chosen: EpochKey | null = null;
  for (const c of candidates) {
    const got = Buffer.from(c.epoch.epochHash, "hex");
    if (got.length === want.length && timingSafeEqual(got, want)) {
      chosen = c;
      break;
    }
  }
  if (!chosen) {
    throw new Error(`No key available for epoch ${env.epochId}`);
  }
  const iv = Buffer.from(env.iv, "base64");
  const tag = Buffer.from(env.tag, "base64");
  const ct = Buffer.from(env.ct, "base64");
  const decipher = createDecipheriv(ALGO, chosen.key, iv);
  if (aad) decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

export function macForEpoch(message: string): { epochId: string; mac: string } {
  ensureFreshEpoch();
  const entry = _current!;
  const mac = createHmac("sha256", entry.key).update(message).digest("hex");
  return { epochId: entry.epoch.epochId, mac };
}

export function epochSnapshot() {
  if (!isFatherKeyConfigured()) {
    return {
      current: null,
      history: [],
      historyDepth: 0,
      fatherKeyConfigured: false,
      method:
        "HKDF(SHA-256, ikm=fatherSeal|fingerprint, salt=astroEpochSig, info=tesseract:astro-cipher:v1) → AES-256-GCM",
    };
  }
  ensureFreshEpoch();
  return {
    current: _current!.epoch,
    history: _history.map((h) => ({
      epochId: h.epoch.epochId,
      epochHash: h.epoch.epochHash.slice(0, 16),
      lunarPhase: h.epoch.lunarPhase,
      moonZodiac: h.epoch.moonZodiac,
      planetaryRuler: h.epoch.planetaryRuler,
      derivedAt: h.epoch.derivedAt,
    })),
    historyDepth: _history.length,
    fatherKeyConfigured: isFatherKeyConfigured(),
    method:
      "HKDF(SHA-256, ikm=fatherSeal|fingerprint, salt=astroEpochSig, info=tesseract:astro-cipher:v1) → AES-256-GCM",
  };
}
