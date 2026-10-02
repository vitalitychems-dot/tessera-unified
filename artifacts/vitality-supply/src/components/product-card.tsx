import { memo, useCallback, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { Product, Variant } from "@/lib/catalog";
import { hasExactPhoto, productImage, displayPurity, RECON_ID } from "@/lib/catalog";
import { GENERIC_VIAL, responsiveVialPhoto, vialPhotoSrcSet } from "@/lib/vial-photos";
import { useCart } from "@/lib/cart-store";
import { afterBulk, BULK_TIERS, money } from "@/lib/pricing";
import { cn, formatPrice } from "@/lib/utils";
import { trackClient } from "@/components/analytics-tracker";
import { ProductInfo } from "@/components/product-info";
import { trackEvent } from "@/lib/analytics";

export { GENERIC_VIAL };

function preloadVariantPhoto(product: Product, variant: Variant) {
  if (typeof Image === "undefined") return;
  if (!hasExactPhoto(product.name, variant.dose, product.formKind)) return;
  const src = productImage(product.name, variant.dose, product.formKind);
  const responsiveSrc = responsiveVialPhoto(src);
  if (!responsiveSrc) return;
  if (preloadedPhotos.has(responsiveSrc)) return;
  preloadedPhotos.add(responsiveSrc);
  const image = new Image();
  image.decoding = "async";
  image.src = responsiveSrc;
}

const preloadedPhotos = new Set<string>();

export function ProductPhoto({
  product,
  variant,
  tall = false,
  priority = false,
  children,
}: {
  product: Product;
  variant: Variant;
  tall?: boolean;
  priority?: boolean;
  children?: ReactNode;
}) {
  const src = productImage(product.name, variant.dose, product.formKind);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const representative =
    !hasExactPhoto(product.name, variant.dose, product.formKind) || failedSrc === src;
  const shownSrc = representative ? GENERIC_VIAL : src;

  return (
    <div className={cn("vial-stage relative bg-bg", tall ? "aspect-[4/5]" : "catalog-photo")}>
      <img
        src={shownSrc}
        srcSet={tall ? undefined : vialPhotoSrcSet(shownSrc)}
        sizes={
          tall
            ? undefined
            : "(min-width: 768px) and (max-width: 1180px) and (pointer: coarse) calc(25vw - 1rem), (min-width: 1280px) 624px, calc(50vw - 1.5rem)"
        }
        alt={
          representative
            ? `Representative vial for ${product.name} ${variant.dose}`
            : `${product.name} ${variant.dose} research material`
        }
        width={800}
        height={1000}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        draggable={false}
        decoding="async"
        onError={representative ? undefined : () => setFailedSrc(src)}
        className="pointer-events-none h-full w-full object-contain object-center select-none"
      />
      {representative ? (
        <div className="absolute inset-x-2 bottom-2 rounded-sm border border-primary/40 bg-bg-elevated/95 px-2 py-1.5 text-center">
          <p className="font-display text-sm font-semibold tracking-wide text-fg uppercase">
            {product.name} · {variant.dose}
          </p>
          <p className="font-mono text-[8px] tracking-widest text-primary uppercase">
            Representative vial
          </p>
        </div>
      ) : null}
      {children}
    </div>
  );
}

function ProductCardComponent({ product, priority = false }: { product: Product; priority?: boolean }) {
  const [doseIndex, setDoseIndex] = useState(0);
  const [added, setAdded] = useState(false);
  const variant = product.variants[doseIndex] ?? product.variants[0];
  const addItem = useCart((s) => s.addItem);
  const image = hasExactPhoto(product.name, variant.dose, product.formKind)
    ? productImage(product.name, variant.dose, product.formKind)
    : GENERIC_VIAL;
  const canBulk = product.id !== RECON_ID && product.formKind === "vial";
  const pack = BULK_TIERS[0];
  const packPrice = afterBulk(variant.price * pack.qty, pack.qty);
  const packSave = money(variant.price * pack.qty - packPrice);

  const add = useCallback((quantity: number) => {
    const item = {
      productId: product.id,
      name: product.name,
      doseLabel: variant.dose,
      unitPrice: variant.price,
      image,
      quantity,
    };
    addItem(item);
    // Keep the shopper on the catalog so they can continue comparing materials.
    setAdded(true);
    trackClient("add_to_cart", { productId: product.id, productName: product.name });
    trackEvent("cart_item_added", {
      product_id: product.id,
      category: product.category,
      quantity,
    });
  }, [addItem, image, product.id, product.name, variant.dose, variant.price]);

  return (
    <article className="catalog-card group flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface">
      <Link to="/product/$id" params={{ id: product.id }} className="block">
        <ProductPhoto product={product} variant={variant} priority={priority} />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-2.5 sm:p-3">
        <div className="flex min-w-0 items-start justify-between gap-1">
          <Link to="/product/$id" params={{ id: product.id }} className="min-w-0">
            <p className="mb-0.5 font-mono text-[8px] tracking-widest text-primary uppercase">
              Research material
            </p>
            <h3 className="line-clamp-2 min-h-10 font-display text-sm font-semibold tracking-wide uppercase group-hover:text-primary sm:text-base">
              {product.name}
            </h3>
          </Link>
          <ProductInfo product={product} />
        </div>
        <p className="font-mono text-[10px] tracking-widest text-faint uppercase">
          {variant.dose} · {displayPurity(product.name, variant.dose)} HPLC
        </p>
        {product.variants.length > 1 && (
          <div
            className="flex flex-wrap overflow-hidden rounded-sm border border-border"
            role="group"
            aria-label="Select catalog quantity"
          >
            {product.variants.map((v, i) => (
              <button
                key={v.dose}
                type="button"
                aria-pressed={i === doseIndex}
                aria-label={`Select ${product.name} ${v.dose}`}
                onClick={() => {
                  setDoseIndex(i);
                  setAdded(false);
                }}
                onPointerEnter={() => preloadVariantPhoto(product, v)}
                onPointerDown={() => preloadVariantPhoto(product, v)}
                className={cn(
                  "dose-option min-h-11 flex-1 px-0.5 py-1 font-mono text-[9px] font-bold tracking-wider uppercase sm:text-[10px]",
                  i === doseIndex
                    ? "bg-primary text-primary-fg"
                    : "bg-overlay text-muted hover:text-fg",
                )}
              >
                {v.dose}
              </button>
            ))}
          </div>
        )}
        <p className="mt-auto text-[9px] leading-snug text-faint">
          Research use only · not for human or animal use ·{" "}
          <Link
            to="/legal/research-use"
            className="text-primary underline-offset-2 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            requirements
          </Link>
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-lg font-semibold tabular-nums sm:text-xl">
            {formatPrice(variant.price)}
          </p>
          <button
            type="button"
            onClick={() => add(1)}
            aria-label={`Add ${product.name} ${variant.dose} to cart`}
            className="relative z-10 inline-flex min-h-11 shrink-0 items-center rounded-sm bg-primary px-3 font-display text-[11px] font-bold tracking-widest text-primary-fg uppercase hover:bg-primary-deep"
          >
             {added ? "Added" : "Add"}
          </button>
        </div>
        {canBulk && (
          <button
            type="button"
            onClick={() => add(pack.qty)}
            className="min-h-11 w-full truncate text-left text-[10px] text-muted hover:text-primary sm:text-[11px]"
          >
            Add {pack.qty} · {formatPrice(packPrice)}{" "}
            <span className="text-primary">save {formatPrice(packSave)}</span>
          </button>
        )}
      </div>
    </article>
  );
}

export const ProductCard = memo(ProductCardComponent);

export function MetaRow({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-xs tracking-wider text-faint uppercase">
        {icon}
        {label}
      </dt>
      <dd className="font-mono text-sm text-fg">{value}</dd>
    </div>
  );
}