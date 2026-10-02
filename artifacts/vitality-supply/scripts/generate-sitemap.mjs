#!/usr/bin/env node

/**
 * Generate public/robots.txt for the configured public site URL.
 *
 * sitemap.xml and llms.txt are no longer static files: they are served by the
 * `/sitemap.xml` and `/llms.txt` routes so research-library pages published by
 * the content engine appear as soon as they go live (see src/lib/content/crawl.ts).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DEFAULT_PUBLIC_SITE_URL = "https://vitalitychems.com";
const publicSiteUrl = normalizeSiteUrl(process.env.VITE_PUBLIC_SITE_URL);

function normalizeSiteUrl(value) {
  const candidate = value?.trim();
  if (!candidate) return DEFAULT_PUBLIC_SITE_URL;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") return DEFAULT_PUBLIC_SITE_URL;
    return url.origin;
  } catch {
    return DEFAULT_PUBLIC_SITE_URL;
  }
}

function robotsTxt() {
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /account
Disallow: /login
Disallow: /checkout
Disallow: /order
Disallow: /unsubscribe
Disallow: /api/

Sitemap: ${publicSiteUrl}/sitemap.xml

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /
`;
}

mkdirSync(join(ROOT, "public"), { recursive: true });
writeFileSync(join(ROOT, "public/robots.txt"), robotsTxt());
console.log(`Generated robots.txt for ${publicSiteUrl} (sitemap.xml and llms.txt are served dynamically)`);
