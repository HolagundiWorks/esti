"""Worker entrypoint: consume the Redis Streams job bus and dispatch handlers.

Language-neutral contract (ADR-10): each job is a stream entry with fields
`type` and `payload` (JSON). The TS backend publishes; this worker consumes via
a consumer group, processes, and acknowledges. Results/status are written to
PostgreSQL and object storage; the SPA polls/subscribes for completion.
"""
from __future__ import annotations

import json
import logging
import signal
import sys
import time

import redis

from .config import settings
from .jobs import HANDLERS

log = logging.getLogger("esti.worker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

_running = True


def _stop(*_: object) -> None:
    global _running
    _running = False


def ensure_group(r: redis.Redis) -> None:
    try:
        r.xgroup_create(settings.worker_job_stream, settings.worker_group, id="0", mkstream=True)
    except redis.ResponseError as exc:
        if "BUSYGROUP" not in str(exc):
            raise


def handle(type_: str, payload: dict) -> dict:
    handler = HANDLERS.get(type_)
    if handler is None:
        log.warning("no handler for job type %s", type_)
        return {"status": "skipped", "reason": "unknown_type"}
    return handler(payload)


def _delivery_count(r: redis.Redis, entry_id: str) -> int:
    """How many times this entry has been delivered (1 on first receipt)."""
    try:
        pending = r.xpending_range(
            settings.worker_job_stream, settings.worker_group, min=entry_id, max=entry_id, count=1
        )
    except redis.exceptions.RedisError:
        return 1
    if pending:
        return int(pending[0].get("times_delivered", 1))
    return 1


def _dead_letter(r: redis.Redis, entry_id: str, fields: dict, attempts: int, error: str) -> None:
    """Route a poison job to the dead-letter stream and clear it from pending."""
    r.xadd(
        settings.worker_dead_letter_stream,
        {
            "type": fields.get("type", ""),
            "payload": fields.get("payload", "{}"),
            "original_id": entry_id,
            "attempts": str(attempts),
            "error": error[:1000],
        },
    )
    r.xack(settings.worker_job_stream, settings.worker_group, entry_id)
    log.error("job %s dead-lettered after %d attempts: %s", entry_id, attempts, error)


def process_entry(r: redis.Redis, entry_id: str, fields: dict | None) -> None:
    """Run one job. ACK on success or permanent failure; leave pending to retry."""
    # XAUTOCLAIM yields None fields for entries deleted from the stream — just clear.
    if fields is None:
        r.xack(settings.worker_job_stream, settings.worker_group, entry_id)
        return
    try:
        payload = json.loads(fields.get("payload", "{}"))
        result = handle(fields.get("type", ""), payload)
        log.info("job %s %s -> %s", entry_id, fields.get("type"), result.get("status"))
        r.xack(settings.worker_job_stream, settings.worker_group, entry_id)
    except Exception as exc:  # noqa: BLE001 - keep the loop alive
        attempts = _delivery_count(r, entry_id)
        if attempts >= settings.worker_max_retries:
            _dead_letter(r, entry_id, fields, attempts, repr(exc))
        else:
            # Leave the entry pending (unacked); it is reclaimed and retried
            # once it has been idle for worker_reclaim_idle_ms (backoff).
            log.warning(
                "job %s failed (attempt %d/%d); will retry",
                entry_id,
                attempts,
                settings.worker_max_retries,
            )


def reclaim_stale(r: redis.Redis) -> None:
    """Reclaim and retry entries left pending by a crashed/stuck consumer."""
    try:
        result = r.xautoclaim(
            settings.worker_job_stream,
            settings.worker_group,
            settings.consumer_name,
            min_idle_time=settings.worker_reclaim_idle_ms,
            start_id="0-0",
            count=10,
        )
    except redis.exceptions.RedisError as exc:
        log.warning("xautoclaim failed: %s", exc)
        return
    # redis-py >= 7 returns (cursor, [(id, fields), ...], deleted_ids)
    claimed = result[1] if len(result) > 1 else []
    for entry_id, fields in claimed:
        log.info("reclaimed stale job %s for retry", entry_id)
        process_entry(r, entry_id, fields)


def run() -> None:
    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    r = redis.Redis.from_url(settings.redis_url, decode_responses=True)
    ensure_group(r)
    log.info("worker up; consuming %s as %s/%s", settings.worker_job_stream, settings.worker_group, settings.consumer_name)

    while _running:
        # First reclaim any stale pending entries (retry path), then take new work.
        reclaim_stale(r)
        try:
            resp = r.xreadgroup(
                settings.worker_group,
                settings.consumer_name,
                {settings.worker_job_stream: ">"},
                count=1,
                block=5000,
            )
        except redis.exceptions.TimeoutError:
            continue  # BLOCK window elapsed with no jobs — poll again
        except redis.exceptions.ConnectionError:
            log.warning("redis connection lost; retrying")
            time.sleep(1)
            continue
        if not resp:
            continue
        for _stream, entries in resp:
            for entry_id, fields in entries:
                process_entry(r, entry_id, fields)

    log.info("worker stopped")


if __name__ == "__main__":
    sys.exit(run())
