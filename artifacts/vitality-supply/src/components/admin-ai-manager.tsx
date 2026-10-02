import { useEffect, useMemo, useState, useRef } from "react";
import { formatPrice } from "@/lib/utils";
import {
  askStoreManager,
  loadManagerState,
  rollbackManagerActionApi,
  runManagerAudit,
  updateManagerSetting,
} from "@/lib/manager-api";
import { AdminAdStrategy } from "./admin-ad-strategy";
import { AdminContentEngine } from "./admin-content-engine";
import { AdminApprovalQueue } from "./admin-approval-queue";
import { AdminExceptionInbox } from "./admin-exception-inbox";

type State = Awaited<ReturnType<typeof loadManagerState>>;
type Message = { role: "user" | "assistant"; text: string; sources?: string[] };
type ManagerNavigationTarget = "orders" | "operations";
type ManagerSection = "manager" | "approvals" | "content";
type CollapsiblePanel = "backlogs" | "approvals" | "content" | "policy" | "pulse";

const categories = ["performance", "seo", "security", "competitors", "funnel", "orders", "accessibility", "ads"];
const severityClass: Record<string, string> = {
  critical: "text-red-400 bg-red-400/10 border-red-400/20",
  high: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  low: "text-primary bg-primary/10 border-primary/20",
  info: "text-muted bg-surface border-border",
};

export function AdminAiManager({
  onNavigate,
  initialSection = "manager",
}: {
  onNavigate?: (target: ManagerNavigationTarget) => void;
  initialSection?: ManagerSection;
}) {
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [watchlist, setWatchlist] = useState("");
  const [question, setQuestion] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<CollapsiblePanel | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const pull = async () => {
    try {
      setError(null);
      const next = await loadManagerState();
      setState(next);
      setLastRefreshAt(new Date().toISOString());

      // Prevent overwriting if user is currently typing
      if (document.activeElement?.id !== "watchlist-input") {
        const list = next.settings.competitor_watchlist;
        setWatchlist(Array.isArray(list) ? list.filter((item): item is string => typeof item === "string").join("\n") : "");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load AI Manager.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void pull();
    const timer = window.setInterval(() => {
      if (!document.hidden) void pull();
    }, 30000);
    const onVisibility = () => {
      if (!document.hidden) void pull();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, busy]);

  useEffect(() => {
    if (initialSection === "approvals") setOpenPanel("approvals");
    if (initialSection === "content") setOpenPanel("content");
    const sectionId = initialSection === "approvals" ? "section-approvals" : initialSection === "content" ? "section-content" : "section-manager";
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialSection]);

  const counts = useMemo(
    () => Object.fromEntries(categories.map((category) => [category, state?.findings.filter((item) => item.category === category).length ?? 0])),
    [state],
  );

  const totals = state?.pulse?.summary ?? null;
  const adSnapshot = state?.pulse
    ? {
        sessions: totals?.sessions ?? 0,
        productViews: totals?.productViews ?? 0,
        addToCarts: totals?.addToCarts ?? 0,
        checkouts: totals?.checkouts ?? 0,
        orders: totals?.paidOrders ?? 0,
        topViewed: state.pulse.contentOpportunities.slice(0, 6).map((item) => item.title || item.path),
        topPurchased: [],
      }
    : null;
  const rate = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : `${(value * 100).toFixed(1)}%`;

  async function startAudit() {
    setBusy(true);
    setError(null);
    try {
      const result = await runManagerAudit({ data: { trigger: "manual" } });
      if (!result.ok) setError(result.message);
      await pull();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start audit.");
    } finally {
      setBusy(false);
    }
  }

  async function saveWatchlist() {
    setBusy(true);
    setError(null);
    try {
      const result = await updateManagerSetting({
        data: {
          key: "competitor_watchlist",
          value: watchlist.split(/\n|,/).map((item) => item.trim()).filter(Boolean),
          rationale: "Admin updated competitor watchlist.",
        },
      });
      if (!result.ok) setError(result.error);
      else await pull();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save watchlist.");
    } finally {
      setBusy(false);
    }
  }

  async function rollbackAction(actionId: string) {
    setBusy(true);
    setError(null);
    try {
      await rollbackManagerActionApi({ data: { actionId } });
      await pull();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not roll back action.");
    } finally {
      setBusy(false);
    }
  }

  async function ask() {
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setBusy(true);
    setError(null);
    try {
      const result = await askStoreManager({ data: { conversationId, question: q } });
      setConversationId(result.conversationId);
      setMessages((prev) => [...prev, { role: "assistant", text: result.answer, sources: result.sources }]);
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Could not contact the manager.";
      setError(msg);
      setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${msg}` }]);
    } finally {
      setBusy(false);
    }
  }

  const handleTabScroll = (target: "orders" | "operations" | "manager", section?: ManagerSection) => {
    if (target !== "manager") {
      onNavigate?.(target);
      return;
    }
    if (section === "approvals") setOpenPanel("approvals");
    if (section === "content") setOpenPanel("content");
    const sectionId = section === "approvals" ? "section-approvals" : section === "content" ? "section-content" : "section-manager";
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="min-h-screen min-w-0 max-w-[1600px] mx-auto overflow-x-hidden bg-bg px-4 py-8 font-sans text-fg sm:px-6 lg:px-8 space-y-12 pb-32">

      {/* 1. Chat Workspace (Primary Entry) */}
      <section className="bg-surface/50 border border-border/80 rounded-2xl p-6 md:p-8 shadow-lift relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary-deep via-primary to-accent opacity-50"></div>
        <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-semibold uppercase tracking-tight text-fg flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_12px_var(--color-primary)]"></span>
              Operator Workspace
            </h1>
            <p className="text-sm md:text-base text-muted mt-3 max-w-4xl leading-relaxed">
              Unified control for <span className="text-fg font-medium">vitalitychems.com</span>. AI Manager tracks evidence, competitors, and policies.{" "}
              <strong className="text-amber-400/90 font-medium">Paid advertising, payments, pricing, rewards, orders, fulfillment, auth, code, deployment, email sending, community posting, and partner contact require staff approval.</strong>
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-4 bg-bg border border-border/60 px-4 py-3 rounded-xl">
            <div className="text-right">
              <div className="text-[10px] font-mono text-muted uppercase tracking-widest">System Status</div>
              <div className={`text-sm font-bold uppercase tracking-wider mt-0.5 ${error ? 'text-red-400' : 'text-profit'}`}>{error ? "Degraded" : "Nominal"}</div>
            </div>
            {error && (
              <button type="button" onClick={() => setError(null)} className="text-[10px] uppercase tracking-widest text-muted hover:text-fg border border-border/50 bg-surface px-2 py-1 rounded transition-colors ml-2">
                Clear
              </button>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="mb-4 text-sm text-red-300">
            {error}
          </p>
        )}

        {messages.length > 0 && (
          <div className="space-y-4 max-h-[45vh] overflow-y-auto mb-6 pr-4 scrollbar-thin" role="log" aria-live="polite" aria-label="Manager conversation">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] md:max-w-[75%] rounded-2xl p-5 text-sm shadow-sm ${m.role === 'user' ? 'bg-primary/10 border border-primary/30 text-fg rounded-tr-sm' : 'bg-bg border border-border/80 text-muted rounded-tl-sm'}`}>
                  <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-x-6 gap-y-3">
                      {m.sources.map((s, idx) => (
                        <a key={idx} href={s} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:text-primary-soft uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                          Source {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-bg border border-border/80 text-muted rounded-2xl rounded-tl-sm p-5 text-sm flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-widest text-faint">Processing...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        <form onSubmit={e => { e.preventDefault(); ask(); }} className="relative mt-2">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <input
            aria-label="Ask the AI Manager"
            className="w-full bg-bg border border-border/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-xl py-5 pl-14 pr-32 text-fg text-base shadow-inner outline-none transition-all placeholder:text-muted/50"
            placeholder="Ask the AI Manager (e.g. 'What is the largest funnel opportunity?')"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            disabled={busy}
          />
          <button type="submit" disabled={busy || !question.trim()} className="absolute right-2.5 top-2.5 bottom-2.5 bg-primary hover:bg-primary-deep text-white px-8 rounded-lg font-bold text-xs transition-colors disabled:opacity-30 uppercase tracking-widest font-display shadow-sm">
            Send
          </button>
        </form>
        <div className="mt-5 flex min-w-0 flex-wrap gap-2" aria-label="Manager shortcuts">
          <button type="button" className="btn-secondary text-xs" onClick={() => onNavigate?.("orders")}>
            Open Orders
          </button>
          <button type="button" className="btn-secondary text-xs" onClick={() => onNavigate?.("operations")}>
            Open Operations
          </button>
          <button type="button" className="btn-secondary text-xs" onClick={() => handleTabScroll("manager", "approvals")}>
            Approval Queue
          </button>
          <button type="button" className="btn-secondary text-xs" onClick={() => handleTabScroll("manager", "content")}>
            Content Engine
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          One audit covers the live manager records. Order, payment, fulfillment, and publishing changes stay in their staff-controlled workspaces.
        </p>
      </section>

      {/* 2. Priority Inbox */}
      <AdminExceptionInbox onOpenTab={handleTabScroll} />

      {/* 3. Control Room & Audit State */}
      <section id="section-manager" className="border-t border-border/50 pt-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl font-semibold uppercase tracking-wider text-fg">Audit & Autonomy</h2>
            <p className="text-sm text-muted mt-1">Live state for AI Manager's daily execution.</p>
          </div>
          <button type="button" onClick={startAudit} disabled={busy || state?.status === 'running' || state?.status === 'queued'} className="btn-primary text-xs py-3 px-8">
            {state?.status === 'running' || state?.status === 'queued' ? "Audit in progress..." : "Run Audit"}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading manager state...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <div className="bg-bg border border-border rounded-lg p-5 shadow-sm">
                <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">Manager Status</div>
                <div className="text-lg font-medium text-fg capitalize flex items-center gap-2">
                  {state?.status === 'running' || state?.status === 'queued' ? <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_var(--color-warn)]" /> : <span className="w-2.5 h-2.5 rounded-full bg-profit shadow-[0_0_8px_var(--color-profit)]" />}
                  {state?.status ?? "Idle"}
                </div>
                <div className="text-[10px] text-faint mt-2">Refreshed {lastRefreshAt ? new Date(lastRefreshAt).toLocaleTimeString() : '—'}</div>
              </div>

              <div className="bg-bg border border-border rounded-lg p-5 shadow-sm">
                <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">Autonomy Gate</div>
                <div className={`text-base font-medium ${state?.observation?.eligible ? 'text-profit' : 'text-amber-400'}`}>
                  {state?.observation?.eligible ? "Active" : "Observation only"}
                </div>
                <div className="text-[10px] text-muted mt-2 truncate" title={state?.observation?.reason}>{state?.observation?.reason || "Conditions met"}</div>
              </div>

              <div className="bg-bg border border-border rounded-lg p-5 shadow-sm">
                <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">Last Audit</div>
                <div className="text-base font-medium text-fg">
                  {state?.lastRun?.completed_at ? new Date(state.lastRun.completed_at).toLocaleTimeString() : "None today"}
                </div>
                {state?.lastRun?.error && <div className="text-[10px] text-red-400 mt-2 truncate" title={state.lastRun.error}>{state.lastRun.error}</div>}
              </div>

              <div className="bg-bg border border-border rounded-lg p-5 shadow-sm">
                <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">Live Pipeline</div>
                <div className="text-base font-medium text-fg">{state?.observation?.liveEvents || 0} events</div>
                <div className="text-[10px] text-muted mt-2">{state?.observation?.liveSessions || 0} sessions today</div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Prioritized Findings */}
              <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col h-[600px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-xl font-semibold uppercase text-fg tracking-wide">Prioritized Findings</h3>
                  <span className="text-[10px] font-mono bg-bg border border-border px-2 py-1 rounded text-muted uppercase tracking-widest">{state?.findings?.length || 0} active</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                  {categories.map(c => counts[c] ? (
                    <span key={c} className="bg-bg border border-border/50 px-2 py-1 rounded text-[10px] font-mono text-muted flex items-center gap-1.5">
                      <span className="uppercase tracking-widest">{c}</span>
                      <span className="text-fg font-bold">{counts[c]}</span>
                    </span>
                  ) : null)}
                </div>
                <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin space-y-4">
                  {(state?.findings ?? []).length === 0 && (
                    <p className="text-sm text-faint italic mt-4 text-center">No current-day live findings.</p>
                  )}
                  {(state?.findings ?? []).map((finding) => (
                    <article key={finding.id} className="bg-bg border border-border/60 rounded-lg p-5">
                      <div className="flex items-start gap-4">
                        <span className={`shrink-0 px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-widest border ${severityClass[finding.severity] || "text-muted border-border"}`}>
                          {finding.severity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-fg leading-snug">{finding.title}</h4>
                          <p className="text-xs text-muted mt-2 leading-relaxed">{finding.detail}</p>
                          {finding.recommendation && (
                            <div className="mt-3 bg-surface border border-border/50 p-3 rounded text-xs text-fg">
                              <span className="font-semibold mr-1">Recommendation:</span>
                              <span className="text-muted">{finding.recommendation}</span>
                            </div>
                          )}
                          <div className="mt-4 flex flex-wrap gap-3">
                            {(Array.isArray(finding.evidence) ? finding.evidence : []).map((ev: any, i) => (
                              <a key={i} href={ev?.url || "https://vitalitychems.com"} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:text-primary-soft uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                Source {i + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              {/* Automatic Actions */}
              <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col h-[600px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-xl font-semibold uppercase text-fg tracking-wide">Automatic Actions</h3>
                  <span className="text-[10px] font-mono bg-bg border border-border px-2 py-1 rounded text-muted uppercase tracking-widest">Reversible</span>
                </div>
                <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin space-y-4">
                  {(state?.actions ?? []).length === 0 && (
                    <p className="text-sm text-faint italic mt-4 text-center">No reversible actions applied today.</p>
                  )}
                  {(state?.actions ?? []).map(action => (
                    <div key={action.id} className="bg-bg border border-border/60 rounded-lg p-5 flex flex-col">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <span className="font-mono text-[10px] text-primary bg-primary/10 px-2.5 py-1 rounded border border-primary/20 break-all">{action.action_key}</span>
                        {!action.rolled_back_at ? (
                          <button type="button" onClick={() => void rollbackAction(action.id)} disabled={busy} className="shrink-0 text-[10px] font-bold text-amber-400 hover:text-amber-300 uppercase tracking-widest hover:underline transition-colors">Roll back</button>
                        ) : (
                          <span className="shrink-0 text-[10px] text-muted uppercase tracking-widest">Rolled back</span>
                        )}
                      </div>
                      <p className="text-xs text-muted leading-relaxed mb-4">{action.rationale}</p>
                      <div className="text-[10px] font-mono text-faint bg-surface p-3 rounded border border-border/50 break-all flex flex-col gap-2">
                        <div className="flex gap-2 items-start"><span className="uppercase tracking-widest text-red-400/80 w-12 shrink-0">Before</span><span className="text-red-400/60 line-through">{JSON.stringify(action.before_value)}</span></div>
                        <div className="flex gap-2 items-start"><span className="uppercase tracking-widest text-profit/80 w-12 shrink-0">After</span><span className="text-profit/90">{JSON.stringify(action.after_value)}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* 4. Action Center (Backlogs) */}
      <details
        id="section-backlogs"
        className="min-w-0 border-t border-border/50 pt-8"
        open={openPanel === "backlogs"}
        onToggle={(event) => setOpenPanel(event.currentTarget.open ? "backlogs" : null)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
          <span>
            <span className="block font-display text-2xl font-semibold uppercase tracking-wider text-fg">Action Center</span>
            <span className="mt-1 block text-sm text-muted">Backlogs, watchlist, and reversible growth planning.</span>
          </span>
          <span className="shrink-0 text-xs uppercase tracking-widest text-primary">Expand</span>
        </summary>
        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <div className="bg-bg rounded-xl border border-border p-6 lg:col-span-2 xl:col-span-3 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-display text-lg font-semibold uppercase text-fg tracking-wide">Competitor Watchlist</h3>
                <p className="text-xs text-muted mt-1 max-w-3xl">One HTTPS URL per line. Research is recorded as failed when public web search is unavailable.</p>
              </div>
              <button type="button" onClick={() => void saveWatchlist()} disabled={busy} className="btn-primary text-xs py-2.5 px-6">Save Watchlist</button>
            </div>
            <div className="flex flex-col lg:flex-row gap-8">
              <textarea
                id="watchlist-input"
                aria-label="Competitor watchlist URLs"
                className="input-field flex-1 min-h-[160px] text-sm resize-y font-mono leading-relaxed"
                value={watchlist}
                onChange={e => setWatchlist(e.target.value)}
                placeholder="https://competitor.com"
              />
              <div className="w-full lg:w-96 shrink-0 bg-surface rounded-lg border border-border/50 p-4 flex flex-col h-[160px]">
                <h4 className="text-[10px] font-mono text-muted uppercase tracking-widest mb-3 shrink-0">Latest Check</h4>
                <div className="overflow-y-auto flex-1 pr-2 scrollbar-none space-y-2">
                  {(state?.competitors ?? []).slice(0, 20).map((c, i) => (
                    <div key={i} className="flex justify-between items-center gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                      <span className="truncate text-xs text-muted" title={c.url}>{c.url}</span>
                      <span className={`shrink-0 text-[10px] font-mono uppercase tracking-widest ${c.status === 'failed' ? 'text-amber-400' : 'text-primary'}`}>{c.status}</span>
                    </div>
                  ))}
                  {!(state?.competitors?.length) && !loading && <p className="text-xs text-faint italic">No competitor history.</p>}
                </div>
              </div>
            </div>
          </div>

          <ActionBacklog title="Ad Idea Backlog" description="Planning notes only. Manager never publishes or buys ads. Provider eligibility is never assumed." items={Array.isArray(state?.settings.ad_idea_backlog) ? state.settings.ad_idea_backlog : []} />
          <ActionBacklog title="Newsletter Content" description="Factual opt-in lot, documentation, method, and restock ideas. Staff approval required." items={Array.isArray(state?.settings.newsletter_content_backlog) ? state.settings.newsletter_content_backlog : []} />
          <ActionBacklog title="Community Content" description="Technical discussion and methods-note ideas. The manager never posts or spams." items={Array.isArray(state?.settings.community_content_backlog) ? state.settings.community_content_backlog : []} />
          <ActionBacklog title="Affiliate & Wholesale" description="Permission-based outreach. The manager never contacts partners or changes terms." items={Array.isArray(state?.settings.outreach_opportunity_backlog) ? state.settings.outreach_opportunity_backlog : []} />
          <ActionBacklog title="Security Hardening" description="Observed public-header and security-verification tasks. Staff handles all code changes." items={Array.isArray(state?.settings.security_backlog) ? state.settings.security_backlog : []} />
          <ActionBacklog title="Platform Policy" description="Search & platform evidence-backed review tasks. Eligibility is never assumed." items={Array.isArray(state?.settings.platform_policy_backlog) ? state.settings.platform_policy_backlog : []} />
        </div>
      </details>

      {/* 5. Approval Queue */}
      <details
        id="section-approvals"
        className="min-w-0 border-t border-border/50 pt-8"
        open={openPanel === "approvals"}
        onToggle={(event) => setOpenPanel(event.currentTarget.open ? "approvals" : null)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
          <span>
            <span className="block font-display text-2xl font-semibold uppercase tracking-wider text-fg">Approval Queue</span>
            <span className="mt-1 block text-sm text-muted">Review drafts before any staff-approved send or publish step.</span>
          </span>
          <span className="shrink-0 text-xs uppercase tracking-widest text-primary">Expand</span>
        </summary>
        <div className="mt-6">
          <AdminApprovalQueue />
        </div>
      </details>

      {/* 6. Content Engine */}
      <details
        id="section-content"
        className="min-w-0 border-t border-border/50 pt-8"
        open={openPanel === "content"}
        onToggle={(event) => setOpenPanel(event.currentTarget.open ? "content" : null)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
          <span>
            <span className="block font-display text-2xl font-semibold uppercase tracking-wider text-fg">Content Engine</span>
            <span className="mt-1 block text-sm text-muted">Reference-page drafts, gates, and publishing controls.</span>
          </span>
          <span className="shrink-0 text-xs uppercase tracking-widest text-primary">Expand</span>
        </summary>
        <div className="mt-6">
          <AdminContentEngine />
        </div>
      </details>

      {/* 7. Policy, acquisition, and Operating Pulse review */}
      <details
        id="section-policy"
        className="min-w-0 border-t border-border/50 pt-8"
        open={openPanel === "policy"}
        onToggle={(event) => setOpenPanel(event.currentTarget.open ? "policy" : null)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
          <span>
            <span className="block font-display text-2xl font-semibold uppercase tracking-wider text-fg">Policy & acquisition review</span>
            <span className="mt-1 block text-sm text-muted">Staff review queue for ads, SEO, and organic acquisition.</span>
          </span>
          <span className="shrink-0 text-xs uppercase tracking-widest text-primary">Expand</span>
        </summary>
        <div className="mt-6">
          <AdminAdStrategy snapshot={adSnapshot} />
        </div>
      </details>

      {/* 8. Operating Pulse (Analytics) */}
      {state?.pulse ? (
        <details
          id="section-pulse"
          className="min-w-0 border-t border-border/50 pt-8"
          open={openPanel === "pulse"}
          onToggle={(event) => setOpenPanel(event.currentTarget.open ? "pulse" : null)}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <span>
              <span className="block font-display text-2xl font-semibold uppercase tracking-wider text-fg">Operating Pulse</span>
              <span className="mt-1 block text-sm text-muted">Rolling 14-day funnel, telemetry, and scheduler health.</span>
            </span>
            <span className="shrink-0 text-xs uppercase tracking-widest text-primary">Expand</span>
          </summary>
          <div className="mt-6">
          <div className="grid min-w-0 gap-8 xl:grid-cols-2">
            <div className="min-w-0 space-y-8">
              {/* Funnel Totals */}
              <div className="min-w-0 bg-surface border border-border rounded-xl p-6 shadow-sm">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted mb-5">14-Day Funnel Totals</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Sessions", value: totals?.sessions || "—" },
                    { label: "Views", value: totals?.productViews || "—" },
                    { label: "Carts", value: totals?.addToCarts || "—" },
                    { label: "Checkouts", value: totals?.checkouts || "—" },
                    { label: "Paid Orders", value: totals?.paidOrders || "—" },
                    { label: "Revenue", value: totals?.revenue ? formatPrice(totals.revenue) : "—" },
                  ].map(s => (
                    <div key={s.label} className="bg-bg border border-border/60 rounded-lg p-4 flex flex-col justify-center">
                      <div className="text-[10px] uppercase tracking-widest text-muted mb-1.5">{s.label}</div>
                      <div className="font-mono text-xl text-fg">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conversion */}
              <div className="min-w-0 bg-surface border border-border rounded-xl p-6 shadow-sm">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted mb-5">Step Conversion</div>
                <div className="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-5">
                  {[
                    ["Sess → Prod", totals?.rates.sessionToProduct],
                    ["Prod → Cart", totals?.rates.productToCart],
                    ["Cart → Chkout", totals?.rates.cartToCheckout],
                    ["Chkout → Paid", totals?.rates.checkoutToPaidOrder],
                    ["Sess → Paid", totals?.rates.sessionToPaidOrder],
                  ].map(([label, value]) => (
                    <div key={label as string} className="min-w-0 bg-bg border border-border/60 rounded-lg p-3 flex flex-col gap-1.5 text-center">
                      <span className="break-words text-[9px] uppercase tracking-widest text-muted">{label}</span>
                      <span className="font-mono text-lg text-fg">{rate(value as number)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trend */}
              <div className="min-w-0 bg-surface border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted">14-Day Trend</div>
                  <div className="hidden w-48 shrink-0 justify-end gap-3 font-mono text-[9px] uppercase tracking-widest text-muted sm:flex">
                    <span className="w-10 text-right">Sess</span>
                    <span className="w-10 text-right">Ord</span>
                    <span className="w-20 text-right">Rev</span>
                  </div>
                </div>
                <div className="mb-2 grid grid-cols-3 gap-2 text-right font-mono text-[9px] uppercase tracking-widest text-muted sm:hidden">
                  <span>Sessions</span>
                  <span>Orders</span>
                  <span>Revenue</span>
                </div>
                <ul className="space-y-2">
                  {state.pulse.days.map((day) => {
                    const maxSessions = Math.max(...state.pulse!.days.map((d) => d.sessions), 1);
                    const width = Math.max(1, (day.sessions / maxSessions) * 100);
                    return (
                      <li key={day.day} className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-xs sm:flex sm:gap-4">
                        <span className="w-10 shrink-0 font-mono text-muted">{day.day.slice(5)}</span>
                        <div className="min-w-0 flex-1" aria-hidden="true">
                          <div className="h-1.5 w-full rounded-full bg-bg border border-border/30 overflow-hidden">
                            {day.sessions > 0 && <div className="h-full bg-primary/80 rounded-full" style={{ width: `${width}%` }} />}
                          </div>
                        </div>
                        <div className="col-start-2 grid grid-cols-3 gap-2 font-mono text-muted sm:flex sm:w-48 sm:shrink-0 sm:justify-end sm:gap-3">
                           <span className="text-right text-fg sm:w-10">{day.sessions || "—"}</span>
                           <span className="text-right text-fg sm:w-10">{day.paidOrders || "—"}</span>
                           <span className="text-right text-fg sm:w-20">{day.revenue ? formatPrice(day.revenue) : "—"}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div className="min-w-0 space-y-8">
              {/* Content Opportunities */}
              <div className="min-w-0 bg-surface border border-border rounded-xl p-6 shadow-sm">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted mb-5">Ranked Content Opportunities</div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                  {state.pulse.contentOpportunities.length === 0 ? (
                    <p className="text-xs text-faint italic text-center py-4">No content opportunities identified.</p>
                  ) : (
                    state.pulse.contentOpportunities.map((opp, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <a href={opp.path} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-primary hover:text-primary-soft transition-colors underline-offset-4 hover:underline">
                            {opp.title || opp.path}
                          </a>
                          <p className="text-[10px] font-mono text-muted mt-1.5 truncate">{opp.path}</p>
                        </div>
                        <div className="flex shrink-0 gap-4 text-right font-mono text-[10px] text-muted">
                           <div className="flex flex-col gap-1 w-8"><span className="uppercase tracking-widest text-faint text-[9px]">Views</span><span className="text-fg">{opp.views || "—"}</span></div>
                           <div className="flex flex-col gap-1 w-8"><span className="uppercase tracking-widest text-faint text-[9px]">Sess</span><span className="text-fg">{opp.sessions || "—"}</span></div>
                           <div className="flex flex-col gap-1 w-8"><span className="uppercase tracking-widest text-faint text-[9px]">Prod</span><span className="text-fg">{opp.sessions > 0 ? `${(opp.productRate * 100).toFixed(0)}%` : "—"}</span></div>
                           <div className="flex flex-col gap-1 w-8"><span className="uppercase tracking-widest text-faint text-[9px]">Cart</span><span className="text-fg">{opp.sessions > 0 ? `${(opp.cartRate * 100).toFixed(0)}%` : "—"}</span></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recovery Signals & Scheduler Health */}
              <div className="grid min-w-0 gap-6 sm:grid-cols-2">
                <div className="min-w-0 bg-surface border border-border rounded-xl p-6 shadow-sm">
                   <div className="text-[10px] font-mono uppercase tracking-widest text-muted mb-4 flex justify-between">
                     <span>Checkout Errors</span>
                     <span className="text-faint">{state.pulse.telemetry.window}</span>
                   </div>
                   {Object.entries(state.pulse.telemetry.errorCategories).length ? (
                      <ul className="space-y-2.5 text-xs text-muted">
                        {Object.entries(state.pulse.telemetry.errorCategories).slice(0, 5).map(([key, value]) => (
                          <li key={key} className="flex justify-between gap-3 items-center">
                            <span className="capitalize truncate flex-1">{key.replace(/_/g, " ")}</span>
                            <span className="font-mono text-fg bg-bg px-2 py-0.5 rounded border border-border/50">{value}</span>
                          </li>
                        ))}
                      </ul>
                   ) : <p className="text-xs text-faint italic py-2">No categorized checkout errors recorded.</p>}

                   <div className="text-[10px] font-mono uppercase tracking-widest text-muted mt-6 mb-4">Traffic Mix</div>
                   <div className="flex flex-wrap gap-2 text-xs text-muted">
                      {Object.entries(state.pulse.telemetry.devices).map(([key, value]) => (
                        <span key={key} className="bg-bg px-2 py-1 rounded border border-border/50">
                          <strong className="text-fg mr-1 font-mono">{value}</strong>{key}
                        </span>
                      ))}
                   </div>
                </div>

                <div className="min-w-0 bg-surface border border-border rounded-xl p-6 shadow-sm">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted mb-4">Scheduler Health</div>
                  <div className="space-y-4">
                    {state.pulse.workers.map((worker, i) => (
                      <div key={i} className="bg-bg border border-border/60 rounded-lg p-4 text-sm">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-medium text-fg text-xs truncate mr-2">{worker.label}</span>
                          <span className={`shrink-0 font-mono text-[9px] uppercase tracking-widest px-2 py-1 rounded border ${worker.status === 'running' ? 'text-primary border-primary/20 bg-primary/10' : worker.status === 'failed' ? 'text-red-400 border-red-400/20 bg-red-400/10' : 'text-muted border-border bg-surface'}`}>
                            {worker.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 font-mono text-[9px] text-muted text-center pt-3 border-t border-border/50">
                          <div className="flex flex-col gap-1"><span className="text-faint uppercase tracking-widest">Due</span><span>{worker.nextDueAt ? new Date(worker.nextDueAt).toLocaleTimeString() : '—'}</span></div>
                          <div className="flex flex-col gap-1"><span className="text-faint uppercase tracking-widest">Run</span><span>{worker.completedAt ? new Date(worker.completedAt).toLocaleTimeString() : '—'}</span></div>
                          <div className="flex flex-col gap-1"><span className="text-faint uppercase tracking-widest">Beat</span><span>{worker.heartbeatAt ? new Date(worker.heartbeatAt).toLocaleTimeString() : '—'}</span></div>
                        </div>
                        {worker.error && <p className="mt-3 text-[10px] font-mono text-red-400 bg-red-400/10 p-2.5 rounded border border-red-400/20 break-words">{worker.error}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}

function ActionBacklog({ title, description, items }: { title: string, description: string, items: unknown[] }) {
  return (
    <div className="bg-bg rounded-xl border border-border p-6 flex flex-col h-full shadow-sm">
      <h3 className="font-display text-lg font-semibold uppercase text-fg tracking-wide">{title}</h3>
      <p className="text-xs text-muted mt-1.5 mb-5 flex-1 max-w-[90%] leading-relaxed">{description}</p>
      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-2 scrollbar-thin">
        {(!Array.isArray(items) || items.length === 0) ? (
          <p className="text-xs text-faint italic py-2">No opportunities captured yet.</p>
        ) : (
          items.slice(0, 20).map((item, i) => (
            <div key={i} className="text-xs text-muted bg-surface rounded-lg p-3.5 border border-border/50 break-words leading-relaxed shadow-sm">
              {typeof item === "string" ? item : JSON.stringify(item)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
