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
    monkeypatch.setattr(main_module, "Executor", lambda _dc, _sc, _sm: SimpleNamespace())
    monkeypatch.setattr(main_module, "ResourceManager", lambda: SimpleNamespace(load_sources=lambda: []))
    monkeypatch.setattr(main_module, "IntegrationManager", lambda: SimpleNamespace())
    monkeypatch.setattr(main_module.api, "init_api", lambda **_kwargs: None)

    app = main_module.create_app()

    assert isinstance(app.state.config, AppConfig)
    assert app.state.config.integrations == []
