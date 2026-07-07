// AORMS Estimate — standalone C++ backend.
//
// A small localhost HTTP/JSON service that PERSISTS estimates to SQLite and owns
// the full estimating engine (measure → re-cost → seal). It mirrors the pure
// TypeScript engine in @esti/contracts so a `.aormsest` sealed here is
// byte-identical to one sealed by the desktop SPA.
//
// Config via env:
//   ESTIMATE_DB    SQLite file path         (default ./aorms-estimate.db)
//   ESTIMATE_HOST  bind address             (default 127.0.0.1)
//   ESTIMATE_PORT  listen port              (default 8787)
#include <cstdlib>
#include <iostream>
#include <memory>
#include <mutex>
#include <string>

#include "../third_party/httplib.h"
#include "../third_party/json.hpp"
#include "bbs_engine.hpp"
#include "db.hpp"
#include "estimate.hpp"
#include "numeric.hpp"

using aorms::json;

namespace {

std::string env(const char* key, const std::string& fallback) {
  const char* v = std::getenv(key);
  return v && *v ? std::string(v) : fallback;
}

// Extract the working model from a request body: either the model directly, or
// wrapped as { "model": {...} }.
json modelFrom(const json& body) {
  if (body.is_object() && body.contains("model") && body["model"].is_object()) return body["model"];
  return body;
}

// Everything the engine derives from a saved model.
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

json memberToJson(const aorms::BbsMember& m) {
  json o;
  o["element"] = m.element;
  if (!m.ref.empty()) o["ref"] = m.ref;
  json bars = json::array();
  for (const auto& b : m.bars) {
    json bo;
    bo["mark"] = b.mark;
    bo["role"] = b.role;
    bo["diaMm"] = aorms::jnum(b.diaMm);
    bo["nos"] = b.nos;
    bo["cutLengthMm"] = b.cutLengthMm;
    bo["unitWtKgM"] = aorms::jnum(b.unitWtKgM);
    bo["weightKg"] = aorms::jnum(b.weightKg);
    bo["shape"] = b.shape;
    bars.push_back(std::move(bo));
  }
  o["bars"] = std::move(bars);
  o["totalWeightKg"] = aorms::jnum(m.totalWeightKg);
  json byDia = json::array();
  for (const auto& d : m.byDiameter) {
    json dd;
    dd["diaMm"] = aorms::jnum(d.diaMm);
    dd["weightKg"] = aorms::jnum(d.weightKg);
    byDia.push_back(std::move(dd));
  }
  o["byDiameter"] = std::move(byDia);
  return o;
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

void sendJson(httplib::Response& res, int status, const json& body) {
  res.status = status;
  res.set_content(body.dump(), "application/json");
}

void sendError(httplib::Response& res, int status, const std::string& message) {
  sendJson(res, status, json{{"error", message}});
}

} // namespace

int main() {
  const std::string dbPath = env("ESTIMATE_DB", "aorms-estimate.db");
  const std::string host = env("ESTIMATE_HOST", "127.0.0.1");
  const int port = std::stoi(env("ESTIMATE_PORT", "8787"));

  std::unique_ptr<aorms::Db> db;
  try {
    db = std::make_unique<aorms::Db>(dbPath);
  } catch (const std::exception& e) {
    std::cerr << "fatal: " << e.what() << "\n";
    return 1;
  }
  std::mutex dbMutex; // serialise writes; SQLite handle is single-threaded here

  httplib::Server srv;

  // Permissive CORS so the SPA (Vite dev server / Tauri webview) can call in.
  srv.set_default_headers({{"Access-Control-Allow-Origin", "*"},
                           {"Access-Control-Allow-Headers", "Content-Type"},
                           {"Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"}});
  srv.Options(R"(/.*)", [](const httplib::Request&, httplib::Response& res) { res.status = 204; });

  srv.set_exception_handler([](const httplib::Request&, httplib::Response& res, std::exception_ptr ep) {
    std::string msg = "internal error";
    try {
      if (ep) std::rethrow_exception(ep);
    } catch (const std::exception& e) {
      msg = e.what();
    }
    sendError(res, 500, msg);
  });

  // ── Health ──────────────────────────────────────────────────────────────
  srv.Get("/healthz", [](const httplib::Request&, httplib::Response& res) {
    sendJson(res, 200, json{{"status", "ok"}, {"service", "aorms-estimate-cpp"}});
  });

  // ── List ────────────────────────────────────────────────────────────────
  srv.Get("/api/estimates", [&](const httplib::Request&, httplib::Response& res) {
    std::lock_guard<std::mutex> lk(dbMutex);
    sendJson(res, 200, json{{"estimates", db->listSummaries()}});
  });

  // ── Create ──────────────────────────────────────────────────────────────
  srv.Post("/api/estimates", [&](const httplib::Request& req, httplib::Response& res) {
    json body = json::parse(req.body, nullptr, false);
    if (body.is_discarded()) return sendError(res, 400, "invalid JSON body");
    json model = modelFrom(body);

    aorms::StoredEstimate e;
    e.id = aorms::newId();
    e.createdAt = aorms::nowIso8601Utc();
    e.updatedAt = e.createdAt;
    Derived d = derive(model, e.createdAt);
    e.name = d.draft.estimateName;
    e.projectName = d.draft.projectName;
    e.model = model;
    e.checksum = d.checksum;
    e.grandTotalPaise = d.grandTotalPaise;

    {
      std::lock_guard<std::mutex> lk(dbMutex);
      db->insert(e);
    }
    sendJson(res, 201, storedToJson(e, d.costed));
  });

  // ── Read ────────────────────────────────────────────────────────────────
  srv.Get(R"(/api/estimates/([A-Za-z0-9_]+))", [&](const httplib::Request& req, httplib::Response& res) {
    std::optional<aorms::StoredEstimate> e;
    {
      std::lock_guard<std::mutex> lk(dbMutex);
      e = db->get(req.matches[1]);
    }
    if (!e) return sendError(res, 404, "estimate not found");
    Derived d = derive(e->model, e->createdAt);
    sendJson(res, 200, storedToJson(*e, d.costed));
  });

  // ── Update ──────────────────────────────────────────────────────────────
  srv.Put(R"(/api/estimates/([A-Za-z0-9_]+))", [&](const httplib::Request& req, httplib::Response& res) {
    json body = json::parse(req.body, nullptr, false);
    if (body.is_discarded()) return sendError(res, 400, "invalid JSON body");
    json model = modelFrom(body);

    std::lock_guard<std::mutex> lk(dbMutex);
    auto existing = db->get(req.matches[1]);
    if (!existing) return sendError(res, 404, "estimate not found");

    aorms::StoredEstimate e = *existing;
    e.updatedAt = aorms::nowIso8601Utc();
    Derived d = derive(model, e.createdAt); // re-seal against the original createdAt
    e.name = d.draft.estimateName;
    e.projectName = d.draft.projectName;
    e.model = model;
    e.checksum = d.checksum;
    e.grandTotalPaise = d.grandTotalPaise;
    db->replace(e);
    sendJson(res, 200, storedToJson(e, d.costed));
  });

  // ── Delete ──────────────────────────────────────────────────────────────
  srv.Delete(R"(/api/estimates/([A-Za-z0-9_]+))", [&](const httplib::Request& req, httplib::Response& res) {
    std::lock_guard<std::mutex> lk(dbMutex);
    if (!db->remove(req.matches[1])) return sendError(res, 404, "estimate not found");
    res.status = 204;
  });

  // ── Sealed .aormsest export ─────────────────────────────────────────────
  srv.Get(R"(/api/estimates/([A-Za-z0-9_]+)/file)", [&](const httplib::Request& req, httplib::Response& res) {
    std::optional<aorms::StoredEstimate> e;
    {
      std::lock_guard<std::mutex> lk(dbMutex);
      e = db->get(req.matches[1]);
    }
    if (!e) return sendError(res, 404, "estimate not found");
    aorms::EstimateModel m = aorms::parseModel(e->model);
    json file = aorms::sealedFile(aorms::modelToDraft(m, e->createdAt));
    res.status = 200;
    res.set_header("Content-Disposition", "attachment; filename=\"" + e->id + ".aormsest\"");
    res.set_content(file.dump(2), "application/json");
  });

  // ── Stateless re-cost (model + optional rate book) ──────────────────────
  srv.Post("/api/recost", [&](const httplib::Request& req, httplib::Response& res) {
    json body = json::parse(req.body, nullptr, false);
    if (body.is_discarded()) return sendError(res, 400, "invalid JSON body");
    aorms::EstimateModel m = aorms::parseModel(modelFrom(body));
    aorms::EstimateDraft draft = aorms::modelToDraft(m, aorms::nowIso8601Utc());
    aorms::RateBookRates rb = body.contains("rateBook") ? aorms::parseRateBook(body["rateBook"])
                                                        : aorms::RateBookRates{};
    std::vector<std::pair<std::string, int64_t>> projectRates;
    if (body.contains("projectItemRatePaise") && body["projectItemRatePaise"].is_object())
      for (auto& [k, v] : body["projectItemRatePaise"].items())
        if (v.is_number()) projectRates.emplace_back(k, static_cast<int64_t>(aorms::jsRound(v.get<double>())));
    sendJson(res, 200, aorms::recostEstimate(draft, rb, projectRates));
  });

  // ── BBS: geometry → schedule (single member or { members: [...] }) ──────
  srv.Post("/api/bbs", [&](const httplib::Request& req, httplib::Response& res) {
    json body = json::parse(req.body, nullptr, false);
    if (body.is_discarded()) return sendError(res, 400, "invalid JSON body");
    json inputs = json::array();
    if (body.is_object() && body.contains("members") && body["members"].is_array()) inputs = body["members"];
    else inputs.push_back(body);

    std::vector<aorms::BbsMember> members;
    json memberJson = json::array();
    for (const auto& in : inputs) {
      aorms::BbsMember mem = aorms::computeMemberBBS(in);
      memberJson.push_back(memberToJson(mem));
      members.push_back(std::move(mem));
    }
    json schedule = json::array();
    for (const auto& d : aorms::scheduleByDiameter(members)) {
      json dd;
      dd["diaMm"] = aorms::jnum(d.diaMm);
      dd["weightKg"] = aorms::jnum(d.weightKg);
      schedule.push_back(std::move(dd));
    }
    sendJson(res, 200, json{{"members", memberJson}, {"schedule", schedule}});
  });

  std::cout << "AORMS Estimate C++ backend on http://" << host << ":" << port << "  (db: " << dbPath
            << ")\n";
  if (!srv.listen(host.c_str(), port)) {
    std::cerr << "fatal: could not bind " << host << ":" << port << "\n";
    return 1;
  }
  return 0;
}
