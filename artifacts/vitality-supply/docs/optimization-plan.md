# Storefront optimization plan and execution record

Date: 2026-09-15

This plan separates changes the application can enforce from third-party
outcomes it cannot guarantee. Google rankings, organic traffic, and proprietary
DA/DR scores depend on indexing, competitors, earned links, and time.

## 1. Security

**Optimal:** Close the seven confirmed findings with verified ownership,
transactional referral/promotion checks, durable public-endpoint limits,
idempotent checkout, generic newsletter responses, and strict same-origin
redirects.

**Alternative:** Put the affected features behind login until equivalent
controls exist. This reduces abuse but adds unnecessary checkout friction.

**Executed:** Implemented with database-backed controls and regression tests.

## 2. Technical and on-page SEO

**Optimal:** Keep the apex `https://vitalitychems.com` canonical, SSR-render all
public catalog content, expose only indexable pages in internal links and the
sitemap, use one consistent Organization entity, and emit truthful
variant-level Product offers.

**Alternative:** Publish a smaller static catalog and send buyers into the app.
This is simpler but weakens product-page search intent and conversion.

**Executed:** Canonical, metadata, crawl controls, sitemap generation,
structured data, and internal-link changes are implemented and tested.

## 3. Authority, DA, and DR

**Optimal:** Earn relevant editorial links through original, non-medical
laboratory resources: analytical-method explainers, COA interpretation
standards, stability/handling documentation supported by sources, supplier
quality criteria, and transparent correction policies. Track referring domains
and indexed pages in Google Search Console and one chosen third-party SEO tool.

**Alternative:** Digital PR around original aggregate laboratory-quality data.
It can earn stronger links faster, but only after enough verified first-party
data exists.

**Executed:** The site now has stronger crawlability, entity consistency, and
research-policy/internal-link foundations. No DA/DR number is reported because
those are proprietary third-party metrics and no authorized Ahrefs/Moz account
or verified result was available. Buying or fabricating links is excluded.

## 4. Illinois and U.S. research-product language

**Optimal:** Limit public copy to chemistry, identity, purity, analytical
testing, storage/handling, and qualified laboratory procurement. Remove human
outcome, dosing, treatment, weight-loss, bodybuilding, anti-aging, compounding,
or approval implications. State clearly that an RUO label does not by itself
make a sale, possession, shipment, or use lawful.

**Alternative:** Restrict sales to reviewed institutional business accounts
until specialized counsel approves the catalog and operating model.

**Executed:** Public, checkout, subscription, wholesale, referral, email, and
legal copy were hardened. See `compliance-audit.md`. This is not legal advice;
Illinois and FDA counsel must still review the actual products, fulfillment,
marketing, and payment-provider terms before unrestricted launch.

## 5. Mobile speed and interaction

**Optimal:** Keep the age decision for one tab visit, avoid image-node remounts,
preload only likely desktop-hover variants, use responsive lazy images,
contain off-screen cards, provide 44px tap targets, and avoid automatic modals
that intercept product controls.

**Alternative:** Move dose selection entirely to product detail pages. This
reduces catalog work further but adds a click to comparison shopping.

**Executed:** The age gate, dose controls, images, deferred globals, cart
loading, and popup behavior were optimized. A mobile browser test confirmed
same-tab age acceptance and prompt dose changes.

## 6. Conversion and design

**Optimal:** Prioritize product identity, exact strength, price, testing
evidence, and a clear add action; keep research restrictions visible without
obscuring controls; use inline signup rather than interruption.

**Alternative:** Use a guided quote/request flow for reviewed laboratory
accounts. It may improve qualification but usually lowers self-serve volume.

**Executed:** Mobile hierarchy, tap targets, descriptive actions, research-only
notices, and popup contention were improved without adding medical claims or
fabricated testimonials.

## 7. Pricing and profitability

**Optimal:** Use exact KIT10/10 unit cost, keep missing costs unknown, preserve
current retail prices that clear the documented floor, and cap discount/credit
stacks against known product cost and known credit obligations.

**Alternative:** Reject unsafe discount combinations instead of capping them.
This is simpler to explain operationally but creates more checkout failures.

**Executed:** Server quotes enforce contribution guardrails; P&L and investor
views disclose known-cost coverage and exclude unknown-cost rows from
misleading averages. See `profitability-audit.md`.

## 8. Launch and measurement

**Optimal:** Publish the development schema and build through Replit, use only
`vitalitychems.com`, connect live Stripe before enabling cards, verify Resend
DNS, enable Analytics/Search Console, submit the sitemap, and monitor indexing,
Core Web Vitals, conversion, contribution, chargebacks, and organic landing
pages weekly.

**Alternative:** Soft-launch with manual payment methods and a limited catalog
while live payments, counsel review, and missing supplier costs are completed.

**Executed in code:** The production build, schema, analytics events, SEO
assets, security controls, and payment-mode guard are ready. Domain removal,
live Stripe ownership, Resend DNS, Search Console verification, and final
Publish confirmation require the owner’s authenticated provider controls.