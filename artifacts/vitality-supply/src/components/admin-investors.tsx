import { useEffect, useMemo, useState } from "react";
import { BUSINESS, formatAddress, IL_NOTICE } from "@/lib/business";
import {
  catalogEconomics,
  INCENTIVES,
  priceDeal,
  scenarioTable,
  termSheetText,
  type Deal,
} from "@/lib/investor-model";
import { formatPrice } from "@/lib/utils";
import { loadContactSubmissions } from "@/lib/store-api";

const SUBS = [
  { id: "calc", label: "ROI calculator" },
  { id: "proforma", label: "12-month proforma" },
  { id: "terms", label: "Term sheet" },
  { id: "forms", label: "Legal forms" },
] as const;

type Sub = (typeof SUBS)[number]["id"];

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
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

function Field({
  label,
  value,
  onChange,
  step,
  min,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="text-xs tracking-widest text-muted uppercase">
      {label}
      <div className="mt-1 flex items-center gap-2">
        {prefix ? <span className="text-muted">{prefix}</span> : null}
        <input
          className="input-field"
          type="number"
          min={min ?? 0}
          step={step ?? 1}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix ? <span className="text-muted">{suffix}</span> : null}
      </div>
    </label>
  );
}

export function AdminInvestors() {
  const econ = useMemo(() => catalogEconomics(), []);
  const projectionReady = econ.grossMargin != null && econ.aov != null;
  const [sub, setSub] = useState<Sub>("calc");
  const [amount, setAmount] = useState(10000);
  const [roas, setRoas] = useState(3);
  const [gross, setGross] = useState(
    econ.grossMargin == null ? 0 : Math.round(econ.grossMargin * 1000) / 10,
  );
  const [deploy, setDeploy] = useState(3);
  const [horizon, setHorizon] = useState(12);
  const [recycle, setRecycle] = useState(true);
  const [contacts, setContacts] = useState<Awaited<ReturnType<typeof loadContactSubmissions>> | null>(null);

  const input = {
    amount: Math.max(0, amount || 0),
    roas: Math.max(0, roas || 0),
    grossMargin: (gross || 0) / 100,
    deployMonths: deploy,
    horizonMonths: horizon,
    recycle,
  };
  const projection = useMemo(
    () =>
      projectionReady
        ? { deal: priceDeal(input), scenarios: scenarioTable(input) }
        : null,
    [amount, roas, gross, deploy, horizon, recycle, projectionReady],
  );

  useEffect(() => {
    void loadContactSubmissions().then(setContacts).catch(() => setContacts(null));
  }, []);

  return (
    <div className="mt-8 space-y-6">
      <div>
        <p className="font-mono text-xs tracking-widest text-primary uppercase">Investor desk</p>
        <h2 className="font-display mt-1 text-3xl font-semibold uppercase">Ad-spend participation</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Investors fund media. They are paid from ad-attributed profit only — not equity, not
          inventory. Terms get better as the check gets larger. Live math uses your catalog margin
           {econ.grossMargin == null ? (
             <>No cost-based margin is available for projection.</>
           ) : (
             <>
               {pct(econ.grossMargin)} blended on {econ.knownCostSkuCount}/{econ.skuCount} cost-known
               vials ({Math.round(econ.costCoverage * 100)}% coverage); {econ.excludedSkuCount} cost-unknown
               SKU{econ.excludedSkuCount === 1 ? "" : "s"} excluded from cost-based projections;{" "}
               {econ.sheetOnlyOmissionCount} sheet-only rows omitted from the catalog.
             </>
           )}{" "}
            Scenarios use known product cost only; processor fees, refunds, shipping expense, taxes,
            and overhead are not supplied and are not modeled. Drafts for counsel — not an offer to
            sell securities.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUBS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSub(s.id)}
            className={
              sub === s.id
                ? "btn-primary"
                : "min-h-11 rounded-sm border border-border px-3 font-display text-xs font-semibold tracking-widest uppercase"
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      {!projection ? <ProjectionUnavailable econ={econ} /> : null}
      {projection && sub === "calc" && (
        <Calculator
          amount={amount}
          setAmount={setAmount}
          roas={roas}
          setRoas={setRoas}
          gross={gross}
          setGross={setGross}
          deploy={deploy}
          setDeploy={setDeploy}
          horizon={horizon}
          setHorizon={setHorizon}
          recycle={recycle}
          setRecycle={setRecycle}
          deal={projection.deal}
          scenarios={projection.scenarios}
        />
      )}
      {projection && sub === "proforma" && <Proforma deal={projection.deal} />}
      {projection && sub === "terms" && <TermSheet deal={projection.deal} />}
      {projection && sub === "forms" && <LegalForms deal={projection.deal} />}
      <ContactInbox contacts={contacts} />
    </div>
  );
}

function ContactInbox({ contacts }: { contacts: Awaited<ReturnType<typeof loadContactSubmissions>> | null }) {
  return (
    <section className="space-y-4">
      <div>
        <p className="font-mono text-[10px] tracking-widest text-primary uppercase">Inbound queue</p>
        <h3 className="font-display mt-1 text-xl font-semibold uppercase">Partner and investor inquiries</h3>
      </div>
      {!contacts ? <p className="text-sm text-muted">No submissions loaded.</p> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ContactList title="Partner / UGC" rows={contacts.partners} />
          <ContactList title="Investor / ROI" rows={contacts.investors} />
        </div>
      )}
    </section>
  );
}

function ContactList({ title, rows }: { title: string; rows: Array<Record<string, unknown>> }) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <h4 className="font-display font-semibold uppercase">{title}</h4>
      <div className="mt-3 space-y-3">
        {rows.length === 0 ? <p className="text-sm text-muted">No inquiries.</p> : rows.map((row) => (
          <article key={String(row.id)} className="border-t border-border pt-3 text-sm">
            <p className="font-semibold">{String(row.name)} · <a className="text-primary hover:underline" href={`mailto:${String(row.email)}`}>{String(row.email)}</a></p>
            <p className="mt-1 text-xs text-muted">{String(row.organization ?? "")} {String(row.channel ?? row.amount_interest ?? "")}</p>
            <p className="mt-2 whitespace-pre-wrap text-muted">{String(row.message)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ProjectionUnavailable({
  econ,
}: {
  econ: ReturnType<typeof catalogEconomics>;
}) {
  return (
    <div className="rounded-md border border-warn/40 bg-warn/10 p-5 text-sm text-warn">
      No investor or proforma totals are shown because there are no known-cost
      vial SKUs to establish a defensible catalog margin. Current coverage is{" "}
      {econ.knownCostSkuCount}/{econ.skuCount} SKUs; unknown-cost SKUs remain excluded
      until the supplier sheet is matched. {econ.sheetOnlyOmissionCount} sheet-only rows
      are also outside the catalog scope.
    </div>
  );
}

function Calculator({
  amount,
  setAmount,
  roas,
  setRoas,
  gross,
  setGross,
  deploy,
  setDeploy,
  horizon,
  setHorizon,
  recycle,
  setRecycle,
  deal,
  scenarios,
}: {
  amount: number;
  setAmount: (n: number) => void;
  roas: number;
  setRoas: (n: number) => void;
  gross: number;
  setGross: (n: number) => void;
  deploy: number;
  setDeploy: (n: number) => void;
  horizon: number;
  setHorizon: (n: number) => void;
  recycle: boolean;
  setRecycle: (n: boolean) => void;
  deal: Deal;
  scenarios: ReturnType<typeof scenarioTable>;
}) {
  const thin = deal.netPerAdDollar <= 0;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <Field label="Investment $" value={amount} onChange={setAmount} step={500} prefix="$" />
        <Field label="Modeled ROAS" value={roas} onChange={setRoas} step={0.1} suffix="×" />
        <Field label="Gross margin %" value={gross} onChange={setGross} step={0.1} suffix="%" />
        <Field label="Deploy over (months)" value={deploy} onChange={setDeploy} min={1} />
        <Field label="Horizon (months)" value={horizon} onChange={setHorizon} min={1} />
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" checked={recycle} onChange={(e) => setRecycle(e.target.checked)} />
        Recycle 50% of your monthly share back into ads (needed for 1× on a single wallet)
      </label>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Offer this check"
          value={`${pct(deal.yearOneShare)} share`}
          hint={`Base ${pct(deal.share)} · cap ${deal.multiple.toFixed(2)}×`}
        />
        <Kpi
          label="Investor 12-mo cash"
          value={formatPrice(deal.investorYear)}
          hint={
            deal.monthsTo1x
              ? `~${pct(deal.investorRoi)} ROI · 1× in month ${deal.monthsTo1x}`
              : "Does not return 1× in this horizon"
          }
        />
        <Kpi
          label="You keep 12-mo"
          value={formatPrice(deal.companyYear)}
           hint={`Known-cost contribution ${pct(deal.cm)} before unsourced overhead`}
        />
        <Kpi
          label="Break-even ROAS"
          value={`${deal.breakevenRoas.toFixed(2)}×`}
          hint={
            thin
              ? "This ROAS loses money — raise ROAS or do not take the check"
              : `${formatPrice(deal.cycleProfit)} net on the media wallet`
          }
        />
      </div>

      {thin ? (
        <p className="rounded-md border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">
          At {deal.roas.toFixed(2)}× ROAS and {pct(deal.cm)} contribution, ads do not cover themselves.
          Do not offer a profit share until modeled ROAS is above {deal.breakevenRoas.toFixed(2)}×.
        </p>
      ) : null}

      <p className="rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-xs leading-relaxed text-muted">
        Scenario assumptions: {pct(deal.grossMargin)} blended known-cost margin from the catalog
        coverage disclosed above, {deal.roas.toFixed(2)}× modeled ROAS, and no sourced processor,
        refund, shipping, tax, or operating-expense inputs. Unknown-cost SKUs are excluded rather
        than assigned a cost. Treat this as a pre-overhead sensitivity view, not a forecast.
      </p>

      <div className="rounded-md border border-border bg-surface p-4">
        <p className="font-display tracking-wide uppercase">What to offer at {formatPrice(deal.amount)}</p>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>
            Until capital is back: investor gets{" "}
            <span className="text-fg">{pct(Math.min(0.8, deal.yearOneShare + 0.12))}</span> of
            ad-attributed net (you keep a slice so you stay in the game).
          </li>
          <li>
            Then until <span className="text-fg">{deal.multiple.toFixed(2)}×</span> (
            {formatPrice(deal.returnCap)}): investor {pct(deal.yearOneShare)} in year one.
          </li>
          <li>
            After the cap, share steps to {pct(deal.share / 2)} so you recapture margin.
          </li>
          <li>
            Modeled orders on this wallet:{" "}
            {deal.orders == null || deal.aov == null
              ? "Unknown — no complete cost/retail basis."
              : `~${deal.orders} at ${formatPrice(deal.aov)} average vial.`}
          </li>
        </ul>
        <div className="mt-4">
          <p className="font-mono text-[10px] tracking-widest text-muted uppercase">Incentives that unlock</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {INCENTIVES.map((i) => (
              <span
                key={i.at}
                className={
                  deal.amount >= i.at
                    ? "rounded-sm border border-profit/40 bg-profit/15 px-2 py-1 text-xs text-profit"
                    : "rounded-sm border border-border px-2 py-1 text-xs text-muted"
                }
              >
                {formatPrice(i.at)}+ · {i.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-overlay font-mono text-[10px] tracking-widest text-muted uppercase">
            <tr>
              <th className="px-3 py-2">Scenario</th>
              <th className="px-3 py-2">ROAS</th>
              <th className="px-3 py-2">Investor 12-mo</th>
              <th className="px-3 py-2">Your 12-mo</th>
              <th className="px-3 py-2">Investor ROI</th>
              <th className="px-3 py-2">Months to 1×</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => (
              <tr
                key={s.roas}
                className={`border-t border-border ${s.roas === deal.roas ? "bg-overlay" : ""}`}
              >
                <td className="px-3 py-2">{s.label}</td>
                <td className="px-3 py-2 font-mono">{s.roas.toFixed(1)}×</td>
                <td className="px-3 py-2 font-mono">{formatPrice(s.investorYear)}</td>
                <td className="px-3 py-2 font-mono">{formatPrice(s.companyYear)}</td>
                <td className="px-3 py-2 font-mono">{pct(s.roi)}</td>
                <td className="px-3 py-2">{s.monthsTo1x ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Proforma({ deal }: { deal: Deal }) {
  const econ = catalogEconomics();
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        One-shot wallet: the check is spent over {deal.months.filter((m) => m.spend > 0).length}{" "}
        months. No refill. Organic and wholesale are excluded.
      </p>
      <p className="rounded-md border border-border bg-surface p-3 text-xs text-muted">
         Cost basis: {econ.knownCostSkuCount}/{econ.skuCount} vial SKUs known-cost (
        {Math.round(econ.costCoverage * 100)}% coverage). {econ.excludedSkuCount} cost-unknown
        SKU{econ.excludedSkuCount === 1 ? "" : "s"} are excluded from this margin basis;{" "}
         {econ.sheetOnlyOmissionCount} supplier-sheet-only rows are outside the catalog. Standard
         cost is exact 1 KIT (10) ÷ 10; 5 KIT / 10 KIT tier costs are only used for wholesale.
         No processor, refund, shipping, tax, or overhead costs are assumed.
      </p>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="sticky top-0 bg-overlay font-mono text-[10px] tracking-widest text-muted uppercase">
            <tr>
              <th className="px-3 py-2">Mo</th>
              <th className="px-3 py-2">Ad spend</th>
              <th className="px-3 py-2">Revenue</th>
              <th className="px-3 py-2">Known COGS</th>
              <th className="px-3 py-2">Net after ads</th>
              <th className="px-3 py-2">To investor</th>
              <th className="px-3 py-2">You keep</th>
              <th className="px-3 py-2">Investor cum</th>
              <th className="px-3 py-2">Stage</th>
            </tr>
          </thead>
          <tbody>
            {deal.months.map((m) => (
              <tr key={m.month} className="border-t border-border">
                <td className="px-3 py-2 font-mono">{m.month}</td>
                <td className="px-3 py-2 font-mono">{formatPrice(m.spend)}</td>
                <td className="px-3 py-2 font-mono">{formatPrice(m.revenue)}</td>
                <td className="px-3 py-2 font-mono">{formatPrice(m.cogs)}</td>
                <td className="px-3 py-2 font-mono">{formatPrice(m.net)}</td>
                <td className="px-3 py-2 font-mono text-profit">{formatPrice(m.investor)}</td>
                <td className="px-3 py-2 font-mono">{formatPrice(m.company)}</td>
                <td className="px-3 py-2 font-mono">{formatPrice(m.investorCum)}</td>
                <td className="px-3 py-2 text-xs uppercase text-muted">{m.stage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TermSheet({ deal }: { deal: Deal }) {
  const text = termSheetText(deal);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigator.clipboard.writeText(text)}
        >
          Copy draft
        </button>
        <p className="self-center text-xs text-muted">
          Send to counsel before anyone signs. Updates live with the calculator.
        </p>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-surface p-5 font-mono text-xs leading-relaxed text-fg">
        {text}
      </pre>
    </div>
  );
}

function LegalForms({ deal }: { deal: Deal }) {
  const blocks = [
    {
      title: "Not an offer · Illinois securities",
      body: `This desk models a private ad-spend participation. It is not a prospectus, not investment advice, and not an offer to sell a security. Under the Howey test a profit-share funded by others can be a security. Illinois Securities Law of 1953 and federal Reg D (506(b) / 506(c)) may apply. Use a securities lawyer in Illinois before taking money. ${BUSINESS.legalName}, ${formatAddress()}.`,
    },
    {
      title: "Risk factors (give this to every prospect)",
      body: `Capital is spent on ads and can go to zero. Meta, Google, and native networks often reject or ban research-peptide creative. Accounts can shut overnight. Modeled ROAS ${deal.roas.toFixed(1)}× is an assumption, not a track record. Refunds, chargebacks, COGS inflation, and shipping all hit contribution. There is no guaranteed return, no FDIC, no equity, no board seat unless separately agreed. Research-use-only advertising: ${IL_NOTICE}`,
    },
    {
      title: "Accredited investor questionnaire (draft)",
      body: `Name / entity / email / phone. Residency. Check one: (a) individual income over $200,000 ($300,000 with spouse) in each of the last two years and a reasonable expectation this year; (b) individual net worth over $1,000,000 excluding primary residence; (c) entity with >$5,000,000 assets; (d) not accredited (stop — do not take the check under 506(c)). Signature, date, “I understand I may lose the entire amount.” Have counsel stamp this.`,
    },
    {
      title: "Use of proceeds",
      body: `100% of ${formatPrice(deal.amount)} is a prepaid media wallet for ${BUSINESS.name} catalog campaigns. No founder salary, no inventory restock, no debt paydown from this wallet. Unspent media at month ${deal.months.length} is either returned or rolled by written consent.`,
    },
    {
      title: "Advertising compliance (bind the investor)",
      body: `Investor may not run their own ads. All creative is RUO: no human use, no dosing, no before/after bodies, no disease claims. Investor social posts must match site disclaimers. Breach = pause of share and takedown.`,
    },
    {
      title: "Subscription / PPM cover note",
      body: `If counsel classifies this as a security: Reg D 506(b) (no general solicitation, preexisting relationship) is the usual path for a first check. 506(c) allows advertising only to verified accredited investors. File Form D with the SEC and notice with the Illinois Secretary of State. This app does not file anything.`,
    },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {blocks.map((b) => (
        <article key={b.title} className="rounded-md border border-border bg-surface p-5">
          <h3 className="font-display text-lg font-semibold tracking-wide uppercase">{b.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">{b.body}</p>
        </article>
      ))}
    </div>
  );
}
