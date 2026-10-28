"""Testes de rag.py (BC-08) com ChromaDB real e embeddings falsos."""

from __future__ import annotations

import pytest

from errors import KnowledgeBaseNotIndexedError
from fakes import FakeEmbedder, write_kb
from ingest import KnowledgeIngestor
from knowledge_store import KnowledgeStore, QueryHit
from rag import Retriever, dedupe_sources, filter_relevant
from schemas import SourceRef

DOCS = {
    "tratores.md": "# Catalogo de Tratores\n\nO trator X200 tem garantia de 12 meses.\n",
    "credito.md": "# Credito Rural\n\nO credito de custeio financia a safra.\n",
}


@pytest.fixture
def indexed(app_settings):
    write_kb(app_settings.kb_dir, DOCS)
    embedder = FakeEmbedder()
    store = KnowledgeStore(app_settings.chroma_dir, app_settings.collection_name)
    KnowledgeIngestor(app_settings, embedder, store).run()
    return Retriever(app_settings, embedder, store), store


def test_ensure_ready_fails_when_nothing_was_indexed(app_settings):
    store = KnowledgeStore(app_settings.chroma_dir, app_settings.collection_name)
    retriever = Retriever(app_settings, FakeEmbedder(), store)
    with pytest.raises(KnowledgeBaseNotIndexedError):
        retriever.ensure_ready()
    with pytest.raises(KnowledgeBaseNotIndexedError):
        retriever.retrieve("qualquer coisa")


def test_ensure_ready_fails_when_the_collection_is_empty(app_settings):
    store = KnowledgeStore(app_settings.chroma_dir, app_settings.collection_name)
    store._for_write()  # cria a colecao vazia
    retriever = Retriever(app_settings, FakeEmbedder(), store)
    with pytest.raises(KnowledgeBaseNotIndexedError):
        retriever.ensure_ready()


def test_relevant_question_returns_passages_and_sources(indexed):
    retriever, _ = indexed
    result = retriever.retrieve("Qual a garantia do trator?")
    assert result.has_relevant is True
    assert result.passages[0].source == "tratores.md"
    assert result.sources == [SourceRef(file="tratores.md", title="Catalogo de Tratores")]


def test_unrelated_question_is_not_relevant_and_has_no_sources(indexed):
    retriever, _ = indexed
    result = retriever.retrieve("Qual a receita de bolo de cenoura?")
    assert result.has_relevant is False
    assert result.sources == []


def test_sources_are_deduplicated_per_file(app_settings):
    long_text = "# Catalogo\n\n" + " ".join(f"trator{i}" for i in range(200))
    write_kb(app_settings.kb_dir, {"tratores.md": long_text})
    embedder = FakeEmbedder()
    store = KnowledgeStore(app_settings.chroma_dir, app_settings.collection_name)
    KnowledgeIngestor(app_settings, embedder, store).run()
    assert store.count() > 1

    result = Retriever(app_settings, embedder, store).retrieve("trator", top_k=3)

    assert len(result.passages) > 1
    assert len(result.sources) == 1


def test_top_k_override_limits_the_passages(indexed):
    retriever, _ = indexed
    result = retriever.retrieve("trator", top_k=1)
    assert len(result.passages) == 1


def test_filter_relevant_keeps_hits_at_the_limit():
    hits = [
        QueryHit("a", "a.md", "A", 0.2),
        QueryHit("b", "b.md", "B", 0.6),
        QueryHit("c", "c.md", "C", 0.61),
    ]
    assert [hit.text for hit in filter_relevant(hits, 0.6)] == ["a", "b"]


def test_dedupe_sources_keeps_first_title_and_order():
    hits = [
        QueryHit("1", "a.md", "Titulo A", 0.1),
        QueryHit("2", "b.md", "Titulo B", 0.2),
        QueryHit("3", "a.md", "Outro", 0.3),
    ]
    assert dedupe_sources(hits) == [
        SourceRef(file="a.md", title="Titulo A"),
        SourceRef(file="b.md", title="Titulo B"),
    ]
