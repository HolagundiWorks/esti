#include "capi.hpp"

#include <cstdlib>
#include <cstring>
#include <memory>
#include <mutex>
#include <string>

#include "bbs_engine.hpp"
#include "db.hpp"
#include "estimate.hpp"
#include "numeric.hpp"
#include "../third_party/json.hpp"

using aorms::json;

namespace {

// A store handle: the SQLite DB plus a write lock (the webview may dispatch
// binding callbacks from more than one thread).
struct Handle {
  explicit Handle(const std::string& path) : db(path) {}
  aorms::Db db;
  std::mutex mutex;
};

char* dup(const std::string& s) {
  char* out = static_cast<char*>(std::malloc(s.size() + 1));
  if (out) std::memcpy(out, s.data(), s.size() + 1);
  return out;
}

char* ok(const json& j) { return dup(j.dump()); }
char* err(const std::string& message) { return dup(json{{"error", message}}.dump()); }

// Model from a request body: the model directly, or wrapped as { "model": {...} }.
json modelFrom(const json& body) {
  if (body.is_object() && body.contains("model") && body["model"].is_object()) return body["model"];
  return body;
}

// Everything the engine derives from a saved model (costed views + seal).
struct Derived {
  aorms::EstimateDraft draft;
  std::string checksum;
  int64_t grandTotalPaise;
  json costed;
};
Derived derive(const json& model, const std::string& createdAt) {
  aorms::EstimateModel m = aorms::parseModel(model);
  Derived d;
  d.draft = aorms::modelToDraft(m, createdAt);
  d.checksum = aorms::checksum(d.draft);
  d.costed = aorms::recostEstimate(d.draft, aorms::RateBookRates{});
  d.grandTotalPaise = d.costed["grandTotalPaise"].get<int64_t>();
  return d;
}

json storedToJson(const aorms::StoredEstimate& e, const json& costed) {
  json o;
  o["id"] = e.id;
  o["name"] = e.name;
  if (e.projectName) o["projectName"] = *e.projectName;
  o["model"] = e.model;
  if (e.checksum) o["checksum"] = *e.checksum;
  o["grandTotalPaise"] = e.grandTotalPaise;
  o["createdAt"] = e.createdAt;
  o["updatedAt"] = e.updatedAt;
  o["costed"] = costed;
  return o;
}

json memberToJson(const aorms::BbsMember& m) {
  json o;
  o["element"] = m.element;
  if (!m.ref.empty()) o["ref"] = m.ref;
  json bars = json::array();
  for (const auto& b : m.bars)
    bars.push_back({{"mark", b.mark}, {"role", b.role}, {"diaMm", aorms::jnum(b.diaMm)},
                    {"nos", b.nos}, {"cutLengthMm", b.cutLengthMm},
                    {"unitWtKgM", aorms::jnum(b.unitWtKgM)}, {"weightKg", aorms::jnum(b.weightKg)},
                    {"shape", b.shape}});
  o["bars"] = std::move(bars);
  o["totalWeightKg"] = aorms::jnum(m.totalWeightKg);
  json byDia = json::array();
  for (const auto& d : m.byDiameter)
    byDia.push_back({{"diaMm", aorms::jnum(d.diaMm)}, {"weightKg", aorms::jnum(d.weightKg)}});
  o["byDiameter"] = std::move(byDia);
  return o;
}

// Parse a request body, returning false (and an {error} response) on bad JSON.
bool parse(const char* s, json& out, char*& errOut) {
  out = json::parse(s ? s : "", nullptr, false);
  if (out.is_discarded()) {
    errOut = err("invalid JSON");
    return false;
  }
  return true;
}

} // namespace

extern "C" {

void* est_open(const char* db_path) {
  try {
    return new Handle(db_path ? db_path : "aorms-estimate.db");
  } catch (...) {
    return nullptr;
  }
}

void est_close(void* handle) { delete static_cast<Handle*>(handle); }

char* est_list(void* handle) {
  auto* h = static_cast<Handle*>(handle);
  if (!h) return err("null handle");
  try {
    std::lock_guard<std::mutex> lk(h->mutex);
    return ok(json{{"estimates", h->db.listSummaries()}});
  } catch (const std::exception& e) {
    return err(e.what());
  }
}

char* est_create(void* handle, const char* model_json) {
  auto* h = static_cast<Handle*>(handle);
  if (!h) return err("null handle");
  try {
    json body; char* e = nullptr;
    if (!parse(model_json, body, e)) return e;
    json model = modelFrom(body);

    aorms::StoredEstimate rec;
    rec.id = aorms::newId();
    rec.createdAt = aorms::nowIso8601Utc();
    rec.updatedAt = rec.createdAt;
    Derived d = derive(model, rec.createdAt);
    rec.name = d.draft.estimateName;
    rec.projectName = d.draft.projectName;
    rec.model = model;
    rec.checksum = d.checksum;
    rec.grandTotalPaise = d.grandTotalPaise;

    std::lock_guard<std::mutex> lk(h->mutex);
    h->db.insert(rec);
    return ok(storedToJson(rec, d.costed));
  } catch (const std::exception& ex) {
    return err(ex.what());
  }
}

char* est_get(void* handle, const char* id) {
  auto* h = static_cast<Handle*>(handle);
  if (!h) return err("null handle");
  try {
    std::optional<aorms::StoredEstimate> rec;
    {
      std::lock_guard<std::mutex> lk(h->mutex);
      rec = h->db.get(id ? id : "");
    }
    if (!rec) return err("estimate not found");
    Derived d = derive(rec->model, rec->createdAt);
    return ok(storedToJson(*rec, d.costed));
  } catch (const std::exception& ex) {
    return err(ex.what());
  }
}

char* est_update(void* handle, const char* id, const char* model_json) {
  auto* h = static_cast<Handle*>(handle);
  if (!h) return err("null handle");
  try {
    json body; char* e = nullptr;
    if (!parse(model_json, body, e)) return e;
    json model = modelFrom(body);

    std::lock_guard<std::mutex> lk(h->mutex);
    auto existing = h->db.get(id ? id : "");
    if (!existing) return err("estimate not found");
    aorms::StoredEstimate rec = *existing;
    rec.updatedAt = aorms::nowIso8601Utc();
    Derived d = derive(model, rec.createdAt); // re-seal against original createdAt
    rec.name = d.draft.estimateName;
    rec.projectName = d.draft.projectName;
    rec.model = model;
    rec.checksum = d.checksum;
    rec.grandTotalPaise = d.grandTotalPaise;
    h->db.replace(rec);
    return ok(storedToJson(rec, d.costed));
  } catch (const std::exception& ex) {
    return err(ex.what());
  }
}

char* est_delete(void* handle, const char* id) {
  auto* h = static_cast<Handle*>(handle);
  if (!h) return err("null handle");
  try {
    std::lock_guard<std::mutex> lk(h->mutex);
    if (!h->db.remove(id ? id : "")) return err("estimate not found");
    return ok(json{{"deleted", true}});
  } catch (const std::exception& ex) {
    return err(ex.what());
  }
}

char* est_file(void* handle, const char* id) {
  auto* h = static_cast<Handle*>(handle);
  if (!h) return err("null handle");
  try {
    std::optional<aorms::StoredEstimate> rec;
    {
      std::lock_guard<std::mutex> lk(h->mutex);
      rec = h->db.get(id ? id : "");
    }
    if (!rec) return err("estimate not found");
    aorms::EstimateModel m = aorms::parseModel(rec->model);
    return ok(aorms::sealedFile(aorms::modelToDraft(m, rec->createdAt)));
  } catch (const std::exception& ex) {
    return err(ex.what());
  }
}

char* est_recost(const char* body_json) {
  try {
    json body; char* e = nullptr;
    if (!parse(body_json, body, e)) return e;
    aorms::EstimateModel m = aorms::parseModel(modelFrom(body));
    aorms::EstimateDraft draft = aorms::modelToDraft(m, aorms::nowIso8601Utc());
    aorms::RateBookRates rb = body.contains("rateBook") ? aorms::parseRateBook(body["rateBook"])
                                                        : aorms::RateBookRates{};
    std::vector<std::pair<std::string, int64_t>> projectRates;
    if (body.contains("projectItemRatePaise") && body["projectItemRatePaise"].is_object())
      for (auto& [k, v] : body["projectItemRatePaise"].items())
        if (v.is_number())
          projectRates.emplace_back(k, static_cast<int64_t>(aorms::jsRound(v.get<double>())));
    return ok(aorms::recostEstimate(draft, rb, projectRates));
  } catch (const std::exception& ex) {
    return err(ex.what());
  }
}

char* est_bbs(const char* body_json) {
  try {
    json body; char* e = nullptr;
    if (!parse(body_json, body, e)) return e;
    json inputs = json::array();
    if (body.is_object() && body.contains("members") && body["members"].is_array())
      inputs = body["members"];
    else
      inputs.push_back(body);

    std::vector<aorms::BbsMember> members;
    json memberJson = json::array();
    for (const auto& in : inputs) {
      aorms::BbsMember mem = aorms::computeMemberBBS(in);
      memberJson.push_back(memberToJson(mem));
      members.push_back(std::move(mem));
    }
    json schedule = json::array();
    for (const auto& d : aorms::scheduleByDiameter(members))
      schedule.push_back({{"diaMm", aorms::jnum(d.diaMm)}, {"weightKg", aorms::jnum(d.weightKg)}});
    return ok(json{{"members", memberJson}, {"schedule", schedule}});
  } catch (const std::exception& ex) {
    return err(ex.what());
  }
}

void est_free(char* s) { std::free(s); }

} // extern "C"
