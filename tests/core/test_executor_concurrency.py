from __future__ import annotations

import asyncio
from dataclasses import dataclass

import pytest

from core.config_loader import StepType
from core.executor import Executor
from core.settings_manager import SystemSettings
from core.source_state import SourceStatus
from tests.factories import build_source_config, build_step


@dataclass
class _StaticSettingsManager:
    settings: SystemSettings

    def load_settings(self) -> SystemSettings:
        return self.settings


@pytest.mark.asyncio
async def test_fetch_source_skips_duplicate_trigger_while_inflight(
    data_controller,
    secrets_controller,
    monkeypatch: pytest.MonkeyPatch,
):
    executor = Executor(
        data_controller,
        secrets_controller,
        max_concurrent_fetches=4,
    )
    source = build_source_config(
        source_id="same-source",
        flow=[build_step(step_id="noop", use=StepType.SCRIPT, args={"code": "x = 1"})],
    )

    run_count = 0

    async def fake_run_flow(_source):
        nonlocal run_count
        run_count += 1
        await asyncio.sleep(0.05)
        return {"ok": True}

    monkeypatch.setattr(executor, "_run_flow", fake_run_flow)

    await asyncio.gather(
        executor.fetch_source(source),
        executor.fetch_source(source),
    )

    assert run_count == 1
    assert data_controller.upsert.call_count == 1


@pytest.mark.asyncio
async def test_fetch_source_honors_global_concurrency_limit(
    data_controller,
    secrets_controller,
    monkeypatch: pytest.MonkeyPatch,
):
    executor = Executor(
        data_controller,
        secrets_controller,
        max_concurrent_fetches=1,
    )
    source_a = build_source_config(
        source_id="source-a",
        flow=[build_step(step_id="noop-a", use=StepType.SCRIPT, args={"code": "x = 1"})],
    )
    source_b = build_source_config(
        source_id="source-b",
        flow=[build_step(step_id="noop-b", use=StepType.SCRIPT, args={"code": "x = 1"})],
    )

    active = 0
    max_active = 0

    async def fake_run_flow(source):
        nonlocal active, max_active
        _ = source
        active += 1
        max_active = max(max_active, active)
        await asyncio.sleep(0.05)
        active -= 1
        return {"ok": True}

    monkeypatch.setattr(executor, "_run_flow", fake_run_flow)

    await asyncio.gather(
        executor.fetch_source(source_a),
        executor.fetch_source(source_b),
    )

    assert max_active == 1
    assert data_controller.upsert.call_count == 2


@pytest.mark.asyncio
async def test_concurrent_script_sources_keep_sandbox_errors_isolated(
    data_controller,
    secrets_controller,
):
    executor = Executor(
        data_controller,
        secrets_controller,
        settings_manager=_StaticSettingsManager(
            SystemSettings(script_sandbox_enabled=True, script_timeout_seconds=10),
        ),
        max_concurrent_fetches=2,
    )
    source_safe = build_source_config(
        source_id="script-safe",
        flow=[
            build_step(
                step_id="safe-script",
                use=StepType.SCRIPT,
                args={"code": "import re\nvalue = re.sub('a', 'b', 'a1')\n"},
                outputs={"value": "value"},
            ),
        ],
    )
    source_blocked = build_source_config(
        source_id="script-blocked",
        flow=[
            build_step(
                step_id="blocked-script",
                use=StepType.SCRIPT,
                args={"code": "import os\nvalue = os.getcwd()\n"},
            ),
        ],
    )

    await asyncio.gather(
        executor.fetch_source(source_safe),
        executor.fetch_source(source_blocked),
    )

    safe_state = executor.get_source_state(source_safe.id)
    blocked_state = executor.get_source_state(source_blocked.id)
    assert safe_state.status == SourceStatus.ACTIVE
    assert blocked_state.status == SourceStatus.ERROR

    data_controller.upsert.assert_called_once_with(source_safe.id, {"value": "b1"})
    error_calls = [
        call.kwargs
        for call in data_controller.set_state.call_args_list
        if call.kwargs.get("source_id") == source_blocked.id
        and call.kwargs.get("status") == SourceStatus.ERROR.value
    ]
    assert error_calls
    assert error_calls[-1]["error_code"] == "script_sandbox_blocked"


@pytest.mark.asyncio
async def test_concurrent_script_sources_keep_timeout_errors_isolated(
    data_controller,
    secrets_controller,
):
    executor = Executor(
        data_controller,
        secrets_controller,
        settings_manager=_StaticSettingsManager(
            SystemSettings(script_sandbox_enabled=False, script_timeout_seconds=1),
        ),
        max_concurrent_fetches=2,
    )
    source_timeout = build_source_config(
        source_id="script-timeout",
        flow=[
            build_step(
                step_id="timeout-script",
                use=StepType.SCRIPT,
                args={"code": "import time\ntime.sleep(2)\n"},
            ),
        ],
    )
    source_fast = build_source_config(
        source_id="script-fast",
        flow=[
            build_step(
                step_id="fast-script",
                use=StepType.SCRIPT,
                args={"code": "result = 'ok'\n"},
                outputs={"result": "result"},
            ),
        ],
    )

    await asyncio.gather(
        executor.fetch_source(source_timeout),
        executor.fetch_source(source_fast),
    )

    timeout_state = executor.get_source_state(source_timeout.id)
    fast_state = executor.get_source_state(source_fast.id)
    assert timeout_state.status == SourceStatus.ERROR
    assert fast_state.status == SourceStatus.ACTIVE

    data_controller.upsert.assert_called_once_with(source_fast.id, {"result": "ok"})
    timeout_error_calls = [
        call.kwargs
        for call in data_controller.set_state.call_args_list
        if call.kwargs.get("source_id") == source_timeout.id
        and call.kwargs.get("status") == SourceStatus.ERROR.value
    ]
    assert timeout_error_calls
    assert timeout_error_calls[-1]["error_code"] == "script_timeout_exceeded"
