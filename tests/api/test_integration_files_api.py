from __future__ import annotations

import re
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from core import api as api_module
from core.config_loader import AppConfig
from core.integration_manager import IntegrationManager
from tests.helpers.mock_runtime import make_stored_source

_ABSOLUTE_DRIVE_PATTERN = re.compile(r"^[A-Za-z]:[\\/]")


def _build_client(tmp_path, sources):
    integration_manager = IntegrationManager(config_root=str(tmp_path / "config"))
    api_module.init_api(
        executor=SimpleNamespace(get_source_state=lambda _source_id: None),
        data_controller=SimpleNamespace(),
        config=AppConfig(),
        auth_manager=SimpleNamespace(),
        secrets_controller=SimpleNamespace(),
        resource_manager=SimpleNamespace(load_sources=lambda: sources),
        integration_manager=integration_manager,
        settings_manager=None,
    )
    app = FastAPI()
    app.include_router(api_module.router)
    return TestClient(app)


def _assert_no_absolute_paths(payload):
    if isinstance(payload, dict):
        for value in payload.values():
            _assert_no_absolute_paths(value)
        return
    if isinstance(payload, list):
        for value in payload:
            _assert_no_absolute_paths(value)
        return
    if not isinstance(payload, str):
        return

    stripped = payload.strip()
    assert not stripped.startswith("/")
    assert not stripped.startswith("~/")
    assert not stripped.startswith("$HOME")
    assert _ABSOLUTE_DRIVE_PATTERN.match(stripped) is None


def test_create_and_get_integration_file_by_filename(tmp_path):
    client = _build_client(tmp_path, sources=[])

    create_resp = client.post(
        "/api/integrations/files",
        params={"filename": "new-file.yaml"},
        json={"content": ""},
    )
    assert create_resp.status_code == 200
    assert create_resp.json()["filename"] == "new-file.yaml"
    assert create_resp.json()["integration_id"] == "new-file"

    list_resp = client.get("/api/integrations/files")
    assert list_resp.status_code == 200
    assert list_resp.json() == ["new-file.yaml"]

    get_resp = client.get("/api/integrations/files/new-file.yaml")
    assert get_resp.status_code == 200
    assert get_resp.json()["filename"] == "new-file.yaml"
    assert get_resp.json()["integration_id"] == "new-file"
    assert get_resp.json()["integration_ids"] == ["new-file"]
    assert get_resp.json()["display_name"] is None
    assert "resolved_path" not in get_resp.json()
    _assert_no_absolute_paths(get_resp.json())


def test_list_integration_file_metadata_includes_name(tmp_path):
    client = _build_client(tmp_path, sources=[])
    create_resp = client.post(
        "/api/integrations/files",
        params={"filename": "github_oauth.yaml"},
        json={"content": "name: GitHub OAuth 中文名\nflow: []\n"},
    )
    assert create_resp.status_code == 200

    metadata_resp = client.get("/api/integrations/files/meta")
    assert metadata_resp.status_code == 200
    assert metadata_resp.json() == [
        {
            "filename": "github_oauth.yaml",
            "id": "github_oauth",
            "name": "GitHub OAuth 中文名",
        }
    ]


def test_get_integration_sources_matches_file_stem_id(tmp_path):
    sources = [
        make_stored_source("source-a", integration_id="multi"),
        make_stored_source("source-b", integration_id="other"),
        make_stored_source("source-c", integration_id="gamma"),
    ]
    client = _build_client(tmp_path, sources=sources)

    content = "flow: []\n"
    create_resp = client.post(
        "/api/integrations/files",
        params={"filename": "multi.yaml"},
        json={"content": content},
    )
    assert create_resp.status_code == 200

    resp = client.get("/api/integrations/files/multi.yaml/sources")
    assert resp.status_code == 200

    source_ids = sorted(item["id"] for item in resp.json())
    assert source_ids == ["source-a"]


def test_update_integration_file_reports_brace_escape_hint(tmp_path):
    client = _build_client(tmp_path, sources=[])

    create_resp = client.post(
        "/api/integrations/files",
        params={"filename": "escape.yaml"},
        json={"content": "flow: []\n"},
    )
    assert create_resp.status_code == 200

    update_resp = client.put(
        "/api/integrations/files/escape.yaml",
        json={"content": 'name: "demo \\{value}"\nflow: []\n'},
    )
    assert update_resp.status_code == 400
    detail = update_resp.json()["detail"]
    assert "Invalid YAML syntax" in detail
    assert "In YAML double-quoted strings, \\{ / \\} is invalid escaping." in detail


def test_get_integration_file_returns_logical_identifiers_only(tmp_path):
    client = _build_client(tmp_path, sources=[])
    create_resp = client.post(
        "/api/integrations/files",
        params={"filename": "logical.yaml"},
        json={"content": "name: Logical\nflow: []\n"},
    )
    assert create_resp.status_code == 200

    get_resp = client.get("/api/integrations/files/logical.yaml")
    assert get_resp.status_code == 200
    payload = get_resp.json()

    assert payload["filename"] == "logical.yaml"
    assert payload["integration_id"] == "logical"
    assert payload["integration_ids"] == ["logical"]
    assert "resolved_path" not in payload
    _assert_no_absolute_paths(payload)
