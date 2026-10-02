import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { bestsellers } from "@/lib/catalog";
import { subscribe } from "@/lib/newsletter/api";
import { BUSINESS } from "@/lib/business";
import { seoHead } from "@/lib/seo";
import { formatPrice } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { createSubscriptionCheckout, quoteSubscription } from "@/lib/store-api";

export const Route = createFileRoute("/subscriptions")({
  component: Subscriptions,
  head: () =>
    seoHead({
      title: "Laboratory restock schedule",
      description:
        "Schedule monthly or quarterly restock shipments of HPLC-documented research materials for qualified laboratories. Research use only, not for human use.",
      path: "/subscriptions",
    }),
});

function Subscriptions() {
  const heroes = bestsellers(6);
  const [email, setEmail] = useState("");
  const [cadence, setCadence] = useState("monthly");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const idempotencyKeyRef = useRef("");
  const [tab, setTab] = useState<"stripe" | "request">("stripe");
  const [form, setForm] = useState({
    productId: heroes[0]?.id ?? "",
    dose: heroes[0]?.variants[0]?.dose ?? "",
    qty: "1",
    email: "",
    firstName: "",
    lastName: "",
    lab: "",
    phone: "",
    address: "",
    city: "",
    region: "IL",
    postal: "",
    country: "United States",
    researchAttestation: false,
  });
  const [subscriptionQuote, setSubscriptionQuote] = useState<Awaited<ReturnType<typeof quoteSubscription>> | null>(null);
  const selectedProduct = heroes.find((product) => product.id === form.productId) ?? heroes[0];
  const updateForm = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const money = (cents: number) => formatPrice(cents / 100);
  async function calculateSubscription() {
    const result = await quoteSubscription({ data: { ...form, qty: Number(form.qty), cadence: cadence as "monthly" | "quarterly" } });
    setSubscriptionQuote(result);
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader active="subscribe" />
      <main className="mx-auto max-w-3xl px-4 pt-8 pb-20 sm:px-6">
        <p className="font-mono text-xs tracking-widest text-primary uppercase">
          Scheduled lab supply
        </p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-wide uppercase">
          Restock cadence
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Keep HPLC-documented lots on a monthly or quarterly dispatch for ongoing laboratory work.
          Subscriber rate is 5% off merchandise. Research use only — not for human or animal use.
          This is a request for a recurring purchasing arrangement, not a guarantee of stock,
          delivery, legality, or suitability for a particular protocol.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {heroes.map((p) => (
            <li key={p.id} className="rounded-md border border-border bg-surface px-4 py-3">
              <p className="font-display font-semibold tracking-wide uppercase">{p.name}</p>
              <p className="mt-1 font-mono text-xs text-muted">
                from {formatPrice(p.minPrice)} · {p.purity} HPLC
              </p>
            </li>
          ))}
        </ul>

         <div className="mt-10 flex flex-wrap gap-2" role="tablist" aria-label="Restock options">
           <button type="button" role="tab" aria-selected={tab === "stripe"} className={tab === "stripe" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("stripe")}>Stripe subscription</button>
           <button type="button" role="tab" aria-selected={tab === "request"} className={tab === "request" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("request")}>Request an arrangement</button>
         </div>

         {tab === "stripe" ? (
         <section className="mt-4 rounded-lg border border-primary/40 bg-surface p-6">
           <form className="grid gap-4" onSubmit={async (event) => {
             event.preventDefault();
             setPending(true);
             setError(null);
             try {
               const nextQuote = subscriptionQuote ?? await quoteSubscription({ data: { ...form, qty: Number(form.qty), cadence: cadence as "monthly" | "quarterly" } });
               setSubscriptionQuote(nextQuote);
                if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID();
               const result = await createSubscriptionCheckout({
                  data: { ...form, qty: Number(form.qty), cadence: cadence as "monthly" | "quarterly", origin: window.location.origin, idempotencyKey: idempotencyKeyRef.current },
               });
               if (!result.url) throw new Error("Stripe did not return a checkout URL.");
               window.location.assign(result.url);
             } catch (caught) {
               setError(caught instanceof Error ? caught.message : "Could not start the subscription checkout.");
             } finally {
               setPending(false);
             }
           }}>
             <div>
               <h2 className="font-display text-xl font-semibold tracking-wide uppercase">Recurring research supply</h2>
               <p className="mt-2 text-sm leading-relaxed text-muted">Subscribe through Stripe for a 5% recurring merchandise incentive. Each paid cycle creates a normal order, queues supplier fulfillment, and preserves the first-cycle review hold.</p>
             </div>
             <div className="grid gap-3 sm:grid-cols-2">
               <label className="grid gap-1 text-sm text-muted">Vial compound
                 <select className="input-field" value={form.productId} onChange={(event) => {
                   const next = heroes.find((product) => product.id === event.target.value);
                   updateForm({ productId: event.target.value, dose: next?.variants[0]?.dose ?? "" });
                   setSubscriptionQuote(null);
                 }}>
                   {heroes.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                 </select>
               </label>
               <label className="grid gap-1 text-sm text-muted">Dose / vial
                 <select className="input-field" value={form.dose} onChange={(event) => { updateForm({ dose: event.target.value }); setSubscriptionQuote(null); }}>
                   {(selectedProduct?.variants ?? []).map((variant) => <option key={variant.dose} value={variant.dose}>{variant.dose}</option>)}
                 </select>
               </label>
               <label className="grid gap-1 text-sm text-muted">Vials per cycle
                 <input className="input-field" type="number" min="1" max="100" required value={form.qty} onChange={(event) => { updateForm({ qty: event.target.value }); setSubscriptionQuote(null); }} />
               </label>
               <label className="grid gap-1 text-sm text-muted">Cadence
                 <select className="input-field" value={cadence} onChange={(event) => { setCadence(event.target.value); setSubscriptionQuote(null); }}>
                   <option value="monthly">Monthly</option>
                   <option value="quarterly">Quarterly</option>
                 </select>
               </label>
             </div>
             <div className="grid gap-3 sm:grid-cols-2">
               {([
                 ["firstName", "First name"], ["lastName", "Last name"], ["email", "Lab email"],
                 ["lab", "Laboratory / organization"], ["phone", "Phone"], ["address", "Street address"],
                 ["city", "City"], ["region", "State / region"], ["postal", "Postal code"], ["country", "Country"],
               ] as const).map(([key, label]) => (
                 <label key={key} className="grid gap-1 text-sm text-muted">{label}
                   <input className="input-field" required={["firstName", "lastName", "email", "address", "city", "region", "postal", "country"].includes(key)} type={key === "email" ? "email" : "text"} value={form[key]} onChange={(event) => updateForm({ [key]: event.target.value })} />
                 </label>
               ))}
             </div>
             <label className="flex min-h-11 items-start gap-3 text-sm text-muted">
               <input className="mt-1" type="checkbox" required checked={form.researchAttestation} onChange={(event) => updateForm({ researchAttestation: event.target.checked })} />
               <span>I confirm this order is for qualified research use only and not for human or animal consumption.</span>
             </label>
             {subscriptionQuote ? (
               <div className="rounded-md border border-border bg-overlay p-4 text-sm">
                 <p className="font-display font-semibold uppercase">Final recurring estimate</p>
                 <div className="mt-2 grid gap-1 text-muted sm:grid-cols-2">
                   <span>Merchandise after incentive</span><strong className="text-fg">{money(subscriptionQuote.subtotalCents - subscriptionQuote.discountCents)}</strong>
                   <span>Shipping</span><strong className="text-fg">{money(subscriptionQuote.shippingCents)}</strong>
                   <span>{subscriptionQuote.taxRatePercent > 0 ? `Illinois sales tax (${subscriptionQuote.taxRatePercent}%)` : "Sales tax estimate"}</span><strong className="text-fg">{money(subscriptionQuote.salesTaxCents)}</strong>
                   <span>Earned lab credit</span><strong className="text-primary">$0.00 on guest subscriptions</strong>
                   <span className="font-semibold text-fg">Due {cadence}</span><strong className="font-display text-lg text-primary">{money(subscriptionQuote.totalCents)}</strong>
                 </div>
                 <p className="mt-2 text-xs text-faint">Tax is an Illinois estimate configured by the store and is not tax advice. The recurring price includes the displayed shipping and tax snapshot.</p>
               </div>
             ) : null}
             <div className="flex flex-wrap gap-2">
               <button type="button" className="btn-secondary" disabled={pending} onClick={() => void calculateSubscription().catch((caught) => setError(caught instanceof Error ? caught.message : "Could not calculate the estimate."))}>Calculate total</button>
               <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Opening Stripe…" : "Continue to secure payment"}</button>
             </div>
             {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
           </form>
         </section>
         ) : null}

         {tab === "request" ? <section className="mt-4 rounded-lg border border-primary/40 bg-surface p-6">
          {done ? (
            <p className="text-sm text-primary">
               Request received. Check {email} for a confirmation link; we will reply from {BUSINESS.email}.
            </p>
          ) : (
            <form
              className="grid gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setPending(true);
                setError(null);
                try {
                  const result = await subscribe({
                    data: { email, name: notes || "Restock schedule", cadence, source: "sets" },
                  });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                   trackEvent("newsletter_subscribed", { source: "restock_schedule", cadence });
                  setDone(true);
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Could not save your request.");
                } finally {
                  setPending(false);
                }
              }}
            >
              <h2 className="font-display text-xl font-semibold tracking-wide uppercase">
                Start a restock schedule
              </h2>
              <label className="grid gap-1 text-sm text-muted">
                Lab email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                />
              </label>
              <label className="grid gap-1 text-sm text-muted">
                Dispatch cadence
                <select
                  value={cadence}
                  onChange={(e) => setCadence(e.target.value)}
                  className="input-field"
                >
                  <option value="monthly">Monthly dispatch</option>
                  <option value="quarterly">Quarterly dispatch</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm text-muted">
                Compounds and catalog quantities
                <textarea
                  placeholder="For example: Semaglutide, 5 mg × 10"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field min-h-24"
                />
              </label>
              <button type="submit" className="btn-primary" disabled={pending}>
                {pending ? "Saving…" : "Request restock schedule"}
              </button>
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              <p className="text-xs leading-relaxed text-faint">
                Requests are subject to review and confirmation. You may cancel before a scheduled
                shipment by contacting us. Purchasers remain responsible for applicable law and
                requirements; RUO labeling does not establish regulatory legality.
              </p>
            </form>
          )}
         </section> : null}
        <p className="mt-6 text-sm text-muted">
          Prefer a one-time order?{" "}
          <Link to="/" className="text-primary hover:underline">
            Shop the catalog
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}