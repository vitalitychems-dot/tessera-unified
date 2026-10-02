import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileCheck2, FlaskConical, ScanLine, Truck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { saveSubscriber } from "@/lib/store-api";
import { BUSINESS } from "@/lib/business";
import { seoHead } from "@/lib/seo";
import { COAS } from "@/lib/coa";

export const Route = createFileRoute("/testing")({
  component: Testing,
  head: () =>
    seoHead({
      title: "Testing & COA requests",
      description:
        "HPLC and LC-MS identity for Vitality Supply research lots. Request a certificate of analysis by ticket. Research use only.",
      path: "/testing",
    }),
});

const STEPS = [
  {
    icon: FlaskConical,
    title: "Synthesis & lyophilization",
    body: "Compounds are produced to a defined sequence or structure, then lyophilized under controlled conditions. Each lot is assigned a batch ID before analytical release.",
  },
  {
    icon: ScanLine,
    title: "HPLC purity",
    body: "Reverse-phase HPLC is run against a release specification of ≥99% unless a lot-specific figure is published on the product page.",
  },
  {
    icon: FileCheck2,
    title: "Identity by LC-MS",
    body: "Mass spectrometry confirms the expected molecular ion. Lots that fail identity or purity are not released.",
  },
  {
    icon: Truck,
    title: "Dispatch",
    body: "Outer cartons are plain. A packing list travels with the shipment. Certificates are issued when you request one below.",
  },
];

function Testing() {
  const [email, setEmail] = useState("");
  const [compound, setCompound] = useState("");
  const [batch, setBatch] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || !compound.trim()) return;
    setBusy(true);
    try {
      await saveSubscriber({
        data: {
          email,
          name: compound.trim(),
          setName: batch.trim() || undefined,
          cadence: "coa-request",
        },
      });
      setDone(true);
    } catch {
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader active="testing" />
      <main className="mx-auto max-w-3xl px-6 pt-8 pb-20">
        <p className="font-mono text-xs tracking-widest text-primary uppercase">Quality system</p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-wide uppercase">
          Testing & certificates
        </h1>
        <p className="mt-5 leading-relaxed text-muted">
          Lots are released against HPLC purity and LC-MS identity. Certificates below are
          third-party reports for the listed lots. Results apply only to the sample tested.
          Research use only — not for human or animal use. Request another lot by ticket.
        </p>

        <section className="mt-10 space-y-6">
          {COAS.map((c) => (
            <article key={c.image} className="rounded-lg border border-border bg-surface">
              <div className="px-4 py-3">
                <h2 className="font-display text-lg font-semibold tracking-wide uppercase">
                  {c.compound.replace(/-/g, " ")} {c.dose}
                </h2>
                <p className="mt-1 font-mono text-xs tracking-wide text-muted uppercase">
                  {c.lab} · lot {c.lot} · {c.purity} · {c.quantity}
                </p>
              </div>
              <a href={c.image} target="_blank" rel="noreferrer">
                <img
                  src={c.image}
                  alt={`${c.compound} ${c.dose} certificate of analysis`}
                  className="w-full bg-white object-contain"
                />
              </a>
            </article>
          ))}
        </section>
        <div className="mt-10 space-y-4">
          {STEPS.map((s) => (
            <div key={s.title} className="flex gap-4 rounded-lg border border-border bg-surface p-5">
              <s.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-display text-lg font-semibold tracking-wide uppercase">
                  {s.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-12 rounded-lg border border-border bg-surface p-6">
          <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">
            Request a certificate
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Tell us the compound and, if you have it, the batch ID from the vial. We reply to the
            lab email with the COA for that lot. Research use only — this is not a medical record.
          </p>
          {done ? (
            <p className="mt-6 text-sm text-primary">
              Ticket received. We will send the certificate to that email when the lot file is
              pulled.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-2">
              <label className="text-xs tracking-widest text-muted uppercase sm:col-span-2">
                Lab email
                <input
                  className="input-field mt-1"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="text-xs tracking-widest text-muted uppercase">
                Compound
                <input
                  className="input-field mt-1"
                  required
                  value={compound}
                  onChange={(e) => setCompound(e.target.value)}
                  placeholder="e.g. Semaglutide 5 mg"
                />
              </label>
              <label className="text-xs tracking-widest text-muted uppercase">
                Batch ID (optional)
                <input
                  className="input-field mt-1"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  placeholder="VS-…"
                />
              </label>
              <button type="submit" className="btn-primary sm:col-span-2" disabled={busy}>
                {busy ? "Sending…" : "Open COA ticket"}
              </button>
            </form>
          )}
          <p className="mt-4 text-xs text-faint">
            Or email {BUSINESS.email} with subject “COA request”.
          </p>
        </section>

        <Link to="/" className="btn-primary mt-8 inline-flex">
          Shop documented compounds
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}