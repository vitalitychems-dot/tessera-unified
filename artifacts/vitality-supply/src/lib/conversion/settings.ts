/**
 * Conversion settings the AI manager may tune. Every key here is reversible,
 * non-financial storefront behaviour: when the newsletter offer appears, whether
 * a returning visitor is reminded about a saved cart, and how merchandising is
 * ordered. Nothing here can touch prices, promotions, payments, rewards,
 * orders, fulfillment, auth, or deployments.
 *
 * Pure module: shared by the public settings endpoint, the storefront, the
 * manager validator, and the tests.
 */

export type NewsletterTriggerMode = "intent" | "timer" | "off";
export type RankingMode = "behavior" | "static";

export type ConversionSettings = {
  newsletter: { mode: NewsletterTriggerMode; delayMs: number };
  resumePrompt: { enabled: boolean; delayMs: number };
  ranking: { mode: RankingMode; minSample: number };
};

type EnumSpec = { kind: "enum"; values: readonly string[]; fallback: string; guide: string };
type IntSpec = { kind: "int"; min: number; max: number; fallback: number; guide: string };
type BoolSpec = { kind: "bool"; fallback: boolean; guide: string };
export type ConversionSettingSpec = EnumSpec | IntSpec | BoolSpec;

export const NEWSLETTER_DELAY_MIN_MS = 15_000;
export const NEWSLETTER_DELAY_MAX_MS = 120_000;

/** Reversible scalar settings, keyed exactly as they are stored in manager_settings. */
export const CONVERSION_SETTING_SPECS = {
  newsletter_auto_delay_ms: {
    kind: "int",
    min: NEWSLETTER_DELAY_MIN_MS,
    max: NEWSLETTER_DELAY_MAX_MS,
    fallback: 15_000,
    guide: "newsletter_auto_delay_ms: integer 15000–120000 — in timer mode the delay before the newsletter offer appears; in intent mode the product-page dwell time that counts as intent. Never below 15000.",
  },
  newsletter_trigger_mode: {
    kind: "enum",
    values: ["intent", "timer", "off"],
    fallback: "intent",
    guide: "newsletter_trigger_mode: \"intent\" (default: opens on exit intent, deep scroll, or repeated product interest), \"timer\" (opens after newsletter_auto_delay_ms), or \"off\" (manual open only).",
  },
  resume_prompt_enabled: {
    kind: "bool",
    fallback: true,
    guide: "resume_prompt_enabled: boolean — whether a returning visitor with a saved cart sees a small, dismissible reminder to resume checkout.",
  },
  resume_prompt_delay_ms: {
    kind: "int",
    min: 2_000,
    max: 30_000,
    fallback: 4_000,
    guide: "resume_prompt_delay_ms: integer 2000–30000 — how long after the page loads the saved-cart reminder appears.",
  },
  merch_ranking_mode: {
    kind: "enum",
    values: ["behavior", "static"],
    fallback: "behavior",
    guide: "merch_ranking_mode: \"behavior\" (default: best sellers and related products blend live view/cart/purchase data with the curated catalog order) or \"static\" (curated catalog order only).",
  },
  merch_ranking_min_sample: {
    kind: "int",
    min: 10,
    max: 500,
    fallback: 40,
    guide: "merch_ranking_min_sample: integer 10–500 — the number of product interactions before live behaviour outweighs the curated order; raise it when traffic is noisy.",
  },
} as const satisfies Record<string, ConversionSettingSpec>;

export type ConversionSettingKey = keyof typeof CONVERSION_SETTING_SPECS;

export const CONVERSION_SETTING_KEYS = Object.keys(CONVERSION_SETTING_SPECS) as ConversionSettingKey[];

export function isConversionSettingKey(key: unknown): key is ConversionSettingKey {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(CONVERSION_SETTING_SPECS, key);
}

/** Validate one scalar conversion setting; returns the canonical value or an error. */
export function validateConversionSetting(
  key: ConversionSettingKey,
  value: unknown,
): { ok: true; value: string | number | boolean } | { ok: false; error: string } {
  const spec: ConversionSettingSpec = CONVERSION_SETTING_SPECS[key];
  if (spec.kind === "int") {
    const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
    if (!Number.isInteger(n) || n < spec.min || n > spec.max) {
      return { ok: false, error: `${key} must be an integer from ${spec.min} to ${spec.max}.` };
    }
    return { ok: true, value: n };
  }
  if (spec.kind === "bool") {
    if (typeof value === "boolean") return { ok: true, value };
    if (value === "true" || value === "false") return { ok: true, value: value === "true" };
    return { ok: false, error: `${key} must be true or false.` };
  }
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!spec.values.includes(text)) {
    return { ok: false, error: `${key} must be one of ${spec.values.join(", ")}.` };
  }
  return { ok: true, value: text };
}

function resolved<K extends ConversionSettingKey>(record: Record<string, unknown>, key: K) {
  const checked = validateConversionSetting(key, record[key]);
  return checked.ok ? checked.value : CONVERSION_SETTING_SPECS[key].fallback;
}

/**
 * Turn the raw manager_settings rows into the typed public settings. Invalid
 * or missing rows fall back to the safe default for that key, so a corrupted
 * row can never disable the storefront.
 */
export function resolveConversionSettings(record: Record<string, unknown>): ConversionSettings {
  return {
    newsletter: {
      mode: resolved(record, "newsletter_trigger_mode") as NewsletterTriggerMode,
      delayMs: resolved(record, "newsletter_auto_delay_ms") as number,
    },
    resumePrompt: {
      enabled: resolved(record, "resume_prompt_enabled") as boolean,
      delayMs: resolved(record, "resume_prompt_delay_ms") as number,
    },
    ranking: {
      mode: resolved(record, "merch_ranking_mode") as RankingMode,
      minSample: resolved(record, "merch_ranking_min_sample") as number,
    },
  };
}

export const DEFAULT_CONVERSION_SETTINGS: ConversionSettings = resolveConversionSettings({});
