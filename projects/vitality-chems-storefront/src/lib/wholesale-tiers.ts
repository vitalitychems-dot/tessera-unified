import { OFFERS } from "./wholesale";
import { PRODUCTS } from "./catalog";
import { CREDIT_RATE } from "./pricing";

export const AFFILIATE_BUYER_OFF = 5;
export const AFFILIATE_CREDIT_BASE = 12.5;

/** Lab wholesale: MOQ 10 vials of one SKU. Always below retail, always above cost. */
export const WHOLESALE_TIERS = [
  { qty: 10, off: 0.16, minProfit: 8, label: "10 vials · −16%" },
  { qty: 50, off: 0.22, minProfit: 6, label: "50 vials · −22%" },
  { qty: 100, off: 0.28, minProfit: 5, label: "100 vials · −28%" },
] as const;

/** What Integrity charges you when you restock that many bottles of one SKU. */
export const INTEGRITY_KIT_OFF: Record<number, number> = {
  10: 0.15,
  50: 0.2,
  100: 0.3,
};

export function roundHalf(n: number) {
  return Math.round(n * 2) / 2;
}

export function money(n: number) {
  return Math.round(n * 100) / 100;
}

export function wholesaleUnit(cost: number, retail: number, qty: number) {
  const tier =
    qty >= 100 ? WHOLESALE_TIERS[2] : qty >= 50 ? WHOLESALE_TIERS[1] : WHOLESALE_TIERS[0];
  const fromRetail = retail * (1 - tier.off);
  const floor = cost + tier.minProfit;
  let p = Math.max(floor, fromRetail);
  if (p >= retail * 0.92) p = retail * 0.9;
  if (p < cost + 4) p = cost + 4;
  return roundHalf(p);
}

export function integrityUnitCost(cost: number, qty: number) {
  const off = INTEGRITY_KIT_OFF[qty] ?? 0;
  return money(cost * (1 - off));
}

export type WholesaleRow = {
  name: string;
  dose: string;
  cost: number;
  retail: number;
  t10: number;
  t50: number;
  t100: number;
  p10: number;
  p50: number;
  p100: number;
};

export function wholesaleSheet(): WholesaleRow[] {
  return pnlSheet()
    .filter((r) => r.ws)
    .map((r) => ({
      name: r.name,
      dose: r.dose,
      cost: r.cost,
      retail: r.sell,
      t10: r.ws!.q10.unit,
      t50: r.ws!.q50.unit,
      t100: r.ws!.q100.unit,
      p10: r.ws!.q10.profit,
      p50: r.ws!.q50.profit,
      p100: r.ws!.q100.profit,
    }));
}

export type WsBand = {
  unit: number;
  yourCost: number;
  profit: number;
  lot: number;
  margin: number;
};

export type PnlRow = {
  key: string;
  name: string;
  form: string;
  formKind: string;
  dose: string;
  cost: number;
  sell: number;
  profit: number;
  margin: number;
  ws: { q10: WsBand; q50: WsBand; q100: WsBand } | null;
  affCash: number;
  affCredit: number;
  affLoop: number;
  rewardCredit: number;
  rewardLoop: number;
};

function band(cost: number, sell: number, qty: number): WsBand {
  const unit = wholesaleUnit(cost, sell, qty);
  const yourCost = integrityUnitCost(cost, qty);
  const profit = money(unit - yourCost);
  return { unit, yourCost, profit, lot: money(profit * qty), margin: unit <= 0 ? 0 : profit / unit };
}

export function pnlSheet(): PnlRow[] {
  const seen = new Set<string>();
  const rows: PnlRow[] = [];
  for (const p of PRODUCTS) {
    const offers = OFFERS[`${p.formKind}:${p.id.split("__")[1]}`] ?? [];
    for (const o of offers) {
      const key = `${p.id}|${o.dose}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const profit = money(o.sell - o.cost);
      const margin = o.sell <= 0 ? 0 : profit / o.sell;
      const merchAff = money(o.sell * (1 - AFFILIATE_BUYER_OFF / 100));
      const affCash = money(merchAff - o.cost);
      const affCredit = money(merchAff * AFFILIATE_CREDIT_BASE / 100);
      const restockCash = money(Math.max(0, o.sell - affCredit) - o.cost);
      const rewardCredit = money(o.sell * CREDIT_RATE);
      const rewardLoop = money(profit + (o.sell - rewardCredit - o.cost));
      rows.push({
        key,
        name: p.name,
        form: p.form,
        formKind: p.formKind,
        dose: o.dose,
        cost: o.cost,
        sell: o.sell,
        profit,
        margin,
        ws: p.formKind === "vial" ? { q10: band(o.cost, o.sell, 10), q50: band(o.cost, o.sell, 50), q100: band(o.cost, o.sell, 100) } : null,
        affCash,
        affCredit,
        affLoop: money(affCash + restockCash),
        rewardCredit,
        rewardLoop,
      });
    }
  }
  return rows.sort((a, b) => b.profit - a.profit || a.name.localeCompare(b.name));
}

export function pnlSummary(rows: PnlRow[]) {
  if (!rows.length) {
    return { avgMargin: 0, avgRetail: 0, avg10: 0, avg50: 0, avg100: 0, count: 0 };
  }
  const vials = rows.filter((r) => r.ws);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, n) => s + n, 0) / xs.length : 0);
  return {
    count: rows.length,
    avgMargin: avg(rows.map((r) => r.margin)),
    avgRetail: avg(rows.map((r) => r.profit)),
    avg10: avg(vials.map((r) => r.ws!.q10.profit)),
    avg50: avg(vials.map((r) => r.ws!.q50.profit)),
    avg100: avg(vials.map((r) => r.ws!.q100.profit)),
  };
}

export function marginTone(margin: number): "profit" | "warn" | "loss" {
  if (margin >= 0.48) return "profit";
  if (margin >= 0.32) return "warn";
  return "loss";
}

export function profitTone(profit: number): "profit" | "warn" | "loss" {
  if (profit >= 8) return "profit";
  if (profit >= 5) return "warn";
  return "loss";
}

export function affiliateCreditRate(lifetimeMerch: number) {
  if (lifetimeMerch >= 5000) return 0.15;
  if (lifetimeMerch >= 1000) return 0.125;
  return 0.1;
}
