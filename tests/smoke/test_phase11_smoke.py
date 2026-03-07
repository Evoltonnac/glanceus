from __future__ import annotations

from core.encryption import decrypt_value, encrypt_value, generate_master_key
from core.source_state import SourceState, SourceStatus


def test_phase11_smoke_core_contracts():
    state = SourceState(source_id="phase11-smoke")
    assert state.status == SourceStatus.ACTIVE

    key = generate_master_key()
    encrypted = encrypt_value("smoke-secret", key)
    assert decrypt_value(encrypted, key) == "smoke-secret"
