import { useState } from "react";
import { useCart } from "@/lib/cart-store";
import { SET_QTY, setPrice, type ResearchSet } from "@/lib/catalog";
import { cn, formatPrice } from "@/lib/utils";

export function SetCard({ set }: { set: ResearchSet }) {
  const [mg, setMg] = useState<number>(10);
  const addItem = useCart((s) => s.addItem);
  const price = setPrice(set.price, mg, set.compounds.length);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="relative aspect-[16/10] overflow-hidden bg-bg">
        <img src={set.image} alt={set.name} className="h-full w-full object-cover" />
        {set.badge && (
          <span className="absolute top-3 left-3 rounded-sm bg-primary px-2 py-1 text-[10px] font-bold tracking-widest text-primary-fg uppercase">
            {set.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold tracking-wide uppercase">{set.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{set.tagline}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {set.compounds.map((c) => (
            <span
              key={c}
              className="rounded-sm border border-border bg-overlay px-2 py-1 text-[10px] font-bold tracking-widest uppercase"
            >
              {c}
            </span>
          ))}
        </div>
        <p className="mt-5 text-[10px] font-bold tracking-widest text-muted uppercase">
          Quantity selection
        </p>
        <div className="mt-2 inline-flex overflow-hidden rounded-sm border border-border" role="group">
          {SET_QTY.map((q) => (
            <button
              key={q.mg}
              type="button"
              aria-pressed={mg === q.mg}
              onClick={() => setMg(q.mg)}
              className={cn(
                "min-h-10 px-3 py-2 font-mono text-xs font-bold tracking-widest uppercase transition-colors",
                mg === q.mg
                  ? "bg-primary text-primary-fg"
                  : "bg-overlay text-muted hover:text-fg",
              )}
            >
              {q.mg}mg
            </button>
          ))}
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <p className="font-display text-2xl font-semibold tabular-nums">{formatPrice(price)}</p>
          <button
            type="button"
            onClick={() =>
              addItem({
                productId: set.id,
                name: set.name,
                doseLabel: `${mg}mg`,
                unitPrice: price,
                image: set.image,
                compounds: set.compounds,
              })
            }
            className="btn-primary px-4"
          >
            Add
          </button>
        </div>
      </div>
    </article>
  );
}
