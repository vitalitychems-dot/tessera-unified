import { useMemo, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import {
  AD_POLICY_SOURCES,
  type AdFunnelSnapshot,
  buildOnDemandAdRecommendations,
} from "@/lib/growth";

type AdminAdStrategyProps = {
  snapshot: AdFunnelSnapshot | null;
};

export function AdminAdStrategy({ snapshot }: AdminAdStrategyProps) {
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [reviewSnapshot, setReviewSnapshot] = useState<AdFunnelSnapshot | null>(null);
  const recommendations = useMemo(
    () => (reviewSnapshot ? buildOnDemandAdRecommendations(reviewSnapshot) : []),
    [reviewSnapshot],
  );

  return (
    <section
      className="min-w-0 rounded-lg border border-border bg-surface p-6"
      data-testid="admin-ad-strategy"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="w-full min-w-0 max-w-3xl">
          <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
            Daily operator review
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold uppercase">
            Ad strategy recommendations
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Rules-generated from this dashboard&apos;s first-party funnel events and the
            manually maintained strategy config. This is an on-demand review queue, not live
            web research, an autonomous bot, an ad-provider integration, or a success report.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          data-testid="button-generate-ad-recommendations"
          onClick={() => {
            if (!snapshot) return;
            setReviewSnapshot(snapshot);
            setGeneratedAt(new Date().toISOString());
            trackEvent("ad_review_generated", { source: "admin_ads", kind: "rules_based" });
          }}
          disabled={!snapshot}
        >
          Generate review
        </button>
      </div>

      {generatedAt ? (
        <p
          className="mt-4 text-xs text-muted"
          data-testid="status-ad-recommendations-generated"
        >
          Generated on demand at {new Date(generatedAt).toLocaleString()}. No external source
          was queried.
        </p>
      ) : (
        <p className="mt-4 text-xs text-muted" data-testid="status-ad-recommendations-ready">
          {snapshot
            ? "Dashboard data is ready. Generate a review when you want a fresh rules-based queue."
            : "Waiting for the authenticated dashboard snapshot."}
        </p>
      )}

      {snapshot ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            <SnapshotMetric label="Sessions" value={snapshot.sessions} />
            <SnapshotMetric label="Product views" value={snapshot.productViews} />
            <SnapshotMetric label="Adds to cart" value={snapshot.addToCarts} />
            <SnapshotMetric label="Checkouts" value={snapshot.checkouts} />
            <SnapshotMetric label="Orders" value={snapshot.orders} />
          </div>
          <p className="mt-3 text-xs text-faint" data-testid="text-ad-funnel-disclosure">
            Observed aggregate events only; these values are not attributed to an ad, campaign,
            or provider.
          </p>

          {generatedAt ? (
            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              {recommendations.map((recommendation) => (
                <article
                  key={recommendation.id}
                  className="rounded-md border border-border bg-overlay p-5"
                  data-testid={`card-ad-recommendation-${recommendation.id}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                      {recommendation.priority} · {recommendation.channel}
                    </p>
                    <p className="text-[11px] text-faint">{recommendation.source}</p>
                  </div>
                  <h3 className="font-display mt-2 text-lg font-semibold uppercase">
                    {recommendation.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {recommendation.rationale}
                  </p>
                  <p className="mt-3 border-t border-border pt-3 text-sm leading-relaxed">
                    <span className="font-semibold">Next step: </span>
                    {recommendation.action}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="mt-8 border-t border-border pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="font-display text-xl font-semibold uppercase">
              Provider policy checkpoints
            </h3>
            <p className="mt-1 text-sm text-muted">
              Official links for human review. None of these links is a live approval check.
            </p>
          </div>
          <p className="font-mono text-[10px] tracking-widest text-warn uppercase">
            Approval required before paid submission
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {AD_POLICY_SOURCES.map((source) => (
            <article
              key={source.provider}
              className="rounded-md border border-border p-4"
              data-testid={`card-policy-source-${source.provider
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")}`}
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-display font-semibold uppercase">{source.provider}</h4>
                <span className="font-mono text-[10px] text-warn uppercase">Unverified</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{source.summary}</p>
              <p className="mt-2 text-xs leading-relaxed">{source.action}</p>
              <a
                href={source.url}
                onClick={() => trackEvent("ad_policy_opened", { source: "admin_ads", provider: source.provider })}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex text-xs text-primary underline-offset-4 hover:underline"
                data-testid={`link-policy-${source.provider
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}`}
              >
                Open official policy
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SnapshotMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-overlay p-3" data-testid={`metric-ad-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <p className="font-mono text-[10px] tracking-widest text-muted uppercase">{label}</p>
      <p className="font-display mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}