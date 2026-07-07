// Money & rounding helpers — faithful to the TypeScript engine
// (packages/contracts/src/estimate.ts, bbs-engine.ts). Money is integer paise.
//
// JS `Math.round` rounds halves toward +Infinity: Math.round(x) == floor(x+0.5).
// We replicate that exactly so amounts/quantities match byte-for-byte, then use
// the same round3 / round2 quantisation the shared engine uses.
#pragma once
#include <cmath>
#include <cstdint>
#include "../third_party/json.hpp"

namespace aorms {

using json = nlohmann::json;

// Math.round(x) — floor(x + 0.5). Domain values are non-negative, matching JS.
inline double jsRound(double x) { return std::floor(x + 0.5); }

// round3(n) = Math.round(n*1000)/1000  (quantities, weights carried to 3 dp)
inline double round3(double n) { return jsRound(n * 1000.0) / 1000.0; }

// round(n) = Math.round(n*100)/100  (BBS engine's 2-dp rounding)
inline double round2(double n) { return jsRound(n * 100.0) / 100.0; }

// amountPaise(qty, ratePaise) = Math.round(qty * ratePaise)  → integer paise
inline int64_t amountPaise(double qty, int64_t ratePaise) {
  return static_cast<int64_t>(jsRound(qty * static_cast<double>(ratePaise)));
}

// Build a JSON number that serialises like JS `JSON.stringify`: an
// integer-valued double becomes a JSON integer (`5`, not `5.0`), everything else
// stays a double and nlohmann emits its shortest round-trip form (`3.105`,
// `0.889`) — the same shortest-representation rule ECMAScript uses. This is what
// makes the sealed digest match the TypeScript `estimateSealString`.
inline json jnum(double v) {
  if (std::isfinite(v) && std::floor(v) == v && std::fabs(v) < 9.007199254740992e15)
    return json(static_cast<int64_t>(v));
  return json(v);
}

} // namespace aorms
