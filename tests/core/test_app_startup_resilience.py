from __future__ import annotations

from types import SimpleNamespace

from core.config_loader import AppConfig
import main as main_module


def test_create_app_falls_back_to_empty_config_when_load_fails(monkeypatch):
    def _boom():
        raise RuntimeError("invalid config")

    monkeypatch.setattr(main_module, "load_config", _boom)
    monkeypatch.setattr(main_module, "DataController", lambda: SimpleNamespace(close=lambda: None))
    monkeypatch.setattr(main_module, "SecretsController", lambda: SimpleNamespace(inject_settings_manager=lambda _settings: None))
    monkeypatch.setattr(main_module, "AuthManager", lambda _secrets, app_config: SimpleNamespace())
    monkeypatch.setattr(main_module, "SettingsManager", lambda: SimpleNamespace())
    monkeypatch.setattr(main_module, "Executor", lambda _dc, _sc, _sm, **_kwargs: SimpleNamespace())
    monkeypatch.setattr(main_module, "ResourceManager", lambda: SimpleNamespace(load_sources=lambda: []))
    monkeypatch.setattr(main_module, "IntegrationManager", lambda: SimpleNamespace())
    monkeypatch.setattr(main_module.api, "init_api", lambda **_kwargs: None)

    app = main_module.create_app()

    assert isinstance(app.state.config, AppConfig)
    assert app.state.config.integrations == []


def test_create_app_seeds_first_launch_workspace_when_empty(monkeypatch):
    created_integrations: list[tuple[str, str]] = []
    saved_sources = []
    saved_views = []

    class FakeIntegrationManager:
        def list_integration_files(self):
            return []

        def create_integration(self, filename: str, content: str):
            created_integrations.append((filename, content))
            return True

    class FakeResourceManager:
        def load_sources(self):
            return []

        def load_views(self):
            return []

        def save_source(self, source):
            saved_sources.append(source)
            return source

        def save_view(self, view):
            saved_views.append(view)
            return view

    monkeypatch.setattr(main_module, "load_config", lambda: AppConfig())
    monkeypatch.setattr(main_module, "DataController", lambda: SimpleNamespace(close=lambda: None))
    monkeypatch.setattr(main_module, "SecretsController", lambda: SimpleNamespace(inject_settings_manager=lambda _settings: None))
    monkeypatch.setattr(main_module, "AuthManager", lambda _secrets, app_config: SimpleNamespace())
    monkeypatch.setattr(main_module, "SettingsManager", lambda: SimpleNamespace())
    monkeypatch.setattr(main_module, "Executor", lambda _dc, _sc, _sm, **_kwargs: SimpleNamespace())
    monkeypatch.setattr(main_module, "ResourceManager", lambda: FakeResourceManager())
    monkeypatch.setattr(main_module, "IntegrationManager", lambda: FakeIntegrationManager())
    monkeypatch.setattr(main_module.api, "init_api", lambda **_kwargs: None)

    main_module.create_app()

    assert len(created_integrations) == 6
    created_filenames = {filename for filename, _ in created_integrations}
    assert created_filenames == {
        "devto_opensource.yaml",
        "github_device_oauth.yaml",
        "openrouter_tools.yaml",
        "twitch_media_oauth.yaml",
        "icloud_webscraper.yaml",
        "gold_price_market.yaml",
    }

    assert len(saved_sources) == 5
    assert {source.integration_id for source in saved_sources} == {
        "devto_opensource",
        "openrouter_tools",
        "twitch_media_oauth",
        "icloud_webscraper",
        "gold_price_market",
    }
    assert {source.id for source in saved_sources} == {
        "starter_devto_source",
        "starter_openrouter_source",
        "starter_twitch_source",
        "starter_icloud_source",
        "starter_gold_source",
    }

    assert len(saved_views) == 1
    assert saved_views[0].id == "starter_pack_overview"
    assert len(saved_views[0].items) == 5
    assert {item.source_id for item in saved_views[0].items} == {
        "starter_devto_source",
        "starter_openrouter_source",
        "starter_twitch_source",
        "starter_icloud_source",
        "starter_gold_source",
    }
    assert all(
        item.props.get("type") in {"source_card", None}
        for item in saved_views[0].items
    )


def test_create_app_bootstrap_sources_use_api_create_flow_for_auto_refresh(monkeypatch):
    refresh_calls = []

    class FakeIntegrationManager:
        def __init__(self):
            self.files = {}

        def list_integration_files(self):
            return sorted(self.files.keys())

        def create_integration(self, filename: str, content: str):
            self.files[filename] = content
            return True

    class FakeResourceManager:
        def __init__(self):
            self.sources = []
            self.views = []

        def load_sources(self):
            return list(self.sources)

        def load_views(self):
            return list(self.views)

        def save_source(self, source):
            for idx, existing in enumerate(self.sources):
                if existing.id == source.id:
                    self.sources[idx] = source
                    return source
            self.sources.append(source)
            return source

        def save_view(self, view):
            for idx, existing in enumerate(self.views):
                if existing.id == view.id:
                    self.views[idx] = view
                    return view
            self.views.append(view)
            return view

    def _capture_create_stored_source_record(
        source,
        resource_manager,
        *,
        executor=None,
        config=None,
        background_tasks=None,
    ):
        refresh_calls.append(
            {
                "source_id": source.id,
                "executor": executor,
                "config": config,
                "background_tasks": background_tasks,
            }
        )
        return source

    monkeypatch.setattr(main_module, "load_config", lambda: AppConfig())
    monkeypatch.setattr(main_module, "DataController", lambda: SimpleNamespace(close=lambda: None))
    monkeypatch.setattr(main_module, "SecretsController", lambda: SimpleNamespace(inject_settings_manager=lambda _settings: None))
    monkeypatch.setattr(main_module, "AuthManager", lambda _secrets, app_config: SimpleNamespace())
    monkeypatch.setattr(main_module, "SettingsManager", lambda: SimpleNamespace())
    monkeypatch.setattr(
        main_module,
        "Executor",
        lambda _dc, _sc, _sm, **_kwargs: SimpleNamespace(fetch_source=lambda _source: None),
    )
    monkeypatch.setattr(main_module, "ResourceManager", lambda: FakeResourceManager())
    monkeypatch.setattr(main_module, "IntegrationManager", lambda: FakeIntegrationManager())
    monkeypatch.setattr(main_module.api, "create_stored_source_record", _capture_create_stored_source_record)
    monkeypatch.setattr(main_module.api, "init_api", lambda **_kwargs: None)

    main_module.create_app()

    assert len(refresh_calls) == 5
    assert {call["source_id"] for call in refresh_calls} == {
        "starter_devto_source",
        "starter_openrouter_source",
        "starter_twitch_source",
        "starter_icloud_source",
        "starter_gold_source",
    }
    assert all(call["executor"] is not None for call in refresh_calls)
    assert all(call["config"] is not None for call in refresh_calls)
    assert all(call["background_tasks"] is not None for call in refresh_calls)
