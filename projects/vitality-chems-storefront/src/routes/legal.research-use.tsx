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
        "Vitality Supply materials are research chemicals for qualified laboratories. Not for human or animal use. Not a drug.",
      path: "/legal/research-use",
    }),
});

function Page() {
  return (
    <LegalShell title="Research use policy">
      <p>{RUO_LONG}</p>
      <p>
        By placing an order you represent that you are 21 years of age or older, that you are
        purchasing as a qualified researcher or on behalf of a laboratory, and that the materials
        will be used only for lawful in-vitro, analytical, or laboratory research.
      </p>
      <p>
        We may cancel any order that appears intended for human use, veterinary use, resale as a
        consumer product, or any use that would cause the materials to be treated as a drug under
        the Federal Food, Drug, and Cosmetic Act.
      </p>
      <p>
        No information on this site is medical advice. Product copy describes laboratory context
        only. Nothing here is an instruction for administration, dosing, or clinical application.
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
