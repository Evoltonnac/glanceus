from __future__ import annotations

from typing import Any

from core.data_controller import DataController


class _StubRuntimeStore:
    def __init__(self):
        self.latest_by_source: dict[str, dict[str, Any]] = {}
        self.retry_calls: list[tuple[str, dict[str, Any] | None]] = []
        self.clear_calls: list[str] = []
        self.state_calls: list[tuple[str, str, str | None]] = []

    def upsert(self, source_id: str, data: dict[str, Any]) -> None:
        self.latest_by_source[source_id] = {"source_id": source_id, "data": data}

    def set_error(self, source_id: str, error: str) -> None:
        self.latest_by_source[source_id] = {"source_id": source_id, "error": error}

    def set_state(
        self,
        source_id: str,
        status: str,
        message: str | None = None,
        interaction: dict[str, Any] | None = None,
        error: str | None = None,
        error_code: str | None = None,
    ) -> None:
        self.state_calls.append((source_id, status, message))
        self.latest_by_source[source_id] = {
            "source_id": source_id,
            "status": status,
            "message": message,
            "interaction": interaction,
            "error": error,
            "error_code": error_code,
        }

    def set_retry_metadata(self, source_id: str, metadata: dict[str, Any] | None) -> None:
        self.retry_calls.append((source_id, metadata))

    def clear_retry_metadata(self, source_id: str) -> None:
        self.retry_calls.append((source_id, None))

    def get_latest(self, source_id: str) -> dict[str, Any] | None:
        return self.latest_by_source.get(source_id)

    def get_all_latest(self) -> list[dict[str, Any]]:
        return list(self.latest_by_source.values())

    def get_history(self, source_id: str, limit: int = 100) -> list[dict[str, Any]]:
        return []

    def clear_source(self, source_id: str) -> None:
        self.clear_calls.append(source_id)
        self.latest_by_source.pop(source_id, None)


def test_data_controller_delegates_runtime_operations():
    runtime_store = _StubRuntimeStore()
    controller = DataController(runtime_store=runtime_store)

    controller.upsert("source-alpha", {"value": 1})
    controller.set_state("source-alpha", "active", "ok")

    latest = controller.get_latest("source-alpha")
    assert latest is not None
    assert latest["source_id"] == "source-alpha"
    assert latest["status"] == "active"
    assert latest["message"] == "ok"
    assert len(controller.get_all_latest()) == 1

    controller.clear_source("source-alpha")
    assert runtime_store.clear_calls == ["source-alpha"]
    assert controller.get_latest("source-alpha") is None


def test_data_controller_preserves_retry_metadata_methods():
    runtime_store = _StubRuntimeStore()
    controller = DataController(runtime_store=runtime_store)

    controller.set_retry_metadata("source-alpha", {"attempt": 2})
    controller.clear_retry_metadata("source-alpha")

    assert runtime_store.retry_calls == [
        ("source-alpha", {"attempt": 2}),
        ("source-alpha", None),
    ]
