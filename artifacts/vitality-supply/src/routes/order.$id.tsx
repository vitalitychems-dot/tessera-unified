import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";
import { claimPayment, loadOrder, refreshCryptoQuote } from "@/lib/store-api";
import { formatPrice } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { noindexSeoHead } from "@/lib/seo";
import { amountBucket, trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/order/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    k: String(search.k ?? ""),
    // Stripe returns to `?paid=1`; the router's search parser yields the number 1.
    paid: search.paid === "1" || search.paid === 1 || search.paid === true,
  }),
  component: OrderPage,
  head: ({ params }) =>
    noindexSeoHead({
      title: "Order status",
      description: "Private order status.",
      path: `/order/${params.id}`,
    }),
});

type Order = Awaited<ReturnType<typeof loadOrder>>;
type OrderItem = { productId: string; dose: string; name: string; qty: number; lineCents: number };

const STEPS = ["Pending payment", "Payment reported", "Paid", "Shipped"] as const;
const purchasesReportedWithoutStorage = new Set<string>();

function progressIndex(order: Order): number {
  if (order.status === "shipped") return 3;
  if (order.payment_status === "paid") return 2;
  if (order.payment_status === "claimed") return 1;
  return 0;
}

function OrderPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState("");
  const orderStatusReportedRef = useRef("");

  const reload = () =>
    loadOrder({ data: { id, accessKey: search.k, paid: search.paid } })
      .then((value) => {
        setOrder(value);
        const status =
          value.status === "cancelled"
            ? "cancelled"
            : value.status === "shipped"
              ? "shipped"
              : value.payment_status === "paid"
                ? "paid"
                : value.payment_status === "claimed"
                  ? "claimed"
                  : "pending";
        if (orderStatusReportedRef.current !== status) {
          orderStatusReportedRef.current = status;
          trackEvent("order_status_viewed", { status });
        }
      })
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, search.k, search.paid]);

  // Poll while staff confirmation is still outstanding.
  useEffect(() => {
    if (!order || order.payment_status === "paid" || order.status === "shipped") return;
    const timer = window.setInterval(reload, 15_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.payment_status, order?.status]);

  useEffect(() => {
    if (!order || !["bitcoin", "ethereum"].includes(order.payment_method) || !order.btc_address) return;
    const uri = order.payment_method === "ethereum"
      ? `ethereum:${order.btc_address}`
      : `bitcoin:${order.btc_address}?amount=${order.btc_amount}&label=Vitality%20Chems`;
    QRCode.toDataURL(uri)
      .then(setQr)
      .catch((e: Error) => setError(e.message));
  }, [order?.btc_address, order?.btc_amount, order?.payment_method]);

  useEffect(() => {
    if (!order || order.payment_status !== "paid" || order.status === "cancelled") return;
    const storageKey = `vitality-purchase:${id}`;
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // A storage failure should not prevent the authoritative order page or
      // cause repeated reports during the same page session.
      if (purchasesReportedWithoutStorage.has(id)) return;
      purchasesReportedWithoutStorage.add(id);
    }
    trackEvent("purchase_completed", {
      payment_method: order.payment_method ?? "unknown",
      amount_bucket: amountBucket(Number(order.total) * 100),
    });
  }, [id, order]);

  if (error) {
    return (
      <Shell>
        <p className="rounded-md border border-red-400/40 p-5 text-red-300">{error}</p>
      </Shell>
    );
  }
  if (!order) {
    return (
      <Shell>
        <p>Loading secure order…</p>
      </Shell>
    );
  }

  const runAction = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setActionError("");
    try {
      await action();
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const claim = () => runAction(() => claimPayment({ data: { id, accessKey: search.k } }));
  const refreshRate = () =>
    runAction(() => refreshCryptoQuote({ data: { id, accessKey: search.k } }));

  const total = Number(order.total);
  const awaitingPayment = order.payment_status !== "paid" && order.status !== "cancelled";
  const claimed = order.payment_status === "claimed";
  const expired = order.btc_quote_expires_at
    ? Date.parse(order.btc_quote_expires_at) <= Date.now()
    : false;
  const progress = progressIndex(order);

  return (
    <Shell>
      <p className="font-mono text-xs tracking-widest text-primary uppercase">{order.reference}</p>
      <h1 className="font-display mt-2 text-3xl font-semibold uppercase">Order status</h1>

      {order.status === "cancelled" ? (
        <p className="mt-6 rounded-md border border-red-400/40 p-4 text-sm text-red-300">
          This order was cancelled. Any lab credit applied to it has been returned to your account.
        </p>
      ) : (
        <ol className="mt-6 grid grid-cols-4 gap-2 text-center text-xs" aria-label="Order progress">
          {STEPS.map((step, i) => (
            <li
              key={step}
              aria-current={progress === i ? "step" : undefined}
              className={`rounded border p-3 ${
                progress >= i ? "border-primary bg-primary/10 text-primary" : "border-border text-muted"
              }`}
            >
              {step}
            </li>
          ))}
        </ol>
      )}

      {awaitingPayment && (
        <section className="mt-6 rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-sm font-semibold tracking-wide uppercase">What happens next</h2>
          <ol className="mt-3 space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="font-mono text-primary">1</span>
              <span>
                {order.payment_method === "stripe"
                  ? "Complete payment on Stripe’s secure page."
                  : "Send the exact payment using the details on this page, then report it below."}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-primary">2</span>
              <span>
                We confirm payment. Card confirmation is instant; Zelle and crypto are confirmed
                manually during business hours.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-primary">3</span>
              <span>Your order is packed and shipped, with tracking emailed and posted on this page.</span>
            </li>
          </ol>
        </section>
      )}

      {order.payment_method === "zelle" && awaitingPayment && (
        <section className="mt-8 rounded-lg border border-primary/40 bg-surface p-6">
          <h2 className="font-display text-xl uppercase">Pay with Zelle</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted">Amount</dt>
              <dd className="text-lg font-semibold">{formatPrice(total)}</dd>
            </div>
            <div>
              <dt className="text-muted">Send to</dt>
              <dd>
                {order.zelleRecipient ? (
                  <>
                    <span className="font-mono text-base text-primary">{order.zelleRecipient}</span>
                    {order.zelleDisplayName && (
                      <span className="block text-muted">
                        The recipient will show as <strong className="text-fg">{order.zelleDisplayName}</strong>.
                      </span>
                    )}
                    <Copy value={order.zelleRecipient} label="Copy recipient" />
                  </>
                ) : (
                  <span className="text-red-300">
                    Zelle details are being updated — email us with your order reference and we will send them.
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Required memo</dt>
              <dd>
                <span className="font-mono text-base">{order.reference}</span>
                <Copy value={order.reference} label="Copy memo" />
              </dd>
            </div>
          </dl>
          {order.paymentNotice && <p className="mt-4 text-xs text-muted">{order.paymentNotice}</p>}
          <ClaimControls claimed={claimed} busy={busy} onClaim={claim} />
        </section>
      )}

      {order.payment_method === "bitcoin" && awaitingPayment && (
        <section className="mt-8 rounded-lg border border-primary/40 bg-surface p-6">
          <h2 className="font-display text-xl uppercase">Pay with Bitcoin</h2>
          {qr && (
            <img className="mt-4 h-48 w-48 rounded bg-white p-2" src={qr} alt="Bitcoin payment QR code" />
          )}
          <p className="mt-4 font-mono text-lg text-primary">{String(order.btc_amount)} BTC</p>
          <Copy value={String(order.btc_amount)} label="Copy amount" />
          <p className="mt-3 text-sm break-all">{order.btc_address}</p>
          <Copy value={order.btc_address ?? ""} label="Copy address" />
          <p className="mt-3 text-xs text-muted">
            {expired
              ? "Quote expired. Refresh before sending."
              : `Rate locked until ${new Date(order.btc_quote_expires_at!).toLocaleString()}.`}
          </p>
          {order.paymentNotice && <p className="mt-3 text-xs text-muted">{order.paymentNotice}</p>}
          {expired && !claimed && (
            <button type="button" className="btn-primary mt-4" onClick={refreshRate} disabled={busy}>
              Refresh rate
            </button>
          )}
          <ClaimControls claimed={claimed} busy={busy || expired} onClaim={claim} />
        </section>
      )}

      {order.payment_method === "ethereum" && awaitingPayment && (
        <section className="mt-8 rounded-lg border border-primary/40 bg-surface p-6">
          <h2 className="font-display text-xl uppercase">Pay with Ethereum</h2>
          {qr && (
            <img className="mt-4 h-48 w-48 rounded bg-white p-2" src={qr} alt="Ethereum payment QR code" />
          )}
          <p className="mt-4 font-mono text-lg text-primary">{String(order.crypto_amount)} ETH</p>
          <Copy value={String(order.crypto_amount)} label="Copy amount" />
          <p className="mt-3 text-sm break-all">{order.eth_address}</p>
          <Copy value={order.eth_address ?? ""} label="Copy address" />
          <p className="mt-3 text-xs text-muted">
            {expired
              ? "Quote expired. Refresh before sending."
              : `Rate locked until ${new Date(order.crypto_quote_expires_at!).toLocaleString()}. Send ETH on the Ethereum network only.`}
          </p>
          {order.paymentNotice && <p className="mt-3 text-xs text-muted">{order.paymentNotice}</p>}
          {expired && !claimed && (
            <button type="button" className="btn-primary mt-4" onClick={refreshRate} disabled={busy}>
              Refresh rate
            </button>
          )}
          <ClaimControls claimed={claimed} busy={busy || expired} onClaim={claim} />
        </section>
      )}

      {actionError && (
        <p className="mt-4 rounded-md border border-red-400/40 p-4 text-sm text-red-300" role="alert">
          {actionError}
        </p>
      )}

      {order.payment_status === "paid" && order.status !== "shipped" && (
        <p className="mt-8 rounded-md border border-primary/40 bg-primary/10 p-4 text-sm text-primary">
          Payment confirmed. Your order is being packed; tracking appears here once it ships.
        </p>
      )}
      {order.status === "shipped" && (
        <p className="mt-8 rounded-md border border-primary/40 bg-primary/10 p-4 text-sm text-primary">
          Shipped{order.tracking ? ` — tracking ${order.tracking}` : ""}.
        </p>
      )}

      <section className="mt-8 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-xl uppercase">Summary</h2>
        <ul className="mt-3 divide-y divide-border">
          {(order.items as OrderItem[]).map((item) => (
            <li key={`${item.productId}-${item.dose}`} className="flex justify-between py-3 text-sm">
              <span>
                {item.name} · {item.dose} × {item.qty}
              </span>
              <span>{formatPrice(item.lineCents / 100)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
        {Number(order.credit_earned) > 0 && order.status !== "cancelled" && (
          <p className="mt-4 rounded bg-primary/10 p-4 text-primary">
            You’ll earn {formatPrice(Number(order.credit_earned))} lab credit when this order is paid.
          </p>
        )}
      </section>
    </Shell>
  );
}

function ClaimControls({
  claimed,
  busy,
  onClaim,
}: {
  claimed: boolean;
  busy: boolean;
  onClaim: () => void;
}) {
  if (claimed) {
    return (
      <p className="mt-5 rounded-md border border-primary/40 bg-primary/10 p-4 text-sm text-primary">
        Thanks — payment reported. We confirm manual payments during business hours and this page
        updates automatically once it clears.
      </p>
    );
  }
  return (
    <>
      <button type="button" onClick={onClaim} disabled={busy} className="btn-primary mt-5">
        {busy ? "Saving…" : "I’ve sent the payment"}
      </button>
      <p className="mt-2 text-xs text-muted">
        Tap this after sending so we know to look for it. Leave the page open or come back any time.
      </p>
    </>
  );
}

function Copy({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="mt-1 block text-xs text-primary hover:underline"
      onClick={() => {
        navigator.clipboard
          .writeText(value)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => setCopied(false));
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 pt-8 pb-20">{children}</main>
    </div>
  );
}
