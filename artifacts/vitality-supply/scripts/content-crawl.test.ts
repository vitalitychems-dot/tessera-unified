import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLlmsTxt,
  buildSitemapXml,
  contentRoutes,
  isPrivatePath,
  productRoutes,
  PUBLIC_ROUTES,
  type PublishedCrawlPage,
} from "../src/lib/content/crawl";
import { articleJsonLd, serializeJsonLd } from "../src/lib/content/structured-data";
import { allTopics } from "../src/lib/content/topics";
import type { PublishedPage } from "../src/lib/content/types";
import { RUO_SHORT } from "../src/lib/legal";

const SITE = "https://vitalitychems.com";

const pages: PublishedCrawlPage[] = [
  {
    kind: "compound",
    path: "/research/example-peptide",
    subjectId: "example",
    title: "Example peptide research material",
    description: "Identity and characterization.",
    contentUpdatedAt: "2026-09-14T12:00:00.000Z",
  },
  {
    kind: "family",
    path: "/compounds/example-family",
    subjectId: "family",
    title: "Example family hub",
    description: "Related materials.",
    contentUpdatedAt: "2026-09-13T12:00:00.000Z",
  },
  // Defensive: rows like these must never reach the sitemap even if the table is tampered with.
  { kind: "method", path: "/admin/secret", subjectId: "x", title: "Nope", description: "", contentUpdatedAt: null },
  { kind: "method", path: "research/relative", subjectId: "y", title: "Nope", description: "", contentUpdatedAt: null },
];

test("private routes never enter the crawl surface", () => {
  for (const path of ["/admin", "/admin/x", "/account", "/login", "/checkout", "/order/abc", "/unsubscribe", "/api/health/live"]) {
    assert.equal(isPrivatePath(path), true, `${path} must be private`);
  }
  for (const path of ["/", "/research", "/research/x", "/compounds/x", "/testing", "/product/abc"]) {
    assert.equal(isPrivatePath(path), false, `${path} must be public`);
  }
  for (const route of PUBLIC_ROUTES) assert.equal(isPrivatePath(route.path), false);
  assert.ok(PUBLIC_ROUTES.some((route) => route.path === "/research"));
});

test("the dynamic sitemap lists public, product, and published content routes only", () => {
  const xml = buildSitemapXml(pages, { siteUrl: SITE });
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, new RegExp(`<loc>${SITE}/</loc>`));
  assert.match(xml, new RegExp(`<loc>${SITE}/research</loc>`));
  assert.match(xml, new RegExp(`<loc>${SITE}/research/example-peptide</loc>\\s*<lastmod>2026-09-14</lastmod>`));
  assert.match(xml, new RegExp(`<loc>${SITE}/compounds/example-family</loc>`));
  assert.doesNotMatch(xml, /\/(admin|account|login|checkout|order|unsubscribe|api)(?:[</]|$)/);
  assert.doesNotMatch(xml, /relative/);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(new Set(locs).size, locs.length, "sitemap URLs must be unique");
  for (const route of productRoutes()) assert.ok(locs.includes(`${SITE}${route.path}`), `${route.path} missing`);
  assert.ok(productRoutes().length > 0);
  // Static lastmod is opt-in: without SITEMAP_LASTMOD the home page carries none.
  assert.doesNotMatch(xml, new RegExp(`<loc>${SITE}/</loc>\\s*<lastmod>`));
  const dated = buildSitemapXml([], { siteUrl: SITE, staticLastmod: "2026-09-01" });
  assert.match(dated, new RegExp(`<loc>${SITE}/</loc>\\s*<lastmod>2026-09-01</lastmod>`));
  // An invalid date is a configuration error, not something to silently drop or invent.
  assert.throws(() => buildSitemapXml([], { siteUrl: SITE, staticLastmod: "not-a-date" }), /SITEMAP_LASTMOD/);
});

test("llms.txt carries the research-use notice and published pages", () => {
  const text = buildLlmsTxt(pages, { siteUrl: SITE });
  assert.match(text, /^# Vitality Chems/);
  assert.ok(text.includes(RUO_SHORT));
  assert.match(text, /## Research library/);
  assert.ok(text.includes(`[Example peptide research material](${SITE}/research/example-peptide)`));
  assert.doesNotMatch(text, /\/admin\/secret/);
  assert.equal(contentRoutes(pages).length, 2);
});

test("every topic has a unique path, and structured data is unique per page", () => {
  const topics = allTopics();
  assert.ok(topics.length >= 5);
  const paths = topics.map((topic) => topic.path);
  assert.equal(new Set(paths).size, paths.length, "topic paths must be unique");
  const keys = topics.map((topic) => `${topic.kind}:${topic.subjectId}`);
  assert.equal(new Set(keys).size, keys.length, "topic subjects must be unique");
  for (const path of paths) {
    assert.match(path, /^\/(research|compounds)\/[a-z0-9-]+$/, `${path} is not a clean slug path`);
    assert.equal(isPrivatePath(path), false);
  }

  const base: PublishedPage = {
    kind: "compound",
    path: "/research/example-peptide",
    subjectId: "example",
    title: "Example peptide research material",
    description: "Identity and characterization.",
    body: {
      sections: [],
      faq: [{ q: "What ships with each lot?", a: "A certificate of analysis." }],
      facts: [
        { label: "Material", value: "Example peptide" },
        { label: "CAS number", value: "0000-00-0" },
      ],
      lots: [],
      products: [{ productId: "example", name: "Example peptide" }],
      familyId: "family",
      notice: RUO_SHORT,
    },
    firstPublishedAt: "2026-09-10T00:00:00.000Z",
    contentUpdatedAt: "2026-09-14T00:00:00.000Z",
    familyHub: null,
  };
  const other: PublishedPage = { ...base, kind: "family", path: "/compounds/example-family", title: "Example family hub" };
  const crumbs = [
    { name: "Home", path: "/" as const },
    { name: "Research library", path: "/research" as const },
  ];
  const site = { siteUrl: SITE, siteName: "Vitality Chems" };
  const a = articleJsonLd(base, crumbs, site);
  const b = articleJsonLd(other, crumbs, site);
  const types = (graph: typeof a) => graph["@graph"].map((node) => node["@type"]);
  assert.deepEqual(types(a), ["BreadcrumbList", "Article", "FAQPage"]);
  assert.deepEqual(types(b), ["BreadcrumbList", "CollectionPage", "FAQPage"]);
  const ids = [...a["@graph"], ...b["@graph"]].map((node) => node["@id"]).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, "JSON-LD @id values must be unique across pages");
  // The organization is declared once in the root document; pages only reference it.
  assert.equal(JSON.stringify(a).includes('"@type":"Organization"'), false);
  assert.ok(JSON.stringify(a).includes(`${SITE}/#organization`));
  const article = a["@graph"][1] as Record<string, unknown>;
  assert.equal(article.mainEntityOfPage, `${SITE}/research/example-peptide`);
  assert.equal((article.about as { identifier?: string }).identifier, "0000-00-0");
});

test("JSON-LD serialization cannot terminate its script element", () => {
  const serialized = serializeJsonLd({
    title: "</script><script>globalThis.compromised=true</script>",
    separators: "\u2028\u2029",
    html: "<>&",
  });
  assert.doesNotMatch(serialized, /<\/script/i);
  assert.doesNotMatch(serialized, /[<>&\u2028\u2029]/);
  assert.match(serialized, /\\u003c\/script\\u003e/);
  assert.deepEqual(JSON.parse(serialized), {
    title: "</script><script>globalThis.compromised=true</script>",
    separators: "\u2028\u2029",
    html: "<>&",
  });
});
