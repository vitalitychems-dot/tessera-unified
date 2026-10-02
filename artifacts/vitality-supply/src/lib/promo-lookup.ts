import { knownPromo, type AppliedPromo } from "@/lib/promo";
import { validatePromo } from "@/lib/store-api";

export async function lookupPromo(code: string): Promise<AppliedPromo | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  try {
    const result = await validatePromo({ data: { code: normalized } });
    if (result.ok) {
      return {
        code: result.code,
        percent: result.percent,
        kind: result.kind,
        label: result.label,
      };
    }
  } catch {
    // Built-in promotions remain available if the database is temporarily unavailable.
  }
  return knownPromo(normalized);
}