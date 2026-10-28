"""Testes de knowledge_store.py (BC-06) com ChromaDB real em pasta temporaria."""

from __future__ import annotations

import pytest

from knowledge_store import KnowledgeStore, StoredChunk


@pytest.fixture
def store(tmp_path):
    return KnowledgeStore(tmp_path / "db", "anyone")


def chunk(chunk_id, vector, source="a.md", title="Doc A", text="texto"):
    return StoredChunk(id=chunk_id, text=text, embedding=vector, source=source, title=title)


def test_empty_store_behaves_safely(store):
    assert store.exists() is False
    assert store.count() == 0
    assert store.query([1.0, 0.0], 3) == []
    assert store.indexed_sources() == set()
    assert store.remove_stale_chunks("a.md", set()) == 0
    assert store.remove_source("a.md") == 0


def test_upsert_then_query_returns_nearest_first_with_metadata(store):
    store.upsert_chunks(
        [
            chunk("a-0", [1.0, 0.0], text="trator", title="Tratores"),
            chunk("b-0", [0.0, 1.0], source="b.md", title="Credito", text="credito"),
        ]
    )
    assert store.exists() is True
    assert store.count() == 2

    hits = store.query([1.0, 0.0], 2)

    assert [hit.source for hit in hits] == ["a.md", "b.md"]
    assert hits[0].title == "Tratores"
    assert hits[0].text == "trator"
    assert hits[0].distance == pytest.approx(0.0, abs=1e-4)
    assert hits[1].distance == pytest.approx(1.0, abs=1e-4)


def test_upsert_is_idempotent(store):
    chunks = [chunk("a-0", [1.0, 0.0]), chunk("a-1", [0.0, 1.0])]
    store.upsert_chunks(chunks)
    store.upsert_chunks(chunks)
    assert store.count() == 2


def test_upsert_without_chunks_does_not_create_the_collection(store):
    store.upsert_chunks([])
    assert store.exists() is False


def test_query_clamps_top_k_to_the_collection_size(store):
    store.upsert_chunks([chunk("a-0", [1.0, 0.0])])
    assert len(store.query([1.0, 0.0], 10)) == 1


def test_remove_stale_chunks_keeps_only_the_listed_ids(store):
    store.upsert_chunks([chunk(f"a-{i}", [1.0, float(i)]) for i in range(3)])
    removed = store.remove_stale_chunks("a.md", {"a-0"})
    assert removed == 2
    assert store.count() == 1


def test_indexed_sources_and_remove_source(store):
    store.upsert_chunks(
        [chunk("a-0", [1.0, 0.0]), chunk("b-0", [0.0, 1.0], source="b.md", title="B")]
    )
    assert store.indexed_sources() == {"a.md", "b.md"}
    assert store.remove_source("b.md") == 1
    assert store.indexed_sources() == {"a.md"}
