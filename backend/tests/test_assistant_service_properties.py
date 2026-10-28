"""Propriedades de validate_ask_input (PBT-03, PBT-04)."""

from __future__ import annotations

import pytest
from hypothesis import given
from hypothesis import strategies as st

from assistant_service import validate_ask_input
from errors import ValidationAppError
from strategies import invalid_session_ids, session_ids

MAX_CHARS = 200


@given(text=st.text(max_size=MAX_CHARS), session_id=st.one_of(st.none(), session_ids()))
def test_valid_input_is_trimmed_and_the_normalization_is_idempotent(text, session_id):
    if not text.strip():
        with pytest.raises(ValidationAppError):
            validate_ask_input(text, session_id, MAX_CHARS)
        return
    clean, sid = validate_ask_input(text, session_id, MAX_CHARS)
    assert clean == text.strip()
    assert clean == clean.strip()
    assert sid == session_id
    assert validate_ask_input(clean, sid, MAX_CHARS) == (clean, sid)


@given(text=st.text(min_size=MAX_CHARS + 1, max_size=MAX_CHARS + 50, alphabet="abc xyz"))
def test_text_over_the_limit_is_always_rejected(text):
    if len(text.strip()) > MAX_CHARS:
        with pytest.raises(ValidationAppError):
            validate_ask_input(text, None, MAX_CHARS)


@given(session_id=invalid_session_ids())
def test_session_ids_outside_the_pattern_are_always_rejected(session_id):
    with pytest.raises(ValidationAppError):
        validate_ask_input("pergunta", session_id, MAX_CHARS)
