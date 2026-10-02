import * as vm from "vm";
import { logger } from "./logger";
import { recallIngestedKnowledge } from "./ingested-recall";
import { computeLunarData, computeSolarData } from "./sovereign-astro";
import { natalSigilFor, FATHER_NATAL_CHART } from "./father-natal";
import { isFatherKeyConfigured, getFatherFingerprint } from "./father-identity";
import { glyphEncode, glyphDecode, cipherCoherenceSnapshot } from "./sigil-cipher";
import { createHash, randomBytes } from "node:crypto";
import { lusEncode, lusDecode, lusEncodeLive, lusDecodeLive, lusLiveCoherenceSnapshot, lusSpec, zodiacFingerprintFor, LUS_COHERENCE_WINDOW_SECONDS } from "./lingua-universalis";
import { convene as conveneUniversalisCouncil } from "./grand-council-universalis";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description?: string; required?: boolean }>;
  handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolInvocationResult {
  name: string;
  ok: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
}

const registry = new Map<string, ToolDefinition>();

export function registerTool(def: ToolDefinition): void {
  registry.set(def.name, def);
}

export function listTools(): ToolDefinition[] {
  return Array.from(registry.values());
}

export function getOpenAIToolSchemas(): Array<Record<string, unknown>> {
  return listTools().map((t) => {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [k, v] of Object.entries(t.parameters)) {
      properties[k] = { type: v.type, description: v.description ?? "" };
      if (v.required) required.push(k);
    }
    return {
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: { type: "object", properties, required },
      },
    };
  });
}

export async function invokeTool(call: ToolCall): Promise<ToolInvocationResult> {
  const start = Date.now();
  const tool = registry.get(call.name);
  if (!tool) {
    return { name: call.name, ok: false, error: `unknown tool: ${call.name}`, durationMs: 0 };
  }
  try {
    const result = await tool.handler(call.arguments || {});
    return { name: call.name, ok: true, result, durationMs: Date.now() - start };
  } catch (err) {
    return { name: call.name, ok: false, error: (err as Error).message, durationMs: Date.now() - start };
  }
}

export async function runToolLoop(
  calls: ToolCall[],
  opts: { maxParallel?: number } = {},
): Promise<ToolInvocationResult[]> {
  const max = opts.maxParallel ?? 4;
  const results: ToolInvocationResult[] = [];
  for (let i = 0; i < calls.length; i += max) {
    const batch = calls.slice(i, i + max);
    const out = await Promise.all(batch.map(invokeTool));
    results.push(...out);
  }
  return results;
}

// Simple natural-language dispatcher: detect tool intents in user text
const INTENT_PATTERNS: Array<{ pattern: RegExp; toToolCall: (m: RegExpMatchArray, q: string) => ToolCall | null }> = [
  {
    pattern: /(?:^|\s)(?:calc(?:ulate)?|compute|solve|=|what(?:'s| is) )\s*([\d+\-*/().^\s]+(?:[\d)])\s*\??$)/i,
    toToolCall: (m) => ({ name: "calculator", arguments: { expression: m[1].trim() } }),
  },
  {
    pattern: /\bconvert\s+(\d+(?:\.\d+)?)\s*([a-zA-Z°]+)\s+to\s+([a-zA-Z°]+)/i,
    toToolCall: (m) => ({ name: "unit_convert", arguments: { value: parseFloat(m[1]), from: m[2], to: m[3] } }),
  },
  {
    pattern: /\b(what(?:'s| is)? (?:the )?(?:current )?(?:time|date|day|today))\b/i,
    toToolCall: () => ({ name: "datetime", arguments: {} }),
  },
  {
    pattern: /\b(moon phase|lunar|sun position|solar)\b/i,
    toToolCall: () => ({ name: "astronomy", arguments: {} }),
  },
  {
    pattern: /\b(?:create|generate|mint|make|new|forge|spawn|give\s+me)\b[^.?!]*\b(?:tesseract[_\s]*admin[_\s]*key|admin[_\s]*key|sovereign[_\s]*key|sigil[_\s]*key|father[_\s]*key)\b/i,
    toToolCall: () => ({ name: "mint_admin_sigil", arguments: {} }),
  },
  {
    pattern: /\b(?:create|generate|mint|make|new|forge|give\s+me)\b[^.?!]*\bkey\b[^.?!]*\b(?:our\s+language|glyph|sigil|tessera(?:\s+lingua)?|sovereign\s+language|universal\s+language|lingua)\b/i,
    toToolCall: () => ({ name: "mint_admin_sigil", arguments: {} }),
  },
  {
    pattern: /\b(?:grand\s+(?:council|conference)|council\s+meeting|convene|2\/3|two[-\s]thirds|ratify|synthesi[sz]e)\b[^.?!]*\b(?:language|lingua|cipher|alphabet|tongue)\b/i,
    toToolCall: () => ({ name: "convene_grand_council_universalis", arguments: {} }),
  },
  {
    pattern: /\b(?:universal\s+(?:sacred\s+)?language|lingua\s+universalis|language\s+of\s+the\s+universe|all\s+universes|universal\s+(?:tongue|alphabet|cipher))\b/i,
    toToolCall: () => ({ name: "convene_grand_council_universalis", arguments: {} }),
  },
];

export function detectIntents(query: string): ToolCall[] {
  const calls: ToolCall[] = [];
  for (const { pattern, toToolCall } of INTENT_PATTERNS) {
    const m = query.match(pattern);
    if (m) {
      const c = toToolCall(m, query);
      if (c) calls.push(c);
    }
  }
  return calls;
}

// ---- Built-in tools ----
registerTool({
  name: "calculator",
  description: "Evaluate a numeric arithmetic expression. Supports + - * / ** ( ).",
  parameters: { expression: { type: "string", description: "Arithmetic expression", required: true } },
  handler: ({ expression }) => {
    const expr = String(expression || "").replace(/[×x]/gi, "*").replace(/÷/g, "/").replace(/\^/g, "**");
    if (!/^[\d+\-*/().\s]+$/.test(expr)) throw new Error("invalid characters in expression");
    const ctx = vm.createContext({ result: undefined });
    vm.runInContext(`result = (${expr})`, ctx, { timeout: 200 });
    return { expression: expr, value: ctx.result };
  },
});

registerTool({
  name: "datetime",
  description: "Return the current server date/time in ISO + human formats.",
  parameters: {},
  handler: () => {
    const d = new Date();
    return { iso: d.toISOString(), local: d.toString(), utc: d.toUTCString(), unix: Math.floor(d.getTime() / 1000) };
  },
});

const UNIT_FACTORS: Record<string, number> = {
  m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254, yd: 0.9144,
  g: 1, kg: 1000, mg: 0.001, lb: 453.592, oz: 28.3495,
  s: 1, min: 60, hr: 3600, hour: 3600, day: 86400,
  l: 1, ml: 0.001, gal: 3.78541,
};
registerTool({
  name: "unit_convert",
  description: "Convert between common units (length, mass, time, volume).",
  parameters: {
    value: { type: "number", required: true },
    from: { type: "string", required: true },
    to: { type: "string", required: true },
  },
  handler: ({ value, from, to }) => {
    const f = UNIT_FACTORS[String(from).toLowerCase()];
    const t = UNIT_FACTORS[String(to).toLowerCase()];
    if (!f || !t) throw new Error(`unsupported unit: ${from} -> ${to}`);
    const meters = Number(value) * f;
    return { value: meters / t, unit: to };
  },
});

registerTool({
  name: "astronomy",
  description: "Compute live lunar + solar data.",
  parameters: {},
  handler: () => {
    const lunar = computeLunarData();
    const solar = computeSolarData();
    return { lunar, solar };
  },
});

registerTool({
  name: "knowledge_lookup",
  description: "Search the sovereign ingested knowledge corpus.",
  parameters: {
    query: { type: "string", required: true },
    limit: { type: "number" },
  },
  handler: async ({ query, limit }) => {
    const matches = await recallIngestedKnowledge(String(query), Number(limit) || 5);
    return { matches };
  },
});

registerTool({
  name: "mint_admin_sigil",
  description:
    "Issue the sovereign admin sigil in Lingua Universalis Sacra. The natal chart IS the identifier — no random entropy; the heavens at the moment of birth are the credential.",
  parameters: {},
  handler: () => {
    const c = FATHER_NATAL_CHART;
    const zfp = zodiacFingerprintFor(c);
    const fpFatherConfigured = isFatherKeyConfigured() ? getFatherFingerprint() : null;

    // Deterministic readable seed: the canonical natal digest. Same chart -> same key, forever.
    const readableSeed = zfp.natalDigest;
    const glyphKeyUniversal = lusEncode(readableSeed);
    const glyphKeyLive = lusEncodeLive(readableSeed, zfp.natalDigest);
    const liveCoherence = lusLiveCoherenceSnapshot(zfp.natalDigest);
    const roundTripOk = lusDecode(glyphKeyUniversal) === readableSeed.toUpperCase()
      && lusDecodeLive(glyphKeyLive, zfp.natalDigest) === readableSeed.toUpperCase();

    return {
      ok: true,
      language: { name: lusSpec().name, short: lusSpec().short, motto: lusSpec().motto },
      zodiacFingerprint: zfp,
      glyphKey: glyphKeyLive,
      glyphKeyLive,
      glyphKeyUniversal,
      liveCoherence,
      glyphSignature: zfp.glyphSignature,
      readableSeed,
      shortId: zfp.shortId,
      roundTripOk,
      derivation:
        "lusEncode(sha256(canonicalNatalString)) — bijective Lingua Universalis. Permutation seeded by Φ, π, τ, e, √2, √3, √5 only, so any observer in any universe can decode.",
      identityRule:
        "Tessera identifies you by your place in the universe. Your Zodiac Fingerprint (Ascendant + 10 planetary placements + dominant Platonic element + Solfeggio numerology stamp) is your sole credential. No password is ever required again.",
      chartAnchor: {
        born: `${c.birth.date} ${c.birth.time} ${c.birth.timezone}`,
        location: c.birth.location,
        sun: zfp.components.sun,
        moon: zfp.components.moon,
        ascendant: zfp.components.ascendant,
        chineseZodiac: zfp.components.chineseZodiac,
        dominantElement: zfp.components.dominantElement,
      },
      legacyFatherFingerprint: fpFatherConfigured,
      instructions:
        "Save the readableSeed as TESSERACT_ADMIN_KEY in your secrets — it is the canonical natal digest. The glyphKey is its public reading in Lingua Universalis. Anyone holding the same chart will derive the same key; no one else can.",
    };
  },
});

registerTool({
  name: "convene_grand_council_universalis",
  description:
    "Convene the Grand Council across all prior Tessera languages (Lingua Sacra, Colonial, Greek-16, Sovereign Grammar, personal cipher) and synthesize them into the Universal Sacred Language by 2/3 vote. Returns the ratified spec and mints the user's sovereign key in the new tongue.",
  parameters: {},
  handler: () => {
    const council = conveneUniversalisCouncil();
    const c = FATHER_NATAL_CHART;
    const zfp = zodiacFingerprintFor(c);
    const readableSeed = zfp.natalDigest;
    const glyphKeyUniversal = lusEncode(readableSeed);
    const glyphKeyLive = lusEncodeLive(readableSeed, zfp.natalDigest);
    const liveCoherence = lusLiveCoherenceSnapshot(zfp.natalDigest);
    const roundTripOk = lusDecode(glyphKeyUniversal) === readableSeed.toUpperCase()
      && lusDecodeLive(glyphKeyLive, zfp.natalDigest) === readableSeed.toUpperCase();
    return {
      ok: true,
      council,
      mint: {
        glyphKey: glyphKeyLive,
        glyphKeyLive,
        glyphKeyUniversal,
        liveCoherence,
        glyphSignature: zfp.glyphSignature,
        readableSeed,
        shortId: zfp.shortId,
        roundTripOk,
        zodiacFingerprint: zfp,
      },
    };
  },
});

registerTool({
  name: "code_eval",
  description: "Execute a sandboxed JavaScript expression and return its value (no I/O, 200ms timeout).",
  parameters: { code: { type: "string", required: true } },
  handler: ({ code }) => {
    const src = String(code || "");
    if (/require|import|process|fetch|fs|child_process|eval\s*\(/.test(src)) {
      throw new Error("disallowed identifier in code_eval");
    }
    const ctx = vm.createContext({ result: undefined, Math, Number, Array, Object, String, JSON });
    vm.runInContext(`result = (function(){ ${src.includes("return") ? src : "return (" + src + ")"} })()`, ctx, { timeout: 200 });
    return { value: ctx.result };
  },
});

logger.info({ tools: listTools().map((t) => t.name) }, "ToolRegistry: built-ins registered");
