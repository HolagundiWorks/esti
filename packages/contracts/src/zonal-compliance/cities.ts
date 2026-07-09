import type { ZonalCityMeta } from "./types.js";

/** Municipal zonal-regulation catalog — sourced from `zonal compliance/Cities/`. */
export const ZONAL_CITIES: ZonalCityMeta[] = [
  {
    id: "hosapete",
    label: "Hosapete (Hospet)",
    region: "Karnataka",
    source: "Hospet LPA Master Plan (Revision-1) Zonal Regulations",
    calculatorReady: true,
    referenceFile: "Hosapete.md",
  },
  {
    id: "belgaum",
    label: "Belgaum",
    region: "Karnataka",
    source: "Belgaum Master Plan 2021 (Revision-II)",
    calculatorReady: false,
    referenceFile: "belgaum.md",
  },
  {
    id: "gulbarga",
    label: "Gulbarga (Kalaburagi)",
    region: "Karnataka",
    source: "Gulbarga Building Byelaws 2011",
    calculatorReady: false,
    referenceFile: "gulbarga.md",
  },
  {
    id: "hubli-dharwad",
    label: "Hubli–Dharwad",
    region: "Karnataka",
    source: "Hubli-Dharwad RCDP",
    calculatorReady: false,
    referenceFile: "hubli-dharwad.md",
  },
  {
    id: "mysuru",
    label: "Mysuru",
    region: "Karnataka",
    source: "Mysuru Master Plan-II 2031",
    calculatorReady: false,
    referenceFile: "mysuru.md",
  },
  {
    id: "tumkur",
    label: "Tumkur",
    region: "Karnataka",
    source: "Tumkur Master Plan (Revision-II)",
    calculatorReady: false,
    referenceFile: "Tumkur ZR.md",
  },
  {
    id: "greater-bengaluru",
    label: "Greater Bengaluru",
    region: "Karnataka",
    source: "Bengaluru RMP-2015 (2025 amendment)",
    calculatorReady: false,
    referenceFile: "greater bangalore.md",
  },
  {
    id: "pune",
    label: "Pune (PMRDA)",
    region: "Maharashtra",
    source: "PMRDA Development Control & Promotion Regulations 2018",
    calculatorReady: false,
    referenceFile: "pune.md",
  },
  {
    id: "kcbb",
    label: "Karnataka Common Building Byelaws",
    region: "Karnataka",
    source: "KCBB 2025",
    calculatorReady: false,
    referenceFile: "karnataka buulding by laws.md",
  },
];

export function zonalCity(id: string): ZonalCityMeta | undefined {
  return ZONAL_CITIES.find((c) => c.id === id);
}
