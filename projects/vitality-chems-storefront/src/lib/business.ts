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
  domain: "vitalitychems.com",
} as const;

export const ADMIN_EMAIL = "vitalitysupply@icloud.com";

export function isAdminEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;
}

export function formatAddress(multiline = false) {
  const line1 = `${BUSINESS.street}, ${BUSINESS.unit}`;
  const line2 = `${BUSINESS.city}, ${BUSINESS.region} ${BUSINESS.postal}`;
  return multiline ? `${line1}\n${line2}` : `${line1}, ${line2}`;
}

export const IL_NOTICE =
  "Illinois and federal notice: this material is a research chemical supplied to qualified laboratories. It is not a drug, not a compounded preparation, and not a dietary supplement under the Illinois Food, Drug and Cosmetic Act or the Federal Food, Drug, and Cosmetic Act. Vitality Supply is not a pharmacy and is not licensed to dispense medication. Nothing on this page is a claim that the material diagnoses, treats, cures, or prevents any disease, or is suitable for use in or on humans or animals.";
