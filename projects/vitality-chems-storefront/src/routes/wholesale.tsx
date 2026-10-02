import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BUSINESS } from "@/lib/business";
import { seoHead } from "@/lib/seo";
import { formatPrice } from "@/lib/utils";
import { WHOLESALE_TIERS, wholesaleSheet } from "@/lib/wholesale-tiers";
import { saveWholesaleLead } from "@/lib/store-api";

export const Route = createFileRoute("/wholesale")({
  component: WholesalePage,
  head: () =>
    seoHead({
      title: "Laboratory wholesale",
      description:
        "Wholesale research peptides for qualified labs. 10 / 50 / 100 vial rates. Research use only.",
      path: "/wholesale",
    }),
});

function WholesalePage() {
  const rows = wholesaleSheet().slice(0, 24);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    budget: "10 vials",
    notes: "",
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const res = await saveWholesaleLead({ data: form });
    if (res.ok) setSent(true);
    else setErr(res.error ?? "Could not send. Email us directly.");
  };

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader active="wholesale" />
      <main className="mx-auto max-w-5xl px-4 pt-8 pb-20 sm:px-6">
        <p className="font-mono text-xs tracking-widest text-primary uppercase">Lab procurement</p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-wide uppercase">
          Wholesale consult
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Single-SKU lots starting at 10 vials. Rates drop at 50 and 100. Research use only — not for
          human or animal use. We reply from {BUSINESS.email}.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {WHOLESALE_TIERS.map((t) => (
            <div key={t.qty} className="rounded-md border border-border bg-surface p-4">
              <p className="font-display text-2xl font-semibold text-primary">{t.qty}+</p>
              <p className="mt-1 text-sm text-fg">{t.label}</p>
              <p className="mt-2 text-xs text-muted">{Math.round(t.off * 100)}% under catalog</p>
            </div>
          ))}
        </div>

        <div className="mt-10 overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-overlay font-mono text-[10px] tracking-widest text-muted uppercase">
              <tr>
                <th className="px-3 py-2">Compound</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Catalog</th>
                <th className="px-3 py-2">10</th>
                <th className="px-3 py-2">50</th>
                <th className="px-3 py-2">100</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.name}-${r.dose}`} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.dose}</td>
                  <td className="px-3 py-2 text-muted">{formatPrice(r.retail)}</td>
                  <td className="px-3 py-2 text-primary">{formatPrice(r.t10)}</td>
                  <td className="px-3 py-2 text-primary">{formatPrice(r.t50)}</td>
                  <td className="px-3 py-2 text-primary">{formatPrice(r.t100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-faint">
          Sample of the catalog. Full SKU sheet sent after consult. Prices exclude shipping.
        </p>

        <section className="mt-12 rounded-lg border border-primary/40 bg-surface p-6">
          <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">
            Request a consult
          </h2>
          {sent ? (
            <p className="mt-4 text-sm text-primary">
              Received. We will reply to {form.email} from {BUSINESS.email}.
            </p>
          ) : (
            <form className="mt-6 grid gap-3 sm:grid-cols-2" onSubmit={submit}>
              <input
                required
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
              />
              <input
                placeholder="Company / lab (if applicable)"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="input-field"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
              />
              <input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
              />
              <select
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="input-field sm:col-span-2"
              >
                <option>10 vials</option>
                <option>50 vials</option>
                <option>100 vials</option>
                <option>Mixed SKU / not sure</option>
              </select>
              <textarea
                placeholder="Compounds, cadence, notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input-field min-h-24 sm:col-span-2"
              />
              {err && <p className="text-sm text-red-400 sm:col-span-2">{err}</p>}
              <button type="submit" className="btn-primary sm:col-span-2">
                Send wholesale request
              </button>
            </form>
          )}
        </section>
        <p className="mt-6 text-sm text-muted">
          Prefer email?{" "}
          <a className="text-primary hover:underline" href={`mailto:${BUSINESS.email}`}>
            {BUSINESS.email}
          </a>
          . Or{" "}
          <Link to="/affiliates" className="text-primary hover:underline">
            become an affiliate
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}