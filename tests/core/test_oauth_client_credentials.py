from __future__ import annotations

import pytest
import httpx

from authlib.integrations.httpx_client import AsyncOAuth2Client

from core.auth.oauth_auth import OAuthAuth
from core.config_loader import AuthConfig, AuthType


def _build_client_credentials_config(**overrides) -> AuthConfig:
    payload = {
        "type": AuthType.OAUTH,
        "oauth_flow": "client_credentials",
        "token_url": "https://provider.example.com/oauth/token",
        "client_id": "client-id",
        "client_secret": "client-secret",
        "scopes": ["read:data"],
    }
    payload.update(overrides)
    return AuthConfig(**payload)


@pytest.mark.asyncio
async def test_ensure_valid_token_fetches_client_credentials_token(
    secrets_controller,
    monkeypatch,
):
    calls: list[dict[str, object]] = []

    async def fake_fetch_token(self, **kwargs):
        _ = self
        calls.append(kwargs)
        return {"access_token": "cc-token", "token_type": "Bearer", "expires_in": 1200}

    monkeypatch.setattr(AsyncOAuth2Client, "fetch_token", fake_fetch_token)

    handler = OAuthAuth(_build_client_credentials_config(), "src-cc", secrets_controller)
    await handler.ensure_valid_token()

    assert handler.has_token is True
    stored = secrets_controller.get_secrets("src-cc")["oauth_secrets"]
    assert stored["access_token"] == "cc-token"
    assert calls[0]["grant_type"] == "client_credentials"


@pytest.mark.asyncio
async def test_start_authorization_client_credentials_returns_authorized_status(
    secrets_controller,
    monkeypatch,
):
    async def fake_fetch_token(self, **kwargs):
        _ = self
        _ = kwargs
        return {"access_token": "cc-token", "token_type": "Bearer", "expires_in": 1200}

    monkeypatch.setattr(AsyncOAuth2Client, "fetch_token", fake_fetch_token)

    handler = OAuthAuth(_build_client_credentials_config(), "src-cc", secrets_controller)
    result = await handler.start_authorization()
    assert result["flow"] == "client_credentials"
    assert result["status"] == "authorized"


@pytest.mark.asyncio
async def test_client_credentials_json_body_request_type_posts_json_payload(
    secrets_controller,
    monkeypatch,
):
    async def fake_post(self, url, data=None, json=None, headers=None, **kwargs):
        _ = self
        _ = kwargs
        assert url == "https://provider.example.com/oauth/token"
        assert data is None
        assert json is not None
        assert json["grant_type"] == "client_credentials"
        assert json["scope"] == "read:data"
        assert headers is not None
        assert headers.get("Accept") == "application/json"
        request = httpx.Request("POST", url)
        return httpx.Response(
            200,
            json={"access_token": "cc-token-json", "token_type": "Bearer", "expires_in": 900},
            request=request,
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    handler = OAuthAuth(
        _build_client_credentials_config(token_request_type="json_body"),
        "src-cc-json",
        secrets_controller,
    )
    token = await handler.fetch_client_credentials_token()

    assert token["access_token"] == "cc-token-json"
    stored = secrets_controller.get_secrets("src-cc-json")["oauth_secrets"]
    assert stored["access_token"] == "cc-token-json"
