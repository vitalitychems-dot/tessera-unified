# Authenticated Manager smoke-test evidence

Date: 2026-09-17  
Route: `/admin`  
Session: existing authenticated staff browser session

## Verified

- The protected Manager workspace rendered with the staff shell, `Sign out`, `Operator Workspace`, `Audit & Autonomy`, and `Exceptions & next actions`.
- The aggregate read-only question `What is the largest funnel opportunity?` produced the bounded provider-unavailable fallback answer.
- The live exception `2 unpaid card orders are aging` exposed `Open Orders`; the AI audit exception exposed `Open Manager workspace`.
- At 320px, `document.documentElement.clientWidth` and `scrollWidth` were both `305`; no document-level horizontal overflow was present.
- The 320px Manager view kept the chat input and Send control in bounds.
- No new failed Manager request or browser console error occurred during the successful interaction and narrow-width capture.

## Browser captures

These captures were returned by the authenticated Playwright smoke session:

- `juvig8` — authenticated 1440px Manager workspace with Operator Workspace, nominal status, chat, and exception inbox.
- `csdkt6` — authenticated Manager view with Exceptions & next actions and Audit & Autonomy.
- `lk258e` — authenticated 320px Manager view with the conversation area, Send control, and Open Orders exception destination.

Mutation controls were intentionally not clicked during this read-only confirmation.