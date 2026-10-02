import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { searchCatalog } from "@/lib/catalog";
import { formatPrice } from "@/lib/utils";

export function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => searchCatalog(q), [q]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-start justify-center px-4 pt-24">
      <button
        type="button"
        className="absolute inset-0 bg-bg/70"
        aria-label="Close search"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-lg border border-border bg-bg-elevated shadow-lift">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search BPC-157, Semaglutide, CAS…"
            className="h-14 w-full bg-transparent text-sm outline-none placeholder:text-faint"
          />
          <button type="button" onClick={onClose} className="p-2 text-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {q.trim() && hits.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">No matching compounds.</p>
          ) : (
            <ul>
              {hits.map((h) => (
                <li key={h.id}>
                  <a
                    href={h.href}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-overlay"
                  >
                    <img src={h.image} alt="" className="h-12 w-10 rounded-sm bg-bg object-contain" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{h.name}</p>
                      <p className="truncate font-mono text-xs text-muted">{h.subtitle}</p>
                    </div>
                    <span className="font-mono text-sm tabular-nums">{formatPrice(h.price)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
