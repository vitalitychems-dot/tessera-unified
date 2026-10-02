import { GENERIC_VIAL } from "../src/lib/vial-photos";
import { hasExactPhoto, productImage, PRODUCTS } from "../src/lib/catalog";
import { OFFERS, RETAIL_PRICE_CHANGES } from "../src/lib/wholesale";
import { integrityUnitCost, pnlSheet } from "../src/lib/wholesale-tiers";
import { supplierTierCosts } from "../src/lib/supplier-sheet";
import { quoteCheckout } from "../src/lib/checkout/quote";

const failures: string[] = [];
const assert = (condition: boolean, message: string) => {
  if (!condition) failures.push(message);
};

assert(
  !PRODUCTS.some((product) => product.id === "vial-compounds__hcg"),
  "vial-compounds__hcg: retired HCG row must not be active",
);

// Pricing checks must follow the active catalog, not historical rows retained
// in OFFERS for audit continuity (for example, the retired HCG row).
for (const product of PRODUCTS) {
  const offerKey = `${product.formKind}:${product.id.split("__")[1]}`;
  for (const offer of OFFERS[offerKey] ?? []) {
    const sku = `${offerKey} ${offer.dose}`;
    if (offer.cost == null) {
      assert(offer.pricingFlag === "cost-missing", `${sku}: missing cost is not flagged`);
      continue;
    }
    assert(offer.cost > 0, `${sku}: cost must be positive`);
    assert(offer.sell > offer.cost, `${sku}: retail must exceed cost`);
    assert((offer.sell - offer.cost) / offer.sell >= 0.5 - 1e-10, `${sku}: retail margin is below 50%`);
  }
}

for (const product of PRODUCTS) {
  assert(product.formKind === "vial", `${product.id}: non-vial product is offered`);
  assert(product.category === "vial-compounds", `${product.id}: non-vial category is offered`);
  const offers = OFFERS[`${product.formKind}:${product.id.split("__")[1]}`];
  assert(Boolean(offers?.length), `${product.id}: has no offer`);
  assert(offers?.length === product.variants.length, `${product.id}: catalog/offer variant count differs`);
  for (let index = 1; index < product.variants.length; index += 1) {
    const previous = product.variants[index - 1];
    const current = product.variants[index];
    const previousDose = Number.parseFloat(previous.dose);
    const currentDose = Number.parseFloat(current.dose);
    if (Number.isFinite(previousDose) && Number.isFinite(currentDose) && currentDose > previousDose) {
      assert(current.price > previous.price, `${product.id}: retail is not strictly increasing by dose`);
    }
  }
  for (const variant of product.variants) {
    const exact = hasExactPhoto(product.name, variant.dose, product.formKind);
    const image = productImage(product.name, variant.dose, product.formKind);
    assert(exact ? image !== GENERIC_VIAL : image === GENERIC_VIAL, `${product.id} ${variant.dose}: image fallback mismatch`);
  }
}

for (const change of RETAIL_PRICE_CHANGES) {
  const product = PRODUCTS.find((entry) => change.sku.startsWith(`${entry.name} `));
  const dose = product ? change.sku.slice(product.name.length + 1) : "";
  const offer = product
    ? OFFERS[`${product.formKind}:${product.id.split("__")[1]}`]?.find((entry) => entry.dose === dose)
    : undefined;
  assert(Boolean(offer), `${change.sku}: documented retail change has no current offer`);
  assert(offer?.sell === change.currentRetail, `${change.sku}: documented current retail is stale`);
  assert(change.currentRetail !== change.priorRetail, `${change.sku}: documented retail did not change`);
}

for (const row of pnlSheet()) {
  if (row.cost == null) {
    assert(row.profit == null, `${row.key}: unknown cost must not become zero profit`);
    assert(row.margin == null, `${row.key}: unknown cost must not become zero margin`);
    assert(row.affCash == null, `${row.key}: unknown cost must not become zero affiliate cash`);
    assert(row.affLoop == null, `${row.key}: unknown cost must not become zero affiliate loop`);
    assert(row.rewardLoop == null, `${row.key}: unknown cost must not become zero reward loop`);
    continue;
  }
  if (row.formKind !== "vial") continue;
  if (!row.ws) {
    assert(row.flags.includes("wholesale ineligible"), `${row.key}: ineligible wholesale SKU is not flagged`);
    continue;
  }
  const bands = [
    [10, row.ws.q10],
    [50, row.ws.q50],
    [100, row.ws.q100],
  ] as const;
  assert(row.ws.q10.unit < row.sell, `${row.key}: tier 10 is not below retail`);
  assert(row.ws.q10.unit > row.ws.q50.unit, `${row.key}: tiers 10/50 do not decrease`);
  assert(row.ws.q50.unit > row.ws.q100.unit, `${row.key}: tiers 50/100 do not decrease`);
  for (const [qty, band] of bands) {
    const tierCost = integrityUnitCost(row.cost, qty, supplierTierCosts(row.name, row.dose));
    assert(band.unit >= tierCost * 1.25 - 1e-10, `${row.key}: tier ${qty} is below 1.25x cost`);
    assert(Number.isInteger(band.unit * 2), `${row.key}: tier ${qty} is not rounded to $0.50`);
  }
}

for (const product of PRODUCTS) {
  for (const variant of product.variants) {
    const quote = quoteCheckout({
      lines: [{ productId: product.id, dose: variant.dose, qty: 10 }],
      signedIn: true,
      applyCredit: true,
      creditBalanceCents: 10_000_000,
      paymentMethod: "bitcoin",
      promo: { code: "STACK", percent: 40, kind: "affiliate", ownerId: "owner", commission: 15 },
    });
    assert(
      quote.knownCostContributionCents == null || quote.knownCostContributionCents >= 0,
      `${product.name} ${variant.dose}: stacked discounts breached known-cost contribution`,
    );
  }
}

if (failures.length) {
  console.error(`Pricing checks failed (${failures.length}):\n${failures.map((f) => `- ${f}`).join("\n")}`);
  process.exit(1);
}

console.log(`Pricing checks passed for ${pnlSheet().length} catalog SKUs.`);