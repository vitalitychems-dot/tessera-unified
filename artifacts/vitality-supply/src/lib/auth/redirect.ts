const CONTROL_OR_PERCENT = /[\u0000-\u001f\u007f%]/;

/**
 * Login redirects are navigation targets, not URLs. Keep only literal,
 * same-origin root-relative paths; rejecting percent escapes avoids browsers
 * disagreeing about encoded slash/backslash and control-character parsing.
 */
export function safeLoginRedirect(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 500) return fallback;
  if (value.includes("\\") || CONTROL_OR_PERCENT.test(value) || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  try {
    const parsed = new URL(value, "https://vitality-supply.invalid");
    if (parsed.origin !== "https://vitality-supply.invalid") return fallback;
    return value;
  } catch {
    return fallback;
  }
}