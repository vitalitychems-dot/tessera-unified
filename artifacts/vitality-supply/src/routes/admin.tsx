import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isAdminEmail, BUSINESS, formatAddress } from "@/lib/business";
import {
  createPromoCode,
  listAdminCustomers,
  loadAdminCustomer,
  loadAdminDashboard,
} from "@/lib/store-api";
import { formatPrice } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { AdminPnl } from "@/components/admin-pnl";
import { AdminInvestors } from "@/components/admin-investors";
import { AdminOrders } from "@/components/admin-orders";
import { AdminPaymentSettings } from "@/components/admin-payment-settings";
import { AdminSubscribers } from "@/components/admin-subscribers";
import { AdminAiManager } from "@/components/admin-ai-manager";
import { AdminOperations } from "@/components/admin-operations";
import { noindexSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/admin")({
  component: Admin,
  head: () =>
    noindexSeoHead({
      title: "Staff analytics",
      description: "Private Vitality Chems staff analytics and operations dashboard.",
      path: "/admin",
    }),
});

type Dash = Awaited<ReturnType<typeof loadAdminDashboard>>;
type CustomerPage = Awaited<ReturnType<typeof listAdminCustomers>>;
type CustomerDetail = Awaited<ReturnType<typeof loadAdminCustomer>>;
type ManagerSection = "manager" | "approvals" | "content";

function Admin() {
  const { user, isPending } = useCurrentUserState();
  const [tab, setTab] = useState<
    | "live"
    | "orders"
    | "operations"
    | "customers"
    | "subs"
    | "affiliates"
    | "ads"
    | "margins"
    | "payments"
    | "investors"
    | "grok"
    | "manager"
  >("manager");
  const [managerSection, setManagerSection] = useState<ManagerSection>("manager");
  const [dash, setDash] = useState<Dash | null>(null);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerData, setCustomerData] = useState<CustomerPage | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);
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
      if (document.hidden) return;
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
    const onVisibility = () => {
      if (!document.hidden) pull();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const t = setInterval(pull, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !isAdminEmail(user.primaryEmail) || !user.emailVerified || tab !== "customers") {
      return;
    }
    let cancelled = false;
    listAdminCustomers({
      data: { page: customerPage, pageSize: 25, search: customerSearch },
    })
      .then((value) => {
        if (!cancelled) {
          setCustomerData(value);
          setCustomerError(null);
        }
      })
      .catch((cause: Error) => {
        if (!cancelled) setCustomerError(cause.message);
      });
    return () => {
      cancelled = true;
    };
  }, [user, tab, customerPage, customerSearch]);

  useEffect(() => {
    if (!selectedCustomerId || tab !== "customers") {
      setCustomerDetail(null);
      return;
    }
    let cancelled = false;
    loadAdminCustomer({
      data: { userId: selectedCustomerId, page: 1, pageSize: 25 },
    })
      .then((value) => {
        if (!cancelled) {
          setCustomerDetail(value);
          setCustomerError(null);
        }
      })
      .catch((cause: Error) => {
        if (!cancelled) setCustomerError(cause.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCustomerId, tab]);

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
          <Link to="/login" rel="nofollow" className="btn-primary mt-8 inline-flex">
            Staff sign in
          </Link>
        </main>
      </div>
    );
  }
  if (!user.emailVerified) {
    return (
      <div className="min-h-dvh bg-bg text-fg">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-6 pt-8">
          <h1 className="font-display text-3xl font-semibold uppercase">Verify staff email</h1>
          <p className="mt-4 text-sm text-muted">
            Verify {user.primaryEmail ?? BUSINESS.email} before opening staff data.
          </p>
          <div className="mt-6">
            <UserButton />
          </div>
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
              Operator workspace
            </h1>
            <p className="mt-2 text-sm text-muted">
              {BUSINESS.name} · {formatAddress()} · live desk
            </p>
             <p className="mt-1 text-xs text-muted">
               Live-only Chicago-day funnel · refreshed {k?.lastUpdatedAt ? new Date(k.lastUpdatedAt).toLocaleTimeString() : "waiting"}
             </p>
          </div>
          <UserButton />
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {(
            [
              ["manager", "Manager workspace"],
              ["live", "Live funnel"],
              ["orders", "Orders"],
              ["operations", "Operations"],
              ["customers", "Customers"],
              ["subs", "Subscribers"],
              ["affiliates", "Affiliates"],
              ["margins", "P&L sheet"],
              ["payments", "Payments"],
              ["investors", "Investors"],
              ["grok", "Merch optimizer"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (id === "manager") setManagerSection("manager");
                setTab(id);
              }}
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
                label="Paid orders / conversion"
                value={
                  k
                    ? `${k.orders} · ${(k.conversion * 100).toFixed(1)}%`
                    : "—"
                }
              />
              <Kpi label="Checkouts started" value={k ? String(k.checkouts) : "—"} />
              <Kpi label="Paid revenue" value={k ? formatPrice(k.revenue) : "—"} />
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
            <section className="rounded-lg border border-border bg-surface p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold uppercase">Customers</h2>
                  <p className="mt-1 text-xs text-muted">
                    Contact details come from the customer account and their latest collected order.
                  </p>
                </div>
                <label className="text-xs tracking-widest text-muted uppercase">
                  Search name or email
                  <input
                    className="input-field mt-1 min-w-64"
                    value={customerSearch}
                    onChange={(event) => {
                      setCustomerSearch(event.target.value);
                      setCustomerPage(1);
                    }}
                    placeholder="customer@example.com"
                  />
                </label>
              </div>
              {customerError ? <p className="mt-4 text-sm text-red-400">{customerError}</p> : null}
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-overlay font-mono text-[10px] tracking-widest text-muted uppercase">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Address</th>
                      <th className="px-4 py-3">Credits</th>
                      <th className="px-4 py-3">Orders</th>
                      <th className="px-4 py-3">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(customerData?.customers ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-muted">
                          No customer accounts found.
                        </td>
                      </tr>
                    ) : (
                      customerData?.customers.map((customer) => (
                        <tr key={customer.id} className="border-t border-border align-top">
                          <td className="px-4 py-3">
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-muted">{customer.email}</p>
                            {!customer.emailVerified ? (
                              <p className="text-[11px] text-amber-600">Email not verified</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">{customer.phone ?? "—"}</td>
                          <td className="max-w-64 px-4 py-3 text-muted">
                            {customer.address
                              ? `${customer.address}, ${customer.city ?? ""} ${customer.region ?? ""} ${customer.postal ?? ""}`.trim()
                              : "—"}
                          </td>
                          <td className="px-4 py-3">{formatPrice(customer.credits)}</td>
                          <td className="px-4 py-3">{customer.orderCount}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="text-primary underline-offset-4 hover:underline"
                              onClick={() => setSelectedCustomerId(customer.id)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pager
                page={customerData?.page ?? customerPage}
                hasNext={customerData?.hasNext ?? false}
                onPrevious={() => setCustomerPage((page) => Math.max(1, page - 1))}
                onNext={() => setCustomerPage((page) => page + 1)}
              />
            </section>
            {customerDetail ? (
              <CustomerDetailPanel
                detail={customerDetail}
                onReveal={async () => {
                  if (!selectedCustomerId) return;
                  try {
                    const value = await loadAdminCustomer({
                      data: { userId: selectedCustomerId, page: 1, pageSize: 25, reveal: true },
                    });
                    setCustomerDetail(value);
                    setCustomerError(null);
                  } catch (cause) {
                    setCustomerError(cause instanceof Error ? cause.message : "Could not reveal customer details.");
                  }
                }}
                onClose={() => {
                  setSelectedCustomerId(null);
                  setCustomerDetail(null);
                }}
              />
            ) : null}
          </div>
        )}

        {tab === "orders" && <AdminOrders />}
        {tab === "operations" && <AdminOperations />}

        {tab === "payments" && <AdminPaymentSettings />}

        {tab === "subs" && (
          <div className="mt-8 space-y-10">
            <AdminSubscribers />
            <section>
              <h2 className="font-display text-2xl font-semibold uppercase">COA requests</h2>
              <p className="mt-2 text-sm text-muted">
                Certificate-of-analysis tickets submitted from the Testing page. Reply from{" "}
                {BUSINESS.email}.
              </p>
              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-overlay font-mono text-[10px] tracking-widest text-muted uppercase">
                    <tr>
                      <th className="px-4 py-3">Received</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Compound</th>
                      <th className="px-4 py-3">Batch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dash?.coaRequests ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-muted">
                          No COA requests yet.
                        </td>
                      </tr>
                    ) : (
                      dash!.coaRequests.map((s) => (
                        <tr key={s.id} className="border-t border-border">
                          <td className="px-4 py-3 whitespace-nowrap text-muted">
                            {new Date(s.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <a className="text-primary hover:underline" href={`mailto:${s.email}`}>
                              {s.email}
                            </a>
                          </td>
                          <td className="px-4 py-3">{s.compound}</td>
                          <td className="px-4 py-3">{s.batch ?? "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
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
                   Share as vitalitychems.com/?ref=CODE — redemptions land in this table.
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
              Scores come from real first-party events only: product views and add-to-carts from
              visitors, and purchases recorded when an order is actually paid. Nothing here changes
              the storefront by itself — Best sellers order is curated in the catalog, and the
              research-use attestation is never touched.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {(dash?.grok?.actions ?? []).map((a) => (
                <div key={a.title} className="rounded-lg border border-border bg-surface p-5">
                  <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                    {a.applied ? "Observation" : "Suggested action"}
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

        {tab === "manager" && (
          <AdminAiManager
            initialSection={managerSection}
            onNavigate={(nextTab) => setTab(nextTab)}
          />
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

function Pager({
  page,
  hasNext,
  onPrevious,
  onNext,
}: {
  page: number;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-xs">
      <span className="mr-2 text-muted">Page {page}</span>
      <button
        type="button"
        className="rounded border border-border px-3 py-2 disabled:opacity-40"
        onClick={onPrevious}
        disabled={page <= 1}
      >
        Previous
      </button>
      <button
        type="button"
        className="rounded border border-border px-3 py-2 disabled:opacity-40"
        onClick={onNext}
        disabled={!hasNext}
      >
        Next
      </button>
    </div>
  );
}

function CustomerDetailPanel({
  detail,
  onReveal,
  onClose,
}: {
  detail: CustomerDetail;
  onReveal: () => void | Promise<void>;
  onClose: () => void;
}) {
  const { customer, orders } = detail;
  const privateVisible = !customer.email.includes("••");
  const address = customer.address
    ? `${customer.address}, ${customer.city ?? ""} ${customer.region ?? ""} ${customer.postal ?? ""}, ${customer.country ?? ""}`.trim()
    : "No shipping address collected";
  return (
    <section className="rounded-lg border border-primary/40 bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary uppercase">Customer detail</p>
          <h2 className="font-display mt-1 text-2xl font-semibold uppercase">{customer.name}</h2>
          <p className="mt-1 text-sm text-muted">{customer.email}</p>
          {!privateVisible ? (
            <button type="button" className="btn-secondary mt-3" onClick={() => void onReveal()}>
              Reveal private details
            </button>
          ) : (
            <p className="mt-3 text-xs text-amber-200">
              Private details are revealed for this staff session. Close the panel to conceal them again.
            </p>
          )}
        </div>
        <button type="button" className="text-sm text-primary hover:underline" onClick={onClose}>
          Close detail
        </button>
      </div>
      <p className="mt-4 rounded border border-border bg-overlay px-3 py-2 text-xs text-muted">
                   Passwords cannot be viewed by staff. Vitality Chems never displays or returns passwords or
        password hashes.
      </p>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs tracking-widest text-muted uppercase">Phone</dt>
          <dd className="mt-1">{customer.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-widest text-muted uppercase">Reward credits</dt>
          <dd className="mt-1">{formatPrice(customer.credits)}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-widest text-muted uppercase">Shipping address</dt>
          <dd className="mt-1">{address}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-widest text-muted uppercase">Business email</dt>
          <dd className="mt-1">{customer.businessEmail ?? "—"}</dd>
        </div>
      </dl>
      <h3 className="font-display mt-8 text-xl font-semibold uppercase">Order history</h3>
      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No orders are associated with this customer.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-overlay font-mono text-[10px] tracking-widest text-muted uppercase">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Ship to</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Items</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                let itemSummary = "Items unavailable";
                try {
                  const items = JSON.parse(order.items) as { name?: string; dose?: string; qty?: number }[];
                  itemSummary = items
                    .map((item) => `${item.name ?? "Item"} ${item.dose ?? ""} × ${item.qty ?? 0}`)
                    .join(", ");
                } catch {
                  // Keep the order row visible when legacy item JSON is malformed.
                }
                return (
                  <tr key={order.id} className="border-t border-border align-top">
                    <td className="px-3 py-3">
                      <p className="font-mono text-xs">{order.reference ?? order.id}</p>
                      <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleString()}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p>{order.name}</p>
                      <p className="text-xs text-muted">{order.email}</p>
                      <p className="text-xs text-muted">{order.phone ?? "—"}</p>
                    </td>
                    <td className="max-w-64 px-3 py-3 text-muted">
                      {order.address}, {order.city} {order.region ?? ""} {order.postal}
                    </td>
                    <td className="px-3 py-3">
                      {formatPrice(order.total)}
                      {order.creditEarned > 0 ? (
                        <span className="block text-xs text-muted">
                          +{formatPrice(order.creditEarned)} credit
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {order.paymentStatus} / {order.status}
                    </td>
                    <td className="max-w-64 px-3 py-3 text-xs text-muted">{itemSummary}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
