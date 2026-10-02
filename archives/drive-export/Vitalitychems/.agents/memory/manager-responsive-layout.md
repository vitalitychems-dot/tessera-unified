---
name: Manager responsive layout
description: Narrow-screen constraints that keep the authenticated Manager workspace from inheriting hidden nested scroll widths.
---

Nested Manager grid and flex items need explicit `min-width: 0`, and long labels or URLs must be allowed to wrap. The app wrapper should clip horizontal overflow so internal min-content widths cannot become document-level scrolling.

**Why:** CSS grid and flex min-content sizing can propagate hidden scroll width to the document even when no visible card extends past the viewport. This makes a narrow layout look correct while still allowing horizontal page scrolling.

**How to apply:** When adding responsive Manager sections, add `min-w-0` at nested grid/flex boundaries, prefer wrapping over no-wrap labels, and verify both descendant bounds and `documentElement.scrollWidth` at the narrowest supported width.