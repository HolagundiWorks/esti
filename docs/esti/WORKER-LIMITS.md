# Worker resource limits and idempotency

Python worker (`worker/esti_worker`) consumes Redis Stream jobs published by the backend.

## Retry and dead-letter

| Setting | Default | Purpose |
|---------|---------|---------|
| `WORKER_MAX_RETRIES` | 3 | Pending deliveries before dead-letter |
| `WORKER_RECLAIM_IDLE_MS` | 30000 | Stale job reclaim interval |
| `WORKER_DEAD_LETTER_STREAM` | `esti:jobs:dead` | Poison messages |

Failed jobs stay pending until reclaimed; successful jobs are ACK'd immediately.

## Idempotency

PDF handlers skip work when the target row is already `pdf_status=READY` with a stored key — safe to retry or duplicate-enqueue without re-rendering.

## Sandbox / resource notes

- WeasyPrint (PDF) and ezdxf (DXF) run in-process — one job at a time per worker consumer (`count=1` in `xreadgroup`).
- Large drawing SVGs and estimate exports may use hundreds of MB RAM briefly; size worker VM accordingly (≥2 GB recommended).
- No subprocess sandbox — do not pass untrusted DXF/PDF payloads without auth checks on enqueue (backend validates ownership before publish).

## Observability

Jobs carry optional `request_id` from the SPA through the backend payload for log correlation.
