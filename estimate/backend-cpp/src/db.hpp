// SQLite persistence for saved estimates. One table, `estimates`, holding the
// working model as JSON plus the derived summary (checksum + grand total) so the
// list view is cheap. The engine (estimate.hpp) does all the maths; the DB only
// stores and returns.
#pragma once
#include <optional>
#include <string>
#include "../third_party/json.hpp"

struct sqlite3;

namespace aorms {

using json = nlohmann::json;

// A saved estimate as stored/returned by the store.
struct StoredEstimate {
  std::string id;
  std::string name;
  std::optional<std::string> projectName;
  json model;              // the working EstimateModel
  std::optional<std::string> checksum;
  int64_t grandTotalPaise = 0;
  std::string createdAt;   // ISO-8601 UTC
  std::string updatedAt;
};

class Db {
public:
  explicit Db(const std::string& path); // opens/creates + migrates
  ~Db();
  Db(const Db&) = delete;
  Db& operator=(const Db&) = delete;

  // Store a brand-new row (caller owns id/timestamps/checksum).
  void insert(const StoredEstimate& e);

  // Overwrite an existing row by id; returns false if the id was not found.
  bool replace(const StoredEstimate& e);

  std::optional<StoredEstimate> get(const std::string& id);
  bool remove(const std::string& id);

  // Lightweight list (no model body) newest-first, as a JSON array.
  json listSummaries();

private:
  void exec(const char* sql);
  sqlite3* db_ = nullptr;
};

// Helpers reused by the server.
std::string nowIso8601Utc();
std::string newId();

} // namespace aorms
