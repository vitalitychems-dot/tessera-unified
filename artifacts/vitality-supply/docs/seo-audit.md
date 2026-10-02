# Vitality Supply SEO audit

## Scope and verification status

This audit covers the imported Vitality Supply React/TanStack route metadata,
the HTML shell, crawl files, and structured data. The deployment information
available during this pass reported **not deployed** and did not provide a
production URL. The live domain, HTTP status codes, rendered head tags,
indexation, Search Console data, Core Web Vitals, and backlink profile are
therefore **unverified**. No claim of live ranking or crawl success is made.

The requested primary-domain base is `https://vitalitychems.com`. A deployment
with a verified public URL can set `VITE_PUBLIC_SITE_URL`; the SEO helper and
the sitemap generator then use that one base consistently. No Replit preview
or guessed deployment domain is used as a canonical. This code change does not
publish the app or alter Namecheap DNS.

## Implemented

- Shared route metadata now emits title, description, canonical, Open Graph,
  Twitter Card, locale, and social image tags.
- Account, admin, login, and checkout routes emit `noindex, nofollow`
  metadata. They are not included in the sitemap.
- The returns policy now has its own title, description, and canonical.
- The root head has a default crawlable title/description and the root JSON-LD
  describes the organization and website using the configured public base.
- Obsolete platform PWA manifest and Apple-touch-icon links were removed from
  the root head; the old `/__grok/` URLs are not part of SEO output.
- `robots.txt` and `sitemap.xml` are generated from one script during the web
  build. The sitemap contains the public informational routes and current
  product IDs parsed from `src/lib/catalog.ts`, excluding liquid,
  encapsulated, and SARM categories from static search promotion. Those routes
  remain accessible to authorized visitors and are not hidden from providers.
- The static HTML shell no longer contains the imported “built on Replit”
  placeholder description and now has the Vitality Supply default social and
  canonical metadata.

## Deliberately not changed

- `src/routes/index.tsx` and `src/routes/product.$id.tsx` were left untouched
  for the other workers owning those files.
- Catalog data and image mappings were not changed.

## Handoff to the index/product owner

Please verify the following while editing the owned routes:

1. Keep the home route's title/description aligned with the shared default and
   retain its canonical at `/`.
2. Make the home JSON-LD use `SITE_URL` (rather than a second hardcoded
   domain) and avoid emitting conflicting duplicate organization data if the
   root graph already covers it.
3. On product pages, add the selected product image to `seoHead`, include the
   canonical product URL in Product JSON-LD, and include a stable offer URL.
   Unknown product IDs should not be indexable and should not receive a
   misleading Product schema.
4. Keep product image `alt` text descriptive and ensure any product-page
   canonical uses the configured public base.

## Post-publish checks

After publishing the verified public domain, manually check:

- `/<robots.txt>` resolves and its Sitemap URL uses the published base.
- `/sitemap.xml` parses as XML, has no duplicate URLs, and every listed route
  returns a successful page response.
- Rendered heads on `/`, `/testing`, one product page, `/legal/returns`,
  `/account`, `/login`, and `/checkout`.
- Canonical and `og:url` values agree, private pages expose `noindex`, and
  no preview host appears in canonical or social URLs.
- Submit the sitemap in the applicable webmaster console and monitor coverage,
  structured-data warnings, and Core Web Vitals. These outcomes cannot be
  verified before deployment.