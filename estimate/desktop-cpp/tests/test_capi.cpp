// C ABI round-trip: drive the exact in-process bridge the webview host binds to
// window.*, against a real on-disk SQLite file. Proves persistence + engine work
// with no server and no network.
#include <cstdio>
#include <cstdio>
#include <string>

#include "../src/capi.hpp"
#include "../third_party/json.hpp"

using nlohmann::json;

static int g_failed = 0;
static int g_checks = 0;
#define CHECK(cond)                                                        \
  do {                                                                     \
    ++g_checks;                                                            \
    if (!(cond)) { std::printf("FAIL %s:%d  %s\n", __FILE__, __LINE__, #cond); ++g_failed; } \
  } while (0)

// Adopt + parse a capi result, freeing the C string.
static json call(char* s) {
  json j = json::parse(s ? s : "null", nullptr, false);
  est_free(s);
  return j;
}

int main() {
  const char* dbPath = "test_capi_tmp.db";
  std::remove(dbPath);
  std::remove("test_capi_tmp.db-wal");
  std::remove("test_capi_tmp.db-shm");

  void* db = est_open(dbPath);
  CHECK(db != nullptr);

  // empty to start
  json list0 = call(est_list(db));
  CHECK(list0["estimates"].is_array());
  CHECK(list0["estimates"].empty());

  // create: 2 nos × 3 × 0.2 × 3 = 3.6 m³ @ ₹1000/m³ → 360000 paise
  const char* model =
      R"({"estimateName":"Slab job","projectName":"P1","items":[{"code":"c","uom":"m3",)"
      R"("ratePaise":100000,"measurements":[{"nos":2,"l":3,"b":0.2,"h":3}]}]})";
  json created = call(est_create(db, model));
  CHECK(created.contains("id"));
  CHECK(created["name"] == "Slab job");
  CHECK(created["grandTotalPaise"].get<long long>() == 360000);
  CHECK(created["checksum"].is_string() && created["checksum"].get<std::string>().size() == 64);
  std::string id = created["id"];

  // get
  json got = call(est_get(db, id.c_str()));
  CHECK(got["id"] == id);
  CHECK(got["grandTotalPaise"].get<long long>() == 360000);
  CHECK(got["costed"]["abstract"]["totalCostedPaise"].get<long long>() == 360000);

  // list now has one
  json list1 = call(est_list(db));
  CHECK(list1["estimates"].size() == 1);

  // update: bump rate to ₹2000/m³ → 720000
  const char* model2 =
      R"({"estimateName":"Slab job v2","items":[{"code":"c","uom":"m3","ratePaise":200000,)"
      R"("measurements":[{"nos":2,"l":3,"b":0.2,"h":3}]}]})";
  json updated = call(est_update(db, id.c_str(), model2));
  CHECK(updated["name"] == "Slab job v2");
  CHECK(updated["grandTotalPaise"].get<long long>() == 720000);

  // sealed .aormsest export
  json file = call(est_file(db, id.c_str()));
  CHECK(file["formatVersion"].get<int>() == 1);
  CHECK(file["checksum"].is_string());
  CHECK(file["items"][0]["qty"].get<double>() == 3.6);

  // missing id → error
  json miss = call(est_get(db, "nope"));
  CHECK(miss.contains("error"));

  // delete
  json del = call(est_delete(db, id.c_str()));
  CHECK(del["deleted"].get<bool>() == true);
  json list2 = call(est_list(db));
  CHECK(list2["estimates"].empty());

  // stateless recost + bbs (no store)
  json recost = call(est_recost(model));
  CHECK(recost["grandTotalPaise"].get<long long>() == 360000);
  json bbs = call(est_bbs(
      R"({"element":"FOOTING","lengthMm":2000,"widthMm":2000,"xDiaMm":12,"xSpacingMm":150,)"
      R"("yDiaMm":12,"ySpacingMm":150,"concreteGradeMpa":25,"steelGrade":"Fe500"})"));
  CHECK(bbs["members"][0]["element"] == "FOOTING");
  CHECK(bbs["schedule"][0]["diaMm"].get<double>() == 12);
  CHECK(bbs["schedule"][0]["weightKg"].get<double>() > 0);

  // invalid JSON → error, not crash
  json bad = call(est_create(db, "{not json"));
  CHECK(bad.contains("error"));

  est_close(db);
  std::remove(dbPath);
  std::remove("test_capi_tmp.db-wal");
  std::remove("test_capi_tmp.db-shm");

  std::printf("\n%d checks, %d failed\n", g_checks, g_failed);
  return g_failed == 0 ? 0 : 1;
}
