import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FileCheck2, ShieldCheck, Truck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PromoField } from "@/components/promo-field";
import { useCart, useCartHydrated } from "@/lib/cart-store";
import { CHECKOUT_DRAFT_FIELDS, clearCheckoutDraft, readCheckoutDraft, writeCheckoutDraft } from "@/lib/checkout-draft";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useLabCredit } from "@/lib/use-lab-credit";
import {
  createOrder,
  loadMyBusinessProfile,
  loadMyReferralCode,
  loadPaymentOptions,
  quoteCart,
} from "@/lib/store-api";
import { formatPrice } from "@/lib/utils";
import { noindexSeoHead } from "@/lib/seo";
import { amountBucket, trackEvent } from "@/lib/analytics";
import { BULK_TIERS } from "@/lib/pricing";
import { RECON_ID } from "@/lib/catalog";
import { trackClient } from "@/components/analytics-tracker";
import { researchSessionId } from "@/lib/session-id";
import { lookupPromo } from "@/lib/promo-lookup";
import {
  cartSizeBucket,
  classifyCheckoutError,
  fieldGroupForInput,
  paymentProviderFor,
} from "@/lib/conversion/events";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  head: () => noindexSeoHead({ title: "Checkout", description: "Secure Vitality Chems checkout.", path: "/checkout" }),
});

type Quote = Awaited<ReturnType<typeof quoteCart>>;
type Method = "stripe" | "zelle" | "bitcoin" | "ethereum";

function Checkout() {
  const navigate = useNavigate();
  const { user, isPending: userPending } = useCurrentUserState();
  const credit = useLabCredit();
  const { items, promo, applyCredit, setApplyCredit } = useCart();
  const cartHydrated = useCartHydrated();
  const setQuantity = useCart((state) => state.setQuantity);
  const lines = useMemo(() => items.map((item) => ({ productId: item.productId, dose: item.doseLabel, qty: item.quantity })), [items]);
  const [method, setMethod] = useState<Method | null>(null);
  const [options, setOptions] = useState<Awaited<ReturnType<typeof loadPaymentOptions>> | null>(null);
  const [optionsStatus, setOptionsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [optionsError, setOptionsError] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteUpdatedAt, setQuoteUpdatedAt] = useState<string | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [quoteError, setQuoteError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [quoteNonce, setQuoteNonce] = useState(0);
  const quoteGeneration = useRef(0);
  const [busy, setBusy] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [myReferralCode, setMyReferralCode] = useState("");
  const [researchAttested, setResearchAttested] = useState(false);
  const lastMethodRef = useRef<Method | null>(null);
  const checkoutStartedRef = useRef(false);
  const identityRef = useRef<string | null | undefined>(undefined);
  const shippingTrackedRef = useRef(false);
  const referralStatusRef = useRef("");
  const idempotencyKeyRef = useRef("");
  const [form, setForm] = useState({
    email: user?.primaryEmail ?? "", firstName: "", lastName: "", lab: "", phone: "",
    businessEmail: "", ein: "",
    address: "", city: "", region: "", postal: "", country: "United States",
  });

  useEffect(() => {
    const draft = readCheckoutDraft();
    if (draft) {
      setForm((current) => {
        const restored = { ...current };
        for (const key of CHECKOUT_DRAFT_FIELDS) {
          const value = draft[key];
          if (typeof value === "string") restored[key] = value;
        }
        return restored;
      });
      if (typeof draft.referralCode === "string") setReferralCode(draft.referralCode);
      if (draft.promoCode && !useCart.getState().promo) {
        void lookupPromo(draft.promoCode)
          .then((found) => {
            if (found) useCart.getState().setPromo(found);
          })
          .catch(() => undefined);
      }
    }
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    // Non-personal selections only; contact and shipping fields are never
    // written to browser storage (see src/lib/checkout-draft.ts).
    writeCheckoutDraft({
      country: form.country,
      promoCode: promo?.code ?? "",
      referralCode,
    });
  }, [storageReady, form.country, promo?.code, referralCode]);

  useEffect(() => {
    setOptionsStatus("loading");
    setOptionsError("");
    loadPaymentOptions().then((value) => {
      setOptions(value);
      setOptionsStatus("ready");
      setMethod(value.stripe ? "stripe" : value.zelle ? "zelle" : value.bitcoin ? "bitcoin" : value.ethereum ? "ethereum" : null);
    }).catch((e: Error) => {
      setOptionsStatus("error");
      setOptionsError("Payment methods could not be loaded. Retry before placing the order.");
      trackClient("payment_init_failed", { dims: { provider: "unknown", category: "provider" } });
    });
  }, []);
  useEffect(() => {
    if (user?.primaryEmail) setForm((value) => ({ ...value, email: value.email || user.primaryEmail || "" }));
  }, [user?.primaryEmail]);
  useEffect(() => {
    // A draft belongs to the identity that typed it. When the signed-in user
    // changes while checkout is open (sign-out in another tab, account switch),
    // drop the draft and the contact fields it filled instead of handing them
    // to the next person on a shared device.
    if (userPending) return;
    const identity = user?.id ?? null;
    if (identityRef.current !== undefined && identityRef.current !== identity) {
      clearCheckoutDraft();
      setForm((current) => ({
        ...current,
        email: user?.primaryEmail ?? "", firstName: "", lastName: "", lab: "", phone: "",
        businessEmail: "", ein: "", address: "", city: "", region: "", postal: "",
      }));
      setReferralCode("");
    }
    identityRef.current = identity;
  }, [user?.id, user?.primaryEmail, userPending]);
  useEffect(() => {
    if (!user) {
      setMyReferralCode("");
      if (!userPending) setReferralCode("");
      return;
    }
    loadMyBusinessProfile()
      .then((value) => {
        if (value.businessEmail) {
          setForm((current) => ({ ...current, businessEmail: current.businessEmail || value.businessEmail }));
        }
      })
      .catch(() => undefined);
    loadMyReferralCode()
      .then((value) => setMyReferralCode(value.code))
      .catch(() => setMyReferralCode(""));
  }, [user?.id, userPending]);
  useEffect(() => {
    if (!lines.length) return;
    if (!checkoutStartedRef.current) {
      checkoutStartedRef.current = true;
      trackEvent("checkout_started", { item_count: lines.length });
      // First-party funnel counter read by the admin Live funnel.
      trackClient("checkout_start", { dims: { cart_size: cartSizeBucket(lines.length) } });
    }
    const generation = ++quoteGeneration.current;
    setQuoteStatus("loading");
    setQuoteError("");
    setQuoteUpdatedAt(null);
    const timer = window.setTimeout(() => {
      quoteCart({
        data: {
          lines,
          promoCode: promo?.code,
          referralCode: referralCode.trim() || undefined,
          paymentMethod: method ?? undefined,
          applyCredit,
           country: form.country,
           region: form.region,
        },
      })
        .then((value) => {
          if (generation !== quoteGeneration.current) return;
          setQuote(value);
           setQuoteUpdatedAt(new Date().toISOString());
          setQuoteStatus("ready");
          if (!shippingTrackedRef.current) {
            shippingTrackedRef.current = true;
            trackEvent("shipping_method_selected", { shipping_method: "standard" });
          }
          if (referralCode.trim()) {
            const statusKey = `${referralCode.trim().toUpperCase()}:applied`;
            if (referralStatusRef.current !== statusKey) {
              referralStatusRef.current = statusKey;
              trackEvent("referral_code_validated", { status: "applied" });
            }
          }
        })
        .catch((e: Error) => {
          if (generation !== quoteGeneration.current) return;
          trackEvent("checkout_error", { kind: "quote" });
          trackClient("checkout_quote_failed", { dims: { category: classifyCheckoutError(e.message) } });
          setQuote(null);
          setQuoteStatus("error");
          setQuoteError("The total could not be refreshed. Check your details and retry.");
          if (referralCode.trim()) {
            const statusKey = `${referralCode.trim().toUpperCase()}:rejected`;
            if (referralStatusRef.current !== statusKey) {
              referralStatusRef.current = statusKey;
              trackEvent("referral_code_validated", { status: "rejected" });
            }
          }
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [lines, promo?.code, referralCode, method, applyCredit, form.country, form.region, quoteNonce]);

  useEffect(() => {
    if (!method || lastMethodRef.current === method) return;
    lastMethodRef.current = method;
    trackEvent("payment_method_selected", { payment_method: method });
  }, [method]);

  if (!cartHydrated) return <CartLoading />;
  if (!items.length) return <Empty />;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!method) {
      trackEvent("checkout_error", { kind: "missing_payment_method" });
      trackClient("payment_init_failed", { dims: { provider: "unknown", category: "method_unavailable" } });
      setSubmitError("No payment method is currently enabled.");
      return;
    }
    if (quoteStatus !== "ready" || !quote) {
      trackClient("checkout_quote_failed", { dims: { category: "expired" } });
      setSubmitError("Refresh the server-calculated total before placing the order.");
      return;
    }
    const formElement = event.currentTarget as HTMLFormElement;
    if (!formElement.reportValidity()) {
      const invalid = formElement.querySelector<HTMLElement>(":invalid");
      trackClient("checkout_validation_failed", {
        dims: {
          field_group: fieldGroupForInput(invalid ? {
            type: invalid.getAttribute("type"),
            autocomplete: invalid.getAttribute("autocomplete"),
            name: invalid.getAttribute("name"),
          } : {}),
        },
      });
      invalid?.focus();
      return;
    }
    setBusy(true); setSubmitError("");
    try {
      if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID();
      const result = await createOrder({
        data: {
          lines,
          promoCode: promo?.code,
          referralCode: referralCode.trim() || undefined,
          paymentMethod: method,
          applyCredit,
          contact: form,
          researchAttestation: researchAttested,
          origin: window.location.origin,
          idempotencyKey: idempotencyKeyRef.current,
          analyticsSessionId: researchSessionId(),
        },
      });
      const properties = {
        payment_method: method,
        amount_bucket: amountBucket(quote?.totalCents),
      };
      trackEvent("checkout_submitted", properties);
      trackClient("order_created", { dims: { provider: paymentProviderFor(method) } });
      if (result.url) trackEvent("checkout_session_created", properties);
      clearCheckoutDraft();
      if (result.url) window.location.assign(result.url);
      else await navigate({ to: "/order/$id", params: { id: result.id }, search: { k: result.accessKey, paid: false } });
    } catch (e) {
      trackEvent("checkout_error", { kind: "submission" });
      const message = e instanceof Error ? e.message : "Checkout failed. Your details were kept so you can retry.";
      trackClient("payment_init_failed", {
        dims: { provider: paymentProviderFor(method), category: classifyCheckoutError(message) },
      });
      setSubmitError(message);
      setBusy(false);
    }
  };
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader active="checkout" />
      <main className="mx-auto grid max-w-6xl gap-8 px-6 pt-8 pb-20 lg:grid-cols-[1fr_390px]">
        <form onSubmit={submit} className="space-y-7">
          <section className="rounded-lg border border-border bg-surface p-6">
            <p className="font-mono text-xs tracking-widest text-primary uppercase">Secure checkout</p>
            <h1 className="font-display mt-2 text-3xl font-semibold uppercase">Shipping details</h1>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {([
                ["email", "Email *", "email", "email"],
                ["phone", "Phone", "tel", "tel"],
                ["firstName", "First name *", "text", "given-name"],
                ["lastName", "Last name *", "text", "family-name"],
                ["lab", "Laboratory / company (optional)", "text", "organization"],
                ["address", "Street address *", "text", "street-address"],
                ["city", "City *", "text", "address-level2"],
                ["region", "State / region", "text", "address-level1"],
                ["postal", "Postal code *", "text", "postal-code"],
                ["country", "Country *", "text", "country-name"],
              ] as const).map(([key, label, type, autoComplete]) => (
                <label key={key} className={key === "address" ? "sm:col-span-2" : ""}>
                  <span className="mb-1 block text-xs text-muted">{label}</span>
                  <input
                    type={type}
                    autoComplete={autoComplete}
                    inputMode={type === "tel" ? "tel" : "text"}
                    required={label.endsWith("*")}
                    className="input-field w-full"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </label>
              ))}
            </div>
            <div className="mt-6 border-t border-border pt-5">
              <p className="font-display text-sm font-semibold tracking-wide uppercase">Optional business details</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Used for order records only. Providing these details does not establish legal,
                regulatory, tax, or research-use compliance.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs text-muted">Business email (optional)</span>
                  <input
                    data-testid="input-business-email"
                    type="email"
                    autoComplete="organization"
                    className="input-field w-full"
                    value={form.businessEmail}
                    onChange={(e) => setForm({ ...form, businessEmail: e.target.value })}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs text-muted">EIN (optional)</span>
                  <input
                    data-testid="input-ein"
                    inputMode="numeric"
                    autoComplete="off"
                    pattern="\d{2}-?\d{7}"
                    maxLength={10}
                    placeholder="12-3456789"
                    className="input-field w-full"
                    value={form.ein}
                    onChange={(e) => setForm({ ...form, ein: e.target.value })}
                  />
                </label>
              </div>
            </div>
          </section>
          <section className="rounded-lg border border-border bg-surface p-6">
            <h2 className="font-display text-xl font-semibold uppercase">Research-use review</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              These materials are sold for research use only and are not for human or animal
              consumption. First orders may be held for a manual research-use review after payment.
              This review is not legal or regulatory advice and is not a compliance certification.
              RUO labeling does not establish regulatory legality. You are responsible for
              determining whether you may lawfully order, receive, possess, or use the materials.
            </p>
            <label className="mt-5 flex items-start gap-3 text-sm">
              <input
                data-testid="checkbox-research-attestation"
                type="checkbox"
                className="mt-1 h-4 w-4 accent-primary"
                checked={researchAttested}
                 onChange={(e) => {
                   setResearchAttested(e.target.checked);
                   trackClient("attestation_toggled");
                   trackEvent("attestation_toggled", { action: e.target.checked ? "checked" : "unchecked" });
                 }}
                required
              />
              <span>
                I confirm that I am 18 or older, that this order is solely for lawful laboratory
                research, and that the materials will not be used in or on people or animals.
              </span>
            </label>
          </section>
           <section className="rounded-lg border border-border bg-surface p-6">
             <fieldset className="mt-0 grid gap-3" aria-busy={optionsStatus === "loading"}>
               <legend className="font-display text-xl font-semibold uppercase">Payment</legend>
              <div className="mt-4 grid gap-3">
                <MethodCard value="stripe" title="Card" detail={optionsStatus === "loading" ? "Loading payment methods…" : options?.stripe ? "Secure Stripe checkout" : "Unavailable — card processing is not configured"}
                hint="Pay on Stripe's secure page; you'll return here with your order confirmed"
                 enabled={optionsStatus === "ready" && Boolean(options?.stripe)} selected={method === "stripe"} onClick={() => setMethod("stripe")} />
                <MethodCard value="zelle" title="Zelle" detail={optionsStatus === "loading" ? "Loading payment methods…" : options?.zelle ? "Manual confirmation · use your order reference as memo" : "Unavailable — staff configuration required"}
                hint="Send the exact total from your bank app with the order reference as memo; we confirm and pack after it arrives"
                 enabled={optionsStatus === "ready" && Boolean(options?.zelle)} selected={method === "zelle"} onClick={() => setMethod("zelle")} />
                <MethodCard value="bitcoin" title="Bitcoin" detail={optionsStatus === "loading" ? "Loading payment methods…" : options?.bitcoin ? `Manual on-chain payment · earn ${options.cryptoRewardPercent}% bonus credit` : "Unavailable — staff configuration required"}
                hint="Send the quoted amount to the address shown on your order page; confirmed on-chain, then packed"
                 enabled={optionsStatus === "ready" && Boolean(options?.bitcoin)} selected={method === "bitcoin"} onClick={() => setMethod("bitcoin")} />
                <MethodCard value="ethereum" title="Ethereum" detail={optionsStatus === "loading" ? "Loading payment methods…" : options?.ethereum ? `Manual on-chain ETH payment · earn ${options.cryptoRewardPercent}% bonus credit` : "Unavailable — staff configuration required"}
                hint="Send the quoted amount to the address shown on your order page; confirmed on-chain, then packed"
                 enabled={optionsStatus === "ready" && Boolean(options?.ethereum)} selected={method === "ethereum"} onClick={() => setMethod("ethereum")} />
            </div>
             </fieldset>
             {optionsStatus === "error" ? (
               <div className="mt-4 rounded border border-red-400/40 bg-red-400/10 p-3 text-sm" role="alert">
                 <p>{optionsError}</p>
                 <button type="button" className="btn-secondary mt-3" onClick={() => window.location.reload()}>Retry payment methods</button>
               </div>
             ) : null}
            {options?.notice && <p className="mt-4 text-sm text-muted">{options.notice}</p>}
          </section>
           {submitError && <p role="alert" className="rounded-md border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-300">{submitError}</p>}
            <button className="btn-primary min-h-12 w-full" disabled={busy || !method || optionsStatus !== "ready" || quoteStatus !== "ready"} aria-disabled={busy || !method || optionsStatus !== "ready" || quoteStatus !== "ready"}>
              {busy ? "Creating secure order…" : quoteStatus === "loading" ? "Updating server total…" : quoteStatus === "error" ? "Refresh total to place order" : !method ? "Select a payment method to place order" : "Place order"}
          </button>
          <div className="grid gap-2 text-xs text-muted sm:grid-cols-3">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />Secure checkout</span>
            <span className="flex items-center gap-2"><Truck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />Tracked shipping, plain packaging</span>
            <span className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />COA documentation with every lot</span>
          </div>
        </form>
        <aside className="h-fit space-y-5 rounded-lg border border-border bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-semibold uppercase">Order summary</h2>
          <ul className="divide-y divide-border">{items.map((item) => <li key={item.key} className="flex justify-between gap-4 py-3 text-sm"><span>{item.name} · {item.doseLabel} × {item.quantity}</span><span>{formatPrice(item.unitPrice * item.quantity)}</span></li>)}</ul>
          <PromoField />
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Customer referral code (verified account only)</span>
            <input
              data-testid="input-referral-code"
              className="input-field w-full uppercase disabled:cursor-not-allowed disabled:opacity-60"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="VSXXXXXXXXXX"
              autoComplete="off"
              disabled={!user}
            />
            <span className="mt-1 block text-xs leading-relaxed text-muted">
              Redemption requires a signed-in BetterAuth account with a verified email. Guest
              checkout cannot redeem referral codes.
            </span>
          </label>
          {myReferralCode ? (
            <div className="rounded-md border border-primary/40 bg-primary/10 p-4">
              <p className="text-xs uppercase tracking-widest text-primary">Your referral code</p>
              <p className="mt-1 font-mono text-lg font-semibold tracking-wider">{myReferralCode}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Share this code with a new customer. They receive 5% off; you receive 10% in lab
                credit after their first order is paid. One referral per customer; no self-referrals,
                cash payouts, or credit on unpaid orders. A pending reservation is released if its
                order is cancelled.
              </p>
              <button
                data-testid="button-copy-referral-code"
                type="button"
                className="mt-3 text-xs text-primary hover:underline"
                onClick={() => void navigator.clipboard?.writeText(myReferralCode)}
              >
                Copy referral code
              </button>
            </div>
          ) : !user ? (
            <p className="rounded-md border border-border bg-overlay p-3 text-xs leading-relaxed text-muted">
              Sign in and verify your email to receive or redeem a customer referral code. Codes
              are never issued or claimed by email alone.
              {" "}
               <Link data-testid="link-sign-in-referral" to="/login" rel="nofollow" search={{ redirect: "/checkout" }} className="text-primary hover:underline">Sign in</Link>
            </p>
          ) : null}
          {credit.signedIn && credit.balance > 0 && <label className="flex gap-2 text-sm"><input type="checkbox" checked={applyCredit} onChange={(e) => setApplyCredit(e.target.checked)} /> Apply {formatPrice(credit.balance)} lab credit</label>}
           {quoteStatus === "loading" ? <p className="rounded border border-primary/40 bg-primary/10 p-3 text-sm text-muted" aria-live="polite">Updating shipping, tax, discount, and credit totals…</p> : null}
           {quoteStatus === "error" ? (
             <div className="rounded border border-red-400/40 bg-red-400/10 p-3 text-sm" role="alert">
               <p>{quoteError}</p>
                <button
                  type="button"
                  className="btn-secondary mt-3"
                  onClick={() => {
                    trackClient("quote_refreshed");
                    trackEvent("quote_refreshed", { action: "retry" });
                    setQuoteNonce((value) => value + 1);
                  }}
                >
                  Retry total
                </button>
             </div>
           ) : null}
            {quote && method ? <>
            <div className="rounded-md border border-fuchsia-400/50 bg-fuchsia-400/10 p-4">
              <p className="font-display text-xl font-semibold text-fuchsia-300">You’re saving {formatPrice(quote.savingsCents / 100)} today</p>
              <p className="mt-2 text-xs text-muted">Bulk {formatPrice(quote.savings.bulkCents / 100)} · {quote.promo?.kind === "referral" ? "Referral" : "Promo"} {formatPrice(quote.savings.promoCents / 100)} · Credit {formatPrice(quote.savings.creditCents / 100)}</p>
            </div>
             <BundleTiers
               items={items.filter((item) => item.productId !== RECON_ID)}
               vialQty={quote.vialQty}
               setQuantity={setQuantity}
             />
            <div className="rounded-md border border-primary/50 bg-primary/10 p-4 text-center"><p className="text-xs uppercase tracking-widest text-muted">{user ? "You’ll earn" : "Sign in to earn"}</p><p className="font-display mt-1 text-3xl font-semibold text-primary">{formatPrice(quote.creditEarnedCents / 100)} lab credit</p></div>
            {quote.cryptoRewardCents > 0 && <p className="text-center text-xs text-primary">Includes {formatPrice(quote.cryptoRewardCents / 100)} crypto bonus credit after payment confirmation.</p>}
              <Summary label="Merchandise" value={quote.merchandiseCents} />
              <Summary label="Shipping (calculated)" value={quote.shippingCents} />
              <Summary label={quote.taxEligible ? `Illinois sales tax (${quote.taxRatePercent}%)` : "Sales tax"} value={quote.salesTaxCents} />
              <p className="text-xs leading-relaxed text-muted">
                Shipping is calculated server-side and billed in the order total.
                {" "}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => {
                    trackClient("quote_refreshed");
                    trackEvent("quote_refreshed", { action: "manual" });
                    setQuoteNonce((value) => value + 1);
                  }}
                >
                  Refresh total
                </button>
              </p>
              {quoteUpdatedAt ? (
                <p className="text-[11px] text-faint">
                  Total last checked {new Date(quoteUpdatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.
                </p>
              ) : null}
             <div className="flex justify-between border-t border-border pt-4 text-lg font-semibold" aria-live="polite"><span>Total</span><span>{formatPrice(quote.totalCents / 100)}</span></div>
           </> : quote ? (
             <p className="rounded-md border border-border bg-overlay p-3 text-xs leading-relaxed text-muted">
               Select a payment method to reveal the server-calculated shipping, sales tax, earned
               lab credit, and final amount due before you place the order.
             </p>
           ) : null}
        </aside>
      </main>
    </div>
  );
}

function MethodCard(props: { value: Method; title: string; detail: string; hint: string; enabled: boolean; selected: boolean; onClick: () => void }) {
  return (
    <label className={`block rounded-md border p-4 text-left transition-colors ${props.selected ? "border-primary bg-primary/10" : "border-border"} ${!props.enabled ? "cursor-not-allowed border-amber-300/30 opacity-75" : "cursor-pointer"} focus-within:ring-2 focus-within:ring-primary/70`}>
      <input
        type="radio"
        name="payment-method"
        value={props.value}
        checked={props.selected}
        disabled={!props.enabled}
        onChange={props.onClick}
        className="sr-only"
      />
      <span className="font-semibold">{props.title}</span>
      <span className={`mt-1 block text-xs ${props.enabled ? "text-muted" : "text-amber-200"}`}>{props.detail}</span>
      {props.enabled && <span className="mt-2 block text-xs leading-relaxed text-muted">{props.hint}</span>}
    </label>
  );
}

function BundleTiers({
  items,
  vialQty,
  setQuantity,
}: {
  items: ReturnType<typeof useCart.getState>["items"];
  vialQty: number;
  setQuantity: (key: string, quantity: number) => void;
}) {
  if (!items.length) return null;

  return (
    <section className="rounded-md border border-violet-400/40 bg-violet-400/5 p-4" aria-labelledby="bundle-tiers-heading">
      <p id="bundle-tiers-heading" className="font-display text-sm font-semibold tracking-wide uppercase">
        Multi-vial lab rates
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Choose an existing vial SKU to add the quantity needed for each current tier. Your quote,
        discounts, payment method, and credit are recalculated by checkout after every selection.
      </p>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item.key} className="rounded-sm border border-border bg-overlay p-3">
            <p className="text-xs font-medium">
              {item.name} · {item.doseLabel}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {BULK_TIERS.map((tier) => {
                const additional = Math.max(0, tier.qty - vialQty);
                const unlocked = additional === 0;
                const canAdd = !unlocked && item.quantity + additional <= 100;
                return (
                  <button
                    key={tier.qty}
                    type="button"
                    disabled={!canAdd}
                    onClick={() => {
                      if (!canAdd) return;
                      setQuantity(item.key, item.quantity + additional);
                      trackClient("bundle_tier_selected", {
                        productId: item.productId,
                        productName: item.name,
                      });
                      trackEvent("bundle_tier_selected", {
                        product_id: item.productId,
                        category: "vial-compounds",
                        quantity: tier.qty,
                        action: "add_to_existing_sku",
                      });
                    }}
                    className="min-h-14 rounded-sm border border-border bg-surface px-2 py-2 text-left text-xs transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={
                      unlocked
                        ? `${tier.qty} vial tier already included`
                        : `Add ${additional} vial${additional === 1 ? "" : "s"} to reach ${tier.qty} vials`
                    }
                  >
                    <span className="block font-display text-sm font-semibold">{tier.qty} vials</span>
                    <span className="mt-1 block text-[10px] text-muted">
                      {unlocked ? "Included" : `Add ${additional}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: number }) { return <div className="flex justify-between text-sm text-muted"><span>{label}</span><span className="text-fg">{value ? formatPrice(value / 100) : "Free"}</span></div>; }
function Empty() { return <div className="min-h-dvh bg-bg text-fg"><SiteHeader active="checkout" /><main className="mx-auto max-w-lg px-6 pt-16 text-center"><h1 className="font-display text-3xl uppercase">Your cart is empty</h1><Link to="/" className="btn-primary mt-8 inline-flex">Shop catalog</Link></main></div>; }
function CartLoading() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader active="checkout" />
      <main className="mx-auto max-w-lg px-6 pt-16 text-center" aria-busy="true">
        <h1 className="font-display text-3xl uppercase">Loading your cart…</h1>
        <p className="mt-3 text-sm text-muted">Restoring your saved items.</p>
      </main>
    </div>
  );
}