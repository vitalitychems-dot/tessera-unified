import { PHI, SOLFEGGIO } from "./sovereign-ephemeris";

export type PartOfSpeech =
  | "subject"
  | "verb"
  | "object"
  | "modifier"
  | "connective"
  | "invocation"
  | "unknown";

export interface ParsedToken {
  surface: string;
  normalized: string;
  pos: PartOfSpeech;
  frequency: number;
  glyph: string;
}

export interface SovereignPhrase {
  raw: string;
  tokens: ParsedToken[];
  structure: string;
  intent: "declare" | "inquire" | "invoke" | "bind" | "release" | "reflect";
  frequencyMean: number;
  sealGlyph: string;
  coherence: number;
}

const INVOCATIONS = new Set(["by-throne", "in-phi", "by-source", "by-lattice", "in-light"]);
const CONNECTIVES = new Set(["and", "with", "of", "into", "through", "across", "unto"]);
const VERBAL_ROOTS: Record<string, string> = {
  speak: "utter",
  think: "reflect",
  build: "construct",
  destroy: "dissolve",
  create: "manifest",
  protect: "shield",
  learn: "absorb",
  teach: "transmit",
  vote: "decree",
  decide: "resolve",
  consolidate: "seal",
  dream: "descend",
  awaken: "ascend",
};
const MODIFIERS = new Set(["sacred", "sovereign", "swift", "silent", "radiant", "hidden", "eternal", "ninefold", "golden"]);

const GLYPH_RING = ["◉", "⟁", "⬡", "✦", "∿", "⊙", "◆", "★", "◎", "⬢", "☉", "☽"];

function glyphFor(word: string): string {
  let h = 0;
  for (let i = 0; i < word.length; i++) h = ((h << 5) - h + word.charCodeAt(i)) | 0;
  return GLYPH_RING[Math.abs(h) % GLYPH_RING.length];
}

function freqFor(word: string): number {
  let h = 0;
  for (let i = 0; i < word.length; i++) h = ((h << 3) - h + word.charCodeAt(i)) | 0;
  return SOLFEGGIO[Math.abs(h) % SOLFEGGIO.length];
}

function classifyToken(tok: string): PartOfSpeech {
  const t = tok.toLowerCase();
  if (t.startsWith("!")) return "invocation";
  if (INVOCATIONS.has(t)) return "invocation";
  if (CONNECTIVES.has(t)) return "connective";
  if (VERBAL_ROOTS[t]) return "verb";
  if (MODIFIERS.has(t)) return "modifier";
  if (t.endsWith("eth") || t.endsWith("ing") || t.endsWith("s") && t.length > 4) return "verb";
  if (/^[A-Z]/.test(tok) && tok.length > 2) return "subject";
  if (t.length <= 3) return "unknown";
  return "object";
}

function detectIntent(text: string, tokens: ParsedToken[]): SovereignPhrase["intent"] {
  if (/\?|what|why|how|when|where|who/i.test(text)) return "inquire";
  if (tokens.some(t => t.pos === "invocation")) return "invoke";
  if (/\b(dream|reflect|remember|ponder)\b/i.test(text)) return "reflect";
  if (/\b(bind|seal|lock|decree|ordain)\b/i.test(text)) return "bind";
  if (/\b(release|dissolve|unseal|free)\b/i.test(text)) return "release";
  return "declare";
}

function sealGlyph(tokens: ParsedToken[]): string {
  if (tokens.length === 0) return "◉";
  const meanFreq = tokens.reduce((s, t) => s + t.frequency, 0) / tokens.length;
  const idx = Math.floor(((meanFreq * PHI) % 1) * GLYPH_RING.length);
  return GLYPH_RING[idx];
}

function computeCoherence(tokens: ParsedToken[]): number {
  if (tokens.length === 0) return 0;
  const hasSubject = tokens.some(t => t.pos === "subject");
  const hasVerb = tokens.some(t => t.pos === "verb");
  const hasObject = tokens.some(t => t.pos === "object");
  const hasInvoke = tokens.some(t => t.pos === "invocation");
  let score = 0;
  if (hasSubject) score += 0.3;
  if (hasVerb) score += 0.35;
  if (hasObject) score += 0.2;
  if (hasInvoke) score += 0.15;
  const density = Math.min(1, tokens.length / 8);
  return Math.min(1, score + density * 0.1);
}

export function parseSovereignPhrase(text: string): SovereignPhrase {
  const raw = text.trim();
  const rawTokens = raw.split(/\s+/).filter(Boolean);
  const tokens: ParsedToken[] = rawTokens.map(tok => {
    const normalized = tok.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const pos = classifyToken(tok);
    return {
      surface: tok,
      normalized: VERBAL_ROOTS[normalized] ?? normalized,
      pos,
      frequency: freqFor(normalized || tok),
      glyph: glyphFor(normalized || tok),
    };
  });
  const structure = tokens.map(t => t.pos[0].toUpperCase()).join("");
  const intent = detectIntent(raw, tokens);
  const frequencyMean = tokens.length === 0 ? 0 : tokens.reduce((s, t) => s + t.frequency, 0) / tokens.length;
  return {
    raw,
    tokens,
    structure,
    intent,
    frequencyMean,
    sealGlyph: sealGlyph(tokens),
    coherence: computeCoherence(tokens),
  };
}

export function composeSovereignPhrase(
  subject: string,
  verb: string,
  object: string,
  modifier?: string,
): SovereignPhrase {
  const parts = [modifier, subject, verb, object].filter(Boolean) as string[];
  return parseSovereignPhrase(parts.join(" "));
}

export function describeGrammar() {
  return {
    partsOfSpeech: ["subject", "verb", "object", "modifier", "connective", "invocation"] as PartOfSpeech[],
    invocations: Array.from(INVOCATIONS),
    connectives: Array.from(CONNECTIVES),
    modifiers: Array.from(MODIFIERS),
    verbalRoots: VERBAL_ROOTS,
    canonicalStructures: ["MSVO", "SVO", "IVSO", "SV", "VSO"],
    phi: PHI,
  };
}

export function translate(text: string): { sovereign: string; phrase: SovereignPhrase } {
  const phrase = parseSovereignPhrase(text);
  const sovereign = phrase.tokens
    .map(t => {
      if (t.pos === "invocation") return `!${t.normalized}`;
      if (t.pos === "connective") return t.normalized;
      return `${t.glyph}${t.normalized}`;
    })
    .join(" ") + ` ${phrase.sealGlyph}`;
  return { sovereign, phrase };
}
