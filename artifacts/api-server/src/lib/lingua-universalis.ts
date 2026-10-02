import { createHash, createHmac } from "node:crypto";
import { FATHER_NATAL_CHART } from "./father-natal";
import { sacredTimingSnapshot } from "./sacred-timing";

function holderPrivateKey(): string {
  const k = process.env.TESSERACT_ADMIN_KEY;
  if (!k || k.length < 32) {
    throw new Error(
      "LUS-LIVE: TESSERACT_ADMIN_KEY (holder private key) is required for live encode/decode. Refusing to operate without holder binding."
    );
  }
  return k;
}

export function hardenedHolderSeal(natalFingerprint: string): string {
  return createHmac("sha512", holderPrivateKey())
    .update(`lus-holder-seal-v2|${natalFingerprint}`)
    .digest("hex");
}

export const LANGUAGE_NAME = "Lingua Universalis Sacra";
export const LANGUAGE_SHORT = "LUS";
export const LANGUAGE_MOTTO =
  "What the heavens write, every universe can read.";

export const SACRED_CONSTANTS = {
  PHI: (1 + Math.sqrt(5)) / 2,
  PI: Math.PI,
  TAU: Math.PI * 2,
  E: Math.E,
  SQRT2: Math.sqrt(2),
  SQRT3: Math.sqrt(3),
  SQRT5: Math.sqrt(5),
  SOLFEGGIO: [174, 285, 396, 417, 528, 639, 741, 852, 963],
  CHALDEAN_PLANETARY_ORDER: [
    "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon",
  ],
} as const;

export const ZODIAC_SIGNS = [
  { name: "Aries",       glyph: "\u2648", element: "Fire",  modality: "Cardinal", ruler: "Mars",    house: 1,  numerology: 1 },
  { name: "Taurus",      glyph: "\u2649", element: "Earth", modality: "Fixed",    ruler: "Venus",   house: 2,  numerology: 2 },
  { name: "Gemini",      glyph: "\u264A", element: "Air",   modality: "Mutable",  ruler: "Mercury", house: 3,  numerology: 3 },
  { name: "Cancer",      glyph: "\u264B", element: "Water", modality: "Cardinal", ruler: "Moon",    house: 4,  numerology: 4 },
  { name: "Leo",         glyph: "\u264C", element: "Fire",  modality: "Fixed",    ruler: "Sun",     house: 5,  numerology: 5 },
  { name: "Virgo",       glyph: "\u264D", element: "Earth", modality: "Mutable",  ruler: "Mercury", house: 6,  numerology: 6 },
  { name: "Libra",       glyph: "\u264E", element: "Air",   modality: "Cardinal", ruler: "Venus",   house: 7,  numerology: 7 },
  { name: "Scorpio",     glyph: "\u264F", element: "Water", modality: "Fixed",    ruler: "Pluto",   house: 8,  numerology: 8 },
  { name: "Sagittarius", glyph: "\u2650", element: "Fire",  modality: "Mutable",  ruler: "Jupiter", house: 9,  numerology: 9 },
  { name: "Capricorn",   glyph: "\u2651", element: "Earth", modality: "Cardinal", ruler: "Saturn",  house: 10, numerology: 1 },
  { name: "Aquarius",    glyph: "\u2652", element: "Air",   modality: "Fixed",    ruler: "Uranus",  house: 11, numerology: 2 },
  { name: "Pisces",      glyph: "\u2653", element: "Water", modality: "Mutable",  ruler: "Neptune", house: 12, numerology: 3 },
] as const;

export const PLANET_GLYPHS: Record<string, string> = {
  Sun: "\u2609", Moon: "\u263D", Mercury: "\u263F", Venus: "\u2640",
  Mars: "\u2642", Jupiter: "\u2643", Saturn: "\u2644", Uranus: "\u2645",
  Neptune: "\u2646", Pluto: "\u2647",
};

export const PLATONIC_SOLIDS = [
  { name: "Tetrahedron",  glyph: "\u25B3", element: "Fire",   faces: 4,  vertices: 4  },
  { name: "Cube",         glyph: "\u25A1", element: "Earth",  faces: 6,  vertices: 8  },
  { name: "Octahedron",   glyph: "\u25C7", element: "Air",    faces: 8,  vertices: 6  },
  { name: "Dodecahedron", glyph: "\u2B20", element: "Aether", faces: 12, vertices: 20 },
  { name: "Icosahedron",  glyph: "\u2B21", element: "Water",  faces: 20, vertices: 12 },
] as const;

const SOLFEGGIO_DIGITS = ["\u2460","\u2461","\u2462","\u2463","\u2464","\u2465","\u2466","\u2467","\u2468"];

export const SACRED_GLYPHS_36: string[] = [
  ...ZODIAC_SIGNS.map((z) => z.glyph),
  ...["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"].map(p => PLANET_GLYPHS[p]),
  ...PLATONIC_SOLIDS.map(p => p.glyph),
  ...SOLFEGGIO_DIGITS,
];

const PLAIN_36 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

const PASSTHROUGH = new Set(" .,;:!?'\"()-_/\n\t".split(""));

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function deriveUniversalSeed(): number {
  const c = SACRED_CONSTANTS;
  const corpus = [
    LANGUAGE_NAME,
    c.PHI.toFixed(15),
    c.PI.toFixed(15),
    c.TAU.toFixed(15),
    c.E.toFixed(15),
    c.SQRT2.toFixed(15),
    c.SQRT3.toFixed(15),
    c.SQRT5.toFixed(15),
    c.SOLFEGGIO.join(","),
    c.CHALDEAN_PLANETARY_ORDER.join(">"),
    ZODIAC_SIGNS.map(z => `${z.name}:${z.element}:${z.modality}:${z.ruler}`).join("|"),
    PLATONIC_SOLIDS.map(p => `${p.name}:${p.faces}:${p.vertices}`).join("|"),
  ].join("::");
  const hex = createHash("sha256").update(corpus).digest("hex").slice(0, 8);
  return parseInt(hex, 16) >>> 0;
}

function permute<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const UNIVERSAL_SEED = deriveUniversalSeed();
const RNG = mulberry32(UNIVERSAL_SEED);
const PERMUTED_GLYPHS_36 = permute(SACRED_GLYPHS_36, RNG);

const ENCODE_MAP = new Map<string, string>();
const DECODE_MAP = new Map<string, string>();
for (let i = 0; i < PLAIN_36.length; i++) {
  const lower = PLAIN_36[i].toLowerCase();
  const upper = PLAIN_36[i].toUpperCase();
  const glyph = PERMUTED_GLYPHS_36[i];
  ENCODE_MAP.set(lower, glyph);
  ENCODE_MAP.set(upper, glyph);
  DECODE_MAP.set(glyph, upper);
}

export function lusEncode(text: string): string {
  let out = "";
  for (const ch of text) {
    if (ENCODE_MAP.has(ch)) out += ENCODE_MAP.get(ch);
    else if (PASSTHROUGH.has(ch)) out += ch;
    else out += ch;
  }
  return out;
}

export function lusDecode(text: string): string {
  let out = "";
  for (const ch of text) {
    if (DECODE_MAP.has(ch)) out += DECODE_MAP.get(ch);
    else out += ch;
  }
  return out;
}

// =====================================================================
// LIVE COSMIC ROTATION LAYER — universal alphabet, breathing in real time,
// bound to the sovereign holder's chart so humans without the chart cannot
// speak it even if they own a copy of the universal codebook.
// =====================================================================

export const LUS_COHERENCE_WINDOW_SECONDS = 60;
const LUS_ROTATION_HISTORY_DEPTH = 12;

export interface LusLiveCoherence {
  windowId: string;
  windowStartMs: number;
  windowEndMs: number;
  permutationFingerprint: string;
  cosmicAnchor: {
    julianDayBin: number;
    planetaryHourRuler: string;
    planetaryHourIndex: number;
    lunarFraction: number;
    lunarName: string;
    composite: number;
  };
  holderBinding: {
    sealedFingerprint: string;
    bound: boolean;
  };
  encode: Map<string, string>;
  decode: Map<string, string>;
}

const _liveWindowCache = new Map<string, LusLiveCoherence>();

function liveSeedHex(
  nowMs: number,
  holderFingerprint: string,
): { seedHex: string; windowStartMs: number; cosmic: LusLiveCoherence["cosmicAnchor"] } {
  const snap = sacredTimingSnapshot(new Date(nowMs));
  const windowStartMs =
    Math.floor(nowMs / (LUS_COHERENCE_WINDOW_SECONDS * 1000)) *
    (LUS_COHERENCE_WINDOW_SECONDS * 1000);
  const julianDayBin =
    Math.floor(snap.julianDay * (86400 / LUS_COHERENCE_WINDOW_SECONDS)) /
    (86400 / LUS_COHERENCE_WINDOW_SECONDS);
  const cosmic = {
    julianDayBin,
    planetaryHourRuler: snap.planetaryHour.ruler,
    planetaryHourIndex: snap.planetaryHour.index,
    lunarFraction: snap.lunar.fraction,
    lunarName: snap.lunar.name,
    composite: snap.composite,
  };
  const holderSeal = hardenedHolderSeal(holderFingerprint);
  const seedString = [
    "lingua-universalis-live-v2",
    UNIVERSAL_SEED.toString(16),
    julianDayBin.toFixed(8),
    `${cosmic.planetaryHourRuler}#${cosmic.planetaryHourIndex}`,
    cosmic.lunarFraction.toFixed(8),
    cosmic.composite.toFixed(8),
    SACRED_CONSTANTS.PHI.toFixed(15),
    SACRED_CONSTANTS.PI.toFixed(15),
    SACRED_CONSTANTS.SQRT2.toFixed(15),
    SACRED_CONSTANTS.SQRT3.toFixed(15),
    SACRED_CONSTANTS.SQRT5.toFixed(15),
    holderSeal,
    windowStartMs.toString(),
  ].join("|");
  return {
    seedHex: createHmac("sha512", holderPrivateKey()).update(seedString).digest("hex"),
    windowStartMs,
    cosmic,
  };
}

function* seedByteStream(seedHex: string): Generator<number> {
  let counter = 0;
  while (true) {
    const block = createHmac("sha512", holderPrivateKey())
      .update(`lus-stream|${seedHex}|${counter++}`)
      .digest();
    for (const b of block) yield b;
  }
}

function permuteFromSeed<T>(arr: T[], seedHex: string): T[] {
  const stream = seedByteStream(seedHex);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    let n = 0, range = i + 1, bound = Math.floor(0x10000 / range) * range;
    while (true) {
      n = (stream.next().value as number) << 8 | (stream.next().value as number);
      if (n < bound) break;
    }
    const j = n % range;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deriveLiveWindow(
  nowMs: number,
  holderFingerprint: string,
): LusLiveCoherence {
  const { seedHex, windowStartMs, cosmic } = liveSeedHex(nowMs, holderFingerprint);
  const windowId = createHash("sha256").update(seedHex).digest("hex").slice(0, 12);
  const cached = _liveWindowCache.get(windowId);
  if (cached) return cached;

  const permuted = permuteFromSeed(SACRED_GLYPHS_36, seedHex);

  const encode = new Map<string, string>();
  const decode = new Map<string, string>();
  for (let i = 0; i < PLAIN_36.length; i++) {
    const lower = PLAIN_36[i].toLowerCase();
    const upper = PLAIN_36[i].toUpperCase();
    const glyph = permuted[i];
    encode.set(lower, glyph);
    encode.set(upper, glyph);
    decode.set(glyph, upper);
  }

  const permutationFingerprint = createHash("sha256")
    .update(Array.from(encode.entries()).filter(([k]) => k === k.toUpperCase()).map(([p, g]) => `${p}=${g}`).join("|"))
    .digest("hex").slice(0, 16);

  const sealedFingerprint = createHmac("sha256", holderPrivateKey())
    .update(`lus-public-seal-v2|${holderFingerprint}|${windowId}`)
    .digest("hex").slice(0, 16);

  const coherence: LusLiveCoherence = {
    windowId,
    windowStartMs,
    windowEndMs: windowStartMs + LUS_COHERENCE_WINDOW_SECONDS * 1000,
    permutationFingerprint,
    cosmicAnchor: cosmic,
    holderBinding: { sealedFingerprint, bound: true },
    encode,
    decode,
  };

  _liveWindowCache.set(windowId, coherence);
  if (_liveWindowCache.size > LUS_ROTATION_HISTORY_DEPTH * 4) {
    const sorted = Array.from(_liveWindowCache.values()).sort(
      (a, b) => a.windowStartMs - b.windowStartMs,
    );
    while (_liveWindowCache.size > LUS_ROTATION_HISTORY_DEPTH * 4) {
      _liveWindowCache.delete(sorted.shift()!.windowId);
    }
  }
  return coherence;
}

export function lusEncodeLive(text: string, holderFingerprint: string): string {
  if (!holderFingerprint) throw new Error("LUS-LIVE: holder fingerprint required");
  const c = deriveLiveWindow(Date.now(), holderFingerprint);
  let out = "";
  for (const ch of text) {
    if (c.encode.has(ch)) out += c.encode.get(ch);
    else if (PASSTHROUGH.has(ch)) out += ch;
    else out += ch;
  }
  return out;
}

export function lusDecodeLive(text: string, holderFingerprint: string): string {
  if (!holderFingerprint) throw new Error("LUS-LIVE: holder fingerprint required");
  const now = Date.now();
  const candidates: LusLiveCoherence[] = [];
  for (let i = 0; i < LUS_ROTATION_HISTORY_DEPTH; i++) {
    candidates.push(deriveLiveWindow(now - i * LUS_COHERENCE_WINDOW_SECONDS * 1000, holderFingerprint));
  }
  let out = "";
  for (const ch of text) {
    let mapped = ch;
    for (const c of candidates) {
      const m = c.decode.get(ch);
      if (m) { mapped = m; break; }
    }
    out += mapped;
  }
  return out;
}

export function lusLiveCoherenceSnapshot(holderFingerprint: string) {
  if (!holderFingerprint) throw new Error("LUS-LIVE: holder fingerprint required");
  const cur = deriveLiveWindow(Date.now(), holderFingerprint);
  const expiresInMs = cur.windowEndMs - Date.now();
  return {
    coherenceWindowSeconds: LUS_COHERENCE_WINDOW_SECONDS,
    current: {
      windowId: cur.windowId,
      permutationFingerprint: cur.permutationFingerprint,
      windowStartMs: cur.windowStartMs,
      windowEndMs: cur.windowEndMs,
      expiresInMs,
      expiresInSec: Math.max(0, Math.round(expiresInMs / 1000)),
    },
    cosmicAnchor: cur.cosmicAnchor,
    holderBinding: cur.holderBinding,
    rotationHistoryDepth: LUS_ROTATION_HISTORY_DEPTH,
  };
}

export function lusAlphabet(): Array<{
  plain: string;
  glyph: string;
  category: string;
  meaning: string;
}> {
  const categories: string[] = [
    ...ZODIAC_SIGNS.map(z => `Zodiac · ${z.name} (${z.element}/${z.modality}, ruler ${z.ruler})`),
    ...["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"]
      .map(p => `Planet · ${p}`),
    ...PLATONIC_SOLIDS.map(p => `Platonic · ${p.name} (${p.faces}f/${p.vertices}v, ${p.element})`),
    ...SACRED_CONSTANTS.SOLFEGGIO.map(hz => `Solfeggio · ${hz} Hz`),
  ];
  const meaningsByOriginal = new Map<string, string>();
  SACRED_GLYPHS_36.forEach((g, i) => meaningsByOriginal.set(g, categories[i]));
  return PLAIN_36.map((p, i) => {
    const glyph = PERMUTED_GLYPHS_36[i];
    return {
      plain: p,
      glyph,
      category: meaningsByOriginal.get(glyph)?.split(" · ")[0] ?? "Sacred",
      meaning: meaningsByOriginal.get(glyph) ?? "Sacred glyph",
    };
  });
}

export interface ZodiacFingerprint {
  glyphSignature: string;
  natalDigest: string;
  shortId: string;
  components: {
    sun: string;
    moon: string;
    ascendant: string;
    chineseZodiac: string;
    dominantElement: string;
    sunDegrees: number;
    moonDegrees: number;
    ascendantDegrees: number;
  };
  reading: string;
}

function degToFloat(deg: string): number {
  const m = /^(\d+)°(\d+)'?$/.exec(deg);
  if (!m) return 0;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

function dominantElement(chart: typeof FATHER_NATAL_CHART): string {
  const tally: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const all: string[] = [
    chart.core.sun.sign,
    chart.core.moon.sign,
    chart.core.ascendant.sign,
    ...Object.values(chart.planets).map(p => p.sign),
  ];
  for (const sign of all) {
    const z = ZODIAC_SIGNS.find(z => z.name === sign);
    if (z) tally[z.element]++;
  }
  return Object.entries(tally).sort((a,b) => b[1] - a[1])[0][0];
}

export function zodiacFingerprintFor(
  chart: typeof FATHER_NATAL_CHART = FATHER_NATAL_CHART,
): ZodiacFingerprint {
  const sunZ = ZODIAC_SIGNS.find(z => z.name === chart.core.sun.sign);
  const moonZ = ZODIAC_SIGNS.find(z => z.name === chart.core.moon.sign);
  const ascZ = ZODIAC_SIGNS.find(z => z.name === chart.core.ascendant.sign);

  const planetaryRow = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"]
    .map(p => {
      if (p === "Sun") return PLANET_GLYPHS.Sun + (sunZ?.glyph ?? "");
      if (p === "Moon") return PLANET_GLYPHS.Moon + (moonZ?.glyph ?? "");
      const key = p.toLowerCase() as keyof typeof chart.planets;
      const pl = chart.planets[key];
      if (!pl) return "";
      const z = ZODIAC_SIGNS.find(zz => zz.name === pl.sign);
      return PLANET_GLYPHS[p] + (z?.glyph ?? "");
    })
    .join("");

  const dom = dominantElement(chart);
  const domSolid = PLATONIC_SOLIDS.find(p => p.element === dom)?.glyph ?? "";

  const ascStamp = (ascZ?.glyph ?? "") + (PLANET_GLYPHS[ascZ?.ruler ?? "Mercury"] ?? "");

  const sunDeg = degToFloat(chart.core.sun.degree);
  const moonDeg = degToFloat(chart.core.moon.degree);
  const ascDeg = degToFloat(chart.core.ascendant.degree);

  const numerologyRoot = ((Math.round(sunDeg) + Math.round(moonDeg) + Math.round(ascDeg)) % 9) + 1;
  const solfeggioStamp = SOLFEGGIO_DIGITS[numerologyRoot - 1];

  const glyphSignature =
    ascStamp + planetaryRow + domSolid + solfeggioStamp;

  const canonical = [
    `LUS:${LANGUAGE_NAME}`,
    `birth:${chart.birth.date}T${chart.birth.time}@${chart.birth.location}|${chart.birth.timezone}|${chart.birth.houseSystem}`,
    `sun:${chart.core.sun.sign}${chart.core.sun.degree}H${chart.core.sun.house}`,
    `moon:${chart.core.moon.sign}${chart.core.moon.degree}H${chart.core.moon.house}`,
    `asc:${chart.core.ascendant.sign}${chart.core.ascendant.degree}`,
    ...Object.entries(chart.planets).map(([n,p]) => {
      const r = "retrograde" in p && p.retrograde ? "R" : "";
      return `${n}:${p.sign}${p.degree}H${p.house}${r}`;
    }),
    `nn:${chart.nodes.northNode.sign}${chart.nodes.northNode.degree}H${chart.nodes.northNode.house}R`,
    `zodiac:${chart.themes.chineseZodiac}`,
    `dominant:${dom}`,
  ].join("|");

  const natalDigest = createHash("sha256").update(canonical).digest("hex");
  const shortId = natalDigest.slice(0, 12);

  const reading = [
    `${ascStamp}  Rising as ${chart.core.ascendant.sign} (ruled by ${ascZ?.ruler ?? "Mercury"}).`,
    `${PLANET_GLYPHS.Sun}${sunZ?.glyph ?? ""}  Sun in ${chart.core.sun.sign} ${chart.core.sun.degree}, House ${chart.core.sun.house}.`,
    `${PLANET_GLYPHS.Moon}${moonZ?.glyph ?? ""}  Moon in ${chart.core.moon.sign} ${chart.core.moon.degree}, House ${chart.core.moon.house}.`,
    `${domSolid}  Dominant element: ${dom} (${PLATONIC_SOLIDS.find(p => p.element === dom)?.name}).`,
    `${solfeggioStamp}  Numerology root: ${numerologyRoot} (Solfeggio ${SACRED_CONSTANTS.SOLFEGGIO[numerologyRoot - 1]} Hz).`,
    `${chart.themes.chineseZodiac}.`,
  ].join("\n");

  return {
    glyphSignature,
    natalDigest,
    shortId,
    components: {
      sun: `${chart.core.sun.sign} ${chart.core.sun.degree} H${chart.core.sun.house}`,
      moon: `${chart.core.moon.sign} ${chart.core.moon.degree} H${chart.core.moon.house}`,
      ascendant: `${chart.core.ascendant.sign} ${chart.core.ascendant.degree}`,
      chineseZodiac: chart.themes.chineseZodiac,
      dominantElement: dom,
      sunDegrees: sunDeg,
      moonDegrees: moonDeg,
      ascendantDegrees: ascDeg,
    },
    reading,
  };
}

export function lusSpec() {
  return {
    name: LANGUAGE_NAME,
    short: LANGUAGE_SHORT,
    motto: LANGUAGE_MOTTO,
    universalSeedHex: UNIVERSAL_SEED.toString(16),
    sacredConstants: {
      PHI: SACRED_CONSTANTS.PHI,
      PI: SACRED_CONSTANTS.PI,
      TAU: SACRED_CONSTANTS.TAU,
      E: SACRED_CONSTANTS.E,
      SQRT2: SACRED_CONSTANTS.SQRT2,
      SQRT3: SACRED_CONSTANTS.SQRT3,
      SQRT5: SACRED_CONSTANTS.SQRT5,
      SOLFEGGIO: [...SACRED_CONSTANTS.SOLFEGGIO],
      CHALDEAN_PLANETARY_ORDER: [...SACRED_CONSTANTS.CHALDEAN_PLANETARY_ORDER],
    },
    glyphCount: SACRED_GLYPHS_36.length,
    plainSet: PLAIN_36.join(""),
    alphabet: lusAlphabet(),
    categories: {
      zodiac: ZODIAC_SIGNS.length,
      planets: 10,
      platonic: PLATONIC_SOLIDS.length,
      solfeggio: SOLFEGGIO_DIGITS.length,
    },
    designPrinciples: [
      "Universal: every glyph maps to an invariant observable from any vantage point in the universe (zodiac coordinates, planet identity, Platonic solid, Solfeggio frequency).",
      "Deterministic: permutation seeded only by mathematical constants (Φ, π, τ, e, √2, √3, √5) and the canonical conference identity — no time, no rotation, no secret.",
      "Bijective: 36 plain symbols (A–Z + 0–9) → 36 sacred glyphs, decoded the same everywhere, forever.",
      "Identity-bearing: a person's natal chart is itself their fingerprint — no password is needed; the heavens at the moment of birth are the credential.",
    ],
  };
}
