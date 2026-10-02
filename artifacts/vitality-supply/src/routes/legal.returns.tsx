import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/legal/returns")({
  component: Page,
  head: () =>
    seoHead({
      title: "Returns policy",
      description:
        "Review Vitality Chems’s returns policy for sealed laboratory research materials, damaged shipments, incorrect catalog items, and refunds or replacements.",
      path: "/legal/returns",
    }),
});

function Page() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 pt-8 pb-20">
        <h1 className="font-display text-4xl font-semibold tracking-wide uppercase">Returns</h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            Research chemicals cannot be restocked once the vial seal is broken. Opened materials
            are not eligible for return, and we do not accept returns based on an alleged research
            result, protocol change, compatibility concern, or purchaser’s regulatory issue.
          </p>
          <p>
            If a shipment arrives damaged, incomplete, or is the wrong catalog item, notify us
            within 7 days of delivery with photographs of the outer carton and the vial. We will
            replace the lot or refund the affected line.
          </p>
          <p>
            Buyer’s remorse, change of research plan, or inability to complete a protocol are not
            grounds for return. Shipping charges are refunded only when the error is ours. Contact
            us before sending anything back; unauthorized returns may be refused.
          </p>
          <p>
            The purchaser is responsible for checking legality, permits, destination restrictions,
            and institutional requirements before ordering. A return or refund does not make a
            transaction lawful, and RUO labeling does not establish regulatory legality.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
