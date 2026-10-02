import { useMemo, useState } from "react";
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

const SUBS = [
  { id: "calc", label: "ROI calculator" },
  { id: "proforma", label: "12-month proforma" },
  { id: "terms", label: "Term sheet" },
  { id: "forms", label: "Legal forms" },
  { id: "grok", label: "Grok desk" },
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
  const [sub, setSub] = useState<Sub>("calc");
  const [amount, setAmount] = useState(10000);
  const [roas, setRoas] = useState(3);
  const [gross, setGross] = useState(Math.round(econ.grossMargin * 1000) / 10);
  const [deploy, setDeploy] = useState(3);
  const [horizon, setHorizon] = useState(12);
  const [recycle, setRecycle] = useState(true);

  const input = {
    amount: Math.max(0, amount || 0),
    roas: Math.max(0, roas || 0),
    grossMargin: (gross || 0) / 100,
    deployMonths: deploy,
    horizonMonths: horizon,
    recycle,
  };
  const deal = useMemo(
    () => priceDeal(input),
    [amount, roas, gross, deploy, horizon, recycle],
  );
  const scenarios = useMemo(
    () => scenarioTable(input),
    [amount, roas, gross, deploy, horizon, recycle],
  );

  return (
    <div className="mt-8 space-y-6">
      <div>
        <p className="font-mono text-xs tracking-widest text-primary uppercase">Investor desk</p>
        <h2 className="font-display mt-1 text-3xl font-semibold uppercase">Ad-spend participation</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Investors fund media. They are paid from ad-attributed profit only — not equity, not
          inventory. Terms get better as the check gets larger. Live math uses your catalog margin
          ({pct(econ.grossMargin)} blended on {econ.skuCount} vials). Drafts for counsel — not an
          offer to sell securities.
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

      {sub === "calc" && (
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
          deal={deal}
          scenarios={scenarios}
        />
      )}
      {sub === "proforma" && <Proforma deal={deal} />}
      {sub === "terms" && <TermSheet deal={deal} />}
      {sub === "forms" && <LegalForms deal={deal} />}
      {sub === "grok" && <GrokDesk deal={deal} />}
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
          hint={`Contribution ${pct(deal.cm)} after fees/refunds`}
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
            Modeled orders on this wallet: ~{deal.orders} at {formatPrice(deal.aov)} average vial.
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
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        One-shot wallet: the check is spent over {deal.months.filter((m) => m.spend > 0).length}{" "}
        months. No refill. Organic and wholesale are excluded.
      </p>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="sticky top-0 bg-overlay font-mono text-[10px] tracking-widest text-muted uppercase">
            <tr>
              <th className="px-3 py-2">Mo</th>
              <th className="px-3 py-2">Ad spend</th>
              <th className="px-3 py-2">Revenue</th>
              <th className="px-3 py-2">COGS + drag</th>
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

function grokReply(q: string, deal: Deal): string {
  const t = q.toLowerCase();
  if (!t.trim()) return "Type a check size question — share, months to 1×, risks, or Illinois filings.";
  if (/howey|security|sec|illegal/.test(t)) {
    return "A profit share funded by someone else’s money can be a security under Howey. This desk is a model, not a filing. Use Illinois counsel, likely Reg D 506(b) if you already know the person. Do not post this as a public investment ad.";
  }
  if (/ban|meta|facebook|google|ads policy/.test(t)) {
    return "Peptide ads get rejected. Model a conservative 2.2× ROAS and keep a second channel (native, email, affiliates). If the ad account dies, the wallet stops — that is the #1 risk factor to print on the term sheet.";
  }
  if (/offer|share|%|percent|give them/.test(t)) {
    return `At ${formatPrice(deal.amount)} offer ${pct(deal.yearOneShare)} of ad-attributed net in year one, ${pct(Math.min(0.8, deal.yearOneShare + 0.12))} until 1× is back, cap at ${deal.multiple.toFixed(2)}× (${formatPrice(deal.returnCap)}). Bigger checks raise the cap and the share automatically.`;
  }
  if (/1x|payback|month|return/.test(t)) {
    return deal.monthsTo1x
      ? `Modeled 1× in month ${deal.monthsTo1x} at ${deal.roas.toFixed(1)}× ROAS. 12-month investor cash ${formatPrice(deal.investorYear)} (${pct(deal.investorRoi)}). You keep ${formatPrice(deal.companyYear)}.`
      : `This horizon does not return 1×. Raise ROAS above ${deal.breakevenRoas.toFixed(2)}× or do not take the check.`;
  }
  if (/margin|profit|cogs/.test(t)) {
    return `Catalog gross ${pct(deal.grossMargin)}. After card fees, refunds, and unused credits, contribution is ${pct(deal.cm)}. Break-even ROAS is ${deal.breakevenRoas.toFixed(2)}×. Net per ad dollar at ${deal.roas.toFixed(1)}× is ${deal.netPerAdDollar.toFixed(2)}.`;
  }
  return `Live deal: ${formatPrice(deal.amount)} at ${deal.roas.toFixed(1)}× ROAS → investor ${pct(deal.yearOneShare)} year one, ${deal.multiple.toFixed(2)}× cap, 12-mo investor ${formatPrice(deal.investorYear)}, you ${formatPrice(deal.companyYear)}. Ask about share, payback, bans, or Illinois filings. Connect a Grok API key later to replace this desk brain.`;
}

function GrokDesk({ deal }: { deal: Deal }) {
  const [q, setQ] = useState("What should I offer on this check?");
  const [log, setLog] = useState<{ role: "you" | "grok"; text: string }[]>([
    {
      role: "grok",
      text: grokReply("offer", deal),
    },
  ]);
  const [key, setKey] = useState("");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-md border border-border bg-surface p-4 lg:col-span-2">
        <div className="max-h-96 space-y-3 overflow-y-auto">
          {log.map((m, i) => (
            <div key={i} className={m.role === "you" ? "text-right" : ""}>
              <p className="font-mono text-[10px] tracking-widest text-muted uppercase">{m.role}</p>
              <p className="mt-1 inline-block max-w-xl rounded-md border border-border px-3 py-2 text-left text-sm leading-relaxed">
                {m.text}
              </p>
            </div>
          ))}
        </div>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const text = q.trim();
            if (!text) return;
            setLog((l) => [...l, { role: "you", text }, { role: "grok", text: grokReply(text, deal) }]);
            setQ("");
          }}
        >
          <input
            className="input-field flex-1"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask what to offer, payback, or filings"
          />
          <button type="submit" className="btn-primary">
            Ask
          </button>
        </form>
      </div>
      <aside className="rounded-md border border-border bg-surface p-4 text-sm text-muted">
        <p className="font-display text-fg tracking-wide uppercase">Connect Grok</p>
        <p className="mt-2 leading-relaxed">
          Desk brain uses your live P&L and this calculator. Paste an xAI API key when you want
          full Grok on the same numbers — stored only in this browser.
        </p>
        <input
          className="input-field mt-3"
          type="password"
          placeholder="xAI API key (optional)"
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            try {
              sessionStorage.setItem("vs-xai-key", e.target.value);
            } catch {
              /* private mode */
            }
          }}
        />
        <p className="mt-3 text-xs">
          {key ? "Key held in session. Wire the live Grok call when you are ready." : "No key yet — local desk is live."}
        </p>
      </aside>
    </div>
  );
}
