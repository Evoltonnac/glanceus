from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from core import api as api_module
from core.source_state import InteractionRequest, InteractionType, SourceState, SourceStatus
from tests.helpers.mock_runtime import (
    make_api_runtime,
    make_integration_config,
    make_stored_source,
)


class _MockDeviceOAuthHandler:
    def __init__(self, *, poll_result: dict | None = None, status_result: dict | None = None):
        self._poll_result = poll_result or {"status": "pending", "retry_after": 5}
        self._status_result = status_result or {"status": "pending", "retry_after": 5}

    async def poll_device_token(self):
        return self._poll_result

    async def get_device_flow_status(self):
        return self._status_result


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


def _make_oauth_suspended_state(source_id: str) -> SourceState:
    return SourceState(
        source_id=source_id,
        status=SourceStatus.SUSPENDED,
        interaction=InteractionRequest(
            type=InteractionType.OAUTH_DEVICE_FLOW,
            source_id=source_id,
            message="Waiting for OAuth device authorization",
        ),
    )


def test_oauth_device_poll_authorized_triggers_source_resume():
    source = make_stored_source("oauth-device-source", integration_id="oauth-integration")
    integration = make_integration_config("oauth-integration", "oauth")
    handler = _MockDeviceOAuthHandler(poll_result={"status": "authorized"})
    runtime = make_api_runtime(
        sources=[source],
        integrations={"oauth-integration": integration},
        oauth_handlers={"oauth-device-source": handler},
    )

    state = _make_oauth_suspended_state("oauth-device-source")
    executor = SimpleNamespace(
        get_source_state=lambda _source_id: state,
        _update_state=MagicMock(),
        fetch_source=MagicMock(),
    )
    runtime["executor"] = executor
    client = _build_client(runtime)

    response = client.get("/api/oauth/device/poll/oauth-device-source")

    assert response.status_code == 200
    assert response.json() == {"status": "authorized"}
    executor._update_state.assert_called_once()
    executor.fetch_source.assert_called_once()
    resumed_source = executor.fetch_source.call_args.args[0]
    assert resumed_source.id == "oauth-device-source"


def test_oauth_device_status_authorized_triggers_source_resume():
    source = make_stored_source("oauth-device-source", integration_id="oauth-integration")
    integration = make_integration_config("oauth-integration", "oauth")
    handler = _MockDeviceOAuthHandler(status_result={"status": "authorized"})
    runtime = make_api_runtime(
        sources=[source],
        integrations={"oauth-integration": integration},
        oauth_handlers={"oauth-device-source": handler},
    )

    state = _make_oauth_suspended_state("oauth-device-source")
    executor = SimpleNamespace(
        get_source_state=lambda _source_id: state,
        _update_state=MagicMock(),
        fetch_source=MagicMock(),
    )
    runtime["executor"] = executor
    client = _build_client(runtime)

    response = client.get("/api/oauth/device/status/oauth-device-source")

    assert response.status_code == 200
    assert response.json() == {"status": "authorized"}
    executor._update_state.assert_called_once()
    executor.fetch_source.assert_called_once()
    resumed_source = executor.fetch_source.call_args.args[0]
    assert resumed_source.id == "oauth-device-source"


def test_oauth_device_poll_pending_does_not_trigger_source_resume():
    source = make_stored_source("oauth-device-source", integration_id="oauth-integration")
    integration = make_integration_config("oauth-integration", "oauth")
    handler = _MockDeviceOAuthHandler(poll_result={"status": "pending", "retry_after": 5})
    runtime = make_api_runtime(
        sources=[source],
        integrations={"oauth-integration": integration},
        oauth_handlers={"oauth-device-source": handler},
    )

    state = _make_oauth_suspended_state("oauth-device-source")
    executor = SimpleNamespace(
        get_source_state=lambda _source_id: state,
        _update_state=MagicMock(),
        fetch_source=MagicMock(),
    )
    runtime["executor"] = executor
    client = _build_client(runtime)

    response = client.get("/api/oauth/device/poll/oauth-device-source")

    assert response.status_code == 200
    assert response.json() == {"status": "pending", "retry_after": 5}
    executor._update_state.assert_not_called()
    executor.fetch_source.assert_not_called()


def test_oauth_device_poll_authorized_resumes_from_persisted_suspended_state():
    source = make_stored_source("oauth-device-source", integration_id="oauth-integration")
    integration = make_integration_config("oauth-integration", "oauth")
    handler = _MockDeviceOAuthHandler(poll_result={"status": "authorized"})
    runtime = make_api_runtime(
        sources=[source],
        integrations={"oauth-integration": integration},
        oauth_handlers={"oauth-device-source": handler},
    )

    # Simulate backend restart: runtime state lost (active/default), while persisted
    # state still indicates suspended OAuth device flow.
    runtime_state = SourceState(source_id="oauth-device-source", status=SourceStatus.ACTIVE)
    executor = SimpleNamespace(
        get_source_state=lambda _source_id: runtime_state,
        _update_state=MagicMock(),
        fetch_source=MagicMock(),
    )
    runtime["executor"] = executor
    runtime["data_controller"] = SimpleNamespace(
        get_latest=lambda _source_id: {
            "source_id": "oauth-device-source",
            "status": "suspended",
            "interaction": {"type": "oauth_device_flow"},
        },
    )
    client = _build_client(runtime)

    response = client.get("/api/oauth/device/poll/oauth-device-source")

    assert response.status_code == 200
    assert response.json() == {"status": "authorized"}
    executor._update_state.assert_called_once()
    executor.fetch_source.assert_called_once()
    resumed_source = executor.fetch_source.call_args.args[0]
    assert resumed_source.id == "oauth-device-source"
