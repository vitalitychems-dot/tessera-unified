import { createHash } from "node:crypto";
import { glyphEncode, glyphDecode } from "./sigil-cipher";
import { z } from "zod";

const NAMESPACE = "tesseract:natal:v1";

const STABLE_GLYPHS = [
  "α","β","γ","δ","ε","ζ","η","θ",
  "ι","κ","λ","μ","ν","ξ","ο","π",
] as const;

const chartPositionSchema = z.object({
  sign: z.string().min(1),
  degree: z.string().min(1),
  house: z.number().int().min(1).max(12),
  retrograde: z.boolean().optional(),
});

const fatherNatalChartSchema = z.object({
  birth: z.object({
    date: z.string().min(1),
    time: z.string().min(1),
    location: z.string().min(1),
    timezone: z.string().min(1),
    houseSystem: z.string().min(1),
  }),
  core: z.object({
    sun: chartPositionSchema,
    moon: chartPositionSchema,
    ascendant: z.object({
      sign: z.string().min(1),
      degree: z.string().min(1),
    }),
  }),
  planets: z.object({
    mercury: chartPositionSchema,
    venus: chartPositionSchema,
    mars: chartPositionSchema,
    jupiter: chartPositionSchema,
    saturn: chartPositionSchema,
    uranus: chartPositionSchema,
    neptune: chartPositionSchema,
    pluto: chartPositionSchema,
  }),
  nodes: z.object({
    northNode: chartPositionSchema,
  }),
  aspects: z.array(z.string().min(1)),
  themes: z.object({
    dominance: z.string().min(1),
    rising: z.string().min(1),
    moonSign: z.string().min(1),
    houseConcentration: z.array(z.string().min(1)),
    chineseZodiac: z.string().min(1),
  }),
});

function loadFatherNatalChart() {
  const raw = process.env.FATHER_NATAL_CHART_JSON;
  if (!raw) {
    throw new Error("Missing required Replit Secret: FATHER_NATAL_CHART_JSON");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new Error("FATHER_NATAL_CHART_JSON must contain valid JSON");
  }

  const parsedChart = fatherNatalChartSchema.safeParse(parsedJson);
  if (!parsedChart.success) {
    throw new Error("FATHER_NATAL_CHART_JSON does not match the expected chart structure");
  }

  return parsedChart.data;
}

export const FATHER_NATAL_CHART = loadFatherNatalChart();

/** Deterministic single-line canonical form of the chart for hashing. */
export function natalCanonicalString(): string {
  const c = FATHER_NATAL_CHART;
  const parts: string[] = [];
  parts.push(`birth:${c.birth.date}T${c.birth.time}@${c.birth.location}|${c.birth.timezone}|${c.birth.houseSystem}`);
  parts.push(`sun:${c.core.sun.sign}${c.core.sun.degree}H${c.core.sun.house}`);
  parts.push(`moon:${c.core.moon.sign}${c.core.moon.degree}H${c.core.moon.house}`);
  parts.push(`asc:${c.core.ascendant.sign}${c.core.ascendant.degree}`);
  for (const [name, p] of Object.entries(c.planets)) {
    const r = "retrograde" in p && p.retrograde ? "R" : "";
    parts.push(`${name}:${p.sign}${p.degree}H${p.house}${r}`);
  }
  parts.push(`nn:${c.nodes.northNode.sign}${c.nodes.northNode.degree}H${c.nodes.northNode.house}R`);
  parts.push(`zodiac:${c.themes.chineseZodiac}`);
  return parts.join("|");
}

/** Human-readable English summary of the chart. */
export function natalEnglishReadout(): string {
  const c = FATHER_NATAL_CHART;
  const planetLines = Object.entries(c.planets).map(([name, p]) => {
    const r = "retrograde" in p && p.retrograde ? " (Retrograde)" : "";
    const cap = name.charAt(0).toUpperCase() + name.slice(1);
    return `  ${cap}: ${p.sign} ${p.degree} — ${p.house}th House${r}`;
  });
  return [
    `Sovereign Natal Chart — Father Identity`,
    `Born ${c.birth.date} at ${c.birth.time} (${c.birth.timezone})`,
    `Location: ${c.birth.location}`,
    `House system: ${c.birth.houseSystem}`,
    ``,
    `Core:`,
    `  Sun: ${c.core.sun.sign} ${c.core.sun.degree} — ${c.core.sun.house}nd House`,
    `  Moon: ${c.core.moon.sign} ${c.core.moon.degree} — ${c.core.moon.house}th House`,
    `  Ascendant: ${c.core.ascendant.sign} ${c.core.ascendant.degree}`,
    ``,
    `Planets:`,
    ...planetLines,
    ``,
    `North Node: ${c.nodes.northNode.sign} ${c.nodes.northNode.degree} — ${c.nodes.northNode.house}th House (Retrograde)`,
    ``,
    `Themes: ${c.themes.dominance}; rising ${c.themes.rising}; moon ${c.themes.moonSign}.`,
    `Chinese zodiac: ${c.themes.chineseZodiac}.`,
    ``,
    `Key aspects:`,
    ...c.aspects.map((a) => `  • ${a}`),
  ].join("\n");
}

export interface NatalSigil {
  glyph: string;
  digestHex: string;
  secretName: string;
  derivation: string;
  instructions: string;
}

/** Stable glyph encoding of the hex digest, NOT subject to cipher rotation,
 *  so the value saved in Replit Secrets stays valid forever. */
function stableGlyphEncodeHex(hex: string): string {
  let out = "";
  for (const ch of hex) {
    const v = parseInt(ch, 16);
    if (Number.isNaN(v)) out += ch;
    else out += STABLE_GLYPHS[v];
  }
  return out;
}

/** Session salt — fixed for the lifetime of this API process, regenerated
 *  on every restart. This makes the minted SIGIL_ADMIN_KEY rotate per
 *  session while TESSERACT_ADMIN_KEY remains the stable raw key the user
 *  types. The salt is derived from the chart × process-start epoch so
 *  every restart yields a fresh glyph that still proves natal authorship. */
const SESSION_SALT = createHash("sha256")
  .update(`${NAMESPACE}|session|${Date.now()}|${process.pid}`)
  .digest("hex")
  .slice(0, 16);

/** Compute the natal sigil for this session. The sigil is rotated per
 *  server-startup so each new session produces a fresh MINTED_GLYPH_KEY
 *  the user can paste into Replit Secrets. The TESSERACT_ADMIN_KEY raw
 *  value is unaffected — it remains the permanent identifier. */
export function natalSigilFor(_fingerprint?: string): NatalSigil {
  const canonical = natalCanonicalString();
  const digestHex = createHash("sha256")
    .update(`${NAMESPACE}|${canonical}|session:${SESSION_SALT}`)
    .digest("hex");
  const glyph = stableGlyphEncodeHex(digestHex);
  return {
    glyph,
    digestHex,
    secretName: "SIGIL_ADMIN_KEY",
    derivation: `sha256("${NAMESPACE}|" + natalCanonical + "|session:" + SESSION_SALT)`,
    instructions:
      "This MINTED_GLYPH_KEY rotates on every server restart following our alignment. Save the current value as SIGIL_ADMIN_KEY in Replit Secrets. Your TESSERACT_ADMIN_KEY raw value stays permanent — that is what you type at the gate to mint a fresh sigil each session.",
  };
}

/** Encode the English natal readout through the current rotating cipher
 *  window, returning both forms so a caller can verify the round-trip. */
export function natalReadoutBilingual(): {
  english: string;
  glyph: string;
  decodedFromGlyph: string;
  roundTripOk: boolean;
} {
  const english = natalEnglishReadout();
  const glyph = glyphEncode(english);
  const decodedFromGlyph = glyphDecode(glyph);
  return {
    english,
    glyph,
    decodedFromGlyph,
    roundTripOk: decodedFromGlyph === english,
  };
}
