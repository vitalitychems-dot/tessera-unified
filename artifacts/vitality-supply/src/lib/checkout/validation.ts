const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

export function normaliseBusinessEmail(value: unknown) {
  const email = clean(value, 254).toLowerCase();
  if (!email) return "";
  if (!EMAIL_RE.test(email)) throw new Error("Enter a valid business email address.");
  return email;
}

/**
 * Canonical identity input for referral and first-order economics.
 *
 * Provider-supported plus-address tags route to the same mailbox (for example,
 * owner+campaign@example.com). Strip only that routing tag for abuse-control
 * identity keys; checkout and notification addresses keep their original form.
 */
export function canonicalReferralEmail(value: unknown) {
  const email = clean(value, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error("A verified account email is required for referrals.");
  const at = email.lastIndexOf("@");
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const plus = local.indexOf("+");
  const canonical = `${plus >= 0 ? local.slice(0, plus) : local}@${domain}`;
  if (!EMAIL_RE.test(canonical)) throw new Error("A verified account email is required for referrals.");
  return canonical;
}

/** Return digits only so the server can fingerprint the EIN without storing it. */
export function normaliseEin(value: unknown) {
  const raw = clean(value, 20).replace(/\s+/g, "");
  if (!raw) return "";
  if (!/^(?:\d{9}|\d{2}-\d{7})$/.test(raw)) {
    throw new Error("Enter an EIN in the format 12-3456789.");
  }
  const ein = raw.replace("-", "");
  if (ein.startsWith("00")) throw new Error("Enter an EIN in the format 12-3456789.");
  return ein;
}

export function isEmail(value: string) {
  return EMAIL_RE.test(value);
}