import { useCart } from "@/lib/cart-store";
import type { SarmProduct } from "@/lib/catalog";
import { GENERIC_VIAL } from "@/lib/vial-photos";
import { formatPrice } from "@/lib/utils";

export function SarmCard({ product }: { product: SarmProduct }) {
  const addItem = useCart((s) => s.addItem);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold tracking-wide uppercase">{product.name}</h3>
        {product.badge && (
          <span className="rounded-sm bg-primary px-2 py-1 text-[10px] font-bold tracking-widest text-primary-fg uppercase">
            {product.badge}
          </span>
        )}
      </div>
      <p className="text-xs tracking-wide text-muted">SARM formulation · 30 mL liquid · RUO</p>
      <ul className="mt-4 flex-1 space-y-2">
        {product.compounds.map((c) => (
          <li
            key={c.name}
            className="flex items-center justify-between border-b border-border py-2 text-sm"
          >
            <span>{c.name}</span>
            <span className="font-mono text-muted">{c.mg} mg/mL</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 font-mono text-xs tracking-widest text-muted uppercase">30 mL · Liquid</p>
      <div className="mt-4 flex items-end justify-between">
        <p className="font-display text-2xl font-semibold tabular-nums">
          {formatPrice(product.price)}
          <span className="ml-1 text-xs font-medium tracking-widest text-muted uppercase">
            /bottle
          </span>
        </p>
        <button
          type="button"
          onClick={() =>
            addItem({
              productId: product.id,
              name: product.name,
              doseLabel: "30mL",
              unitPrice: product.price,
              image: GENERIC_VIAL,
              compounds: product.compounds.map((c) => c.name),
            })
          }
          className="btn-primary px-4"
        >
          Add
        </button>
      </div>
    </article>
  );
}
