import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isAdminEmail } from "@/lib/business";
import { loadMyAccount, createMyAffiliateCode } from "@/lib/store-api";
import { CREDIT_RATE } from "@/lib/pricing";
import { formatPrice } from "@/lib/utils";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/account")({ component: Account });

type AccountData = Awaited<ReturnType<typeof loadMyAccount>>;

function Account() {
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<AccountData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadMyAccount()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [user]);

  if (isPending) {
    return (
      <div className="min-h-dvh bg-bg text-fg">
        <SiteHeader active="signin" />
        <main className="mx-auto max-w-3xl px-6 pt-8">
          <div className="h-24 animate-pulse rounded-lg bg-surface" />
        </main>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader active="signin" />
      <main className="mx-auto max-w-3xl px-6 pt-8 pb-20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-widest text-primary uppercase">Lab account</p>
            <h1 className="font-display mt-2 text-3xl font-semibold tracking-wide uppercase">
              Your credit
            </h1>
            <p className="mt-2 text-sm text-muted">
              {user.primaryEmail ?? user.displayName}
            </p>
          </div>
          <UserButton />
        </div>

        {isAdminEmail(user.primaryEmail) && (
          <Link to="/admin" className="mt-4 inline-flex text-sm text-primary hover:underline">
            Open staff analytics →
          </Link>
        )}

        <section className="mt-8 rounded-lg border border-border bg-surface p-6">
          <p className="font-mono text-[10px] tracking-widest text-muted uppercase">
            Available reward credits
          </p>
          <p className="font-display mt-2 text-5xl font-semibold tabular-nums text-primary">
            {formatPrice(data?.balance ?? 0)}
          </p>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
            {Math.round(CREDIT_RATE * 100)}% of merchandise (after bulk and promo) lands here as
            reward credits after each paid order. Spend them on the next catalog order — never the
            same invoice that earned them.
          </p>
          <Link to="/" className="btn-primary mt-6 inline-flex">
            Shop with credit
          </Link>
        </section>

        <section className="mt-10 rounded-lg border border-primary/40 bg-surface p-6">
          <h2 className="font-display text-xl font-semibold tracking-wide uppercase">
            Your affiliate code
          </h2>
          <p className="mt-2 text-sm text-muted">
            Buyers save 5%. You earn 10–15% back as lab credit (12.5% after $1k referred, 15% after
            $5k). Credit spends on a later order.
          </p>
          {data?.affiliates?.length ? (
            <ul className="mt-4 space-y-2">
              {data.affiliates.map((a) => (
                <li key={a.code} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="font-mono font-semibold text-primary">{a.code}</span>
                  <span className="text-xs text-muted">
                    {a.redemptions} orders · {formatPrice(a.merch)} referred
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await createMyAffiliateCode({ data: { code } });
              if (res.ok) {
                setCodeMsg(`Code ${res.code} is live.`);
                setCode("");
                loadMyAccount().then(setData);
              } else setCodeMsg(res.error ?? "Could not create.");
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. LABDESK"
              className="input-field flex-1"
            />
            <button type="submit" className="btn-primary">
              Create
            </button>
          </form>
          {codeMsg && <p className="mt-2 text-sm text-primary">{codeMsg}</p>}
        </section>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold tracking-wide uppercase">
            Credit activity
          </h2>
          {!data?.ledger.length ? (
            <p className="mt-3 text-sm text-muted">
              No credits yet. Place a research order while signed in to start the balance.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
              {data.ledger.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium capitalize">{row.reason}</p>
                    <p className="font-mono text-[11px] text-muted">
                      {row.order_id ?? "—"} · {new Date(row.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={
                      row.delta >= 0 ? "font-mono text-primary tabular-nums" : "font-mono tabular-nums"
                    }
                  >
                    {row.delta >= 0 ? "+" : ""}
                    {formatPrice(row.delta)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold tracking-wide uppercase">Orders</h2>
          {!data?.orders.length ? (
            <p className="mt-3 text-sm text-muted">No catalog orders on this account yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
              {data.orders.map((o) => (
                <li key={o.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-sm">{o.id}</p>
                    <p className="font-mono text-sm tabular-nums">{formatPrice(o.total)}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(o.created_at).toLocaleString()} · {o.status}
                    {o.credit_earned > 0 ? ` · banked ${formatPrice(o.credit_earned)}` : ""}
                    {o.credit_applied > 0 ? ` · spent ${formatPrice(o.credit_applied)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
