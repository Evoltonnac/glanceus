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


def _build_client():
    integration = IntegrationConfig.model_validate(
        {
            "id": "demo",
            "templates": [
                {
                    "id": "demo_template",
                    "type": "source_card",
                    "ui": {"title": "Demo Card", "icon": "D"},
                    "widgets": [{"type": "TextBlock", "text": "{value}"}],
                }
            ],
        }
    )

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
    return TestClient(app)


def test_create_view_injects_template_props_when_missing():
    client = _build_client()

    response = client.post(
        "/api/views",
        json={
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
                }
            ],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    props = payload["items"][0]["props"]

    assert props["id"] == "demo_template"
    assert props["type"] == "source_card"
    assert props["ui"]["title"] == "Demo Card"
