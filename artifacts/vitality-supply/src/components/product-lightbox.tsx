import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn } from "lucide-react";
import { useModal } from "@/lib/use-modal";

export function ProductLightbox({
  open,
  onClose,
  src,
  alt,
  label,
}: {
  open: boolean;
  onClose: () => void;
  src: string;
  alt: string;
  label: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useModal(open, onClose, "lightbox-container");

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => closeRef.current?.focus());
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      id="lightbox-container"
      className="fixed inset-0 z-[100] grid place-items-center bg-bg/95 p-3 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} enlarged image`}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full max-w-4xl flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-lift"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide uppercase">
            <ZoomIn className="h-4 w-4 text-primary" />
            {label}
          </span>
          <button
            ref={closeRef}
            type="button"
            className="grid min-h-11 min-w-11 place-items-center rounded-sm border border-border text-muted hover:text-fg"
            aria-label="Close enlarged image"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <img
          src={src}
          alt={alt}
          className="max-h-[calc(100dvh-7rem)] w-full bg-bg object-contain"
          decoding="async"
        />
      </div>
    </div>,
    document.body,
  );
}