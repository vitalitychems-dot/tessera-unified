import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { scienceFor } from "@/lib/product-science";

export function ProductInfo({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const science = scienceFor(product.id.split("__")[1] ?? product.id);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="relative z-10 ml-1 inline-flex min-h-6 shrink-0 items-center rounded-sm bg-primary/20 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest text-primary-soft uppercase hover:bg-primary hover:text-primary-fg"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Info
      </button>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-end justify-center bg-bg/80 p-4 backdrop-blur-sm sm:items-center"
              onClick={() => setOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`info-${product.id}`}
                className="relative w-full max-w-md rounded-lg border border-border bg-bg-elevated p-5 shadow-lift"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="absolute top-2 right-2 flex h-11 w-11 items-center justify-center text-muted hover:text-fg"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
                <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                  Laboratory identity
                </p>
                <h4
                  id={`info-${product.id}`}
                  className="font-display mt-1 pr-8 text-xl font-semibold tracking-wide uppercase"
                >
                  {product.name}
                </h4>
                <dl className="mt-4 space-y-1.5 text-sm">
                  {product.casNumber ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">CAS</dt>
                      <dd className="font-mono">{product.casNumber}</dd>
                    </div>
                  ) : null}
                  {product.molecularWeight ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Molecular weight</dt>
                      <dd className="font-mono">{product.molecularWeight}</dd>
                    </div>
                  ) : null}
                  {product.molecularFormula ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Formula</dt>
                      <dd className="font-mono">{product.molecularFormula}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Purity (HPLC)</dt>
                    <dd className="font-mono">{product.purity}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Form</dt>
                    <dd>{product.form}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm leading-relaxed text-muted">{science.identity}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{science.researchedFor}</p>
                <p className="mt-3 text-[11px] leading-relaxed text-faint">{science.disclaimer}</p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
