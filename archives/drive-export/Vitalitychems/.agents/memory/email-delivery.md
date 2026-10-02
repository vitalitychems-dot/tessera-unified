---
name: Email delivery via Resend
description: Why customer email is gated on a verified sender domain and routed through an outbox; what to check when "no emails are arriving".
---
Rule: never send customer mail unless the configured sender's exact domain shows `verified` in Resend's `/domains`; queue instead (subscriber row for welcomes, `store_order_emails` outbox for orders).

**Why:** Resend rejects mail from unverified domains outright, and the production sender setting can drift from the site's canonical domain. An architect review flagged fire-and-forget sends as data loss, hence the outbox with claim-before-send and state re-check.

**How to apply:** if emails "don't arrive", compare the live `store_settings.email_from` domain with Resend's current domain status, then use Admin → Subscribers → Email delivery to correct the sender or complete DNS verification. Do not add an `[redacted-email]` fallback for production. Keep the Resend domain cache separate from the sender address (sender is read per send). Public lead notifications belong in their own transactional outbox, not the order or newsletter tables; pass the submitter as reply-to while keeping the configured sender as the from address. When adding a new customer email kind, add it to the outbox `KINDS` and give it a state predicate in `buildMessage`. Dead-letter rows must stay out of automatic flushes and require an explicit, audited retry.
