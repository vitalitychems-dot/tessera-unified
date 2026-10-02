export type MerchRow = {
  productId: string;
  productName: string;
  views: number;
  carts: number;
  purchases: number;
  score: number;
};

/**
 * A note derived from live first-party events. `applied: true` means it is an
 * observation that needs no action; `applied: false` means a human decision is
 * required. Nothing here changes the storefront on its own — Best sellers order
 * is curated in the catalog, so the desk never claims an automatic change.
 */
export type GrokAction = {
  title: string;
  body: string;
  applied: boolean;
};

export function scoreMerch(views: number, carts: number, purchases: number) {
  return purchases * 50 + carts * 10 + views * 1;
}

const pct = (value: number) => `${Math.round(value * 1000) / 10}%`;

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
  const leader = sorted[0];
  if (leader && leader.score > 0) {
    tips.push({
      applied: false,
      title: `Lead with ${leader.productName}`,
      body: `Highest live score (${leader.score}: ${leader.purchases} paid, ${leader.carts} carted, ${leader.views} viewed). Best sellers are curated in the catalog — move it to the first row if it is not already there.`,
    });
  }
  for (const r of sorted.slice(0, 8)) {
    if (r.views >= 8 && r.carts / Math.max(1, r.views) < 0.05) {
      tips.push({
        applied: false,
        title: `${r.productName} is viewed but not added`,
        body: `${r.views} product views and ${r.carts} add-to-carts (${pct(r.carts / r.views)}). High view / low cart usually means price or photo mismatch — check the vial photo and dose pricing on its page.`,
      });
    }
  }
  const viewToCart = kpis.sessions ? kpis.addToCarts / kpis.sessions : 0;
  if (kpis.sessions >= 15 && viewToCart < 0.05) {
    tips.push({
      applied: false,
      title: "Add-to-cart is under 5% of sessions",
      body: `${kpis.addToCarts} add-to-carts across ${kpis.sessions} sessions (${pct(viewToCart)}). The first-order 10% offer is shown inline in the header and hero — confirm it is visible on mobile before the catalog scrolls.`,
    });
  }
  if (kpis.checkouts >= 4 && kpis.orders / kpis.checkouts < 0.45) {
    tips.push({
      applied: false,
      title: "Checkout is leaking",
      body: `${kpis.orders} orders from ${kpis.checkouts} started checkouts (${pct(kpis.orders / kpis.checkouts)}). Review shipping cost and the enabled payment methods on the checkout page. Keep the research-use attestation; do not add fields.`,
    });
  }
  if (!tips.length) {
    tips.push({
      applied: true,
      title: "Not enough live data yet",
      body: `${kpis.sessions} sessions, ${kpis.addToCarts} add-to-carts, ${kpis.checkouts} checkouts, ${kpis.orders} orders so far. Best sellers keep their curated catalog order until traffic accumulates.`,
    });
  }
  return tips.slice(0, 6);
}
