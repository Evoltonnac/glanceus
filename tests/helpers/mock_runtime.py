from __future__ import annotations

from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any

from core.config_loader import IntegrationConfig, StepConfig, StepType
from core.models import StoredSource


def make_stored_source(
    source_id: str,
    *,
    integration_id: str = "demo",
    config: dict[str, Any] | None = None,
) -> StoredSource:
    return StoredSource(
        id=source_id,
        integration_id=integration_id,
        name=f"{source_id}-name",
        config=config or {},
        vars={},
    )


@dataclass
class MockResourceManager:
    sources: list[StoredSource]

    def load_sources(self) -> list[StoredSource]:
        return self.sources


class MockConfig:
    def __init__(self, integrations: dict[str, IntegrationConfig] | None = None):
        self._integrations = integrations or {}

    def get_integration(self, integration_id: str):
        return self._integrations.get(integration_id)


class MockOAuthHandler:
    def __init__(self, has_token: bool):
        self._has_token = has_token

    @property
    def has_token(self) -> bool:
        return self._has_token


class MockAuthManager:
    def __init__(
        self,
        *,
        source_errors: dict[str, str] | None = None,
        oauth_handlers: dict[str, Any] | None = None,
    ):
        self._source_errors = source_errors or {}
        self._oauth_handlers = oauth_handlers or {}

    def get_source_error(self, source_id: str):
        return self._source_errors.get(source_id)

    def get_oauth_handler(self, source_id: str):
        return self._oauth_handlers.get(source_id)


def make_integration_config(integration_id: str, auth_type: str = "none") -> IntegrationConfig:
    flow = []
    if auth_type != "none":
        flow.append(StepConfig(id="auth", use=StepType(auth_type)))
    return IntegrationConfig(id=integration_id, flow=flow)


def make_api_runtime(
    *,
    sources: list[StoredSource],
    integrations: dict[str, IntegrationConfig] | None = None,
    source_errors: dict[str, str] | None = None,
    oauth_handlers: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "executor": SimpleNamespace(get_source_state=lambda _source_id: None),
        "data_controller": SimpleNamespace(),
        "config": MockConfig(integrations),
        "auth_manager": MockAuthManager(
            source_errors=source_errors,
            oauth_handlers=oauth_handlers,
        ),
        "secrets_controller": SimpleNamespace(),
        "resource_manager": MockResourceManager(sources),
        "integration_manager": SimpleNamespace(),
        "settings_manager": None,
    }
