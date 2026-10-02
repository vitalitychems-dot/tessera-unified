/**
 * Transactional order emails (pure template functions, no I/O).
 * Same dark card as the newsletter templates so customer mail looks consistent.
 */
import { BUSINESS } from "@/lib/business";
import { escapeHtml } from "@/lib/newsletter/templates";
import { formatPrice } from "@/lib/utils";

export type OrderEmailLine = { productId?: string; name: string; dose: string; qty: number; lineCents: number };

export type OrderEmailOrder = {
  reference: string;
  firstName: string;
  lastName?: string;
  lab?: string | null;
  phone?: string | null;
  address?: string;
  city?: string;
  region?: string | null;
  postal?: string;
  country?: string;
  url: string;
  lines: OrderEmailLine[];
  subtotal: number;
  shipping: number;
  salesTax?: number;
  taxRate?: number;
  discount: number;
  creditApplied: number;
  creditEarned?: number;
  affiliateCommission?: number;
  total: number;
  paymentMethod: "stripe" | "zelle" | "bitcoin" | "ethereum" | string;
};

export type ManualPaymentInstructions =
  | { method: "zelle"; recipient: string; displayName: string | null }
  | { method: "bitcoin" | "ethereum"; address: string; amount: string; expiresAt: string | null };

function money(value: number) {
  return formatPrice(value);
}

const ORDER_RUO_NOTICE =
  "For research use only. Not for human or animal use. An RUO label does not establish regulatory legality; the purchaser is responsible for applicable requirements.";

function wrap(title: string, body: string, ctaHref: string, ctaLabel: string) {
  return `<!doctype html><html><body style="margin:0;background:#08050f;color:#f5f1ff;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;padding:40px 24px"><div style="border:1px solid #39285a;background:#120b20;border-radius:14px;padding:32px"><p style="color:#a78bfa;text-transform:uppercase;letter-spacing:2px;font-size:12px">${escapeHtml(BUSINESS.name)}</p><h1 style="font-size:26px;margin:16px 0">${title}</h1>${body}<a href="${ctaHref}" style="display:inline-block;margin-top:24px;background:#8b5cf6;color:white;text-decoration:none;padding:14px 20px;border-radius:8px;font-weight:bold">${ctaLabel}</a><p style="color:#8f819f;font-size:12px;line-height:1.6;margin-top:32px">${ORDER_RUO_NOTICE} Questions: ${escapeHtml(BUSINESS.email)}</p></div></div></body></html>`;
}

function itemsHtml(order: OrderEmailOrder) {
  const rows = order.lines.map((line) =>
    `<tr><td style="padding:6px 0;color:#d8cee4">${escapeHtml(line.name)} · ${escapeHtml(line.dose)} × ${line.qty}</td><td style="padding:6px 0;text-align:right;color:#f5f1ff">${money(line.lineCents / 100)}</td></tr>`,
  ).join("");
  const summary = [
    ["Subtotal", order.subtotal],
    ...(order.discount > 0 ? [["Discounts", -order.discount] as const] : []),
    ...(order.creditApplied > 0 ? [["Lab credit applied", -order.creditApplied] as const] : []),
    ["Shipping", order.shipping],
    ...(order.salesTax && order.salesTax > 0 ? [["Sales tax", order.salesTax] as const] : []),
  ].map(([label, value]) =>
    `<tr><td style="padding:4px 0;color:#8f819f">${label}</td><td style="padding:4px 0;text-align:right;color:#c4b5d4">${money(Number(value))}</td></tr>`,
  ).join("");
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px"><tbody>${rows}<tr><td colspan="2" style="border-top:1px solid #39285a;padding-top:8px"></td></tr>${summary}<tr><td style="padding:8px 0;font-weight:bold">Total</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#c4b5fd">${money(order.total)}</td></tr></tbody></table>`;
}

function itemsText(order: OrderEmailOrder) {
  const lines = order.lines.map((line) => `  ${line.name} · ${line.dose} × ${line.qty} — ${money(line.lineCents / 100)}`);
  const extras = [
    `  Subtotal ${money(order.subtotal)}`,
    order.discount > 0 ? `  Discounts -${money(order.discount)}` : null,
    order.creditApplied > 0 ? `  Lab credit applied -${money(order.creditApplied)}` : null,
    `  Shipping ${money(order.shipping)}`,
    order.salesTax && order.salesTax > 0 ? `  Sales tax ${money(order.salesTax)}` : null,
    `  Total ${money(order.total)}`,
  ].filter(Boolean);
  return [...lines, ...extras].join("\n");
}

function researchReferenceHtml(order: OrderEmailOrder) {
  return `<div style="border:1px solid #39285a;border-radius:8px;padding:14px;margin:16px 0"><strong>Research documentation reference — not a recipe</strong><p style="color:#c4b5d4;line-height:1.6;margin-bottom:0">Before any laboratory work, verify the lot identity and current COA, document chain of custody, follow your institution's approved SOP and safety review, and confirm applicable permits and requirements. This email does not provide dosing, administration, preparation, clinical instructions, or human/animal-use guidance.</p></div>`;
}

function researchReferenceText() {
  return "Research documentation reference — not a recipe.\nBefore any laboratory work, verify the lot identity and current COA, document chain of custody, follow your institution's approved SOP and safety review, and confirm applicable permits and requirements. This email does not provide dosing, administration, preparation, clinical instructions, or human/animal-use guidance.";
}

function addressText(order: OrderEmailOrder) {
  return [
    `${order.firstName} ${order.lastName ?? ""}`.trim(),
    order.lab,
    order.address,
    [order.city, order.region, order.postal].filter(Boolean).join(", "),
    order.country,
  ].filter(Boolean).join("\n");
}

function addressHtml(order: OrderEmailOrder) {
  return escapeHtml(addressText(order)).replaceAll("\n", "<br />");
}

export function orderPendingTemplate(order: OrderEmailOrder, instructions: ManualPaymentInstructions) {
  const steps = instructions.method === "zelle"
    ? `<p style="color:#c4b5d4;line-height:1.6">Send <strong style="color:#f5f1ff">${money(order.total)}</strong> by Zelle to <strong style="color:#f5f1ff">${escapeHtml(instructions.recipient)}</strong>${instructions.displayName ? ` (${escapeHtml(instructions.displayName)})` : ""} with the memo <strong style="color:#f5f1ff">${escapeHtml(order.reference)}</strong>, then press “I've sent the payment” on your order page. We ship once the transfer is confirmed.</p>`
    : `<p style="color:#c4b5d4;line-height:1.6">Send exactly <strong style="color:#f5f1ff">${escapeHtml(instructions.amount)} ${instructions.method === "ethereum" ? "ETH" : "BTC"}</strong> to <span style="font-family:monospace;color:#f5f1ff;word-break:break-all">${escapeHtml(instructions.address)}</span>.${instructions.expiresAt ? ` This rate is held until ${escapeHtml(new Date(instructions.expiresAt).toLocaleString("en-US", { timeZone: "America/Chicago" }))} CT; the order page can refresh it.` : ""} We ship after network confirmation.</p>`;
  const stepsText = instructions.method === "zelle"
    ? `Send ${money(order.total)} by Zelle to ${instructions.recipient}${instructions.displayName ? ` (${instructions.displayName})` : ""} with memo ${order.reference}, then press "I've sent the payment" on your order page.`
    : `Send exactly ${instructions.amount} ${instructions.method === "ethereum" ? "ETH" : "BTC"} to ${instructions.address}.${instructions.expiresAt ? ` Rate held until ${new Date(instructions.expiresAt).toISOString()}.` : ""}`;
  return {
    subject: `Complete your payment — order ${order.reference}`,
    html: wrap(`Almost there, ${escapeHtml(order.firstName)}.`, `<p style="color:#c4b5d4;line-height:1.6">Order ${escapeHtml(order.reference)} is reserved and waiting for payment.</p>${steps}${itemsHtml(order)}`, order.url, "Open your order"),
    text: `Almost there, ${order.firstName}.\n\nOrder ${order.reference} is reserved and waiting for payment.\n${stepsText}\n\n${itemsText(order)}\n\nYour order: ${order.url}\n\n${ORDER_RUO_NOTICE}`,
  };
}

export function orderPaidTemplate(order: OrderEmailOrder) {
  return {
    subject: `Payment received — order ${order.reference}`,
    html: wrap(`Thank you, ${escapeHtml(order.firstName)}.`, `<p style="color:#c4b5d4;line-height:1.6">We received your payment for order ${escapeHtml(order.reference)}. It is being packed now; tracking appears on your order page and in a second email once it ships.</p>${itemsHtml(order)}${order.creditEarned && order.creditEarned > 0 ? `<p style="color:#c4b5d4">Earned lab credit: <strong style="color:#c4b5fd">${money(order.creditEarned)}</strong></p>` : ""}${researchReferenceHtml(order)}`, order.url, "Track your order"),
    text: `Thank you, ${order.firstName}.\n\nWe received your payment for order ${order.reference}. It is being packed now; tracking follows once it ships.\n\n${itemsText(order)}${order.creditEarned && order.creditEarned > 0 ? `\n\nEarned lab credit: ${money(order.creditEarned)}` : ""}\n\n${researchReferenceText()}\n\nTrack your order: ${order.url}\n\n${ORDER_RUO_NOTICE}`,
  };
}

export function orderShippedTemplate(order: OrderEmailOrder, tracking: string | null) {
  const trackingHtml = tracking
    ? `<p style="color:#c4b5d4;line-height:1.6">Tracking number: <strong style="font-family:monospace;color:#f5f1ff">${escapeHtml(tracking)}</strong></p>`
    : `<p style="color:#c4b5d4;line-height:1.6">Tracking details are on your order page.</p>`;
  return {
    subject: `Shipped — order ${order.reference}`,
    html: wrap(`On its way, ${escapeHtml(order.firstName)}.`, `<p style="color:#c4b5d4;line-height:1.6">Order ${escapeHtml(order.reference)} has shipped in discreet packaging.</p>${trackingHtml}${itemsHtml(order)}`, order.url, "View your order"),
    text: `On its way, ${order.firstName}.\n\nOrder ${order.reference} has shipped.${tracking ? ` Tracking number: ${tracking}` : ""}\n\n${itemsText(order)}\n\nView your order: ${order.url}\n\n${ORDER_RUO_NOTICE}`,
  };
}

export type SupplierEmailLine = OrderEmailLine & {
  unitCostCents: number | null;
  totalCostCents: number | null;
};

export function supplierOrderTemplate(
  order: OrderEmailOrder,
  lines: SupplierEmailLine[],
  supplierEmail: string,
) {
  const hasUnknown = lines.some((line) => line.totalCostCents == null);
  const totalCost = hasUnknown
    ? null
    : lines.reduce((sum, line) => sum + (line.totalCostCents ?? 0), 0);
  const lineHtml = lines.map((line) =>
    `<tr><td style="padding:7px 0;color:#d8cee4">${escapeHtml(line.name)} · ${escapeHtml(line.dose)} × ${line.qty}</td><td style="padding:7px 0;text-align:right">${line.unitCostCents == null ? "UNKNOWN" : `${money(line.unitCostCents / 100)} / vial`}<br /><span style="color:#8f819f">${line.totalCostCents == null ? "UNKNOWN total" : money(line.totalCostCents / 100)}</span></td></tr>`,
  ).join("");
  const subject = `Paid order to fulfill — ${order.reference}`;
  const unknownNote = hasUnknown
    ? "At least one supplier cost is unknown. Do not infer or pay an amount until staff confirms the supplier sheet."
    : `Supplier invoice total: ${money(totalCost! / 100)}.`;
  return {
    subject,
    html: wrap(
      `Fulfillment request · ${escapeHtml(order.reference)}`,
       `<p style="color:#c4b5d4;line-height:1.6">A paid order is ready for fulfillment. Reply only with fulfillment questions; the storefront remains research-use-only.</p><div style="border:1px solid #39285a;border-radius:8px;padding:14px;white-space:normal"><strong>Ship to</strong><br />${addressHtml(order)}${order.phone ? `<br />Phone: ${escapeHtml(order.phone)}` : ""}</div><table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px"><tbody>${lineHtml}</tbody></table><p style="color:${hasUnknown ? "#fbbf24" : "#c4b5d4"};line-height:1.6"><strong>${escapeHtml(unknownNote)}</strong></p><p style="color:#8f819f;font-size:12px">Customer-paid total: ${money(order.total)} · Order ${escapeHtml(order.reference)} · ${escapeHtml(supplierEmail)}<br />Costs are the matched standard supplier-sheet basis, not a confirmed invoice, unless staff verifies the supplier bill.</p>`,
      order.url,
      "Open order record",
    ),
       text: `Paid order ${order.reference}\n\nShip to:\n${addressText(order)}${order.phone ? `\nPhone: ${order.phone}` : ""}\n\n${lines.map((line) => `- ${line.name} · ${line.dose} × ${line.qty} — ${line.unitCostCents == null ? "UNKNOWN / vial" : `${money(line.unitCostCents / 100)} / vial`} — ${line.totalCostCents == null ? "UNKNOWN total" : money(line.totalCostCents / 100)}`).join("\n")}\n\n${unknownNote}\nCosts use the matched standard supplier sheet and are not a confirmed invoice until staff verifies the supplier bill.\nCustomer-paid total: ${money(order.total)}\nOrder record: ${order.url}`,
  };
}

export type ProfitEmailLine = SupplierEmailLine & {
  revenueCents: number;
  profitCents: number | null;
};

export function ownerProfitTemplate(
  order: OrderEmailOrder,
  lines: ProfitEmailLine[],
  incomeTaxReserve: number | null,
  ownerEmail: string,
) {
  const hasUnknown = lines.some((line) => line.profitCents == null);
  const totalProfit = hasUnknown ? null : lines.reduce((sum, line) => sum + (line.profitCents ?? 0), 0);
   const creditCents = Math.max(0, Math.round((order.creditEarned ?? 0) * 100));
   const commissionCents = Math.max(0, Math.round((order.affiliateCommission ?? 0) * 100));
   const totalContribution = totalProfit == null
     ? null
     : totalProfit - creditCents - commissionCents;
   const tax = totalContribution == null || incomeTaxReserve == null
    ? null
     : Math.max(0, totalContribution) * incomeTaxReserve / 100;
  const lineHtml = lines.map((line) =>
    `<tr><td style="padding:7px 0">${escapeHtml(line.name)} · ${escapeHtml(line.dose)} × ${line.qty}</td><td style="padding:7px 0;text-align:right">${money(line.revenueCents / 100)} revenue<br /><span style="color:#8f819f">COGS ${line.totalCostCents == null ? "UNKNOWN" : money(line.totalCostCents / 100)} · profit ${line.profitCents == null ? "UNKNOWN" : money(line.profitCents / 100)}</span></td></tr>`,
  ).join("");
  const summary = hasUnknown
    ? "Total profit is UNKNOWN because one or more supplier costs are missing."
     : `Total item contribution before processor fees, refunds, shipping expense, overhead, and tax: ${money(totalProfit! / 100)}.`;
   const contributionSummary = totalContribution == null
     ? "Total contribution after tracked credit and affiliate obligations: UNKNOWN."
     : `Total contribution after tracked customer credit${commissionCents > 0 ? " and affiliate commission" : ""}: ${money(totalContribution / 100)}.`;
  const taxSummary = tax == null
     ? "Illustrative Illinois income-tax reserve: UNKNOWN until contribution is known and the configured rate is available."
     : `Illustrative Illinois income-tax reserve at ${incomeTaxReserve}% of positive tracked contribution: ${money(tax / 100)}. This is not tax or legal advice.`;
  return {
    subject: `Paid order margin — ${order.reference}`,
    html: wrap(
      `Margin snapshot · ${escapeHtml(order.reference)}`,
       `<p style="color:#c4b5d4;line-height:1.6">This internal snapshot uses the order's stored retail, discount, tax, credit, commission, and supplier-cost basis. Processor fees, refunds, disputes, shipping expense, overhead, and other tax treatment are not deducted because they are not stored here. It is not a tax return, forecast, or legal opinion.</p><table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px"><tbody>${lineHtml}</tbody></table><p style="color:${hasUnknown ? "#fbbf24" : "#c4b5d4"};line-height:1.6"><strong>${escapeHtml(summary)}</strong></p><p style="color:#c4b5d4;line-height:1.6"><strong>${escapeHtml(contributionSummary)}</strong></p><p style="color:#fbbf24;line-height:1.6">${escapeHtml(taxSummary)}</p><p style="color:#8f819f;font-size:12px">Customer-paid total ${money(order.total)} · sales tax collected ${money(order.salesTax ?? 0)} (customer tax reserve, not income) · recipient ${escapeHtml(ownerEmail)}</p>`,
      order.url,
      "Open order record",
    ),
       text: `Paid order margin ${order.reference}\n\n${lines.map((line) => `- ${line.name} · ${line.dose} × ${line.qty}: revenue ${money(line.revenueCents / 100)}, COGS ${line.totalCostCents == null ? "UNKNOWN" : money(line.totalCostCents / 100)}, profit ${line.profitCents == null ? "UNKNOWN" : money(line.profitCents / 100)}`).join("\n")}\n\n${summary}\n${contributionSummary}\n${taxSummary}\nCustomer-paid total ${money(order.total)}\nSales tax collected ${money(order.salesTax ?? 0)} (customer tax reserve, not income)\nOrder record: ${order.url}`,
  };
}

export type FollowupRecommendation = {
  name: string;
  count: number;
  kind: "co-purchase" | "bundle" | "deal";
};

export function researchFollowupTemplate(
  order: OrderEmailOrder,
  recommendations: FollowupRecommendation[],
  unsubscribeUrl: string,
) {
  const recs = recommendations.length
    ? recommendations.map((r) => `<li style="margin:7px 0">${escapeHtml(r.name)} <span style="color:#8f819f">· ${r.kind === "co-purchase" ? `${r.count} aggregate co-purchases` : r.kind === "bundle" ? "bundle candidate" : "targeted deal candidate"}</span></li>`).join("")
    : "<li>No aggregate recommendation cleared the minimum evidence threshold yet.</li>";
  const textRecs = recommendations.length
    ? recommendations.map((r) => `- ${r.name} · ${r.kind === "co-purchase" ? `${r.count} aggregate co-purchases` : `${r.kind} candidate`}`).join("\n")
    : "- No aggregate recommendation cleared the minimum evidence threshold yet.";
  return {
    subject: `Four-week research-use follow-up — ${order.reference}`,
    html: wrap(
      `Four weeks later, ${escapeHtml(order.firstName)}.`,
      `<p style="color:#c4b5d4;line-height:1.6">Here is a documentation-focused follow-up for your research-use order. This summary does not provide dosing, administration, human-use recipes, clinical instructions, or health claims.</p>${itemsHtml(order)}<p style="color:#c4b5d4">Earned lab credit: <strong style="color:#c4b5fd">${money(order.creditEarned ?? 0)}</strong></p><h2 style="font-size:16px">Evidence-based catalog signals</h2><ul style="color:#c4b5d4;padding-left:18px">${recs}</ul><p style="color:#8f819f;font-size:12px;line-height:1.6">Recommendations use aggregate paid-order co-purchase counts only; no other customer's identity or order history is disclosed. Confirm current stock, lot documentation, and applicable requirements before ordering.</p><p style="color:#8f819f;font-size:12px">You can unsubscribe from future newsletters here: <a href="${escapeHtml(unsubscribeUrl)}" style="color:#c4b5fd">${escapeHtml(unsubscribeUrl)}</a></p>`,
      order.url,
      "Review your order",
    ),
    text: `Four-week research-use follow-up for ${order.reference}\n\nThis is a documentation-focused summary. It does not provide dosing, administration, human-use recipes, clinical instructions, or health claims.\n\n${itemsText(order)}\nEarned lab credit: ${money(order.creditEarned ?? 0)}\n\nEvidence-based catalog signals:\n${textRecs}\n\nRecommendations use aggregate paid-order co-purchase counts only. No other customer's identity or order history is disclosed.\n\nUnsubscribe: ${unsubscribeUrl}\nReview your order: ${order.url}\n\n${ORDER_RUO_NOTICE}`,
  };
}
