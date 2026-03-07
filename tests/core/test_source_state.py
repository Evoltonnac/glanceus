from __future__ import annotations

from core.source_state import (
    InteractionField,
    InteractionRequest,
    InteractionType,
    SourceState,
    SourceStatus,
)


def test_source_state_defaults_are_stable():
    state = SourceState(source_id="source-1")

    assert state.source_id == "source-1"
    assert state.status == SourceStatus.ACTIVE
    assert state.message is None
    assert state.last_updated == 0.0
    assert state.interaction is None


def test_source_state_allows_status_and_interaction_updates():
    state = SourceState(source_id="source-2")
    interaction = InteractionRequest(
        type=InteractionType.INPUT_TEXT,
        source_id="source-2",
        message="API key required",
        fields=[
            InteractionField(
                key="api_key",
                label="API Key",
                type="password",
            )
        ],
    )

    state.status = SourceStatus.SUSPENDED
    state.interaction = interaction

    assert state.status == SourceStatus.SUSPENDED
    assert state.interaction is not None
    assert state.interaction.type == InteractionType.INPUT_TEXT
    assert state.interaction.fields[0].key == "api_key"


def test_source_status_enum_contains_phase11_runtime_states():
    assert SourceStatus.ACTIVE.value == "active"
    assert SourceStatus.SUSPENDED.value == "suspended"
    assert SourceStatus.ERROR.value == "error"
    assert SourceStatus.REFRESHING.value == "refreshing"
