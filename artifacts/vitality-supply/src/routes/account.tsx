import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isAdminEmail } from "@/lib/business";
import {
  loadMyAccount,
  createMyAffiliateCode,
  loadMyReferralCode,
  claimGuestOrders,
  saveMyBusinessProfile,
} from "@/lib/store-api";
import { CREDIT_RATE } from "@/lib/pricing";
import { formatPrice } from "@/lib/utils";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { noindexSeoHead } from "@/lib/seo";
import { authClient, resendVerificationEmail } from "@/lib/auth/client";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/account")({
  component: Account,
  head: () =>
    noindexSeoHead({
      title: "Lab account",
      description: "Private Vitality Chems account dashboard for laboratory order credits and history.",
      path: "/account",
    }),
});

type AccountData = Awaited<ReturnType<typeof loadMyAccount>>;

function Account() {
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<AccountData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const [passwordMsg, setPasswordMsg] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [ein, setEin] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(
    null,
  );
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);
  const verificationReportedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (user.emailVerified && !verificationReportedRef.current) {
      verificationReportedRef.current = true;
      trackEvent("verification_result", { status: "verified" });
    }
    loadMyAccount()
      .then((value) => {
        setData(value);
        setBusinessEmail(value.profile.businessEmail);
      })
      .catch((e: Error) => setError(e.message));
    loadMyReferralCode()
      .then((value) => setReferralCode(value.code))
      .catch(() => setReferralCode(""));
  }, [user]);

  if (isPending) {
    return (
      <div className="min-h-dvh bg-bg text-fg">
        <SiteHeader active="signin" />
        <main className="mx-auto max-w-3xl px-6 pt-8">
          <div className="h-24 animate-pulse rounded-lg bg-surface" />
        </main>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader active="signin" />
      <main className="mx-auto max-w-3xl px-6 pt-8 pb-20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-widest text-primary uppercase">Lab account</p>
            <h1 className="font-display mt-2 text-3xl font-semibold tracking-wide uppercase">
              Your credit
            </h1>
            <p className="mt-2 text-sm text-muted">
              {user.primaryEmail ?? user.displayName}
            </p>
          </div>
          <UserButton />
        </div>

        {isAdminEmail(user.primaryEmail) && (
          <Link to="/admin" rel="nofollow" className="mt-4 inline-flex text-sm text-primary hover:underline">
            Open staff analytics →
          </Link>
        )}

        <section className="mt-8 rounded-lg border border-border bg-surface p-6">
          <p className="font-mono text-[10px] tracking-widest text-muted uppercase">
            Available reward credits
          </p>
          <p className="font-display mt-2 text-5xl font-semibold tabular-nums text-primary">
            {formatPrice(data?.balance ?? 0)}
          </p>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
            {Math.round(CREDIT_RATE * 100)}% of merchandise (after bulk and promo) lands here as
            reward credits after each paid order. Spend them on the next catalog order — never the
            same invoice that earned them.
          </p>
          <Link to="/" className="btn-primary mt-6 inline-flex">
            Shop with credit
          </Link>
        </section>

        <section className="mt-8 rounded-lg border border-border bg-surface p-6">
          <h2 className="font-display text-xl font-semibold tracking-wide uppercase">Research order profile</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Optional details can prefill future research orders. They do not establish legal,
            regulatory, tax, or research-use compliance. EINs are stored as a protected fingerprint,
            not in readable form, and can never be displayed here or in order emails.
          </p>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();
              setProfileMsg("");
              try {
                const result = await saveMyBusinessProfile({
                  data: { businessEmail, ein: ein || undefined },
                });
                setEin("");
                setProfileMsg(
                  result.einProvided
                    ? "Profile saved. Your EIN is protected and will not be shown."
                    : "Profile saved.",
                );
                loadMyAccount().then(setData).catch(() => undefined);
              } catch (cause) {
                setProfileMsg(cause instanceof Error ? cause.message : "Could not save profile.");
              }
            }}
          >
            <label className="text-xs tracking-widest text-muted uppercase">
              Business email (optional)
              <input
                data-testid="input-account-business-email"
                type="email"
                className="input-field mt-1 w-full"
                value={businessEmail}
                onChange={(event) => setBusinessEmail(event.target.value)}
              />
            </label>
            <label className="text-xs tracking-widest text-muted uppercase">
              EIN (optional)
              <input
                data-testid="input-account-ein"
                inputMode="numeric"
                pattern="\d{2}-?\d{7}"
                maxLength={10}
                autoComplete="off"
                placeholder={data?.profile.einProvided ? "EIN on file — enter to replace" : "12-3456789"}
                className="input-field mt-1 w-full"
                value={ein}
                onChange={(event) => setEin(event.target.value)}
              />
            </label>
            <button data-testid="button-save-business-profile" type="submit" className="btn-primary justify-self-start sm:col-span-2">
              Save optional details
            </button>
          </form>
          {profileMsg && <p className="mt-3 text-sm text-primary" role="status">{profileMsg}</p>}
        </section>

        {user.emailVerified && (
          <section className="mt-8 rounded-lg border border-border bg-surface p-6">
            <h2 className="font-display text-xl font-semibold tracking-wide uppercase">
              Import guest order history
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              If you placed orders before creating this account, securely associate
              orders using your verified account email. Orders already associated with
              another account cannot be claimed.
            </p>
            <button
              data-testid="button-claim-guest-orders"
              type="button"
              className="btn-primary mt-4"
              disabled={claimBusy}
              onClick={async () => {
                setClaimBusy(true);
                setClaimMessage(null);
                try {
                  const result = await claimGuestOrders({ data: { confirm: true } });
                  setClaimMessage(
                    result.claimed
                      ? `${result.claimed} guest order${result.claimed === 1 ? "" : "s"} added to your account.`
                      : "No unclaimed guest orders were found for your verified email.",
                  );
                  const refreshed = await loadMyAccount();
                  setData(refreshed);
                } catch (cause) {
                  setClaimMessage(
                    cause instanceof Error ? cause.message : "Could not import guest orders.",
                  );
                } finally {
                  setClaimBusy(false);
                }
              }}
            >
              {claimBusy ? "Checking…" : "Import guest orders"}
            </button>
            {claimMessage && (
              <p className="mt-3 text-sm text-primary" role="status">{claimMessage}</p>
            )}
          </section>
        )}

        <section className="mt-8 rounded-lg border border-primary/40 bg-surface p-6">
          <h2 className="font-display text-xl font-semibold tracking-wide uppercase">Your customer referral code</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Share this unique code with a new customer. Referral redemption requires a signed-in
            account with a verified email. They receive 5% off their first paid order; you receive
            10% in lab credit after payment clears. One referral per customer, no self-referrals,
            no cash payouts, and no credit for unpaid or cancelled orders. A pending referral
            reservation is released if its order is cancelled.
          </p>
          {referralCode ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span data-testid="text-account-referral-code" className="rounded border border-primary/40 bg-primary/10 px-3 py-2 font-mono font-semibold tracking-wider text-primary">
                {referralCode}
              </span>
              <button
                data-testid="button-account-copy-referral"
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => void navigator.clipboard?.writeText(referralCode)}
              >
                Copy code
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Verify your account email to receive a customer referral code, then refresh this page.
            </p>
          )}
        </section>

        {!user.emailVerified && (
          <section
            data-testid="section-account-email-verification"
            className="mt-8 rounded-lg border border-primary/40 bg-primary/5 p-6"
          >
            <h2 className="font-display text-xl font-semibold tracking-wide uppercase">
              Verify your email
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Confirm ownership of {user.primaryEmail ?? "your email address"} to
              activate customer referral eligibility and related rewards.
              Account access and ordinary checkout remain available. Request a
              verification link below; delivery requires the configured Resend
              sender domain to be verified.
            </p>
            <button
              data-testid="button-resend-email-verification"
              type="button"
              className="btn-primary mt-4"
              disabled={verificationBusy || !user.primaryEmail}
              onClick={async () => {
                if (!user.primaryEmail) return;
                setVerificationBusy(true);
                setVerificationMessage(null);
                try {
                  await resendVerificationEmail({
                    email: user.primaryEmail,
                    callbackURL: "/account?verified=1",
                  });
                  trackEvent("verification_requested", { status: "sent", channel: "email" });
                  setVerificationMessage(
                    "Verification email sent. Check your inbox and spam folder, then use the link.",
                  );
                } catch (cause) {
                  setVerificationMessage(
                    cause instanceof Error
                      ? cause.message
                      : "Unable to send the verification email.",
                  );
                } finally {
                  setVerificationBusy(false);
                }
              }}
            >
              {verificationBusy ? "Sending…" : "Resend verification email"}
            </button>
            {verificationMessage && (
              <p className="mt-3 text-sm leading-relaxed text-muted" role="status">
                {verificationMessage}
              </p>
            )}
          </section>
        )}

        <section className="mt-10 rounded-lg border border-primary/40 bg-surface p-6">
          <h2 className="font-display text-xl font-semibold tracking-wide uppercase">
            Your affiliate code
          </h2>
          <p className="mt-2 text-sm text-muted">
            Buyers save 5%. You earn 10–15% back as lab credit (12.5% after $1k referred, 15% after
            $5k). Credit spends on a later order.
          </p>
          {data?.affiliates?.length ? (
            <ul className="mt-4 space-y-2">
              {data.affiliates.map((a) => (
                <li key={a.code} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="font-mono font-semibold text-primary">{a.code}</span>
                  <span className="text-xs text-muted">
                    {a.redemptions} orders · {formatPrice(a.merch)} referred
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await createMyAffiliateCode({ data: { code } });
              if (res.ok) {
                setCodeMsg(`Code ${res.code} is live.`);
                setCode("");
                loadMyAccount().then(setData);
              } else setCodeMsg(res.error ?? "Could not create.");
            }}
          >
            <input
              aria-label="New affiliate code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. LABDESK"
              className="input-field flex-1"
            />
            <button type="submit" className="btn-primary">
              Create
            </button>
          </form>
          {codeMsg && <p className="mt-2 text-sm text-primary" role="status">{codeMsg}</p>}
        </section>

        {error && <p className="mt-4 text-sm text-red-400" role="alert">{error}</p>}

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold tracking-wide uppercase">
            Credit activity
          </h2>
          {!data?.ledger.length ? (
            <p className="mt-3 text-sm text-muted">
              No credits yet. Place a research order while signed in to start the balance.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
              {data.ledger.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium capitalize">{row.reason}</p>
                    <p className="font-mono text-[11px] text-muted">
                      {row.order_id ?? "—"} · {new Date(row.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={
                      row.delta >= 0 ? "font-mono text-primary tabular-nums" : "font-mono tabular-nums"
                    }
                  >
                    {row.delta >= 0 ? "+" : ""}
                    {formatPrice(row.delta)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold tracking-wide uppercase">Orders</h2>
          {!data?.orders.length ? (
            <p className="mt-3 text-sm text-muted">No catalog orders on this account yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
              {data.orders.map((o) => (
                <li key={o.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Link to="/order/$id" rel="nofollow" params={{ id: o.id }} search={{ k: "", paid: false }} className="font-mono text-sm text-primary hover:underline">
                      {o.reference ?? o.id}
                    </Link>
                    <p className="font-mono text-sm tabular-nums">{formatPrice(o.total)}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(o.created_at).toLocaleString()} · {o.payment_method ?? "order"} · {o.payment_status} / {o.status}
                    {o.credit_earned > 0 ? ` · banked ${formatPrice(o.credit_earned)}` : ""}
                    {o.credit_applied > 0 ? ` · spent ${formatPrice(o.credit_applied)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="mt-10 rounded-lg border border-border bg-surface p-6">
          <h2 className="font-display text-xl font-semibold tracking-wide uppercase">Change password</h2>
          <form
            className="mt-4 grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (password.next.length < 8 || password.next !== password.confirm) {
                setPasswordMsg("New passwords must match and contain at least 8 characters.");
                return;
              }
              const result = await authClient.changePassword({
                currentPassword: password.current,
                newPassword: password.next,
                revokeOtherSessions: true,
              });
              if (result.error) setPasswordMsg(result.error.message ?? "Password change failed.");
              else {
                setPassword({ current: "", next: "", confirm: "" });
                setPasswordMsg("Password changed.");
              }
            }}
          >
            <input
              type="email"
              name="username"
              autoComplete="username"
              value={user.primaryEmail ?? ""}
              readOnly
              hidden
            />
            <input
              type="password"
              aria-label="Current password"
              className="input-field"
              placeholder="Current password"
              autoComplete="current-password"
              value={password.current}
              onChange={(e) => setPassword({ ...password, current: e.target.value })}
              required
            />
            <input
              type="password"
              aria-label="New password"
              className="input-field"
              placeholder="New password"
              autoComplete="new-password"
              value={password.next}
              onChange={(e) => setPassword({ ...password, next: e.target.value })}
              required
              minLength={8}
            />
            <input
              type="password"
              aria-label="Confirm new password"
              className="input-field"
              placeholder="Confirm new password"
              autoComplete="new-password"
              value={password.confirm}
              onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
              required
            />
            {passwordMsg && <p className="text-sm text-primary" role="status">{passwordMsg}</p>}
            <button type="submit" className="btn-primary justify-self-start">
              Change password
            </button>
          </form>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
