from __future__ import annotations

from typing import Any

REFRESH_INTERVAL_OPTIONS_MINUTES: tuple[int, ...] = (0, 5, 30, 60, 1440)
DEFAULT_GLOBAL_REFRESH_INTERVAL_MINUTES = 30
MIN_REFRESH_INTERVAL_MINUTES = 1
MAX_REFRESH_INTERVAL_MINUTES = 7 * 24 * 60


def normalize_refresh_interval_minutes(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        if not stripped.isdigit():
            return None
        value = int(stripped)
    if not isinstance(value, int):
        return None
    if value == 0:
        return 0
    if MIN_REFRESH_INTERVAL_MINUTES <= value <= MAX_REFRESH_INTERVAL_MINUTES:
        return value
    return None


def normalize_integration_refresh_interval_minutes(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        if not stripped.isdigit():
            return None
        value = int(stripped)
    if not isinstance(value, int):
        return None
    if value < 0:
        return None
    return value


def resolve_refresh_interval_minutes(
    source_interval: Any,
    integration_interval: Any,
    global_interval: Any,
) -> tuple[int, str]:
    normalized_source = normalize_refresh_interval_minutes(source_interval)
    if normalized_source is not None:
        return normalized_source, "source"

    normalized_integration = normalize_integration_refresh_interval_minutes(
        integration_interval
    )
    if normalized_integration is not None:
        return normalized_integration, "integration"

    normalized_global = normalize_refresh_interval_minutes(global_interval)
    if normalized_global is not None:
        return normalized_global, "global"

    return DEFAULT_GLOBAL_REFRESH_INTERVAL_MINUTES, "global"
