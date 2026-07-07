// BBS engine — element geometry → bar schedule. Faithful C++ port of
// packages/contracts/src/bbs-engine.ts. Given a member's geometry and bar
// config it computes each bar's count, cut length and weight, and rolls up the
// schedule. Members are read from JSON (the `bbs` rows of the working model).
#pragma once
#include <string>
#include <vector>
#include "../third_party/json.hpp"

namespace aorms {

using json = nlohmann::json;

struct BbsBar {
  std::string mark;
  std::string role;
  double diaMm;
  int nos;
  int cutLengthMm;
  double unitWtKgM;
  double weightKg;
  std::string shape;
};

struct ByDiameter {
  double diaMm;
  double weightKg;
};

struct BbsMember {
  std::string element;
  std::string ref; // empty => absent
  std::vector<BbsBar> bars;
  double totalWeightKg;
  std::vector<ByDiameter> byDiameter;
};

// Dispatch on `input.element` (SLAB | BEAM | COLUMN | FOOTING). Throws
// std::invalid_argument on an unknown element or a missing required field.
BbsMember computeMemberBBS(const json& input);

// Roll up many members into one schedule grouped by diameter (ascending).
std::vector<ByDiameter> scheduleByDiameter(const std::vector<BbsMember>& members);

} // namespace aorms
