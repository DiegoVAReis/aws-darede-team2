"""Propriedades de config.py (PBT-03): valores validos viram os mesmos valores tipados."""

from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from config import Settings


@given(
    top_k=st.integers(min_value=1, max_value=50),
    max_sessions=st.integers(min_value=1, max_value=1000),
    max_chars=st.integers(min_value=1, max_value=20000),
    distance=st.floats(min_value=0.0, max_value=2.0, allow_nan=False),
)
def test_valid_environment_values_are_preserved(top_k, max_sessions, max_chars, distance):
    env = {
        "RETRIEVAL_TOP_K": str(top_k),
        "SESSION_MAX_COUNT": str(max_sessions),
        "ASK_MAX_TEXT_CHARS": str(max_chars),
        "RETRIEVAL_MAX_DISTANCE": repr(distance),
    }
    settings = Settings.from_env(env)
    assert settings.top_k == top_k
    assert settings.max_sessions == max_sessions
    assert settings.max_text_chars == max_chars
    assert settings.max_distance == distance


@given(
    size=st.integers(min_value=2, max_value=2000),
    data=st.data(),
)
def test_overlap_is_always_smaller_than_size(size, data):
    overlap = data.draw(st.integers(min_value=0, max_value=size - 1))
    settings = Settings.from_env({"CHUNK_SIZE": str(size), "CHUNK_OVERLAP": str(overlap)})
    assert settings.chunk_overlap < settings.chunk_size
