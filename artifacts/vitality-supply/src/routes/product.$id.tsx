import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Clock3, CreditCard, FileCheck2, Minus, Plus, ShieldCheck, Truck } from "lucide-react";
import { GENERIC_VIAL, ProductCard, ProductPhoto } from "@/components/product-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CreditEarnLine, SaveBadge } from "@/components/savings-nudge";
import {
  batchId,
  displayPurity,
  findProduct,
  hasExactPhoto,
  isAvailableProductId,
  productImage,
  relatedProducts,
  RECON_ID,
} from "@/lib/catalog";
import { FAMILY_BY_SLUG, FAMILIES, PRODUCT_GRID } from "@/lib/families";
import { scienceFor } from "@/lib/product-science";
import { BUSINESS, IL_NOTICE } from "@/lib/business";
import { RUO_SHORT } from "@/lib/legal";
import { useCart, useCartTotals } from "@/lib/cart-store";
import { afterBulk, BULK_TIERS, CREDIT_RATE, money } from "@/lib/pricing";
import { cn, formatPrice } from "@/lib/utils";
import { trackClient } from "@/components/analytics-tracker";
import { useLabCredit } from "@/lib/use-lab-credit";
import { SITE_URL, seoHead } from "@/lib/seo";
import { coaFor, coaWebpSrcSet } from "@/lib/coa";
import { slug } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { ProductLightbox } from "@/components/product-lightbox";
import { loadProductReferenceLinks, type ProductReferenceLinks } from "@/lib/content/public-api";
import { serializeJsonLd } from "@/lib/content/structured-data";

const NO_REFERENCE_LINKS: ProductReferenceLinks = { reference: null, family: null };

/** Published research-library links for this product; never blocks the page for long or fails it. */
function referenceLinksFor(productId: string): Promise<ProductReferenceLinks> {
  const timeout = new Promise<ProductReferenceLinks>((resolve) => setTimeout(() => resolve(NO_REFERENCE_LINKS), 400));
  return Promise.race([
    loadProductReferenceLinks({ data: { productId } }).catch(() => NO_REFERENCE_LINKS),
    timeout,
  ]);
}

export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
  beforeLoad: ({ params }) => {
    if (!isAvailableProductId(params.id)) {
      throw notFound({
        throw: true,
        routeId: "/product/$id",
        headers: { "X-Robots-Tag": "noindex, nofollow" },
      });
    }
  },
  loader: ({ params }) => referenceLinksFor(params.id),
  staleTime: 60_000,
  head: ({ params }) => {
    const product = findProduct(params.id);
    const name = product?.name ?? "Research compound";
    const cas = product?.casNumber ? ` CAS ${product.casNumber}.` : "";
    const firstVariant = product?.variants[0];
    const firstImage =
      product &&
      firstVariant &&
      hasExactPhoto(product.name, firstVariant.dose, product.formKind)
        ? productImage(product.name, firstVariant.dose, product.formKind)
        : undefined;
    return seoHead({
      title: `${name} research material`,
      description: `${name} lyophilized research material.${cas} HPLC-documented. Research use only — not for human consumption.`,
      path: `/product/${params.id}`,
      image: firstImage ? new URL(firstImage, SITE_URL).toString() : undefined,
      robots: product?.inStock ? undefined : "noindex, nofollow",
    });
  },
  notFoundComponent: ProductNotFound,
});

function ProductPage() {
  const { id } = Route.useParams();
  const referenceLinks = Route.useLoaderData();
  const product = findProduct(id);
  const addItem = useCart((s) => s.addItem);
  const cartOpen = useCart((s) => s.isOpen);
  const { vialQty } = useCartTotals();
  const { signedIn } = useLabCredit();
  const [doseIndex, setDoseIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [imageOpen, setImageOpen] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setDoseIndex(0);
    setQty(1);
  }, [id]);

  const related = useMemo(() => (product ? relatedProducts(product, 4) : []), [product]);

  useEffect(() => {
    if (!product) return;
    trackEvent("product_viewed", {
      product_id: product.id,
      category: product.category,
    });
  }, [product]);

  if (!product || !product.inStock) {
    // beforeLoad handles normal navigation and sets the HTTP 404 status on
    // SSR; retain the same invariant if this component is rendered directly.
    throw notFound({
      throw: true,
      routeId: "/product/$id",
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const variant = product.variants[doseIndex] ?? product.variants[0];
  const image = hasExactPhoto(product.name, variant.dose, product.formKind)
    ? productImage(product.name, variant.dose, product.formKind)
    : GENERIC_VIAL;
  const productUrl = `${SITE_URL}/product/${product.id}`;
  const schemaImage = hasExactPhoto(product.name, variant.dose, product.formKind)
    ? new URL(image, SITE_URL).toString()
    : undefined;
  const batch = batchId(product);
  const science = scienceFor(product.id.split("__")[1] ?? product.id);
  const coa = coaFor(slug(product.name), variant.dose);
  const familyId = FAMILY_BY_SLUG[slug(product.name)];
  const family = FAMILIES.find((item) => item.id === familyId);
  const canBulk = product.id !== RECON_ID && product.formKind === "vial";
  const projectedQty = vialQty + qty;
  const line = variant.price * qty;
  const discounted = canBulk ? afterBulk(line, projectedQty) : line;
  const save = money(line - discounted);
  const creditEarn = money(discounted * CREDIT_RATE);
  const productId = product.casNumber && product.casNumber !== "—" ? product.casNumber : undefined;
  const availability = product.inStock
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
  const addSelectedToCart = () => {
    const item = {
      productId: product.id,
      name: product.name,
      doseLabel: variant.dose,
      unitPrice: variant.price,
      image,
      quantity: qty,
    };
    addItem(item);
    // Keep the shopper on the product page so they can continue browsing related
    // materials; the header cart count provides persistent cart feedback.
    setAdded(true);
    trackClient("add_to_cart", { productId: product.id, productName: product.name });
    trackEvent("cart_item_added", {
      product_id: product.id,
      category: product.category,
      quantity: qty,
    });
  };

  return (
    <div className="min-h-dvh bg-bg pb-28 text-fg lg:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
           __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "Product",
            name: `${product.name} research material`,
            sku: product.id,
            ...(productId ? { productID: productId } : {}),
            url: productUrl,
            ...(schemaImage ? { image: schemaImage } : {}),
            description: science.identity,
            brand: { "@type": "Brand", name: BUSINESS.name },
            offers: product.variants.map((offerVariant) => ({
              "@type": "Offer",
              url: productUrl,
              name: `${product.name} ${offerVariant.dose}`,
              sku: `${product.id}-${slug(offerVariant.dose)}`,
              price: offerVariant.price,
              priceCurrency: "USD",
              availability,
              seller: { "@id": `${SITE_URL}/#organization` },
            })),
            additionalProperty: [
              { "@type": "PropertyValue", name: "Intended use", value: "Laboratory / in-vitro research only" },
              ...(productId
                ? [{ "@type": "PropertyValue", name: "CAS", value: productId }]
                : []),
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
           __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Research library", item: `${SITE_URL}/research` },
              ...(referenceLinks.family && family
                ? [{
                    "@type": "ListItem",
                    position: 3,
                    name: family.label,
                    item: `${SITE_URL}${referenceLinks.family.path}`,
                  }]
                : []),
              {
                "@type": "ListItem",
                position: referenceLinks.family && family ? 4 : 3,
                name: `${product.name} research material`,
                item: productUrl,
              },
            ],
           }),
        }}
      />
      <SiteHeader active="shop" />
      <main className="mx-auto grid max-w-7xl gap-10 px-6 pt-8 pb-20 lg:grid-cols-[1fr_1fr] lg:pt-8">
        <nav aria-label="Breadcrumb" className="col-span-full text-xs text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/" className="hover:text-primary hover:underline">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/research" className="hover:text-primary hover:underline">
                Research library
              </Link>
            </li>
            {referenceLinks.family && family ? (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    to="/compounds/$family"
                    params={{ family: referenceLinks.family.path.split("/").pop() ?? "" }}
                    className="hover:text-primary hover:underline"
                  >
                    {family.label}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-fg">
              {product.name} research material
            </li>
          </ol>
        </nav>
        <button
          type="button"
          className="group relative overflow-hidden rounded-lg border border-border bg-surface text-left"
          aria-label={`Enlarge ${product.name} ${variant.dose} image`}
          onClick={() => {
            setImageOpen(true);
            trackEvent("product_image_opened", {
              product_id: product.id,
              dose: variant.dose,
            });
          }}
        >
          <ProductPhoto product={product} variant={variant} tall priority />
          <span className="absolute right-3 bottom-3 rounded-sm border border-border bg-bg-elevated/95 px-3 py-2 font-mono text-[10px] tracking-widest text-fg uppercase">
            Click to enlarge
          </span>
        </button>
        <ProductLightbox
          open={imageOpen}
          onClose={() => setImageOpen(false)}
          src={image}
          alt={`${product.name} ${variant.dose} research material`}
          label={`${product.name} · ${variant.dose}`}
        />

        <div>
          <p className="font-mono text-xs tracking-widest text-primary uppercase">
            {product.form} · {product.inStock ? "In stock" : "Unavailable"}
          </p>
          <h1 className="font-display mt-2 text-4xl font-semibold tracking-wide uppercase">
            {product.name}
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">{science.identity}</p>

          <details className="mt-4 rounded-md border border-border bg-overlay p-4">
            <summary className="cursor-pointer font-display text-sm font-semibold tracking-widest uppercase">
              Laboratory description & disclaimer
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{science.researchedFor}</p>
            <p className="mt-3 text-xs leading-relaxed text-faint">{science.disclaimer}</p>
          </details>

          <dl className="mt-6 space-y-2 border-y border-border py-4">
            <Row label="Purity (HPLC)" value={displayPurity(product.name, variant.dose)} />
            <Row label="Batch" value={batch} />
            {product.casNumber && <Row label="CAS" value={product.casNumber} />}
            {product.molecularWeight && (
              <Row label="Molecular weight" value={product.molecularWeight} />
            )}
            {product.molecularFormula && (
              <Row label="Formula" value={product.molecularFormula} />
            )}
            <Row label="Catalog quantity" value={variant.dose} />
          </dl>

          {coa && (
            <section className="mt-6 rounded-md border border-border bg-overlay p-4">
              <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                Third-party COA · {coa.dose}
              </p>
              <p className="mt-2 text-sm text-muted">
                {coa.lab} · lot {coa.lot} · {coa.purity} · {coa.quantity} · {coa.method} · reported{" "}
                {coa.reported}
              </p>
              <a
                href={coa.image}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block"
                  onClick={() => {
                    trackClient("coa_opened", { productId: product.id, productName: product.name });
                    trackEvent("coa_opened", { product_id: product.id, category: product.category, dose: coa.dose });
                  }}
              >
                <picture>
                  <source
                    type="image/webp"
                    srcSet={coaWebpSrcSet(coa.image)}
                    sizes="(min-width: 1280px) 560px, (min-width: 1024px) calc(50vw - 3rem), calc(100vw - 5rem)"
                  />
                  <img
                    src={coa.image}
                    alt={`${product.name} ${coa.dose} certificate of analysis`}
                    loading="lazy"
                    decoding="async"
                    width={coa.width}
                    height={coa.height}
                    sizes="(min-width: 1280px) 560px, (min-width: 1024px) calc(50vw - 3rem), calc(100vw - 5rem)"
                    className="max-h-80 w-full rounded-sm bg-white object-contain object-top"
                  />
                </picture>
              </a>
              <p className="mt-2 text-[11px] leading-relaxed text-faint">
                Results apply only to the sample tested. Research use only — not for human or animal
                use.
              </p>
            </section>
          )}

          {product.variants.length > 1 && (
            <div className="mt-6">
              <p className="mb-2 font-mono text-[10px] tracking-widest text-muted uppercase">
                Catalog quantity
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v, i) => (
                  <button
                    key={v.dose}
                    type="button"
                     aria-pressed={i === doseIndex}
                     aria-label={`Select ${product.name} ${v.dose}`}
                     onClick={() => {
                       setDoseIndex(i);
                       trackEvent("product_dose_selected", {
                         product_id: product.id,
                         dose: v.dose,
                       });
                     }}
                    className={cn(
                      "min-h-11 rounded-sm border px-4 font-mono text-xs font-bold tracking-widest uppercase",
                      i === doseIndex
                        ? "border-primary bg-primary text-primary-fg"
                        : "border-border bg-overlay text-muted hover:text-fg",
                    )}
                  >
                    {v.dose} · {formatPrice(v.price)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {canBulk && (
            <div className="mt-6">
              <p className="mb-2 font-mono text-[10px] tracking-widest text-muted uppercase">
                Lab-rate trays
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <QtyChip n={1} selected={qty === 1} onClick={() => setQty(1)} hint="Single vial" />
                {BULK_TIERS.map((t) => (
                  <QtyChip
                    key={t.qty}
                    n={t.qty}
                    selected={qty === t.qty}
                    onClick={() => setQty(t.qty)}
                    hint={`${t.percent}% off`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-end gap-4">
            <div className="inline-flex overflow-hidden rounded-sm border border-border">
              <button
                type="button"
                className="min-h-11 px-3 hover:bg-overlay"
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-10 px-2 py-3 text-center font-mono text-sm tabular-nums">
                {qty}
              </span>
              <button
                type="button"
                className="min-h-11 px-3 hover:bg-overlay"
                onClick={() => setQty((n) => n + 1)}
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div>
              {save > 0 && (
                <p className="font-mono text-xs tracking-widest text-muted line-through">
                  {formatPrice(line)}
                </p>
              )}
              <p className="font-display text-3xl font-semibold tabular-nums">
                {formatPrice(discounted)}
              </p>
              <SaveBadge amount={save} />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              className="btn-primary w-full sm:w-auto sm:min-w-56"
              onClick={addSelectedToCart}
            >
              {added ? "Added · keep shopping" : `Add ${qty} to cart`}
            </button>
            {creditEarn > 0 && (
              <div
                data-testid="product-credit-nudge"
                className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 sm:max-w-sm"
              >
                <CreditEarnLine amount={creditEarn} signedIn={signedIn} />
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2 rounded-md border border-border bg-overlay p-4 text-xs leading-relaxed text-muted">
            <p className="flex gap-2">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Tracked shipping options and the exact cost are shown at checkout before payment.
              </span>
            </p>
            <p className="flex gap-2">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Before 2:00 PM CT on a business day may dispatch same day; typical domestic transit
                is 2–5 business days. Estimates, not guarantees.
              </span>
            </p>
            <p className="flex gap-2">
              <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>COA and HPLC documentation for the selected lot.</span>
            </p>
            <p className="flex gap-2">
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Secure checkout · Card, Zelle, Bitcoin or Ethereum. Unopened vials reported damaged
                or incorrect within 7 days are replaced or refunded.{" "}
                <Link to="/legal/returns" className="text-primary hover:underline">
                  Returns policy
                </Link>
                .
              </span>
            </p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex gap-3 rounded-md border border-border bg-overlay p-4">
              <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Certificate of analysis</p>
                <p className="mt-1 text-xs text-muted">
                  Lot {batch} · HPLC {product.purity} · LC-MS identity confirmed. Ships with the
                  order packet.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-md border border-border bg-overlay p-4">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Research use only</p>
                <p className="mt-1 text-xs text-muted">{RUO_SHORT}</p>
              </div>
            </div>
          </div>
          <p className="mt-4 max-w-xl text-[11px] leading-relaxed text-faint">{IL_NOTICE}</p>
          <p className="mt-4 text-xs text-muted">
            <Link to="/testing" className="text-primary hover:underline">
              <span
                onClick={() => {
                  trackClient("policy_link_clicked", { productId: product.id, productName: product.name });
                  trackEvent("policy_link_clicked", { product_id: product.id, category: product.category, action: "testing" });
                }}
              >
                Review testing and COA documentation
              </span>
            </Link>{" "}
            or{" "}
            <Link to="/legal/research-use" className="text-primary hover:underline">
              <span
                onClick={() => {
                  trackClient("policy_link_clicked", { productId: product.id, productName: product.name });
                  trackEvent("policy_link_clicked", { product_id: product.id, category: product.category, action: "research_use" });
                }}
              >
                read the research-use requirements
              </span>
            </Link>
            .
          </p>
          {referenceLinks.reference || referenceLinks.family ? (
            <p className="mt-2 text-xs text-muted">
              Reference reading:{" "}
              {referenceLinks.reference ? (
                <Link
                  to="/research/$slug"
                  params={{ slug: referenceLinks.reference.path.split("/").pop() ?? "" }}
                  className="text-primary hover:underline"
                >
                  {referenceLinks.reference.title}
                </Link>
              ) : null}
              {referenceLinks.reference && referenceLinks.family ? " · " : null}
              {referenceLinks.family ? (
                <Link
                  to="/compounds/$family"
                  params={{ family: referenceLinks.family.path.split("/").pop() ?? "" }}
                  className="text-primary hover:underline"
                >
                  {referenceLinks.family.title}
                </Link>
              ) : null}
            </p>
          ) : null}
        </div>
      </main>

      {related.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-6 pb-20">
          <h2 className="font-display mb-6 text-2xl font-semibold tracking-wide uppercase">
            Related research materials
          </h2>
          <div className={PRODUCT_GRID}>
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
      <SiteFooter />
      {!cartOpen && !imageOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-bg-elevated/95 px-4 pt-3 pr-24 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lift backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] tracking-widest text-muted uppercase">
                {product.name} · {variant.dose}
              </p>
              <p className="font-display text-lg font-semibold tabular-nums">
                {formatPrice(discounted)}
              </p>
            </div>
            <button
              type="button"
              className="btn-primary min-h-11 shrink-0 px-4"
              onClick={addSelectedToCart}
              aria-label={`Add ${qty} ${product.name} ${variant.dose} to cart`}
            >
              {added ? "Added · keep shopping" : `Add ${qty} to cart`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductNotFound() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader active="shop" />
      <main className="mx-auto max-w-lg px-6 pt-8 text-center">
        <h1 className="font-display text-3xl font-semibold uppercase">Compound not found</h1>
        <p className="mt-3 text-sm text-muted">
          That catalog material is not available in the current research catalog.
        </p>
        <Link to="/" className="btn-primary mt-8 inline-flex">
          Back to catalog
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

function QtyChip({
  n,
  selected,
  onClick,
  hint,
}: {
  n: number;
  selected: boolean;
  onClick: () => void;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`Select ${n} vial${n === 1 ? "" : "s"} · ${hint}`}
      className={cn(
        "min-h-14 rounded-sm border px-3 py-2 text-left",
        selected ? "border-primary bg-primary text-primary-fg" : "border-border bg-overlay hover:text-fg",
      )}
    >
      <p className="font-display text-lg font-semibold leading-none">{n}</p>
      <p className={cn("mt-1 text-[10px] tracking-wide uppercase", selected ? "text-primary-fg" : "text-muted")}>
        {hint}
      </p>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono text-fg">{value}</dd>
    </div>
  );
}
