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


def run() -> None:
    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    r = redis.Redis.from_url(settings.redis_url, decode_responses=True)
    ensure_group(r)
    log.info("worker up; consuming %s as %s/%s", settings.worker_job_stream, settings.worker_group, settings.consumer_name)

    while _running:
        resp = r.xreadgroup(
            settings.worker_group,
            settings.consumer_name,
            {settings.worker_job_stream: ">"},
            count=1,
            block=5000,
        )
        if not resp:
            continue
        for _stream, entries in resp:
            for entry_id, fields in entries:
                try:
                    payload = json.loads(fields.get("payload", "{}"))
                    result = handle(fields.get("type", ""), payload)
                    log.info("job %s %s -> %s", entry_id, fields.get("type"), result.get("status"))
                except Exception:  # noqa: BLE001 - keep the loop alive; log and ack
                    log.exception("job %s failed", entry_id)
                finally:
                    r.xack(settings.worker_job_stream, settings.worker_group, entry_id)

    log.info("worker stopped")


if __name__ == "__main__":
    sys.exit(run())
