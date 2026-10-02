import { useEffect, useState } from "react";
import {
  loadAdminOperations,
  retryAdminOrderEmail,
  retryAdminStripeEvent,
} from "@/lib/store-api";
import { formatPrice } from "@/lib/utils";

type Operations = Awaited<ReturnType<typeof loadAdminOperations>>;

export function AdminOperations() {
  const [data, setData] = useState<Operations | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    loadAdminOperations()
      .then((value) => {
        setData(value);
        setError("");
      })
      .catch((cause: Error) => setError(cause.message));

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  async function retryEvent(id: string) {
    setBusy(id);
    try {
      await retryAdminStripeEvent({ data: { id } });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not retry the Stripe event.");
    } finally {
      setBusy(null);
    }
  }

  async function retryEmail(id: number) {
    setBusy(`email-${id}`);
    try {
      await retryAdminOrderEmail({ data: { id } });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not retry the order email.");
    } finally {
      setBusy(null);
    }
  }

  if (error) {
    return (
      <section className="mt-8 rounded-lg border border-red-400/40 bg-red-400/10 p-5">
        <p role="alert" className="text-sm text-red-200">{error}</p>
        <button type="button" className="btn-secondary mt-3" onClick={() => void load()}>Retry</button>
      </section>
    );
  }
  if (!data) {
    return <p className="mt-8 text-sm text-muted" aria-busy="true">Loading operations health…</p>;
  }

  return (
    <section className="mt-8 space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold uppercase">Operations health</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Payment events and outbound mail are processed by durable workers. Dead letters require
          an explicit retry after the underlying issue is understood.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Stripe queued" value={`${data.stripe.queued + data.stripe.retry}`} />
        <Metric label="Stripe dead" value={String(data.stripe.dead)} tone={data.stripe.dead ? "warn" : "normal"} />
        <Metric label="Email queued" value={String(data.email.queued)} />
        <Metric label="Unsettled Stripe orders" value={String(data.unsettledStripeOrders)} tone={data.unsettledStripeOrders ? "warn" : "normal"} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-5">
          <h3 className="font-display text-lg font-semibold uppercase">Worker heartbeats</h3>
          <div className="mt-3 space-y-3 text-sm">
            {data.workers.length === 0 ? <p className="text-muted">No worker heartbeat yet.</p> : data.workers.map((worker) => (
              <div key={worker.worker} className="rounded border border-border bg-overlay p-3">
                <div className="flex justify-between gap-3">
                  <strong>{worker.worker}</strong>
                  <span className="text-xs text-muted">{new Date(worker.last_seen_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {worker.last_success_at ? `Last success ${new Date(worker.last_success_at).toLocaleString()}` : "No successful tick recorded"}
                  {" · "}{worker.processed_count} processed
                </p>
                {worker.last_error ? <p className="mt-2 text-xs text-amber-200">{worker.last_error}</p> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <h3 className="font-display text-lg font-semibold uppercase">Refunds and disputes</h3>
          <div className="mt-3 space-y-2 text-sm">
            {data.adjustments.length === 0 ? <p className="text-muted">No payment adjustments recorded.</p> : data.adjustments.map((adjustment) => (
              <div key={adjustment.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2">
                <span>{adjustment.kind} · {adjustment.order_id ?? "unmatched order"}</span>
                <span className="font-mono">{formatPrice(adjustment.amount)} · {adjustment.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-surface p-5">
        <h3 className="font-display text-lg font-semibold uppercase">Stripe dead letters</h3>
        {data.deadEvents.length === 0 ? <p className="mt-3 text-sm text-muted">No dead Stripe events.</p> : (
          <div className="mt-3 space-y-3">
            {data.deadEvents.map((event) => (
              <div key={event.id} className="flex flex-wrap items-start justify-between gap-3 rounded border border-red-400/30 bg-red-400/5 p-3 text-sm">
                <div>
                  <p className="font-mono">{event.type} · {event.object_id ?? "no object id"}</p>
                  <p className="mt-1 text-xs text-muted">{event.last_error ?? "No error detail"} · {event.attempts} attempts</p>
                </div>
                <button type="button" className="btn-secondary" disabled={busy === event.id} onClick={() => void retryEvent(event.id)}>
                  {busy === event.id ? "Retrying…" : "Retry event"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-lg border border-border bg-surface p-5">
        <h3 className="font-display text-lg font-semibold uppercase">Email dead letters</h3>
        {data.deadEmails.length === 0 ? <p className="mt-3 text-sm text-muted">No dead order emails.</p> : (
          <div className="mt-3 space-y-3">
            {data.deadEmails.map((email) => (
              <div key={email.id} className="flex flex-wrap items-start justify-between gap-3 rounded border border-red-400/30 bg-red-400/5 p-3 text-sm">
                <div>
                  <p className="font-mono">{email.kind} · order {email.order_id}</p>
                  <p className="mt-1 text-xs text-muted">{email.last_error ?? "No error detail"} · {email.attempts} attempts</p>
                </div>
                <button type="button" className="btn-secondary" disabled={busy === `email-${email.id}`} onClick={() => void retryEmail(email.id)}>
                  {busy === `email-${email.id}` ? "Retrying…" : "Retry email"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs leading-relaxed text-faint">
        Email queue age: {data.email.oldestCreatedAt ? new Date(data.email.oldestCreatedAt).toLocaleString() : "empty"}.
        Dead rows require an explicit retry after review.
      </p>
    </section>
  );
}

function Metric({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "warn" }) {
  return (
    <div className={`rounded-lg border p-4 ${tone === "warn" ? "border-amber-400/50 bg-amber-400/10" : "border-border bg-surface"}`}>
      <p className="font-mono text-[10px] tracking-widest text-muted uppercase">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}