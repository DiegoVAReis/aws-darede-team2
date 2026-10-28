"""Propriedades de chunking.py (PBT-01, PBT-02, PBT-03)."""

from __future__ import annotations

import string

from hypothesis import given
from hypothesis import strategies as st

from chunking import (
    build_chunk_id,
    count_tokens,
    extract_title,
    split_into_chunks,
    title_from_stem,
)
from strategies import prose, titles

# A sobreposicao precisa superar o maior numero de tokens de uma palavra gerada (<= 9 caracteres,
# no maximo ~18 tokens), para que toda palavra cortada numa fronteira apareca inteira no chunk
# seguinte.
OVERLAP = 20


@given(text=prose(max_words=200), size=st.integers(min_value=30, max_value=80))
def test_no_chunk_exceeds_the_token_limit(text, size):
    for chunk in split_into_chunks(text, size=size, overlap=OVERLAP):
        assert count_tokens(chunk) <= size


@given(text=prose(max_words=200), size=st.integers(min_value=30, max_value=80))
def test_every_word_appears_intact_in_some_chunk(text, size):
    chunks = split_into_chunks(text, size=size, overlap=OVERLAP)
    for word in text.split():
        assert any(word in chunk for chunk in chunks), word


@given(text=prose(max_words=200), size=st.integers(min_value=30, max_value=80))
def test_chunks_are_never_empty_and_blank_text_yields_none(text, size):
    chunks = split_into_chunks(text, size=size, overlap=OVERLAP)
    assert all(chunk.strip() == chunk and chunk for chunk in chunks)
    assert (chunks == []) == (not text.strip())


@given(text=prose(max_words=8))
def test_text_that_fits_becomes_one_chunk(text):
    stripped = text.strip()
    if count_tokens(stripped) <= 500:
        expected = [stripped] if stripped else []
        assert split_into_chunks(text, size=500, overlap=50) == expected


@given(title=titles(), body=prose(max_words=30))
def test_h1_format_then_extract_round_trip(title, body):
    markdown = f"# {title}\n\n{body}"
    assert extract_title(markdown, "fallback") == title


@given(
    stem=st.text(alphabet=string.ascii_lowercase + string.digits + "_", min_size=1, max_size=30),
    index=st.integers(min_value=0, max_value=10_000),
)
def test_chunk_id_round_trip(stem, index):
    chunk_id = build_chunk_id(stem, index)
    parsed_stem, parsed_index = chunk_id.rsplit("-", 1)
    assert (parsed_stem, int(parsed_index)) == (stem, index)
    assert build_chunk_id(stem, index) == chunk_id


@given(stem=st.text(alphabet=string.ascii_lowercase + "_", max_size=30))
def test_fallback_title_is_never_empty_and_has_no_underscores(stem):
    title = title_from_stem(stem)
    assert title
    assert "_" not in title
