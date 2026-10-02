import { useEffect, useState } from "react";
import {
  createApprovalDraft,
  loadApprovalQueue,
  setApprovalStatus,
  updateApprovalDraft,
} from "@/lib/manager-api";

type Queue = Awaited<ReturnType<typeof loadApprovalQueue>>;
type Draft = Queue["drafts"][number];
type DraftKind = "newsletter" | "partner" | "community" | "github";

export function AdminApprovalQueue() {
  const [data, setData] = useState<Queue | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ kind: "newsletter" as DraftKind, title: "", body: "", source: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    setData(await loadApprovalQueue());
  }

  useEffect(() => {
    void reload().catch((error) => setMessage(error instanceof Error ? error.message : "Could not load approval queue."));
  }, []);

  function edit(draft: Draft) {
    setSelected(draft.id);
    setForm({ kind: draft.kind as DraftKind, title: draft.title, body: draft.body, source: draft.source ?? "" });
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      if (selected) {
        await updateApprovalDraft({ data: { id: selected, title: form.title, body: form.body, source: form.source } });
        setMessage("Draft saved.");
      } else {
        await createApprovalDraft({ data: form });
        setMessage("Draft created.");
      }
      setSelected(null);
      setForm({ kind: "newsletter", title: "", body: "", source: "" });
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save draft.");
    } finally {
      setBusy(false);
    }
  }

  async function status(id: string, value: "approved" | "rejected" | "archived") {
    setBusy(true);
    setMessage(null);
    try {
      await setApprovalStatus({ data: { id, status: value } });
      setMessage(value === "approved" ? "Approved. Approved newsletters send automatically to confirmed subscribers." : `Draft ${value}.`);
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update draft.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 space-y-5">
      <div>
        <p className="font-mono text-[10px] tracking-widest text-primary uppercase">Human approval required</p>
        <h2 className="font-display mt-1 text-2xl font-semibold uppercase">Organic draft queue</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          AI-generated newsletters, partner copy, community drafts, and repository notes stay here
          until a verified administrator edits and approves them. Only approved newsletters can be
          mailed, and only to confirmed active subscribers.
        </p>
      </div>

      <form
        className="grid gap-3 rounded-lg border border-primary/30 bg-surface p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold uppercase">{selected ? "Edit draft" : "New draft"}</h3>
          {selected ? (
            <button type="button" className="text-xs text-muted underline" onClick={() => {
              setSelected(null);
              setForm({ kind: "newsletter", title: "", body: "", source: "" });
            }}>
              Cancel edit
            </button>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-[180px_1fr]">
          <label className="text-xs text-muted">
            Type
            <select className="input-field mt-1 w-full" value={form.kind} disabled={Boolean(selected)} onChange={(event) => setForm({ ...form, kind: event.target.value as DraftKind })}>
              <option value="newsletter">Newsletter</option>
              <option value="partner">Partner / UGC</option>
              <option value="community">Community</option>
              <option value="github">GitHub research</option>
            </select>
          </label>
          <label className="text-xs text-muted">
            Title
            <input className="input-field mt-1 w-full" required maxLength={200} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
        </div>
        <label className="text-xs text-muted">
          Draft body / review notes
          <textarea className="input-field mt-1 min-h-32 w-full" required maxLength={50000} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} />
        </label>
        <label className="text-xs text-muted">
          Source or evidence link
          <input className="input-field mt-1 w-full" maxLength={500} value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} placeholder="https://..." />
        </label>
        <button className="btn-primary w-fit" type="submit" disabled={busy}>{busy ? "Saving…" : selected ? "Save draft" : "Add to queue"}</button>
      </form>

      {message ? <p role="status" className="text-sm text-primary">{message}</p> : null}
      <div className="space-y-3">
        {(data?.drafts ?? []).length === 0 ? <p className="text-sm text-muted">No organic drafts yet.</p> : null}
        {(data?.drafts ?? []).map((draft) => (
          <article key={draft.id} className="rounded-lg border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] tracking-widest text-muted uppercase">{draft.kind} · {draft.status}</p>
                <h3 className="mt-1 font-display text-lg font-semibold uppercase">{draft.title}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {draft.status === "draft" ? <button type="button" className="btn-secondary" disabled={busy} onClick={() => edit(draft)}>Edit</button> : null}
                {draft.status === "draft" ? <button type="button" className="btn-primary" disabled={busy} onClick={() => void status(draft.id, "approved")}>Approve</button> : null}
                {draft.status === "draft" ? <button type="button" className="text-xs text-red-300 underline" disabled={busy} onClick={() => void status(draft.id, "rejected")}>Reject</button> : null}
                {draft.status === "approved" ? <button type="button" className="text-xs text-muted underline" disabled={busy} onClick={() => void status(draft.id, "archived")}>Archive</button> : null}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{draft.body}</p>
            {draft.source ? <a className="mt-3 block break-all text-xs text-primary hover:underline" href={draft.source} target="_blank" rel="noreferrer">{draft.source}</a> : null}
            <p className="mt-3 text-xs text-faint">Created {new Date(draft.created_at).toLocaleString()}{draft.sent_at ? ` · sent ${new Date(draft.sent_at).toLocaleString()}` : ""}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
