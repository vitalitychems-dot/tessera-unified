import assert from "node:assert/strict";
import type { CartItem } from "../src/lib/cart-store.ts";
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
});
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { localStorage: globalThis.localStorage },
});
const { PRODUCTS, RECON_ID, isAvailableProductId } = await import("../src/lib/catalog.ts");
const {
  cartCleanupNotice,
  isCartItemAvailable,
  sanitizeCartItems,
  useCart,
} = await import("../src/lib/cart-store.ts");

// A failed storage read must still settle hydration so checkout leaves its
// loading state; a rejected rehydrate must never throw out of the root effect.
{
  const { hydrateCart, isCartHydrated } = await import("../src/lib/cart-store.ts");
  assert.equal(isCartHydrated(), false, "nothing has hydrated before the first attempt");
  useCart.persist.setOptions({
    storage: {
      getItem: () => { throw new Error("storage denied"); },
      setItem: () => {},
      removeItem: () => {},
    },
  });
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    await hydrateCart();
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(isCartHydrated(), true, "a failed storage read must still settle cart hydration");
  assert.equal(useCart.persist.hasHydrated(), false, "zustand itself does not report a failed read as hydrated");
}

const validProduct = PRODUCTS.find((product) => product.inStock)!;
const validVariant = validProduct.variants[0];
const makeItem = (productId: string, name: string, doseLabel: string, unitPrice: number): CartItem => ({
  key: `${productId}||${doseLabel}||once`,
  productId,
  name,
  doseLabel,
  unitPrice,
  image: "/brand/logo-64.png",
  quantity: 1,
});

const stale = makeItem(RECON_ID, "Reconstitution Water", "10mL", 19.99);
const valid = makeItem(validProduct.id, validProduct.name, validVariant.dose, validVariant.price);
const cleaned = sanitizeCartItems([stale, valid]);

assert.equal(isAvailableProductId(RECON_ID), false);
assert.equal(isAvailableProductId("vial-compounds__hcg"), false);
assert.equal(sanitizeCartItems([makeItem("vial-compounds__hcg", "HCG", "5000IU", 49.99), valid]).items.length, 1);
assert.equal(isAvailableProductId(validProduct.id), true);
assert.equal(isCartItemAvailable(stale), false);
assert.deepEqual(cleaned.items.map((item) => item.productId), [validProduct.id]);
assert.deepEqual(cleaned.removed.map((item) => item.productId), [RECON_ID]);
assert.match(cartCleanupNotice(cleaned.removed), /no substitutions were made/i);

let savedState = { state: { items: [stale, valid], promo: null, applyCredit: true }, version: 0 };
useCart.persist.setOptions({
  storage: {
    getItem: () => savedState,
    setItem: (_name, value) => { savedState = value as typeof savedState; },
    removeItem: () => {},
  },
});
await useCart.persist.rehydrate();
assert.deepEqual(savedState.state.items.map((item) => item.productId), [valid.productId]);
assert.ok(useCart.getState().notice);
await useCart.persist.rehydrate();
assert.equal(useCart.getState().notice, null, "cleaned storage must not repeat the notice");

const variantProduct = PRODUCTS.find((product) => product.variants.length > 1);
assert.ok(variantProduct, "catalog should retain a multi-dose product for variant regression coverage");
for (const variant of variantProduct.variants) {
  assert.equal(
    isCartItemAvailable({ productId: variantProduct.id, doseLabel: variant.dose }),
    true,
    `current variant ${variant.dose} should remain cartable`,
  );
}

assert.equal(
  sanitizeCartItems([makeItem(variantProduct.id, variantProduct.name, "removed-dose", 1)]).items.length,
  0,
  "a removed dose must not be silently switched to a neighboring variant",
);

console.log("cart stale-SKU, preservation, direct-unavailable, and variant cases passed");
console.log("Cart store checks passed.");
