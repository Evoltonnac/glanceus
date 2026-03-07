from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from core import api as api_module
from core.config_loader import AuthType
from tests.helpers.mock_runtime import (
    MockOAuthHandler,
    make_api_runtime,
    make_integration_config,
    make_stored_source,
)


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


def test_auth_status_returns_404_when_source_not_found():
    runtime = make_api_runtime(sources=[])
    client = _build_client(runtime)

    response = client.get("/api/sources/missing/auth-status")

    assert response.status_code == 404
    assert "不存在" in response.json()["detail"]


def test_auth_status_returns_error_when_auth_manager_reports_registration_issue():
    source = make_stored_source("source-with-error")
    runtime = make_api_runtime(
        sources=[source],
        source_errors={"source-with-error": "oauth registration failed"},
    )
    client = _build_client(runtime)

    response = client.get("/api/sources/source-with-error/auth-status")

    assert response.status_code == 200
    assert response.json() == {
        "source_id": "source-with-error",
        "auth_type": "none",
        "status": "error",
        "message": "oauth registration failed",
    }


def test_auth_status_returns_missing_for_oauth_without_token():
    source = make_stored_source("oauth-source", integration_id="oauth-integration")
    integration = make_integration_config("oauth-integration", AuthType.OAUTH)
    runtime = make_api_runtime(
        sources=[source],
        integrations={"oauth-integration": integration},
        oauth_handlers={"oauth-source": MockOAuthHandler(has_token=False)},
    )
    client = _build_client(runtime)

    response = client.get("/api/sources/oauth-source/auth-status")

    assert response.status_code == 200
    assert response.json() == {
        "source_id": "oauth-source",
        "auth_type": "oauth",
        "status": "missing",
        "message": "需要 OAuth 授权",
    }


def test_auth_status_returns_ok_for_oauth_with_token():
    source = make_stored_source("oauth-source-ok", integration_id="oauth-integration")
    integration = make_integration_config("oauth-integration", AuthType.OAUTH)
    runtime = make_api_runtime(
        sources=[source],
        integrations={"oauth-integration": integration},
        oauth_handlers={"oauth-source-ok": MockOAuthHandler(has_token=True)},
    )
    client = _build_client(runtime)

    response = client.get("/api/sources/oauth-source-ok/auth-status")

    assert response.status_code == 200
    assert response.json() == {
        "source_id": "oauth-source-ok",
        "auth_type": "oauth",
        "status": "ok",
    }
