"""Retry + dead-letter behaviour of the worker loop (no real Redis)."""
from __future__ import annotations

from esti_worker import main
from esti_worker.config import settings


class StubRedis:
    """Minimal Redis stand-in recording ack/add and faking delivery counts."""

    def __init__(self, times_delivered: int = 1) -> None:
        self.times_delivered = times_delivered
        self.acked: list[str] = []
        self.dead: list[dict] = []

    def xack(self, _stream, _group, entry_id):
        self.acked.append(entry_id)

    def xadd(self, _stream, fields):
        self.dead.append(fields)

    def xpending_range(self, _stream, _group, min, max, count):  # noqa: A002
        return [{"message_id": min, "times_delivered": self.times_delivered}]


def test_success_acks(monkeypatch):
    monkeypatch.setitem(main.HANDLERS, "ok", lambda _p: {"status": "done"})
    r = StubRedis()
    main.process_entry(r, "1-0", {"type": "ok", "payload": "{}"})
    assert r.acked == ["1-0"]
    assert r.dead == []


def test_transient_failure_left_pending(monkeypatch):
    def boom(_p):
        raise RuntimeError("transient")

    monkeypatch.setitem(main.HANDLERS, "boom", boom)
    r = StubRedis(times_delivered=1)  # below max -> retry
    main.process_entry(r, "2-0", {"type": "boom", "payload": "{}"})
    assert r.acked == []  # NOT acked -> stays pending for reclaim/retry
    assert r.dead == []


def test_exhausted_retries_dead_letter(monkeypatch):
    def boom(_p):
        raise RuntimeError("permanent")

    monkeypatch.setitem(main.HANDLERS, "boom", boom)
    r = StubRedis(times_delivered=settings.worker_max_retries)  # at limit -> DLQ
    main.process_entry(r, "3-0", {"type": "boom", "payload": "{}"})
    assert r.acked == ["3-0"]  # acked to clear from pending
    assert len(r.dead) == 1
    assert r.dead[0]["original_id"] == "3-0"
    assert "permanent" in r.dead[0]["error"]


def test_deleted_entry_acked(monkeypatch):
    r = StubRedis()
    main.process_entry(r, "4-0", None)  # XAUTOCLAIM gave None fields
    assert r.acked == ["4-0"]
