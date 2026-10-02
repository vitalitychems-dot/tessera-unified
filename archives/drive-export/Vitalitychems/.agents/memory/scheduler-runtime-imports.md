---
name: Scheduler runtime imports
description: Constraints for code imported by production scheduler child processes.
---
Production schedulers launched with `tsx` do not have Vite's `import.meta.env` object. Any module reachable from a scheduler must use process-safe configuration helpers rather than importing Vite-only modules.

**Why:** A scheduler child can exit during container startup even when the bundled web server build passes, and the parent may then stop the service, causing an Autoscale publish health failure with no useful build stack trace.

**How to apply:** Keep scheduler dependency trees server-safe; use runtime environment helpers such as `serverSiteUrl()` for public origins, and reproduce with the artifact's exact production `start` command before publishing.