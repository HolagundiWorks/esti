# @esti/ese — Estimation Specification Engine

Back-office pack publisher for the Knowledge-Bank team. Ingests state/central PWD
workbooks (Schedules of Rates, Analysis of Rates, Specifications) and NBC / planning
bylaws (PDF or Markdown) → structures them with a **local Ollama** model → publishes
clean, versioned **packs** the Estimate desktop app and AORMS consume.

Full spec: [`docs/esti/ESTIMATION-SPEC-ENGINE.md`](../docs/esti/ESTIMATION-SPEC-ENGINE.md).
Pack schema (the shared seam): `@esti/contracts` → `ese-packs.ts`
(`RateLibraryPack`, `BylawRulePack`).

## Pipeline

```
PDF/Markdown → pdfToMarkdown → formatMarkdown → ollamaExtract (+ deterministic parseRateRow)
            → KB-team review → buildRateLibraryPack (checksum) → publish (immutable edition)
```
Rates are parsed **deterministically** (`parseRateRow`); the LLM only structures and
cross-checks — it never guesses a rate.

## Run (dev)

```
ESE_ADMIN_USER=kbadmin ESE_ADMIN_PASSWORD=<set> \
DATABASE_URL=postgres://esti:esti@localhost:5432/ese \
OLLAMA_URL=http://127.0.0.1:11434 OLLAMA_MODEL=llama3.1 \
pnpm --filter @esti/ese dev
```
The default `kbteam` admin is seeded from `ESE_ADMIN_*` on first run (forced password
rotation) — the same first-run pattern as the AORMS Community admin.

## Status — scaffold

Package skeleton in place: config · Drizzle schema (`ese_user` / `ese_source` /
`ese_pack`) · pipeline stages (typed against the pack contracts) · Fastify entry with
the kbteam admin seed. **Next build task:** the real PDF→Markdown converter, the Ollama
prompts, and the **per-source parsers** (driven by the state-SoR research). Deps require
`pnpm install` at the workspace root before the app compiles.

## Split-out

Designed to move to its own repo at `ese.aorms.in`. The `@esti/contracts` pack schema is
the stable seam, so the split is mechanical — copy `ese/`, depend on the published
`@esti/contracts`, done.
