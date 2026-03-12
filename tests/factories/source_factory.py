from __future__ import annotations

from typing import Any

from core.config_loader import (
    SourceConfig,
    StepConfig,
    StepType,
)


def build_step(
    *,
    step_id: str,
    use: StepType,
    args: dict[str, Any] | None = None,
    outputs: dict[str, str] | None = None,
    secrets: dict[str, str] | None = None,
) -> StepConfig:
    return StepConfig(
        id=step_id,
        use=use,
        args=args or {},
        outputs=outputs or {},
        secrets=secrets or {},
    )


def build_source_config(
    *,
    source_id: str = "test-source",
    name: str = "Test Source",
    flow: list[StepConfig] | None = None,
) -> SourceConfig:
    return SourceConfig(
        id=source_id,
        name=name,
        description=f"{name} for tests",
        enabled=True,
        flow=flow,
    )
