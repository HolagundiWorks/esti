// AORMS Estimate — native C++ desktop app.
//
// A pure-C++ desktop application (no Rust, no server): it opens the OS webview
// (WebView2 on Windows, WebKitGTK on Linux, WKWebView on macOS) to render the
// browser-based UI, and binds the estimating engine + SQLite store straight into
// `window.*` so the SPA calls native code in-process. Nothing listens on a port;
// nothing leaves the machine.
//
// The UI bundle (a single self-contained index.html produced by the SPA build)
// is loaded from, in order: $ESTI_UI_HTML, index.html next to the executable, or
// ./index.html. The SQLite file is $ESTI_DB (default aorms-estimate.db).
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <string>
#include <system_error>

#include "../src/capi.hpp"
#include "../third_party/json.hpp"
#include "../third_party/webview.h"

using nlohmann::json;

namespace {

std::string envOr(const char* key, const std::string& fallback) {
  const char* v = std::getenv(key);
  return v && *v ? std::string(v) : fallback;
}

std::string readFile(const std::string& path) {
  std::ifstream f(path, std::ios::binary);
  if (!f) return {};
  std::ostringstream ss;
  ss << f.rdbuf();
  return ss.str();
}

std::string dirOf(const std::string& path) {
  auto slash = path.find_last_of("/\\");
  return slash == std::string::npos ? std::string(".") : path.substr(0, slash);
}

// SQLite lives in a per-user data dir (an installed app can't write next to its
// exe under Program Files). Override with $ESTI_DB.
std::string defaultDbPath() {
  std::string env = envOr("ESTI_DB", "");
  if (!env.empty()) return env;
  namespace fs = std::filesystem;
  fs::path base;
#ifdef _WIN32
  const char* appdata = std::getenv("APPDATA");
  base = (appdata && *appdata) ? fs::path(appdata) : fs::current_path();
#else
  const char* home = std::getenv("HOME");
  base = (home && *home) ? fs::path(home) / ".local" / "share" : fs::current_path();
#endif
  fs::path dir = base / "AORMS Estimate";
  std::error_code ec;
  fs::create_directories(dir, ec);
  return (dir / "aorms-estimate.db").string();
}

std::string loadUi(const std::string& exePath) {
  std::string envPath = envOr("ESTI_UI_HTML", "");
  const std::string candidates[] = {envPath, dirOf(exePath) + "/index.html", "index.html"};
  for (const auto& c : candidates) {
    if (c.empty()) continue;
    std::string html = readFile(c);
    if (!html.empty()) return html;
  }
  return "<!doctype html><meta charset=\"utf-8\"><body style=\"font-family:sans-serif;padding:2rem\">"
         "<h1>AORMS Estimate</h1><p>UI bundle not found. Build the SPA "
         "(<code>pnpm --filter @esti/estimate build</code>) and place <code>index.html</code> "
         "next to the executable, or set <code>ESTI_UI_HTML</code>.</p>";
}

// A webview binding receives its JS arguments as a JSON array string. Pull the
// n-th argument out, either as a raw string or re-serialised JSON.
json argAt(const std::string& req, size_t i) {
  json a = json::parse(req, nullptr, false);
  if (a.is_array() && i < a.size()) return a[i];
  return json(nullptr);
}
std::string argStr(const std::string& req, size_t i) {
  json v = argAt(req, i);
  return v.is_string() ? v.get<std::string>() : std::string();
}
std::string argJson(const std::string& req, size_t i) { return argAt(req, i).dump(); }

// Adopt a capi char* result into a std::string and free it. capi never returns
// null and always returns valid JSON, so this is what resolves the JS promise.
std::string take(char* s) {
  std::string out = s ? s : "null";
  est_free(s);
  return out;
}

} // namespace

int main(int argc, char** argv) {
  const std::string exePath = argc > 0 ? argv[0] : "";
  const std::string dbPath = defaultDbPath();
  void* db = est_open(dbPath.c_str());

  webview::webview w(false, nullptr);
  w.set_title("AORMS Estimate");
  w.set_size(1180, 820, WEBVIEW_HINT_NONE);

  // Persistence — the SPA calls these on window.* and gets back parsed JSON.
  w.bind("esti_list", [db](std::string) { return take(est_list(db)); });
  w.bind("esti_create", [db](std::string req) { return take(est_create(db, argJson(req, 0).c_str())); });
  w.bind("esti_get", [db](std::string req) { return take(est_get(db, argStr(req, 0).c_str())); });
  w.bind("esti_update", [db](std::string req) {
    return take(est_update(db, argStr(req, 0).c_str(), argJson(req, 1).c_str()));
  });
  w.bind("esti_delete", [db](std::string req) { return take(est_delete(db, argStr(req, 0).c_str())); });
  w.bind("esti_file", [db](std::string req) { return take(est_file(db, argStr(req, 0).c_str())); });
  // Stateless engine.
  w.bind("esti_recost", [](std::string req) { return take(est_recost(argJson(req, 0).c_str())); });
  w.bind("esti_bbs", [](std::string req) { return take(est_bbs(argJson(req, 0).c_str())); });

  w.set_html(loadUi(exePath));
  w.run();

  est_close(db);
  return 0;
}
