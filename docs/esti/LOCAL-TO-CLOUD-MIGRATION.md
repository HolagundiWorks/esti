# Local → Cloud migration (Lite/Pro on a machine → hosted Pro tenant)

Move a firm's **whole studio** — every `esti_*` row and every object-store file —
from a local-first desktop install to a fresh hosted Pro tenant, and prove the
transfer was faithful before cutting over.

## Why this is a backup→restore, not an in-app row engine

The **firm boundary is the database boundary**: domain tables carry no
`firm_id`, and `esti_orgsettings`/`esti_firm` are single-row (ADR-12). One
install = one firm = one database + one bucket. So the correct, robust transfer
is a whole-instance **`pg_dump` + object-store copy** into an *empty* target —
`pg_dump` is battle-tested and needs no per-table id-remap because the target is
empty. The app layer's job is only **verification**, via three owner-only,
read-only tRPC endpoints:

| Endpoint | Where | Purpose |
|---|---|---|
| `migration.preflight` | source | Can the move start? (Pro required) + a quick inventory |
| `migration.manifest` | source | Exact table-of-contents: every `esti_*` row count, schema head, object-store bytes |
| `migration.verify` | target | Recompute the target manifest and `diffManifest` it against the source's — `diff.ok` gates cutover |

The pure `diffManifest` (in `@esti/contracts`) is the gate: it fails on any
dropped row, any *extra* row (target wasn't empty), schema skew, or byte drift.

## The two hard invariants

1. **The target must be EMPTY.** A freshly provisioned Pro tenant with **no**
   demo/`provisionLite` seed. If it isn't empty, `diffManifest` reports the extra
   rows and you must not proceed — restoring into a seeded DB risks PK/`ref`
   collisions.
2. **The schema heads must match.** Source and target must be at the same
   applied-migration count (`schemaHead`). Deploy the same release to both first.

## Runbook

Preconditions: the firm is on **Pro** (`migration.preflight` → `ready: true`);
target tenant deployed at the **same release**; a maintenance window (the source
goes read-only during capture so nothing is written after the snapshot).

1. **Preflight (source).** Call `migration.preflight`. Confirm `ready: true` and
   note the counts.

2. **Freeze + capture the manifest (source).** Put the source into a maintenance
   window (stop new writes), then call `migration.manifest` and **save the JSON**
   — this is the expected manifest the target is checked against.

3. **Back up the source** (full fidelity — `deploy/backup.sh`):
   ```bash
   bash deploy/backup.sh                 # → backups/esti-pg-<stamp>.sql.gz + esti-minio-<stamp>.tar.gz
   ```
   The `pg_dump` carries **everything**, including `esti_user.passwordHash` — so
   the owner signs into the cloud with the **same credentials**; sessions are not
   copied (they re-issue on next login).

4. **Restore into the empty target.**
   ```bash
   # Postgres: restore into the empty tenant DB
   gunzip -c esti-pg-<stamp>.sql.gz | docker compose -f compose.prod.yaml exec -T esti-db \
     psql -U esti -d esti
   # Object store: extract the MinIO volume archive into the tenant's bucket volume
   docker run --rm -v <tenant_miniodata>:/data -v "$PWD":/backup alpine \
     tar xzf /backup/esti-minio-<stamp>.tar.gz -C /data
   ```
   (`pg_dump --clean --if-exists` drops+recreates, so the "empty" requirement is
   really "no *other* firm's data" — never restore over a live tenant.)

5. **Bind the licence.** Activate the tenant's Pro key so `orgSettings.licenseToken`
   and the hub `firmId` line up (Company › Licence, or `license.activate`).

6. **Verify (target) — the gate.** Call `migration.verify` with the manifest saved
   in step 2. Require `diff.ok === true`. If not, read `diff.tableMismatches` /
   `schemaHeadMismatch` / `fileBytesMismatch`, fix, and re-verify. **Do not cut
   over on a failed diff.**

7. **Recompute storage + cut over.** The target recomputes object-store usage on
   first `recomputeStorageUsage` (called inside `verify`), so the Pro storage cap
   is enforced correctly. Point the firm at the cloud URL. Keep the local install
   (now redundant) as a cold backup until the firm confirms, then retire it.

## What is NOT automated (yet)

- A one-click in-app "Move to cloud" button. The endpoints above are the
  building blocks; the button triggers steps 3–7 once an authenticated cloud
  import endpoint exists. Until then this is an **operator-run** flow.
- Continuous local↔cloud sync — explicitly out of scope.

## Rollback

Nothing on the source is mutated by capture (read-only `pg_dump`), so rollback is
trivial: lift the maintenance window and keep using the local install. Discard
the half-restored target and start over with a fresh empty tenant.
