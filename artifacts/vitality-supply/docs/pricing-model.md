# Pricing model

## Current catalog scope

The public catalog and its current P&L are vial-only. Capsules, liquids, sprays,
topicals, research sets, and SARMs are not offered. The legacy non-vial offer
rows remain in `src/lib/wholesale.ts` as historical reference only; no checkout
path reads them as current products. Existing order rows and their serialized
item snapshots are not deleted or rewritten.

## Supplier cost basis

The current source is the replacement uploaded supplier sheet:
`attached_assets/0_IMG_1851_1789486695113.png` (full image and enlarged
three-panel crops visually reviewed and reconciled 2026-09-15). The standard
current cost for an exact product + strength is:

`1 KIT (10) ÷ 10`

The 5 KITS (50) and 10 KITS (100) columns are retained as exact per-vial
projection costs:

`50-vial cost = 5 KITS total ÷ 50`

`100-vial cost = 10 KITS total ÷ 100`

The current-catalog transcribed map is `src/lib/supplier-sheet.ts`.
`src/lib/wholesale.ts` references that map rather than duplicating supplier
costs. Sheet-only rows are listed in the omission scope below and are not
silently added. No cost is inferred from another strength, bottle price, blend,
or competitor.

### Replacement-sheet reconciliation

The replacement sheet uses the same five columns throughout the three panels:
product, `1 BOTTLE`, `1 KIT (10)`, `5 KITS (50)`, and `10 KITS (100)`. Every
exact product + strength row used by the current vial catalog was compared with
the enlarged image. **There are no numeric differences** from the prior
authoritative map: all existing bottle references and kit totals remain
unchanged. Consequently, every known standard cost, wholesale tier projection,
retail-floor result, and P&L row remains unchanged after the
source/provenance update.

The `1 BOTTLE` values are not a wholesale tier and are not divided or used as
the standard cost. The standard cost remains the `1 KIT (10)` total divided by
10, while the `5 KITS (50)` and `10 KITS (100)` totals are used only for their
matching wholesale projections.

### Unresolved current rows

These catalog variants remain available for continuity, but their cost is null
and the admin P&L flags `cost missing` until an exact supplier row is supplied.

There are currently 3 such active buyable variants. They remain price-visible,
but profit, margin, affiliate/reward cash loops, and wholesale projections are
displayed as unknown and excluded from cost-based averages. They are:

- Semaglutide 15mg — no exact row on the uploaded sheet.
- Tirzepatide 15mg — no exact row on the uploaded sheet.
- SLU-PP-332 5mg — no exact row on the uploaded sheet.

HCG 5000IU has no exact row either, but its former catalog offer is retained
only as a historical supplier/audit fact. It is not an active product, P&L row,
or marketing recommendation and must not be re-added without an explicit
catalog decision and exact supplier evidence.

The full sheet-only omission list is below; these rows are not added without a
corresponding catalog offer and verified vial asset.

## Retail rule

Existing retail is retained when `(retail - standard cost) / retail >= 50%`.
It is never automatically lowered. When a known exact cost would put a SKU
below the 50% gross-margin floor, retail is raised to the smallest `.99` price
that clears the floor. Rows with missing costs are not used to invent a price.

The current cost-floor adjustments are:

| SKU | Prior retail | Current retail | Why it changed |
|---|---:|---:|---|
| Tirzepatide 30mg | $330.99 | $331.99 | Supplier-sheet cost is $165.80/vial; old price missed the 50% floor. |
| Ipamorelin 10mg | $54.99 | $57.99 | Supplier-sheet cost is $28.90/vial; old price missed the 50% floor. |
| Kisspeptin 5mg | $49.99 | $53.99 | Supplier-sheet cost is $26.50/vial; old price missed the 50% floor. |
| Snap-8 10mg | $49.99 | $53.99 | Supplier-sheet cost is $26.50/vial; old price missed the 50% floor. |

These are cost-floor decisions, not claims about optimal demand pricing. Rows
without a comparable public benchmark are explicitly unbenchmarked. This is the
complete set of current retail changes from the supplier-sheet research; all
other current retail prices were retained. Public competitor observations are
benchmarks only and did not trigger competitor-mirroring or an “optimal” price
claim.

## Wholesale and financial projections

For each 10/50/100-unit tier:

`tier unit = round-to-$0.50(max(actual supplier tier cost × 1.35, retail × (1 - discount)))`

Discounts are 18%, 26%, and 34%. Every eligible vial SKU must remain below
retail, decrease strictly at each larger tier, and be at least 1.25 times the
actual supplier tier cost. If rounding cannot satisfy every invariant, the SKU
is marked wholesale ineligible and omitted from the public wholesale page.

P&L, affiliate/reward loop, wholesale, and investor/proforma calculations all
consume the current vial-only `PRODUCTS` list and these sourced costs. An
unknown supplier cost is represented as unknown profit, margin, affiliate
cash/loop, and wholesale projection—not `$0`. P&L shows known-cost coverage
and counts unknown-cost SKUs; investor/proforma output uses only the known-cost
margin basis and discloses the excluded SKU count. If no known-cost basis
exists, investor/proforma totals are withheld rather than defaulted to a
fabricated margin. This keeps historical database orders intact while ensuring
current projections do not include removed forms.

### Supplier-sheet rows intentionally omitted from the catalog

The uploaded sheet is broader than the current vial catalog. These exact
sheet-only rows are intentionally not buyable and are not included in P&L,
wholesale, or investor totals because they have no current catalog offer and
verified product asset:

- FST/Follistatin 344 95%, 1mg
- Tesamorelin 6mg + Ipam 3mg + CJC 3mg
- Tesamorelin 10mg + Ipam 10mg
- Thymosin Alpha-1 (TA1), 10mg (the catalog currently has only TA1 5mg)
- Kisspeptin 10mg (the catalog currently has only Kisspeptin 5mg)
- Methylene Blue 50mg
- Oxytocin 10mg (the catalog currently has only Oxytocin 5mg)
- NAC 600mg
- Taurine 10g
- Klotho (KLB) 10mg
- PEG-MGF 2mg
- IGF-1 DES 1mg
- Vitality 10mg

These omissions are scope decisions, not inferred costs or hidden products.

## Public competitor observations

These are public US research-vendor list prices observed through web search on
2026-09-15 (page publication dates, when shown, are not observation dates).
Only exact product + strength + vial comparisons are recorded. They are
benchmarks, not an assertion of an optimal demand price:

| Comparable SKU | Vendor | Public price | Source |
|---|---|---:|---|
| BPC-157 5mg | Core Peptides | $52.00 | https://www.corepeptides.com/peptides/bpc-157 |
| BPC-157 10mg | Core Peptides | $97.00 | https://www.corepeptides.com/peptides/bpc-157 |
| TB-500 5mg | Core Peptides | $78.00 | https://www.corepeptides.com/peptides/tb-500 |
| TB-500 10mg | Core Peptides | $140.00 | https://www.corepeptides.com/peptides/tb-500 |
| Semaglutide 10mg | Polaris Peptides | $90.00 | https://polarispeptides.com/product/semaglutide-10mg |
| Semaglutide 10mg | MyPurePeptide | $70.00 | https://mypurepeptide.com/product/semaglutide |
| Tirzepatide 10mg | Polaris Peptides | $89.00 | https://polarispeptides.com/product/tirzepatide-10mg |
| Ipamorelin 5mg | Core Peptides | $43.00 | https://www.corepeptides.com/peptides/ipamorelin-5mg |
| Ipamorelin 10mg | Polaris Peptides | $50.00 | https://polarispeptides.com/product/ipamorelin-10mg |
| Tesamorelin 10mg | Core Peptides | $79.00 | https://www.corepeptides.com/peptides/tesamorelin-10mg |
| Tesamorelin 10mg | Alpha Omega Peptide | $75.00 | https://alphaomegapeptide.com/products/tesamorelin-10mg |
| MOTS-C 10mg | Core Peptides | $116.00 | https://www.corepeptides.com/peptides/mots-c-10mg |
| MOTS-C 10mg | PSPeptides | $69.99 | https://pspeptides.com/product/buy-mots-c |
| AOD-9604 5mg | Core Peptides | $41.00 | https://www.corepeptides.com/peptides/aod-9604-5mg |
| CJC-1295 no DAC 5mg + Ipamorelin 5mg | Polaris Peptides | $60.00 | https://polarispeptides.com/product/cjc-1295-no-dac-5mg-ipamorelin-5mg |

The financial admin shows these observations only where the SKU is comparable.
Rows without a benchmark display “No fetched benchmark” rather than an
estimated market price.