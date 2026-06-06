"""Object-storage access for the worker (MinIO / S3 via boto3)."""
from __future__ import annotations

import boto3
from botocore.client import Config

from .config import settings

_client = None


def s3():
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


def get_bytes(bucket: str, key: str) -> bytes:
    return s3().get_object(Bucket=bucket, Key=key)["Body"].read()


def put_bytes(bucket: str, key: str, data: bytes, content_type: str) -> None:
    s3().put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
