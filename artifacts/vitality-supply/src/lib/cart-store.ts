import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  findProduct,
  productImage,
  RESEARCH_SETS,
  SARMS,
} from "./catalog";
import { unavailablePhoto } from "./vial-photos";
import type { AppliedPromo } from "./promo";
import { quoteCheckout } from "./checkout/quote";

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  doseLabel: string;
  unitPrice: number;
  image: string;
  quantity: number;
  billingPeriod?: "monthly" | "annual";
  compounds?: string[];
};

export type CartCleanup = {
  items: CartItem[];
  removed: Array<Pick<CartItem, "productId" | "name" | "doseLabel">>;
  clamped: Array<Pick<CartItem, "productId" | "name" | "doseLabel">>;
};

export const MAX_CART_QUANTITY = 100;

export function clampCartQuantity(quantity: number, fallback = 1) {
  if (!Number.isFinite(quantity)) return fallback;
  return Math.max(1, Math.min(MAX_CART_QUANTITY, Math.trunc(quantity)));
}

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  notice: string | null;
  promo: AppliedPromo | null;
  applyCredit: boolean;
  addItem: (item: Omit<CartItem, "key" | "quantity"> & { quantity?: number }) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  setPromo: (promo: AppliedPromo | null) => void;
  setApplyCredit: (v: boolean) => void;
  dismissNotice: () => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

function makeKey(
  productId: string,
  doseLabel: string,
  billingPeriod?: "monthly" | "annual",
) {
  return `${productId}||${doseLabel}||${billingPeriod ?? "once"}`;
}

function canonicalImage(item: Pick<CartItem, "productId" | "name" | "doseLabel" | "image">) {
  const product = findProduct(item.productId);
  if (product) return productImage(product.name, item.doseLabel, product.formKind);
  const sarm = SARMS.find((entry) => entry.id === item.productId);
  if (sarm) return unavailablePhoto(sarm.name, "30mL");
  const set = RESEARCH_SETS.find((entry) => entry.id === item.productId);
  if (set) return unavailablePhoto(set.name, "research set");
  return unavailablePhoto(item.name, item.doseLabel);
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.key === "string" &&
    typeof item.productId === "string" &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    typeof item.doseLabel === "string" &&
    item.doseLabel.trim().length > 0 &&
    typeof item.unitPrice === "number" &&
    Number.isFinite(item.unitPrice) &&
    item.unitPrice >= 0 &&
    typeof item.image === "string" &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity >= 1 &&
    (item.billingPeriod === undefined ||
      item.billingPeriod === "monthly" ||
      item.billingPeriod === "annual") &&
    (item.compounds === undefined ||
      (Array.isArray(item.compounds) && item.compounds.every((compound) => typeof compound === "string")))
  );
}

/**
 * The catalog is authoritative for cart availability. A saved cart can outlive
 * a catalog row (for example, reconstitution water was removed), so never
 * substitute a neighboring SKU or dose while restoring it.
 */
export function isCartItemAvailable(item: Pick<CartItem, "productId" | "doseLabel">) {
  const product = findProduct(item.productId);
  if (product) {
    return product.inStock && product.variants.some((variant) => variant.dose === item.doseLabel);
  }
  const sarm = SARMS.find((entry) => entry.id === item.productId);
  if (sarm) return item.doseLabel === "30mL";
  const set = RESEARCH_SETS.find((entry) => entry.id === item.productId);
  return Boolean(set && /^\d+mg$/.test(item.doseLabel));
}

export function sanitizeCartItems(items: unknown): CartCleanup {
  const available: CartItem[] = [];
  const removed: CartCleanup["removed"] = [];
  const clamped: CartCleanup["clamped"] = [];
  if (!Array.isArray(items)) return { items: available, removed, clamped };

  for (const value of items) {
    if (!isCartItem(value)) {
      removed.push({
        productId: "unknown",
        name: "An invalid saved cart item",
        doseLabel: "",
      });
      continue;
    }
    if (!isCartItemAvailable(value)) {
      removed.push({
        productId: value.productId,
        name: value.name,
        doseLabel: value.doseLabel,
      });
      continue;
    }
    const quantity = clampCartQuantity(value.quantity);
    if (quantity !== value.quantity) {
      clamped.push({
        productId: value.productId,
        name: value.name,
        doseLabel: value.doseLabel,
      });
    }
    available.push({ ...value, image: canonicalImage(value), quantity });
  }
  return { items: available, removed, clamped };
}

export function cartCleanupNotice(
  removed: CartCleanup["removed"],
  clamped: CartCleanup["clamped"] = [],
) {
  const labels = [...new Set(
    removed.map((item) => `${item.name}${item.doseLabel ? ` · ${item.doseLabel}` : ""}`),
  )];
  const clampedLabels = [...new Set(
    clamped.map((item) => `${item.name}${item.doseLabel ? ` · ${item.doseLabel}` : ""}`),
  )];
  const messages: string[] = [];
  if (labels.length > 0) {
    messages.push(
      `We removed ${labels.join(", ")} from your saved cart because it is no longer available. Your other valid items were kept; no substitutions were made.`,
    );
  }
  if (clampedLabels.length > 0) {
    messages.push(
      `We limited ${clampedLabels.join(", ")} to ${MAX_CART_QUANTITY} units per item. Your complete cart total is shown below.`,
    );
  }
  return messages.join(" ") || null;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      notice: null,
      promo: null,
      applyCredit: true,
      addItem: (item) =>
        set((state) => {
          if (!isCartItemAvailable(item)) {
            return {
              notice: `We couldn't add ${item.name} because that item is no longer available. No substitution was made.`,
            };
          }
          const key = makeKey(item.productId, item.doseLabel, item.billingPeriod);
          const existing = state.items.find((i) => i.key === key);
          const requested = Number(item.quantity ?? 1);
          const qty = clampCartQuantity(requested);
          const nextQuantity = existing
            ? clampCartQuantity(existing.quantity + qty)
            : qty;
          const overLimit = (existing?.quantity ?? 0) + qty > MAX_CART_QUANTITY || requested > MAX_CART_QUANTITY;
          const items = existing
            ? state.items.map((i) =>
                i.key === key
                  ? { ...i, image: canonicalImage(i), quantity: nextQuantity }
                  : i,
              )
            : [...state.items, { ...item, image: canonicalImage(item), key, quantity: nextQuantity }];
          return {
            items,
            notice: overLimit
              ? `${item.name} is limited to ${MAX_CART_QUANTITY} units per item. We kept the maximum quantity and included it in your total.`
              : null,
          };
        }),
      removeItem: (key) =>
        set((state) => ({ items: state.items.filter((i) => i.key !== key) })),
      setQuantity: (key, quantity) =>
        set((state) => {
          if (quantity <= 0) return { items: state.items.filter((i) => i.key !== key) };
          const item = state.items.find((i) => i.key === key);
          const nextQuantity = clampCartQuantity(quantity);
          return {
            items: state.items.map((i) => (i.key === key ? { ...i, quantity: nextQuantity } : i)),
            notice: item && quantity > MAX_CART_QUANTITY
              ? `${item.name} is limited to ${MAX_CART_QUANTITY} units per item. We kept the maximum quantity and included it in your total.`
              : null,
          };
        }),
      setPromo: (promo) => set({ promo }),
      setApplyCredit: (applyCredit) => set({ applyCredit }),
      dismissNotice: () => set({ notice: null }),
      clear: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: "vitality-cart",
      partialize: (s) => ({ items: s.items, promo: s.promo, applyCredit: s.applyCredit }),
      onRehydrateStorage: () => (state, error) => {
        if (!error && state?.notice) {
          useCart.setState({ items: state.items });
        }
      },
      merge: (persisted, current) => {
        const saved = (persisted && typeof persisted === "object" ? persisted : {}) as Partial<CartState>;
        const cleaned = sanitizeCartItems(saved.items);
        return {
          ...current,
          ...saved,
          items: cleaned.items,
          notice: cartCleanupNotice(cleaned.removed, cleaned.clamped),
        };
      },
      skipHydration: true,
    },
  ),
);

// Hydration "settled" signal. Zustand only reports hasHydrated() after a
// successful storage read; a corrupted entry or a browser that denies storage
// access never resolves it, so the attempt is tracked separately and marked
// settled in every outcome. Without this, checkout could wait forever.
let cartHydrationSettled = false;
const hydrationListeners = new Set<() => void>();

function markCartHydrationSettled() {
  if (cartHydrationSettled) return;
  cartHydrationSettled = true;
  for (const listener of hydrationListeners) listener();
}

/**
 * Restore the persisted cart. Safe to call when persistence is unavailable
 * (zustand omits `persist` entirely when storage access throws): the cart then
 * stays in-memory and is reported as settled/empty rather than crashing the
 * root effect.
 */
export async function hydrateCart(): Promise<void> {
  try {
    const persistApi = (useCart as Partial<typeof useCart>).persist;
    if (persistApi?.rehydrate) await persistApi.rehydrate();
  } catch (error) {
    console.warn("[cart] saved cart could not be restored", error);
  } finally {
    markCartHydrationSettled();
  }
}

const subscribeHydration = (onChange: () => void) => {
  hydrationListeners.add(onChange);
  const persistApi = (useCart as Partial<typeof useCart>).persist;
  const unsubscribeFinish = persistApi?.onFinishHydration ? persistApi.onFinishHydration(onChange) : () => {};
  return () => {
    hydrationListeners.delete(onChange);
    unsubscribeFinish();
  };
};
/** Current hydration snapshot: settled by attempt, or reported by zustand. */
export const isCartHydrated = () => {
  if (cartHydrationSettled) return true;
  const persistApi = (useCart as Partial<typeof useCart>).persist;
  return Boolean(persistApi?.hasHydrated?.());
};
const hasHydrated = isCartHydrated;
const serverNotHydrated = () => false;

/**
 * True once the persisted cart has been read (or the read has failed) on the
 * client. The server, and the first client render, report false so full loads
 * of cart-dependent pages (checkout reload, return from a payment provider)
 * show a loading state instead of a misleading "cart is empty" flash before
 * hydration.
 */
export function useCartHydrated() {
  return useSyncExternalStore(subscribeHydration, hasHydrated, serverNotHydrated);
}

export function useCartTotals(
  creditBalance = 0,
  opts: { crypto?: boolean; speed?: "standard" | "express" } = {},
) {
  const items = useCart((s) => s.items);
  const promo = useCart((s) => s.promo);
  const applyCredit = useCart((s) => s.applyCredit);
  // Availability can legitimately remove a row, but an over-limit quantity must
  // never disappear from totals. Normalize it here as a final defense against
  // old/crafted persisted state while the store migration notice is displayed.
  const availableItems = items
    .filter((item) => isCartItemAvailable(item))
    .map((item) => ({ ...item, quantity: clampCartQuantity(item.quantity) }));
  const quote = availableItems.length ? quoteCheckout({
    lines: availableItems.map((item) => ({ productId: item.productId, dose: item.doseLabel, qty: item.quantity })),
    promo,
    paymentMethod: opts.crypto ? "bitcoin" : undefined,
    creditBalanceCents: Math.round(creditBalance * 100),
    applyCredit,
    signedIn: creditBalance > 0,
    shippingSpeed: opts.speed,
    calculateShipping: false,
  }) : null;
  const cents = (value: number | undefined) => (value ?? 0) / 100;
  const count = quote?.count ?? 0;
  const vialQty = quote?.vialQty ?? 0;
  const subtotal = cents(quote?.subtotalCents);
  const bulk = quote?.bulk ?? null;
  const bulkDiscount = cents(quote?.savings.bulkCents);
  const promoDiscount = cents(quote?.savings.promoCents);
  const cryptoDiscount = cents(quote?.savings.cryptoCents);
  const discount = bulkDiscount + promoDiscount + cryptoDiscount;
  const merch = cents(quote?.merchandiseCents);
  const shipping = cents(quote?.shippingCents);
  const creditEarn = cents(quote?.creditEarnedCents);
  const creditApplied = cents(quote?.creditAppliedCents);
  const next = quote?.nextTier ?? null;
  return {
    count,
    vialQty,
    subtotal,
    bulk,
    bulkDiscount,
    promoDiscount,
    cryptoDiscount,
    discount,
    shipping,
    merch,
    creditEarn,
    creditApplied,
    next,
    applyCredit,
    youSave: cents(quote?.savingsCents),
    total: cents(quote?.totalCents),
    promo,
  };
}
