/**
 * Crawl-surface builders: sitemap.xml and llms.txt. Static routes and catalog
 * product pages are known at build time; content-engine pages come from the
 * database at request time so a page appears the moment it is published and
 * disappears the moment it is unpublished.
 *
 * `lastmod` policy: content pages carry their real `content_updated_at`. For
 * static and product routes a deployment may provide SITEMAP_LASTMOD (an ISO
 * date); we never invent lastmod values from build or request time — when the
 * date is not explicitly supplied those entries omit it.
 */
import { PRODUCTS } from "@/lib/catalog";
import { isIndexableCatalogProduct } from "@/lib/catalog-policy";
import { RUO_SHORT } from "@/lib/legal";
import { serverSiteUrl } from "@/lib/site-url";
import { CONTENT_INDEX_PATH, type ContentKind } from "./types";

export const PRIVATE_PATH_PREFIXES = ["/admin", "/account", "/login", "/checkout", "/order", "/unsubscribe", "/api/"];

export type CrawlRoute = { path: string; changefreq: string; priority: string; lastmod?: string; llms?: string };

export const PUBLIC_ROUTES: CrawlRoute[] = [
  { path: "/", changefreq: "daily", priority: "1.0", llms: "Shop: Browse HPLC-documented research materials" },
  { path: CONTENT_INDEX_PATH, changefreq: "daily", priority: "0.8", llms: "Research library: Compound reference pages, family hubs, and analytical-method explainers" },
  { path: "/testing", changefreq: "weekly", priority: "0.8", llms: "Testing & COA requests: Review testing standards and request lot documentation" },
  { path: "/contact", changefreq: "monthly", priority: "0.6", llms: "Contact: Get in touch with Vitality Chems" },
  { path: "/subscriptions", changefreq: "monthly", priority: "0.5", llms: "Restock subscriptions: Learn about recurring research-material restocks" },
  { path: "/wholesale", changefreq: "monthly", priority: "0.6", llms: "Wholesale research peptides: Information for qualified laboratories and bulk purchasers" },
  { path: "/affiliates", changefreq: "monthly", priority: "0.5", llms: "Affiliates: Review the referral program for eligible partners" },
  { path: "/legal/research-use", changefreq: "monthly", priority: "0.7", llms: "Research-use terms: Intended-use restrictions and purchaser responsibilities" },
  { path: "/legal/terms", changefreq: "yearly", priority: "0.4", llms: "Terms: Store terms and conditions" },
  { path: "/legal/privacy", changefreq: "yearly", priority: "0.4", llms: "Privacy: Privacy and data-handling policy" },
  { path: "/legal/returns", changefreq: "yearly", priority: "0.3", llms: "Returns: Return, replacement, and refund policy" },
];

export function normalizeLastmod(value: string | undefined): string | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;
  const date = new Date(`${candidate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || !Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== candidate) {
    throw new Error("SITEMAP_LASTMOD must be an ISO date (YYYY-MM-DD) when provided.");
  }
  return candidate;
}

export function productRoutes(): CrawlRoute[] {
  return PRODUCTS.filter(isIndexableCatalogProduct).map((product) => ({
    path: `/product/${product.id}`,
    changefreq: "weekly",
    priority: product.category === "vial-compounds" ? "0.9" : "0.8",
  }));
}

export type PublishedCrawlPage = {
  kind: ContentKind;
  path: string;
  subjectId: string;
  title: string;
  description: string;
  contentUpdatedAt: string | null;
};

/** Only clean research-library paths are ever emitted, whatever the table holds. */
export function isContentPath(path: string) {
  return /^\/(research|compounds)\/[a-z0-9][a-z0-9-]*$/.test(path) && !isPrivatePath(path);
}

export function contentRoutes(pages: PublishedCrawlPage[]): CrawlRoute[] {
  return pages
    .filter((page) => isContentPath(page.path))
    .map((page) => ({
      path: page.path,
      changefreq: page.kind === "family" ? "weekly" : "monthly",
      priority: page.kind === "compound" ? "0.7" : "0.6",
      ...(page.contentUpdatedAt ? { lastmod: page.contentUpdatedAt.slice(0, 10) } : {}),
    }));
}

export function isPrivatePath(path: string) {
  return PRIVATE_PATH_PREFIXES.some((prefix) => path === prefix.replace(/\/$/, "") || path.startsWith(prefix) || path.startsWith(`${prefix}/`));
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] ?? character);
}

export function buildSitemapXml(pages: PublishedCrawlPage[], options: { siteUrl?: string; staticLastmod?: string } = {}) {
  const siteUrl = options.siteUrl ?? serverSiteUrl();
  const staticLastmod = normalizeLastmod(options.staticLastmod ?? process.env.SITEMAP_LASTMOD);
  const seen = new Set<string>();
  const routes = [
    ...PUBLIC_ROUTES.map((route) => ({ ...route, lastmod: staticLastmod })),
    ...contentRoutes(pages),
    ...productRoutes().map((route) => ({ ...route, lastmod: staticLastmod })),
  ].filter((route) => {
    if (isPrivatePath(route.path) || seen.has(route.path)) return false;
    seen.add(route.path);
    return true;
  });
  const entries = routes
    .map(
      ({ path, changefreq, priority, lastmod }) =>
        `  <url><loc>${escapeXml(`${siteUrl}${path}`)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export function buildLlmsTxt(pages: PublishedCrawlPage[], options: { siteUrl?: string } = {}) {
  const siteUrl = options.siteUrl ?? serverSiteUrl();
  const links = PUBLIC_ROUTES.map(({ path, llms }) => `- [${llms}](${siteUrl}${path})`).join("\n");
  const library = pages
    .filter((page) => isContentPath(page.path))
    .map((page) => `- [${page.title}](${siteUrl}${page.path})${page.description ? `: ${page.description}` : ""}`)
    .join("\n");
  return `# Vitality Chems

> HPLC-documented research materials for qualified laboratories. ${RUO_SHORT}

${links}

## Research library

${library || "- No reference pages are published yet."}

Materials are supplied as analytical / in-vitro research compounds with lot identity (CAS, HPLC purity, molecular weight on each product page). Certificates of analysis are available for documented lots. Purchasers are responsible for applicable laws, permits, institutional rules, and destination requirements; Vitality Chems does not guarantee that a sale, possession, shipment, or use is lawful.
`;
}
