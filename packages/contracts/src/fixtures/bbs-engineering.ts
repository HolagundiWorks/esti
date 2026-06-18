/**
 * Engineering reference fixtures for BBS calculations (IS:456 / IS:2502).
 * Used by unit tests and regression checks before BBS issue/export.
 */
import type { BbsItemLike } from "../bbs-validation.js";

export interface BbsEngineeringFixture {
  id: string;
  label: string;
  input: BbsItemLike;
  expect: {
    totalBars: number;
    totalLengthM: number;
    weightKg: number;
  };
}

/** Straight 16 mm bars — textbook weight check (d²/162). */
export const BBS_ENGINEERING_FIXTURES: BbsEngineeringFixture[] = [
  {
    id: "straight-16-four-bars",
    label: "4 × 16 mm straight bars @ 6000 mm",
    input: {
      barMark: "T1",
      diaMm: 16,
      noOfMembers: 1,
      barsPerMember: 4,
      cuttingLengthMm: 6000,
    },
    expect: {
      totalBars: 4,
      totalLengthM: 24,
      weightKg: 37.93,
    },
  },
  {
    id: "column-12-multi-member",
    label: "4 columns × 2 bars @ 3500 mm (12 mm)",
    input: {
      barMark: "C1",
      member: "Column",
      diaMm: 12,
      noOfMembers: 4,
      barsPerMember: 2,
      cuttingLengthMm: 3500,
    },
    expect: {
      totalBars: 8,
      totalLengthM: 28,
      weightKg: 24.89,
    },
  },
  {
    id: "stirrup-8-closed",
    label: "8 mm closed stirrups @ 1556 mm cutting length, qty 41",
    input: {
      barMark: "S1",
      member: "Beam stirrup",
      diaMm: 8,
      noOfMembers: 1,
      barsPerMember: 41,
      cuttingLengthMm: 1556,
    },
    expect: {
      totalBars: 41,
      totalLengthM: 63.796,
      weightKg: 25.19,
    },
  },
  {
    id: "footing-20-heavy",
    label: "Footing bottom mat — 6 × 20 mm @ 4200 mm",
    input: {
      barMark: "F1",
      member: "Footing",
      diaMm: 20,
      noOfMembers: 1,
      barsPerMember: 6,
      cuttingLengthMm: 4200,
    },
    expect: {
      totalBars: 6,
      totalLengthM: 25.2,
      weightKg: 62.22,
    },
  },
];

/** Reference unit weights (kg/m) from IS formula D²/162. */
export const BBS_UNIT_WEIGHT_REFERENCE: { diaMm: number; kgPerM: number }[] = [
  { diaMm: 8, kgPerM: 0.395 },
  { diaMm: 10, kgPerM: 0.617 },
  { diaMm: 12, kgPerM: 0.889 },
  { diaMm: 16, kgPerM: 1.58 },
  { diaMm: 20, kgPerM: 2.47 },
  { diaMm: 25, kgPerM: 3.858 },
];
