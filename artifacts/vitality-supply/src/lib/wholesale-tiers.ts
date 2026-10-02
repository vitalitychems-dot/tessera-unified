import { OFFERS } from "./wholesale";
import { PRODUCTS } from "./catalog";
import { CREDIT_RATE } from "./pricing";
import { supplierTierCosts, type SupplierTierCosts } from "./supplier-sheet";

export const AFFILIATE_BUYER_OFF = 5;
export const AFFILIATE_CREDIT_BASE = 12.5;

/** Lab wholesale: MOQ 10 vials of one SKU. Always below retail, always above cost. */
export const WHOLESALE_TIERS = [
  { qty: 10, off: 0.18, label: "10 vials · up to −18%" },
  { qty: 50, off: 0.26, label: "50 vials · up to −26%" },
  { qty: 100, off: 0.34, label: "100 vials · up to −34%" },
] as const;

/**
 * Legacy fallback discounts for a SKU without a supplier-sheet row. Current
 * matched vial rows use the exact 5 KITS / 10 KITS unit costs instead.
 */
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

export function wholesaleUnit(
  cost: number,
  retail: number,
  qty: number,
  supplierCosts?: SupplierTierCosts,
) {
  const tier =
    qty >= 100 ? WHOLESALE_TIERS[2] : qty >= 50 ? WHOLESALE_TIERS[1] : WHOLESALE_TIERS[0];
  const tierCost = integrityUnitCost(cost, tier.qty, supplierCosts);
  const candidate = roundHalf(Math.max(tierCost * 1.35, retail * (1 - tier.off)));
  return candidate < tierCost * 1.25 ? Math.ceil(tierCost * 1.25 * 2) / 2 : candidate;
}

export function integrityUnitCost(
  cost: number,
  qty: number,
  supplierCosts?: SupplierTierCosts,
) {
  if (supplierCosts) {
    if (qty >= 100) return money(supplierCosts.unit100);
    if (qty >= 50) return money(supplierCosts.unit50);
    return money(supplierCosts.standardUnit);
  }
  const off = INTEGRITY_KIT_OFF[qty] ?? 0;
  return money(cost * (1 - off));
}

export type WholesaleRow = {
  category: string;
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
      category: r.category,
      dose: r.dose,
      cost: r.cost!,
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
  category: string;
  dose: string;
  cost: number | null;
  sell: number;
  profit: number | null;
  margin: number | null;
  ws: { q10: WsBand; q50: WsBand; q100: WsBand } | null;
  wholesaleEligible: boolean | null;
  flags: string[];
  affCash: number | null;
  affCredit: number;
  affLoop: number | null;
  rewardCredit: number;
  rewardLoop: number | null;
};

function band(cost: number, sell: number, qty: number, supplierCosts?: SupplierTierCosts): WsBand {
  const unit = wholesaleUnit(cost, sell, qty, supplierCosts);
  const yourCost = integrityUnitCost(cost, qty, supplierCosts);
  const profit = money(unit - yourCost);
  return { unit, yourCost, profit, lot: money(profit * qty), margin: unit <= 0 ? 0 : profit / unit };
}

function wholesaleBands(cost: number, sell: number, supplierCosts?: SupplierTierCosts) {
  const q10 = band(cost, sell, 10, supplierCosts);
  const q50 = band(cost, sell, 50, supplierCosts);
  const q100 = band(cost, sell, 100, supplierCosts);
  const bands = [q10, q50, q100];
  const valid =
    q10.unit < sell &&
    q10.unit > q50.unit &&
    q50.unit > q100.unit &&
    bands.every((b) => b.unit >= b.yourCost * 1.25);
  return valid ? { q10, q50, q100 } : null;
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
      const flags: string[] = [];
      if (o.cost == null) flags.push("cost missing");
      const profit = o.cost == null ? null : money(o.sell - o.cost);
      const margin = o.cost == null || o.sell <= 0 || profit == null ? null : profit / o.sell;
      const merchAff = money(o.sell * (1 - AFFILIATE_BUYER_OFF / 100));
      const affCash = o.cost == null ? null : money(merchAff - o.cost);
      const affCredit = money(merchAff * AFFILIATE_CREDIT_BASE / 100);
      const restockCash = o.cost == null ? null : money(Math.max(0, o.sell - affCredit) - o.cost);
      const rewardCredit = money(o.sell * CREDIT_RATE);
      const rewardLoop =
        o.cost == null || profit == null ? null : money(profit + (o.sell - rewardCredit - o.cost));
      const sourceCosts = p.formKind === "vial" ? supplierTierCosts(p.name, o.dose) : undefined;
      const ws =
        p.formKind === "vial" && o.cost != null
          ? wholesaleBands(o.cost, o.sell, sourceCosts)
          : null;
      if (p.formKind === "vial" && o.cost != null && !ws) flags.push("wholesale ineligible");
      rows.push({
        key,
        name: p.name,
        form: p.form,
        formKind: p.formKind,
        category: p.family,
        dose: o.dose,
        cost: o.cost,
        sell: o.sell,
        profit,
        margin,
        ws,
        wholesaleEligible: p.formKind === "vial" ? (o.cost == null ? null : ws != null) : false,
        flags,
        affCash,
        affCredit,
        affLoop: affCash == null || restockCash == null ? null : money(affCash + restockCash),
        rewardCredit,
        rewardLoop,
      });
    }
  }
  return rows.sort((a, b) => {
    if (a.profit == null && b.profit != null) return 1;
    if (a.profit != null && b.profit == null) return -1;
    return (b.profit ?? 0) - (a.profit ?? 0) || a.name.localeCompare(b.name);
  });
}

export function pnlSummary(rows: PnlRow[]) {
  if (!rows.length) {
    return {
      avgMargin: null,
      avgRetail: null,
      avg10: null,
      avg50: null,
      avg100: null,
      count: 0,
      knownCostCount: 0,
      costCoverage: 0,
      belowTarget: 0,
      missingCosts: 0,
      wholesaleIneligible: 0,
      wholesaleUnknown: 0,
    };
  }
  const vials = rows.filter((r) => r.ws);
  const known = rows.filter((r) => r.cost != null);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, n) => s + n, 0) / xs.length : null);
  return {
    count: rows.length,
    knownCostCount: known.length,
    costCoverage: known.length / rows.length,
    avgMargin: avg(known.flatMap((r) => (r.margin == null ? [] : [r.margin]))),
    avgRetail: avg(rows.map((r) => r.sell)),
    avg10: avg(vials.map((r) => r.ws!.q10.profit)),
    avg50: avg(vials.map((r) => r.ws!.q50.profit)),
    avg100: avg(vials.map((r) => r.ws!.q100.profit)),
    belowTarget: known.filter((r) => r.margin != null && r.margin < 0.5).length,
    missingCosts: rows.filter((r) => r.cost == null).length,
    wholesaleIneligible: rows.filter(
      (r) => r.formKind === "vial" && r.cost != null && !r.wholesaleEligible,
    ).length,
    wholesaleUnknown: rows.filter((r) => r.formKind === "vial" && r.cost == null).length,
  };
}

export function marginTone(margin: number): "profit" | "warn" | "loss" {
  if (margin >= 0.5) return "profit";
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
