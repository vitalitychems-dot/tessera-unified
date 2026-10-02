# Product image audit

## Processing policy

The complete uploaded batch was inventoried by filename, dimensions, byte size,
SHA-256, and visible vial label. A candidate was accepted only when the printed
compound **and** printed quantity exactly matched a current vial catalog
variant. Filename similarity, CAS number similarity, and a matching compound
with a different quantity were not sufficient evidence.

Accepted assets are in `public/product-images` and are normalized to an
800 × 1000 black-letterboxed WebP canvas at quality 90 with metadata stripped.
The source is fit inside the canvas without upscaling or cropping the vial,
name, or dose. The machine-readable source-level inventory is
`public/product-images/manifest.json`; it records the source, label, dose,
decision, source hash/dimensions/bytes, output, output bytes, and rejection or
duplicate reason for every upload.

## Batch results

| Measure | Count / bytes |
| --- | ---: |
| Uploaded image files inventoried | 101 |
| Unique exact catalog variants retained from uploads | 60 |
| Duplicate product + strength uploads | 18 |
| Rejected uploads | 23 |
| Contradictory label/caption uploads | 2 |
| Uploaded source bytes | 13,482,957 |
| Canonical WebP assets (including 4 previously audited variants) | 64 |
| Canonical bytes after normalization | 1,725,400 |
| Byte reduction against uploaded source batch | 87.2% |

The 18 duplicate product-strength uploads retain the largest/cleanest source
for that exact variant. The two byte-identical upload pairs are both recorded
in the manifest and never produce redundant canonical assets:
`IMG_1581_1789405572137.jpeg` / `IMG_1581_1789405613028.jpeg` and
`IMG_1688_1789405426800.jpeg` / `IMG_1688_1789405475063.jpeg`.

## Contradictory labels rejected

- `IMG_1663_1789405539668.jpeg`: the vial label reads **TB-500 10MG**,
  while the bottom caption reads **RETATRUTIDE**.
- `IMG_1693_1789405426800.jpeg`: the vial label reads **GLUTATHIONE
  1500MG**, while the bottom caption carries **RETATRUTIDE CAS
  2381089-83-2**.

Both are rejected rather than relabeled. The screenshot/error image
`IMG_1795_1789404192039.png` is also rejected because it contains no
identifiable vial.

## Canonical exact mappings

`src/lib/vial-photos.ts` is the single source of truth. Every entry below
points to `/product-images/{key}.webp` (served with a `?v=` cache-busting
version); vial variants not in this list render the neutral generic vial with
an HTML caption rather than a guessed image.

```text
5-amino-1mq-5mg
aod-9604-5mg · ara-290-10mg
bpc-157-5mg · bpc-157-10mg · bpc-tb-blend-10mg-10mg
cagrilintide-10mg
cjc-1295-no-dac-5mg · cjc-1295-no-dac-10mg
cjc-1295-with-dac-5mg · cjc-1295-w-o-dac-ipamorelin-5mg-5mg
dsip-5mg
epithalon-10mg · epithalon-50mg
frag-176-191-5mg
ghk-cu-50mg · ghk-cu-100mg
ghrp-2-5mg · ghrp-2-10mg
ghrp-6-5mg · ghrp-6-10mg
glow-10-10-50mg
hcg-5000iu · hexarelin-5mg · igf-1-lr3-1mg
ipamorelin-5mg · ipamorelin-10mg
kisspeptin-5mg · klow-80mg · kpv-10mg · ll-37-5mg
mots-c-10mg · mots-c-40mg · mt-2-10mg · nad-500mg
oxytocin-5mg · pinealon-10mg · pt-141-10mg
retatrutide-10mg · retatrutide-20mg · retatrutide-30mg
selank-5mg · selank-10mg · semax-10mg · sermorelin-10mg
semaglutide-5mg · semaglutide-10mg · semaglutide-15mg
semaglutide-20mg · semaglutide-30mg
snap-8-10mg · ss-31-10mg · ss-31-50mg
tb-500-5mg · tb-500-10mg
tesamorelin-5mg · tesamorelin-10mg
thymalin-10mg · thymosin-alpha-1-ta1-5mg
tirzepatide-10mg · tirzepatide-15mg · tirzepatide-20mg
tirzepatide-30mg · tirzepatide-60mg · vip-10mg
```

Four exact variants had already been audited but had no uploaded replacement
in this batch (`cjc-1295-no-dac-5mg`,
`cjc-1295-w-o-dac-ipamorelin-5mg-5mg`, `semaglutide-15mg`, and
`semaglutide-30mg`). They were normalized from their existing audited vial
asset into the same canonical WebP library and are listed in the manifest's
`legacyRetained` section.

## Visual re-audit (2026-09-14)

The original batch labels came from filenames and were not reliable. Every
canonical file was re-opened and both printed strength locations (the rotated
compound/strength column on the label and the purple strip) were read at 2.5×
zoom. Seven canonical files failed and were retired:

| Canonical file | What the label actually said |
| --- | --- |
| `cjc-1295-no-dac-5mg.webp` | AOD-9604 5MG |
| `cjc-1295-w-o-dac-ipamorelin-5mg-5mg.webp` | PINEALON 10MG |
| `ghrp-2-5mg.webp` | RETATRUTIDE 10MG (strip: GHRP-2 - 5MG) |
| `ipamorelin-5mg.webp` | RETATRUTIDE 10MG (strip: IPAMORELIN - 5MG) |
| `semaglutide-15mg.webp` | CAGRILINTIDE 10MG |
| `semaglutide-20mg.webp` | SEMAGLUTIDE 30MG |
| `tirzepatide-15mg.webp` | TIRZEPATIDE 5MG |

No upload in the batch carries a correct label for those seven strengths or
for Retatrutide 10mg (`attached_assets` was re-inventoried the same way), so
the eight renders were **derived** from a verified sibling of the same
compound with `scripts/derive-dose-variants.mjs`: only the strength text is
re-lettered, in both printed locations; bottle, compound name, logo and
disclaimers are the source pixels. The blend (`cjc-1295-w-o-dac-ipamorelin`)
reuses the two-compound layout of the BPC/TB render with its compound column
re-lettered as well. Each derived output was re-inspected the same way as the
originals. Sources and hashes are recorded under `audit.derived` in the
manifest.

The caption block printed under every vial (name / CAS / "Research use only")
was erased with `scripts/strip-captions.mjs`: many captions carried the
Retatrutide CAS on unrelated compounds. The storefront prints the name,
strength and CAS from the catalog next to the photo instead.

`generic-vial.webp` is the IGF-1 LR3 render with its compound and strength
text removed; it is the only fallback for a vial SKU without an exact render
and is always shown with an HTML caption naming the product and strength.

Regenerating after any change: `node scripts/strip-captions.mjs` (new
uploads), `node scripts/derive-dose-variants.mjs`, then
`node scripts/build-image-variants.mjs`, and bump `PHOTO_VERSION` in
`src/lib/vial-photos.ts`.

## Vial-only catalog verification (2026-09-15)

The active `PRODUCTS` list now contains vial variants only. The pricing check
also checks every active variant against `hasExactPhoto()`:

- an exact printed-label match uses the verified mapping in
  `src/lib/vial-photos.ts`;
- a variant without an exact match uses only `generic-vial.webp`;
- no sibling strength or different compound is substituted.

This verification is part of `scripts/check-pricing.ts`; the generic fallback
is deliberately captioned in the storefront as a representative vial rather
than an exact product image.

## Cleanup and references

Before cleanup, ripgrep found no source/public references to the legacy
`public/vials`, `public/photos`, or `public/products` trees after the mapping
switch. Those product-image-only directories were removed after conversion of
the four still-needed audited variants. Brand, COA, set, ad, and other
non-product assets were not removed.