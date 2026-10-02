import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { confirmSubscription, unsubscribe } from "@/lib/newsletter/api";
import { noindexSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
    confirm: typeof search.confirm === "string" ? search.confirm : "",
  }),
  component: UnsubscribePage,
  head: () =>
    noindexSeoHead({
      title: "Unsubscribe",
      description: "Manage your Vitality Chems laboratory newsletter subscription.",
      path: "/unsubscribe",
    }),
});

function UnsubscribePage() {
  const { token, confirm } = Route.useSearch();
  const confirmation = confirm.length > 0;
  const actionToken = confirmation ? confirm : token;
  const validShape = /^[a-f0-9]{32}$/i.test(actionToken);
  const [state, setState] = useState<"working" | "done" | "invalid">(
    validShape ? "working" : "invalid",
  );
  const [error, setError] = useState<string | null>(
    validShape ? null : "We could not update that subscription.",
  );

  useEffect(() => {
    if (!validShape) return;
    (confirmation ? confirmSubscription({ data: { token: actionToken } }) : unsubscribe({ data: { token: actionToken } }))
      .then((result) => {
        setState(result.ok ? "done" : "invalid");
        if (!result.ok) setError("We could not update that subscription.");
      })
      .catch((caught) => {
        setState("invalid");
        setError("We could not update that subscription.");
      });
  }, [actionToken, confirmation, validShape]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6 text-fg">
      <section className="w-full max-w-lg rounded-lg border border-border bg-surface p-8 text-center">
        <img src="/brand/logo-64.png" alt="" width="64" height="64" className="mx-auto h-14 w-14" />
        <h1 className="font-display mt-5 text-3xl font-semibold tracking-wide uppercase">
          {state === "done"
            ? confirmation ? "Subscription confirmed" : "Unsubscribed"
            : state === "working" ? "Updating…" : "Unable to update"}
        </h1>
        <p className={`mt-4 text-sm ${state === "invalid" ? "text-red-300" : "text-muted"}`}>
          {state === "done"
            ? confirmation
              ? "Your subscription preferences have been updated."
              : "You will no longer receive Vitality Chems newsletter emails."
            : state === "working"
              ? "Please wait while we update your subscription."
              : error}
        </p>
        <Link to="/" className="btn-secondary mt-7 inline-flex">Return to catalog</Link>
      </section>
    </main>
  );
}