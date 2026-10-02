import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/legal/privacy")({
  component: Page,
  head: () =>
    seoHead({
      title: "Privacy",
      description: "How Vitality Supply collects and uses laboratory order data.",
      path: "/legal/privacy",
    }),
});

function Page() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 pt-8 pb-20">
        <h1 className="font-display text-4xl font-semibold tracking-wide uppercase">Privacy</h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            We collect the contact, shipping, and payment details required to fulfill a research
            order, plus limited device data needed to operate the storefront (cart contents, age
            gate acknowledgment).
          </p>
          <p>
            Order data is used to pack, ship, support, and prevent prohibited use. We do not sell
            personal information. Payment details are handled through the checkout session and are
            not stored on this storefront after the order is placed.
          </p>
          <p>
            You may request access or deletion of account-style records by contacting support. We
            retain transaction records as required for tax, fraud, and compliance review.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
