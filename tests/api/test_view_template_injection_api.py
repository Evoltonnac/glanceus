from __future__ import annotations

from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from core import api as api_module
from core.config_loader import AppConfig, IntegrationConfig
from core.models import StoredSource, StoredView


class InMemoryResourceManager:
    def __init__(self) -> None:
        self.sources = [
            StoredSource(
                id="demo-source",
                integration_id="demo",
                name="Demo Source",
                config={},
                vars={},
            )
        ]
        self.views: list[StoredView] = []

    def load_sources(self):
        return list(self.sources)

    def load_views(self):
        return list(self.views)

    def save_view(self, view: StoredView):
        for index, existing in enumerate(self.views):
            if existing.id == view.id:
                self.views[index] = view
                return view
        self.views.append(view)
        return view


def _build_client(
    *,
    template_title: str = "Demo Card",
    resource_manager: InMemoryResourceManager | None = None,
):
    integration = IntegrationConfig.model_validate(
        {
            "id": "demo",
            "templates": [
                {
                    "id": "demo_template",
                    "type": "source_card",
                    "ui": {"title": template_title, "icon": "D"},
                    "widgets": [{"type": "TextBlock", "text": "{value}"}],
                }
            ],
        }
    )

    if resource_manager is None:
        resource_manager = InMemoryResourceManager()
    api_module.init_api(
        executor=SimpleNamespace(get_source_state=lambda _source_id: None),
        data_controller=SimpleNamespace(),
        config=AppConfig(integrations=[integration]),
        auth_manager=SimpleNamespace(),
        secrets_controller=SimpleNamespace(),
        resource_manager=resource_manager,
        integration_manager=SimpleNamespace(),
        settings_manager=None,
    )
    app = FastAPI()
    app.include_router(api_module.router)
    return TestClient(app), resource_manager


def _build_view_payload(props: dict | None = None) -> dict:
    item_payload = {
        "id": "widget-1",
        "x": 0,
        "y": 0,
        "w": 4,
        "h": 4,
        "source_id": "demo-source",
        "template_id": "demo_template",
    }
    if props is not None:
        item_payload["props"] = props
    return {
        "id": "starter_pack_overview",
        "name": "Starter",
        "layout_columns": 12,
        "items": [item_payload],
    }


def test_create_view_returns_hydrated_props_but_stores_only_overrides():
    client, resource_manager = _build_client()

    response = client.post("/api/views", json=_build_view_payload())

    assert response.status_code == 200
    payload = response.json()
    props = payload["items"][0]["props"]

    assert props["id"] == "demo_template"
    assert props["type"] == "source_card"
    assert props["ui"]["title"] == "Demo Card"
    assert resource_manager.views[0].items[0].props == {}


def test_list_views_syncs_with_latest_template_after_config_change():
    initial_client, resource_manager = _build_client(template_title="Demo Card")

    create_response = initial_client.post(
        "/api/views",
        json=_build_view_payload(
            props={
                "id": "demo_template",
                "type": "source_card",
                "ui": {"title": "Demo Card", "icon": "D"},
                "widgets": [{"type": "TextBlock", "text": "{value}"}],
            }
        ),
    )
    assert create_response.status_code == 200
    assert resource_manager.views[0].items[0].props == {}

    updated_client, _ = _build_client(
        template_title="Demo Card Updated",
        resource_manager=resource_manager,
    )

    response = updated_client.get("/api/views")
    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["items"][0]["props"]["ui"]["title"] == "Demo Card Updated"


def test_list_views_ignores_legacy_template_snapshots():
    resource_manager = InMemoryResourceManager()
    resource_manager.views.append(
        StoredView.model_validate(
            {
                "id": "starter_pack_overview",
                "name": "Starter",
                "layout_columns": 12,
                "items": [
                    {
                        "id": "widget-1",
                        "x": 0,
                        "y": 0,
                        "w": 4,
                        "h": 4,
                        "source_id": "demo-source",
                        "template_id": "demo_template",
                        "props": {
                            "id": "demo_template",
                            "type": "source_card",
                            "ui": {"title": "Old Snapshot Title", "icon": "D"},
                            "widgets": [{"type": "TextBlock", "text": "{value}"}],
                        },
                    }
                ],
            }
        )
    )

    client, _ = _build_client(
        template_title="Demo Card Latest",
        resource_manager=resource_manager,
    )

    response = client.get("/api/views")
    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["items"][0]["props"]["ui"]["title"] == "Demo Card Latest"
