import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PromoField } from "@/components/promo-field";
import { BulkNudge, CreditEarnLine, SaveBadge } from "@/components/savings-nudge";
import { useCart, useCartTotals } from "@/lib/cart-store";
import { CRYPTO_SAVE, SHIPPING_EXPRESS, SHIPPING_FLAT } from "@/lib/catalog";
import { formatPrice } from "@/lib/utils";
import { placeResearchOrder, saveSubscriber, settleCredits } from "@/lib/store-api";
import { researchSessionId } from "@/lib/session-id";
import { trackClient } from "@/components/analytics-tracker";
import { useLabCredit } from "@/lib/use-lab-credit";
import { BUSINESS } from "@/lib/business";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  head: () =>
    seoHead({
      title: "Checkout",
      description: "Place a laboratory research order with Vitality Supply. Research use only.",
      path: "/checkout",
    }),
});

type Receipt = {
  items: {
    key: string;
    name: string;
    doseLabel: string;
    quantity: number;
    unitPrice: number;
    image: string;
  }[];
  subtotal: number;
  shipping: number;
  discount: number;
  bulkDiscount: number;
  promoDiscount: number;
  creditApplied: number;
  creditEarn: number;
  total: number;
  promoCode?: string;
};

function Checkout() {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const applyCredit = useCart((s) => s.applyCredit);
  const setApplyCredit = useCart((s) => s.setApplyCredit);
  const { balance, signedIn, user, refresh } = useLabCredit();
  const [payMethod, setPayMethod] = useState<"stripe" | "crypto" | "zelle">("stripe");
  const [shipSpeed, setShipSpeed] = useState<"standard" | "express">("standard");
  const [cryptoAsset, setCryptoAsset] = useState<"usdc" | "btc" | "eth">("usdc");
  const {
    subtotal,
    shipping,
    discount,
    total,
    promo,
    bulk,
    bulkDiscount,
    promoDiscount,
    cryptoDiscount,
    creditEarn,
    creditApplied,
    next,
    vialQty,
    youSave,
    merch,
  } = useCartTotals(balance, { crypto: payMethod === "crypto", speed: shipSpeed });
  const [done, setDone] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [attest, setAttest] = useState({ age: false, research: false, terms: false });
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    lab: "",
    address: "",
    city: "",
    region: "",
    postal: "",
    country: "United States",
    card: "",
    expiry: "",
    cvc: "",
  });

  useEffect(() => {
    if (user?.primaryEmail && !form.email) {
      setForm((f) => ({ ...f, email: user.primaryEmail ?? f.email }));
    }
  }, [user?.primaryEmail, form.email]);

  const canPay =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.includes("@") &&
    form.address.trim() &&
    form.city.trim() &&
    form.postal.trim() &&
    (payMethod === "crypto" ||
      (form.card.replace(/\s/g, "").length >= 12 &&
        form.expiry.includes("/") &&
        form.cvc.length >= 3)) &&
    attest.age &&
    attest.research &&
    attest.terms;

  useEffect(() => {
    if (items.length) trackClient("checkout_start");
  }, [items.length]);

  const placeOrder = async () => {
    const id = `VS-${Date.now().toString(36).toUpperCase()}`;
    const payload: Receipt = {
      items: items.map((i) => ({
        key: i.key,
        name: i.name,
        doseLabel: i.doseLabel,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        image: i.image,
      })),
      subtotal,
      shipping,
      discount,
      bulkDiscount,
      promoDiscount,
      creditApplied,
      creditEarn: signedIn ? creditEarn : 0,
      total,
      promoCode: promo?.code,
    };
    try {
      await placeResearchOrder({
        data: {
          id,
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          lab: form.lab,
          address: form.address,
          city: form.city,
          region: form.region,
          postal: form.postal,
          country: form.country,
          subtotal,
          shipping,
          discount,
          total: merch + shipping,
          items: JSON.stringify(payload.items),
          sessionId: researchSessionId(),
          promoCode: promo?.code,
          userId: user?.id,
        },
      });
      if (signedIn) {
        try {
          const settled = await settleCredits({ data: { orderId: id, apply: applyCredit } });
          payload.creditApplied = settled.applied;
          payload.creditEarn = settled.earned;
          payload.total = merch + shipping - settled.applied;
          refresh();
        } catch {
          /* order still stands without credit */
        }
      }
      const sub = items.find((i) => i.billingPeriod);
      if (sub) {
        await saveSubscriber({
          data: {
            email: form.email,
            name: `${form.firstName} ${form.lastName}`.trim(),
            setId: sub.productId,
            setName: sub.name,
            cadence: sub.billingPeriod,
          },
        });
      }
    } catch {
      /* still show confirmation so the lab isn't blocked if analytics is down */
    }
    setReceipt(payload);
    setOrderId(id);
    setDone(true);
    clear();
  };

  if (items.length === 0 && !done) {
    return (
      <div className="min-h-dvh bg-bg text-fg">
        <SiteHeader active="checkout" />
        <main className="mx-auto max-w-lg px-6 pt-8 text-center">
          <h1 className="font-display text-3xl font-semibold uppercase">Your cart is empty</h1>
          <p className="mt-3 text-muted">Add compounds from the catalog to check out.</p>
          <Link to="/" className="btn-primary mt-8 inline-flex">
            Shop bestsellers
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader active="checkout" />

      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 pt-8 pb-20 lg:grid-cols-[1fr_360px] lg:pt-8">
        <div>
          {done ? (
            <div className="rounded-lg border border-border bg-surface p-10 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-overlay text-primary">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="font-display text-3xl font-semibold tracking-wide uppercase">
                Order received
              </h2>
              <p className="mx-auto mt-3 max-w-md text-muted">
                Your research order is queued for same-day packing. Keep this confirmation with
                your laboratory records.
              </p>
              <p className="mt-5 font-mono text-sm text-primary">{orderId}</p>
              {receipt && receipt.creditEarn > 0 && (
                <p className="mx-auto mt-4 max-w-md text-sm text-primary">
                  {formatPrice(receipt.creditEarn)} in reward credits is waiting on your account. It only
                  applies on a later order.
                </p>
              )}
              {receipt && receipt.creditEarn === 0 && !signedIn && (
                <p className="mx-auto mt-4 max-w-md text-sm text-muted">
                  <Link to="/login" className="text-primary hover:underline">
                    Create a lab account
                  </Link>{" "}
                  on your next visit to bank 5% as spendable credit.
                </p>
              )}
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/" className="btn-primary inline-flex">
                  Return to catalog
                </Link>
                {signedIn && (
                  <Link
                    to="/account"
                    className="inline-flex min-h-11 items-center rounded-sm border border-border px-4 font-display text-xs font-semibold tracking-widest uppercase hover:border-primary hover:text-primary"
                  >
                    View reward credits
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6 rounded-lg border border-border bg-surface p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-semibold tracking-wide uppercase">
                  Checkout
                </h1>
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <Lock className="h-3.5 w-3.5 text-primary" /> Encrypted
                </span>
              </div>

              {!signedIn && (
                <p className="rounded-sm border border-border bg-overlay px-3 py-2 text-sm text-muted">
                  <Link to="/login" className="font-semibold text-primary hover:underline">
                    Sign in
                  </Link>{" "}
                  to apply stored reward credits and bank 5% of this order for next time.
                </p>
              )}

              <h2 className="font-display text-sm font-semibold tracking-widest uppercase">
                Contact
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="First name"
                  placeholder="Jordan"
                  value={form.firstName}
                  onChange={(v) => setForm({ ...form, firstName: v })}
                />
                <Field
                  label="Last name"
                  placeholder="Lee"
                  value={form.lastName}
                  onChange={(v) => setForm({ ...form, lastName: v })}
                />
              </div>
              <Field
                label="Email"
                type="email"
                placeholder="jordan@lab.example"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <Field
                label="Laboratory / institution (optional)"
                placeholder="Northridge Analytical"
                value={form.lab}
                onChange={(v) => setForm({ ...form, lab: v })}
              />

              <h2 className="font-display pt-2 text-sm font-semibold tracking-widest uppercase">
                Shipping
              </h2>
              <Field
                label="Street address"
                placeholder="1200 Research Way"
                value={form.address}
                onChange={(v) => setForm({ ...form, address: v })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="City"
                  placeholder="Austin"
                  value={form.city}
                  onChange={(v) => setForm({ ...form, city: v })}
                />
                <Field
                  label="State / region"
                  placeholder="TX"
                  value={form.region}
                  onChange={(v) => setForm({ ...form, region: v })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Postal code"
                  placeholder="78701"
                  value={form.postal}
                  onChange={(v) => setForm({ ...form, postal: v })}
                />
                <Field
                  label="Country"
                  placeholder="United States"
                  value={form.country}
                  onChange={(v) => setForm({ ...form, country: v })}
                />
              </div>

              <h2 className="font-display pt-2 text-sm font-semibold tracking-widest uppercase">
                Shipping method
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setShipSpeed("standard")}
                  className={
                    shipSpeed === "standard"
                      ? "rounded-md border border-primary bg-primary/10 px-4 py-3 text-left"
                      : "rounded-md border border-border px-4 py-3 text-left hover:border-border-strong"
                  }
                >
                  <p className="font-display text-xs font-semibold tracking-widest uppercase">
                    Standard · {formatPrice(SHIPPING_FLAT)}
                  </p>
                  <p className="mt-1 text-xs text-muted">3–5 business days · USPS / UPS Ground</p>
                </button>
                <button
                  type="button"
                  onClick={() => setShipSpeed("express")}
                  className={
                    shipSpeed === "express"
                      ? "rounded-md border border-primary bg-primary/10 px-4 py-3 text-left"
                      : "rounded-md border border-border px-4 py-3 text-left hover:border-border-strong"
                  }
                >
                  <p className="font-display text-xs font-semibold tracking-widest uppercase">
                    Express · {formatPrice(SHIPPING_EXPRESS)}
                  </p>
                  <p className="mt-1 text-xs text-muted">1–2 business days · tracked</p>
                </button>
              </div>

              <h2 className="font-display pt-2 text-sm font-semibold tracking-widest uppercase">
                Payment
              </h2>
              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setPayMethod("stripe")}
                  className={
                    payMethod === "stripe"
                      ? "rounded-md border border-primary bg-primary/10 px-4 py-3 text-left"
                      : "rounded-md border border-border px-4 py-3 text-left hover:border-border-strong"
                  }
                >
                  <p className="font-display text-xs font-semibold tracking-widest uppercase">
                    Card · Stripe
                  </p>
                  <p className="mt-1 text-xs text-muted">Visa, Mastercard, Amex</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod("zelle")}
                  className={
                    payMethod === "zelle"
                      ? "rounded-md border border-primary bg-primary/10 px-4 py-3 text-left"
                      : "rounded-md border border-border px-4 py-3 text-left hover:border-border-strong"
                  }
                >
                  <p className="font-display text-xs font-semibold tracking-widest uppercase">Zelle</p>
                  <p className="mt-1 text-xs text-muted">US bank transfer</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod("crypto")}
                  className={
                    payMethod === "crypto"
                      ? "rounded-md border border-primary bg-primary/10 px-4 py-3 text-left"
                      : "rounded-md border border-border px-4 py-3 text-left hover:border-border-strong"
                  }
                >
                  <p className="font-display text-xs font-semibold tracking-widest uppercase">
                    Crypto · save {Math.round(CRYPTO_SAVE * 100)}%
                  </p>
                  <p className="mt-1 text-xs text-muted">USDC, Bitcoin, Ether</p>
                </button>
              </div>
              {payMethod === "stripe" ? (
                <div className="space-y-3 rounded-md border border-border bg-overlay p-4">
                  <p className="flex items-center justify-between text-[10px] tracking-widest text-muted uppercase">
                    Secured by Stripe
                    <span className="font-mono">TEST MODE</span>
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_110px_90px]">
                    <Field
                      label="Card number"
                      placeholder="ACCT-000015"
                      value={form.card}
                      onChange={(v) => setForm({ ...form, card: v })}
                    />
                    <Field
                      label="Expiry"
                      placeholder="12/28"
                      value={form.expiry}
                      onChange={(v) => setForm({ ...form, expiry: v })}
                    />
                    <Field
                      label="CVC"
                      placeholder="123"
                      value={form.cvc}
                      onChange={(v) => setForm({ ...form, cvc: v })}
                    />
                  </div>
                </div>
              ) : payMethod === "zelle" ? (
                <div className="space-y-2 rounded-md border border-border bg-overlay p-4 text-sm text-muted">
                  <p>
                    Send Zelle to <span className="text-fg">{BUSINESS.email}</span> or{" "}
                    <span className="text-fg">{BUSINESS.phoneDisplay}</span>. Name the recipient{" "}
                    {BUSINESS.name}.
                  </p>
                  <p>
                    Put your lab email in the memo. We match the transfer to this order before
                    dispatch. Research materials only.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 rounded-md border border-border bg-overlay p-4">
                  <p className="text-sm text-muted">
                    {Math.round(CRYPTO_SAVE * 100)}% research discount is applied to merchandise.
                    Shipping is still billed in USD.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(["usdc", "btc", "eth"] as const).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setCryptoAsset(a)}
                        className={
                          cryptoAsset === a
                            ? "rounded-full bg-primary px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest text-primary-fg uppercase"
                            : "rounded-full border border-border px-3 py-1.5 font-mono text-[10px] tracking-widest text-muted uppercase"
                        }
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <p className="font-mono text-xs text-faint">
                    Invoice generated after attestation · {cryptoAsset.toUpperCase()} on chain
                  </p>
                </div>
              )}

              <PromoField />

              {signedIn && balance > 0 && (
                <label className="flex items-start gap-3 rounded-md border-2 border-primary bg-primary/15 p-4 text-sm shadow-[0_0_24px_rgb(163_59_255_/_0.25)]">
                  <input
                    type="checkbox"
                    checked={applyCredit}
                    onChange={(e) => setApplyCredit(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <span>
                    <span className="block font-display text-base font-semibold tracking-wide text-primary uppercase">
                      Use {formatPrice(Math.min(balance, merch))} reward credits now
                    </span>
                    <span className="mt-1 block text-fg">
                      You have {formatPrice(balance)} waiting. Apply it on this order — it does not
                      stack with newly earned credit.
                    </span>
                    <span className="mt-2 block font-mono text-[11px] tracking-wide text-primary uppercase">
                      Credit unused this session is still yours. Order soon so the rate you earned
                      actually comes off the invoice.
                    </span>
                  </span>
                </label>
              )}
              {signedIn && balance <= 0 && creditEarn > 0 && (
                <p className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
                  This order adds {formatPrice(creditEarn)} in reward credits toward your next
                  purchase. They never apply to the same invoice that earned them.
                </p>
              )}

              <fieldset className="space-y-3 rounded-md border border-border bg-overlay p-4">
                <legend className="px-1 font-display text-xs font-semibold tracking-widest uppercase">
                  Required attestation
                </legend>
                <label className="flex items-start gap-3 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={attest.age}
                    onChange={(e) => setAttest({ ...attest, age: e.target.checked })}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  I am 21 years of age or older.
                </label>
                <label className="flex items-start gap-3 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={attest.research}
                    onChange={(e) => setAttest({ ...attest, research: e.target.checked })}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  I am purchasing solely for laboratory / in-vitro research. I will not use these
                  products in or on humans or animals.
                </label>
                <label className="flex items-start gap-3 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={attest.terms}
                    onChange={(e) => setAttest({ ...attest, terms: e.target.checked })}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <span>
                    I have read and agree to the{" "}
                    <Link to="/legal/terms" className="text-primary hover:underline">
                      Terms of sale
                    </Link>{" "}
                    and{" "}
                    <Link to="/legal/research-use" className="text-primary hover:underline">
                      Research use policy
                    </Link>
                    .
                  </span>
                </label>
              </fieldset>

              <button
                type="button"
                disabled={!canPay}
                onClick={placeOrder}
                className="btn-primary w-full"
              >
                Place research order · {formatPrice(total)}
              </button>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-lg border border-border bg-surface p-6">
          <h3 className="font-display mb-4 text-sm font-semibold tracking-widest uppercase">
            Order summary
          </h3>
          {done && receipt ? (
            <>
              <ul className="divide-y divide-border">
                {receipt.items.map((item) => (
                  <li key={item.key} className="flex gap-3 py-3">
                    <img
                      src={item.image}
                      alt=""
                      className="h-14 w-14 rounded-sm bg-bg object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <p className="font-mono text-xs text-muted">
                        {item.doseLabel} × {item.quantity}
                      </p>
                    </div>
                    <span className="font-mono text-sm tabular-nums">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <Row label="Subtotal" value={formatPrice(receipt.subtotal)} />
                <Row
                  label="Shipping"
                  value={receipt.shipping === 0 ? "Free" : formatPrice(receipt.shipping)}
                />
                {receipt.discount > 0 && (
                  <Row label="Lab rates & codes" value={`−${formatPrice(receipt.discount)}`} />
                )}
                {receipt.creditApplied > 0 && (
                  <Row label="Lab credit" value={`−${formatPrice(receipt.creditApplied)}`} />
                )}
                <div className="flex justify-between pt-2 font-semibold">
                  <span>Total paid</span>
                  <span className="font-mono tabular-nums">{formatPrice(receipt.total)}</span>
                </div>
                {receipt.creditEarn > 0 && (
                  <p className="pt-2 text-xs text-primary">
                    Banked {formatPrice(receipt.creditEarn)} for your next order.
                  </p>
                )}
              </div>
            </>
          ) : done ? (
            <p className="text-sm text-muted">Keep this confirmation for your laboratory records.</p>
          ) : (
            <>
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.key} className="flex gap-3 py-3">
                    <img
                      src={item.image}
                      alt=""
                      className="h-14 w-14 rounded-sm bg-bg object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <p className="font-mono text-xs text-muted">
                        {item.doseLabel} × {item.quantity}
                      </p>
                    </div>
                    <span className="font-mono text-sm tabular-nums">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <Row label="Subtotal" value={formatPrice(subtotal)} />
                {bulkDiscount > 0 && bulk && (
                  <Row
                    label={`${bulk.label} (${bulk.percent}%)`}
                    value={`−${formatPrice(bulkDiscount)}`}
                  />
                )}
                {promoDiscount > 0 && promo && (
                  <Row
                    label={`${promo.code} (${promo.percent}%)`}
                    value={`−${formatPrice(promoDiscount)}`}
                  />
                )}
                {cryptoDiscount > 0 && (
                  <Row
                    label={`Crypto (${Math.round(CRYPTO_SAVE * 100)}%)`}
                    value={`−${formatPrice(cryptoDiscount)}`}
                  />
                )}
                {creditApplied > 0 && (
                  <Row label="Lab credit" value={`−${formatPrice(creditApplied)}`} />
                )}
                <Row
                  label={shipSpeed === "express" ? "Express shipping" : "Shipping"}
                  value={formatPrice(shipping)}
                />
                <div className="flex justify-between pt-2 font-semibold">
                  <span>Total</span>
                  <span className="font-mono tabular-nums">{formatPrice(total)}</span>
                </div>
                <SaveBadge amount={youSave} className="pt-1" />
              </div>
              <div className="mt-3 space-y-2">
                <BulkNudge vialQty={vialQty} next={next} bulk={bulk} />
                <CreditEarnLine amount={creditEarn} signedIn={signedIn} />
              </div>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold tracking-widest text-muted uppercase">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted">
      <span>{label}</span>
      <span className="text-fg tabular-nums">{value}</span>
    </div>
  );
}
