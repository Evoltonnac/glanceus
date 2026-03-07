from __future__ import annotations

import pytest

from core.encryption import (
    ENC_PREFIX,
    decrypt_dict,
    decrypt_value,
    encrypt_dict,
    encrypt_value,
    generate_master_key,
    is_encrypted,
)


def test_encrypt_decrypt_roundtrip():
    key = generate_master_key()

    encrypted = encrypt_value("super-secret", key)
    decrypted = decrypt_value(encrypted, key)

    assert encrypted.startswith(ENC_PREFIX)
    assert decrypted == "super-secret"


def test_decrypt_value_keeps_plaintext_unchanged():
    key = generate_master_key()
    assert decrypt_value("plain-text", key) == "plain-text"


def test_encrypt_and_decrypt_dict_only_touch_string_fields():
    key = generate_master_key()
    original = {
        "token": "abc123",
        "count": 7,
        "flag": True,
        "nested": {"k": "v"},
    }

    encrypted = encrypt_dict(original, key)
    assert is_encrypted(encrypted["token"])
    assert encrypted["count"] == 7
    assert encrypted["flag"] is True
    assert encrypted["nested"] == {"k": "v"}

    decrypted = decrypt_dict(encrypted, key)
    assert decrypted == original


def test_decrypt_with_wrong_key_raises_value_error():
    key = generate_master_key()
    wrong_key = generate_master_key()
    encrypted = encrypt_value("do-not-leak", key)

    with pytest.raises(ValueError):
        decrypt_value(encrypted, wrong_key)
