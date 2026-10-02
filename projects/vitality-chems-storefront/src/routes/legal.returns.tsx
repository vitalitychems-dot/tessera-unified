import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/legal/returns")({ component: Page });

function Page() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 pt-8 pb-20">
        <h1 className="font-display text-4xl font-semibold tracking-wide uppercase">Returns</h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            Research chemicals cannot be restocked once the vial seal is broken. Opened materials
            are not eligible for return.
          </p>
          <p>
            If a shipment arrives damaged, incomplete, or is the wrong catalog item, notify us
            within 7 days of delivery with photographs of the outer carton and the vial. We will
            replace the lot or refund the affected line.
          </p>
          <p>
            Buyer’s remorse, change of research plan, or inability to complete a protocol are not
            grounds for return. Shipping charges are refunded only when the error is ours.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
