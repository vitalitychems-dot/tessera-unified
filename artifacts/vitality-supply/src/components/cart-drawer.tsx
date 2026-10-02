import { Link } from "@tanstack/react-router";
import { Minus, Plus, X } from "lucide-react";
import { useCart, useCartTotals } from "@/lib/cart-store";
import {
  findProduct,
  productImage,
  RECON_ID,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/utils";
import { PromoField } from "@/components/promo-field";
import { BulkNudge, CreditEarnLine, SaveBadge } from "@/components/savings-nudge";
import { useLabCredit } from "@/lib/use-lab-credit";
import { trackEvent } from "@/lib/analytics";
import { useModal } from "@/lib/use-modal";

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    setQuantity,
    addItem,
    applyCredit,
    setApplyCredit,
    notice,
    dismissNotice,
  } =
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

  useModal(isOpen, closeCart, "cart-drawer-container");

  if (!isOpen) return null;

  return (
    <div id="cart-drawer-container" className="fixed inset-0 z-[70] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-bg/80"
        aria-label="Close cart"
        onClick={closeCart}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-bg-elevated shadow-lift"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 id="cart-drawer-title" className="font-display text-lg font-semibold tracking-widest uppercase">
            Your Cart
          </h2>
          <button
            type="button"
            onClick={closeCart}
            className="tap-target p-2 text-muted transition-colors hover:text-fg"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {notice ? (
          <div
            role="alert"
            data-testid="status-cart-cleanup-drawer"
            className="border-b border-amber-400/30 bg-amber-400/10 px-6 py-3 text-xs text-amber-100"
          >
            <p>{notice}</p>
            <button
              type="button"
              data-testid="button-dismiss-cart-cleanup-drawer"
              onClick={dismissNotice}
              className="mt-2 font-semibold uppercase tracking-wider hover:text-white"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {items.length > 0 && (
          <div className="border-b border-border px-6 py-3">
            <p className="text-xs text-muted">
              Shipping options and the exact cost are shown at checkout before payment.
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
                    <img
                      src={item.image}
                      alt=""
                      width={64}
                      height={64}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain"
                    />
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
                         onClick={() => {
                           removeItem(item.key);
                           trackEvent("cart_item_removed", {
                             product_id: item.productId,
                             quantity: item.quantity,
                           });
                         }}
                        className="tap-target text-faint hover:text-fg"
                        aria-label={`Remove ${item.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center overflow-hidden rounded-sm border border-border">
                        <button
                          type="button"
                          className="tap-target p-2 hover:bg-overlay"
                          disabled={item.quantity <= 1}
                           onClick={() => {
                             setQuantity(item.key, item.quantity - 1);
                             trackEvent("cart_item_removed", {
                               product_id: item.productId,
                               quantity: 1,
                             });
                           }}
                          aria-label={`Decrease ${item.name} ${item.doseLabel} quantity`}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <output className="min-w-7 px-1 text-center font-mono text-xs tabular-nums" aria-label={`${item.name} ${item.doseLabel} quantity`}>
                          {item.quantity}
                        </output>
                        <button
                          type="button"
                          className="tap-target p-2 hover:bg-overlay"
                           onClick={() => {
                             setQuantity(item.key, item.quantity + 1);
                             trackEvent("cart_item_added", {
                               product_id: item.productId,
                               quantity: 1,
                             });
                           }}
                          aria-label={`Increase ${item.name} ${item.doseLabel} quantity`}
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
                10 mL catalog accessory for lyophilized research materials. No administration or
                reconstitution instructions are provided.{" "}
                {formatPrice(recon.variants[0].price)}.
              </p>
              <button
                type="button"
                className="btn-primary mt-3 w-full"
                 onClick={() => {
                   addItem({
                     productId: recon.id,
                     name: recon.name,
                     doseLabel: recon.variants[0].dose,
                     unitPrice: recon.variants[0].price,
                     image:
                       recon.variants[0].image ??
                       productImage(recon.name, recon.variants[0].dose, recon.formKind),
                   });
                   trackEvent("cart_item_added", {
                     product_id: recon.id,
                     category: recon.category,
                     quantity: 1,
                   });
                 }}
              >
                Add {formatPrice(recon.variants[0].price)}
              </button>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border px-6 py-5">
            <div className="mb-3">
              <PromoField compact firstOrderHint />
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
              <span className="text-right text-fg">Calculated at checkout</span>
            </div>
            <div className="mb-2 flex justify-between text-sm font-semibold">
              <span>Merchandise total</span>
              <span className="font-mono tabular-nums">
                {formatPrice(Math.max(0, merch - creditApplied))}
              </span>
            </div>
            <SaveBadge amount={youSave} className="mb-3" />
            <div className="mb-4">
              <CreditEarnLine amount={creditEarn} signedIn={signedIn} />
            </div>
             <Link to="/checkout" rel="nofollow" onClick={closeCart} className="btn-primary w-full">
              Checkout
            </Link>
            <div className="mt-3 space-y-1 text-center text-xs text-muted">
              <p>Secure checkout · Card, Zelle, Bitcoin or Ethereum</p>
              <p>Tracked, plain packaging</p>
            </div>
            <p className="mt-3 text-center text-xs text-faint">
              Research use only · Not for human or animal use · 18+
            </p>
            <p className="mt-2 text-center text-[10px] leading-relaxed text-faint">
              RUO labeling does not establish regulatory legality; purchaser review is required.
            </p>
            <p className="mt-2 text-center text-xs">
              <Link to="/legal/research-use" onClick={closeCart} className="text-primary hover:underline">
                Review research-use requirements
              </Link>
              {" · "}
              <Link to="/legal/returns" onClick={closeCart} className="text-primary hover:underline">
                Shipping & returns
              </Link>
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

