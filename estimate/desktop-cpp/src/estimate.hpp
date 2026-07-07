// The estimating engine — a faithful C++ port of the pure functions in
// packages/contracts/src/estimate.ts (+ the model→draft assembly in
// estimate/src/core/build.ts). It:
//   • parses the working model (the shape the SPA edits and POSTs),
//   • assembles it into a sealed `.aormsest` file (frozen quantities + sha256),
//   • re-costs items/materials/steel against a rate book (abstract, BOQ, ...).
// Money is integer paise throughout; quantities/weights carry 3/2 dp.
#pragma once
#include <cstdint>
#include <optional>
#include <string>
#include <vector>
#include "../third_party/json.hpp"

namespace aorms {

using json = nlohmann::json;

constexpr int AORMSEST_FORMAT_VERSION = 1;

// ── Working model (mutable, UI-edited; estimate/src/core/model.ts) ────────────
struct MeasureRow {
  std::optional<std::string> desc;
  double nos = 1;
  std::optional<double> l, b, h; // nullable dimensions
};

struct WorkItem {
  std::string code;
  std::optional<std::string> itemCode;
  std::string shortName;
  std::optional<std::string> specification;
  std::string uom;
  int64_t ratePaise = 0;
  std::optional<std::string> section;
  std::vector<MeasureRow> measurements;
  std::optional<double> leadKm;
  int64_t leadChargePaise = 0;
};

struct MaterialLine {
  std::string code, name, unit;
  double qty = 0;
  std::optional<int64_t> ratePaise;
};

struct EstimateModel {
  std::string estimateName;
  std::optional<std::string> projectName;
  std::string rateBookCode = "OWN";
  std::string rateBookName = "Office rate book";
  std::vector<WorkItem> items;
  std::vector<MaterialLine> materials;
  std::vector<json> bbs; // raw member inputs (fed to computeMemberBBS)
  std::vector<std::pair<int, int64_t>> steelRatePaiseByDia; // ₹/kg by diameter
};

// ── Frozen `.aormsest` draft (build.ts modelToDraft, sans checksum) ───────────
struct FileMeasurement {
  std::optional<std::string> desc;
  double nos = 1;
  std::optional<double> l, b, h;
  double qty = 0;
};
struct FileLead {
  std::optional<double> km;
  std::optional<std::string> desc;
  int64_t chargePaise = 0;
};
struct EstimateItem {
  std::string code;
  std::optional<std::string> itemCode;
  std::string shortName;
  std::optional<std::string> specification;
  std::vector<std::pair<std::string, std::string>> attributes;
  std::string uom;
  int64_t ratePaise = 0;
  std::vector<FileMeasurement> measurements;
  double qty = 0;
  int64_t amountPaise = 0;
  std::optional<FileLead> lead;
  std::optional<std::string> section;
  std::optional<std::string> derivedFrom;
};
struct EstimateMaterial {
  std::string code, name, unit;
  double qty = 0;
  std::optional<int64_t> ratePaise;
  std::optional<int64_t> amountPaise;
};
struct EstimateSteel {
  double diaMm = 0, unitWeightKgM = 0, weightKg = 0;
  std::optional<int64_t> ratePaise;
  std::optional<int64_t> amountPaise;
  std::optional<std::string> ref;
};
struct EstimateDraft {
  std::string estimateName;
  std::optional<std::string> projectName;
  std::string createdAt;
  std::string appVersion = "0.1.0";
  std::string rateBookCode = "OWN";
  std::string rateBookName = "Office rate book";
  std::vector<EstimateItem> items;
  std::vector<EstimateMaterial> materials;
  std::vector<EstimateSteel> steel;
};

// ── Project rate book (the live lever AORMS re-costs against) ─────────────────
struct RateBookRates {
  std::string code = "SELF";
  std::string name = "As estimated";
  std::vector<std::pair<std::string, int64_t>> itemRatePaise;
  std::vector<std::pair<std::string, int64_t>> materialRatePaise;
  std::vector<std::pair<std::string, int64_t>> steelRatePaiseByDia; // keyed by string dia
};

// ── Measurement → quantity (nos × present dims; nulls skipped) ────────────────
double measureQty(double nos, std::optional<double> l, std::optional<double> b, std::optional<double> h);

// ── Parsing ──────────────────────────────────────────────────────────────────
EstimateModel parseModel(const json& j);          // working model from SPA
RateBookRates parseRateBook(const json& j);        // optional rate book

// ── Assembly + seal ──────────────────────────────────────────────────────────
EstimateDraft modelToDraft(const EstimateModel& model, const std::string& createdAtISO);
json draftToJson(const EstimateDraft& draft);      // formatVersion..steel, NO checksum
std::string sealString(const EstimateDraft& draft); // canonical bytes to hash
std::string checksum(const EstimateDraft& draft);   // sha256 hex of sealString
json sealedFile(const EstimateDraft& draft);        // draftToJson + checksum → .aormsest

// ── Re-costing views (abstract / BOQ / materials / steel / whole) ─────────────
json recostAbstract(const std::vector<EstimateItem>& items, const RateBookRates& rb,
                    const std::vector<std::pair<std::string, int64_t>>& projectItemRatePaise = {});
json recostBOQ(const std::vector<EstimateItem>& items, const RateBookRates& rb,
               const std::vector<std::pair<std::string, int64_t>>& projectItemRatePaise = {});
json recostMaterials(const std::vector<EstimateMaterial>& materials, const RateBookRates& rb);
json recostSteel(const std::vector<EstimateSteel>& steel, const RateBookRates& rb);
json recostEstimate(const EstimateDraft& draft, const RateBookRates& rb,
                    const std::vector<std::pair<std::string, int64_t>>& projectItemRatePaise = {});

} // namespace aorms
