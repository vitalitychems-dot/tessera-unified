export const BULK_TIERS = [
  { qty: 3, percent: 8, label: "3-vial lab rate" },
  { qty: 5, percent: 12, label: "5-vial bench rate" },
  { qty: 10, percent: 18, label: "10-vial inventory rate" },
] as const;

export const CREDIT_RATE = 0.05;

export function bulkFor(qty: number) {
  let hit: (typeof BULK_TIERS)[number] | null = null;
  for (const t of BULK_TIERS) {
    if (qty >= t.qty) hit = t;
  }
  return hit;
}

export function nextBulk(qty: number) {
  return BULK_TIERS.find((t) => t.qty > qty) ?? null;
}

export function money(n: number) {
  return Math.round(n * 100) / 100;
}

export function afterBulk(amount: number, qty: number) {
  const b = bulkFor(qty);
  if (!b) return money(amount);
  return money(amount * (1 - b.percent / 100));
}
