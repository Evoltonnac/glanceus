from __future__ import annotations

import sqlite3
from typing import Literal

StorageErrorKind = Literal["read", "write", "schema"]


class StorageContractError(RuntimeError):
    def __init__(self, message: str, *, error_code: str):
        super().__init__(message)
        self.error_code = error_code
        self.code = error_code
        self.summary = message
        self.details = message


class StorageReadError(StorageContractError):
    def __init__(self, message: str):
        super().__init__(message, error_code="storage.read_failed")


class StorageWriteError(StorageContractError):
    def __init__(self, message: str):
        super().__init__(message, error_code="storage.write_failed")


class StorageIntegrityViolationError(StorageContractError):
    def __init__(self, message: str):
        super().__init__(message, error_code="storage.integrity_violation")


class StorageSchemaMismatchError(StorageContractError):
    def __init__(self, message: str):
        super().__init__(message, error_code="storage.schema_mismatch")


def map_sqlite_error(
    error: sqlite3.Error,
    *,
    kind: StorageErrorKind,
    operation: str,
) -> StorageContractError:
    message = f"{operation} failed: {error}"
    if isinstance(error, sqlite3.IntegrityError):
        return StorageIntegrityViolationError(message)
    if kind == "read":
        return StorageReadError(message)
    if kind == "schema":
        return StorageSchemaMismatchError(message)
    return StorageWriteError(message)
