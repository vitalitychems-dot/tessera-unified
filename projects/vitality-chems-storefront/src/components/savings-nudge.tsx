import { Link } from "@tanstack/react-router";
import { BULK_TIERS, CREDIT_RATE } from "@/lib/pricing";
import { formatPrice, cn } from "@/lib/utils";

export function LabRatesBar() {
  return (
    <div className="border-y border-border bg-surface">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 md:grid-cols-4">
        {BULK_TIERS.map((t) => (
          <div key={t.qty} className="border-border px-3 py-2 md:border-r last:border-r-0">
            <p className="font-display text-xs font-semibold tracking-wide text-primary uppercase">
              {t.percent}% off
            </p>
            <p className="mt-0.5 text-xs text-muted">{t.label}</p>
          </div>
        ))}
        <div className="px-3 py-2">
          <p className="font-display text-xs font-semibold tracking-wide text-primary uppercase">
            {Math.round(CREDIT_RATE * 100)}% reward credits
          </p>
          <p className="mt-0.5 text-xs text-muted">Banked for your next order</p>
        </div>
      </div>
    </div>
  );
}

export function BulkNudge({
  vialQty,
  next,
  bulk,
}: {
  vialQty: number;
  next: { qty: number; percent: number; label: string } | null;
  bulk: { qty: number; percent: number; label: string } | null;
}) {
  if (bulk && !next) {
    return (
      <p className="rounded-sm border border-border bg-overlay px-3 py-2 text-xs text-primary">
        Inventory rate unlocked — {bulk.percent}% off this entire order.
      </p>
    );
  }
  if (!next) return null;
  const need = next.qty - vialQty;
  return (
    <p className="rounded-sm border border-border bg-overlay px-3 py-2 text-xs text-muted">
      Add {need} more vial{need === 1 ? "" : "s"} to unlock{" "}
      <span className="font-semibold text-primary">
        {next.percent}% {next.label}
      </span>
      .
    </p>
  );
}

export function CreditEarnLine({
  amount,
  signedIn,
}: {
  amount: number;
  signedIn: boolean;
}) {
  if (amount <= 0) return null;
  if (!signedIn) {
    return (
      <p className="text-xs text-muted">
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>{" "}
        to bank {formatPrice(amount)} in reward credits toward your next order.
      </p>
    );
  }
  return (
    <p className="text-xs text-primary">
      This order adds {formatPrice(amount)} in reward credits toward your next purchase.
    </p>
  );
}

export function SaveBadge({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  if (amount <= 0) return null;
  return (
    <p className={cn("font-display text-sm font-semibold tracking-wide text-primary uppercase", className)}>
      You save {formatPrice(amount)}
    </p>
  );
}
