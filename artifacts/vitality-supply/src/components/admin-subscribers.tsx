import { useEffect, useMemo, useState } from "react";
import {
  loadNewsletterAdmin,
  sendNewsletterBroadcast,
  sendQueuedWelcomes,
  sendTestNewsletter,
  type NewsletterSubscriber,
} from "@/lib/newsletter/api";
import { AdminEmailDelivery } from "./admin-email-delivery";

type AdminData = Awaited<ReturnType<typeof loadNewsletterAdmin>>;

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function readableDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

export function AdminSubscribers() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [compose, setCompose] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const reload = async () => {
    try {
      setData(await loadNewsletterAdmin());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load newsletter subscribers.");
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return data?.subscribers ?? [];
    return (data?.subscribers ?? []).filter((subscriber) =>
      [subscriber.email, subscriber.name, subscriber.source].some((value) =>
        value?.toLowerCase().includes(needle),
      ),
    );
  }, [data, search]);

  const run = async (label: string, action: () => Promise<unknown>) => {
    setBusy(label);
    setResult(null);
    try {
      const response = await action() as {
        ok: boolean;
        error?: string;
        message?: string;
        sent?: number;
        failed?: number;
        recipients?: number;
      };
      if (!response.ok) throw new Error(response.error || `${label} failed.`);
      setResult(
        response.message ||
          `${label}: ${response.sent ?? 0} sent, ${response.failed ?? 0} failed${response.recipients != null ? ` of ${response.recipients} recipients` : ""}.`,
      );
      await reload();
    } catch (caught) {
      setResult(caught instanceof Error ? caught.message : `${label} failed.`);
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = () => {
    if (!data) return;
    const headings = ["email", "name", "source", "subscribed_at", "welcome_sent_at", "unsubscribed_at"];
    const lines = data.subscribers.map((subscriber) =>
      [
        subscriber.email,
        subscriber.name,
        subscriber.source,
        subscriber.created_at,
        subscriber.welcome_sent_at,
        subscriber.unsubscribed_at,
      ].map(csvCell).join(","),
    );
    const blob = new Blob([[headings.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vitality-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (error) return <p role="alert" className="mt-8 text-sm text-red-300">{error}</p>;
  if (!data) return <div className="mt-8 h-28 animate-pulse rounded-lg bg-surface" />;

  return (
    <div className="mt-8 space-y-6">
      <AdminEmailDelivery email={data.email} onChange={reload} />
       {!data.connected && (data.queued > 0 || data.queuedOrderEmails > 0 || data.queuedContactEmails > 0) && (
        <p className="text-sm text-amber-200">
           Waiting for a verified sender: {data.queued} welcome, {data.queuedOrderEmails} order, and {data.queuedContactEmails} partner/investor email{data.queuedContactEmails === 1 ? "" : "s"} queued.
          Press “Send queued emails” once the domain is verified (order emails also retry when you open the Orders tab).
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Active", data.active],
           ["Queued emails", data.queued + data.queuedOrderEmails + data.queuedContactEmails],
          ["Unsubscribed", data.unsubscribed],
        ].map(([label, count]) => (
          <div key={label} className="rounded-lg border border-border bg-surface p-4">
            <p className="font-mono text-[10px] tracking-widest text-muted uppercase">{label}</p>
            <p className="font-display mt-1 text-3xl text-primary">{count}</p>
          </div>
        ))}
      </div>
      {data.orderEmailQueue.failed > 0 || data.orderEmailQueue.oldestCreatedAt ? (
        <p className="text-xs text-muted">
          Order outbox: {data.orderEmailQueue.queued} queued, {data.orderEmailQueue.failed} failed
          {data.orderEmailQueue.oldestCreatedAt
            ? ` · oldest ${readableDate(data.orderEmailQueue.oldestCreatedAt)}`
            : ""}
          . The background worker retries eligible messages automatically.
        </p>
      ) : null}
      {data.contactEmailQueue.failed > 0 || data.contactEmailQueue.oldestCreatedAt ? (
        <p className="text-xs text-muted">
          Partner/investor outbox: {data.contactEmailQueue.queued} queued, {data.contactEmailQueue.failed} failed
          {data.contactEmailQueue.oldestCreatedAt
            ? ` · oldest ${readableDate(data.contactEmailQueue.oldestCreatedAt)}`
            : ""}
          . The background worker retries eligible notifications automatically.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" type="button" disabled={Boolean(busy)} onClick={() => run("Test email", sendTestNewsletter)}>Send test email to staff</button>
       <button className="btn-secondary" type="button" disabled={Boolean(busy) || (data.queued === 0 && data.queuedOrderEmails === 0 && data.queuedContactEmails === 0)} onClick={() => run("Queued emails", sendQueuedWelcomes)}>Send queued emails</button>
        <button className="btn-primary" type="button" onClick={() => setCompose((value) => !value)}>Compose broadcast</button>
        <button className="btn-secondary" type="button" onClick={exportCsv}>Export CSV</button>
      </div>
      {result && <p role="status" className="text-sm text-primary">{result}</p>}

      {compose && (
        <form
          className="grid gap-3 rounded-lg border border-primary/30 bg-surface p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!confirmed || !window.confirm(`Send this broadcast to ${data.active} active subscribers?`)) return;
            void run("Broadcast", () =>
              sendNewsletterBroadcast({ data: { subject, body, confirmed: true } }),
            );
          }}
        >
          <h3 className="font-display text-xl tracking-wide uppercase">Broadcast</h3>
          <p className="text-sm text-muted">Dry run: {data.active} active recipients. Unsubscribed addresses are excluded.</p>
          <input className="input-field" required maxLength={200} placeholder="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
          <textarea className="input-field min-h-40" required placeholder="Message" value={body} onChange={(event) => setBody(event.target.value)} />
          <label className="flex items-start gap-2 text-sm text-muted">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
            I confirm this research-use-only email should be sent to all {data.active} active subscribers.
          </label>
          <button className="btn-primary" type="submit" disabled={!confirmed || Boolean(busy)}>Confirm and send broadcast</button>
        </form>
      )}

      <input className="input-field max-w-md" type="search" placeholder="Search email, name, or source" value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-overlay font-mono text-[10px] tracking-widest text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Email</th><th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Source</th><th className="px-4 py-3">Subscribed</th>
              <th className="px-4 py-3">Welcome sent</th><th className="px-4 py-3">Unsubscribed</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((subscriber: NewsletterSubscriber) => (
              <tr key={subscriber.id} className="border-t border-border">
                <td className="px-4 py-3">{subscriber.email}</td>
                <td className="px-4 py-3">{subscriber.name ?? "—"}</td>
                <td className="px-4 py-3">{subscriber.source ?? "—"}</td>
                <td className="px-4 py-3">{readableDate(subscriber.created_at)}</td>
                <td className="px-4 py-3">{readableDate(subscriber.welcome_sent_at)}</td>
                <td className="px-4 py-3">{readableDate(subscriber.unsubscribed_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-muted">No matching subscribers.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}