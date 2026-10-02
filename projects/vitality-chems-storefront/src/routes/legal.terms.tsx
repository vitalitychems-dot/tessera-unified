import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/legal/terms")({
  component: Page,
  head: () =>
    seoHead({
      title: "Terms of sale",
      description:
        "Vitality Supply terms of sale for research-use-only laboratory materials. Not a pharmacy.",
      path: "/legal/terms",
    }),
});

function Page() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 pt-8 pb-20">
        <h1 className="font-display text-4xl font-semibold tracking-wide uppercase">
          Terms of sale
        </h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            These terms govern purchases from Vitality Supply. Products are research chemicals sold
            as-is for laboratory use. They are not warranted for any particular research outcome.
          </p>
          <p>
            Title and risk of loss pass to the purchaser upon dispatch. We may refuse, cancel, or
            limit any order, including orders that appear destined for human or animal use.
          </p>
          <p>
            Prices, catalog quantities, and availability may change without notice. Taxes and
            duties, if any, are the purchaser’s responsibility.
          </p>
          <p>
            To the fullest extent permitted by law, Vitality Supply is not liable for consequential,
            incidental, or special damages arising from use or misuse of research materials.
          </p>
          <p>
            Checkout requires an active attestation that you are 21+, purchasing for laboratory
            research only, and that you have read the research use policy.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
