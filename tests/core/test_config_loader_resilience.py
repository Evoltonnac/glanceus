from __future__ import annotations

import pytest
from pydantic import ValidationError

from core.config_loader import load_config


def test_load_config_skips_invalid_integration_entries(tmp_path):
    config_dir = tmp_path / "config"
    integrations_dir = config_dir / "integrations"
    integrations_dir.mkdir(parents=True)

    (integrations_dir / "good.yaml").write_text(
        """
flow: []
""".strip()
        + "\n",
        encoding="utf-8",
    )
    (integrations_dir / "bad.yaml").write_text(
        """
flow:
  - id: step1
    use: invalid_step_type
""".strip()
        + "\n",
        encoding="utf-8",
    )

    config = load_config(config_dir)

    assert [integration.id for integration in config.integrations] == ["good"]


def test_load_config_rejects_duplicate_file_based_integration_ids(tmp_path):
    config_dir = tmp_path / "config"
    integrations_dir = config_dir / "integrations"
    integrations_dir.mkdir(parents=True)

    (integrations_dir / "dup.yaml").write_text("flow: []\n", encoding="utf-8")
    (integrations_dir / "dup.yml").write_text("flow: []\n", encoding="utf-8")

    with pytest.raises(ValidationError):
        load_config(config_dir)


def test_load_config_accepts_name_and_description_fields(tmp_path):
    config_dir = tmp_path / "config"
    integrations_dir = config_dir / "integrations"
    integrations_dir.mkdir(parents=True)

    (integrations_dir / "named.yaml").write_text(
        """
name: "Named integration"
description: "Used by refresh pipeline"
flow: []
""".strip()
        + "\n",
        encoding="utf-8",
    )

    config = load_config(config_dir)
    integration = config.get_integration("named")

    assert integration is not None
    assert integration.name == "Named integration"
    assert integration.description == "Used by refresh pipeline"


def test_load_config_ignores_hidden_yaml_sidecars(tmp_path):
    config_dir = tmp_path / "config"
    integrations_dir = config_dir / "integrations"
    integrations_dir.mkdir(parents=True)

    (integrations_dir / "visible.yaml").write_text("flow: []\n", encoding="utf-8")
    (integrations_dir / "._visible.yaml").write_bytes(
        b"\x00\x05\x16\x07\x00\x02\x00\x00Mac OS X\x00\x00\x00\xa3"
    )

    config = load_config(config_dir)

    assert [integration.id for integration in config.integrations] == ["visible"]
