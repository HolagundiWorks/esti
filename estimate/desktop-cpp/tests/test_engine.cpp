// Parity tests: the C++ engine must reproduce the shared TypeScript engine's
// numbers (packages/contracts/src/estimate.test.ts) and — critically — the exact
// sha256 seal that estimateSealString + Web Crypto produce. The seal reference
// was generated with Node (see backend-cpp/README.md).
#include <cmath>
#include <cstdio>
#include <string>

#include "../src/bbs_engine.hpp"
#include "../src/estimate.hpp"
#include "../src/numeric.hpp"

using namespace aorms;

static int g_failed = 0;
static int g_checks = 0;

#define CHECK(cond)                                                              \
  do {                                                                           \
    ++g_checks;                                                                  \
    if (!(cond)) {                                                               \
      std::printf("FAIL %s:%d  %s\n", __FILE__, __LINE__, #cond);               \
      ++g_failed;                                                                \
    }                                                                            \
  } while (0)

#define CHECK_EQ_I(a, b)                                                         \
  do {                                                                           \
    ++g_checks;                                                                  \
    auto _a = (a);                                                              \
    auto _b = (b);                                                              \
    if (_a != _b) {                                                             \
      std::printf("FAIL %s:%d  %s == %s  (%lld vs %lld)\n", __FILE__, __LINE__,  \
                  #a, #b, (long long)_a, (long long)_b);                         \
      ++g_failed;                                                                \
    }                                                                            \
  } while (0)

static bool nearly(double a, double b, double eps = 1e-9) { return std::fabs(a - b) < eps; }

static EstimateItem item(std::string code, std::string shortName, std::string uom, int64_t rate,
                         double qty, std::optional<std::string> section = std::nullopt,
                         std::optional<std::string> itemCode = std::nullopt) {
  EstimateItem it;
  it.code = std::move(code);
  it.shortName = std::move(shortName);
  it.uom = std::move(uom);
  it.ratePaise = rate;
  it.qty = qty;
  it.section = std::move(section);
  it.itemCode = std::move(itemCode);
  it.amountPaise = amountPaise(qty, rate);
  return it;
}

// ── 1. measurement → quantity ────────────────────────────────────────────────
static void testMeasureQty() {
  CHECK(nearly(measureQty(1, 4.5, 0.23, 3.0), 3.105));
  CHECK(nearly(measureQty(2, 4.5, std::nullopt, 3.0), 27)); // b null
  CHECK(nearly(measureQty(5, std::nullopt, std::nullopt, std::nullopt), 5));
  CHECK_EQ_I(amountPaise(4.692, 800000), 3753600);
}

// ── 2. seal checksum parity (Node reference) ─────────────────────────────────
static void testSeal() {
  EstimateDraft d;
  d.estimateName = "Villa GF";
  d.projectName = "Villa";
  d.createdAt = "2026-07-05T00:00:00.000Z";
  d.appVersion = "0.1.0";
  d.rateBookCode = "OWN";
  d.rateBookName = "Office rate book";

  EstimateItem it;
  it.code = "bw230";
  it.itemCode = "3";
  it.shortName = "Brick work 230mm";
  it.specification = "CM 1:6";
  it.uom = "m\xC2\xB3"; // m³ (UTF-8)
  it.ratePaise = 800000;
  it.qty = 4.692;
  it.amountPaise = 3753600;
  it.section = "Masonry";
  FileMeasurement m1;
  m1.desc = "GF wall A";
  m1.nos = 1; m1.l = 4.5; m1.b = 0.23; m1.h = 3.0; m1.qty = 3.105;
  FileMeasurement m2;
  m2.nos = 5; m2.qty = 5; // l/b/h null
  it.measurements = {m1, m2};
  d.items = {it};

  EstimateMaterial mat;
  mat.code = "cement"; mat.name = "Cement"; mat.unit = "bag";
  mat.qty = 20; mat.ratePaise = 29300; mat.amountPaise = 586000;
  d.materials = {mat};

  EstimateSteel s;
  s.diaMm = 12; s.unitWeightKgM = 0.889; s.weightKg = 120; s.ratePaise = 6500; s.amountPaise = 780000;
  d.steel = {s};

  const std::string expected = "cef501e96a7ea7eac695e525dca5101c5ae87f3ef19e399c67989da78e603e15";
  std::string got = checksum(d);
  if (got != expected) {
    std::printf("FAIL seal checksum\n  expected %s\n  got      %s\n  string   %s\n",
                expected.c_str(), got.c_str(), sealString(d).c_str());
    ++g_failed;
  }
  ++g_checks;
}

// ── 3. re-cost abstract (book overrides; fallback; variance) ─────────────────
static void testRecost() {
  std::vector<EstimateItem> items = {
      item("bw230", "Brick work 230mm", "m3", 800000, 4.692, std::string("Masonry"), std::string("3")),
      item("plaster12", "Cement plaster 12mm", "m2", 25000, 40.8, std::string("Finishing")),
  };
  RateBookRates rb;
  rb.itemRatePaise = {{"bw230", 750000}};

  json a = recostAbstract(items, rb);
  json brick = a["rows"][0];
  CHECK(brick["rateSource"] == "rateBook");
  CHECK_EQ_I(brick["ratePaise"].get<int64_t>(), 750000);
  CHECK_EQ_I(brick["amountPaise"].get<int64_t>(), 3519000);
  CHECK_EQ_I(brick["amountPaiseEstimated"].get<int64_t>(), 3753600);
  json plaster = a["rows"][1];
  CHECK(plaster["rateSource"] == "estimate");
  CHECK_EQ_I(plaster["ratePaise"].get<int64_t>(), 25000);
  // totals reconcile
  int64_t sumCosted = 0, sumEst = 0;
  for (auto& r : a["rows"]) { sumCosted += r["amountPaise"].get<int64_t>(); sumEst += r["amountPaiseEstimated"].get<int64_t>(); }
  CHECK_EQ_I(a["totalCostedPaise"].get<int64_t>(), sumCosted);
  CHECK_EQ_I(a["totalVariancePaise"].get<int64_t>(), sumCosted - sumEst);

  // empty rate book → zero variance
  json a0 = recostAbstract(items, RateBookRates{});
  CHECK_EQ_I(a0["totalVariancePaise"].get<int64_t>(), 0);

  // project override wins
  json ap = recostAbstract(items, rb, {{"bw230", 700000}});
  CHECK(ap["rows"][0]["rateSource"] == "project");
  CHECK_EQ_I(ap["rows"][0]["ratePaise"].get<int64_t>(), 700000);

  // BOQ groups by section and subtotals to the abstract total
  json boq = recostBOQ(items, RateBookRates{});
  int64_t boqTotal = 0;
  for (auto& sec : boq["sections"]) boqTotal += sec["subtotalPaise"].get<int64_t>();
  CHECK_EQ_I(boqTotal, boq["totalPaise"].get<int64_t>());
  CHECK_EQ_I((int)boq["sections"].size(), 2);
}

// ── 4. leads (carriage) ──────────────────────────────────────────────────────
static void testLeads() {
  EstimateItem it = item("agg", "20mm aggregate at site", "m3", 133300, 10);
  FileLead lead; lead.km = 12; lead.chargePaise = 20000; it.lead = lead;
  it.amountPaise = amountPaise(10, 133300) + amountPaise(10, 20000);
  std::vector<EstimateItem> items = {it};

  json a = recostAbstract(items, RateBookRates{});
  json r = a["rows"][0];
  CHECK_EQ_I(r["leadAmountPaise"].get<int64_t>(), 200000);
  CHECK_EQ_I(r["amountPaise"].get<int64_t>(), 10 * 133300 + 10 * 20000);
  CHECK_EQ_I(a["totalLeadPaise"].get<int64_t>(), 200000);

  RateBookRates rb; rb.itemRatePaise = {{"agg", 120000}};
  json a2 = recostAbstract(items, rb);
  CHECK(a2["rows"][0]["rateSource"] == "rateBook");
  CHECK_EQ_I(a2["rows"][0]["variancePaise"].get<int64_t>(), 10 * 120000 - 10 * 133300);
}

// ── 5. materials + steel summaries ───────────────────────────────────────────
static void testMaterialsSteel() {
  std::vector<EstimateMaterial> materials = {
      {"brick-modular", "Modular brick", "Nos", 2393, 900, std::nullopt},
      {"cement", "Cement", "bag", 12.5, 29300, std::nullopt},
      {"cement", "Cement", "bag", 7.5, 29300, std::nullopt},
  };
  RateBookRates rb; rb.materialRatePaise = {{"cement", 30000}};
  json m = recostMaterials(materials, rb);
  json cement;
  for (auto& r : m["rows"]) if (r["code"] == "cement") cement = r;
  CHECK(nearly(cement["qty"].get<double>(), 20));
  CHECK(cement["rateSource"] == "rateBook");
  CHECK_EQ_I(cement["amountPaise"].get<int64_t>(), 20 * 30000);

  std::vector<EstimateSteel> steel = {
      {12, 0.888, 120, 6500, std::nullopt, std::nullopt},
      {16, 1.58, 80, 6400, std::nullopt, std::nullopt},
  };
  RateBookRates rb2; rb2.steelRatePaiseByDia = {{"12", 7000}};
  json s = recostSteel(steel, rb2);
  CHECK(nearly(s["totalWeightKg"].get<double>(), 200));
  json d12;
  for (auto& r : s["rows"]) if (r["diaMm"].get<double>() == 12) d12 = r;
  CHECK(d12["rateSource"] == "rateBook");
  CHECK_EQ_I(d12["amountPaise"].get<int64_t>(), 120 * 7000);
}

// ── 6. BBS through modelToDraft (footing → steel line) ───────────────────────
static void testBbsFooting() {
  EstimateModel model;
  model.estimateName = "BBS";
  json footing = {{"element", "FOOTING"}, {"lengthMm", 2000}, {"widthMm", 2000},
                  {"xDiaMm", 12}, {"xSpacingMm", 150}, {"yDiaMm", 12}, {"ySpacingMm", 150},
                  {"concreteGradeMpa", 25}, {"steelGrade", "Fe500"}};
  model.bbs = {footing};
  model.steelRatePaiseByDia = {{12, 6500}};

  EstimateDraft d = modelToDraft(model, "2026-07-05T00:00:00.000Z");
  CHECK_EQ_I((int)d.steel.size(), 1);
  CHECK(nearly(d.steel[0].diaMm, 12));
  CHECK(d.steel[0].weightKg > 0);
  CHECK(nearly(d.steel[0].unitWeightKgM, 0.889, 1e-3));
  CHECK(d.steel[0].amountPaise.has_value());
  CHECK_EQ_I(*d.steel[0].amountPaise, amountPaise(d.steel[0].weightKg, 6500));

  // direct member compute
  BbsMember m = computeMemberBBS(footing);
  CHECK(m.element == "FOOTING");
  CHECK((int)m.byDiameter.size() == 1);
  CHECK(m.byDiameter[0].diaMm == 12);
  CHECK(m.totalWeightKg > 0);
}

int main() {
  testMeasureQty();
  testSeal();
  testRecost();
  testLeads();
  testMaterialsSteel();
  testBbsFooting();
  std::printf("\n%d checks, %d failed\n", g_checks, g_failed);
  return g_failed == 0 ? 0 : 1;
}
