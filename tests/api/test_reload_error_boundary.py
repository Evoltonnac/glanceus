from __future__ import annotations

from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from core import api as api_module
from core.config_loader import AppConfig
from core.integration_manager import IntegrationManager


def test_reload_returns_400_when_config_loader_raises(monkeypatch):
    api_module.init_api(
        executor=SimpleNamespace(),
        data_controller=SimpleNamespace(),
        config=AppConfig(),
        auth_manager=SimpleNamespace(),
        secrets_controller=SimpleNamespace(),
        resource_manager=SimpleNamespace(load_sources=lambda: []),
        integration_manager=SimpleNamespace(),
        settings_manager=None,
    )

    def _boom():
        raise RuntimeError("broken config")

    monkeypatch.setattr("core.config_loader.load_config", _boom)

    app = FastAPI()
    app.include_router(api_module.router)
    client = TestClient(app)

    response = client.post("/api/system/reload")

    assert response.status_code == 400
    assert "Configuration reload failed" in response.json()["detail"]
    assert "broken config" in response.json()["detail"]


def test_reload_updates_templates_from_external_integration_change(tmp_path, monkeypatch):
    monkeypatch.setenv("GLANCIER_DATA_DIR", str(tmp_path))
    integrations_dir = tmp_path / "config" / "integrations"
    integrations_dir.mkdir(parents=True, exist_ok=True)
    (integrations_dir / "demo.yaml").write_text("flow: []\n", encoding="utf-8")

    api_module.init_api(
        executor=SimpleNamespace(
            get_source_state=lambda _source_id: SimpleNamespace(),
            update_source_state=lambda _source_id, _state: None,
        ),
        data_controller=SimpleNamespace(),
        config=AppConfig(),
        auth_manager=SimpleNamespace(),
        secrets_controller=SimpleNamespace(),
        resource_manager=SimpleNamespace(load_sources=lambda: []),
        integration_manager=IntegrationManager(config_root=str(tmp_path / "config")),
        settings_manager=None,
    )

    app = FastAPI()
    app.include_router(api_module.router)
    client = TestClient(app)

    before_resp = client.get("/api/integrations/demo/templates")
    assert before_resp.status_code == 404

    reload_resp = client.post("/api/system/reload")
    assert reload_resp.status_code == 200

    after_resp = client.get("/api/integrations/demo/templates")
    assert after_resp.status_code == 200
    assert after_resp.json() == []
