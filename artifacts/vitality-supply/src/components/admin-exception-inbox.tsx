import { useEffect, useMemo, useState } from "react";
import { loadAdminOperations } from "@/lib/store-api";
import { loadApprovalQueue, loadManagerState } from "@/lib/manager-api";

type ManagerState = Awaited<ReturnType<typeof loadManagerState>>;
type OperationsState = Awaited<ReturnType<typeof loadAdminOperations>>;
type ApprovalState = Awaited<ReturnType<typeof loadApprovalQueue>>;
type AdminTab = "orders" | "operations" | "manager";
type ManagerSection = "manager" | "approvals" | "content";

type Exception = {
  id: string;
  severity: "critical" | "high" | "medium" | "info";
  title: string;
  detail: string;
  target: AdminTab;
  section?: ManagerSection;
  targetLabel: string;
};

const severityRank: Record<Exception["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  info: 3,
};

export function AdminExceptionInbox({ onOpenTab }: { onOpenTab: (tab: AdminTab, section?: ManagerSection) => void }) {
  const [data, setData] = useState<{
    manager: ManagerState;
    operations: OperationsState;
    approvals: ApprovalState;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const [manager, operations, approvals] = await Promise.all([
          loadManagerState(),
          loadAdminOperations(),
          loadApprovalQueue(),
        ]);
        if (!cancelled) {
          setData({ manager, operations, approvals });
          setError("");
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load exception inbox.");
      }
    };
    void pull();
    const timer = window.setInterval(() => {
      if (!document.hidden) void pull();
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const exceptions = useMemo<Exception[]>(() => {
    if (!data) return [];
    const items: Exception[] = [];
    const add = (item: Exception) => items.push(item);
    for (const finding of data.manager.findings.filter((item) => item.severity === "critical" || item.severity === "high").slice(0, 4)) {
      const severity: Exception["severity"] = finding.severity === "critical" ? "critical" : "high";
      add({
        id: `finding-${finding.id}`,
        severity,
        title: finding.title,
        detail: finding.recommendation || finding.detail,
        target: "manager",
        targetLabel: "AI Manager",
      });
    }
    if (data.operations.deadEvents.length) {
      add({
        id: "dead-stripe-events",
        severity: "critical",
        title: `${data.operations.deadEvents.length} payment event${data.operations.deadEvents.length === 1 ? "" : "s"} need retry`,
        detail: "Payment reconciliation is blocked until staff reviews or retries the dead event queue.",
        target: "operations",
        targetLabel: "Operations",
      });
    }
    if (data.operations.deadEmails.length) {
      add({
        id: "dead-order-emails",
        severity: "high",
        title: `${data.operations.deadEmails.length} order email${data.operations.deadEmails.length === 1 ? "" : "s"} are dead-lettered`,
        detail: "Retry only after checking sender-domain and recipient delivery state.",
        target: "operations",
        targetLabel: "Operations",
      });
    }
    if (data.operations.unsettledStripeOrders > 0) {
      add({
        id: "unsettled-stripe-orders",
        severity: "high",
        title: `${data.operations.unsettledStripeOrders} unpaid card order${data.operations.unsettledStripeOrders === 1 ? "" : "s"} are aging`,
        detail: "Reconciliation can pull provider state, but staff must verify any payment or order transition.",
        target: "orders",
        targetLabel: "Orders",
      });
    }
    const failedWorker = data.manager.pulse.workers.find((worker) => worker.status === "failed");
    if (failedWorker) {
      add({
        id: `worker-${failedWorker.label}`,
        severity: "high",
        title: `${failedWorker.label} reported a failure`,
        detail: failedWorker.error || "Open the manager workspace to inspect the last run.",
        target: "manager",
        targetLabel: "Manager workspace",
      });
    }
    const drafts = data.approvals.drafts.filter((draft) => draft.status === "draft").length;
    if (drafts) {
      add({
        id: "approval-drafts",
        severity: "medium",
        title: `${drafts} draft${drafts === 1 ? "" : "s"} await approval`,
        detail: "Review factuality, affiliation, and audience before any staff-approved send or publish step.",
        target: "manager",
        section: "approvals",
        targetLabel: "Approval queue",
      });
    }
    const lowConversionPage = data.manager.pulse.contentOpportunities.find((page) => page.sessions >= 5 && page.productRate === 0);
    if (lowConversionPage) {
      add({
        id: `content-${lowConversionPage.path}`,
        severity: "medium",
        title: "A content page has traffic without product progression",
        detail: `${lowConversionPage.path} has ${lowConversionPage.sessions} sessions and no downstream product views in the current sample.`,
        target: "manager",
        section: "content",
        targetLabel: "Content engine",
      });
    }
    return items.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]).slice(0, 8);
  }, [data]);

  return (
    <section className="mt-8 rounded-lg border border-border bg-surface p-5" aria-labelledby="exception-inbox-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary uppercase">Operator queue</p>
          <h2 id="exception-inbox-heading" className="font-display mt-2 text-2xl font-semibold uppercase">Exceptions & next actions</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">One ranked list across payments, delivery, content, workers, and AI findings. Automation can prepare evidence; staff still approves consequential changes.</p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted">{exceptions.length} open</span>
      </div>
      {error ? <p className="mt-4 text-sm text-red-300" role="alert">{error}</p> : null}
      {!data && !error ? <p className="mt-5 text-sm text-muted">Loading operator queue…</p> : null}
      {data && !exceptions.length ? <p className="mt-5 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm text-muted">No high-priority exceptions detected. Keep the manager workspace, live funnel, and operations desk under review.</p> : null}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {exceptions.map((item) => (
          <article key={item.id} className="rounded-md border border-border bg-bg p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`font-mono text-[10px] uppercase tracking-widest ${item.severity === "critical" ? "text-red-300" : item.severity === "high" ? "text-orange-300" : "text-amber-300"}`}>{item.severity}</p>
                <h3 className="mt-1 font-medium">{item.title}</h3>
              </div>
              <button type="button" className="shrink-0 text-xs text-primary underline-offset-4 hover:underline" onClick={() => onOpenTab(item.target, item.section)}>
                Open {item.targetLabel}
              </button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}