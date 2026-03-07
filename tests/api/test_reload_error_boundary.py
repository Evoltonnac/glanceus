from __future__ import annotations

from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from core import api as api_module
from core.config_loader import AppConfig


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
