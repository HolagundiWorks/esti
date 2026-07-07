#include "db.hpp"

#include <sqlite3.h>

#include <array>
#include <chrono>
#include <ctime>
#include <cstdio>
#include <random>
#include <stdexcept>

namespace aorms {
namespace {

// Bind an optional text value (NULL when absent).
void bindOptText(sqlite3_stmt* st, int i, const std::optional<std::string>& v) {
  if (v) sqlite3_bind_text(st, i, v->c_str(), -1, SQLITE_TRANSIENT);
  else sqlite3_bind_null(st, i);
}

std::optional<std::string> colOptText(sqlite3_stmt* st, int i) {
  if (sqlite3_column_type(st, i) == SQLITE_NULL) return std::nullopt;
  const unsigned char* t = sqlite3_column_text(st, i);
  return std::string(reinterpret_cast<const char*>(t));
}

std::string colText(sqlite3_stmt* st, int i) {
  const unsigned char* t = sqlite3_column_text(st, i);
  return t ? std::string(reinterpret_cast<const char*>(t)) : std::string();
}

StoredEstimate rowFrom(sqlite3_stmt* st) {
  StoredEstimate e;
  e.id = colText(st, 0);
  e.name = colText(st, 1);
  e.projectName = colOptText(st, 2);
  e.model = json::parse(colText(st, 3), nullptr, /*allow_exceptions=*/false);
  if (e.model.is_discarded()) e.model = json::object();
  e.checksum = colOptText(st, 4);
  e.grandTotalPaise = sqlite3_column_int64(st, 5);
  e.createdAt = colText(st, 6);
  e.updatedAt = colText(st, 7);
  return e;
}

const char* kSelectCols =
    "id, name, project_name, model_json, checksum, grand_total_paise, created_at, updated_at";

} // namespace

std::string nowIso8601Utc() {
  auto now = std::chrono::system_clock::now();
  auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()) % 1000;
  std::time_t t = std::chrono::system_clock::to_time_t(now);
  std::tm tm{};
#if defined(_WIN32)
  gmtime_s(&tm, &t);
#else
  gmtime_r(&t, &tm);
#endif
  char buf[80]; // wide enough for the compiler to prove no truncation is possible
  std::snprintf(buf, sizeof(buf), "%04d-%02d-%02dT%02d:%02d:%02d.%03dZ", tm.tm_year + 1900,
                tm.tm_mon + 1, tm.tm_mday, tm.tm_hour, tm.tm_min, tm.tm_sec,
                static_cast<int>(ms.count()));
  return buf;
}

std::string newId() {
  std::random_device rd;
  std::uniform_int_distribution<int> dist(0, 15);
  static const char* hex = "0123456789abcdef";
  std::string id = "est_";
  for (int i = 0; i < 24; ++i) id.push_back(hex[dist(rd)]);
  return id;
}

Db::Db(const std::string& path) {
  if (sqlite3_open(path.c_str(), &db_) != SQLITE_OK) {
    std::string msg = db_ ? sqlite3_errmsg(db_) : "unknown";
    if (db_) sqlite3_close(db_);
    throw std::runtime_error("cannot open SQLite DB '" + path + "': " + msg);
  }
  exec("PRAGMA journal_mode=WAL;");
  exec("PRAGMA foreign_keys=ON;");
  exec(
      "CREATE TABLE IF NOT EXISTS estimates ("
      "  id TEXT PRIMARY KEY,"
      "  name TEXT NOT NULL,"
      "  project_name TEXT,"
      "  model_json TEXT NOT NULL,"
      "  checksum TEXT,"
      "  grand_total_paise INTEGER NOT NULL DEFAULT 0,"
      "  created_at TEXT NOT NULL,"
      "  updated_at TEXT NOT NULL"
      ");");
  exec("CREATE INDEX IF NOT EXISTS idx_estimates_updated ON estimates(updated_at DESC);");
}

Db::~Db() {
  if (db_) sqlite3_close(db_);
}

void Db::exec(const char* sql) {
  char* err = nullptr;
  if (sqlite3_exec(db_, sql, nullptr, nullptr, &err) != SQLITE_OK) {
    std::string msg = err ? err : "unknown";
    sqlite3_free(err);
    throw std::runtime_error(std::string("SQLite exec failed: ") + msg);
  }
}

void Db::insert(const StoredEstimate& e) {
  const char* sql =
      "INSERT INTO estimates (id, name, project_name, model_json, checksum, grand_total_paise, "
      "created_at, updated_at) VALUES (?,?,?,?,?,?,?,?);";
  sqlite3_stmt* st = nullptr;
  if (sqlite3_prepare_v2(db_, sql, -1, &st, nullptr) != SQLITE_OK)
    throw std::runtime_error(std::string("prepare insert: ") + sqlite3_errmsg(db_));
  std::string body = e.model.dump();
  sqlite3_bind_text(st, 1, e.id.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_text(st, 2, e.name.c_str(), -1, SQLITE_TRANSIENT);
  bindOptText(st, 3, e.projectName);
  sqlite3_bind_text(st, 4, body.c_str(), -1, SQLITE_TRANSIENT);
  bindOptText(st, 5, e.checksum);
  sqlite3_bind_int64(st, 6, e.grandTotalPaise);
  sqlite3_bind_text(st, 7, e.createdAt.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_text(st, 8, e.updatedAt.c_str(), -1, SQLITE_TRANSIENT);
  int rc = sqlite3_step(st);
  sqlite3_finalize(st);
  if (rc != SQLITE_DONE) throw std::runtime_error(std::string("insert: ") + sqlite3_errmsg(db_));
}

bool Db::replace(const StoredEstimate& e) {
  const char* sql =
      "UPDATE estimates SET name=?, project_name=?, model_json=?, checksum=?, "
      "grand_total_paise=?, updated_at=? WHERE id=?;";
  sqlite3_stmt* st = nullptr;
  if (sqlite3_prepare_v2(db_, sql, -1, &st, nullptr) != SQLITE_OK)
    throw std::runtime_error(std::string("prepare update: ") + sqlite3_errmsg(db_));
  std::string body = e.model.dump();
  sqlite3_bind_text(st, 1, e.name.c_str(), -1, SQLITE_TRANSIENT);
  bindOptText(st, 2, e.projectName);
  sqlite3_bind_text(st, 3, body.c_str(), -1, SQLITE_TRANSIENT);
  bindOptText(st, 4, e.checksum);
  sqlite3_bind_int64(st, 5, e.grandTotalPaise);
  sqlite3_bind_text(st, 6, e.updatedAt.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_text(st, 7, e.id.c_str(), -1, SQLITE_TRANSIENT);
  int rc = sqlite3_step(st);
  sqlite3_finalize(st);
  if (rc != SQLITE_DONE) throw std::runtime_error(std::string("update: ") + sqlite3_errmsg(db_));
  return sqlite3_changes(db_) > 0;
}

std::optional<StoredEstimate> Db::get(const std::string& id) {
  std::string sql = std::string("SELECT ") + kSelectCols + " FROM estimates WHERE id=?;";
  sqlite3_stmt* st = nullptr;
  if (sqlite3_prepare_v2(db_, sql.c_str(), -1, &st, nullptr) != SQLITE_OK)
    throw std::runtime_error(std::string("prepare get: ") + sqlite3_errmsg(db_));
  sqlite3_bind_text(st, 1, id.c_str(), -1, SQLITE_TRANSIENT);
  std::optional<StoredEstimate> out;
  if (sqlite3_step(st) == SQLITE_ROW) out = rowFrom(st);
  sqlite3_finalize(st);
  return out;
}

bool Db::remove(const std::string& id) {
  sqlite3_stmt* st = nullptr;
  if (sqlite3_prepare_v2(db_, "DELETE FROM estimates WHERE id=?;", -1, &st, nullptr) != SQLITE_OK)
    throw std::runtime_error(std::string("prepare delete: ") + sqlite3_errmsg(db_));
  sqlite3_bind_text(st, 1, id.c_str(), -1, SQLITE_TRANSIENT);
  int rc = sqlite3_step(st);
  sqlite3_finalize(st);
  if (rc != SQLITE_DONE) throw std::runtime_error(std::string("delete: ") + sqlite3_errmsg(db_));
  return sqlite3_changes(db_) > 0;
}

json Db::listSummaries() {
  const char* sql =
      "SELECT id, name, project_name, checksum, grand_total_paise, created_at, updated_at "
      "FROM estimates ORDER BY updated_at DESC;";
  sqlite3_stmt* st = nullptr;
  if (sqlite3_prepare_v2(db_, sql, -1, &st, nullptr) != SQLITE_OK)
    throw std::runtime_error(std::string("prepare list: ") + sqlite3_errmsg(db_));
  json arr = json::array();
  while (sqlite3_step(st) == SQLITE_ROW) {
    json o;
    o["id"] = colText(st, 0);
    o["name"] = colText(st, 1);
    if (auto p = colOptText(st, 2)) o["projectName"] = *p;
    if (auto c = colOptText(st, 3)) o["checksum"] = *c;
    o["grandTotalPaise"] = sqlite3_column_int64(st, 4);
    o["createdAt"] = colText(st, 5);
    o["updatedAt"] = colText(st, 6);
    arr.push_back(std::move(o));
  }
  sqlite3_finalize(st);
  return arr;
}

} // namespace aorms
