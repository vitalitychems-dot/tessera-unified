import { Link } from "@tanstack/react-router";
import { ProductCard } from "@/components/product-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { findProduct, type Product } from "@/lib/catalog";
import { articleJsonLd, serializeJsonLd, type Crumb } from "@/lib/content/structured-data";
import { CONTENT_INDEX_PATH, type PublishedPage } from "@/lib/content/types";
import { RUO_SHORT } from "@/lib/legal";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export type { Crumb };

const KIND_LABEL: Record<PublishedPage["kind"], string> = {
  compound: "Compound reference",
  family: "Compound family",
  method: "Analytical method",
};

export function formatArticleDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.valueOf())) return null;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function ResearchArticle({
  page,
  crumbs,
  familyHub,
}: {
  page: PublishedPage;
  crumbs: Crumb[];
  /** Published family hub for compound pages (`slug` is the last path segment). */
  familyHub?: { slug: string; title: string } | null;
}) {
  const products = page.body.products
    .map((link) => findProduct(link.productId))
    .filter((product): product is Product => Boolean(product?.inStock));
  const updated = formatArticleDate(page.contentUpdatedAt);
  const published = formatArticleDate(page.firstPublishedAt);
  const facts = page.body.facts;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(articleJsonLd(page, crumbs, { siteUrl: SITE_URL, siteName: SITE_NAME })),
        }}
      />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 pt-8 pb-20">
        <nav aria-label="Breadcrumb" className="font-mono text-xs tracking-wide text-muted uppercase">
          <ol className="flex flex-wrap items-center gap-2">
            {crumbs.map((crumb) => (
              <li key={crumb.path} className="flex items-center gap-2">
                <Link to={crumb.path} className="transition-colors hover:text-primary">
                  {crumb.name}
                </Link>
                <span aria-hidden="true">/</span>
              </li>
            ))}
            <li aria-current="page" className="text-fg">
              {KIND_LABEL[page.kind]}
            </li>
          </ol>
        </nav>

        <header className="mt-6">
          <p className="font-mono text-xs tracking-widest text-primary uppercase">{KIND_LABEL[page.kind]}</p>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-wide uppercase sm:text-4xl">{page.title}</h1>
          <p className="mt-5 leading-relaxed text-muted">{page.description}</p>
          <p className="mt-3 font-mono text-xs tracking-wide text-faint uppercase">
            {published ? `Published ${published}` : null}
            {published && updated ? " · " : null}
            {updated ? `Reviewed ${updated}` : null}
          </p>
        </header>

        {facts.length > 0 ? (
          <section aria-label="Identity" className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
            <dl className="divide-y divide-border">
              {facts.map((fact) => (
                <div key={fact.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[200px_1fr] sm:gap-4">
                  <dt className="font-mono text-xs tracking-wide text-muted uppercase">{fact.label}</dt>
                  <dd className="text-sm">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {page.body.sections.map((section) => (
          <section key={section.id} className="mt-10">
            <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">{section.heading}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index} className="mt-4 leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        {page.body.lots.length > 0 ? (
          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">Documented lots</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Third-party reports for the listed lots. Results apply only to the sample tested.{" "}
              <Link to="/testing" className="text-primary hover:underline">
                View certificates and request lot documentation
              </Link>
              .
            </p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="font-mono text-xs tracking-wide text-muted uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Material</th>
                    <th className="px-4 py-3 font-medium">Lot</th>
                    <th className="px-4 py-3 font-medium">Laboratory</th>
                    <th className="px-4 py-3 font-medium">Purity</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 font-medium">Reported</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {page.body.lots.map((lot) => (
                    <tr key={`${lot.productId}-${lot.lot}`}>
                      <td className="px-4 py-3">
                        {lot.compound} {lot.dose}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{lot.lot}</td>
                      <td className="px-4 py-3">{lot.lab}</td>
                      <td className="px-4 py-3">{lot.purity}</td>
                      <td className="px-4 py-3">{lot.method}</td>
                      <td className="px-4 py-3">{lot.reported}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {page.body.faq.length > 0 ? (
          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">Questions</h2>
            <div className="mt-4 space-y-4">
              {page.body.faq.map((item) => (
                <article key={item.q} className="rounded-lg border border-border bg-surface p-5">
                  <h3 className="font-semibold">{item.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.a}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-10 rounded-lg border border-primary/30 bg-surface p-5">
          <p className="font-mono text-xs tracking-widest text-primary uppercase">Intended use</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{page.body.notice || RUO_SHORT}</p>
          <Link to="/legal/research-use" className="mt-3 inline-block text-sm text-primary hover:underline">
            Research-use terms
          </Link>
        </section>

        <nav aria-label="Related library pages" className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link to={CONTENT_INDEX_PATH} className="text-primary hover:underline">
            Research library index
          </Link>
          {familyHub ? (
            <Link to="/compounds/$family" params={{ family: familyHub.slug }} className="text-primary hover:underline">
              {familyHub.title}
            </Link>
          ) : null}
          <Link to="/testing" className="text-primary hover:underline">
            Testing and certificates
          </Link>
        </nav>
      </main>

      {products.length > 0 ? (
        <section aria-label="Catalog materials referenced on this page" className="border-t border-border px-6 py-12">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">Catalog materials</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Lyophilized research materials referenced above. Each product page lists the lot identity, purity specification, and available quantities.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <SiteFooter />
    </div>
  );
}
