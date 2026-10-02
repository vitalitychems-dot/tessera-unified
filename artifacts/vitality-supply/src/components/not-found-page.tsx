import { Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/**
 * Site-wide 404. The router already responds with status 404; this keeps the
 * visitor inside the storefront instead of on a bare "Not Found" paragraph.
 */
export function NotFoundPage() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader active="shop" />
      <main className="mx-auto max-w-lg px-6 pt-10 pb-16 text-center">
        <p className="font-mono text-xs tracking-widest text-primary uppercase">404</p>
        <h1 className="font-display mt-2 text-3xl font-semibold uppercase">Page not found</h1>
        <p className="mt-3 text-sm text-muted">
          That address is not part of the current catalog. The links below cover everything the
          store publishes.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary inline-flex">
            Browse catalog
          </Link>
          <Link to="/testing" className="inline-flex items-center rounded-sm border border-border px-5 py-3 text-sm font-semibold tracking-wide uppercase transition-colors hover:border-primary hover:text-primary">
            Testing &amp; COAs
          </Link>
          <Link to="/contact" className="inline-flex items-center rounded-sm border border-border px-5 py-3 text-sm font-semibold tracking-wide uppercase transition-colors hover:border-primary hover:text-primary">
            Contact
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
