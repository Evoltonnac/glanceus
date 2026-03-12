from __future__ import annotations

from core.bootstrap import (
    DEFAULT_EXAMPLES_DIR,
    STARTER_VIEW_ID,
    seed_first_launch_workspace,
)
from core.integration_manager import IntegrationManager
from core.models import StoredSource, StoredView, ViewItem
from core.resource_manager import ResourceManager

STARTER_SOURCE_INTEGRATION_IDS = {
    "devto_opensource",
    "openrouter_tools",
    "twitch_media_oauth",
    "icloud_webscraper",
    "gold_price_market",
}

STARTER_INTEGRATION_FILES = {
    "devto_opensource.yaml",
    "github_device_oauth.yaml",
    "openrouter_tools.yaml",
    "twitch_media_oauth.yaml",
    "icloud_webscraper.yaml",
    "gold_price_market.yaml",
}


class FakeIntegrationManager:
    def __init__(self, initial_files: dict[str, str] | None = None):
        self.files = dict(initial_files or {})
        self.create_calls = 0

    def list_integration_files(self) -> list[str]:
        return sorted(self.files.keys())

    def create_integration(self, filename: str, content: str) -> bool:
        self.create_calls += 1
        self.files[filename] = content
        return True


class FakeResourceManager:
    def __init__(
        self,
        sources: list[StoredSource] | None = None,
        views: list[StoredView] | None = None,
    ):
        self.sources = list(sources or [])
        self.views = list(views or [])

    def load_sources(self) -> list[StoredSource]:
        return list(self.sources)

    def load_views(self) -> list[StoredView]:
        return list(self.views)

    def save_source(self, source: StoredSource) -> StoredSource:
        for index, existing in enumerate(self.sources):
            if existing.id == source.id:
                self.sources[index] = source
                return source
        self.sources.append(source)
        return source

    def save_view(self, view: StoredView) -> StoredView:
        for index, existing in enumerate(self.views):
            if existing.id == view.id:
                self.views[index] = view
                return view
        self.views.append(view)
        return view


def test_bootstrap_starter_bundle_seeds_required_presets_on_empty_workspace():
    integration_manager = FakeIntegrationManager()
    resource_manager = FakeResourceManager()

    seeded = seed_first_launch_workspace(integration_manager, resource_manager)

    assert seeded is True
    assert set(integration_manager.files.keys()) == STARTER_INTEGRATION_FILES

    assert {source.integration_id for source in resource_manager.sources} == STARTER_SOURCE_INTEGRATION_IDS

    assert len(resource_manager.views) == 1
    view = resource_manager.views[0]
    assert view.id == STARTER_VIEW_ID
    assert len(view.items) == 5
    assert all(item.props.get("type") == "source_card" for item in view.items)


def test_bootstrap_starter_bundle_is_idempotent_for_starter_only_workspace():
    partial_source = StoredSource(
        id="starter_devto_source",
        integration_id="devto_opensource",
        name="DEV.to Open Source",
        config={},
        vars={},
    )
    partial_view = StoredView(
        id=STARTER_VIEW_ID,
        name="Starter Pack Overview",
        layout_columns=12,
        items=[
            ViewItem(
                id="widget-starter-devto",
                x=0,
                y=0,
                w=4,
                h=4,
                source_id="starter_devto_source",
                template_id="DEV.to Open Source Snapshot",
                props={},
            )
        ],
    )
    integration_manager = FakeIntegrationManager(
        {"devto_opensource.yaml": "name: partial\n"}
    )
    resource_manager = FakeResourceManager(
        sources=[partial_source],
        views=[partial_view],
    )

    assert seed_first_launch_workspace(integration_manager, resource_manager) is True
    assert seed_first_launch_workspace(integration_manager, resource_manager) is True

    assert len(resource_manager.sources) == len(STARTER_SOURCE_INTEGRATION_IDS)
    assert len(resource_manager.views) == 1
    assert len(resource_manager.views[0].items) == len(STARTER_SOURCE_INTEGRATION_IDS)
    assert all(item.props.get("type") == "source_card" for item in resource_manager.views[0].items)


def test_bootstrap_starter_bundle_skips_nonstarter_workspace():
    integration_manager = FakeIntegrationManager({"custom.yaml": "name: custom\n"})
    resource_manager = FakeResourceManager()

    seeded = seed_first_launch_workspace(integration_manager, resource_manager)

    assert seeded is False
    assert integration_manager.create_calls == 0
    assert set(integration_manager.files.keys()) == {"custom.yaml"}
    assert resource_manager.sources == []
    assert resource_manager.views == []


def test_bootstrap_starter_bundle_falls_back_to_default_examples_when_data_root_has_no_examples(
    tmp_path,
):
    integration_manager = IntegrationManager(config_root=str(tmp_path / "config"))
    resource_manager = ResourceManager(data_dir=tmp_path / "data")

    seeded = seed_first_launch_workspace(integration_manager, resource_manager)

    assert seeded is True
    assert set(integration_manager.list_integration_files()) == STARTER_INTEGRATION_FILES
    assert len(resource_manager.load_sources()) == len(STARTER_SOURCE_INTEGRATION_IDS)


def test_bootstrap_starter_bundle_ignores_hidden_metadata_yaml_files(tmp_path):
    examples_dir = tmp_path / "config" / "examples"
    integrations_dir = examples_dir / "integrations"
    integrations_dir.mkdir(parents=True)

    for src in (DEFAULT_EXAMPLES_DIR / "integrations").glob("*.yaml"):
        (integrations_dir / src.name).write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
    (examples_dir / "starter_sources.yaml").write_text(
        (DEFAULT_EXAMPLES_DIR / "starter_sources.yaml").read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    (examples_dir / "starter_view.yaml").write_text(
        (DEFAULT_EXAMPLES_DIR / "starter_view.yaml").read_text(encoding="utf-8"),
        encoding="utf-8",
    )

    # macOS archive extraction can produce AppleDouble sidecar files.
    (integrations_dir / "._devto_opensource.yaml").write_bytes(
        b"\x00\x05\x16\x07\x00\x02\x00\x00Mac OS X\x00\x00\x00\xa3"
    )

    integration_manager = IntegrationManager(config_root=str(tmp_path / "config"))
    resource_manager = ResourceManager(data_dir=tmp_path / "data")

    seeded = seed_first_launch_workspace(integration_manager, resource_manager)

    assert seeded is True
    assert set(integration_manager.list_integration_files()) == STARTER_INTEGRATION_FILES
    assert len(resource_manager.load_sources()) == len(STARTER_SOURCE_INTEGRATION_IDS)
