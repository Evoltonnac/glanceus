from __future__ import annotations

import time

import pytest

from authlib.integrations.httpx_client import AsyncOAuth2Client

from core.auth.oauth_auth import OAuthAuth
from core.config_loader import AuthConfig, AuthType


def _build_code_flow_config(**overrides) -> AuthConfig:
    payload = {
        "type": AuthType.OAUTH,
        "oauth_flow": "code",
        "token_url": "https://provider.example.com/oauth/token",
        "client_id": "client-id",
        "client_secret": "client-secret",
    }
    payload.update(overrides)
    return AuthConfig(**payload)


@pytest.mark.asyncio
async def test_ensure_valid_token_refreshes_expired_token(
    secrets_controller,
    monkeypatch,
):
    refresh_called = {"count": 0}

    async def fake_refresh_token(self, url, refresh_token=None, **kwargs):
        _ = self
        _ = kwargs
        refresh_called["count"] += 1
        assert url == "https://provider.example.com/oauth/token"
        assert refresh_token == "refresh-1"
        return {
            "access_token": "refreshed-token",
            "refresh_token": "refresh-2",
            "expires_in": 3600,
        }

    monkeypatch.setattr(AsyncOAuth2Client, "refresh_token", fake_refresh_token)

    expired_token = {
        "access_token": "expired-token",
        "refresh_token": "refresh-1",
        "expires_at": int(time.time()) - 100,
    }
    secrets_controller.set_secrets("src-refresh", {"oauth_secrets": expired_token})

    handler = OAuthAuth(_build_code_flow_config(), "src-refresh", secrets_controller)
    await handler.ensure_valid_token()

    assert refresh_called["count"] == 1
    all_secrets = secrets_controller.get_secrets("src-refresh")
    persisted = all_secrets["oauth_secrets"]
    assert persisted["access_token"] == "refreshed-token"
    assert persisted["refresh_token"] == "refresh-2"
    assert persisted["expires_at"] > int(time.time())
    assert "access_token" not in all_secrets


@pytest.mark.asyncio
async def test_try_refresh_token_returns_false_without_refresh_token(secrets_controller):
    secrets_controller.set_secrets(
        "src-no-refresh",
        {"oauth_secrets": {"access_token": "only-access", "expires_at": int(time.time()) - 10}},
    )
    handler = OAuthAuth(_build_code_flow_config(), "src-no-refresh", secrets_controller)
    refreshed = await handler.try_refresh_token(force=True)
    assert refreshed is False


@pytest.mark.asyncio
async def test_try_refresh_token_force_updates_token_and_returns_true(
    secrets_controller,
    monkeypatch,
):
    async def fake_refresh_token(self, url, refresh_token=None, **kwargs):
        _ = self
        _ = kwargs
        assert url == "https://provider.example.com/oauth/token"
        assert refresh_token == "refresh-force-1"
        return {
            "access_token": "force-refreshed-token",
            "refresh_token": "refresh-force-2",
            "expires_in": 3600,
        }

    monkeypatch.setattr(AsyncOAuth2Client, "refresh_token", fake_refresh_token)

    secrets_controller.set_secrets(
        "src-force-refresh",
        {
            "oauth_secrets": {
                "access_token": "force-expired-token",
                "refresh_token": "refresh-force-1",
                "expires_at": int(time.time()) - 100,
            }
        },
    )

    handler = OAuthAuth(_build_code_flow_config(), "src-force-refresh", secrets_controller)
    refreshed = await handler.try_refresh_token(force=True)

    assert refreshed is True
    persisted = secrets_controller.get_secrets("src-force-refresh")["oauth_secrets"]
    assert persisted["access_token"] == "force-refreshed-token"
    assert persisted["refresh_token"] == "refresh-force-2"
