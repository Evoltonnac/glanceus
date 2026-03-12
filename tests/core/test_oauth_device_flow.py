from __future__ import annotations

import pytest
import httpx

from core.auth.oauth_auth import OAuthAuth
from core.config_loader import AuthConfig, AuthType


def _build_device_config(**overrides) -> AuthConfig:
    payload = {
        "type": AuthType.OAUTH,
        "oauth_flow": "device",
        "token_url": "https://provider.example.com/oauth/token",
        "device_authorization_url": "https://provider.example.com/oauth/device",
        "client_id": "client-id",
        "client_secret": "client-secret",
        "token_endpoint_auth_method": "client_secret_post",
    }
    payload.update(overrides)
    return AuthConfig(**payload)


@pytest.mark.asyncio
async def test_start_device_flow_persists_device_state(secrets_controller, monkeypatch):
    async def fake_post(self, url, data=None, **kwargs):
        _ = kwargs
        assert url == "https://provider.example.com/oauth/device"
        assert data["client_id"] == "client-id"
        request = httpx.Request("POST", url)
        return httpx.Response(
            200,
            json={
                "device_code": "dev-code",
                "user_code": "ABCD-EFGH",
                "verification_uri": "https://provider.example.com/activate",
                "interval": 5,
                "expires_in": 600,
            },
            request=request,
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    handler = OAuthAuth(_build_device_config(), "src-device", secrets_controller)
    result = await handler.start_device_flow()
    assert result["device_code"] == "dev-code"
    assert result["user_code"] == "ABCD-EFGH"
    assert result["interval"] == 5
    assert "oauth_device" in secrets_controller.get_secrets("src-device")


@pytest.mark.asyncio
async def test_poll_device_token_handles_pending_and_success(secrets_controller, monkeypatch):
    queue = [
        httpx.Response(
            400,
            json={"error": "authorization_pending"},
            request=httpx.Request("POST", "https://provider.example.com/oauth/token"),
        ),
        httpx.Response(
            200,
            json={"access_token": "device-token", "token_type": "Bearer", "expires_in": 3600},
            request=httpx.Request("POST", "https://provider.example.com/oauth/token"),
        ),
    ]

    async def fake_post(self, url, data=None, **kwargs):
        _ = self
        _ = kwargs
        assert url == "https://provider.example.com/oauth/token"
        assert data["grant_type"] == "urn:ietf:params:oauth:grant-type:device_code"
        return queue.pop(0)

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    handler = OAuthAuth(_build_device_config(), "src-device", secrets_controller)
    handler._save_device_state(
        {
            "device_code": "dev-code",
            "interval": 3,
            "expires_at": 9999999999,
        }
    )

    pending = await handler.poll_device_token()
    assert pending == {"status": "pending", "retry_after": 3}
    success = await handler.poll_device_token()
    assert success == {"status": "authorized"}
    assert secrets_controller.get_secrets("src-device")["oauth_secrets"]["access_token"] == "device-token"


@pytest.mark.asyncio
async def test_poll_device_token_treats_200_error_payload_as_pending(secrets_controller, monkeypatch):
    queue = [
        httpx.Response(
            200,
            json={"error": "authorization_pending"},
            request=httpx.Request("POST", "https://provider.example.com/oauth/token"),
        ),
        httpx.Response(
            200,
            json={"access_token": "device-token", "token_type": "Bearer", "expires_in": 3600},
            request=httpx.Request("POST", "https://provider.example.com/oauth/token"),
        ),
    ]

    async def fake_post(self, url, data=None, **kwargs):
        _ = self
        _ = kwargs
        assert url == "https://provider.example.com/oauth/token"
        assert data["grant_type"] == "urn:ietf:params:oauth:grant-type:device_code"
        return queue.pop(0)

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    handler = OAuthAuth(_build_device_config(), "src-device", secrets_controller)
    handler._save_device_state(
        {
            "device_code": "dev-code",
            "interval": 5,
            "expires_at": 9999999999,
        }
    )

    first = await handler.poll_device_token()
    assert first == {"status": "pending", "retry_after": 5}
    assert "oauth_device" in secrets_controller.get_secrets("src-device")

    second = await handler.poll_device_token()
    assert second == {"status": "authorized"}
    stored = secrets_controller.get_secrets("src-device")
    assert stored["oauth_secrets"]["access_token"] == "device-token"
    assert "oauth_device" not in stored


@pytest.mark.asyncio
async def test_poll_device_token_rejects_200_payload_without_access_token(
    secrets_controller,
    monkeypatch,
):
    async def fake_post(self, url, data=None, **kwargs):
        _ = self
        _ = kwargs
        assert url == "https://provider.example.com/oauth/token"
        assert data["grant_type"] == "urn:ietf:params:oauth:grant-type:device_code"
        return httpx.Response(
            200,
            json={"token_type": "Bearer"},
            request=httpx.Request("POST", "https://provider.example.com/oauth/token"),
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    handler = OAuthAuth(_build_device_config(), "src-device", secrets_controller)
    handler._save_device_state(
        {
            "device_code": "dev-code",
            "interval": 5,
            "expires_at": 9999999999,
        }
    )

    result = await handler.poll_device_token()
    assert result["status"] == "error"
    assert result["error"] == "invalid_token_response"
    stored = secrets_controller.get_secrets("src-device")
    assert "oauth_device" in stored
    assert "oauth_secrets" not in stored


@pytest.mark.asyncio
async def test_poll_device_token_supports_form_urlencoded_payloads(
    secrets_controller,
    monkeypatch,
):
    queue = [
        httpx.Response(
            200,
            headers={"content-type": "application/x-www-form-urlencoded"},
            text="error=authorization_pending&error_description=waiting+for+user",
            request=httpx.Request("POST", "https://provider.example.com/oauth/token"),
        ),
        httpx.Response(
            200,
            headers={"content-type": "application/x-www-form-urlencoded"},
            text="access_token=device-token&token_type=bearer&scope=read%2Cwrite",
            request=httpx.Request("POST", "https://provider.example.com/oauth/token"),
        ),
    ]

    async def fake_post(self, url, data=None, **kwargs):
        _ = self
        _ = kwargs
        assert url == "https://provider.example.com/oauth/token"
        assert data["grant_type"] == "urn:ietf:params:oauth:grant-type:device_code"
        return queue.pop(0)

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    handler = OAuthAuth(_build_device_config(), "src-device", secrets_controller)
    handler._save_device_state(
        {
            "device_code": "dev-code",
            "interval": 5,
            "expires_at": 9999999999,
        }
    )

    first = await handler.poll_device_token()
    assert first == {"status": "pending", "retry_after": 5}
    second = await handler.poll_device_token()
    assert second == {"status": "authorized"}

    stored = secrets_controller.get_secrets("src-device")
    assert stored["oauth_secrets"]["access_token"] == "device-token"
    assert stored["oauth_secrets"]["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_poll_device_token_uses_provider_interval_from_error_payload(
    secrets_controller,
    monkeypatch,
):
    async def fake_post(self, url, data=None, **kwargs):
        _ = self
        _ = kwargs
        assert url == "https://provider.example.com/oauth/token"
        assert data["grant_type"] == "urn:ietf:params:oauth:grant-type:device_code"
        return httpx.Response(
            200,
            headers={"content-type": "application/x-www-form-urlencoded"},
            text="error=authorization_pending&interval=11",
            request=httpx.Request("POST", "https://provider.example.com/oauth/token"),
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    handler = OAuthAuth(_build_device_config(), "src-device", secrets_controller)
    handler._save_device_state(
        {
            "device_code": "dev-code",
            "interval": 5,
            "expires_at": 9999999999,
        }
    )

    result = await handler.poll_device_token()
    assert result == {"status": "pending", "retry_after": 11}
    saved = secrets_controller.get_secrets("src-device")["oauth_device"]
    assert saved["interval"] == 11


@pytest.mark.asyncio
async def test_get_device_flow_status_does_not_auto_poll_pending_state(
    secrets_controller,
    monkeypatch,
):
    handler = OAuthAuth(_build_device_config(), "src-device", secrets_controller)
    handler._save_device_state(
        {
            "device_code": "dev-code",
            "user_code": "ABCD-EFGH",
            "verification_uri": "https://provider.example.com/activate",
            "interval": 5,
            "expires_at": 9999999999,
        }
    )
    handler._save_device_flow_status("pending", {"retry_after": 5})

    async def should_not_be_called():
        raise AssertionError("poll_device_token should not be called by get_device_flow_status")

    monkeypatch.setattr(handler, "poll_device_token", should_not_be_called)

    result = await handler.get_device_flow_status()
    assert result["status"] == "pending"
    assert result["retry_after"] == 5
    assert result["device"]["device_code"] == "dev-code"


@pytest.mark.asyncio
async def test_has_token_reflects_external_secret_clear_and_status_not_stale(
    secrets_controller,
):
    handler = OAuthAuth(_build_device_config(), "src-device", secrets_controller)
    secrets_controller.set_secrets(
        "src-device",
        {"oauth_secrets": {"access_token": "token-abc", "token_type": "Bearer"}},
    )
    assert handler.has_token is True

    secrets_controller.delete_secret("src-device", "oauth_secrets")
    assert handler.has_token is False

    handler._save_device_state(
        {
            "device_code": "dev-code",
            "user_code": "ABCD-EFGH",
            "verification_uri": "https://provider.example.com/activate",
            "interval": 5,
            "expires_at": 9999999999,
        }
    )
    status = await handler.get_device_flow_status()
    assert status["status"] == "pending"


@pytest.mark.asyncio
async def test_start_device_flow_supports_custom_field_names(secrets_controller, monkeypatch):
    async def fake_post(self, url, data=None, **kwargs):
        _ = kwargs
        assert url == "https://provider.example.com/oauth/device"
        assert data["client_id"] == "client-id"
        request = httpx.Request("POST", url)
        return httpx.Response(
            200,
            json={
                "dev_code": "dev-code",
                "user_pin": "ABCD-EFGH",
                "verify_url": "https://provider.example.com/activate",
                "poll_after": 7,
                "ttl": 660,
            },
            request=request,
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    handler = OAuthAuth(
        _build_device_config(
            device_code_field="dev_code",
            device_user_code_field="user_pin",
            device_verification_uri_field="verify_url",
            device_interval_field="poll_after",
            device_expires_in_field="ttl",
        ),
        "src-device",
        secrets_controller,
    )
    result = await handler.start_device_flow()
    assert result["device_code"] == "dev-code"
    assert result["user_code"] == "ABCD-EFGH"
    assert result["verification_uri"] == "https://provider.example.com/activate"
    assert result["interval"] == 7
    assert result["expires_in"] == 660


@pytest.mark.asyncio
async def test_poll_device_token_supports_custom_error_and_token_fields(
    secrets_controller,
    monkeypatch,
):
    queue = [
        httpx.Response(
            200,
            json={"err": "authorization_pending", "retry_in": 9},
            request=httpx.Request("POST", "https://provider.example.com/oauth/token"),
        ),
        httpx.Response(
            200,
            json={"oauth_access": "device-token", "token_type": "Bearer"},
            request=httpx.Request("POST", "https://provider.example.com/oauth/token"),
        ),
    ]

    async def fake_post(self, url, data=None, **kwargs):
        _ = self
        _ = kwargs
        assert url == "https://provider.example.com/oauth/token"
        assert data["grant_type"] == "urn:ietf:params:oauth:grant-type:device_code"
        assert data["dev_code"] == "dev-code"
        return queue.pop(0)

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    handler = OAuthAuth(
        _build_device_config(
            device_code_field="dev_code",
            device_interval_field="retry_in",
            oauth_error_field="err",
            oauth_error_description_field="err_desc",
            token_field="oauth_access",
        ),
        "src-device",
        secrets_controller,
    )
    handler._save_device_state(
        {
            "dev_code": "dev-code",
            "retry_in": 5,
            "expires_at": 9999999999,
        }
    )

    first = await handler.poll_device_token()
    assert first == {"status": "pending", "retry_after": 9}
    second = await handler.poll_device_token()
    assert second == {"status": "authorized"}
    stored = secrets_controller.get_secrets("src-device")["oauth_secrets"]
    assert stored["access_token"] == "device-token"
