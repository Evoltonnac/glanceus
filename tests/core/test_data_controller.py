from __future__ import annotations

import json

from core.data_controller import DataController


def test_data_controller_persists_latest_by_source_id(tmp_path):
    db_path = tmp_path / "data.json"
    controller = DataController(db_path=db_path)

    controller.upsert("source-alpha", {"value": 1})

    raw = json.loads(db_path.read_text(encoding="utf-8"))
    assert "latest_by_source" in raw
    assert "source-alpha" in raw["latest_by_source"]
    assert raw["latest_by_source"]["source-alpha"]["source_id"] == "source-alpha"
    assert "latest" not in raw


def test_data_controller_reads_and_migrates_legacy_tinydb_layout(tmp_path):
    db_path = tmp_path / "data.json"
    db_path.write_text(
        json.dumps(
            {
                "latest": {
                    "11": {
                        "source_id": "legacy-source",
                        "data": {"hello": "world"},
                        "updated_at": 1.0,
                    }
                },
                "history": {
                    "22": {
                        "source_id": "legacy-source",
                        "data": {"old": True},
                        "timestamp": 0.5,
                    }
                },
            }
        ),
        encoding="utf-8",
    )

    controller = DataController(db_path=db_path)

    latest = controller.get_latest("legacy-source")
    assert latest is not None
    assert latest["data"] == {"hello": "world"}

    history = controller.get_history("legacy-source")
    assert len(history) == 1
    assert history[0]["source_id"] == "legacy-source"

    # Trigger write to persist migrated structure.
    controller.set_state("legacy-source", "active", "ok")

    migrated = json.loads(db_path.read_text(encoding="utf-8"))
    assert "latest_by_source" in migrated
    assert "history_by_source" in migrated
    assert "legacy-source" in migrated["latest_by_source"]
    assert "latest" not in migrated
    assert "history" not in migrated
