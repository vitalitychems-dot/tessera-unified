import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { IL_NOTICE } from "@/lib/business";
import { catalogEconomics } from "@/lib/investor-model";
import { loadInvestorSnapshot, submitInvestorContact, submitPartnerContact } from "@/lib/store-api";
import { seoHead } from "@/lib/seo";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/partners")({
  component: Partners,
  head: () => seoHead({
    title: "Partners, UGC, and investor conversations",
    description: "Partner, UGC sponsorship, and transparent ROI conversations for Vitality Chems.",
    path: "/partners",
  }),
});

function Partners() {
  const [tab, setTab] = useState<"partner" | "investor">("partner");
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pt-8 pb-20 sm:px-6">
        <p className="font-mono text-xs tracking-widest text-primary uppercase">Partner desk</p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-wide uppercase">Build the research supply story</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
          We consider compliant UGC, laboratory education, distribution, and ad-spend partnerships.
          We do not pay for hidden endorsements, health claims, or content that presents research
          materials as suitable for human or animal use.
        </p>
        <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Partnership options">
          <button type="button" role="tab" aria-selected={tab === "partner"} className={tab === "partner" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("partner")}>Partner / UGC sponsorship</button>
          <button type="button" role="tab" aria-selected={tab === "investor"} className={tab === "investor" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("investor")}>Investor / ROI</button>
        </div>
        {tab === "partner" ? <PartnerForm /> : <InvestorPanel />}
      </main>
      <SiteFooter />
    </div>
  );
}

function PartnerForm() {
  const [form, setForm] = useState({ name: "", email: "", organization: "", channel: "UGC / creator", audience: "", message: "" });
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-lg border border-border bg-surface p-6">
        <p className="font-mono text-[10px] tracking-widest text-primary uppercase">What we review</p>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
          <li>• UGC with clear sponsorship disclosure and no health outcomes.</li>
          <li>• Laboratory education that links to current documentation and the RUO boundary.</li>
          <li>• Qualified-lab distribution and affiliate arrangements with auditable attribution.</li>
          <li>• Audience fit, content rights, deliverables, and a measurable test period.</li>
        </ul>
        <p className="mt-6 text-xs leading-relaxed text-faint">{IL_NOTICE}</p>
      </div>
      <form className="grid gap-3 rounded-lg border border-primary/40 bg-surface p-6" onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setStatus(null);
        try {
          const result = await submitPartnerContact({ data: form });
          setStatus(result.ok ? "Thanks. Your proposal is queued for review." : result.error);
          if (result.ok) setForm({ name: "", email: "", organization: "", channel: "UGC / creator", audience: "", message: "" });
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Could not submit the proposal.");
        } finally {
          setPending(false);
        }
      }}>
        <h2 className="font-display text-xl font-semibold uppercase">Start a partner conversation</h2>
        {(["name", "email", "organization", "audience"] as const).map((key) => (
          <label key={key} className="grid gap-1 text-sm text-muted">{key === "organization" ? "Organization" : key[0].toUpperCase() + key.slice(1)}
            <input className="input-field" required={key === "name" || key === "email"} type={key === "email" ? "email" : "text"} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
          </label>
        ))}
        <label className="grid gap-1 text-sm text-muted">Partnership type
          <select className="input-field" value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })}>
            <option>UGC / creator</option><option>Laboratory education</option><option>Distribution</option><option>Affiliate</option><option>Other</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm text-muted">Proposal
          <textarea className="input-field min-h-32" required maxLength={4000} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
        </label>
        <button className="btn-primary" disabled={pending}>{pending ? "Submitting…" : "Submit proposal"}</button>
        {status ? <p role="status" className="text-sm text-primary">{status}</p> : null}
      </form>
    </section>
  );
}

function InvestorPanel() {
  const [form, setForm] = useState({ name: "", email: "", organization: "", amountInterest: "", experience: "", message: "" });
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const economics = useMemo(() => catalogEconomics(), []);
  const [snapshot, setSnapshot] = useState<
    Awaited<ReturnType<typeof loadInvestorSnapshot>> | { ok: false; error: string } | null
  >(null);

  useEffect(() => {
    void loadInvestorSnapshot().then(setSnapshot).catch(() => setSnapshot({
      ok: false,
      error: "Live ledger evidence is temporarily unavailable.",
    }));
  }, []);

  return (
    <section className="mt-6 space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Live paid orders" value={snapshot?.ok ? String(snapshot.paidOrders) : "Loading…"} />
        <Metric label="Gross merchandise before refunds" value={snapshot?.ok ? formatPrice(snapshot.grossMerchandise) : "Loading…"} />
        <Metric label="Latest paid order" value={snapshot?.ok ? (snapshot.latestPaidAt ? new Date(snapshot.latestPaidAt).toLocaleDateString() : "None yet") : "Loading…"} />
        <Metric label="Known-cost SKU coverage" value={`${Math.round(economics.costCoverage * 100)}%`} />
        <Metric label="Known-cost vials" value={`${economics.knownCostSkuCount}/${economics.skuCount}`} />
        <Metric label="Modeled catalog AOV" value={economics.aov == null ? "Unknown" : formatPrice(economics.aov)} />
      </div>
      <div className="rounded-lg border border-border bg-surface p-5 text-sm leading-relaxed text-muted">
        <p className="font-mono text-[10px] tracking-widest text-primary uppercase">Evidence and provenance</p>
        <p className="mt-2">
          {snapshot?.ok
            ? `${snapshot.source} Latest paid-order timestamp: ${snapshot.latestPaidAt ? new Date(snapshot.latestPaidAt).toLocaleString() : "no paid orders yet"}.`
            : snapshot?.error ?? "Loading the aggregate paid-order ledger snapshot…"}
        </p>
        <p className="mt-2">
          Catalog coverage and modeled AOV use the current retail catalog plus matched supplier-sheet
          rows. They are not actual customer AOV, net profit, ROI, or a forecast. Unknown supplier
          costs remain excluded; refunds, shipping expense, processor fees, taxes, overhead, legal
          costs, and customer-acquisition results are not silently invented.
        </p>
      </div>
      <div className="rounded-lg border border-warn/40 bg-warn/10 p-5 text-sm leading-relaxed text-muted">
        Any ROI discussion is a scenario built from stated assumptions, not a claim about the live
        ledger. This is a diligence conversation, not an offer to sell securities or a promise of
        return. Request the packet for source rows and exclusions before relying on any projection.
      </div>
      <form className="grid gap-3 rounded-lg border border-primary/40 bg-surface p-6" onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setStatus(null);
        try {
          const result = await submitInvestorContact({ data: form });
          setStatus(result.ok ? "Thanks. Your investor inquiry is queued for review." : result.error);
          if (result.ok) setForm({ name: "", email: "", organization: "", amountInterest: "", experience: "", message: "" });
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Could not submit the inquiry.");
        } finally {
          setPending(false);
        }
      }}>
        <h2 className="font-display text-xl font-semibold uppercase">Request the diligence packet</h2>
        {(["name", "email", "organization", "amountInterest"] as const).map((key) => (
          <label key={key} className="grid gap-1 text-sm text-muted">{key === "amountInterest" ? "Capital range / interest" : key[0].toUpperCase() + key.slice(1)}
            <input className="input-field" required={key === "name" || key === "email"} type={key === "email" ? "email" : "text"} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
          </label>
        ))}
        <label className="grid gap-1 text-sm text-muted">Relevant experience
          <textarea className="input-field min-h-20" maxLength={500} value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} />
        </label>
        <label className="grid gap-1 text-sm text-muted">Question or thesis
          <textarea className="input-field min-h-32" required maxLength={4000} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
        </label>
        <button className="btn-primary" disabled={pending}>{pending ? "Submitting…" : "Submit investor inquiry"}</button>
        {status ? <p role="status" className="text-sm text-primary">{status}</p> : null}
      </form>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border bg-surface px-4 py-3"><p className="font-mono text-[10px] tracking-widest text-muted uppercase">{label}</p><p className="mt-1 font-display text-2xl font-semibold">{value}</p></div>;
}
