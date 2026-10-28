"""Testes de ingest.py (BC-07) com ChromaDB real e embeddings falsos."""

from __future__ import annotations

import pytest

import ingest
from fakes import FakeEmbedder, write_kb
from ingest import IngestError, KnowledgeIngestor
from knowledge_store import KnowledgeStore

DOCS = {
    "tratores.md": "# Catalogo de Tratores\n\nO trator X200 tem garantia de 12 meses.\n",
    "credito.md": "# Credito Rural\n\nO credito de custeio financia a safra.\n",
}


def build(settings, embedder=None):
    embedder = embedder or FakeEmbedder()
    store = KnowledgeStore(settings.chroma_dir, settings.collection_name)
    return KnowledgeIngestor(settings, embedder, store), store, embedder


def test_run_indexes_every_document_with_title_and_source(app_settings):
    write_kb(app_settings.kb_dir, DOCS)
    ingestor, store, embedder = build(app_settings)

    report = ingestor.run()

    assert report.documents == 2
    assert report.chunks_indexed == report.total_chunks == 2
    assert report.failed_sources == []
    assert store.indexed_sources() == {"tratores.md", "credito.md"}
    hit = store.query(embedder.embed("trator"), 1)[0]
    assert (hit.source, hit.title) == ("tratores.md", "Catalogo de Tratores")


def test_embedding_input_is_prefixed_with_the_document_title(app_settings):
    write_kb(app_settings.kb_dir, {"tratores.md": DOCS["tratores.md"]})
    ingestor, _, embedder = build(app_settings)
    ingestor.run()
    assert embedder.calls[0].startswith("Catalogo de Tratores\n\n")


def test_running_twice_does_not_duplicate_chunks(app_settings):
    write_kb(app_settings.kb_dir, DOCS)
    ingestor, store, _ = build(app_settings)
    first = ingestor.run()
    second = ingestor.run()
    assert first.total_chunks == second.total_chunks == store.count()


def test_chunks_that_no_longer_exist_are_removed(app_settings):
    long_text = "# Catalogo\n\n" + " ".join(f"trator{i}" for i in range(200))
    write_kb(app_settings.kb_dir, {"tratores.md": long_text})
    ingestor, store, _ = build(app_settings)
    first = ingestor.run()
    assert first.total_chunks > 1

    write_kb(app_settings.kb_dir, {"tratores.md": "# Catalogo\n\nTexto curto de trator."})
    second = ingestor.run()

    assert second.total_chunks == 1
    assert second.chunks_removed == first.total_chunks - 1
    assert store.count() == 1


def test_documents_removed_from_the_folder_are_removed_from_the_collection(app_settings):
    write_kb(app_settings.kb_dir, DOCS)
    ingestor, store, _ = build(app_settings)
    ingestor.run()

    (app_settings.kb_dir / "credito.md").unlink()
    report = ingestor.run()

    assert store.indexed_sources() == {"tratores.md"}
    assert report.chunks_removed == 1


def test_failure_in_one_document_keeps_others_and_leaves_its_old_chunks(app_settings):
    write_kb(app_settings.kb_dir, DOCS)
    ingestor, store, _ = build(app_settings)
    ingestor.run()

    write_kb(app_settings.kb_dir, {"credito.md": "# Credito Rural\n\nTexto com FALHA aqui."})
    ingestor_with_failure, _, _ = build(app_settings, FakeEmbedder(fail_on="FALHA"))
    report = ingestor_with_failure.run()

    assert report.failed_sources == ["credito.md"]
    assert store.indexed_sources() == {"tratores.md", "credito.md"}
    old = store.query(FakeEmbedder().embed("credito"), 1)[0]
    assert "custeio" in old.text


def test_document_without_h1_uses_the_file_name_as_title(app_settings):
    write_kb(app_settings.kb_dir, {"politicas_internas_ti.md": "Texto sem titulo de silo."})
    ingestor, store, embedder = build(app_settings)
    ingestor.run()
    hit = store.query(embedder.embed("silo"), 1)[0]
    assert hit.title == "Politicas internas ti"


def test_missing_or_empty_folder_fails_with_a_clear_error(app_settings):
    ingestor, _, _ = build(app_settings)
    with pytest.raises(IngestError):
        ingestor.run()
    app_settings.kb_dir.mkdir(parents=True)
    with pytest.raises(IngestError):
        ingestor.run()


def test_main_reports_missing_variables_by_name(monkeypatch, capsys, app_settings):
    monkeypatch.delenv("AWS_BEARER_TOKEN_BEDROCK", raising=False)
    monkeypatch.setattr(ingest, "get_settings", lambda: app_settings)

    assert ingest.main() == 1
    assert "AWS_BEARER_TOKEN_BEDROCK" in capsys.readouterr().out


def test_main_runs_the_ingestion_and_prints_the_totals(monkeypatch, capsys, app_settings):
    write_kb(app_settings.kb_dir, DOCS)
    monkeypatch.setenv("AWS_BEARER_TOKEN_BEDROCK", "token-de-teste")
    monkeypatch.setattr(ingest, "get_settings", lambda: app_settings)
    monkeypatch.setattr("bedrock_client.BedrockEmbeddingClient", lambda settings: FakeEmbedder())

    assert ingest.main() == 0
    output = capsys.readouterr().out
    assert "Documentos lidos: 2" in output
    assert "token-de-teste" not in output


def test_main_returns_one_when_the_folder_is_missing(monkeypatch, capsys, app_settings):
    monkeypatch.setenv("AWS_BEARER_TOKEN_BEDROCK", "token-de-teste")
    monkeypatch.setattr(ingest, "get_settings", lambda: app_settings)
    monkeypatch.setattr("bedrock_client.BedrockEmbeddingClient", lambda settings: FakeEmbedder())

    assert ingest.main() == 1
    assert "Ingestao nao executada" in capsys.readouterr().out
