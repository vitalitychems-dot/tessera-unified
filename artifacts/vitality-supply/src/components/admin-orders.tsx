import { useEffect, useState } from "react";
import {
  approveFirstOrderReview,
  cancelOrder,
  listOrders,
  markOrderPaid,
  markOrderShipped,
} from "@/lib/store-api";
import { formatPrice } from "@/lib/utils";

type Orders = Awaited<ReturnType<typeof listOrders>>;
type OrderItem = { name: string; dose: string; qty: number };

const STATUSES = ["pending_payment", "paid", "shipped", "cancelled"];
const METHODS = ["stripe", "zelle", "bitcoin", "ethereum"];

function paymentLabel(method: string) {
  return method === "ethereum" ? "Ethereum" : method === "bitcoin" ? "Bitcoin" : method === "zelle" ? "Zelle" : "Stripe";
}

export function AdminOrders() {
  const [orders, setOrders] = useState<Orders>([]);
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = () =>
    listOrders({ data: { status, method } })
      .then((rows) => {
        setOrders(rows);
        setError("");
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoaded(true));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, method]);

  return (
    <section className="min-w-0 rounded-lg border border-border bg-surface p-4 sm:p-6">
      <h2 className="font-display text-xl font-semibold uppercase">Orders</h2>
      <p className="mt-2 text-sm text-muted">
        Zelle and Bitcoin orders wait here until you confirm the money arrived. Enter the Zelle
        confirmation number or the Bitcoin transaction ID, then mark the order paid — that is what
        releases the customer&apos;s lab credit. First paid orders also require an explicit
        research-use review approval before they can be marked shipped. This table reads persisted
        order records; review any QA or test-labeled record before taking a fulfillment action.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <select
          className="input-field w-full sm:w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          className="input-field w-full sm:w-auto"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          aria-label="Filter by payment method"
        >
          <option value="">All methods</option>
          {METHODS.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      {error && (
        <p className="mt-3 text-red-300" role="alert">
          {error}
        </p>
      )}
      <div className="mt-5 min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="text-xs text-muted uppercase">
            <tr>
              <th className="p-2">Order</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loaded && orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted">
                  {status || method ? "No orders match these filters." : "No orders yet."}
                </td>
              </tr>
            ) : (
              orders.map((order) => <OrderRow key={order.id} order={order} reload={load} />)
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OrderRow({ order, reload }: { order: Orders[number]; reload: () => Promise<void> }) {
  const [ref, setRef] = useState("");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState("");

  let items: OrderItem[] = [];
  try {
    items = JSON.parse(order.items);
  } catch {
    // Malformed JSON: the row still renders, just without the item list.
  }

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setRowError("");
    try {
      await action();
      await reload();
    } catch (e) {
      setRowError(e instanceof Error ? e.message : "The update failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const manual = ["zelle", "bitcoin"].includes(order.payment_method);
  const canMarkPaid = manual && order.payment_status !== "paid" && order.status !== "cancelled";
  const reviewPending = order.first_order_review_required && order.first_order_review_status !== "approved";
  const canApproveReview = reviewPending && order.payment_status === "paid" && order.status !== "cancelled";
  const canShip = order.payment_status === "paid" && order.status !== "shipped" && !reviewPending && !order.payment_hold;
  const canCancel = order.payment_status !== "paid" && order.status !== "cancelled";

  return (
    <tr className="border-t border-border align-top">
      <td className="p-2">
        <details>
          <summary className="cursor-pointer font-mono text-primary">{order.reference}</summary>
          <ul className="mt-2 text-xs text-muted">
            {items.map((item) => (
              <li key={`${item.name}-${item.dose}`}>
                {item.name} {item.dose} × {item.qty}
              </li>
            ))}
          </ul>
        </details>
        <span className="text-xs text-muted">{new Date(order.created_at).toLocaleString()}</span>
      </td>
      <td>
        {order.first_name} {order.last_name}
        <br />
        <span className="text-xs text-muted">{order.email}</span>
      </td>
      <td>
        {formatPrice(Number(order.total))}
        <br />
        <span className="rounded bg-overlay px-2 py-1 text-xs">{paymentLabel(order.payment_method)}</span>
      </td>
      <td>
        <span className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
          {order.payment_status} / {order.status}
        </span>
        {order.payment_ref && (
          <span className="mt-1 block font-mono text-[11px] text-muted">ref {order.payment_ref}</span>
        )}
        {order.tracking && (
          <span className="mt-1 block font-mono text-[11px] text-muted">trk {order.tracking}</span>
        )}
        {order.payment_alert && (
          <span role="alert" className="mt-1 block max-w-xs rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-700">
            {order.payment_alert}
          </span>
        )}
        {order.payment_hold && (
          <span role="alert" className="mt-1 block max-w-xs rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700">
            Payment hold: review refund or dispute before fulfillment.
          </span>
        )}
        {order.first_order_review_required && (
          <span
            role="status"
            className={`mt-1 block max-w-xs rounded border px-2 py-1 text-[11px] ${
              order.first_order_review_status === "approved"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                : "border-amber-500/40 bg-amber-500/10 text-amber-700"
            }`}
          >
            Research-use review: {order.first_order_review_status}
            {order.research_attested_at ? " · attestation recorded" : " · attestation missing"}
            {order.first_order_reviewed_at
              ? ` · ${new Date(order.first_order_reviewed_at).toLocaleString()}`
              : ""}
          </span>
        )}
      </td>
      <td className="min-w-64 space-y-2 py-2">
        {canMarkPaid && (
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => markOrderPaid({ data: { id: order.id, paymentRef: ref } }));
            }}
          >
            <input
              className="input-field min-w-0"
              placeholder={
                order.payment_method === "zelle"
                  ? "Zelle confirmation #"
                  : `${order.payment_method === "ethereum" ? "Ethereum" : "Bitcoin"} transaction hash`
              }
              aria-label="Payment reference"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" disabled={busy || !ref.trim()}>
              {busy ? "…" : "Mark paid"}
            </button>
          </form>
        )}
        {canApproveReview && (
          <button
            type="button"
            className="btn-primary w-full whitespace-normal disabled:opacity-50"
            disabled={busy}
            onClick={() => {
              if (confirm("Approve this first-order research-use review for fulfillment?")) {
                void run(() => approveFirstOrderReview({ data: { id: order.id } }));
              }
            }}
          >
            {busy ? "…" : "Approve research-use review"}
          </button>
        )}
        {canShip && (
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => markOrderShipped({ data: { id: order.id, tracking } }));
            }}
          >
            <input
              className="input-field min-w-0"
              placeholder="Tracking number"
              aria-label="Tracking number"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "…" : "Mark shipped"}
            </button>
          </form>
        )}
        {canCancel && (
          <button
            type="button"
            className="text-xs text-red-300 disabled:opacity-50"
            disabled={busy}
            onClick={() => {
              if (confirm("Cancel this order and return any applied lab credit?")) {
                void run(() => cancelOrder({ data: { id: order.id } }));
              }
            }}
          >
            Cancel order
          </button>
        )}
        {rowError && (
          <p className="text-xs text-red-300" role="alert">
            {rowError}
          </p>
        )}
      </td>
    </tr>
  );
}
