export type CoaRecord = {
  compound: string;
  dose: string;
  lab: string;
  lot: string;
  reported: string;
  purity: string;
  quantity: string;
  method: string;
  image: string;
  width: number;
  height: number;
};

export const COAS: CoaRecord[] = [
  {
    compound: "retatrutide",
    dose: "10mg",
    lab: "Freedom Diagnostics",
    lot: "RT10072726",
    reported: "2026-07-31",
    purity: "99.59%",
    quantity: "10.02 mg",
    method: "HPLC-UV / LC-MS",
    image: "/coa/retatrutide-10mg.jpg?v=2",
    width: 1500,
    height: 1938,
  },
  {
    compound: "retatrutide",
    dose: "20mg",
    lab: "Vanguard Laboratory",
    lot: "Lime Green Cap",
    reported: "2026-02-26",
    purity: ">99.80% ± 0.18%",
    quantity: "20.12 mg",
    method: "HPLC-UV/VIS",
    image: "/coa/retatrutide-20mg.jpg",
    width: 1400,
    height: 1820,
  },
  {
    compound: "retatrutide",
    dose: "30mg",
    lab: "Vanguard Laboratory",
    lot: "RT3042126",
    reported: "2026-05-11",
    purity: ">99.80% ± 0.18%",
    quantity: "29.84 mg",
    method: "HPLC-UV/VIS",
    image: "/coa/retatrutide-30mg.jpg",
    width: 1400,
    height: 1789,
  },
  {
    compound: "bpc-157",
    dose: "10mg",
    lab: "Vanguard Laboratory",
    lot: "BC10051926",
    reported: "2026-06-01",
    purity: ">99.80% ± 0.18%",
    quantity: "11.21 mg",
    method: "HPLC-UV/VIS",
    image: "/coa/bpc-157-10mg.jpg",
    width: 1400,
    height: 1812,
  },
  {
    compound: "tb-500",
    dose: "10mg",
    lab: "Freedom Diagnostics",
    lot: "3457",
    reported: "2026-07-31",
    purity: "99.35%",
    quantity: "10.11 mg",
    method: "HPLC-UV / LC-MS",
    image: "/coa/tb-500-10mg.jpg?v=2",
    width: 1500,
    height: 1960,
  },
  {
    compound: "bpc-tb-blend",
    dose: "10mg/10mg",
    lab: "Vanguard Laboratory",
    lot: "Orange Cap",
    reported: "2026-02-26",
    purity: ">99.80% ± 0.18%",
    quantity: "BPC-157 11.26 mg · TB-500 12.10 mg",
    method: "HPLC-UV/VIS",
    image: "/coa/bpc-tb-blend-10mg-10mg.jpg",
    width: 1400,
    height: 1822,
  },
  {
    compound: "tesamorelin",
    dose: "10mg",
    lab: "Freedom Diagnostics",
    lot: "9953797",
    reported: "2026-07-31",
    purity: "99.56%",
    quantity: "10.04 mg",
    method: "HPLC-UV / LC-MS",
    image: "/coa/tesamorelin-10mg.jpg?v=2",
    width: 1500,
    height: 1908,
  },
  {
    compound: "ghk-cu",
    dose: "100mg",
    lab: "Vanguard Laboratory",
    lot: "GHK42126",
    reported: "2026-05-08",
    purity: ">99.80% ± 0.18%",
    quantity: "98.27 mg",
    method: "HPLC-UV/VIS",
    image: "/coa/ghk-cu-100mg.jpg",
    width: 1400,
    height: 1808,
  },
];

export function coaWebpSrcSet(image: string) {
  const base = image.split("?")[0]?.replace(/\.jpg$/i, "");
  return `${base}-480.webp 480w, ${base}-800.webp 800w`;
}

export function coaFor(compoundSlug: string, dose?: string) {
  const d = dose?.toLowerCase().replace(/\s/g, "");
  return (
    COAS.find((c) => c.compound === compoundSlug && c.dose.toLowerCase().replace(/\s/g, "") === d) ??
    COAS.find((c) => c.compound === compoundSlug)
  );
}

export function coasFor(compoundSlug: string) {
  return COAS.filter((c) => c.compound === compoundSlug);
}