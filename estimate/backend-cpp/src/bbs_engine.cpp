#include "bbs_engine.hpp"

#include <algorithm>
#include <cmath>
#include <map>
#include <stdexcept>

#include "bbs.hpp"
#include "numeric.hpp"

namespace aorms {
namespace {

// ── JSON field accessors (mirror the TS `?? default` semantics) ──────────────
double reqNum(const json& j, const char* key) {
  if (!j.contains(key) || j.at(key).is_null() || !j.at(key).is_number())
    throw std::invalid_argument(std::string("BBS member missing numeric field: ") + key);
  return j.at(key).get<double>();
}

double optNum(const json& j, const char* key, double fallback) {
  auto it = j.find(key);
  if (it == j.end() || it->is_null() || !it->is_number()) return fallback;
  return it->get<double>();
}

std::string optStr(const json& j, const char* key, const std::string& fallback) {
  auto it = j.find(key);
  if (it == j.end() || it->is_null() || !it->is_string()) return fallback;
  return it->get<std::string>();
}

bool has(const json& j, const char* key) {
  auto it = j.find(key);
  return it != j.end() && !it->is_null();
}

// bar(): unit weight from D²/162; cut length rounded to a whole mm for display,
// but the weight is computed from the UNROUNDED cut length and unit weight —
// exactly as bbs-engine.ts does.
BbsBar bar(const std::string& mark, const std::string& role, double diaMm, int nos,
           double cutLengthMm, const std::string& shape) {
  double unitWtKgM = bbs::barUnitWeightKgM(diaMm);
  BbsBar b;
  b.mark = mark;
  b.role = role;
  b.diaMm = diaMm;
  b.nos = nos;
  b.cutLengthMm = static_cast<int>(jsRound(cutLengthMm));
  b.unitWtKgM = round2(unitWtKgM);
  b.weightKg = round2((cutLengthMm / 1000.0) * unitWtKgM * nos);
  b.shape = shape;
  return b;
}

BbsMember assemble(const std::string& element, const std::string& ref, std::vector<BbsBar> bars) {
  std::map<double, double> byDia; // ordered ascending by diameter
  double total = 0;
  for (const auto& b : bars) {
    total += b.weightKg;
    byDia[b.diaMm] += b.weightKg;
  }
  BbsMember m;
  m.element = element;
  m.ref = ref;
  m.bars = std::move(bars);
  m.totalWeightKg = round2(total);
  for (const auto& [dia, w] : byDia) m.byDiameter.push_back({dia, round2(w)});
  return m;
}

// straight bar cut: clearDim − 2·cover + 2·hook − 2·(90° bend deduction)
double straightCut(double clearDimMm, double coverMm, double diaMm, double hookD) {
  return clearDimMm - 2 * coverMm + 2 * hookD * diaMm - 2 * bbs::bendDeductionD(90) * diaMm;
}

// 2-legged closed stirrup/tie around an (a × b) core, 135° hooks (10d each)
double stirrupCut(double aMm, double bMm, double diaMm) {
  double hook = 10 * diaMm;
  return 2 * (aMm + bMm) + 2 * hook - 3 * bbs::bendDeductionD(90) * diaMm;
}

BbsMember computeSlab(const json& i, const std::string& ref) {
  double cover = has(i, "coverMm") ? reqNum(i, "coverMm")
                                   : bbs::effectiveCoverMm("slab", optStr(i, "exposure", "mild"));
  double hookD = optNum(i, "hookD", bbs::hookAllowanceD(2));
  double lengthMm = reqNum(i, "lengthMm"), widthMm = reqNum(i, "widthMm");
  BbsBar main = bar("S1", "main", reqNum(i, "mainDiaMm"),
                    bbs::barCount(widthMm, reqNum(i, "mainSpacingMm")),
                    straightCut(lengthMm, cover, reqNum(i, "mainDiaMm"), hookD), "straight");
  BbsBar dist = bar("S2", "distribution", reqNum(i, "distDiaMm"),
                    bbs::barCount(lengthMm, reqNum(i, "distSpacingMm")),
                    straightCut(widthMm, cover, reqNum(i, "distDiaMm"), hookD), "straight");
  return assemble("SLAB", ref, {main, dist});
}

BbsMember computeBeam(const json& i, const std::string& ref) {
  double cover = has(i, "coverMm") ? reqNum(i, "coverMm")
                                   : bbs::effectiveCoverMm("beam", optStr(i, "exposure", "moderate"));
  double hookD = optNum(i, "hookD", bbs::hookAllowanceD(2));
  double clearSpanMm = reqNum(i, "clearSpanMm");
  double widthMm = reqNum(i, "widthMm"), depthMm = reqNum(i, "depthMm");
  BbsBar bottom = bar("B1", "main", reqNum(i, "bottomDiaMm"), static_cast<int>(reqNum(i, "bottomNos")),
                      straightCut(clearSpanMm, cover, reqNum(i, "bottomDiaMm"), hookD), "straight");
  BbsBar top = bar("B2", "top", reqNum(i, "topDiaMm"), static_cast<int>(reqNum(i, "topNos")),
                   straightCut(clearSpanMm, cover, reqNum(i, "topDiaMm"), hookD), "straight");
  BbsBar stirrup = bar("B3", "stirrup", reqNum(i, "stirrupDiaMm"),
                       bbs::barCount(clearSpanMm, reqNum(i, "stirrupSpacingMm")),
                       stirrupCut(widthMm - 2 * cover, depthMm - 2 * cover, reqNum(i, "stirrupDiaMm")),
                       "stirrup");
  return assemble("BEAM", ref, {bottom, top, stirrup});
}

BbsMember computeColumn(const json& i, const std::string& ref) {
  double cover = has(i, "coverMm") ? reqNum(i, "coverMm")
                                   : bbs::effectiveCoverMm("column", optStr(i, "exposure", "moderate"));
  double vDia = reqNum(i, "verticalDiaMm");
  double lap = bbs::lapLengthMm(vDia, optStr(i, "steelGrade", "Fe500"), reqNum(i, "concreteGradeMpa"), true);
  double heightMm = reqNum(i, "heightMm");
  double widthMm = reqNum(i, "widthMm"), depthMm = reqNum(i, "depthMm");
  BbsBar vertical = bar("C1", "vertical", vDia, static_cast<int>(reqNum(i, "verticalNos")),
                        heightMm + lap, "straight+lap");
  BbsBar tie = bar("C2", "tie", reqNum(i, "tieDiaMm"),
                   bbs::barCount(heightMm, reqNum(i, "tieSpacingMm")),
                   stirrupCut(widthMm - 2 * cover, depthMm - 2 * cover, reqNum(i, "tieDiaMm")), "tie");
  return assemble("COLUMN", ref, {vertical, tie});
}

BbsMember computeFooting(const json& i, const std::string& ref) {
  double cover = has(i, "coverMm") ? reqNum(i, "coverMm")
                                   : bbs::effectiveCoverMm("footing", optStr(i, "exposure", "moderate"));
  double hookD = optNum(i, "hookD", bbs::hookAllowanceD(2));
  double lengthMm = reqNum(i, "lengthMm"), widthMm = reqNum(i, "widthMm");
  BbsBar xbar = bar("F1", "main", reqNum(i, "xDiaMm"),
                    bbs::barCount(widthMm, reqNum(i, "xSpacingMm")),
                    straightCut(lengthMm, cover, reqNum(i, "xDiaMm"), hookD), "straight");
  BbsBar ybar = bar("F2", "distribution", reqNum(i, "yDiaMm"),
                    bbs::barCount(lengthMm, reqNum(i, "ySpacingMm")),
                    straightCut(widthMm, cover, reqNum(i, "yDiaMm"), hookD), "straight");
  return assemble("FOOTING", ref, {xbar, ybar});
}

} // namespace

BbsMember computeMemberBBS(const json& input) {
  std::string element = optStr(input, "element", "");
  std::string ref = optStr(input, "ref", "");
  if (element == "SLAB") return computeSlab(input, ref);
  if (element == "BEAM") return computeBeam(input, ref);
  if (element == "COLUMN") return computeColumn(input, ref);
  if (element == "FOOTING") return computeFooting(input, ref);
  throw std::invalid_argument("unknown BBS element: " + element);
}

std::vector<ByDiameter> scheduleByDiameter(const std::vector<BbsMember>& members) {
  std::map<double, double> byDia;
  for (const auto& m : members)
    for (const auto& d : m.byDiameter) byDia[d.diaMm] += d.weightKg;
  std::vector<ByDiameter> out;
  for (const auto& [dia, w] : byDia) out.push_back({dia, round2(w)});
  return out;
}

} // namespace aorms
