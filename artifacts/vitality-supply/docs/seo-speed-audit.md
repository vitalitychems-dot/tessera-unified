# Vitality Supply SEO and speed audit

## Production measurements

Raw byte counts were taken from Vite/Nitro production builds. “Home JS” is the
entry plus the public home route, product-card, header, footer, and directly
required shared chunks; it excludes admin and deferred UI chunks. Request
counts describe the cold first screen (document, CSS/JS, logo, and the two
eager first-row images), rather than lazy images requested after scrolling.

| Metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| Main entry JS | 519,543 B | 476,598 B | -42,945 B (-8.3%) |
| Approx. cold home JS | 547,300 B | 531,600 B | -15,700 B (-2.9%) |
| First-row product images | 54,982 B | 13,494 B | -41,488 B (-75.5%) |
| Cold first-screen requests | Not captured before HMR updated | 8 critical resource references | Baseline unavailable; bytes are reduced |

The after build emitted ResearchChat (4,512 B), WelcomePopup (6,267 B),
CartDrawer (6,046 B), PromoCatcher (2,350 B), and SocialProof (1,474 B) as
separate lazy chunks. They are no longer evaluated during the first render.
The entry still includes the public router/runtime and Lucide. Better Auth is
in a separate 28,048-byte client chunk but remains required by the eager auth
provider.

The build did not emit Recharts, React Table, React Hook Form, or Framer Motion
in the public critical path. Conservative manual chunk boundaries protect the
admin chart/table/form libraries if those dormant UI modules are connected
later. No public shell statically imports the admin route.

## Rendering and image changes

- Product cards use `content-visibility: auto` with an intrinsic placeholder,
  fixed 4:5 image geometry, async decoding, and lazy loading below the first
  row.
- Category selection updates immediately while the catalog computation runs
  in a React transition. Ranked lists are memoized and are not sorted again in
  the component.
- `scripts/build-image-variants.mjs` recreates 400 × 500, quality-80 WebP
  derivatives from every top-level product WebP. It generated 64 derivatives
  (402,358 B total) in this checkout. It will include
  `generic-vial.webp` automatically as soon as that concurrently managed
  source is present.
- Cards select a 400w derivative via `srcset`; product details retain the full
  800 × 1000 source. Missing or failed exact images use the generic vial with
  an explicit product-and-dose overlay and “representative vial” disclosure.
- The age gate is removed from the React tree after acceptance. Its focus
  listener is cleaned up, inert is removed, and exempt routes no longer match
  the document scroll lock.

## SEO

The root metadata includes the absolute
`https://vitalitychems.com/og/preview.jpg` Open Graph and Twitter image,
1200 × 630 Open Graph dimensions, and `summary_large_image`. Route-level
canonical generation remains unchanged.

## Dependencies eligible for removal

Static import/reference checks show these package dependencies have no live
application consumer:

- `framer-motion`
- `@tanstack/react-table`
- `@hookform/resolvers`
- `react-hook-form` (referenced only by the unreferenced `ui/form` module)
- `recharts` (referenced only by the unreferenced `ui/chart` module)
- `embla-carousel-react` (referenced only by the unreferenced `ui/carousel` module)
- `react-icons`
- `wouter`

They were not removed because dependency manifests are outside this task’s
file ownership.

## Verification notes

- `PORT=3000 pnpm run build`: passed; Nitro node-server output generated.
- `pnpm run typecheck`: currently blocked by concurrent edits outside this
  task (admin P&L nullable costs, required login search params, and the
  welcome-popup timer type). No error was reported in a file changed by this
  optimization.
- Development SSR smoke checks returned HTTP 200 for `/` (43,910 bytes) and
  `/product/vial-compounds__semaglutide` (33,692 bytes).

The search overlay is still statically imported by `site-header.tsx`. That
file is outside this task’s ownership; convert its import to `React.lazy` (or
move overlay ownership to the root shell) to finish deferring search code.