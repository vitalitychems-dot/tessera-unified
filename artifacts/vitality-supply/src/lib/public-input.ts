const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Canonicalise an email before it is used as a durable abuse-control key. */
export function canonicalEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

/** Reject (rather than silently truncating) unexpectedly large public fields. */
export function boundedText(value: unknown, max: number, required = false): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if ((!text && required) || text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) {
    return null;
  }
  return text || null;
}