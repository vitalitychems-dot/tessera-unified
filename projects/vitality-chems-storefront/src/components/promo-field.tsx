import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";
import { knownPromo, type AppliedPromo } from "@/lib/promo";
import { validatePromo } from "@/lib/store-api";

export async function lookupPromo(code: string): Promise<AppliedPromo | null> {
  const c = code.trim().toUpperCase();
  if (!c) return null;
  try {
    const r = await validatePromo({ data: { code: c } });
    if (r.ok) {
      return { code: r.code, percent: r.percent, kind: r.kind, label: r.label };
    }
  } catch {
    /* database may not have the table yet */
  }
  return knownPromo(c);
}

export function PromoCatcher() {
  const setPromo = useCart((s) => s.setPromo);
  const promo = useCart((s) => s.promo);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("code") || params.get("ref") || params.get("aff");
    let stored = "";
    try {
      stored = localStorage.getItem("vs-promo") ?? "";
    } catch {
      stored = "";
    }
    const raw = (fromUrl || stored || "").trim().toUpperCase();
    if (!raw || promo?.code === raw) return;
    void lookupPromo(raw).then((found) => {
      if (!found) return;
      setPromo(found);
      try {
        localStorage.setItem("vs-promo", found.code);
      } catch {
        /* ignore */
      }
    });
  }, [promo?.code, setPromo]);

  return null;
}

export function PromoField({ compact = false }: { compact?: boolean }) {
  const promo = useCart((s) => s.promo);
  const setPromo = useCart((s) => s.setPromo);
  const [code, setCode] = useState(promo?.code ?? "");
  const [status, setStatus] = useState<"idle" | "bad">("idle");
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    setBusy(true);
    const found = await lookupPromo(code);
    setBusy(false);
    if (!found) {
      setStatus("bad");
      return;
    }
    setPromo(found);
    setStatus("idle");
    try {
      localStorage.setItem("vs-promo", found.code);
    } catch {
      /* ignore */
    }
  };

  if (promo) {
    return (
      <div className="rounded-sm border border-border bg-overlay px-3 py-3">
        <p className="font-mono text-xs tracking-widest text-primary uppercase">
          {promo.code} · {promo.percent}% off
        </p>
        <p className="mt-1 text-xs text-muted">{promo.label}</p>
        <button
          type="button"
          className="mt-2 text-[11px] text-faint hover:text-fg"
          onClick={() => {
            setPromo(null);
            setCode("");
            try {
              localStorage.removeItem("vs-promo");
            } catch {
              /* ignore */
            }
          }}
        >
          Remove code
        </button>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "overflow-hidden rounded-sm border border-border"}>
      {!compact && (
        <div className="bg-overlay px-4 py-3 text-xs font-semibold tracking-widest text-muted uppercase">
          Promo / affiliate code
        </div>
      )}
      <div className={compact ? "space-y-2" : "space-y-2 px-4 py-4"}>
        <div className="flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="WELCOME10 or LAB10"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setStatus("idle");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void apply();
              }
            }}
            aria-label="Promo or affiliate code"
          />
          <button type="button" onClick={() => void apply()} className="btn-primary px-4" disabled={busy}>
            {busy ? "…" : "Apply"}
          </button>
        </div>
        {status === "bad" && <p className="font-mono text-xs text-red-400">Code not recognized.</p>}
      </div>
    </div>
  );
}
