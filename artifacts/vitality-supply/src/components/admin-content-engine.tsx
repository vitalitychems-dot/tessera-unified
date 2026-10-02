import { useEffect, useState } from "react";
import {
  loadContentEngine,
  loadContentPageVersions,
  requestContentRun,
  restoreContentPage,
  setContentEnginePaused,
  unpublishContentPage,
  type ContentEngineOverview,
  type ContentPageSummary,
  type ContentVersionRecord,
} from "@/lib/content/admin-api";

const STATUS_CLASS: Record<string, string> = {
  published: "text-primary",
  failed: "text-red-300",
  unpublished: "text-amber-300",
  draft: "text-muted",
};

const OUTCOME_CLASS: Record<string, string> = {
  accepted: "text-primary",
  rejected: "text-red-300",
  failed: "text-red-300",
  skipped: "text-muted",
};

function when(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "—";
}

function gateSummary(page: ContentPageSummary) {
  const report = page.gateReport;
  if (!report) return "No gate report";
  const deterministic = report.deterministic.violations.length;
  const model = report.model ? (report.model.ok ? "model ok" : `model ${report.model.violations.length} issue(s)`) : "model not run";
  return `${report.deterministic.ok ? "rules ok" : `rules ${deterministic} hit(s)`} · ${model} · ${report.ruleset}`;
}

export function AdminContentEngine() {
  const [data, setData] = useState<ContentEngineOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openPage, setOpenPage] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, ContentVersionRecord[]>>({});

  const pull = async () => {
    try {
      setError(null);
      setData(await loadContentEngine());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the content engine.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void pull();
    const timer = window.setInterval(() => void pull(), 30000);
    return () => window.clearInterval(timer);
  }, []);

  async function act(label: string, fn: () => Promise<string | null | void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const message = await fn();
      if (message) setNotice(message);
      await pull();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not ${label}.`);
    } finally {
      setBusy(false);
    }
  }

  async function togglePage(pageId: string) {
    if (openPage === pageId) {
      setOpenPage(null);
      return;
    }
    setOpenPage(pageId);
    if (!versions[pageId]) {
      try {
        const list = await loadContentPageVersions({ data: { pageId } });
        setVersions((current) => ({ ...current, [pageId]: list }));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not load versions.");
      }
    }
  }

  const state = data?.state;
  const published = data?.pages.filter((page) => page.status === "published").length ?? 0;
  const latestRun = data?.runs[0];

  return (
    <div className="mt-8 min-w-0 space-y-8">
      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-primary uppercase">Organic search autopilot</p>
            <h2 className="font-display mt-2 text-2xl font-semibold uppercase">Content engine</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Publishes compound references, family hubs, and analytical-method pages under /research and /compounds on its own. Every page
              passes a deterministic wording gate and a model self-audit before it is served; nothing here touches prices, payments, or orders.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={busy || !data}
              onClick={() =>
                void act("queue a run", async () => {
                  const result = await requestContentRun();
                  return result.message;
                })
              }
            >
              Run now
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={busy || !state}
              onClick={() =>
                void act(state?.paused ? "resume" : "pause", async () => {
                  await setContentEnginePaused({ data: { paused: !state?.paused, reason: state?.paused ? undefined : "Paused by admin." } });
                  return state?.paused ? "Engine resumed." : "Engine paused. Published pages stay live and keep being re-verified.";
                })
              }
            >
              {state?.paused ? "Resume publishing" : "Pause publishing"}
            </button>
          </div>
        </div>
        {loading ? <p className="mt-5 text-sm text-muted">Loading content engine…</p> : null}
        {error ? <p role="alert" className="mt-5 text-sm text-red-300">{error}</p> : null}
        {notice ? <p className="mt-5 text-sm text-primary">{notice}</p> : null}
        {data?.observationGate ? (
          <div className="mt-5 rounded-md border border-border p-4 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[10px] tracking-widest text-primary uppercase">Analytics observation gate</p>
              <p className={data.observationGate.eligible ? "text-primary" : "text-amber-300"}>
                {data.observationGate.eligible ? "Autonomous publishing active" : "Reverification only"}
              </p>
            </div>
            <p className="mt-2 text-muted">{data.observationGate.reason}</p>
            <p className="mt-1 text-xs text-faint">
              {data.observationGate.liveEvents} live events · {data.observationGate.liveSessions} live sessions ·{" "}
              {data.observationGate.liveDays} live day(s)
              {data.observationGate.eligibleAt ? ` · eligible after ${when(data.observationGate.eligibleAt)}` : ""}
            </p>
          </div>
        ) : null}
        {state ? (
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs tracking-widest text-muted uppercase">Status</dt>
              <dd className={`mt-1 font-medium ${state.paused ? "text-amber-300" : "text-primary"}`}>{state.paused ? "Paused" : "Running"}</dd>
              {state.paused && state.pausedReason ? <dd className="mt-1 text-xs text-muted">{state.pausedReason}</dd> : null}
            </div>
            <div>
              <dt className="text-xs tracking-widest text-muted uppercase">Published</dt>
              <dd className="mt-1 font-medium">
                {published} of {data?.topicsTotal ?? 0} topics
              </dd>
              <dd className="mt-1 text-xs text-muted">
                {state.publishesToday}/{state.dailyPublishCap} published today · every {data?.cadenceHours ?? 2} h
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-widest text-muted uppercase">Model budget</dt>
              <dd className="mt-1 font-medium">
                {state.modelCallsToday}/{state.dailyModelCallCap} calls today
              </dd>
              <dd className="mt-1 text-xs text-muted">
                {state.consecutiveGateFailures} consecutive gate failure(s) · ruleset {data?.rulesetVersion}
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-widest text-muted uppercase">Last run</dt>
              <dd className="mt-1 font-medium">{latestRun ? `${latestRun.status} (${latestRun.trigger})` : "None yet"}</dd>
              <dd className="mt-1 text-xs text-muted">
                {latestRun?.completedAt ? `Finished ${when(latestRun.completedAt)}` : latestRun ? `Started ${when(latestRun.createdAt)}` : "Scheduler starts with the server"}
                {latestRun?.nextDueAt ? ` · next due ${when(latestRun.nextDueAt)}` : ""}
              </dd>
              {latestRun?.error ? <dd className="mt-1 text-xs text-red-300">{latestRun.error}</dd> : null}
            </div>
          </dl>
        ) : null}
        {data ? (
          <div className="mt-6 grid gap-3 text-sm md:grid-cols-2">
            <p className="min-w-0 rounded-md border border-border p-3 text-muted break-words">
              <span className="font-mono text-[10px] tracking-widest text-primary uppercase">Search Console</span>
              <br />
              {data.searchConsoleRecommendation}
            </p>
            <p className="min-w-0 rounded-md border border-border p-3 text-muted break-words">
              <span className="font-mono text-[10px] tracking-widest text-primary uppercase">IndexNow</span>
              <br />
              {data.indexNow.enabled ? "Live: publish, refresh, and unpublish events are pinged automatically." : "Recorded only (submissions leave the server in production)."}
              {data.indexNow.keyPath ? ` Key file: ${data.indexNow.keyPath}` : " No key: SESSION_SECRET is missing."}
              <br />
              <span className="text-xs text-faint">
                Last 24h: {data.indexNow.summary.accepted} accepted · {data.indexNow.summary.rejected} rejected ·{" "}
                {data.indexNow.summary.failed} failed · {data.indexNow.summary.skipped} skipped
                {data.indexNow.summary.oldestFailureAt
                  ? ` · oldest failure ${when(data.indexNow.summary.oldestFailureAt)}`
                  : ""}
              </span>
            </p>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold uppercase">Pages</h2>
        <p className="mt-1 text-sm text-muted">Views and downstream product views / cart adds come from first-party events over the last 30 days.</p>
        <div className="mt-4 space-y-3">
          {data && data.pages.length === 0 ? <p className="text-sm text-muted">No pages yet. The first run publishes within two hours of the server starting, or use Run now.</p> : null}
          {(data?.pages ?? []).map((page) => (
              <article key={page.id} className="min-w-0 rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] tracking-widest text-muted uppercase">
                    {page.kind} · <span className={STATUS_CLASS[page.status] ?? "text-muted"}>{page.status}</span>
                    {!page.inCatalog ? <span className="text-amber-300"> · subject left catalog</span> : null}
                  </p>
                  <p className="mt-1 font-medium">{page.title ?? page.path}</p>
                  {page.status === "published" ? (
                    <a href={page.path} target="_blank" rel="noreferrer" className="text-xs text-primary underline-offset-4 hover:underline">
                      {page.path}
                    </a>
                  ) : (
                    <p className="text-xs text-muted">{page.path}</p>
                  )}
                  <p className="mt-2 text-xs text-muted">{gateSummary(page)}</p>
                  {page.unpublishReason && page.status !== "published" ? <p className="mt-1 text-xs text-amber-300">{page.unpublishReason}</p> : null}
                </div>
                <dl className="grid grid-cols-2 gap-3 text-center text-sm sm:grid-cols-4">
                  <div className="min-w-0">
                    <dt className="text-[10px] tracking-widest text-muted uppercase">Views</dt>
                    <dd className="font-semibold">{page.metrics.views}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] tracking-widest text-muted uppercase">Sessions</dt>
                    <dd className="font-semibold">{page.metrics.sessions}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] tracking-widest text-muted uppercase">→ Product</dt>
                    <dd className="font-semibold">{page.metrics.productSessions}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] tracking-widest text-muted uppercase">→ Cart</dt>
                    <dd className="font-semibold">{page.metrics.cartSessions}</dd>
                  </div>
                </dl>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                <span className="text-muted">
                  v{page.currentVersion ?? "—"} · published {when(page.publishedAt)} · refresh {when(page.nextRefreshAt)} · verified {when(page.lastVerifiedAt)}
                </span>
                {page.status === "published" ? (
                  <button
                    type="button"
                    className="text-amber-300 underline-offset-4 hover:underline"
                    disabled={busy}
                    onClick={() =>
                      void act("unpublish", async () => {
                        await unpublishContentPage({ data: { pageId: page.id, reason: "Unpublished by admin." } });
                        return `${page.path} unpublished.`;
                      })
                    }
                  >
                    Unpublish
                  </button>
                ) : page.currentVersion && page.gateStatus === "passed" ? (
                  <button
                    type="button"
                    className="text-primary underline-offset-4 hover:underline"
                    disabled={busy || !page.inCatalog}
                    onClick={() =>
                      void act("republish", async () => {
                        const { result } = await restoreContentPage({ data: { pageId: page.id } });
                        return result.ok ? `${page.path} republished (v${result.version}).` : result.error;
                      })
                    }
                  >
                    Republish
                  </button>
                ) : null}
                <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => void togglePage(page.id)}>
                  {openPage === page.id ? "Hide versions" : "Versions & gate reports"}
                </button>
              </div>
              {openPage === page.id ? (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {(versions[page.id] ?? []).length === 0 ? <p className="text-xs text-muted">Loading versions…</p> : null}
                  {(versions[page.id] ?? []).map((version) => (
                    <div key={version.id} className="text-xs">
                      <p>
                        <span className="font-mono">v{version.version}</span> · <span className={version.gateStatus === "passed" ? "text-primary" : "text-red-300"}>{version.gateStatus}</span> ·{" "}
                        {when(version.createdAt)} · {version.createdBy}
                        {version.isCurrent ? " · current" : ""}
                        {!version.isCurrent && version.gateStatus === "passed" && page.inCatalog ? (
                          <>
                            {" · "}
                            <button
                              type="button"
                              className="text-primary underline-offset-4 hover:underline"
                              disabled={busy}
                              onClick={() =>
                                void act("roll back", async () => {
                                  const { result } = await restoreContentPage({ data: { pageId: page.id, versionId: version.id } });
                                  setVersions((current) => ({ ...current, [page.id]: [] }));
                                  return result.ok ? `${page.path} rolled back to v${result.version}.` : result.error;
                                })
                              }
                            >
                              Roll back to this version
                            </button>
                          </>
                        ) : null}
                      </p>
                      {version.gateReport.deterministic.violations.length > 0 ? (
                        <ul className="mt-1 space-y-0.5 text-muted">
                          {version.gateReport.deterministic.violations.slice(0, 8).map((violation, index) => (
                            <li key={index}>
                              [{violation.rule}] {violation.excerpt}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {version.gateReport.model && !version.gateReport.model.ok ? (
                        <ul className="mt-1 space-y-0.5 text-muted">
                          {version.gateReport.model.violations.slice(0, 8).map((violation, index) => (
                            <li key={index}>
                              [{violation.category}] {violation.excerpt} — {violation.reason}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-xl font-semibold uppercase">Activity</h2>
          <div className="mt-4 space-y-2 text-xs">
            {(data?.events ?? []).length === 0 ? <p className="text-sm text-muted">No activity recorded yet.</p> : null}
            {(data?.events ?? []).map((event) => (
                <p key={event.id} className="min-w-0 break-words border-t border-border pt-2 first:border-0 first:pt-0">
                <span className="font-mono text-primary">{event.event}</span> · {when(event.createdAt)} · {event.actor}
                {event.pagePath ? ` · ${event.pagePath}` : ""}
                {event.detail.reason ? <span className="text-muted"> — {event.detail.reason}</span> : null}
                {event.detail.message ? <span className="text-red-300"> — {event.detail.message}</span> : null}
              </p>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-xl font-semibold uppercase">IndexNow log</h2>
          <div className="mt-4 space-y-2 text-xs">
            {(data?.indexNowLog ?? []).length === 0 ? <p className="text-sm text-muted">No submissions yet.</p> : null}
            {(data?.indexNowLog ?? []).map((entry) => (
              <p key={entry.id} className="border-t border-border pt-2 first:border-0 first:pt-0">
                <span className={`font-mono ${OUTCOME_CLASS[entry.outcome] ?? "text-muted"}`}>{entry.outcome}</span>
                {entry.statusCode ? ` ${entry.statusCode}` : ""} · {when(entry.createdAt)} · {entry.reason} · {entry.urls.length} url(s)
                {entry.detail ? <span className="text-muted"> — {entry.detail}</span> : null}
              </p>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
