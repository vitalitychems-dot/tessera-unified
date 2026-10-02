import { pnlSheet, pnlSummary } from "./wholesale-tiers";
import { BUSINESS } from "./business";

/** Drag against gross margin: card fees, refunds, unused reward credits. */
export const FEE_DRAG = 0.029;
export const REFUND_DRAG = 0.04;
export const CREDIT_LEAK = 0.02;

export function contributionMargin(gross: number) {
  return Math.max(0.12, gross - FEE_DRAG - REFUND_DRAG - CREDIT_LEAK);
}

/** $500 → 0, $100k → 1. Larger checks unlock better investor terms. */
export function checkCurve(amount: number) {
  const a = Math.max(250, amount);
  const t = Math.log10(a / 500) / Math.log10(200);
  return Math.min(1, Math.max(0, t));
}

export type Incentive = { at: number; label: string; extraSharePts: number };

export const INCENTIVES: Incentive[] = [
  { at: 2500, label: "Weekly spend + ROAS report", extraSharePts: 0 },
  { at: 10000, label: "+2 pts investor share for 90 days · monthly call", extraSharePts: 2 },
  { at: 25000, label: "+3 pts year-one share · most-favored-nation vs later checks", extraSharePts: 3 },
  { at: 75000, label: "+5 pts year-one share · first look on new SKUs · quarterly review", extraSharePts: 5 },
];

export function incentivesFor(amount: number) {
  return INCENTIVES.filter((i) => amount >= i.at);
}

export function extraShare(amount: number) {
  const hit = [...INCENTIVES].reverse().find((i) => amount >= i.at && i.extraSharePts > 0);
  return (hit?.extraSharePts ?? 0) / 100;
}

export type DealInput = {
  amount: number;
  roas: number;
  grossMargin: number;
  deployMonths: number;
  horizonMonths: number;
  recycle: boolean;
};

export type MonthRow = {
  month: number;
  spend: number;
  revenue: number;
  cogs: number;
  net: number;
  investor: number;
  company: number;
  investorCum: number;
  companyCum: number;
  stage: "return" | "preferred" | "trail" | "loss";
};

export type Deal = {
  amount: number;
  roas: number;
  grossMargin: number;
  cm: number;
  breakevenRoas: number;
  share: number;
  yearOneShare: number;
  multiple: number;
  returnCap: number;
  netPerAdDollar: number;
  cycleProfit: number;
  incentives: Incentive[];
  months: MonthRow[];
  investorYear: number;
  companyYear: number;
  monthsTo1x: number | null;
  monthsToCap: number | null;
  investorRoi: number;
  irrHint: number;
  aov: number;
  orders: number;
};

function money(n: number) {
  return Math.round(n * 100) / 100;
}

export function catalogEconomics() {
  const rows = pnlSheet().filter((r) => r.formKind === "vial");
  const sum = pnlSummary(rows);
  const aov = rows.length ? rows.reduce((s, r) => s + r.sell, 0) / rows.length : 109;
  return { grossMargin: sum.avgMargin || 0.55, aov, skuCount: rows.length };
}

export function priceDeal(input: DealInput): Deal {
  const amount = Math.max(0, input.amount || 0);
  const roas = Math.max(0, input.roas || 0);
  const gross = Math.min(0.9, Math.max(0.15, input.grossMargin || 0.55));
  const cm = contributionMargin(gross);
  const deploy = Math.max(1, Math.round(input.deployMonths || 3));
  const horizon = Math.max(deploy, Math.round(input.horizonMonths || 12));
  const recycle = Boolean(input.recycle);
  const curve = checkCurve(amount);
  const share = 0.2 + 0.18 * curve;
  const yearOneShare = Math.min(0.45, share + extraShare(amount));
  const multiple = 1.35 + 0.9 * curve;
  const returnCap = money(amount * multiple);
  const netPerAdDollar = roas * cm - 1;
  const { aov } = catalogEconomics();

  const months: MonthRow[] = [];
  let investorCum = 0;
  let companyCum = 0;
  const monthlySpend = amount > 0 ? amount / deploy : 0;

  let extraSpend = 0;
  for (let m = 1; m <= horizon; m++) {
    const spend = (m <= deploy ? monthlySpend : 0) + extraSpend;
    extraSpend = 0;
    const revenue = spend * roas;
    const cogs = revenue * (1 - cm);
    const net = revenue - cogs - spend;
    let stage: MonthRow["stage"] = "loss";
    let inv = 0;
    let co = 0;
    if (net <= 0) {
      co = net;
      companyCum += net;
    } else if (investorCum < amount) {
      stage = "return";
      const cut = Math.min(0.8, yearOneShare + 0.12);
      inv = net * cut;
      co = net - inv;
      if (investorCum + inv > amount) {
        const over = investorCum + inv - amount;
        inv -= over;
        co += over;
      }
      investorCum += inv;
      companyCum += co;
    } else if (investorCum < returnCap) {
      stage = "preferred";
      const cut = m <= 12 ? yearOneShare : share;
      inv = net * cut;
      if (investorCum + inv > returnCap) {
        const over = investorCum + inv - returnCap;
        inv -= over;
      }
      co = net - inv;
      investorCum += inv;
      companyCum += co;
    } else {
      stage = "trail";
      const cut = share / 2;
      inv = net * cut;
      co = net - inv;
      investorCum += inv;
      companyCum += co;
    }
    if (recycle && co > 0 && m < horizon) {
      extraSpend = co * 0.5;
      co *= 0.5;
      companyCum -= extraSpend;
    }
    months.push({
      month: m,
      spend: money(spend),
      revenue: money(revenue),
      cogs: money(cogs),
      net: money(net),
      investor: money(inv),
      company: money(co),
      investorCum: money(investorCum),
      companyCum: money(companyCum),
      stage,
    });
  }

  const monthsTo1x = months.find((r) => r.investorCum >= amount - 0.5)?.month ?? null;
  const monthsToCap = months.find((r) => r.investorCum >= returnCap - 0.5)?.month ?? null;
  const investorYear = months[Math.min(11, months.length - 1)]?.investorCum ?? 0;
  const companyYear = months[Math.min(11, months.length - 1)]?.companyCum ?? 0;
  const investorRoi = amount > 0 ? investorYear / amount - 1 : 0;
  const irrHint = amount > 0 && monthsTo1x ? Math.pow(1 + Math.max(0, investorRoi), 12 / 12) - 1 : investorRoi;

  return {
    amount,
    roas,
    grossMargin: gross,
    cm,
    breakevenRoas: cm > 0 ? 1 / cm : 9,
    share,
    yearOneShare,
    multiple,
    returnCap,
    netPerAdDollar,
    cycleProfit: money(amount * netPerAdDollar),
    incentives: incentivesFor(amount),
    months,
    investorYear: money(investorYear),
    companyYear: money(companyYear),
    monthsTo1x,
    monthsToCap,
    investorRoi,
    irrHint,
    aov,
    orders: aov > 0 ? Math.round((amount * roas) / aov) : 0,
  };
}

export function scenarioTable(base: DealInput) {
  return [2.2, 3, 4].map((roas) => {
    const d = priceDeal({ ...base, roas });
    return {
      roas,
      label: roas === 2.2 ? "Conservative" : roas === 3 ? "Base" : "Upside",
      investorYear: d.investorYear,
      companyYear: d.companyYear,
      roi: d.investorRoi,
      monthsTo1x: d.monthsTo1x,
    };
  });
}

export function termSheetText(deal: Deal) {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  return [
    `DRAFT — NOT AN OFFER TO SELL SECURITIES`,
    `${BUSINESS.legalName} — Ad-spend participation term sheet`,
    `${BUSINESS.street}, ${BUSINESS.unit}, ${BUSINESS.city}, ${BUSINESS.region} ${BUSINESS.postal}`,
    ``,
    `Check size: ${deal.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}`,
    `Use of proceeds: 100% third-party media (search / native / compliant placements). No salaries, no inventory.`,
    `Horizon: 12 months, with a preferred return cap of ${deal.multiple.toFixed(2)}× ($${deal.returnCap.toLocaleString("en-US")}).`,
    ``,
    `Economics (from live catalog margin ${(deal.grossMargin * 100).toFixed(1)}% less card/refund drag → ${(deal.cm * 100).toFixed(1)}% contribution):`,
    `• Modeled ROAS ${deal.roas.toFixed(2)}×. Break-even ROAS ${deal.breakevenRoas.toFixed(2)}×.`,
    `• Until invested capital is returned: investor ${pct(Math.min(0.8, deal.yearOneShare + 0.12))} of ad-attributed net profit.`,
    `• Then until ${deal.multiple.toFixed(2)}×: investor ${pct(deal.yearOneShare)} (year one), ${pct(deal.share)} after.`,
    `• After the cap: investor share steps to ${pct(deal.share / 2)}.`,
    ``,
    `Incentives at this check:`,
    ...(deal.incentives.length
      ? deal.incentives.map((i) => `• ${i.label}`)
      : [`• Standard weekly ROAS report`]),
    ``,
    `Attribution: last-click + UTM on the funded campaigns only. Organic, wholesale, and affiliate codes are excluded.`,
    `Advertising: research-use-only. No human-use, dosing, or disease claims. Platforms may reject or ban peptide ads.`,
    `This draft is for discussion with counsel. Illinois and federal securities laws may apply. Not a solicitation.`,
  ].join("\n");
}
