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
        "Review Vitality Chems terms of sale for research-use-only laboratory materials, including order limits, fulfillment, pricing, risk of loss, and prohibited use.",
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
            These terms govern purchases from Vitality Chems. Products are research chemicals sold
            as-is for laboratory use only. They are not warranted for any particular research
            outcome, purity beyond the stated lot documentation, fitness for a protocol, or
            availability of a certificate for an unlisted lot.
          </p>
          <p>
            Title and risk of loss pass to the purchaser upon dispatch. We may refuse, cancel, or
            limit any order, including orders that appear destined for human or animal use. We may
            hold an order for identity, intended-use, destination, payment, or compliance review;
            an accepted payment or completed attestation does not require us to ship.
          </p>
          <p>
            Prices, catalog quantities, and availability may change without notice. Taxes and
            duties, permits, import/export obligations, and other charges or requirements, if any,
            are the purchaser’s responsibility. RUO labeling does not establish regulatory legality
            and Vitality Chems does not guarantee that a transaction is lawful in any jurisdiction.
          </p>
          <p>
            Purchasers must be 18 or older and must independently determine whether they are
            permitted to order, receive, possess, and use a material for lawful laboratory research.
            Human, animal, clinical, veterinary, consumer, cosmetic, ingestion, administration, and
            resale use is prohibited. We do not provide medical, legal, regulatory, pharmacy, or
            compounding advice.
          </p>
          <p>
            To the fullest extent permitted by law, Vitality Chems is not liable for consequential,
            incidental, or special damages arising from use or misuse of research materials.
          </p>
          <p>
            Checkout requires an active attestation that you are 18+, purchasing for laboratory
            research only, and that you have read the research use policy. The attestation is a
            purchaser representation, not a legal or regulatory certification by Vitality Chems.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
