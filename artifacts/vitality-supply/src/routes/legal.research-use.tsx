import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { RUO_LONG } from "@/lib/legal";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/legal/research-use")({
  component: Page,
  head: () =>
    seoHead({
      title: "Research use only",
      description:
        "Read Vitality Chems’s research-use policy: materials are for qualified laboratory, analytical, and in-vitro work only, never human or animal use.",
      path: "/legal/research-use",
    }),
});

function Page() {
  return (
    <LegalShell title="Research use policy">
      <p>{RUO_LONG}</p>
      <p>
        By placing an order you represent that you are 18 years of age or older, that you are a
        qualified researcher or are ordering on behalf of a laboratory, and that the materials will
        be used only for lawful in-vitro, analytical, or laboratory research. You are responsible
        for checking the laws, permits, institutional rules, destination restrictions, and other
        requirements that apply to you. An RUO label does not establish regulatory legality, and we
        do not guarantee that any sale, possession, shipment, or use is lawful.
      </p>
      <p>
        We may review, hold, refuse, or cancel any order based on intended use, destination,
        purchaser information, payment activity, applicable restrictions, or other risk factors.
        Orders may be refused even when a purchaser has completed the checkout attestation.
      </p>
      <p>
        No information on this site is medical advice. Product copy describes laboratory context
        only and makes no claim of efficacy or outcome. Nothing here is an instruction for
        administration, dosing, ingestion, diagnosis, treatment, or clinical or veterinary
        application.
      </p>
    </LegalShell>
  );
}

function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 pt-8 pb-20">
        <h1 className="font-display text-4xl font-semibold tracking-wide uppercase">{title}</h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
