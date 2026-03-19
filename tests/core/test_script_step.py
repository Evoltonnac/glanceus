from __future__ import annotations

import os

import pytest

from core.config_loader import StepType
from core.executor import Executor
from core.source_state import SourceStatus
from core.settings_manager import SystemSettings
from tests.factories import build_source_config, build_step


class _StaticSettingsManager:
    def __init__(self, settings: SystemSettings):
        self._settings = settings

    def load_settings(self) -> SystemSettings:
        return self._settings


def _error_code_calls(data_controller):
    return [
        call.kwargs
        for call in data_controller.set_state.call_args_list
        if call.kwargs.get("status") == SourceStatus.ERROR.value
    ]


@pytest.mark.asyncio
async def test_script_timeout_emits_deterministic_error_code(
    data_controller,
    secrets_controller,
):
    executor = Executor(
        data_controller,
        secrets_controller,
        settings_manager=_StaticSettingsManager(
            SystemSettings(script_timeout_seconds=1),
        ),
    )
    source = build_source_config(
        source_id="script-timeout",
        flow=[
            build_step(
                step_id="script",
                use=StepType.SCRIPT,
                args={
                    "code": (
                        "import time\n"
                        "time.sleep(2)\n"
                    ),
                },
            ),
        ],
    )

    await executor.fetch_source(source)

    state = executor.get_source_state(source.id)
    assert state.status == SourceStatus.ERROR
    error_calls = _error_code_calls(data_controller)
    assert error_calls
    assert error_calls[-1]["error_code"] == "script_timeout_exceeded"


@pytest.mark.asyncio
async def test_script_sandbox_blocks_dangerous_import(
    data_controller,
    secrets_controller,
):
    executor = Executor(
        data_controller,
        secrets_controller,
        settings_manager=_StaticSettingsManager(
            SystemSettings(script_sandbox_enabled=True, script_timeout_seconds=10),
        ),
    )
    source = build_source_config(
        source_id="script-sandbox-on",
        flow=[
            build_step(
                step_id="script",
                use=StepType.SCRIPT,
                args={"code": "import os\nvalue = os.getcwd()\n"},
            ),
        ],
    )

    await executor.fetch_source(source)

    state = executor.get_source_state(source.id)
    assert state.status == SourceStatus.ERROR
    error_calls = _error_code_calls(data_controller)
    assert error_calls
    assert error_calls[-1]["error_code"] == "script_sandbox_blocked"


@pytest.mark.asyncio
async def test_script_sandbox_disabled_preserves_existing_import_behavior(
    data_controller,
    secrets_controller,
):
    executor = Executor(
        data_controller,
        secrets_controller,
        settings_manager=_StaticSettingsManager(
            SystemSettings(script_sandbox_enabled=False, script_timeout_seconds=10),
        ),
    )
    source = build_source_config(
        source_id="script-sandbox-off",
        flow=[
            build_step(
                step_id="script",
                use=StepType.SCRIPT,
                args={"code": "import os\nplatform_name = os.name\n"},
                outputs={"platform_name": "platform_name"},
            ),
        ],
    )

    await executor.fetch_source(source)

    state = executor.get_source_state(source.id)
    assert state.status == SourceStatus.ACTIVE
    data_controller.upsert.assert_called_once_with(source.id, {"platform_name": os.name})
