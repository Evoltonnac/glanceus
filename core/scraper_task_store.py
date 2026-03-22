"""
In-memory scraper task lifecycle store for backend-owned webview orchestration.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from threading import RLock
from typing import Any
from uuid import uuid4

logger = logging.getLogger(__name__)

ScraperTaskStatus = str
_ACTIVE_STATUSES = {"pending", "claimed", "running"}
_TERMINAL_STATUSES = {"completed", "failed"}


class ScraperTaskStore:
    """In-memory lifecycle store for webview scraper tasks."""

    def __init__(
        self,
        path: str | Path | None = None,
        *,
        now_fn=None,
    ) -> None:
        # Keep path for constructor compatibility, but queue state is memory-only.
        self.path = Path(path) if path is not None else None
        self._lock = RLock()
        self._now_fn = now_fn or time.time
        self._tasks_by_id: dict[str, dict[str, Any]] = {}

    def _now(self) -> float:
        return float(self._now_fn())

    def _normalize_task(self, task: dict[str, Any]) -> dict[str, Any]:
        now = self._now()
        normalized = dict(task)
        normalized.setdefault("task_id", "")
        normalized.setdefault("source_id", "")
        normalized.setdefault("step_id", "webview")
        normalized.setdefault("url", "")
        normalized.setdefault("script", "")
        normalized.setdefault("intercept_api", "")
        normalized.setdefault("secret_key", "webview_data")
        normalized.setdefault("status", "pending")
        normalized.setdefault("attempt_count", 0)
        normalized.setdefault("lease_owner", None)
        normalized.setdefault("lease_expires_at", None)
        normalized.setdefault("created_at", now)
        normalized.setdefault("updated_at", now)
        normalized.setdefault("completed_at", None)
        normalized.setdefault("failed_at", None)
        normalized.setdefault("last_error", None)
        normalized.setdefault("last_attempt", 0)
        return normalized

    def _copy_task(self, task: dict[str, Any] | None) -> dict[str, Any] | None:
        return dict(task) if isinstance(task, dict) else None

    def _release_expired_leases_locked(self) -> None:
        now = self._now()
        for task in self._tasks_by_id.values():
            if task.get("status") not in {"claimed", "running"}:
                continue
            lease_expires_at = task.get("lease_expires_at")
            if isinstance(lease_expires_at, (int, float)) and lease_expires_at <= now:
                task["status"] = "pending"
                task["lease_owner"] = None
                task["lease_expires_at"] = None
                task["updated_at"] = now

    def _find_active_task_for_source_locked(
        self,
        source_id: str,
        step_id: str,
    ) -> dict[str, Any] | None:
        candidates = [
            task
            for task in self._tasks_by_id.values()
            if task.get("source_id") == source_id
            and task.get("step_id") == step_id
            and task.get("status") in _ACTIVE_STATUSES
        ]
        if not candidates:
            return None
        return min(candidates, key=lambda item: float(item.get("created_at", 0)))

    def upsert_pending_task(
        self,
        *,
        source_id: str,
        step_id: str,
        url: str,
        script: str | None,
        intercept_api: str | None,
        secret_key: str,
    ) -> dict[str, Any]:
        with self._lock:
            self._release_expired_leases_locked()

            existing = self._find_active_task_for_source_locked(source_id, step_id)
            now = self._now()
            if existing is not None:
                existing["url"] = url
                existing["script"] = script or ""
                existing["intercept_api"] = intercept_api or ""
                existing["secret_key"] = secret_key or "webview_data"
                if existing.get("status") == "pending":
                    existing["lease_owner"] = None
                    existing["lease_expires_at"] = None
                existing["updated_at"] = now
                return self._copy_task(existing)  # type: ignore[return-value]

            task_id = f"scraper-{uuid4().hex}"
            record = {
                "task_id": task_id,
                "source_id": source_id,
                "step_id": step_id,
                "url": url,
                "script": script or "",
                "intercept_api": intercept_api or "",
                "secret_key": secret_key or "webview_data",
                "status": "pending",
                "attempt_count": 0,
                "lease_owner": None,
                "lease_expires_at": None,
                "created_at": now,
                "updated_at": now,
                "completed_at": None,
                "failed_at": None,
                "last_error": None,
                "last_attempt": 0,
            }
            self._tasks_by_id[task_id] = record
            return self._copy_task(record)  # type: ignore[return-value]

    def claim_next_task(
        self,
        *,
        worker_id: str,
        lease_seconds: int,
    ) -> dict[str, Any] | None:
        with self._lock:
            self._release_expired_leases_locked()
            pending = [
                task
                for task in self._tasks_by_id.values()
                if task.get("status") == "pending"
            ]
            if not pending:
                return None
            task = min(pending, key=lambda item: float(item.get("created_at", 0)))
            now = self._now()
            task["status"] = "claimed"
            task["attempt_count"] = int(task.get("attempt_count") or 0) + 1
            task["last_attempt"] = task["attempt_count"]
            task["lease_owner"] = worker_id
            task["lease_expires_at"] = now + max(int(lease_seconds), 1)
            task["updated_at"] = now
            task["failed_at"] = None
            task["last_error"] = None
            logger.info(
                "Scraper task claimed: task_id=%s source_id=%s worker_id=%s attempt=%s",
                task.get("task_id"),
                task.get("source_id"),
                worker_id,
                task.get("attempt_count"),
            )
            return self._copy_task(task)

    def heartbeat_task(
        self,
        *,
        task_id: str,
        worker_id: str,
        lease_seconds: int,
    ) -> dict[str, Any] | None:
        with self._lock:
            task = self._tasks_by_id.get(task_id)
            if task is None:
                return None
            if task.get("status") in _TERMINAL_STATUSES:
                return self._copy_task(task)
            now = self._now()
            owner = task.get("lease_owner")
            lease_expires_at = task.get("lease_expires_at")
            has_valid_foreign_lease = (
                owner not in {None, worker_id}
                and isinstance(lease_expires_at, (int, float))
                and lease_expires_at > now
            )
            if has_valid_foreign_lease:
                return None
            task["status"] = "running"
            task["lease_owner"] = worker_id
            task["lease_expires_at"] = now + max(int(lease_seconds), 1)
            task["updated_at"] = now
            logger.info(
                "Scraper task running heartbeat: task_id=%s source_id=%s worker_id=%s",
                task.get("task_id"),
                task.get("source_id"),
                worker_id,
            )
            return self._copy_task(task)

    def complete_task(
        self,
        *,
        task_id: str,
        worker_id: str | None,
        attempt: int | None = None,
    ) -> tuple[dict[str, Any] | None, bool]:
        with self._lock:
            task = self._tasks_by_id.get(task_id)
            if task is None:
                return None, False
            if task.get("status") == "completed":
                return self._copy_task(task), False
            if attempt is not None and int(task.get("attempt_count") or 0) != int(attempt):
                return self._copy_task(task), False
            now = self._now()
            owner = task.get("lease_owner")
            lease_expires_at = task.get("lease_expires_at")
            if worker_id and owner not in {None, worker_id}:
                if isinstance(lease_expires_at, (int, float)) and lease_expires_at > now:
                    return None, False
            task["status"] = "completed"
            task["lease_owner"] = None
            task["lease_expires_at"] = None
            task["updated_at"] = now
            task["completed_at"] = now
            task["last_error"] = None
            logger.info(
                "Scraper task completed: task_id=%s source_id=%s",
                task.get("task_id"),
                task.get("source_id"),
            )
            return self._copy_task(task), True

    def fail_task(
        self,
        *,
        task_id: str,
        worker_id: str | None,
        error: str,
        attempt: int | None = None,
    ) -> tuple[dict[str, Any] | None, bool]:
        with self._lock:
            task = self._tasks_by_id.get(task_id)
            if task is None:
                return None, False
            if task.get("status") == "failed":
                return self._copy_task(task), False
            if task.get("status") == "completed":
                return self._copy_task(task), False
            if attempt is not None and int(task.get("attempt_count") or 0) != int(attempt):
                return self._copy_task(task), False
            now = self._now()
            owner = task.get("lease_owner")
            lease_expires_at = task.get("lease_expires_at")
            if worker_id and owner not in {None, worker_id}:
                if isinstance(lease_expires_at, (int, float)) and lease_expires_at > now:
                    return None, False
            task["status"] = "failed"
            task["lease_owner"] = None
            task["lease_expires_at"] = None
            task["updated_at"] = now
            task["failed_at"] = now
            task["last_error"] = error
            logger.info(
                "Scraper task failed: task_id=%s source_id=%s error=%s",
                task.get("task_id"),
                task.get("source_id"),
                error,
            )
            return self._copy_task(task), True

    def get_task(self, task_id: str) -> dict[str, Any] | None:
        with self._lock:
            return self._copy_task(self._tasks_by_id.get(task_id))

    def list_tasks(self) -> list[dict[str, Any]]:
        with self._lock:
            return [dict(task) for task in self._tasks_by_id.values()]

    def list_active_tasks(self) -> list[dict[str, Any]]:
        with self._lock:
            self._release_expired_leases_locked()
            active = [
                dict(task)
                for task in self._tasks_by_id.values()
                if task.get("status") in _ACTIVE_STATUSES
            ]
            active.sort(key=lambda task: float(task.get("created_at") or 0))
            return active

    def clear_active_tasks(
        self,
        *,
        source_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """Remove active pending/claimed/running tasks from memory."""
        with self._lock:
            removed: list[dict[str, Any]] = []
            task_ids_to_remove: list[str] = []
            for task_id, task in self._tasks_by_id.items():
                if task.get("status") not in _ACTIVE_STATUSES:
                    continue
                if source_id and task.get("source_id") != source_id:
                    continue
                removed.append(dict(task))
                task_ids_to_remove.append(task_id)

            for task_id in task_ids_to_remove:
                self._tasks_by_id.pop(task_id, None)

            if task_ids_to_remove:
                logger.info(
                    "Cleared active scraper tasks: count=%s source_id=%s",
                    len(task_ids_to_remove),
                    source_id or "*",
                )
            return removed
