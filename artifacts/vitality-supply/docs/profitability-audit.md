# Profitability audit

## Scope and decision rule

This audit covers the current vial-only catalog, the exact supplier-sheet rows
matched to that catalog, checkout discount stacking, wholesale projections,
store-credit loops, shipping, and the admin P&L/investor sensitivity views.
It does not add products, infer supplier data, or change checkout security and
idempotency behavior.

The standard known unit cost is **1 KIT (10) total ÷ 10** for an exact
product-and-strength match. The 5 KIT (50) and 10 KIT (100) totals are used
only for their respective wholesale projections. A missing exact row remains
`null`/Unknown. The conservative checkout floor is non-negative contribution
after known product cost and known store-credit obligations; no unsourced
processor, carrier, refund, tax, or overhead amount is invented.

The source was reconciled to the replacement sheet
`attached_assets/0_IMG_1851_1789486695113.png` on 2026-09-15 after reviewing
the full image and enlarged crops of each pricing panel. All exact rows used by
the active vial catalog have the same bottle reference and KIT10/KITS50/KITS100
totals as the prior authoritative map; therefore this reconciliation has **zero
numeric cost differences** and does not trigger any retail, wholesale, or P&L
change. The one-bottle column remains reference-only and never becomes the
standard cost.

## Findings and actions

### 1. Retail floors and missing costs

**Finding:** A small set of known-cost retail rows was below the existing
conservative 50% gross-margin floor. Four rows were already raised to the
smallest documented `.99` retail that clears that floor: Tirzepatide 30mg,
Ipamorelin 10mg, Kisspeptin 5mg, and Snap-8 10mg. Three active buyable rows
have no exact supplier row and therefore cannot support a cost or profit claim.
The former HCG 5000IU offer is retained only in historical supplier/audit
records; it is excluded from the active catalog, P&L, and recommendations.

**Optimal action:** Keep all other current retail prices unchanged. Keep exact
missing supplier costs null, flag those rows in P&L, and exclude them from
cost-based averages and investor totals.

**Alternative:** If a verified supplier invoice supplies an exact missing row,
add only that exact cost and rerun the floor check. Do not infer from another
strength, blend, bottle price, or competitor.

### 2. Promo, bulk, Bitcoin, referral, and credit stacking

**Finding:** Sequential discounts can consume the margin that appears at
retail. Referral/affiliate and reward-credit obligations are liabilities even
when paid as store credit. Applying a large existing credit balance can also
make cash merchandise negative against known cost.

**Optimal action:** The authoritative server quote preserves the normal
bulk → promo → Bitcoin order, then caps discretionary discounts so known
product cost plus known credit obligations are not breached. Lab credit is
independently capped at the remaining safe contribution. The quote exposes
whether a discount or credit was capped. Unknown-cost lines remain unknown and
are not assigned a fallback cost.

**Alternative:** Reject an unsafe combination instead of capping it, with a
specific message naming the unavailable discount. This is less forgiving for
customers and is not the current action.

### 3. Referral and affiliate economics

**Finding:** Buyer discounts and partner rewards are separate obligations. A
partner commission is only knowable when the server has an owning account and a
stored commission rate. A missing commission must not be guessed.

**Optimal action:** Use the server-side owner, commission, and referral
eligibility records already resolved for the order. Include a known commission
in the checkout floor and settle the resulting credit only after payment.
Admin loop views continue to show Unknown wherever exact product cost is
missing.

**Alternative:** Disable a code until its owner and commission are complete.
This is preferable to estimating commission, but would interrupt existing code
continuity.

### 4. Wholesale tiers

**Finding:** A percentage off retail is not sufficient evidence that a tier
clears supplier cost. The 10/50/100-unit tiers use different exact supplier
unit bases and can fail strict descending-price or cost-floor invariants after
rounding.

**Optimal action:** Price each tier from the exact corresponding supplier
projection, round to $0.50, require a 1.25× cost floor, require strict
decreases, and hide a tier set that cannot satisfy every invariant. Unknown
costs have no wholesale projection.

**Alternative:** Publish only individually valid tiers rather than hiding the
whole SKU. This could create an incomplete customer offer and is not the
current action.

### 5. Shipping

**Finding:** Shipping is added after merchandise discounts and is shown as a
separate amount. Carrier expense is not present in the supplied data, so
shipping revenue cannot be treated as product margin or used to rescue a
negative merchandise contribution.

**Optimal action:** Keep standard and express shipping separate from the
known-cost merchandise floor and disclose that carrier expense is unknown in
admin P&L and investor views.

**Alternative:** Add a sourced carrier-cost table by destination and service
level, then model shipping contribution separately. Do not substitute an
assumed carrier fee.

### 6. Investor and admin scenario assumptions

**Finding:** Unknown supplier rows should not silently become zero cost or a
blended estimate. Investor sensitivity also must not present invented payment,
refund, shipping, tax, or operating costs as observed facts.

**Optimal action:** Admin P&L reports known-cost count, coverage, missing rows,
and wholesale exclusions. Investor views use only the known-cost blended basis,
show excluded counts, and label ROAS and horizon as scenario inputs. No
unsourced operating drag is subtracted.

**Alternative:** Withhold all investor sensitivity until every current SKU has
an exact supplier row. This is more conservative but discards useful
known-cost sensitivity while coverage is partial.

## Verification

Pricing checks must continue to verify:

- all known costs are positive and retail clears the documented floor;
- missing costs remain null and all dependent profitability values remain
  Unknown;
- exact KIT10/10, 50-kit, and 100-kit bases are used in their intended tiers;
- wholesale invariants hold after rounding;
- extreme stacked checkout scenarios never produce negative known-cost
  contribution; and
- a cart containing only an unknown-cost row reports null cost contribution.
