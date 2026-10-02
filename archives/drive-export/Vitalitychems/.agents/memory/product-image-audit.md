---
name: Product vial image audit
description: How vial photos are verified and mapped for Vitality Supply; why filenames and manifest labels cannot be trusted and how missing doses are produced.
---

# Product vial images — the printed label is the only truth

**Rule:** a vial render is correct only if the compound name and strength printed on the
vial itself match the SKU + dose. Filenames, `manifest.json` labels and any caption
text under the vial were all wrong for a chunk of the uploads (several files were
duplicates of Retatrutide 10 mg / Pinealon / AOD-9604 under other names).

**Why:** the user repeatedly caught wrong photos (CJC/Ipa blend showing Pinealon,
GHRP-2 showing Retatrutide). Trusting metadata is what caused those regressions.

**How to apply:**
- Verify visually at ≥2.5× zoom on the label column before adding an entry to
  `VERIFIED_PHOTOS` in `src/lib/vial-photos.ts`.
- When no correct upload exists for a dose, derive it from a verified same-compound
  sibling by re-lettering only the strength text (`scripts/derive-dose-variants.mjs`,
  deterministic, has `--check`). Never pick a "close enough" different compound.
- Vial SKUs without an exact render fall back to `generic-vial.webp` (text erased);
  non-vial forms keep the "photo unavailable" SVG.
- Any regenerated image must bump `PHOTO_VERSION` (query-string cache buster) or
  browsers/CDN keep serving the old wrong vial.
- Caption blocks were stripped from all vials (`scripts/strip-captions.mjs`) because
  they carried the wrong CAS; the HTML prints name/dose/CAS instead.
- Regenerate `public/product-images/w400/` (`scripts/build-image-variants.mjs`)
  after any canonical image change — srcSet points at both sizes.
