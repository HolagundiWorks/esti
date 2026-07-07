#include "estimate.hpp"

#include <algorithm>
#include <cmath>
#include <sstream>
#include <unordered_map>

#include "bbs_engine.hpp"
#include "numeric.hpp"
#include "sha256.hpp"

namespace aorms {
namespace {

// ── small JSON readers (tolerant of missing/null) ────────────────────────────
std::string str(const json& j, const char* key, const std::string& fallback = "") {
  auto it = j.find(key);
  if (it == j.end() || it->is_null() || !it->is_string()) return fallback;
  return it->get<std::string>();
}
std::optional<std::string> optStr(const json& j, const char* key) {
  auto it = j.find(key);
  if (it == j.end() || it->is_null() || !it->is_string() || it->get<std::string>().empty())
    return std::nullopt;
  return it->get<std::string>();
}
double num(const json& j, const char* key, double fallback = 0) {
  auto it = j.find(key);
  if (it == j.end() || it->is_null() || !it->is_number()) return fallback;
  return it->get<double>();
}
std::optional<double> optNum(const json& j, const char* key) {
  auto it = j.find(key);
  if (it == j.end() || it->is_null() || !it->is_number()) return std::nullopt;
  return it->get<double>();
}
int64_t intPaise(const json& j, const char* key, int64_t fallback = 0) {
  auto it = j.find(key);
  if (it == j.end() || it->is_null() || !it->is_number()) return fallback;
  return static_cast<int64_t>(jsRound(it->get<double>()));
}
std::optional<int64_t> optIntPaise(const json& j, const char* key) {
  auto it = j.find(key);
  if (it == j.end() || it->is_null() || !it->is_number()) return std::nullopt;
  return static_cast<int64_t>(jsRound(it->get<double>()));
}

// JS String(number): integer-valued → no decimal point (matches rate-book keys).
std::string numKey(double v) {
  if (std::floor(v) == v && std::fabs(v) < 9.007199254740992e15)
    return std::to_string(static_cast<int64_t>(v));
  std::ostringstream os;
  os << v;
  return os.str();
}

int64_t lookup(const std::vector<std::pair<std::string, int64_t>>& m, const std::string& key,
               bool& found) {
  for (const auto& kv : m)
    if (kv.first == key) { found = true; return kv.second; }
  found = false;
  return 0;
}

// Add an optional string field only when present (mirrors dropping `undefined`).
void putOpt(json& o, const char* key, const std::optional<std::string>& v) {
  if (v) o[key] = *v;
}

} // namespace

double measureQty(double nos, std::optional<double> l, std::optional<double> b, std::optional<double> h) {
  double product = nos;
  if (l) product *= *l;
  if (b) product *= *b;
  if (h) product *= *h;
  return round3(product);
}

// ── Parsing ──────────────────────────────────────────────────────────────────
EstimateModel parseModel(const json& j) {
  EstimateModel m;
  m.estimateName = str(j, "estimateName");
  m.projectName = optStr(j, "projectName");
  m.rateBookCode = str(j, "rateBookCode", "OWN");
  m.rateBookName = str(j, "rateBookName", "Office rate book");

  if (j.contains("items") && j["items"].is_array()) {
    for (const auto& it : j["items"]) {
      WorkItem w;
      w.code = str(it, "code");
      w.itemCode = optStr(it, "itemCode");
      w.shortName = str(it, "shortName");
      w.specification = optStr(it, "specification");
      w.uom = str(it, "uom");
      w.ratePaise = intPaise(it, "ratePaise");
      w.section = optStr(it, "section");
      w.leadKm = optNum(it, "leadKm");
      w.leadChargePaise = intPaise(it, "leadChargePaise");
      if (it.contains("measurements") && it["measurements"].is_array()) {
        for (const auto& mr : it["measurements"]) {
          MeasureRow r;
          r.desc = optStr(mr, "desc");
          r.nos = num(mr, "nos", 1);
          r.l = optNum(mr, "l");
          r.b = optNum(mr, "b");
          r.h = optNum(mr, "h");
          w.measurements.push_back(std::move(r));
        }
      }
      m.items.push_back(std::move(w));
    }
  }
  if (j.contains("materials") && j["materials"].is_array()) {
    for (const auto& ml : j["materials"]) {
      MaterialLine l;
      l.code = str(ml, "code");
      l.name = str(ml, "name");
      l.unit = str(ml, "unit");
      l.qty = num(ml, "qty");
      l.ratePaise = optIntPaise(ml, "ratePaise");
      m.materials.push_back(std::move(l));
    }
  }
  if (j.contains("bbs") && j["bbs"].is_array())
    for (const auto& b : j["bbs"]) m.bbs.push_back(b);

  if (j.contains("steelRatePaiseByDia") && j["steelRatePaiseByDia"].is_object())
    for (auto& [k, v] : j["steelRatePaiseByDia"].items())
      if (v.is_number())
        m.steelRatePaiseByDia.emplace_back(std::stoi(k), static_cast<int64_t>(jsRound(v.get<double>())));
  return m;
}

RateBookRates parseRateBook(const json& j) {
  RateBookRates rb;
  rb.code = str(j, "code", "SELF");
  rb.name = str(j, "name", "As estimated");
  auto readMap = [](const json& obj, std::vector<std::pair<std::string, int64_t>>& out) {
    if (obj.is_object())
      for (auto& [k, v] : obj.items())
        if (v.is_number()) out.emplace_back(k, static_cast<int64_t>(jsRound(v.get<double>())));
  };
  if (j.contains("itemRatePaise")) readMap(j["itemRatePaise"], rb.itemRatePaise);
  if (j.contains("materialRatePaise")) readMap(j["materialRatePaise"], rb.materialRatePaise);
  if (j.contains("steelRatePaiseByDia")) readMap(j["steelRatePaiseByDia"], rb.steelRatePaiseByDia);
  return rb;
}

// ── Assembly (build.ts modelToDraft) ─────────────────────────────────────────
EstimateDraft modelToDraft(const EstimateModel& model, const std::string& createdAtISO) {
  EstimateDraft d;
  d.estimateName = model.estimateName.empty() ? "Estimate" : model.estimateName;
  d.projectName = model.projectName; // omitted downstream if absent
  d.createdAt = createdAtISO;
  d.rateBookCode = model.rateBookCode.empty() ? "OWN" : model.rateBookCode;
  d.rateBookName = model.rateBookName.empty() ? "Office rate book" : model.rateBookName;

  for (const auto& it : model.items) {
    EstimateItem ei;
    ei.code = it.code;
    ei.itemCode = it.itemCode;
    ei.shortName = it.shortName.empty() ? it.code : it.shortName;
    ei.specification = it.specification;
    ei.uom = it.uom;
    ei.ratePaise = it.ratePaise;
    ei.section = it.section;

    double qty = 0;
    for (const auto& m : it.measurements) {
      double q = measureQty(m.nos, m.l, m.b, m.h);
      FileMeasurement fm;
      fm.desc = m.desc;
      fm.nos = m.nos;
      fm.l = m.l;
      fm.b = m.b;
      fm.h = m.h;
      fm.qty = q;
      ei.measurements.push_back(std::move(fm));
      qty += q;
    }
    qty = round3(qty);
    ei.qty = qty;

    int64_t leadChargePaise = it.leadChargePaise;
    int64_t base = amountPaise(qty, it.ratePaise);
    int64_t lead = amountPaise(qty, leadChargePaise);
    ei.amountPaise = base + lead;
    if (leadChargePaise) {
      FileLead fl;
      fl.km = it.leadKm;
      fl.chargePaise = leadChargePaise;
      ei.lead = fl;
    }
    d.items.push_back(std::move(ei));
  }

  for (const auto& m : model.materials) {
    EstimateMaterial em;
    em.code = m.code;
    em.name = m.name;
    em.unit = m.unit;
    em.qty = m.qty;
    em.ratePaise = m.ratePaise;
    if (m.ratePaise) em.amountPaise = amountPaise(m.qty, *m.ratePaise);
    d.materials.push_back(std::move(em));
  }

  // BBS members → steel lines grouped by diameter (steelFromBBS).
  std::vector<BbsMember> members;
  for (const auto& b : model.bbs) members.push_back(computeMemberBBS(b));
  std::unordered_map<int, int64_t> steelRate;
  for (const auto& kv : model.steelRatePaiseByDia) steelRate[kv.first] = kv.second;
  for (const auto& s : scheduleByDiameter(members)) {
    EstimateSteel es;
    es.diaMm = s.diaMm;
    es.unitWeightKgM = round3((s.diaMm * s.diaMm) / 162.0);
    es.weightKg = round3(s.weightKg);
    auto rit = steelRate.find(static_cast<int>(s.diaMm));
    if (rit != steelRate.end()) {
      es.ratePaise = rit->second;
      es.amountPaise = amountPaise(s.weightKg, rit->second);
    }
    d.steel.push_back(std::move(es));
  }
  return d;
}

// ── Draft → JSON (numbers via jnum; absent optionals dropped) ────────────────
json draftToJson(const EstimateDraft& draft) {
  json meta;
  meta["estimateName"] = draft.estimateName;
  putOpt(meta, "projectName", draft.projectName);
  meta["createdAt"] = draft.createdAt;
  meta["appVersion"] = draft.appVersion;
  meta["currency"] = "INR";

  json items = json::array();
  for (const auto& it : draft.items) {
    json o;
    o["code"] = it.code;
    putOpt(o, "itemCode", it.itemCode);
    o["shortName"] = it.shortName;
    putOpt(o, "specification", it.specification);
    o["attributes"] = json::object();
    o["uom"] = it.uom;
    o["ratePaise"] = it.ratePaise;
    json ms = json::array();
    for (const auto& m : it.measurements) {
      json mo;
      putOpt(mo, "desc", m.desc);
      mo["nos"] = jnum(m.nos);
      mo["l"] = m.l ? jnum(*m.l) : json(nullptr);
      mo["b"] = m.b ? jnum(*m.b) : json(nullptr);
      mo["h"] = m.h ? jnum(*m.h) : json(nullptr);
      mo["qty"] = jnum(m.qty);
      ms.push_back(std::move(mo));
    }
    o["measurements"] = std::move(ms);
    o["qty"] = jnum(it.qty);
    o["amountPaise"] = it.amountPaise;
    if (it.lead) {
      json lo;
      if (it.lead->km) lo["km"] = jnum(*it.lead->km);
      putOpt(lo, "desc", it.lead->desc);
      lo["chargePaise"] = it.lead->chargePaise;
      o["lead"] = std::move(lo);
    }
    putOpt(o, "section", it.section);
    putOpt(o, "derivedFrom", it.derivedFrom);
    items.push_back(std::move(o));
  }

  json materials = json::array();
  for (const auto& m : draft.materials) {
    json o;
    o["code"] = m.code;
    o["name"] = m.name;
    o["unit"] = m.unit;
    o["qty"] = jnum(m.qty);
    if (m.ratePaise) o["ratePaise"] = *m.ratePaise;
    if (m.amountPaise) o["amountPaise"] = *m.amountPaise;
    materials.push_back(std::move(o));
  }

  json steel = json::array();
  for (const auto& s : draft.steel) {
    json o;
    o["diaMm"] = jnum(s.diaMm);
    o["unitWeightKgM"] = jnum(s.unitWeightKgM);
    o["weightKg"] = jnum(s.weightKg);
    if (s.ratePaise) o["ratePaise"] = *s.ratePaise;
    if (s.amountPaise) o["amountPaise"] = *s.amountPaise;
    putOpt(o, "ref", s.ref);
    steel.push_back(std::move(o));
  }

  json out;
  out["formatVersion"] = AORMSEST_FORMAT_VERSION;
  out["meta"] = std::move(meta);
  json rb;
  rb["code"] = draft.rateBookCode;
  rb["name"] = draft.rateBookName;
  out["rateBook"] = std::move(rb);
  out["items"] = std::move(items);
  out["materials"] = std::move(materials);
  out["steel"] = std::move(steel);
  return out;
}

std::string sealString(const EstimateDraft& draft) {
  // nlohmann's default object type is std::map (keys sorted ascending) and dump()
  // emits no whitespace and keeps UTF-8 literal — exactly matching the TS
  // `estimateSealString` (recursive key sort + JSON.stringify, checksum excluded).
  return draftToJson(draft).dump();
}

std::string checksum(const EstimateDraft& draft) { return Sha256::hex(sealString(draft)); }

json sealedFile(const EstimateDraft& draft) {
  json f = draftToJson(draft);
  f["checksum"] = checksum(draft);
  return f;
}

// ── Re-costing ───────────────────────────────────────────────────────────────
json recostAbstract(const std::vector<EstimateItem>& items, const RateBookRates& rb,
                    const std::vector<std::pair<std::string, int64_t>>& projectItemRatePaise) {
  int64_t totalEst = 0, totalCosted = 0, totalLead = 0;
  json rows = json::array();
  for (const auto& it : items) {
    bool hasProject = false, hasBook = false;
    int64_t projectRate = lookup(projectItemRatePaise, it.code, hasProject);
    int64_t bookRate = lookup(rb.itemRatePaise, it.code, hasBook);
    std::string rateSource = hasProject ? "project" : hasBook ? "rateBook" : "estimate";
    int64_t ratePaise = hasProject ? projectRate : hasBook ? bookRate : it.ratePaise;

    int64_t leadChargePaise = it.lead ? it.lead->chargePaise : 0;
    int64_t leadAmountPaise = amountPaise(it.qty, leadChargePaise);
    int64_t amountEst = amountPaise(it.qty, it.ratePaise) + leadAmountPaise;
    int64_t amount = amountPaise(it.qty, ratePaise) + leadAmountPaise;
    totalEst += amountEst;
    totalCosted += amount;
    totalLead += leadAmountPaise;

    json r;
    r["code"] = it.code;
    putOpt(r, "itemCode", it.itemCode);
    r["shortName"] = it.shortName;
    putOpt(r, "specification", it.specification);
    r["uom"] = it.uom;
    r["qty"] = jnum(it.qty);
    r["ratePaiseEstimated"] = it.ratePaise;
    r["amountPaiseEstimated"] = amountEst;
    r["ratePaise"] = ratePaise;
    r["leadChargePaise"] = leadChargePaise;
    r["leadAmountPaise"] = leadAmountPaise;
    r["amountPaise"] = amount;
    r["variancePaise"] = amount - amountEst;
    r["rateSource"] = rateSource;
    if (it.section) r["section"] = *it.section;
    else if (it.itemCode) r["section"] = *it.itemCode;
    rows.push_back(std::move(r));
  }
  json out;
  out["rows"] = std::move(rows);
  out["totalEstimatedPaise"] = totalEst;
  out["totalCostedPaise"] = totalCosted;
  out["totalVariancePaise"] = totalCosted - totalEst;
  out["totalLeadPaise"] = totalLead;
  return out;
}

json recostBOQ(const std::vector<EstimateItem>& items, const RateBookRates& rb,
               const std::vector<std::pair<std::string, int64_t>>& projectItemRatePaise) {
  json abstract = recostAbstract(items, rb, projectItemRatePaise);
  std::vector<std::string> order;                       // first-seen section order
  std::unordered_map<std::string, size_t> idx;
  json sections = json::array();
  for (const auto& row : abstract["rows"]) {
    std::string key = row.contains("section") && row["section"].is_string() && !row["section"].get<std::string>().empty()
                          ? row["section"].get<std::string>()
                          : "General";
    if (!idx.count(key)) {
      idx[key] = sections.size();
      order.push_back(key);
      json s;
      s["section"] = key;
      s["rows"] = json::array();
      s["subtotalPaise"] = 0;
      sections.push_back(std::move(s));
    }
    json& s = sections[idx[key]];
    s["rows"].push_back(row);
    s["subtotalPaise"] = s["subtotalPaise"].get<int64_t>() + row["amountPaise"].get<int64_t>();
  }
  json out;
  out["sections"] = std::move(sections);
  out["totalPaise"] = abstract["totalCostedPaise"];
  return out;
}

json recostMaterials(const std::vector<EstimateMaterial>& materials, const RateBookRates& rb) {
  struct Agg { std::string name, unit; double qty; int64_t estRate; };
  std::vector<std::string> order;
  std::unordered_map<std::string, Agg> agg;
  for (const auto& m : materials) {
    auto it = agg.find(m.code);
    if (it != agg.end()) it->second.qty = round3(it->second.qty + m.qty);
    else {
      order.push_back(m.code);
      agg[m.code] = Agg{m.name, m.unit, m.qty, m.ratePaise.value_or(0)};
    }
  }
  int64_t total = 0;
  json rows = json::array();
  for (const auto& code : order) {
    const Agg& v = agg[code];
    bool hasBook = false;
    int64_t bookRate = lookup(rb.materialRatePaise, code, hasBook);
    std::string rateSource = hasBook ? "rateBook" : "estimate";
    int64_t ratePaise = hasBook ? bookRate : v.estRate;
    int64_t amount = amountPaise(v.qty, ratePaise);
    total += amount;
    json r;
    r["code"] = code;
    r["name"] = v.name;
    r["unit"] = v.unit;
    r["qty"] = jnum(v.qty);
    r["ratePaise"] = ratePaise;
    r["amountPaise"] = amount;
    r["rateSource"] = rateSource;
    rows.push_back(std::move(r));
  }
  json out;
  out["rows"] = std::move(rows);
  out["totalPaise"] = total;
  return out;
}

json recostSteel(const std::vector<EstimateSteel>& steel, const RateBookRates& rb) {
  struct Agg { double unitWeightKgM; double weightKg; int64_t estRate; };
  std::map<double, Agg> agg; // ascending by diameter
  for (const auto& s : steel) {
    auto it = agg.find(s.diaMm);
    if (it != agg.end()) it->second.weightKg = round3(it->second.weightKg + s.weightKg);
    else agg[s.diaMm] = Agg{s.unitWeightKgM, s.weightKg, s.ratePaise.value_or(0)};
  }
  double totalWeightKg = 0;
  int64_t total = 0;
  json rows = json::array();
  for (const auto& [diaMm, v] : agg) {
    bool hasBook = false;
    int64_t bookRate = lookup(rb.steelRatePaiseByDia, numKey(diaMm), hasBook);
    std::string rateSource = hasBook ? "rateBook" : "estimate";
    int64_t ratePaise = hasBook ? bookRate : v.estRate;
    int64_t amount = amountPaise(v.weightKg, ratePaise);
    totalWeightKg = round3(totalWeightKg + v.weightKg);
    total += amount;
    json r;
    r["diaMm"] = jnum(diaMm);
    r["unitWeightKgM"] = jnum(v.unitWeightKgM);
    r["weightKg"] = jnum(v.weightKg);
    r["ratePaise"] = ratePaise;
    r["amountPaise"] = amount;
    r["rateSource"] = rateSource;
    rows.push_back(std::move(r));
  }
  json out;
  out["rows"] = std::move(rows);
  out["totalWeightKg"] = jnum(totalWeightKg);
  out["totalPaise"] = total;
  return out;
}

json recostEstimate(const EstimateDraft& draft, const RateBookRates& rb,
                    const std::vector<std::pair<std::string, int64_t>>& projectItemRatePaise) {
  json abstract = recostAbstract(draft.items, rb, projectItemRatePaise);
  json out;
  out["abstract"] = abstract;
  out["boq"] = recostBOQ(draft.items, rb, projectItemRatePaise);
  out["materials"] = recostMaterials(draft.materials, rb);
  out["steel"] = recostSteel(draft.steel, rb);
  out["grandTotalPaise"] = abstract["totalCostedPaise"];
  return out;
}

} // namespace aorms
