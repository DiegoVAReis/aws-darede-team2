"""Testes de exemplo de chunking.py (BC-05)."""

from __future__ import annotations

import pytest

from chunking import (
    build_chunk_id,
    count_tokens,
    extract_title,
    split_into_chunks,
    title_from_stem,
)


def test_count_tokens_basics():
    assert count_tokens("") == 0
    assert count_tokens("trator agricola") > 0


def test_blank_text_has_no_chunks():
    assert split_into_chunks("   \n\t ") == []


def test_short_text_is_a_single_stripped_chunk():
    assert split_into_chunks("  Garantia de 12 meses.  ") == ["Garantia de 12 meses."]


def test_long_text_is_split_with_overlap_and_within_the_limit():
    text = " ".join(f"palavra{i}" for i in range(300))
    chunks = split_into_chunks(text, size=50, overlap=10)
    assert len(chunks) > 1
    assert all(count_tokens(chunk) <= 50 for chunk in chunks)
    assert set(chunks[0].split()) & set(chunks[1].split())


@pytest.mark.parametrize(("size", "overlap"), [(0, 0), (10, 10), (10, -1), (10, 11)])
def test_invalid_window_parameters_are_rejected(size, overlap):
    with pytest.raises(ValueError):
        split_into_chunks("texto", size=size, overlap=overlap)


def test_extract_title_returns_the_first_h1():
    markdown = "Introducao\n\n# Catalogo de Tratores\n\n## Secao\n\n# Outro\n"
    assert extract_title(markdown, "fallback") == "Catalogo de Tratores"


def test_extract_title_ignores_h2_and_code_blocks():
    markdown = "## Secao\n\n```\n# comentario no codigo\n```\n"
    assert extract_title(markdown, "fallback") == "fallback"


def test_extract_title_strips_closing_hashes():
    assert extract_title("# Titulo ##\n", "x") == "Titulo"


def test_title_from_stem():
    assert title_from_stem("politicas_internas_ti") == "Politicas internas ti"
    assert title_from_stem("___") == "Documento"


def test_build_chunk_id():
    assert build_chunk_id("seguros_agricolas", 2) == "seguros_agricolas-2"
