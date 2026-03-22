from __future__ import annotations

from core.settings_manager import SettingsManager, SystemSettings


class SettingsAdapter:
    """Expose SettingsManager through the storage contract boundary."""

    def __init__(self, settings_manager: SettingsManager):
        self._settings_manager = settings_manager

    def load_settings(self) -> SystemSettings:
        return self._settings_manager.load_settings()

    def save_settings(self, settings: SystemSettings) -> None:
        self._settings_manager.save_settings(settings)
