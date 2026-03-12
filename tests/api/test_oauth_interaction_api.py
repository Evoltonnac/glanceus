from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from core import api as api_module
from tests.helpers.mock_runtime import (
    make_api_runtime,
    make_integration_config,
    make_stored_source,
)


class _MockOAuthInteractionHandler:
    def __init__(self) -> None:
        self.config = SimpleNamespace(authorization_code_field="auth_code")
        self.exchange_calls: list[tuple[str, str | None]] = []
        self.saved_implicit_tokens: list[dict] = []

    async def exchange_code(self, code: str, redirect_uri: str | None = None) -> None:
        self.exchange_calls.append((code, redirect_uri))

    def build_implicit_token_payload(self, data: dict) -> dict:
        payload_data = data.get("oauth_payload")
        payload = dict(payload_data) if isinstance(payload_data, dict) else {}
        provider_token = payload.get("provider_token")
        if provider_token:
            payload["access_token"] = provider_token
        return payload

    def store_implicit_token(self, payload: dict) -> None:
        self.saved_implicit_tokens.append(payload)


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


def test_interact_oauth_code_exchange_supports_custom_code_field():
    source = make_stored_source("oauth-source", integration_id="oauth-integration")
    integration = make_integration_config("oauth-integration", "oauth")
    handler = _MockOAuthInteractionHandler()
    runtime = make_api_runtime(
        sources=[source],
        integrations={"oauth-integration": integration},
        oauth_handlers={"oauth-source": handler},
    )
    runtime["executor"] = SimpleNamespace(
        get_source_state=lambda _source_id: SimpleNamespace(interaction=None),
        _update_state=MagicMock(),
        fetch_source=MagicMock(),
    )
    client = _build_client(runtime)

    response = client.post(
        "/api/sources/oauth-source/interact",
        json={
            "type": "oauth_code_exchange",
            "auth_code": "code-xyz",
            "redirect_uri": "http://localhost:5173/oauth/callback/oauth-source",
        },
    )

    assert response.status_code == 200
    assert handler.exchange_calls == [
        ("code-xyz", "http://localhost:5173/oauth/callback/oauth-source")
    ]
    runtime["executor"].fetch_source.assert_called_once()


def test_interact_oauth_implicit_token_supports_payload_builder_without_access_token_field():
    source = make_stored_source("oauth-source", integration_id="oauth-integration")
    integration = make_integration_config("oauth-integration", "oauth")
    handler = _MockOAuthInteractionHandler()
    runtime = make_api_runtime(
        sources=[source],
        integrations={"oauth-integration": integration},
        oauth_handlers={"oauth-source": handler},
    )
    runtime["executor"] = SimpleNamespace(
        get_source_state=lambda _source_id: SimpleNamespace(interaction=None),
        _update_state=MagicMock(),
        fetch_source=MagicMock(),
    )
    client = _build_client(runtime)

    response = client.post(
        "/api/sources/oauth-source/interact",
        json={
            "type": "oauth_implicit_token",
            "oauth_payload": {
                "provider_token": "tok-xyz",
                "token_type": "Bearer",
                "expires_in": "3600",
            },
        },
    )

    assert response.status_code == 200
    assert handler.saved_implicit_tokens
    assert handler.saved_implicit_tokens[0]["access_token"] == "tok-xyz"
    runtime["executor"].fetch_source.assert_called_once()
