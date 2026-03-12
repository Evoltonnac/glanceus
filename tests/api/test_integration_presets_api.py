from __future__ import annotations

from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from core import api as api_module
from core.config_loader import AppConfig
from core.integration_manager import IntegrationManager


def _build_client(tmp_path):
    integration_manager = IntegrationManager(config_root=str(tmp_path / "config"))
    api_module.init_api(
        executor=SimpleNamespace(get_source_state=lambda _source_id: None),
        data_controller=SimpleNamespace(),
        config=AppConfig(),
        auth_manager=SimpleNamespace(),
        secrets_controller=SimpleNamespace(),
        resource_manager=SimpleNamespace(load_sources=lambda: []),
        integration_manager=integration_manager,
        settings_manager=None,
    )
    app = FastAPI()
    app.include_router(api_module.router)
    return TestClient(app)


def test_list_integration_presets_from_config_directory(tmp_path):
    presets_dir = tmp_path / "config" / "presets"
    presets_dir.mkdir(parents=True)

    (presets_dir / "api_key.yaml").write_text(
        """
id: api_key
label: API Key
description: API token preset
filename_hint: api_key_example
content_template: |
  name: {{display_name_single_quoted}}
""".lstrip(),
        encoding="utf-8",
    )

    (presets_dir / "oauth2.yaml").write_text(
        """
id: oauth2
label: OAuth
content_template: |
  name: {{display_name_single_quoted}}
""".lstrip(),
        encoding="utf-8",
    )

    client = _build_client(tmp_path)

    response = client.get("/api/integrations/presets")
    assert response.status_code == 200

    payload = response.json()
    assert [item["id"] for item in payload] == ["api_key", "oauth2"]
    assert payload[0]["label"] == "API Key"
    assert payload[0]["filename_hint"] == "api_key_example"
    assert payload[0]["content_template"].startswith("name:")
    assert payload[1]["label"] == "OAuth"
