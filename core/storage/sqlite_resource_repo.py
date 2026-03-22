from __future__ import annotations

import json
import sqlite3
import time
from threading import RLock

from core.models import StoredSource, StoredView


class SqliteResourceRepository:
    def __init__(self, connection: sqlite3.Connection):
        self._connection = connection
        self._lock = RLock()

    def load_sources(self) -> list[StoredSource]:
        with self._lock:
            rows = self._connection.execute(
                "SELECT payload_json FROM stored_sources ORDER BY source_id"
            ).fetchall()
        sources: list[StoredSource] = []
        for row in rows:
            try:
                payload = json.loads(row["payload_json"])
                if isinstance(payload, dict):
                    sources.append(StoredSource.model_validate(payload))
            except Exception:
                continue
        return sources

    def save_source(self, source: StoredSource) -> StoredSource:
        payload_json = json.dumps(source.model_dump(), ensure_ascii=False)
        now = time.time()
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO stored_sources(source_id, payload_json, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(source_id) DO UPDATE SET
                    payload_json = excluded.payload_json,
                    updated_at = excluded.updated_at
                """,
                (source.id, payload_json, now),
            )
        return source

    def delete_source(self, source_id: str) -> bool:
        with self._lock, self._connection:
            cursor = self._connection.execute(
                "DELETE FROM stored_sources WHERE source_id = ?",
                (source_id,),
            )
        return cursor.rowcount > 0

    def get_source(self, source_id: str) -> StoredSource | None:
        with self._lock:
            row = self._connection.execute(
                "SELECT payload_json FROM stored_sources WHERE source_id = ?",
                (source_id,),
            ).fetchone()
        if row is None:
            return None
        try:
            payload = json.loads(row["payload_json"])
            if not isinstance(payload, dict):
                return None
            return StoredSource.model_validate(payload)
        except Exception:
            return None

    def load_views(self) -> list[StoredView]:
        with self._lock:
            rows = self._connection.execute(
                "SELECT payload_json FROM stored_views ORDER BY view_id"
            ).fetchall()
        views: list[StoredView] = []
        for row in rows:
            try:
                payload = json.loads(row["payload_json"])
                if isinstance(payload, dict):
                    views.append(StoredView.model_validate(payload))
            except Exception:
                continue
        return views

    def save_view(self, view: StoredView) -> StoredView:
        payload_json = json.dumps(view.model_dump(), ensure_ascii=False)
        now = time.time()
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO stored_views(view_id, payload_json, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(view_id) DO UPDATE SET
                    payload_json = excluded.payload_json,
                    updated_at = excluded.updated_at
                """,
                (view.id, payload_json, now),
            )
        return view

    def delete_view(self, view_id: str) -> bool:
        with self._lock, self._connection:
            cursor = self._connection.execute(
                "DELETE FROM stored_views WHERE view_id = ?",
                (view_id,),
            )
        return cursor.rowcount > 0

    def get_view(self, view_id: str) -> StoredView | None:
        with self._lock:
            row = self._connection.execute(
                "SELECT payload_json FROM stored_views WHERE view_id = ?",
                (view_id,),
            ).fetchone()
        if row is None:
            return None
        try:
            payload = json.loads(row["payload_json"])
            if not isinstance(payload, dict):
                return None
            return StoredView.model_validate(payload)
        except Exception:
            return None

    def remove_source_references_from_views(self, source_id: str) -> list[str]:
        views = self.load_views()
        if not views:
            return []

        affected_view_ids: list[str] = []
        with self._lock, self._connection:
            for view in views:
                retained_items = [item for item in view.items if item.source_id != source_id]
                if len(retained_items) == len(view.items):
                    continue
                affected_view_ids.append(view.id)
                updated_view = view.model_copy(update={"items": retained_items})
                self._connection.execute(
                    "UPDATE stored_views SET payload_json = ?, updated_at = ? WHERE view_id = ?",
                    (
                        json.dumps(updated_view.model_dump(), ensure_ascii=False),
                        time.time(),
                        view.id,
                    ),
                )

        return affected_view_ids
