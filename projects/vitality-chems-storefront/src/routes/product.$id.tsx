import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileCheck2, Minus, Plus, ShieldCheck } from "lucide-react";
import { ProductCard, ProductPhoto } from "@/components/product-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CreditEarnLine, SaveBadge } from "@/components/savings-nudge";
import { batchId, displayPurity, findProduct, productImage, relatedProducts, RECON_ID } from "@/lib/catalog";
import { PRODUCT_GRID } from "@/lib/families";
import { scienceFor } from "@/lib/product-science";
import { BUSINESS, IL_NOTICE } from "@/lib/business";
import { RUO_SHORT } from "@/lib/legal";
import { useCart, useCartTotals } from "@/lib/cart-store";
import { afterBulk, BULK_TIERS, CREDIT_RATE, money } from "@/lib/pricing";
import { cn, formatPrice } from "@/lib/utils";
import { trackClient } from "@/components/analytics-tracker";
import { useLabCredit } from "@/lib/use-lab-credit";
import { seoHead } from "@/lib/seo";
import { coaFor } from "@/lib/coa";
import { slug } from "@/lib/utils";

export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
  head: ({ params }) => {
    const product = findProduct(params.id);
    const name = product?.name ?? "Research compound";
    const cas = product?.casNumber ? ` CAS ${product.casNumber}.` : "";
    return seoHead({
      title: `${name} research material`,
      description: `${name} lyophilized research material.${cas} HPLC-documented. Research use only — not for human consumption.`,
      path: `/product/${params.id}`,
    });
  },
});

function ProductPage() {
  const { id } = Route.useParams();
  const product = findProduct(id);
  const addItem = useCart((s) => s.addItem);
  const { vialQty } = useCartTotals();
  const { signedIn } = useLabCredit();
  const [doseIndex, setDoseIndex] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setDoseIndex(0);
    setQty(1);
  }, [id]);

  const related = useMemo(() => (product ? relatedProducts(product, 4) : []), [product]);

  if (!product) {
    return (
      <div className="min-h-dvh bg-bg text-fg">
        <SiteHeader active="shop" />
        <main className="mx-auto max-w-lg px-6 pt-8 text-center">
          <h1 className="font-display text-3xl font-semibold uppercase">Compound not found</h1>
          <Link to="/" className="btn-primary mt-8 inline-flex">
            Back to catalog
          </Link>
        </main>
      </div>
    );
  }

  const variant = product.variants[doseIndex] ?? product.variants[0];
  const image = productImage(product.name, variant.dose, product.formKind);
  const batch = batchId(product);
  const science = scienceFor(product.id.split("__")[1] ?? product.id);
  const coa = coaFor(slug(product.name), variant.dose);
  const canBulk = product.id !== RECON_ID && product.formKind === "vial";
  const projectedQty = vialQty + qty;
  const line = variant.price * qty;
  const discounted = canBulk ? afterBulk(line, projectedQty) : line;
  const save = money(line - discounted);
  const creditEarn = money(discounted * CREDIT_RATE);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: `${product.name} research material`,
            sku: product.id,
            productID: product.casNumber,
            description: science.identity,
            brand: { "@type": "Brand", name: BUSINESS.name },
            offers: {
              "@type": "Offer",
              price: variant.price,
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              seller: { "@type": "Organization", name: BUSINESS.name },
            },
            additionalProperty: [
              { "@type": "PropertyValue", name: "Intended use", value: "Laboratory / in-vitro research only" },
              { "@type": "PropertyValue", name: "CAS", value: product.casNumber ?? "" },
            ],
          }),
        }}
      />
      <SiteHeader active="shop" />
      <main className="mx-auto grid max-w-7xl gap-10 px-6 pt-8 pb-20 lg:grid-cols-[1fr_1fr] lg:pt-8">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <ProductPhoto product={product} variant={variant} tall />
        </div>

        <div>
          <p className="font-mono text-xs tracking-widest text-primary uppercase">
            {product.form} · In stock
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
              <a href={coa.image} target="_blank" rel="noreferrer" className="mt-3 block">
                <img
                  src={coa.image}
                  alt={`${product.name} ${coa.dose} certificate of analysis`}
                  className="max-h-80 w-full rounded-sm object-contain object-top bg-white"
                />
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
                    onClick={() => setDoseIndex(i)}
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

          <button
            type="button"
            className="btn-primary mt-6 w-full sm:w-auto sm:min-w-56"
            onClick={() => {
              addItem({
                productId: product.id,
                name: product.name,
                doseLabel: variant.dose,
                unitPrice: variant.price,
                image,
                quantity: qty,
              });
              trackClient("add_to_cart", { productId: product.id, productName: product.name });
            }}
          >
            Add {qty} to cart
          </button>
          <div className="mt-3">
            <CreditEarnLine amount={creditEarn} signedIn={signedIn} />
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
        </div>
      </main>

      {related.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-6 pb-20">
          <h2 className="font-display mb-6 text-2xl font-semibold tracking-wide uppercase">
            Researchers also order
          </h2>
          <div className={PRODUCT_GRID}>
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
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
