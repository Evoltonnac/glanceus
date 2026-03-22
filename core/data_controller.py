"""
Data controller backed by the storage contract runtime store.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from core.storage.contract import RuntimeStore, StorageContract
from core.storage.sqlite_connection import create_sqlite_connection
from core.storage.sqlite_runtime_repo import SqliteRuntimeRepository

logger = logging.getLogger(__name__)

_DATA_DIR = Path(os.getenv("GLANCEUS_DATA_DIR", ".")) / "data"


class DataController:
    """Runtime data operations wrapper delegated to RuntimeStore."""

    def __init__(
        self,
        db_path: str | Path | None = None,
        runtime_store: RuntimeStore | None = None,
        storage: StorageContract | None = None,
    ):
        if runtime_store is not None and storage is not None:
            raise ValueError("runtime_store and storage are mutually exclusive")

        self._owned_connection = None
        if runtime_store is not None:
            self._runtime_store = runtime_store
        elif storage is not None:
            self._runtime_store = storage.runtime
        else:
            resolved_path = Path(db_path) if db_path is not None else (_DATA_DIR / "storage.db")
            connection = create_sqlite_connection(resolved_path)
            self._owned_connection = connection
            self._runtime_store = SqliteRuntimeRepository(connection)
            logger.info("SQLite runtime store opened: %s", resolved_path)

    def upsert(self, source_id: str, data: dict[str, Any]) -> None:
        self._runtime_store.upsert(source_id, data)

    def set_error(self, source_id: str, error: str) -> None:
        self._runtime_store.set_error(source_id, error)

    def set_state(
        self,
        source_id: str,
        status: str,
        message: str | None = None,
        interaction: dict | None = None,
        error: str | None = None,
        error_code: str | None = None,
    ) -> None:
        self._runtime_store.set_state(
            source_id=source_id,
            status=status,
            message=message,
            interaction=interaction,
            error=error,
            error_code=error_code,
        )

    def set_retry_metadata(self, source_id: str, metadata: dict[str, Any] | None) -> None:
        self._runtime_store.set_retry_metadata(source_id, metadata)

    def clear_retry_metadata(self, source_id: str) -> None:
        self._runtime_store.clear_retry_metadata(source_id)

    def get_latest(self, source_id: str) -> dict | None:
        return self._runtime_store.get_latest(source_id)

    def get_all_latest(self) -> list[dict]:
        return self._runtime_store.get_all_latest()

    def get_history(self, source_id: str, limit: int = 100) -> list[dict]:
        return self._runtime_store.get_history(source_id, limit=limit)

    def clear_source(self, source_id: str) -> None:
        self._runtime_store.clear_source(source_id)

    def close(self) -> None:
        if self._owned_connection is None:
            return None
        self._owned_connection.close()
        self._owned_connection = None
        return None
