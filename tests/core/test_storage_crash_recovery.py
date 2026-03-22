from __future__ import annotations

import sqlite3

import pytest

from core.models import StoredSource, StoredView, ViewItem
from core.storage.errors import StorageContractError
from core.storage.sqlite_connection import create_sqlite_connection
from core.storage.sqlite_resource_repo import SqliteResourceRepository
from core.storage.sqlite_runtime_repo import SqliteRuntimeRepository


def _create_runtime_failure_trigger(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TRIGGER fail_runtime_update
        BEFORE UPDATE ON runtime_latest
        FOR EACH ROW
        WHEN NEW.payload_json LIKE '%"force_fail": true%'
        BEGIN
            SELECT RAISE(ABORT, 'injected runtime failure');
        END;
        """
    )
    connection.commit()


def _create_retry_failure_trigger(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TRIGGER fail_retry_update
        BEFORE UPDATE ON runtime_latest
        FOR EACH ROW
        WHEN NEW.payload_json LIKE '%"fail_retry_write": true%'
        BEGIN
            SELECT RAISE(ABORT, 'injected retry metadata failure');
        END;
        """
    )
    connection.commit()


def _create_view_failure_trigger(connection: sqlite3.Connection, view_id: str) -> None:
    safe_view_id = view_id.replace("'", "''")
    connection.execute(
        f"""
        CREATE TRIGGER fail_view_update_{view_id.replace('-', '_')}
        BEFORE UPDATE ON stored_views
        FOR EACH ROW
        WHEN NEW.view_id = '{safe_view_id}'
        BEGIN
            SELECT RAISE(ABORT, 'injected view update failure');
        END;
        """
    )
    connection.commit()


def test_runtime_rollback_keeps_last_known_good_latest_row(tmp_path):
    db_path = tmp_path / "storage.db"
    connection = create_sqlite_connection(db_path)
    repo = SqliteRuntimeRepository(connection)

    try:
        repo.upsert("source-alpha", {"value": 1})
        committed = repo.get_latest("source-alpha")
        assert committed is not None

        _create_runtime_failure_trigger(connection)

        with pytest.raises(StorageContractError) as excinfo:
            repo.upsert("source-alpha", {"force_fail": True, "value": 2})
        assert excinfo.value.error_code == "storage.integrity_violation"

        after_failure = repo.get_latest("source-alpha")
        assert after_failure is not None
        assert after_failure["source_id"] == "source-alpha"
        assert after_failure["data"] == {"value": 1}
        assert after_failure.get("updated_at") == committed.get("updated_at")
        assert after_failure.get("last_success_at") == committed.get("last_success_at")
    finally:
        connection.close()


def test_resource_write_failure_rolls_back_all_view_updates(tmp_path):
    db_path = tmp_path / "storage.db"
    connection = create_sqlite_connection(db_path)
    repo = SqliteResourceRepository(connection)

    source = StoredSource(
        id="source-alpha",
        integration_id="integration-alpha",
        name="Alpha Source",
        config={},
        vars={},
    )
    view_a = StoredView(
        id="view-alpha",
        name="View Alpha",
        layout_columns=12,
        items=[
            ViewItem(
                id="item-alpha",
                x=0,
                y=0,
                w=3,
                h=4,
                source_id="source-alpha",
                template_id="tmpl-a",
                props={},
            )
        ],
    )
    view_b = StoredView(
        id="view-bravo",
        name="View Bravo",
        layout_columns=12,
        items=[
            ViewItem(
                id="item-bravo",
                x=1,
                y=1,
                w=3,
                h=4,
                source_id="source-alpha",
                template_id="tmpl-b",
                props={},
            )
        ],
    )

    try:
        repo.save_source(source)
        repo.save_view(view_a)
        repo.save_view(view_b)
        _create_view_failure_trigger(connection, "view-bravo")

        with pytest.raises(StorageContractError) as excinfo:
            repo.remove_source_references_from_views("source-alpha")
        assert excinfo.value.error_code == "storage.integrity_violation"

        latest_view_a = repo.get_view("view-alpha")
        latest_view_b = repo.get_view("view-bravo")
        assert latest_view_a is not None
        assert latest_view_b is not None
        assert latest_view_a.items[0].source_id == "source-alpha"
        assert latest_view_b.items[0].source_id == "source-alpha"
    finally:
        connection.close()


def test_retry_metadata_write_failure_keeps_last_known_good_retry_fields(tmp_path):
    db_path = tmp_path / "storage.db"
    connection = create_sqlite_connection(db_path)
    repo = SqliteRuntimeRepository(connection)

    try:
        repo.upsert("source-alpha", {"value": 10})
        repo.set_state("source-alpha", status="running", message="refresh in progress")
        repo.set_retry_metadata("source-alpha", {"attempt": 1, "reason": "timeout"})
        committed = repo.get_latest("source-alpha")
        assert committed is not None
        assert committed["status"] == "running"
        assert committed["retry_metadata"] == {"attempt": 1, "reason": "timeout"}

        _create_retry_failure_trigger(connection)

        with pytest.raises(StorageContractError) as excinfo:
            repo.set_retry_metadata(
                "source-alpha",
                {"attempt": 2, "reason": "timeout", "fail_retry_write": True},
            )
        assert excinfo.value.error_code == "storage.integrity_violation"

        after_failure = repo.get_latest("source-alpha")
        assert after_failure is not None
        assert after_failure["source_id"] == "source-alpha"
        assert after_failure["status"] == "running"
        assert after_failure.get("error_code") is None
        assert after_failure["retry_metadata"] == {"attempt": 1, "reason": "timeout"}
        assert after_failure.get("updated_at") == committed.get("updated_at")
    finally:
        connection.close()
