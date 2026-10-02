import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(root, path), "utf8");

test("organization identity is declared once and product offers are variant-aware", () => {
  const rootRoute = source("src/routes/__root.tsx");
  const home = source("src/routes/index.tsx");
  const product = source("src/routes/product.$id.tsx");

  assert.equal((rootRoute.match(/"@type": "Organization"/g) ?? []).length, 1);
  assert.match(home, /type="application\/ld\+json"/);
  assert.match(home, /"@type":\s*"FAQPage"/);
  assert.doesNotMatch(home, /"@type":\s*"Organization"/);
  assert.match(product, /product\.variants\.map/);
  assert.doesNotMatch(product, /productID:\s*product\.casNumber/);
  assert.match(product, /product\.inStock/);
});

test("private and transactional routes stay out of the crawl surface", () => {
  for (const route of ["account", "admin", "checkout", "login", "order.$id", "unsubscribe"]) {
    assert.match(source(`src/routes/${route}.tsx`), /noindexSeoHead/);
  }

  const robots = source("public/robots.txt");
  for (const path of ["/admin", "/account", "/login", "/checkout", "/order", "/unsubscribe"]) {
    assert.match(robots, new RegExp(`Disallow: ${path.replace("/", "\\/")}`));
  }
  // sitemap.xml is served dynamically; its static route list must not include private paths.
  const crawl = source("src/lib/content/crawl.ts");
  const staticRoutes = crawl.match(/export const PUBLIC_ROUTES[^;]*;/)?.[0] ?? "";
  assert.ok(staticRoutes.length > 0, "PUBLIC_ROUTES must be declared in crawl.ts");
  assert.doesNotMatch(staticRoutes, /"\/(admin|account|login|checkout|order|unsubscribe)/);
  for (const path of ["/admin", "/account", "/login", "/checkout", "/order", "/unsubscribe", "/api"]) {
    assert.match(crawl, new RegExp(`"${path.replace("/", "\\/")}\\/?"`), `${path} must be listed as a private prefix`);
  }
  assert.match(source("scripts/generate-sitemap.mjs"), /served dynamically|served by the/);
  assert.equal(existsSync(join(root, "public/sitemap.xml")), false, "public/sitemap.xml must not be checked in");
  assert.equal(existsSync(join(root, "public/llms.txt")), false, "public/llms.txt must not be checked in");
});

test("sitemap lastmod is opt-in and validated rather than fabricated", () => {
  const generator = source("src/lib/content/crawl.ts");
  assert.match(generator, /SITEMAP_LASTMOD/);
  assert.match(generator, /lastmod/);
  assert.match(generator, /when the[\s*]+date is not explicitly/);
});

test("the initial storefront exposes a complete crawlable product index", () => {
  const home = source("src/routes/index.tsx");

  assert.match(home, /const CRAWLABLE_PRODUCTS = filterProducts/);
  assert.match(home, /aria-label="All available research compounds"/);
  assert.match(home, /CRAWLABLE_PRODUCTS\.map/);
  assert.match(home, /to="\/product\/\$id"/);
  assert.match(home, /\{product\.name\} research material/);
});