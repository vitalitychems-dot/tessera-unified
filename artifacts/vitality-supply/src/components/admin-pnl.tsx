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
import { competitorStats } from "@/lib/competitors";

const FORMS = [
  { id: "vial", label: "Vials" },
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

function pct(n: number | null) {
  return n == null ? "Unknown" : `${(n * 100).toFixed(1)}%`;
}

function compareNullable(a: number | null, b: number | null) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return b - a;
}

function Money({ n, tone }: { n: number | null; tone?: "profit" | "warn" | "loss" }) {
  return (
    <span className={tone ? `rounded-sm px-1.5 py-0.5 font-mono text-xs ${heat(tone)}` : "font-mono text-xs"}>
      {n == null ? "Unknown" : formatPrice(n)}
    </span>
  );
}

function MarginBadge({ n }: { n: number | null }) {
  if (n == null) {
    return (
      <span className="inline-flex min-w-16 items-center justify-center rounded-sm border border-border px-2 py-1 font-mono text-xs text-muted">
        Unknown
      </span>
    );
  }
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
  const [sort, setSort] = useState<"name" | "margin" | "profit">("name");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter((r) => {
      if (r.formKind !== form) return false;
      if (t && !`${r.name} ${r.dose} ${r.form}`.toLowerCase().includes(t)) return false;
      return true;
    }).sort((a, b) =>
      sort === "margin"
        ? compareNullable(a.margin, b.margin)
        : sort === "profit"
          ? compareNullable(a.profit, b.profit)
          : a.name.localeCompare(b.name) || a.dose.localeCompare(b.dose),
    );
  }, [all, form, q, sort]);

  const sum = pnlSummary(rows);

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Avg known-cost margin"
          value={pct(sum.avgMargin)}
          hint={`${sum.knownCostCount}/${sum.count} SKUs cost-known · ${Math.round(sum.costCoverage * 100)}% coverage`}
        />
        <Kpi
          label="SKUs below 50%"
          value={String(sum.belowTarget)}
          hint="Known-cost retail SKUs"
        />
        <Kpi
          label="Missing costs"
          value={String(sum.missingCosts)}
          hint="Profit/margin/wholesale remain unknown"
        />
        <Kpi
          label="Wholesale ineligible"
          value={String(sum.wholesaleIneligible)}
          hint={`${sum.wholesaleUnknown} cost-unknown wholesale rows excluded`}
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

      <div className="rounded-md border border-warn/40 bg-warn/10 p-4 text-sm leading-relaxed text-muted">
        <p className="font-display text-fg tracking-wide uppercase">Known-cost basis + guardrails</p>
        <p className="mt-2">
          Coverage is {sum.knownCostCount}/{sum.count} SKUs ({Math.round(sum.costCoverage * 100)}%).
          Known vial cost uses the exact supplier-sheet <span className="text-fg">1 KIT (10) ÷ 10</span>{" "}
          unit basis; missing rows stay Unknown and are excluded from averages. Checkout keeps bulk,
          promo, Bitcoin, referral, and lab-credit stacking above known product cost plus known
          store-credit obligations. Discounts or credit are capped when that conservative known-cost
          contribution would otherwise go negative.
        </p>
        <p className="mt-2 text-xs">
          Shipping revenue is shown separately and no carrier expense, processor fee, refund rate,
          tax, or other supplier data is assumed here. Wholesale projections use exact 5 KIT (50)
          and 10 KIT (100) unit rows where available; otherwise the tier is not published.
        </p>
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
        <select className="input-field min-h-11 w-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="name">Sort: product</option>
          <option value="margin">Sort: margin</option>
          <option value="profit">Sort: profit</option>
        </select>
        <button
          type="button"
          className="min-h-11 rounded-sm border border-border px-3 font-display text-xs font-semibold tracking-widest uppercase"
          onClick={() => exportCsv(rows)}
        >
          Export CSV
        </button>
      </div>

      {view === "sheet" ? <CostTable rows={rows} /> : <LoopTable rows={rows} />}
    </div>
  );
}

function CostTable({ rows }: { rows: PnlRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[1500px] text-left text-sm">
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
            <th className="px-3 py-3">Competitor min / median / max</th>
            <th className="px-3 py-3">Headroom vs median</th>
            <th className="px-3 py-3">Flags</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={11} className="px-4 py-10 text-muted">
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
                <td className="px-3 py-2 font-mono text-xs">{r.cost == null ? "—" : formatPrice(r.cost)}</td>
                <td className="px-3 py-2 font-mono text-xs">{formatPrice(r.sell)}</td>
                <td className="px-3 py-2">
                  <Money n={r.profit} tone={r.margin == null ? undefined : marginTone(r.margin)} />
                </td>
                <WsCell band={r.ws?.q10} unknown={r.cost == null} />
                <WsCell band={r.ws?.q50} unknown={r.cost == null} />
                <WsCell band={r.ws?.q100} unknown={r.cost == null} />
                <CompetitorCell row={r} />
                <HeadroomCell row={r} />
                <td className="px-3 py-2 text-xs text-warn">{r.flags.join(", ") || "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function skuFor(row: PnlRow) {
  return `${row.name === "Glow" ? "GLOW" : row.name} ${row.dose}`;
}

function CompetitorCell({ row }: { row: PnlRow }) {
  const stats = competitorStats(skuFor(row));
  if (!stats) return <td className="px-3 py-2 text-xs text-muted">No fetched benchmark</td>;
  return (
    <td className="px-3 py-2 font-mono text-xs">
      {formatPrice(stats.min)} / {formatPrice(stats.median)} / {formatPrice(stats.max)}
      <span className="block text-[10px] text-muted">{stats.count} observed</span>
      <span className="mt-1 flex flex-wrap gap-x-2 text-[10px]">
        {stats.sources.map((source) => (
          <a
            key={`${source.vendor}-${source.url}`}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
            title={`Observed ${source.observedAt}`}
          >
            {source.vendor} ↗
          </a>
        ))}
      </span>
    </td>
  );
}

function HeadroomCell({ row }: { row: PnlRow }) {
  const stats = competitorStats(skuFor(row));
  if (!stats) return <td className="px-3 py-2 text-xs text-muted">—</td>;
  const dollars = stats.median - row.sell;
  return (
    <td className="px-3 py-2 font-mono text-xs">
      {dollars >= 0 ? "+" : "−"}{formatPrice(Math.abs(dollars))}
      <span className="block text-[10px] text-muted">{((dollars / stats.median) * 100).toFixed(1)}%</span>
    </td>
  );
}

function exportCsv(rows: PnlRow[]) {
  const quote = (value: unknown) => `"${String(value == null ? "Unknown" : value).replaceAll('"', '""')}"`;
  const header = ["SKU", "cost", "retail", "profit", "margin", "tier10", "tier50", "tier100", "competitorMin", "competitorMedian", "competitorMax", "headroom", "flags"];
  const lines = rows.map((row) => {
    const stats = competitorStats(skuFor(row));
    return [
      skuFor(row), row.cost, row.sell, row.profit, row.margin, row.ws?.q10.unit, row.ws?.q50.unit,
      row.ws?.q100.unit, stats?.min, stats?.median, stats?.max,
      stats ? stats.median - row.sell : null, row.flags.join("; "),
    ].map(quote).join(",");
  });
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vitality-pricing.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function WsCell({
  band,
  unknown,
}: {
  band?: { unit: number; yourCost: number; profit: number; lot: number; margin: number };
  unknown?: boolean;
}) {
  if (!band) return <td className="px-3 py-2 text-xs text-muted">{unknown ? "Unknown" : "—"}</td>;
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
                  {r.dose} · pay {r.cost == null ? "cost missing" : formatPrice(r.cost)} · charge {formatPrice(r.sell)}
                </p>
              </td>
              <td className="px-3 py-2">
                <MarginBadge n={r.margin} />
              </td>
              <td className="px-3 py-2">
                <Money n={r.profit} tone={r.margin == null ? undefined : marginTone(r.margin)} />
              </td>
              <td className="px-3 py-2">
                <Money
                  n={r.affCash}
                  tone={
                    r.affCash == null
                      ? undefined
                      : r.affCash >= 8
                        ? "profit"
                        : r.affCash >= 4
                          ? "warn"
                          : "loss"
                  }
                />
                <p className="mt-1 text-[10px] text-muted">Buyer {AFFILIATE_BUYER_OFF}% off. You do not pay cash commission.</p>
              </td>
              <td className="px-3 py-2">
                <span className="font-mono text-xs text-primary">{formatPrice(r.affCredit)}</span>
                <p className="mt-1 text-[10px] text-muted">{AFFILIATE_CREDIT_BASE}% store credit — must restock here to spend it.</p>
              </td>
              <td className="px-3 py-2">
                <Money
                  n={r.affLoop}
                  tone={
                    r.affLoop == null
                      ? undefined
                      : r.affLoop >= 20
                        ? "profit"
                        : r.affLoop >= 10
                          ? "warn"
                          : "loss"
                  }
                />
                <p className="mt-1 text-[10px] text-muted">This sale + their credit restock.</p>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{formatPrice(r.rewardCredit)}</td>
              <td className="px-3 py-2">
                <Money
                  n={r.rewardLoop}
                  tone={r.rewardLoop == null ? undefined : r.rewardLoop >= 20 ? "profit" : "warn"}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
