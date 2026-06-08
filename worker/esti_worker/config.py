"""Worker configuration from environment."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    redis_url: str = "redis://localhost:6379"
    worker_job_stream: str = "esti:jobs"
    worker_group: str = "esti-workers"
    consumer_name: str = "worker-1"

    # Reliability: retry a failed/abandoned job up to N deliveries, reclaiming
    # entries left pending (crashed/stuck consumer) after they go idle, then
    # route the poison job to a dead-letter stream.
    worker_max_retries: int = 3
    worker_reclaim_idle_ms: int = 30000
    worker_dead_letter_stream: str = "esti:jobs:dead"

    database_url: str = "postgres://esti:esti@localhost:5432/esti"

    s3_endpoint: str = "http://localhost:9000"
    s3_bucket: str = "esti-documents"
    s3_access_key: str = "esti"
    s3_secret_key: str = "esti-secret"


settings = Settings()
