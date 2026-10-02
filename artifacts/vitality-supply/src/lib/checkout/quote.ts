import { RECON_ID, findProduct, shippingFor } from "@/lib/catalog";
import { CREDIT_RATE, bulkFor, nextBulk } from "@/lib/pricing";
import { supplierStandardCost } from "@/lib/supplier-sheet";

export type QuoteLineInput = { productId: string; dose: string; qty: number };
/** Keep checkout payloads deliberately small even when the cart is crafted. */
export const MAX_DISTINCT_CHECKOUT_LINES = 25;
export const MAX_CHECKOUT_LINES = 25;
export const MAX_VIAL_QUANTITY = 100;
export type PromoDescriptor =
  | {
      code: string;
      type?: "percent";
      percent: number;
      label?: string;
      kind?: string;
      ownerId?: string | null;
      commission?: number;
      firstOrderOnly?: boolean;
    }
  | {
      code: string;
      type: "fixed";
      amountCents: number;
      label?: string;
      kind?: string;
      ownerId?: string | null;
      commission?: number;
      firstOrderOnly?: boolean;
    };

export type CheckoutQuote = {
  lines: Array<QuoteLineInput & { name: string; unitCents: number; lineCents: number }>;
  count: number;
  vialQty: number;
  subtotalCents: number;
  merchandiseCents: number;
  shippingCents: number;
  salesTaxCents: number;
  taxRatePercent: number;
  taxEligible: boolean;
  totalCents: number;
  creditEarnedCents: number;
  cryptoRewardCents: number;
  creditAppliedCents: number;
  savingsCents: number;
  savings: {
    bulkCents: number;
    promoCents: number;
    cryptoCents: number;
    creditCents: number;
  };
  bulk: ReturnType<typeof bulkFor>;
  nextTier: (NonNullable<ReturnType<typeof nextBulk>> & { more: number }) | null;
  promo: PromoDescriptor | null;
  /** Cost is a partial basis when a cart mixes known and unknown supplier rows. */
  knownCostCents: number | null;
  knownCostCoverageCents: number;
  unknownCostLineCount: number;
  knownCostContributionCents: number | null;
  guardrails: {
    discountsCapped: boolean;
    creditCapped: boolean;
  };
};

function percentOff(cents: number, percent: number) {
  const safePercent = Number.isFinite(percent) ? percent : 0;
  return Math.round(cents * Math.max(0, Math.min(100, safePercent)) / 100);
}

function publicPromo(promo: PromoDescriptor | null | undefined): PromoDescriptor | null {
  if (!promo) return null;
  return promo.type === "fixed"
    ? { code: promo.code, type: "fixed", amountCents: promo.amountCents, label: promo.label, kind: promo.kind, firstOrderOnly: promo.firstOrderOnly }
    : { code: promo.code, type: "percent", percent: promo.percent, label: promo.label, kind: promo.kind, firstOrderOnly: promo.firstOrderOnly };
}

/** Authoritative, integer-cent checkout arithmetic. Never accepts browser prices. */
export function quoteCheckout(input: {
  lines: QuoteLineInput[];
  promo?: PromoDescriptor | null;
  paymentMethod?: "stripe" | "zelle" | "bitcoin" | "ethereum";
  cryptoRewardPercent?: number;
  creditBalanceCents?: number;
  applyCredit?: boolean;
  signedIn?: boolean;
  shippingSpeed?: "standard" | "express";
  /** Cart previews intentionally omit shipping; checkout passes true. */
  calculateShipping?: boolean;
  /** Sales tax is calculated only for the configured nexus jurisdiction. */
  salesTaxRatePercent?: number;
  taxJurisdiction?: { country?: string; region?: string };
}): CheckoutQuote {
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new Error("Your cart is empty.");
  }
  if (input.lines.length > MAX_CHECKOUT_LINES) {
    throw new Error(`Your cart has too many lines. Limit it to ${MAX_CHECKOUT_LINES}.`);
  }
  const merged = new Map<string, QuoteLineInput>();
  for (const raw of input.lines) {
    const productId = String(raw.productId);
    const dose = String(raw.dose);
    const key = `${productId}\u0000${dose}`;
    const existing = merged.get(key);
    const qty = Number(raw.qty);
    if (existing) existing.qty += qty;
    else merged.set(key, { productId, dose, qty });
  }
  if (merged.size > MAX_DISTINCT_CHECKOUT_LINES) {
    throw new Error(`Your cart has too many distinct products. Limit it to ${MAX_DISTINCT_CHECKOUT_LINES} lines.`);
  }
  const lines = [...merged.values()].map((line) => {
    const qty = Math.trunc(Number(line.qty));
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 100) {
      throw new Error(`Invalid quantity for ${line.productId}.`);
    }
    const product = findProduct(String(line.productId));
    if (!product || !product.inStock) throw new Error(`Product is unavailable: ${line.productId}.`);
    const variant = product.variants.find((v) => v.dose === line.dose);
    if (!variant) throw new Error(`Unknown dose for ${product.name}: ${line.dose}.`);
    const unitCents = Math.round(variant.price * 100);
    return { productId: product.id, dose: variant.dose, qty, name: product.name, unitCents, lineCents: unitCents * qty };
  });
  // Only exact supplier-sheet rows are a known cost basis. In particular, do
  // not infer a missing strength from a neighboring strength or blend.
  const lineCosts = lines.map((line) => {
    const product = findProduct(line.productId);
    const cost = product ? supplierStandardCost(product.name, line.dose) : null;
    return cost == null ? null : Math.round(cost * 100) * line.qty;
  });
  const count = lines.reduce((n, line) => n + line.qty, 0);
  const vialQty = lines
    .filter((line) => line.productId !== RECON_ID)
    .reduce((n, line) => n + line.qty, 0);
  if (vialQty > MAX_VIAL_QUANTITY) {
    throw new Error(`Your cart contains too many vials. Limit it to ${MAX_VIAL_QUANTITY}.`);
  }
  const subtotalCents = lines.reduce((n, line) => n + line.lineCents, 0);
  const knownCostCents = lineCosts.some((cost) => cost != null)
    ? lineCosts.reduce<number>((n, cost) => n + (cost ?? 0), 0)
    : null;
  const knownCostCoverageCents = lines.reduce(
    (n, line, index) => n + (lineCosts[index] == null ? 0 : line.lineCents),
    0,
  );
  const unknownCostLineCount = lineCosts.filter((cost) => cost == null).length;

  // A referral/affiliate commission is a store-credit obligation only when
  // the server has an owner to credit. Missing commission data is not guessed.
  const commissionRate =
    input.promo?.ownerId &&
    (input.promo.kind === "affiliate" || input.promo.kind === "referral")
      ? Math.max(0, Math.min(100, Number(input.promo.commission) || 0)) / 100
      : 0;
  const rewardRate = input.signedIn ? CREDIT_RATE : 0;
  const obligationRate = Math.min(0.99, rewardRate + commissionRate);
  // Preserve the normal bulk → promo → crypto order, but never allow known
  // supplier cost plus known credit obligations to be breached by stacking.
  // Unknown supplier rows remain unknown and are not assigned a fabricated
  // cost.
  const minimumMerchandiseCents =
    knownCostCents == null
      ? 0
      : Math.ceil(knownCostCents / Math.max(0.01, 1 - obligationRate)) +
        (rewardRate > 0 ? 1 : 0) +
        (commissionRate > 0 ? 1 : 0);
  // When a cart mixes known and unknown rows, only known-row retail is a
  // defensible revenue basis for the safeguard. Unknown-row revenue must not
  // be used to subsidise a known-cost SKU.
  const discountRevenueBasis =
    knownCostCents == null ? subtotalCents : knownCostCoverageCents;
  let discountBudget = Math.max(0, discountRevenueBasis - minimumMerchandiseCents);
  const bulk = bulkFor(vialQty);
  const plannedBulkCents = bulk ? percentOff(subtotalCents, bulk.percent) : 0;
  const bulkCents = Math.min(plannedBulkCents, discountBudget);
  discountBudget -= bulkCents;
  const afterBulk = Math.max(0, subtotalCents - bulkCents);
  const plannedPromoCents = !input.promo
    ? 0
    : input.promo.type === "fixed"
      ? Math.min(
          afterBulk,
          Number.isFinite(input.promo.amountCents)
            ? Math.max(0, Math.round(input.promo.amountCents))
            : 0,
        )
      : percentOff(afterBulk, input.promo.percent);
  const promoCents = Math.min(plannedPromoCents, discountBudget);
  discountBudget -= promoCents;
  const afterPromo = Math.max(0, afterBulk - promoCents);
  const plannedCryptoCents = 0;
  const cryptoCents = 0;
  const merchandiseCents = afterPromo;
  const shippingCents = input.calculateShipping === false
    ? 0
    : Math.round(
        shippingFor(subtotalCents / 100, input.shippingSpeed ?? "standard") * 100,
      );
  const country = String(input.taxJurisdiction?.country ?? "").trim().toLowerCase();
  const region = String(input.taxJurisdiction?.region ?? "").trim().toLowerCase();
  const taxEligible =
    (country === "united states" || country === "usa" || country === "us") &&
    (region === "il" || region === "illinois");
  const taxRatePercent = Number.isFinite(Number(input.salesTaxRatePercent))
    ? Math.max(0, Math.min(20, Number(input.salesTaxRatePercent)))
    : 0;
  const salesTaxCents = taxEligible
    ? Math.round(merchandiseCents * taxRatePercent / 100)
    : 0;
  const availableCredit = input.signedIn
    ? Math.max(0, Math.trunc(input.creditBalanceCents ?? 0))
    : 0;
  const baseCreditEarnedCents = input.signedIn ? Math.round(merchandiseCents * CREDIT_RATE) : 0;
  const cryptoRewardCents = input.signedIn &&
      (input.paymentMethod === "bitcoin" || input.paymentMethod === "ethereum")
    ? percentOff(merchandiseCents, input.cryptoRewardPercent ?? 0)
    : 0;
  const creditEarnedCents = baseCreditEarnedCents + cryptoRewardCents;
  const commissionCents = Math.round(merchandiseCents * commissionRate);
  const safeCreditCapacity =
    knownCostCents == null
      ? merchandiseCents
      : Math.max(0, merchandiseCents - knownCostCents - creditEarnedCents - commissionCents);
  const plannedCreditCents = input.applyCredit
    ? Math.min(availableCredit, merchandiseCents)
    : 0;
  const creditAppliedCents = Math.min(plannedCreditCents, safeCreditCapacity);
  const knownCostContributionCents =
    knownCostCents == null
      ? null
      : merchandiseCents -
        creditAppliedCents -
        knownCostCents -
        creditEarnedCents -
        commissionCents;
  const next = nextBulk(vialQty);
  const nextTier = next ? { ...next, more: next.qty - vialQty } : null;
  return {
    lines,
    count,
    vialQty,
    subtotalCents,
    merchandiseCents,
    shippingCents,
    salesTaxCents,
    taxRatePercent,
    taxEligible,
    totalCents: Math.max(0, merchandiseCents + shippingCents + salesTaxCents - creditAppliedCents),
    creditEarnedCents,
    cryptoRewardCents,
    creditAppliedCents,
    savingsCents: bulkCents + promoCents + cryptoCents + creditAppliedCents,
    savings: { bulkCents, promoCents, cryptoCents, creditCents: creditAppliedCents },
    bulk,
    nextTier,
    promo: publicPromo(input.promo),
    knownCostCents,
    knownCostCoverageCents,
    unknownCostLineCount,
    knownCostContributionCents,
    guardrails: {
      discountsCapped:
        bulkCents !== plannedBulkCents ||
        promoCents !== plannedPromoCents ||
        cryptoCents !== plannedCryptoCents,
      creditCapped: creditAppliedCents !== plannedCreditCents,
    },
  };
}