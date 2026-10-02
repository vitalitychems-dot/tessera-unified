# Project map

The repository is a monorepo of related but separate apps. The current Tessera system remains the primary product; the Drive-imported Vitality Supply app and older standalone storefront are kept separate to avoid blending incompatible dependency/runtime assumptions.

| Project | Source / location | Run entry |
| --- | --- | --- |
| Tessera API | `artifacts/api-server` | `pnpm --filter @workspace/api-server run dev` |
| Tessera web | `artifacts/tessera` | `pnpm --filter @workspace/tessera run dev` |
| Vitality Supply | Google Drive archive → `artifacts/vitality-supply` | `pnpm --filter @workspace/vitality-supply run dev` |
| Legacy Vitality Chems storefront | `projects/vitality-chems-storefront` | `npm run dev` from that directory |
| UI preview sandbox | `artifacts/mockup-sandbox` | See its package scripts |

Shared packages live under `lib/`. Archived alternative code/document versions live under `archives/`; those snapshots are not active workspace packages unless explicitly added to a workspace manifest.
