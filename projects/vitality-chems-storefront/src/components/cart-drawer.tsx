import { Link } from "@tanstack/react-router";
import { Minus, Plus, X } from "lucide-react";
import { useCart, useCartTotals } from "@/lib/cart-store";
import { findProduct, RECON_ID, CRYPTO_SAVE } from "@/lib/catalog";
import { GENERIC_VIAL } from "@/lib/vial-photos";
import { formatPrice } from "@/lib/utils";
import { PromoField } from "@/components/promo-field";
import { BulkNudge, CreditEarnLine, SaveBadge } from "@/components/savings-nudge";
import { useLabCredit } from "@/lib/use-lab-credit";

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, setQuantity, addItem, applyCredit, setApplyCredit } =
    useCart();
  const { balance, signedIn } = useLabCredit();
  const {
    subtotal,
    discount,
    merch,
    promo,
    bulk,
    bulkDiscount,
    promoDiscount,
    creditEarn,
    creditApplied,
    next,
    vialQty,
    youSave,
  } = useCartTotals(balance);
  const recon = findProduct(RECON_ID);
  const hasRecon = items.some((i) => i.productId === RECON_ID);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-bg/80"
        aria-label="Close cart"
        onClick={closeCart}
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-bg-elevated shadow-lift">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="font-display text-lg font-semibold tracking-widest uppercase">Your Cart</h2>
          <button
            type="button"
            onClick={closeCart}
            className="p-2 text-muted transition-colors hover:text-fg"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length > 0 && (
          <div className="border-b border-border px-6 py-3">
            <p className="text-xs text-muted">
              Shipping calculated at checkout · crypto saves {Math.round(CRYPTO_SAVE * 100)}%.
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-muted">
              No items in your cart.{" "}
              <Link to="/" onClick={closeCart} className="text-primary hover:underline">
                Shop bestsellers
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.key} className="flex gap-3 px-6 py-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-bg">
                    <img src={item.image} alt="" className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        <p className="font-mono text-xs tracking-wider text-muted uppercase">
                          {item.doseLabel}
                          {item.billingPeriod ? ` · ${item.billingPeriod}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="text-faint hover:text-fg"
                        aria-label={`Remove ${item.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center overflow-hidden rounded-sm border border-border">
                        <button
                          type="button"
                          className="p-2 hover:bg-overlay"
                          onClick={() => setQuantity(item.key, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-7 px-1 text-center font-mono text-xs tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="p-2 hover:bg-overlay"
                          onClick={() => setQuantity(item.key, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="font-mono text-sm tabular-nums">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {items.length > 0 && recon && !hasRecon && (
            <div className="mx-6 mt-4 rounded-md border border-border bg-overlay p-4">
              <p className="text-sm font-medium">Add reconstitution water?</p>
              <p className="mt-1 text-xs text-muted">
                10 mL sterile diluent for lyophilized research materials.{" "}
                {formatPrice(recon.variants[0].price)}.
              </p>
              <button
                type="button"
                className="btn-primary mt-3 w-full"
                onClick={() =>
                  addItem({
                    productId: recon.id,
                    name: recon.name,
                    doseLabel: recon.variants[0].dose,
                    unitPrice: recon.variants[0].price,
                    image: recon.variants[0].image ?? GENERIC_VIAL,
                  })
                }
              >
                Add {formatPrice(recon.variants[0].price)}
              </button>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border px-6 py-5">
            <div className="mb-3">
              <PromoField compact />
            </div>
            <div className="mb-3">
              <BulkNudge vialQty={vialQty} next={next} bulk={bulk} />
            </div>
            <div className="mb-3 flex justify-between text-sm text-muted">
              <span>Subtotal</span>
              <span className="text-fg tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            {bulkDiscount > 0 && bulk && (
              <div className="mb-3 flex justify-between text-sm text-muted">
                <span>
                  {bulk.label} ({bulk.percent}%)
                </span>
                <span className="text-primary tabular-nums">−{formatPrice(bulkDiscount)}</span>
              </div>
            )}
            {promoDiscount > 0 && promo && (
              <div className="mb-3 flex justify-between text-sm text-muted">
                <span>
                  {promo.code} ({promo.percent}%)
                </span>
                <span className="text-primary tabular-nums">−{formatPrice(promoDiscount)}</span>
              </div>
            )}
            {signedIn && balance > 0 && (
              <label className="mb-3 flex items-center justify-between gap-3 text-sm text-muted">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={applyCredit}
                    onChange={(e) => setApplyCredit(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Lab credit ({formatPrice(balance)})
                </span>
                <span className="text-primary tabular-nums">
                  {applyCredit ? `−${formatPrice(creditApplied)}` : formatPrice(0)}
                </span>
              </label>
            )}
            <div className="mb-3 flex justify-between text-sm text-muted">
              <span>Shipping</span>
              <span className="text-fg">At checkout</span>
            </div>
            <div className="mb-2 flex justify-between text-sm font-semibold">
              <span>Today</span>
              <span className="font-mono tabular-nums">
                {formatPrice(Math.max(0, merch - creditApplied))}
              </span>
            </div>
            <SaveBadge amount={youSave} className="mb-3" />
            <div className="mb-4">
              <CreditEarnLine amount={creditEarn} signedIn={signedIn} />
            </div>
            <Link to="/checkout" onClick={closeCart} className="btn-primary w-full">
              Checkout
            </Link>
            <p className="mt-3 text-center text-xs text-faint">
              Research use only · Encrypted checkout · 21+
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
