export const BUSINESS = {
  name: "Vitality Chems",
  legalName: "Vitality Supply",
  email: "Vitalitysupply@icloud.com",
  phone: "7797174445",
  phoneDisplay: "(779) 717-4445",
  phoneHref: "tel:+17797174445",
  emailHref: "mailto:Vitalitysupply@icloud.com",
  street: "2045 W Grand Ave",
  unit: "Unit B",
  city: "Chicago",
  region: "IL",
  postal: "60612",
  country: "United States",
  hours: "Mon–Fri 9:00 AM–5:00 PM CT",
} as const;

export const ADMIN_EMAIL =
  (typeof process !== "undefined"
    ? process.env.ADMIN_EMAIL?.trim().toLowerCase()
    : undefined) || "vitalitysupply@icloud.com";

export function isAdminEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;
}

export function formatAddress(multiline = false) {
  const line1 = `${BUSINESS.street}, ${BUSINESS.unit}`;
  const line2 = `${BUSINESS.city}, ${BUSINESS.region} ${BUSINESS.postal}`;
  return multiline ? `${line1}\n${line2}` : `${line1}, ${line2}`;
}

export const IL_NOTICE =
  "Illinois and federal notice: this material is offered only as a research chemical for qualified laboratory, in-vitro, and analytical work. Vitality Chems does not offer prescribing, dispensing, pharmacy, or compounding services, and does not represent these materials as FDA-approved or suitable for human or animal use. An RUO label does not establish regulatory legality. Purchasers are responsible for determining and following the laws, permits, institutional rules, and other requirements that apply to their order; Vitality Chems does not guarantee that a sale, possession, shipment, or use is lawful.";
