"""Fluxo integrado: ingestao -> recuperacao -> agente (roteirizado) -> /v1/ask.

Usa ChromaDB real em pasta temporaria, as tools reais e o Bedrock simulado.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import dependencies
from agent import build_not_in_kb_tool, build_retrieve_tool
from assistant_service import AssistantService
from fakes import FakeEmbedder, write_kb
from ingest import KnowledgeIngestor
from knowledge_store import KnowledgeStore
from main import create_app
from rag import Retriever
from sessions import SessionManager

DOCS = {
    "tratores.md": "# Catalogo de Tratores\n\nO trator X200 tem garantia padrao de 12 meses.\n",
    "credito.md": "# Credito Rural\n\nO credito de custeio financia a safra do cooperado.\n",
    "seguros.md": "# Seguros Agricolas\n\nO seguro agricola cobre perdas por geada.\n",
}


class ScriptedAgent:
    """Substitui o Nova Pro: usa as tools reais como o agente de verdade faria."""

    def __init__(self, retrieve_tool, not_in_kb_tool):
        self._retrieve = retrieve_tool
        self._not_in_kb = not_in_kb_tool

    def __call__(self, prompt):
        output = self._retrieve(prompt)
        if output.startswith("NO_RELEVANT_PASSAGES"):
            self._not_in_kb()
            return "Aviso: esta informacao nao veio da base interna. Resposta geral."
        return "Com base na base interna: " + output


def build_client(settings, ingest_first=True):
    write_kb(settings.kb_dir, DOCS)
    embedder = FakeEmbedder()
    store = KnowledgeStore(settings.chroma_dir, settings.collection_name)
    if ingest_first:
        KnowledgeIngestor(settings, embedder, store).run()
    retriever = Retriever(settings, embedder, store)

    def factory(collector):
        return ScriptedAgent(
            build_retrieve_tool(retriever, collector), build_not_in_kb_tool(collector)
        )

    service = AssistantService(SessionManager(factory, settings.max_sessions), settings, retriever)
    app = create_app(settings)
    app.dependency_overrides[dependencies.get_assistant_service] = lambda: service
    return TestClient(app), store, embedder


@pytest.fixture
def client(app_settings):
    test_client, _, _ = build_client(app_settings)
    return test_client


def test_ingestion_is_idempotent_and_covers_every_document(app_settings):
    write_kb(app_settings.kb_dir, DOCS)
    embedder = FakeEmbedder()
    store = KnowledgeStore(app_settings.chroma_dir, app_settings.collection_name)
    ingestor = KnowledgeIngestor(app_settings, embedder, store)

    first = ingestor.run()
    second = ingestor.run()

    assert store.indexed_sources() == set(DOCS)
    assert first.total_chunks == second.total_chunks


def test_question_covered_by_the_base_returns_answer_and_source(client):
    response = client.post("/v1/ask", json={"text": "Qual a garantia do trator?"})

    assert response.status_code == 200
    body = response.json()
    assert "garantia padrao de 12 meses" in body["answer"]
    assert body["sources"] == [{"file": "tratores.md", "title": "Catalogo de Tratores"}]
    assert body["session_reset"] is False
    assert body["session_id"]


def test_question_outside_the_base_has_a_notice_and_no_sources(client):
    response = client.post("/v1/ask", json={"text": "Qual a receita de bolo de cenoura?"})

    assert response.status_code == 200
    body = response.json()
    assert "nao veio da base interna" in body["answer"]
    assert body["sources"] == []


def test_follow_up_keeps_the_session_and_uses_only_current_turn_sources(client):
    first = client.post("/v1/ask", json={"text": "Qual a garantia do trator?"}).json()
    second = client.post(
        "/v1/ask", json={"text": "E o credito de custeio?", "session_id": first["session_id"]}
    ).json()

    assert second["session_id"] == first["session_id"]
    assert second["session_reset"] is False
    assert second["sources"] == [{"file": "credito.md", "title": "Credito Rural"}]


def test_unknown_session_id_flags_the_context_reset(client):
    body = client.post(
        "/v1/ask", json={"text": "Como funciona o seguro?", "session_id": "sessao-antiga"}
    ).json()

    assert body["session_id"] == "sessao-antiga"
    assert body["session_reset"] is True
    assert body["sources"] == [{"file": "seguros.md", "title": "Seguros Agricolas"}]


def test_empty_text_returns_validation_error(client):
    response = client.post("/v1/ask", json={"text": "   "})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_asking_before_the_ingestion_returns_kb_not_indexed(app_settings):
    test_client, _, _ = build_client(app_settings, ingest_first=False)
    response = test_client.post("/v1/ask", json={"text": "Qual a garantia do trator?"})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "KB_NOT_INDEXED"
