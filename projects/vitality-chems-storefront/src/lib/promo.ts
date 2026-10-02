export type AppliedPromo = {
  code: string;
  percent: number;
  kind: string;
  label: string;
};

export const KNOWN_PROMOS: Record<string, Omit<AppliedPromo, "code">> = {
  CRYPTO8: { percent: 8, kind: "promo", label: "Crypto settlement" },
  RESEARCH10: { percent: 10, kind: "promo", label: "Research account" },
  WELCOME10: { percent: 10, kind: "promo", label: "First order" },
  LAB10: { percent: 10, kind: "affiliate", label: "Lab partner" },
  AFF12: { percent: 12.5, kind: "affiliate", label: "Affiliate 12.5%" },
  PARTNER: { percent: 12.5, kind: "affiliate", label: "Partner 12.5%" },
  PARTNER2025: { percent: 12.5, kind: "affiliate", label: "2025 partner" },
};

export function knownPromo(code: string): AppliedPromo | null {
  const c = code.trim().toUpperCase();
  const known = KNOWN_PROMOS[c];
  if (!known) return null;
  return { code: c, ...known };
}
