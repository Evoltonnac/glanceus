from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from core import api as api_module
from tests.helpers.mock_runtime import make_api_runtime, make_stored_source


def _build_client(runtime: dict):
    api_module.init_api(
        runtime["executor"],
        runtime["data_controller"],
        runtime["config"],
        runtime["auth_manager"],
        runtime["secrets_controller"],
        runtime["resource_manager"],
        runtime["integration_manager"],
        runtime["settings_manager"],
    )
    app = FastAPI()
    app.include_router(api_module.router)
    return TestClient(app)


def test_refresh_source_returns_409_when_integration_is_missing():
    source = make_stored_source(
        "openrouter",
        integration_id="openrouter_keys_apikey",
    )
    runtime = make_api_runtime(sources=[source], integrations={})
    client = _build_client(runtime)

    response = client.post("/api/refresh/openrouter")

    assert response.status_code == 409
    assert "openrouter_keys_apikey" in response.json()["detail"]

