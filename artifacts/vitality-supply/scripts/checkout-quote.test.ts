import assert from "node:assert/strict";
import { PRODUCTS } from "../src/lib/catalog.ts";
import { quoteCheckout } from "../src/lib/checkout/quote.ts";
import {
  canonicalReferralEmail,
  isEmail,
  normaliseBusinessEmail,
  normaliseEin,
} from "../src/lib/checkout/validation.ts";
import {
  staleStripeAction,
  STALE_STRIPE_CHECKOUT_AGE_MS,
} from "../src/lib/checkout/settle.server.ts";

const p = PRODUCTS.find((x) => x.inStock && x.id !== "vial-compounds__reconstitution-water")!;
const line = (qty: number) => [{ productId: p.id, dose: p.variants[0].dose, qty }];
const unit = Math.round(p.variants[0].price * 100);

assert.equal(quoteCheckout({ lines: line(1) }).subtotalCents, unit);
const merged = quoteCheckout({
  lines: [
    { productId: p.id, dose: p.variants[0].dose, qty: 2 },
    { productId: p.id, dose: p.variants[0].dose, qty: 3 },
  ],
});
assert.equal(merged.lines.length, 1);
assert.equal(merged.lines[0].qty, 5);
assert.throws(() => quoteCheckout({
  lines: Array.from({ length: 26 }, (_, index) => ({
    productId: PRODUCTS.find((x) => x.inStock && x.id !== p.id && x.id !== "vial-compounds__reconstitution-water")?.id ?? p.id,
    dose: `${index}`,
    qty: 1,
  })),
}));
assert.throws(() => quoteCheckout({ lines: line(101) }));
assert.equal(quoteCheckout({ lines: line(3) }).savings.bulkCents, Math.round(unit * 3 * .08));
assert.equal(quoteCheckout({ lines: line(4) }).nextTier?.more, 1);
const promo = quoteCheckout({ lines: line(1), promo: { code: "X", percent: 12.5 } });
assert.equal(promo.savings.promoCents, Math.round(unit * .125));
const btc = quoteCheckout({ lines: line(1), paymentMethod: "bitcoin", signedIn: true, cryptoRewardPercent: 5 });
assert.equal(btc.savings.cryptoCents, 0);
assert.equal(btc.cryptoRewardCents, Math.round(unit * .05));
assert.equal(btc.creditEarnedCents, Math.round(unit * .10));
const eth = quoteCheckout({ lines: line(1), paymentMethod: "ethereum", signedIn: true, cryptoRewardPercent: 5 });
assert.equal(eth.savings.cryptoCents, 0);
assert.equal(eth.cryptoRewardCents, Math.round(unit * .05));
const capped = quoteCheckout({ lines: line(1), signedIn: true, applyCredit: true, creditBalanceCents: 999999 });
assert.ok((capped.knownCostContributionCents ?? -1) >= 0);
assert.ok(capped.creditAppliedCents < capped.merchandiseCents);
assert.equal(capped.guardrails.creditCapped, true);
const small = quoteCheckout({ lines: line(1), signedIn: true, applyCredit: true, creditBalanceCents: 1 });
assert.equal(small.creditAppliedCents, 1);
assert.equal(small.creditEarnedCents, Math.round(unit * .05));
const stacked = quoteCheckout({
  lines: line(10),
  signedIn: true,
  applyCredit: true,
  creditBalanceCents: 999999,
  paymentMethod: "bitcoin",
  promo: { code: "STACK", percent: 40, kind: "promo" },
});
assert.ok((stacked.knownCostContributionCents ?? -1) >= 0);
assert.ok(stacked.guardrails.discountsCapped || stacked.guardrails.creditCapped);
const unknown = PRODUCTS.find(
  (x) => x.id === "vial-compounds__semaglutide" && x.variants.some((variant) => variant.dose === "15mg"),
)!;
const unknownDose = unknown.variants.find((variant) => variant.dose === "15mg")!;
const unknownQuote = quoteCheckout({
  lines: [{ productId: unknown.id, dose: unknownDose.dose, qty: 1 }],
});
assert.equal(unknownQuote.knownCostCents, null);
assert.equal(unknownQuote.knownCostContributionCents, null);
const cartPreview = quoteCheckout({ lines: line(1), calculateShipping: false });
assert.equal(cartPreview.shippingCents, 0);
assert.equal(cartPreview.totalCents, cartPreview.merchandiseCents);
assert.throws(() => quoteCheckout({ lines: [{ productId: p.id, dose: "bogus", qty: 1 }] }));
assert.equal(normaliseBusinessEmail(" Lab@Example.com "), "lab@example.com");
assert.equal(normaliseEin("12-3456789"), "123456789");
assert.throws(() => normaliseBusinessEmail("not-an-email"));
assert.throws(() => normaliseEin("00-3456789"));
assert.equal(isEmail("buyer@example.com"), true);
assert.equal(canonicalReferralEmail(" Referral@Example.com "), "referral@example.com");
assert.equal(canonicalReferralEmail("referral@example.com"), "referral@example.com");
assert.equal(canonicalReferralEmail("owner+campaign@example.com"), "owner@example.com");
assert.equal(canonicalReferralEmail("OWNER+1@EXAMPLE.COM"), "owner@example.com");
assert.throws(() => canonicalReferralEmail("+campaign@example.com"));
assert.throws(() => canonicalReferralEmail("not-an-email"));
const oldCheckout = Date.now() - STALE_STRIPE_CHECKOUT_AGE_MS - 1;
for (const paymentMethod of ["zelle", "bitcoin", "ethereum"]) {
  assert.equal(
    staleStripeAction({ paymentMethod, sessionStatus: "open", createdAt: oldCheckout, now: Date.now() }),
    "ignore",
    `${paymentMethod} must not expire solely because it is old`,
  );
}
assert.equal(
  staleStripeAction({ paymentMethod: "stripe", sessionStatus: "open", createdAt: oldCheckout, now: Date.now() }),
  "expire",
);
assert.equal(
  staleStripeAction({ paymentMethod: "stripe", sessionStatus: "expired", createdAt: oldCheckout, now: Date.now() }),
  "cancel",
);
assert.equal(
  staleStripeAction({ paymentMethod: "stripe", sessionStatus: "complete", createdAt: oldCheckout, now: Date.now() }),
  "settle",
);
assert.equal(
  staleStripeAction({ paymentMethod: "stripe", sessionStatus: "open", createdAt: Date.now(), now: Date.now() }),
  "ignore",
);
console.log("checkout quote, validation, referral identity, and stale payment expiry: 25 cases passed");