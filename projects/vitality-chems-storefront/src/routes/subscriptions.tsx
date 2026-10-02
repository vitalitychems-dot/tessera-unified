import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { bestsellers } from "@/lib/catalog";
import { saveSubscriber } from "@/lib/store-api";
import { BUSINESS } from "@/lib/business";
import { seoHead } from "@/lib/seo";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/subscriptions")({
  component: Subscriptions,
  head: () =>
    seoHead({
      title: "Laboratory restock schedule",
      description:
        "Schedule recurring research-material restock. HPLC-documented lots. Research use only.",
      path: "/subscriptions",
    }),
});

function Subscriptions() {
  const heroes = bestsellers(6);
  const [email, setEmail] = useState("");
  const [cadence, setCadence] = useState("monthly");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);

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

        <section className="mt-10 rounded-lg border border-primary/40 bg-surface p-6">
          {done ? (
            <p className="text-sm text-primary">
              Listed. We will confirm cadence to {email} from {BUSINESS.email}.
            </p>
          ) : (
            <form
              className="grid gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                await saveSubscriber({
                  data: { email, name: notes || "restock", cadence },
                });
                setDone(true);
              }}
            >
              <h2 className="font-display text-xl font-semibold tracking-wide uppercase">
                Start a restock schedule
              </h2>
              <input
                required
                type="email"
                placeholder="Lab email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
              />
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                className="input-field"
              >
                <option value="monthly">Monthly dispatch</option>
                <option value="quarterly">Quarterly dispatch</option>
              </select>
              <textarea
                placeholder="Compounds and catalog quantities (e.g. Semaglutide 5mg × 10)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field min-h-24"
              />
              <button type="submit" className="btn-primary">
                Request restock schedule
              </button>
            </form>
          )}
        </section>
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