from __future__ import annotations

import json
import sqlite3
from types import SimpleNamespace

import main as main_module
from core.config_loader import AppConfig
from core.models import StoredSource, StoredView, ViewItem
from core.storage.contract import STORAGE_SCHEMA_VERSION
from core.storage.settings_adapter import SettingsAdapter
from core.storage.sqlite_connection import create_sqlite_connection
from core.storage.sqlite_resource_repo import SqliteResourceRepository
from core.storage.sqlite_runtime_repo import SqliteRuntimeRepository
from core.settings_manager import SettingsManager, SystemSettings


class SqlConnectionSpy:
    def __init__(self, delegate: sqlite3.Connection):
        self._delegate = delegate
        self.sql_statements: list[str] = []

    def execute(self, sql: str, parameters=()):  # type: ignore[no-untyped-def]
        self.sql_statements.append(" ".join(sql.strip().split()))
        return self._delegate.execute(sql, parameters)

    def commit(self) -> None:
        self._delegate.commit()

    def rollback(self) -> None:
        self._delegate.rollback()

    def cursor(self):  # type: ignore[no-untyped-def]
        return self._delegate.cursor()

    def __enter__(self):
        self._delegate.__enter__()
        return self

    def __exit__(self, exc_type, exc, tb):  # type: ignore[no-untyped-def]
        return self._delegate.__exit__(exc_type, exc, tb)


def test_storage_bootstrap_sets_schema_version_and_tables(tmp_path):
    db_path = tmp_path / "storage.db"

    conn = create_sqlite_connection(db_path)
    try:
        user_version = conn.execute("PRAGMA user_version").fetchone()
        assert user_version is not None
        assert user_version[0] == STORAGE_SCHEMA_VERSION

        table_rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
        table_names = {row[0] for row in table_rows}
        assert {"runtime_latest", "runtime_history", "stored_sources", "stored_views"} <= table_names
    finally:
        conn.close()


def test_runtime_repo_crud_contract_parity(tmp_path):
    db_path = tmp_path / "storage.db"
    conn = create_sqlite_connection(db_path)
    repo = SqliteRuntimeRepository(conn)

    try:
        repo.upsert("source-alpha", {"value": 1})

        latest = repo.get_latest("source-alpha")
        assert latest is not None
        assert latest["source_id"] == "source-alpha"
        assert latest["data"] == {"value": 1}
        assert latest.get("updated_at") is not None
        assert latest.get("last_success_at") is not None

        all_latest = repo.get_all_latest()
        assert len(all_latest) == 1
        assert all_latest[0]["source_id"] == "source-alpha"

        first_ts = latest["updated_at"]
        conn.execute(
            """
            INSERT INTO runtime_history(source_id, timestamp, payload_json)
            VALUES (?, ?, ?)
            """,
            ("source-alpha", first_ts, json.dumps({"source_id": "source-alpha", "timestamp": first_ts})),
        )
        conn.execute(
            """
            INSERT INTO runtime_history(source_id, timestamp, payload_json)
            VALUES (?, ?, ?)
            """,
            (
                "source-alpha",
                first_ts + 1.0,
                json.dumps({"source_id": "source-alpha", "timestamp": first_ts + 1.0}),
            ),
        )
        conn.commit()

        history = repo.get_history("source-alpha", limit=1)
        assert len(history) == 1
        assert history[0]["timestamp"] == first_ts + 1.0

        repo.clear_source("source-alpha")
        assert repo.get_latest("source-alpha") is None
        assert repo.get_history("source-alpha") == []
    finally:
        conn.close()


def test_resource_repo_crud_and_source_reference_cleanup(tmp_path):
    db_path = tmp_path / "storage.db"
    conn = create_sqlite_connection(db_path)
    repo = SqliteResourceRepository(conn)

    source = StoredSource(
        id="source-alpha",
        integration_id="integration-alpha",
        name="Alpha Source",
        config={"token": "abc"},
        vars={"region": "us"},
    )
    view = StoredView(
        id="view-alpha",
        name="Main View",
        layout_columns=12,
        items=[
            ViewItem(
                id="item-alpha",
                x=0,
                y=0,
                w=3,
                h=4,
                source_id="source-alpha",
                template_id="tmpl-1",
                props={"mode": "compact"},
            )
        ],
    )

    try:
        saved_source = repo.save_source(source)
        assert saved_source.id == "source-alpha"
        assert [s.id for s in repo.load_sources()] == ["source-alpha"]

        saved_view = repo.save_view(view)
        assert saved_view.id == "view-alpha"
        assert [v.id for v in repo.load_views()] == ["view-alpha"]

        affected_views = repo.remove_source_references_from_views("source-alpha")
        assert affected_views == ["view-alpha"]
        updated_view = repo.load_views()[0]
        assert updated_view.items == []

        assert repo.delete_source("source-alpha") is True
        assert repo.delete_source("source-alpha") is False
        assert repo.delete_view("view-alpha") is True
        assert repo.delete_view("view-alpha") is False
    finally:
        conn.close()


def test_create_app_wires_shared_storage_contract(monkeypatch, tmp_path):
    captured: dict[str, object] = {}

    class _FakeDataController:
        def __init__(self, *, storage):
            captured["data_storage"] = storage

        def close(self):
            return None

    class _FakeResourceManager:
        def __init__(self, *, storage):
            captured["resource_storage"] = storage

        def load_sources(self):
            return []

    class _FakeSettingsManager:
        def __init__(self):
            self.settings_file = tmp_path / "data" / "settings.json"

        def load_settings(self):
            return SystemSettings()

        def save_settings(self, settings: SystemSettings):
            return None

    fake_secrets = SimpleNamespace(
        inject_settings_manager=lambda _settings: None,
        inject_master_key_provider=lambda _provider: None,
    )

    monkeypatch.setattr(main_module, "seed_first_launch_workspace", lambda *_args, **_kwargs: False)
    monkeypatch.setattr(main_module, "load_config", lambda: AppConfig())
    monkeypatch.setattr(main_module, "DataController", _FakeDataController)
    monkeypatch.setattr(main_module, "ResourceManager", _FakeResourceManager)
    monkeypatch.setattr(main_module, "SettingsManager", _FakeSettingsManager)
    monkeypatch.setattr(main_module, "SecretsController", lambda: fake_secrets)
    monkeypatch.setattr(main_module, "AuthManager", lambda _secrets, app_config: SimpleNamespace())
    monkeypatch.setattr(
        main_module,
        "Executor",
        lambda _dc, _sc, _sm, **_kwargs: SimpleNamespace(get_source_state=lambda _source_id: None),
    )
    monkeypatch.setattr(main_module, "IntegrationManager", lambda: SimpleNamespace())
    monkeypatch.setattr(
        main_module,
        "RefreshScheduler",
        lambda **_kwargs: SimpleNamespace(start=lambda: None, stop=lambda: None),
    )
    monkeypatch.setattr(main_module.api, "init_api", lambda **_kwargs: None)

    main_module.create_app()

    data_storage = captured["data_storage"]
    resource_storage = captured["resource_storage"]
    assert data_storage is resource_storage
    assert isinstance(data_storage.settings, SettingsAdapter)


def test_settings_adapter_writes_to_settings_json(tmp_path):
    settings_dir = tmp_path / "data"
    manager = SettingsManager(settings_dir=settings_dir)
    adapter = SettingsAdapter(manager)

    loaded = adapter.load_settings()
    updated = loaded.model_copy(update={"language": "zh"})
    adapter.save_settings(updated)

    settings_file = settings_dir / "settings.json"
    payload = json.loads(settings_file.read_text(encoding="utf-8"))
    assert payload["language"] == "zh"


def test_runtime_repo_mutations_run_in_begin_immediate_transaction(tmp_path):
    db_path = tmp_path / "storage.db"
    connection = create_sqlite_connection(db_path)
    spy = SqlConnectionSpy(connection)
    repo = SqliteRuntimeRepository(spy)  # type: ignore[arg-type]

    try:
        repo.upsert("source-alpha", {"value": 1})
        repo.set_state("source-alpha", status="running", message="ok")
        repo.clear_retry_metadata("source-alpha")
        repo.clear_source("source-alpha")
    finally:
        connection.close()

    assert any("BEGIN IMMEDIATE" in sql for sql in spy.sql_statements)


def test_resource_repo_mutations_run_in_begin_immediate_transaction(tmp_path):
    db_path = tmp_path / "storage.db"
    connection = create_sqlite_connection(db_path)
    spy = SqlConnectionSpy(connection)
    repo = SqliteResourceRepository(spy)  # type: ignore[arg-type]

    source = StoredSource(
        id="source-alpha",
        integration_id="integration-alpha",
        name="Alpha Source",
        config={},
        vars={},
    )
    view = StoredView(
        id="view-alpha",
        name="Main View",
        layout_columns=12,
        items=[
            ViewItem(
                id="item-alpha",
                x=0,
                y=0,
                w=3,
                h=4,
                source_id="source-alpha",
                template_id="tmpl-1",
                props={},
            )
        ],
    )

    try:
        repo.save_source(source)
        repo.save_view(view)
        repo.remove_source_references_from_views("source-alpha")
        repo.delete_source("source-alpha")
        repo.delete_view("view-alpha")
    finally:
        connection.close()

    assert any("BEGIN IMMEDIATE" in sql for sql in spy.sql_statements)
