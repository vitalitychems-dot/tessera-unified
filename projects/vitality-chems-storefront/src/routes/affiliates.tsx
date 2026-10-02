import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { seoHead } from "@/lib/seo";
import { AFFILIATE_BUYER_OFF } from "@/lib/wholesale-tiers";

export const Route = createFileRoute("/affiliates")({
  component: AffiliatesPage,
  head: () =>
    seoHead({
      title: "Affiliate program",
      description:
        "Earn store credit for referred laboratory orders. Create your own code after sign-in.",
      path: "/affiliates",
    }),
});

function AffiliatesPage() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader active="affiliates" />
      <main className="mx-auto max-w-3xl px-4 pt-8 pb-20 sm:px-6">
        <p className="font-mono text-xs tracking-widest text-primary uppercase">Partners</p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-wide uppercase">
          Become an affiliate
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Share a personal code. Qualified labs save {AFFILIATE_BUYER_OFF}% on merchandise. You earn
          store credit — spend it on the catalog, so the value stays in the lab supply loop.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="font-display text-3xl font-semibold text-primary">10%</p>
            <p className="mt-1 text-sm">Credit on first $1,000 referred</p>
          </div>
          <div className="rounded-md border border-primary/40 bg-surface p-4">
            <p className="font-display text-3xl font-semibold text-primary">12.5%</p>
            <p className="mt-1 text-sm">Credit from $1,000–$4,999 referred</p>
          </div>
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="font-display text-3xl font-semibold text-primary">15%</p>
            <p className="mt-1 text-sm">Credit at $5,000+ referred</p>
          </div>
        </div>

        <ul className="mt-8 space-y-2 text-sm text-muted">
          <li>Paid only as lab store credit — never cash. Credit applies on a later order.</li>
          <li>Buyers get {AFFILIATE_BUYER_OFF}% off merchandise when they use your code.</li>
          <li>Research use only. No therapeutic, dosing, or human-use claims in your posts.</li>
          <li>Staff can see every redemption, email, and commission on the analytics desk.</li>
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/login" className="btn-primary">
            Sign in and create a code
          </Link>
          <Link to="/account" className="rounded-sm border border-border px-4 py-2 text-sm">
            Open my account
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}