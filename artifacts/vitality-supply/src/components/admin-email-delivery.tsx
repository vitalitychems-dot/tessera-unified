import { useState } from "react";
import { saveEmailSender, verifyEmailDomain, type loadNewsletterAdmin } from "@/lib/newsletter/api";

type EmailStatus = Awaited<ReturnType<typeof loadNewsletterAdmin>>["email"];

const STATUS_LABEL: Record<string, string> = {
  verified: "Verified",
  pending: "Checking DNS",
  not_started: "DNS records missing",
  failed: "Verification failed",
  temporary_failure: "Retrying",
};

/**
 * Sender address + Resend domain verification. Shown at the top of Admin → Subscribers
 * because nothing (welcome codes, receipts, broadcasts) goes out until the sender's
 * domain is verified.
 */
export function AdminEmailDelivery({ email, onChange }: { email: EmailStatus; onChange: () => Promise<void> }) {
  const [address, setAddress] = useState(email.sender);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (label: string, action: () => Promise<{ ok: boolean; error?: string; message?: string }>) => {
    setBusy(label);
    setMessage(null);
    try {
      const response = await action();
      setMessage(response.ok ? response.message ?? `${label} done.` : response.error ?? `${label} failed.`);
      await onChange();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : `${label} failed.`);
    } finally {
      setBusy(null);
    }
  };

  const senderDomain = email.domains.find((domain) => domain.name === email.senderDomain);
  const tone = email.verified
    ? "border-primary/40 bg-primary/5 text-primary"
    : "border-amber-500/40 bg-amber-500/5 text-amber-200";

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-xl tracking-wide uppercase">Email delivery</h3>
        <span className={`rounded border px-2 py-1 text-xs ${tone}`}>
          {!email.connected
            ? "Resend not reachable"
            : email.verified
              ? `Live — sending as ${email.sender}`
              : `Paused — ${email.senderDomain} is not verified`}
        </span>
      </div>
      {!email.connected && email.error && (
        <p role="alert" className="text-sm text-red-300">{email.error}</p>
      )}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void run("Sender", () => saveEmailSender({ data: { address } }));
        }}
      >
        <label className="grid gap-1 text-xs text-muted">
          Sender address (welcome codes, receipts and broadcasts come from here)
          <input
            className="input-field min-w-72"
            type="email"
            required
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="hello@vitalitychems.com"
          />
        </label>
        <button className="btn-secondary" type="submit" disabled={Boolean(busy) || address.trim().toLowerCase() === email.sender}>
          Save sender
        </button>
      </form>

      {email.connected && !email.verified && (
        <div className="space-y-3 text-sm">
          <p className="text-muted">
            Add these DNS records at the registrar for <strong className="text-foreground">{email.senderDomain}</strong>, then
            press “Check verification”. Resend usually confirms within minutes; some registrars take up to an hour.
          </p>
          {senderDomain ? (
            <>
              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="bg-overlay font-mono text-[10px] tracking-widest text-muted uppercase">
                    <tr>
                      <th className="px-3 py-2">Purpose</th><th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Host / name</th><th className="px-3 py-2">Value</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {senderDomain.records.map((record) => (
                      <tr key={`${record.type}-${record.name}`} className="border-t border-border align-top">
                        <td className="px-3 py-2">{record.record}</td>
                        <td className="px-3 py-2 font-mono">{record.type}</td>
                        <td className="px-3 py-2 font-mono">{record.name}</td>
                        <td className="max-w-md px-3 py-2 font-mono break-all">{record.value}</td>
                        <td className="px-3 py-2">{STATUS_LABEL[record.status] ?? record.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                className="btn-primary"
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void run("Verification", () => verifyEmailDomain({ data: { domainId: senderDomain.id } }))}
              >
                {busy === "Verification" ? "Checking…" : "Check verification"}
              </button>
            </>
          ) : (
            <p className="text-amber-200">
              {email.senderDomain} is not registered in Resend yet. Save the sender address above to register it and reveal its DNS records.
            </p>
          )}
        </div>
      )}

      {email.domains.length > 1 && (
        <p className="text-xs text-muted">
          Domains in Resend:{" "}
          {email.domains.map((domain) => `${domain.name} (${STATUS_LABEL[domain.status] ?? domain.status})`).join(" · ")}
        </p>
      )}
      {message && <p role="status" className="text-sm text-primary">{message}</p>}
    </section>
  );
}
