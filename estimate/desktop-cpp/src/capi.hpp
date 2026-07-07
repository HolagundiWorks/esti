// C ABI over the estimating engine + SQLite store. This is the in-process bridge
// the C++ webview host binds into the browser UI (window.*). There is NO server
// and NO network: the desktop app calls straight into this, which calls the
// engine (estimate.hpp) and the SQLite store (db.hpp).
//
// Every entry point takes/returns UTF-8 JSON as a NUL-terminated `char*`. Returned
// strings are heap-allocated and MUST be released with est_free(). A returned
// pointer is never null; on failure it is a JSON object `{"error": "..."}`.
#ifndef AORMS_ESTIMATE_CAPI_H
#define AORMS_ESTIMATE_CAPI_H

#ifdef __cplusplus
extern "C" {
#endif

// Open (creating if needed) the SQLite store at `db_path`. Returns an opaque
// handle, or null on failure. One handle serialises its own writes internally.
void* est_open(const char* db_path);
void est_close(void* handle);

// Persistence (all take/return JSON; `model_json` is the working EstimateModel).
char* est_list(void* handle);                              // -> {"estimates":[...]}
char* est_create(void* handle, const char* model_json);    // -> {id,...,costed}
char* est_get(void* handle, const char* id);               // -> {id,...,costed} | {error}
char* est_update(void* handle, const char* id, const char* model_json);
char* est_delete(void* handle, const char* id);            // -> {"deleted":true} | {error}
char* est_file(void* handle, const char* id);              // -> sealed .aormsest

// Stateless engine (no store): recost a model, or compute a BBS schedule.
char* est_recost(const char* body_json);                   // {model,rateBook?,projectItemRatePaise?}
char* est_bbs(const char* body_json);                      // member | {members:[...]}

// Release a string returned by any est_* function above.
void est_free(char* s);

#ifdef __cplusplus
}
#endif

#endif // AORMS_ESTIMATE_CAPI_H
