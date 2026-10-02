import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shippingFor, RECON_ID, CRYPTO_SAVE } from "./catalog";
import type { AppliedPromo } from "./promo";
import { bulkFor, CREDIT_RATE, money, nextBulk } from "./pricing";

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

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  promo: AppliedPromo | null;
  applyCredit: boolean;
  addItem: (item: Omit<CartItem, "key" | "quantity"> & { quantity?: number }) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  setPromo: (promo: AppliedPromo | null) => void;
  setApplyCredit: (v: boolean) => void;
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

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      promo: null,
      applyCredit: true,
      addItem: (item) =>
        set((state) => {
          const key = makeKey(item.productId, item.doseLabel, item.billingPeriod);
          const existing = state.items.find((i) => i.key === key);
          const qty = item.quantity ?? 1;
          const items = existing
            ? state.items.map((i) =>
                i.key === key ? { ...i, quantity: i.quantity + qty } : i,
              )
            : [...state.items, { ...item, key, quantity: qty }];
          return { items };
        }),
      removeItem: (key) =>
        set((state) => ({ items: state.items.filter((i) => i.key !== key) })),
      setQuantity: (key, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.key !== key)
              : state.items.map((i) => (i.key === key ? { ...i, quantity } : i)),
        })),
      setPromo: (promo) => set({ promo }),
      setApplyCredit: (applyCredit) => set({ applyCredit }),
      clear: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: "vitality-cart",
      partialize: (s) => ({ items: s.items, promo: s.promo, applyCredit: s.applyCredit }),
      skipHydration: true,
    },
  ),
);

export function useCartTotals(
  creditBalance = 0,
  opts: { crypto?: boolean; speed?: "standard" | "express" } = {},
) {
  const items = useCart((s) => s.items);
  const promo = useCart((s) => s.promo);
  const applyCredit = useCart((s) => s.applyCredit);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const vialQty = items
    .filter((i) => i.productId !== RECON_ID && !i.billingPeriod)
    .reduce((n, i) => n + i.quantity, 0);
  const subtotal = money(items.reduce((n, i) => n + i.unitPrice * i.quantity, 0));
  const bulk = bulkFor(vialQty);
  const bulkDiscount = bulk ? money(subtotal * (bulk.percent / 100)) : 0;
  const afterBulk = Math.max(0, subtotal - bulkDiscount);
  const promoDiscount = promo ? money(afterBulk * (promo.percent / 100)) : 0;
  const afterPromo = Math.max(0, afterBulk - promoDiscount);
  const cryptoDiscount = opts.crypto ? money(afterPromo * CRYPTO_SAVE) : 0;
  const discount = money(bulkDiscount + promoDiscount + cryptoDiscount);
  const merch = Math.max(0, subtotal - discount);
  const shipping = shippingFor(subtotal, opts.speed ?? "standard");
  const creditEarn = money(merch * CREDIT_RATE);
  const creditApplied = applyCredit ? money(Math.min(Math.max(0, creditBalance), merch)) : 0;
  const next = nextBulk(vialQty);
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
    youSave: money(discount + creditApplied),
    total: money(merch + shipping - creditApplied),
    promo,
  };
}
