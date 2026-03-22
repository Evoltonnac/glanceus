from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Callable, Protocol, TypeVar

from .contract import DEFAULT_STORAGE_FILE, STORAGE_SCHEMA_VERSION
from .errors import map_sqlite_error

_DEFAULT_DATA_DIR = Path(os.getenv("GLANCEUS_DATA_DIR", ".")) / "data"

_SCHEMA_DDL = (
    """
    CREATE TABLE IF NOT EXISTS runtime_latest (
        source_id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        updated_at REAL NOT NULL,
        last_success_at REAL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS runtime_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        timestamp REAL NOT NULL,
        payload_json TEXT NOT NULL
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_runtime_history_source_timestamp
        ON runtime_history(source_id, timestamp DESC)
    """,
    """
    CREATE TABLE IF NOT EXISTS stored_sources (
        source_id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        updated_at REAL NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS stored_views (
        view_id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        updated_at REAL NOT NULL
    )
    """,
)

_T = TypeVar("_T")


class _SupportsTransactions(Protocol):
    def execute(self, sql: str, parameters=()): ...  # type: ignore[no-untyped-def]

    def commit(self) -> None: ...

    def rollback(self) -> None: ...


def resolve_default_storage_path() -> Path:
    _DEFAULT_DATA_DIR.mkdir(parents=True, exist_ok=True)
    return _DEFAULT_DATA_DIR / DEFAULT_STORAGE_FILE


def bootstrap_schema(connection: sqlite3.Connection) -> None:
    try:
        with connection:
            for ddl in _SCHEMA_DDL:
                connection.execute(ddl)
            connection.execute(f"PRAGMA user_version = {STORAGE_SCHEMA_VERSION}")
    except sqlite3.Error as error:
        raise map_sqlite_error(error, kind="schema", operation="bootstrap_schema") from error


def execute_write_transaction(
    connection: _SupportsTransactions,
    *,
    operation: str,
    action: Callable[[], _T],
) -> _T:
    try:
        connection.execute("BEGIN IMMEDIATE")
    except sqlite3.Error as error:
        raise map_sqlite_error(error, kind="write", operation=operation) from error

    try:
        result = action()
    except Exception as error:
        connection.rollback()
        if isinstance(error, sqlite3.Error):
            raise map_sqlite_error(error, kind="write", operation=operation) from error
        raise

    try:
        connection.commit()
    except sqlite3.Error as error:
        connection.rollback()
        raise map_sqlite_error(error, kind="write", operation=operation) from error
    return result


def create_sqlite_connection(db_path: str | Path | None = None) -> sqlite3.Connection:
    path = Path(db_path) if db_path is not None else resolve_default_storage_path()
    path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA busy_timeout = 5000")
    bootstrap_schema(connection)
    return connection
