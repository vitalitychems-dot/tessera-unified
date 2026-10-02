import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isAdminEmail, BUSINESS, formatAddress } from "@/lib/business";
import { AD_ANGLES, BACKLINK_TARGETS, LONG_TAIL_KEYWORDS, OUTREACH_EMAIL } from "@/lib/growth";
import { loadAdminDashboard, createPromoCode } from "@/lib/store-api";
import { formatPrice } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { AdminPnl } from "@/components/admin-pnl";
import { AdminInvestors } from "@/components/admin-investors";

export const Route = createFileRoute("/admin")({ component: Admin });

type Dash = Awaited<ReturnType<typeof loadAdminDashboard>>;

function Admin() {
  const { user, isPending } = useCurrentUserState();
  const [tab, setTab] = useState<
    "live" | "customers" | "subs" | "affiliates" | "ads" | "margins" | "investors" | "grok"
  >("live");
  const [dash, setDash] = useState<Dash | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState({
    code: "",
    kind: "affiliate" as "promo" | "affiliate",
    percent: 12.5,
    partner: "",
    label: "",
  });
  const [codeMsg, setCodeMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdminEmail(user.primaryEmail)) return;
    let cancelled = false;
    const pull = () => {
      loadAdminDashboard()
        .then((d) => {
          if (!cancelled) {
            setDash(d);
            setError(null);
          }
        })
        .catch((e: Error) => {
          if (!cancelled) setError(e.message);
        });
    };
    pull();
    const t = setInterval(pull, 20000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [user]);

  if (isPending) {
    return (
      <div className="min-h-dvh bg-bg text-fg">
        <SiteHeader />
        <div className="px-6 pt-8 text-sm text-muted">Loading staff session…</div>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  if (!isAdminEmail(user.primaryEmail)) {
    return (
      <div className="min-h-dvh bg-bg text-fg">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-6 pt-8">
          <h1 className="font-display text-3xl font-semibold uppercase">Staff only</h1>
          <p className="mt-4 text-sm text-muted">
            Sign in with {BUSINESS.email}. Sign out of any other account first.
          </p>
          <div className="mt-6">
            <UserButton />
          </div>
          <Link to="/login" className="btn-primary mt-8 inline-flex">
            Staff sign in
          </Link>
        </main>
      </div>
    );
  }

  const k = dash?.kpis;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 pt-32 pb-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-widest text-primary uppercase">
              Live operator desk
            </p>
            <h1 className="font-display mt-2 text-4xl font-semibold tracking-wide uppercase">
              Analytics
            </h1>
            <p className="mt-2 text-sm text-muted">
              {BUSINESS.name} · {formatAddress()} · live desk
            </p>
          </div>
          <UserButton />
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {(
            [
              ["live", "Live funnel"],
              ["customers", "Customers"],
              ["subs", "Subscribers"],
              ["affiliates", "Affiliates"],
              ["ads", "Ads & SEO"],
              ["margins", "P&L sheet"],
              ["investors", "Investors"],
              ["grok", "Grok optimizer"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={
                tab === id
                  ? "btn-primary"
                  : "min-h-11 rounded-sm border border-border px-4 font-display text-xs font-semibold tracking-widest uppercase"
              }
            >
              {label}
            </button>
          ))}
        </div>

        {error ? <p className="mt-6 text-sm text-red-400">{error}</p> : null}

        {tab === "live" && (
          <>
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi label="Sessions" value={k ? String(k.sessions) : "—"} />
              <Kpi label="Product views" value={k ? String(k.productViews) : "—"} />
              <Kpi label="Adds to cart" value={k ? String(k.addToCarts) : "—"} />
              <Kpi
                label="Orders / conversion"
                value={
                  k
                    ? `${k.orders} · ${(k.conversion * 100).toFixed(1)}%`
                    : "—"
                }
              />
              <Kpi label="Checkouts started" value={k ? String(k.checkouts) : "—"} />
              <Kpi label="Revenue" value={k ? formatPrice(k.revenue) : "—"} />
            </div>

            <section className="mt-10">
              <h2 className="font-display text-2xl font-semibold uppercase">Do this next</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(dash?.tips ?? []).map((t) => (
                  <div key={t.title} className="rounded-lg border border-border bg-surface p-5">
                    <p className="font-display font-semibold tracking-wide uppercase">{t.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{t.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-10 grid gap-8 md:grid-cols-2">
              <List title="Most viewed" rows={dash?.topViewed ?? []} />
              <List title="Most added / purchased" rows={dash?.topPurchased ?? []} />
            </div>
          </>
        )}

        {tab === "customers" && (
          <div className="mt-8 space-y-8">
            {(dash?.credits ?? []).length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-overlay font-mono text-[10px] tracking-widest text-muted uppercase">
                    <tr>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3">Reward credits (next order)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dash!.credits.map((c) => (
                      <tr key={c.user_id} className="border-t border-border">
                        <td className="px-4 py-3">{c.email ?? c.user_id}</td>
                        <td className="px-4 py-3">{formatPrice(c.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-overlay font-mono text-[10px] tracking-widest text-muted uppercase">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Ship to</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Credit</th>
                </tr>
              </thead>
              <tbody>
                {(dash?.orders ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-muted">
                      No laboratory orders yet. They appear here as soon as checkout completes.
                    </td>
                  </tr>
                ) : (
                  dash!.orders.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="px-4 py-3 font-mono text-xs">{o.id}</td>
                      <td className="px-4 py-3">
                        {o.first_name} {o.last_name}
                        {o.lab ? <span className="block text-xs text-muted">{o.lab}</span> : null}
                      </td>
                      <td className="px-4 py-3">{o.email}</td>
                      <td className="px-4 py-3 text-muted">
                        {o.address}, {o.city} {o.region} {o.postal}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{o.promo_code ?? "—"}</td>
                      <td className="px-4 py-3">{formatPrice(o.total)}</td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {o.credit_applied
                          ? `−${formatPrice(Number(o.credit_applied))}`
                          : "—"}
                        {o.credit_earned
                          ? ` · banked ${formatPrice(Number(o.credit_earned))}`
                          : ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "subs" && (
          <div className="mt-8 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-overlay font-mono text-[10px] tracking-widest text-muted uppercase">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Set</th>
                  <th className="px-4 py-3">Cadence</th>
                </tr>
              </thead>
              <tbody>
                {(dash?.subscribers ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-muted">
                      No research-set subscribers yet.
                    </td>
                  </tr>
                ) : (
                  dash!.subscribers.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-4 py-3">{s.email}</td>
                      <td className="px-4 py-3">{s.name ?? "—"}</td>
                      <td className="px-4 py-3">{s.set_name ?? "—"}</td>
                      <td className="px-4 py-3 uppercase">{s.cadence ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "affiliates" && (
          <div className="mt-8 space-y-8">
            <form
              className="grid gap-3 rounded-lg border border-border bg-surface p-5 md:grid-cols-5"
              onSubmit={async (e) => {
                e.preventDefault();
                setCodeMsg(null);
                try {
                  const r = await createPromoCode({
                    data: {
                      code: newCode.code,
                      kind: newCode.kind,
                      percent: newCode.percent,
                      partner: newCode.partner,
                      label: newCode.label,
                    },
                  });
                  if (!r.ok) {
                    setCodeMsg(r.error ?? "Could not save code.");
                    return;
                  }
                  setCodeMsg(`${r.code} saved.`);
                  setNewCode({ code: "", kind: "affiliate", percent: 10, partner: "", label: "" });
                  const d = await loadAdminDashboard();
                  setDash(d);
                } catch (err) {
                  setCodeMsg(err instanceof Error ? err.message : "Could not save code.");
                }
              }}
            >
              <label className="text-xs tracking-widest text-muted uppercase md:col-span-1">
                Code
                <input
                  className="input-field mt-1"
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                  placeholder="LAB10"
                  required
                />
              </label>
              <label className="text-xs tracking-widest text-muted uppercase">
                Kind
                <select
                  className="input-field mt-1"
                  value={newCode.kind}
                  onChange={(e) =>
                    setNewCode({ ...newCode, kind: e.target.value as "promo" | "affiliate" })
                  }
                >
                  <option value="affiliate">Affiliate</option>
                  <option value="promo">Promo</option>
                </select>
              </label>
              <label className="text-xs tracking-widest text-muted uppercase">
                Percent
                <input
                  className="input-field mt-1"
                  type="number"
                  min={1}
                  max={40}
                  step={0.5}
                  value={newCode.percent}
                  onChange={(e) => setNewCode({ ...newCode, percent: Number(e.target.value) })}
                />
              </label>
              <label className="text-xs tracking-widest text-muted uppercase">
                Partner
                <input
                  className="input-field mt-1"
                  value={newCode.partner}
                  onChange={(e) => setNewCode({ ...newCode, partner: e.target.value })}
                  placeholder="Lab name"
                />
              </label>
              <div className="flex items-end">
                <button type="submit" className="btn-primary w-full">
                  Save code
                </button>
              </div>
              {codeMsg ? (
                <p className="text-sm text-primary md:col-span-5">{codeMsg}</p>
              ) : (
                <p className="text-xs text-muted md:col-span-5">
                  Share as vitalitysupply.org/?ref=CODE — redemptions land in this table.
                </p>
              )}
            </form>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-overlay font-mono text-[10px] tracking-widest text-muted uppercase">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Kind</th>
                    <th className="px-4 py-3">Partner</th>
                    <th className="px-4 py-3">Off</th>
                    <th className="px-4 py-3">Uses</th>
                    <th className="px-4 py-3">GMV</th>
                    <th className="px-4 py-3">Discount</th>
                    <th className="px-4 py-3">Commission owed</th>
                    <th className="px-4 py-3">You keep</th>
                  </tr>
                </thead>
                <tbody>
                  {(dash?.affiliates ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-muted">
                        No promo or affiliate codes yet.
                      </td>
                    </tr>
                  ) : (
                    dash!.affiliates.map((a) => (
                      <tr key={a.code} className="border-t border-border">
                        <td className="px-4 py-3 font-mono">{a.code}</td>
                        <td className="px-4 py-3 uppercase">{a.kind}</td>
                        <td className="px-4 py-3">{a.partner ?? a.label ?? "—"}</td>
                        <td className="px-4 py-3">{a.percent}%</td>
                        <td className="px-4 py-3">{a.uses}</td>
                        <td className="px-4 py-3">{formatPrice(a.gmv)}</td>
                        <td className="px-4 py-3">{formatPrice(a.revenue)}</td>
                        <td className="px-4 py-3">{formatPrice(a.commission)}</td>
                        <td className="px-4 py-3">{formatPrice(a.net)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "margins" && <AdminPnl />}

        {tab === "investors" && <AdminInvestors />}

        {tab === "grok" && (
          <div className="mt-8 space-y-6">
            <p className="max-w-3xl text-sm leading-relaxed text-muted">
              The optimizer reads live views, carts, and orders while this desk is
              open. It reorders bestsellers automatically. It will not write medical claims or
              remove the research-use attestation.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {(dash?.grok?.actions ?? []).map((a) => (
                <div key={a.title} className="rounded-lg border border-border bg-surface p-5">
                  <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                    {a.applied ? "Applied" : "Needs you"}
                  </p>
                  <p className="font-display mt-2 font-semibold tracking-wide uppercase">{a.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{a.body}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-overlay font-mono text-[10px] tracking-widest text-muted uppercase">
                  <tr>
                    <th className="px-4 py-3">Compound</th>
                    <th className="px-4 py-3">Views</th>
                    <th className="px-4 py-3">Carts</th>
                    <th className="px-4 py-3">Buys</th>
                    <th className="px-4 py-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(dash?.grok?.merch ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-muted">
                        Waiting for traffic. Browse the catalog and add to cart to teach it.
                      </td>
                    </tr>
                  ) : (
                    dash!.grok.merch.map((r) => (
                      <tr key={r.productId} className="border-t border-border">
                        <td className="px-4 py-3">{r.productName}</td>
                        <td className="px-4 py-3">{r.views}</td>
                        <td className="px-4 py-3">{r.carts}</td>
                        <td className="px-4 py-3">{r.purchases}</td>
                        <td className="px-4 py-3 font-mono">{r.score}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "ads" && (
          <div className="mt-8 space-y-10">
            <section className="rounded-lg border border-border bg-surface p-6">
              <h2 className="font-display text-xl font-semibold uppercase">First bestseller ad</h2>
              <p className="mt-2 text-sm text-muted">
                Square 1080 — the format Meta / native that converts in this niche: black studio,
                one vial, HPLC, RUO, no bodies. Download and upload to the ad account.
              </p>
              <img
                src="/ads/sema-hero.jpg?v=9"
                alt="Semaglutide research-use ad"
                className="mt-4 max-h-80 rounded-md border border-border object-contain"
              />
              <a
                href="/ads/sema-hero.jpg"
                download="vitality-semaglutide-5mg-ad.jpg"
                className="btn-primary mt-4 inline-flex"
              >
                Download 1080×1080
              </a>
              <p className="mt-3 font-mono text-xs text-muted">
                Primary text: HPLC-documented Semaglutide 5 mg · $69.99 · Research use only. Not
                for human consumption. 21+ laboratories.
              </p>
            </section>
            <p className="max-w-3xl text-sm leading-relaxed text-muted">
              Competitors that convert (Peptide Sciences–style catalogs) win on HPLC/COA language,
              CAS pages, and research-intent search — not “weight loss peptide” ads, which Google
              and Meta reject and which would also be illegal consumer-drug advertising. Copy below
              is RUO-compliant. I cannot place ads or buy backlinks from here; paste this into your
              ad accounts and outreach.
            </p>
            {AD_ANGLES.map((a) => (
              <section key={a.channel} className="rounded-lg border border-border bg-surface p-6">
                <h2 className="font-display text-xl font-semibold uppercase">{a.channel}</h2>
                <p className="mt-2 text-sm text-muted">{a.note}</p>
                <ul className="mt-4 space-y-1 text-sm">
                  {a.headlines.map((h) => (
                    <li key={h} className="font-medium">
                      {h}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 space-y-2 text-sm text-muted">
                  {a.descriptions.map((d) => (
                    <p key={d}>{d}</p>
                  ))}
                </div>
              </section>
            ))}
            <section>
              <h2 className="font-display text-xl font-semibold uppercase">Long-tail keywords</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {LONG_TAIL_KEYWORDS.map((kword) => (
                  <span
                    key={kword}
                    className="rounded-sm border border-border bg-overlay px-2 py-1 font-mono text-xs"
                  >
                    {kword}
                  </span>
                ))}
              </div>
            </section>
            <section>
              <h2 className="font-display text-xl font-semibold uppercase">
                High-DA / DR backlink targets
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {BACKLINK_TARGETS.map((b) => (
                  <div key={b.type} className="rounded-lg border border-border p-5">
                    <p className="font-display font-semibold uppercase">{b.type}</p>
                    <p className="mt-2 text-sm text-muted">{b.why}</p>
                    <p className="mt-2 text-sm">{b.pitch}</p>
                  </div>
                ))}
              </div>
              <pre className="mt-6 overflow-x-auto rounded-lg border border-border bg-overlay p-4 text-xs leading-relaxed whitespace-pre-wrap">
                {OUTREACH_EMAIL}
              </pre>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="font-mono text-[10px] tracking-widest text-muted uppercase">{label}</p>
      <p className="font-display mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function List({ title, rows }: { title: string; rows: { name: string; n: number }[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-semibold uppercase">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {rows.length === 0 ? (
          <li className="text-muted">Waiting for traffic.</li>
        ) : (
          rows.map((r) => (
            <li key={r.name} className="flex justify-between gap-3">
              <span>{r.name}</span>
              <span className="font-mono text-muted">{r.n}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
