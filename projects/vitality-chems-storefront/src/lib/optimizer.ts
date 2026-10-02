export type MerchRow = {
  productId: string;
  productName: string;
  views: number;
  carts: number;
  purchases: number;
  score: number;
};

export type GrokAction = {
  title: string;
  body: string;
  applied: boolean;
};

export function scoreMerch(views: number, carts: number, purchases: number) {
  return purchases * 50 + carts * 10 + views * 1;
}

export function actionsFromMerch(
  rows: MerchRow[],
  kpis: {
    sessions: number;
    addToCarts: number;
    checkouts: number;
    orders: number;
  },
) {
  const tips: GrokAction[] = [];
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  if (sorted[0]) {
    tips.push({
      applied: true,
      title: `Lead with ${sorted[0].productName}`,
      body: `Highest live score (${sorted[0].score}). Bestsellers now open on this compound so the first thumb-stop matches what people actually add.`,
    });
  }
  for (const r of sorted.slice(0, 8)) {
    if (r.views >= 8 && r.carts / Math.max(1, r.views) < 0.05) {
      tips.push({
        applied: true,
        title: `${r.productName} is window-shopped, not added`,
        body: "Kept in catalog but dropped from the first row. High view / low cart usually means price or photo mismatch — dose buttons now swap the 360° vial.",
      });
    }
  }
  const viewToCart = kpis.sessions ? kpis.addToCarts / kpis.sessions : 0;
  if (kpis.sessions >= 15 && viewToCart < 0.05) {
    tips.push({
      applied: true,
      title: "First-order 10% popup is the lever",
      body: "Add-to-cart under 5%. WELCOME10 popup fires after the age gate. Do not hide it. Labs convert when the first-order discount is visible before they scroll.",
    });
  }
  if (kpis.checkouts >= 4 && kpis.orders / kpis.checkouts < 0.45) {
    tips.push({
      applied: false,
      title: "Checkout is leaking",
      body: "Keep attestation (Illinois). Offer crypto 8% and paid shipping on the same screen — that is the close. Do not add fields.",
    });
  }
  if (!tips.length) {
    tips.push({
      applied: true,
      title: "Catalog order follows live demand",
      body: "Not enough orders yet to retune copy. Ranking still uses HPLC bestsellers (semaglutide, tirzepatide, retatrutide, BPC-157) until traffic teaches otherwise.",
    });
  }
  return tips.slice(0, 6);
}
