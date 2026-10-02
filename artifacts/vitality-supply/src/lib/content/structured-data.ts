/**
 * JSON-LD for research-library pages. Kept free of client-only imports so the
 * structured-data tests can run under plain tsx.
 */
import type { PublishedPage } from "./types";

export type Crumb = { name: string; path: "/" | "/research" };
export type SiteIdentity = { siteUrl: string; siteName: string };

/** Serialize untrusted JSON-LD without allowing data to terminate its script tag. */
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function articleJsonLd(page: PublishedPage, crumbs: Crumb[], site: SiteIdentity) {
  const { siteUrl, siteName } = site;
  const url = `${siteUrl}${page.path}`;
  const organization = { "@id": `${siteUrl}/#organization` };
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [...crumbs, { name: page.title, path: page.path }].map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${siteUrl}${crumb.path}`,
    })),
  };
  const cas = page.body.facts.find((fact) => fact.label === "CAS number")?.value;
  const material = page.body.facts.find((fact) => fact.label === "Material")?.value;
  const main =
    page.kind === "family"
      ? {
          "@type": "CollectionPage",
          "@id": url,
          url,
          name: page.title,
          description: page.description,
          isPartOf: { "@type": "WebSite", url: siteUrl, name: siteName },
          publisher: organization,
          ...(page.firstPublishedAt ? { datePublished: page.firstPublishedAt } : {}),
          ...(page.contentUpdatedAt ? { dateModified: page.contentUpdatedAt } : {}),
          hasPart: page.body.products.map((product) => ({
            "@type": "Product",
            name: `${product.name} research material`,
            url: `${siteUrl}/product/${product.productId}`,
          })),
        }
      : {
          "@type": "Article",
          "@id": url,
          mainEntityOfPage: url,
          headline: page.title,
          description: page.description,
          author: organization,
          publisher: organization,
          inLanguage: "en",
          ...(page.firstPublishedAt ? { datePublished: page.firstPublishedAt } : {}),
          ...(page.contentUpdatedAt ? { dateModified: page.contentUpdatedAt } : {}),
          ...(page.kind === "compound" && material
            ? {
                about: {
                  "@type": "ChemicalSubstance",
                  name: material,
                  ...(cas ? { identifier: cas } : {}),
                  url: page.body.products[0] ? `${siteUrl}/product/${page.body.products[0].productId}` : url,
                },
              }
            : {}),
        };
  const graph: Record<string, unknown>[] = [breadcrumb, main];
  if (page.body.faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: page.body.faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
