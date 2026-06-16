"""Unit tests for worker object-storage helpers."""
from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

from esti_worker import storage


class EnsureBucketTests(unittest.TestCase):
    def setUp(self) -> None:
        storage._ensured_buckets.clear()

    def test_skips_when_exists(self) -> None:
        client = MagicMock()
        client.exceptions.ClientError = Exception
        with patch.object(storage, "s3", return_value=client):
            storage.ensure_bucket("esti-documents")
            client.head_bucket.assert_called_once_with(Bucket="esti-documents")
            client.create_bucket.assert_not_called()
        self.assertIn("esti-documents", storage._ensured_buckets)

    def test_creates_when_missing(self) -> None:
        client = MagicMock()

        class ClientError(Exception):
            def __init__(self, code: str) -> None:
                self.response = {"Error": {"Code": code}}

        client.exceptions.ClientError = ClientError
        client.head_bucket.side_effect = ClientError("404")
        with patch.object(storage, "s3", return_value=client):
            storage.ensure_bucket("esti-documents")
            client.create_bucket.assert_called_once_with(Bucket="esti-documents")
        self.assertIn("esti-documents", storage._ensured_buckets)

    def test_put_bytes_calls_ensure_bucket(self) -> None:
        client = MagicMock()
        client.exceptions.ClientError = Exception
        with patch.object(storage, "s3", return_value=client), patch.object(
            storage, "ensure_bucket"
        ) as ensure:
            storage.put_bytes("esti-documents", "pdf/test.pdf", b"%PDF", "application/pdf")
            ensure.assert_called_once_with("esti-documents")
            client.put_object.assert_called_once()


if __name__ == "__main__":
    unittest.main()
