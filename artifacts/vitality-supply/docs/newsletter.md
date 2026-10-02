# Newsletter

## How it works

All newsletter and research-set signups are upserted into `store_subscribers` by
`src/lib/newsletter/api.ts`. Email addresses are normalized and unique
case-insensitively. A successful signup receives the `WELCOME10` promotion in
the storefront immediately. Each subscriber has an unguessable unsubscribe
token; newsletter messages link to `/unsubscribe?token=…`.

Welcome delivery is attempted immediately only when the Resend connector is
available and the `vitalitychems.com` domain reports as verified. If delivery
is unavailable or fails, `welcome_sent_at` remains empty. This is the queue:
staff can send those messages later from the Subscribers admin panel. No signup
is discarded because email delivery is unavailable.

Broadcasts only select rows where `unsubscribed_at` is empty. They are submitted
to Resend in batches of 50 and include a per-recipient unsubscribe link.

## Configuration

Connect the **Resend** integration in Replit Connectors. In Resend, add and
verify `vitalitychems.com`, including all DNS records Resend provides. The
default sender is:

`Vitality Supply <hello@vitalitychems.com>`

Optionally set the server environment variable `NEWSLETTER_FROM` to another
verified sender, for example `Vitality Supply <news@vitalitychems.com>`.
`DATABASE_URL` must also be configured as for the rest of the storefront.

The connector injects its own authorization; do not add or expose a Resend API
key in browser code.

Before the connector/domain is ready, the admin status says “not connected,”
new subscribers are safely queued, test/broadcast actions return an explicit
error, and the storefront still saves subscriptions and grants the promotion.
After connection and verification, new welcomes send immediately. Use **Send
queued welcomes** once to deliver the backlog.

## Export

Open Admin → Subscribers and choose **Export CSV**. The file includes email,
name, source, signup time, welcome delivery time, and unsubscribe time. The
export intentionally includes unsubscribed records for compliance/history; do
not import those rows into another active mailing list.