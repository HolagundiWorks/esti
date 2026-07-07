// Bar Bending Schedule constants + formulas — a faithful C++ port of
// packages/contracts/src/bbs.ts. Values per IS 456:2000, IS 2502:1963,
// SP 34:1987, IS 1786:2008. All lengths in mm.
#pragma once
#include <algorithm>
#include <cmath>
#include <stdexcept>
#include <string>

namespace aorms::bbs {

// Characteristic yield strength fy (N/mm²) by grade.
inline double steelGradeFy(const std::string& grade) {
  if (grade == "Fe415") return 415;
  if (grade == "Fe500" || grade == "Fe500D") return 500;
  if (grade == "Fe550" || grade == "Fe550D") return 550;
  throw std::invalid_argument("unknown steel grade: " + grade);
}

// Bar unit mass (kg/m) = D²/162.
inline double barUnitWeightKgM(double diaMm) { return (diaMm * diaMm) / 162.0; }

// Cut-length bend deduction, in bar diameters, per bend angle (IS 2502 practice).
inline double bendDeductionD(int angle) {
  switch (angle) {
    case 45: return 1;
    case 90: return 2;
    case 135: return 3;
    case 180: return 4;
    default: throw std::invalid_argument("no bend deduction for angle");
  }
}

// Hook allowance (×dia) by bend coefficient k (IS 2502): 2 mild · 3 medium · 4 HYSD · 6 >25mm.
inline double hookAllowanceD(int k) {
  switch (k) {
    case 2: return 9;
    case 3: return 11;
    case 4: return 13;
    case 6: return 17;
    default: throw std::invalid_argument("no hook allowance for k");
  }
}

// Element minimum clear cover (mm) — SP 34 §4.1.
inline double elementCoverMm(const std::string& element) {
  if (element == "slab") return 15;
  if (element == "beam") return 25;
  if (element == "column") return 40;
  if (element == "footing") return 50;
  throw std::invalid_argument("unknown element for cover: " + element);
}

// Durability cover by exposure (mm) — IS 456 Table 16.
inline double exposureCoverMm(const std::string& exposure) {
  if (exposure == "mild") return 20;
  if (exposure == "moderate") return 30;
  if (exposure == "severe") return 45;
  if (exposure == "verySevere") return 50;
  if (exposure == "extreme") return 75;
  throw std::invalid_argument("unknown exposure: " + exposure);
}

// Effective cover = max(element, exposure).
inline double effectiveCoverMm(const std::string& element, const std::string& exposure) {
  return std::max(elementCoverMm(element), exposureCoverMm(exposure));
}

// Design bond stress τbd (N/mm²) — IS 456 cl.26.2.1.1.
inline double designBondStress(double concreteGradeMpa, bool deformed = true, bool compression = false) {
  int g = concreteGradeMpa >= 40 ? 40 : static_cast<int>(concreteGradeMpa);
  double tbd;
  switch (g) {
    case 15: tbd = 1.0; break;
    case 20: tbd = 1.2; break;
    case 25: tbd = 1.4; break;
    case 30: tbd = 1.5; break;
    case 35: tbd = 1.7; break;
    case 40: tbd = 1.9; break;
    default: tbd = 1.9; break;
  }
  if (deformed) tbd *= 1.6;
  if (compression) tbd *= 1.25;
  return tbd;
}

// Development length Ld (mm) — IS 456 cl.26.2.1: Ld = φ·σs/(4·τbd), σs = 0.87·fy.
inline double developmentLengthMm(double diaMm, const std::string& grade, double concreteGradeMpa,
                                  bool compression = false) {
  double sigmaS = 0.87 * steelGradeFy(grade);
  double tbd = designBondStress(concreteGradeMpa, true, compression);
  return (diaMm * sigmaS) / (4.0 * tbd);
}

// Lap length (mm) — IS 456 cl.26.2.5.1. Tension = max(Ld, 30φ); compression = max(Ld_comp, 24φ).
inline double lapLengthMm(double diaMm, const std::string& grade, double concreteGradeMpa,
                          bool compression) {
  if (compression)
    return std::max(developmentLengthMm(diaMm, grade, concreteGradeMpa, true), 24.0 * diaMm);
  return std::max(developmentLengthMm(diaMm, grade, concreteGradeMpa, false), 30.0 * diaMm);
}

// Number of bars over a run = ⌊length / spacing⌋ + 1.
inline int barCount(double clearLengthMm, double spacingMm) {
  return static_cast<int>(std::floor(clearLengthMm / spacingMm)) + 1;
}

} // namespace aorms::bbs
