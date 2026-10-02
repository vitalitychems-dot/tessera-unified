/**
 * Derives a `[3DOBJ:...]` block from an invention record so the chat / inventions
 * surfaces can render an interactive 3D diagram inline.
 *
 * Output format matches the parser in
 * `artifacts/tessera/src/components/chat/ChatObject3D.tsx`:
 *   [3DOBJ:type="..." label="..." color="..." secondary="..." size="..." detail="..."]
 */

export interface Invention3DInput {
  title: string;
  category?: string | null;
  description?: string | null;
  materials?: string[] | null;
  scienceBehind?: string | null;
  customModelUrl?: string | null;
}

interface ModelHint {
  type: string;
  color: string;
  secondary: string;
}

const CATEGORY_DEFAULTS: Record<string, ModelHint> = {
  energy: { type: "battery-pack", color: "#f59e0b", secondary: "#fbbf24" },
  frequency: { type: "toroid", color: "#06b6d4", secondary: "#a78bfa" },
  hardware: { type: "pcb", color: "#10b981", secondary: "#f59e0b" },
  sovereignty: { type: "antenna", color: "#8b5cf6", secondary: "#06b6d4" },
  consciousness: { type: "crystal", color: "#a78bfa", secondary: "#ec4899" },
  defense: { type: "enclosure", color: "#64748b", secondary: "#10b981" },
  ai: { type: "device", color: "#3b82f6", secondary: "#a78bfa" },
  technology: { type: "machine", color: "#8b5cf6", secondary: "#f59e0b" },
  consensus: { type: "molecule", color: "#ec4899", secondary: "#06b6d4" },
  compression: { type: "torus", color: "#d946ef", secondary: "#06b6d4" },
};

const KEYWORD_HINTS: Array<{ re: RegExp; hint: ModelHint }> = [
  { re: /\b(18650|battery pack|cell array|lithium)\b/i, hint: { type: "battery-pack", color: "#f59e0b", secondary: "#fbbf24" } },
  { re: /\b(battery|cell)\b/i, hint: { type: "battery-cell", color: "#f59e0b", secondary: "#10b981" } },
  { re: /\b(toroid|bifilar|tesla coil|ferrite)\b/i, hint: { type: "toroid", color: "#06b6d4", secondary: "#a78bfa" } },
  { re: /\b(pcb|circuit|converter|rectifier|regulator)\b/i, hint: { type: "pcb", color: "#10b981", secondary: "#f59e0b" } },
  { re: /\b(enclosure|faraday|cage|shielding|cabinet)\b/i, hint: { type: "enclosure", color: "#64748b", secondary: "#10b981" } },
  { re: /\b(antenna|mast|whip|yagi|dipole)\b/i, hint: { type: "antenna", color: "#8b5cf6", secondary: "#06b6d4" } },
  { re: /\b(solar panel|photovoltaic)\b/i, hint: { type: "solar-panel", color: "#3b82f6", secondary: "#f59e0b" } },
  { re: /\b(crystal|quartz|octahedr|gem)\b/i, hint: { type: "crystal", color: "#06b6d4", secondary: "#a78bfa" } },
  { re: /\b(rocket|thruster|propulsion)\b/i, hint: { type: "rocket", color: "#6366f1", secondary: "#ef4444" } },
  { re: /\b(vehicle|car|truck|rover)\b/i, hint: { type: "car", color: "#3b82f6", secondary: "#1e293b" } },
  { re: /\b(robot|android|actuator)\b/i, hint: { type: "robot", color: "#a78bfa", secondary: "#38bdf8" } },
  { re: /\b(gear|motor|engine|mechanical)\b/i, hint: { type: "machine", color: "#8b5cf6", secondary: "#f97316" } },
  { re: /\b(tower|pyramid|mast)\b/i, hint: { type: "tower", color: "#f97316", secondary: "#b45309" } },
  { re: /\b(molecule|dna|compound|atom)\b/i, hint: { type: "molecule", color: "#f59e0b", secondary: "#60a5fa" } },
  { re: /\b(orb|sphere|globe|planet)\b/i, hint: { type: "sphere", color: "#ec4899", secondary: "#06b6d4" } },
];

function pickHint(inv: Invention3DInput): ModelHint {
  const haystack = [inv.title, inv.description, inv.scienceBehind, (inv.materials || []).join(" ")]
    .filter(Boolean)
    .join(" ");
  for (const { re, hint } of KEYWORD_HINTS) {
    if (re.test(haystack)) return hint;
  }
  const cat = (inv.category || "").toLowerCase();
  return CATEGORY_DEFAULTS[cat] || { type: "device", color: "#a78bfa", secondary: "#06b6d4" };
}

function escapeAttr(s: string): string {
  return String(s).replace(/"/g, "'").replace(/[\r\n\t]/g, " ").slice(0, 160);
}

export function buildInvention3DBlock(inv: Invention3DInput): string {
  const label = escapeAttr(inv.title);
  // Prefer the inventor's uploaded GLB/GLTF when present.
  if (inv.customModelUrl && /^[\w./:-]+$/.test(inv.customModelUrl)) {
    const detail = escapeAttr(inv.category ? `${inv.category} · custom model` : "custom model");
    return `[3DOBJ:type="custom" src="${escapeAttr(inv.customModelUrl)}" label="${label}" color="#a78bfa" secondary="#06b6d4" size="1" detail="${detail}"]`;
  }
  const hint = pickHint(inv);
  const detail = escapeAttr(inv.category ? `${inv.category} · ${(inv.materials?.length || 0)} parts` : "invention");
  return `[3DOBJ:type="${hint.type}" label="${label}" color="${hint.color}" secondary="${hint.secondary}" size="1" detail="${detail}"]`;
}

interface Invention3DInputWithSteps extends Invention3DInput {
  steps?: string[] | null;
}

const SUBSYSTEM_PATTERNS: Array<{ re: RegExp; hint: ModelHint; label: string }> = [
  { re: /\b(18650|battery pack|cell array|lithium pack|li-?ion pack|pack)\b/i, hint: { type: "battery-pack", color: "#f59e0b", secondary: "#fbbf24" }, label: "Battery Pack" },
  { re: /\b(battery|bms|cell)\b/i, hint: { type: "battery-cell", color: "#f59e0b", secondary: "#10b981" }, label: "Cell / BMS" },
  { re: /\b(toroid|bifilar|tesla coil|ferrite|inductor)\b/i, hint: { type: "toroid", color: "#06b6d4", secondary: "#a78bfa" }, label: "Toroidal Coil" },
  { re: /\b(pcb|circuit board|converter|rectifier|regulator|mcu|microcontroller)\b/i, hint: { type: "pcb", color: "#10b981", secondary: "#f59e0b" }, label: "Control PCB" },
  { re: /\b(enclosure|faraday|cage|shielding|cabinet|chassis|housing)\b/i, hint: { type: "enclosure", color: "#64748b", secondary: "#10b981" }, label: "Enclosure" },
  { re: /\b(antenna|mast|whip|yagi|dipole|rf|lora|mesh radio)\b/i, hint: { type: "antenna", color: "#8b5cf6", secondary: "#06b6d4" }, label: "Antenna / RF" },
  { re: /\b(solar panel|photovoltaic|pv panel|solar array)\b/i, hint: { type: "solar-panel", color: "#3b82f6", secondary: "#f59e0b" }, label: "Solar Panel" },
  { re: /\b(rocket|thruster|propulsion|nozzle)\b/i, hint: { type: "rocket", color: "#6366f1", secondary: "#ef4444" }, label: "Propulsion" },
  { re: /\b(motor|engine|gear|actuator|servo)\b/i, hint: { type: "machine", color: "#8b5cf6", secondary: "#f97316" }, label: "Drive Unit" },
  { re: /\b(crystal|quartz|octahedr)\b/i, hint: { type: "crystal", color: "#06b6d4", secondary: "#a78bfa" }, label: "Resonant Crystal" },
];

/**
 * Derive MULTIPLE labeled `[3DOBJ:...]` blocks by scanning the invention's
 * materials + steps + description for major subsystems. Always returns at
 * least one block (the whole-device overview).
 */
export function buildInvention3DBlocks(
  inv: Invention3DInputWithSteps,
  opts: { max?: number } = {},
): string[] {
  const max = opts.max ?? 4;
  const haystack = [
    inv.title,
    inv.description,
    inv.scienceBehind,
    (inv.materials || []).join(" · "),
    (inv.steps || []).join(" · "),
  ].filter(Boolean).join(" \n ");

  const seenTypes = new Set<string>();
  const blocks: string[] = [];

  // 1. Whole-device overview block always first.
  const overview = buildInvention3DBlock(inv);
  blocks.push(overview);
  const overviewType = overview.match(/type="([^"]+)"/)?.[1];
  if (overviewType) seenTypes.add(overviewType);

  // 2. Subsystem blocks from materials/steps scan.
  for (const { re, hint, label } of SUBSYSTEM_PATTERNS) {
    if (blocks.length >= max) break;
    if (seenTypes.has(hint.type)) continue;
    if (!re.test(haystack)) continue;
    seenTypes.add(hint.type);
    const lbl = escapeAttr(`${inv.title} · ${label}`);
    blocks.push(
      `[3DOBJ:type="${hint.type}" label="${lbl}" color="${hint.color}" secondary="${hint.secondary}" size="1" detail="${escapeAttr(label)}"]`,
    );
  }

  return blocks;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "with", "to", "in", "on", "by",
  "system", "device", "module", "project", "protocol", "engine", "generator",
  "pack", "unit", "array", "kit", "board", "panel", "invention", "build",
]);

function tokensFromTitle(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

/**
 * Given assistant response text and a catalog of inventions, append a 3DOBJ
 * block for each invention referenced. Matches in this order:
 *   1. Full title substring (word-boundaried)
 *   2. Any two distinct non-stopword tokens from the title present in text
 *   3. Explicit user-visible 3D intent + invention-category keyword fallback
 * Deduplicates by inventionId.
 */
export function injectInventionDiagrams(
  text: string,
  inventions: Array<Invention3DInput & { inventionId?: string }>,
  opts: { max?: number; userRequested3D?: boolean } = {},
): string {
  if (!text) return text;
  const existing = new Set<string>();
  const blocks: string[] = [];
  const max = opts.max ?? 3;
  const lower = text.toLowerCase();

  const matchByTitle = (inv: Invention3DInput & { inventionId?: string }): boolean => {
    const t = (inv.title || "").trim();
    if (!t) return false;
    const tl = t.toLowerCase();
    const idx = lower.indexOf(tl);
    if (idx !== -1) {
      const before = idx === 0 ? " " : lower[idx - 1];
      const after = idx + tl.length >= lower.length ? " " : lower[idx + tl.length];
      if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
    }
    // Token-overlap fallback: require >=2 distinct non-stopword tokens present.
    const toks = Array.from(new Set(tokensFromTitle(t)));
    if (toks.length >= 2) {
      const hits = toks.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(lower));
      if (hits.length >= 2) return true;
    } else if (toks.length === 1 && toks[0].length >= 6) {
      if (new RegExp(`\\b${toks[0]}\\b`, "i").test(lower)) return true;
    }
    return false;
  };

  for (const inv of inventions) {
    if (blocks.length >= max) break;
    const id = inv.inventionId || inv.title;
    if (!id || existing.has(id)) continue;
    if (!matchByTitle(inv)) continue;
    existing.add(id);
    // Emit whole-device + subsystem blocks (capped by remaining budget).
    const subs = buildInvention3DBlocks(inv as Invention3DInputWithSteps, { max: Math.max(1, max - blocks.length) });
    for (const b of subs) {
      if (blocks.length >= max) break;
      blocks.push(b);
    }
  }

  if (blocks.length === 0) return text;
  const filtered = blocks.filter((b) => !text.includes(b));
  if (filtered.length === 0) return text;
  return `${text}\n\n${filtered.join("\n")}`;
}

const VIS_INTENT_RE = /\b(show me|visuali[sz]e|diagram|render|3d|3-d|picture of|illustrat|sketch)\b/i;

export function userRequested3D(userText: string): boolean {
  return VIS_INTENT_RE.test(userText || "");
}
