import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";
import {
  AFFILIATE_BUYER_OFF,
  AFFILIATE_CREDIT_BASE,
  marginTone,
  pnlSheet,
  pnlSummary,
  profitTone,
  type PnlRow,
} from "@/lib/wholesale-tiers";
import { CREDIT_RATE } from "@/lib/pricing";

const FORMS = [
  { id: "vial", label: "Vials" },
  { id: "all", label: "All forms" },
  { id: "capsule", label: "Capsules" },
  { id: "spray", label: "Sprays" },
  { id: "liquid", label: "Liquids" },
  { id: "topical", label: "Topicals" },
] as const;

function heat(tone: "profit" | "warn" | "loss") {
  if (tone === "profit") return "bg-profit/15 text-profit";
  if (tone === "warn") return "bg-warn/15 text-warn";
  return "bg-loss/15 text-loss";
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-4 py-3">
      <p className="font-mono text-[10px] tracking-widest text-muted uppercase">{label}</p>
      <p className="font-display mt-1 text-2xl font-semibold tracking-wide">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function Money({ n, tone }: { n: number; tone?: "profit" | "warn" | "loss" }) {
  return (
    <span className={tone ? `rounded-sm px-1.5 py-0.5 font-mono text-xs ${heat(tone)}` : "font-mono text-xs"}>
      {formatPrice(n)}
    </span>
  );
}

function MarginBadge({ n }: { n: number }) {
  return (
    <span
      className={`inline-flex min-w-16 items-center justify-center rounded-sm px-2 py-1 font-display text-lg font-semibold tracking-wide ${heat(marginTone(n))}`}
    >
      {pct(n)}
    </span>
  );
}

export function AdminPnl() {
  const all = useMemo(() => pnlSheet(), []);
  const [form, setForm] = useState<(typeof FORMS)[number]["id"]>("vial");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"sheet" | "loop">("sheet");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter((r) => {
      if (form !== "all" && r.formKind !== form) return false;
      if (t && !`${r.name} ${r.dose} ${r.form}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [all, form, q]);

  const sum = pnlSummary(rows);

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Avg retail margin"
          value={`${Math.round(sum.avgMargin * 100)}%`}
          hint={`${sum.count} SKUs · ${formatPrice(sum.avgRetail)} / bottle`}
        />
        <Kpi
          label="You keep @ 10 vials"
          value={formatPrice(sum.avg10)}
          hint="Per bottle after Integrity −15% restock"
        />
        <Kpi
          label="You keep @ 50 vials"
          value={formatPrice(sum.avg50)}
          hint="Per bottle after Integrity −20% restock"
        />
        <Kpi
          label="You keep @ 100 vials"
          value={formatPrice(sum.avg100)}
          hint="Per bottle after Integrity −30% restock"
        />
      </div>

      <div className="rounded-md border border-border bg-surface p-4 text-sm leading-relaxed text-muted">
        <p className="font-display text-fg tracking-wide uppercase">Credits stay in the catalog</p>
        <p className="mt-2">
          Affiliate payout is {AFFILIATE_CREDIT_BASE}% in <span className="text-fg">reward credits</span>,
          never cash. Buyers save {AFFILIATE_BUYER_OFF}% at checkout. Signed-in labs bank{" "}
          {Math.round(CREDIT_RATE * 100)}% of merchandise as credit on the next order. Both only spend
          here — so a referred sale funds another restock instead of leaving the business.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <span>
            <span className={`rounded-sm px-1.5 py-0.5 ${heat("profit")}`}>Green</span> ≥ 48% margin /
            ≥ $8 wholesale
          </span>
          <span>
            <span className={`rounded-sm px-1.5 py-0.5 ${heat("warn")}`}>Amber</span> 32–47% / $5–$8
          </span>
          <span>
            <span className={`rounded-sm px-1.5 py-0.5 ${heat("loss")}`}>Red</span> thin — traffic
            hook or raise
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FORMS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setForm(f.id)}
            className={
              form === f.id
                ? "btn-primary"
                : "min-h-11 rounded-sm border border-border px-3 font-display text-xs font-semibold tracking-widest uppercase"
            }
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setView("sheet")}
          className={
            view === "sheet"
              ? "btn-primary ml-auto"
              : "ml-auto min-h-11 rounded-sm border border-border px-3 font-display text-xs font-semibold tracking-widest uppercase"
          }
        >
          Cost vs sell
        </button>
        <button
          type="button"
          onClick={() => setView("loop")}
          className={
            view === "loop"
              ? "btn-primary"
              : "min-h-11 rounded-sm border border-border px-3 font-display text-xs font-semibold tracking-widest uppercase"
          }
        >
          Affiliate + rewards
        </button>
        <input
          className="input-field min-h-11 min-w-[200px] flex-1"
          placeholder="Find a compound"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {view === "sheet" ? <CostTable rows={rows} /> : <LoopTable rows={rows} />}
    </div>
  );
}

function CostTable({ rows }: { rows: PnlRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="sticky top-0 bg-overlay font-mono text-[10px] tracking-widest text-muted uppercase">
          <tr>
            <th className="px-3 py-3">Product</th>
            <th className="px-3 py-3">Your % margin</th>
            <th className="px-3 py-3">You pay</th>
            <th className="px-3 py-3">You charge</th>
            <th className="px-3 py-3">Profit $</th>
            <th className="px-3 py-3">10 vials % / $</th>
            <th className="px-3 py-3">50 vials % / $</th>
            <th className="px-3 py-3">100 vials % / $</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-muted">
                Nothing matches.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.key} className="border-t border-border">
                <td className="px-3 py-2">
                  <p className="font-medium">{r.name}</p>
                  <p className="font-mono text-[10px] text-muted uppercase">
                    {r.dose} · {r.formKind}
                  </p>
                </td>
                <td className="px-3 py-2">
                  <MarginBadge n={r.margin} />
                </td>
                <td className="px-3 py-2 font-mono text-xs">{formatPrice(r.cost)}</td>
                <td className="px-3 py-2 font-mono text-xs">{formatPrice(r.sell)}</td>
                <td className="px-3 py-2">
                  <Money n={r.profit} tone={marginTone(r.margin)} />
                </td>
                <WsCell band={r.ws?.q10} />
                <WsCell band={r.ws?.q50} />
                <WsCell band={r.ws?.q100} />
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function WsCell({
  band,
}: {
  band?: { unit: number; yourCost: number; profit: number; lot: number; margin: number };
}) {
  if (!band) return <td className="px-3 py-2 text-xs text-muted">—</td>;
  return (
    <td className="px-3 py-2">
      <span className={`rounded-sm px-1.5 py-0.5 font-display text-sm font-semibold ${heat(marginTone(band.margin))}`}>
        {pct(band.margin)}
      </span>
      <p className="mt-1">
        <Money n={band.profit} tone={profitTone(band.profit)} />
        <span className="text-muted"> / bottle</span>
      </p>
      <p className="mt-1 font-mono text-[10px] text-muted">
        charge {formatPrice(band.unit)} · pay {formatPrice(band.yourCost)} · lot {formatPrice(band.lot)}
      </p>
    </td>
  );
}

function LoopTable({ rows }: { rows: PnlRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="sticky top-0 bg-overlay font-mono text-[10px] tracking-widest text-muted uppercase">
          <tr>
            <th className="px-3 py-3">Product</th>
            <th className="px-3 py-3">Your % margin</th>
            <th className="px-3 py-3">Retail cash</th>
            <th className="px-3 py-3">Affiliate sale cash</th>
            <th className="px-3 py-3">Credit parked</th>
            <th className="px-3 py-3">2-order affiliate loop</th>
            <th className="px-3 py-3">5% reward banked</th>
            <th className="px-3 py-3">2-order reward loop</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-border">
              <td className="px-3 py-2">
                <p className="font-medium">{r.name}</p>
                <p className="font-mono text-[10px] text-muted uppercase">
                  {r.dose} · pay {formatPrice(r.cost)} · charge {formatPrice(r.sell)}
                </p>
              </td>
              <td className="px-3 py-2">
                <MarginBadge n={r.margin} />
              </td>
              <td className="px-3 py-2">
                <Money n={r.profit} tone={marginTone(r.margin)} />
              </td>
              <td className="px-3 py-2">
                <Money n={r.affCash} tone={r.affCash >= 8 ? "profit" : r.affCash >= 4 ? "warn" : "loss"} />
                <p className="mt-1 text-[10px] text-muted">Buyer {AFFILIATE_BUYER_OFF}% off. You do not pay cash commission.</p>
              </td>
              <td className="px-3 py-2">
                <span className="font-mono text-xs text-primary">{formatPrice(r.affCredit)}</span>
                <p className="mt-1 text-[10px] text-muted">{AFFILIATE_CREDIT_BASE}% store credit — must restock here to spend it.</p>
              </td>
              <td className="px-3 py-2">
                <Money n={r.affLoop} tone={r.affLoop >= 20 ? "profit" : r.affLoop >= 10 ? "warn" : "loss"} />
                <p className="mt-1 text-[10px] text-muted">This sale + their credit restock.</p>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{formatPrice(r.rewardCredit)}</td>
              <td className="px-3 py-2">
                <Money n={r.rewardLoop} tone={r.rewardLoop >= 20 ? "profit" : "warn"} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
