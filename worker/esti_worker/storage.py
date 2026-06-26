"""Object-storage access for the worker (MinIO / S3 via boto3) with BYOS.

The active backend is resolved per-firm from esti_orgsettings.storage_settings,
mirroring the TypeScript backend so worker outputs (PDFs, SVGs) land in the same
store as user uploads:
  - DEFAULT → env config (the passed bucket + env MinIO/S3) — unchanged behavior
  - NAS     → local filesystem at a configured (mounted) path
  - S3      → the firm's own S3-compatible endpoint/bucket/keys
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import boto3
from botocore.client import Config

from .config import settings
from .db import fetch_storage_settings

_client = None
_ensured_buckets: set[str] = set()


def s3():
    """The env-configured S3 client (DEFAULT mode)."""
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name="us-east-1",
            config=Config(signature_version="s3v4"),
        )
    return _client


@dataclass
class Backend:
    kind: str  # "default" | "fs" | "s3"
    root: Optional[str] = None
    client: Optional[Any] = None
    bucket: Optional[str] = None


def backend_from_settings(cfg: dict[str, Any]) -> Backend:
    """Pure mapping from a storage_settings dict to an active backend descriptor."""
    mode = (cfg or {}).get("mode", "DEFAULT")
    if mode == "NAS" and (cfg.get("nasPath") or "").strip():
        return Backend(kind="fs", root=str(cfg["nasPath"]).strip())
    if mode == "S3" and (cfg.get("s3Endpoint") or "").strip() and (cfg.get("s3Bucket") or "").strip():
        client = boto3.client(
            "s3",
            endpoint_url=str(cfg["s3Endpoint"]).strip(),
            aws_access_key_id=cfg.get("s3AccessKey") or "",
            aws_secret_access_key=cfg.get("s3SecretKey") or "",
            region_name=cfg.get("s3Region") or "us-east-1",
            config=Config(signature_version="s3v4"),
        )
        return Backend(kind="s3", client=client, bucket=str(cfg["s3Bucket"]).strip())
    return Backend(kind="default")


_cached: Optional[Backend] = None
_cached_at: float = 0.0
_TTL = 10.0  # seconds — pick up config changes within 10s, reuse within a job


def resolve_backend() -> Backend:
    global _cached, _cached_at
    now = time.monotonic()
    if _cached is None or now - _cached_at > _TTL:
        _cached = backend_from_settings(fetch_storage_settings())
        _cached_at = now
    return _cached


def _fs_path(root: str, key: str) -> Path:
    base = Path(root).resolve()
    p = (base / key).resolve()
    if base != p and base not in p.parents:
        raise ValueError("invalid storage key")
    return p


def ensure_bucket(bucket: str) -> None:
    """Idempotently create the documents bucket (MinIO does not auto-provision)."""
    b = resolve_backend()
    if b.kind == "fs":
        Path(b.root).mkdir(parents=True, exist_ok=True)
        return
    client = b.client if b.kind == "s3" else s3()
    target = b.bucket if b.kind == "s3" else bucket
    if target in _ensured_buckets:
        return
    try:
        client.head_bucket(Bucket=target)
    except client.exceptions.ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code not in ("404", "NoSuchBucket", "NotFound"):
            raise
        client.create_bucket(Bucket=target)
    _ensured_buckets.add(target)


def get_bytes(bucket: str, key: str) -> bytes:
    b = resolve_backend()
    if b.kind == "fs":
        return _fs_path(b.root, key).read_bytes()
    if b.kind == "s3":
        return b.client.get_object(Bucket=b.bucket, Key=key)["Body"].read()
    return s3().get_object(Bucket=bucket, Key=key)["Body"].read()


def put_bytes(bucket: str, key: str, data: bytes, content_type: str) -> None:
    b = resolve_backend()
    if b.kind == "fs":
        path = _fs_path(b.root, key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return
    if b.kind == "s3":
        ensure_bucket(bucket)
        b.client.put_object(Bucket=b.bucket, Key=key, Body=data, ContentType=content_type)
        return
    ensure_bucket(bucket)
    s3().put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
