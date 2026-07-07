# AORMS Estimate — C++ backend

A **standalone C++ + SQLite backend** for the [AORMS Estimate](../README.md)
desktop app. The desktop app itself is a fully-offline Tauri SPA that keeps its
working model in memory and exports a sealed `.aormsest`; this service adds
**persistence** (save/load/list estimates in SQLite) and owns the **full
estimating engine** server-side, so it can compute totals and emit a sealed
`.aormsest` without the browser.

It is a faithful C++ port of the shared TypeScript engine in
[`@esti/contracts`](../../packages/contracts/src/estimate.ts) +
[`bbs-engine.ts`](../../packages/contracts/src/bbs-engine.ts) and the model→file
assembly in [`estimate/src/core/build.ts`](../src/core/build.ts). The port is
byte-for-byte compatible: a `.aormsest` sealed here has the **exact same sha256
checksum** as one sealed by the SPA (see [Seal parity](#seal-parity)).

> Standalone by design — it is **not** wired into the Tauri shell. Run it
> independently (or point the SPA at it via `fetch`); front-end integration is a
> follow-on.

## What it does

- **Measure → freeze.** `nos · L · B · H` per row → quantity (`measureQty`),
  summed and frozen per item.
- **Re-cost.** Item abstract, BOQ (by section), material take-off and steel
  summary against a rate book — project override → office book → as-estimated
  fallback, with per-item lead (carriage) handling. Money is integer **paise**.
- **Steel / BBS.** Slab / beam / column / footing geometry → cut lengths +
  weights per **IS 456:2000 / IS 2502:1963 / SP 34 / IS 1786**, rolled up by
  diameter.
- **Seal.** Canonical key-sorted JSON + sha256 → the `.aormsest` envelope seal.
- **Persist.** Saved estimates live in a single SQLite `estimates` table (the
  working model as JSON + a cached checksum & grand total for cheap listing).

## Build

Requires a C++17 compiler, CMake ≥ 3.16, and system SQLite3 dev headers
(`libsqlite3-dev` on Debian/Ubuntu, `sqlite` via Homebrew on macOS). The HTTP
(`cpp-httplib`) and JSON (`nlohmann/json`) libraries are vendored header-only in
[`third_party/`](third_party/) — no network needed at build time.

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
ctest --test-dir build --output-on-failure   # engine parity tests
```

Artifacts: `build/aorms-estimate-backend` (server) and `build/test_engine`.

## Run

```sh
./build/aorms-estimate-backend
# → AORMS Estimate C++ backend on http://127.0.0.1:8787  (db: aorms-estimate.db)
```

Environment:

| Var | Default | Meaning |
|---|---|---|
| `ESTIMATE_DB` | `aorms-estimate.db` | SQLite file path |
| `ESTIMATE_HOST` | `127.0.0.1` | bind address |
| `ESTIMATE_PORT` | `8787` | listen port |

## HTTP API

All bodies/responses are JSON. The **working model** is the shape the SPA edits
(`estimateName`, `projectName`, `rateBookCode/Name`, `items[]`, `materials[]`,
`bbs[]`, `steelRatePaiseByDia`). Create/Update accept the model directly or
wrapped as `{ "model": … }`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/healthz` | liveness |
| `GET` | `/api/estimates` | list saved estimates (summaries, newest first) |
| `POST` | `/api/estimates` | save a new estimate → `201` with `{id, …, costed}` |
| `GET` | `/api/estimates/:id` | fetch model + freshly-computed `costed` views |
| `PUT` | `/api/estimates/:id` | overwrite the model (re-seals, re-costs) |
| `DELETE` | `/api/estimates/:id` | delete → `204` |
| `GET` | `/api/estimates/:id/file` | sealed `.aormsest` download |
| `POST` | `/api/recost` | stateless re-cost: `{model, rateBook?, projectItemRatePaise?}` |
| `POST` | `/api/bbs` | geometry → schedule: a member, or `{members:[…]}` |

```sh
# Save, then export the sealed file
curl -sX POST localhost:8787/api/estimates -d '{
  "estimateName":"Villa GF","items":[{"code":"bw230","uom":"m³","ratePaise":800000,
    "measurements":[{"nos":1,"l":4.5,"b":0.23,"h":3.0}]}]}'
```

## Seal parity

The seal must hash the same bytes as the TypeScript `estimateSealString`
(recursive key-sort, drop `undefined`, `JSON.stringify`) so checksums match. The
C++ side relies on `nlohmann/json`'s default `std::map` object (keys sorted) +
whitespace-free `dump()` + a `jnum()` helper that serialises integer-valued
doubles without a decimal point (`5`, not `5.0`) — matching ECMAScript's
shortest-number rule.

`tests/test_engine.cpp` asserts the digest of a representative draft equals the
reference produced by Node:

```js
import { createHash } from "node:crypto";
// estimateSealString(draft) reimplemented inline, then:
createHash("sha256").update(sealString, "utf8").digest("hex");
// → cef501e96a7ea7eac695e525dca5101c5ae87f3ef19e399c67989da78e603e15
```

## Layout

```
backend-cpp/
├─ src/
│  ├─ numeric.hpp     paise/rounding helpers + jnum (JS-JSON number parity)
│  ├─ sha256.hpp      dependency-free SHA-256
│  ├─ bbs.hpp         IS-code constants + formulas (port of bbs.ts)
│  ├─ bbs_engine.*    element geometry → bar schedule (port of bbs-engine.ts)
│  ├─ estimate.*      model → draft → seal + re-costing (port of estimate.ts)
│  ├─ db.*            SQLite persistence (estimates table)
│  └─ main.cpp        cpp-httplib server wiring
├─ tests/test_engine.cpp   parity tests vs the TS engine + seal reference
├─ third_party/      vendored httplib.h, json.hpp (both MIT)
└─ CMakeLists.txt
```
