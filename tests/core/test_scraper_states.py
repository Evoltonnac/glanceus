from __future__ import annotations

import pytest

from core.config_loader import StepType
from core.executor import InvalidCredentialsError
from core.source_state import InteractionType, SourceStatus
from tests.factories import build_source_config, build_step


@pytest.mark.asyncio
async def test_webscraper_403_or_captcha_maps_to_suspended(executor, monkeypatch):
    source = build_source_config(
        source_id="webscraper-blocked",
        name="WebScraper Blocked Source",
        flow=[
            build_step(
                step_id="webview",
                use=StepType.WEBVIEW,
                args={
                    "url": "https://example.com/login",
                    "intercept_api": "/dashboard",
                    "script": "",
                },
            )
        ],
    )

    async def raise_blocked_error(_source):
        raise RuntimeError("403 forbidden: captcha challenge required")

    monkeypatch.setattr(executor, "_run_flow", raise_blocked_error)

    await executor.fetch_source(source)

    state = executor.get_source_state(source.id)
    assert state.status == SourceStatus.SUSPENDED
    assert state.interaction is not None
    assert state.interaction.type == InteractionType.WEBVIEW_SCRAPE
    assert state.interaction.data is not None
    assert state.interaction.data["force_foreground"] is True
    assert state.interaction.data["manual_only"] is True


@pytest.mark.asyncio
async def test_invalid_credentials_maps_to_error_with_reentry_interaction(
    executor,
    monkeypatch,
):
    source = build_source_config(
        source_id="invalid-creds",
        name="Invalid Credentials Source",
        flow=[
            build_step(
                step_id="auth",
                use=StepType.API_KEY,
                args={"label": "API Key"},
                secrets={"api_key": "api_key"},
            )
        ],
    )

    async def raise_invalid_credentials(_source):
        raise InvalidCredentialsError(
            source_id=source.id,
            step_id="fetch",
            message="401 unauthorized",
            status_code=401,
        )

    monkeypatch.setattr(executor, "_run_flow", raise_invalid_credentials)

    await executor.fetch_source(source)

    state = executor.get_source_state(source.id)
    assert state.status == SourceStatus.ERROR
    assert state.interaction is not None
    assert state.interaction.type == InteractionType.INPUT_TEXT
    assert state.interaction.fields
    assert state.interaction.fields[0].key == "api_key"


@pytest.mark.asyncio
async def test_missing_config_maps_to_suspended(executor):
    source = build_source_config(
        source_id="missing-config",
        name="Missing Config Source",
        flow=[
            build_step(
                step_id="auth",
                use=StepType.API_KEY,
                args={"label": "API Key"},
                secrets={"api_key": "api_key"},
            )
        ],
    )

    await executor.fetch_source(source)

    state = executor.get_source_state(source.id)
    assert state.status == SourceStatus.SUSPENDED
    assert state.interaction is not None
    assert state.interaction.type == InteractionType.INPUT_TEXT
