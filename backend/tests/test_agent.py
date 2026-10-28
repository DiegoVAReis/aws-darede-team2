"""Testes de exemplo de agent.py (BC-09). O Bedrock nunca e chamado."""

from __future__ import annotations

from agent import (
    NO_RELEVANT_MESSAGE,
    SYSTEM_PROMPT,
    build_agent,
    build_not_in_kb_tool,
    build_retrieve_tool,
    format_passages,
)
from config import Settings
from errors import UpstreamError
from rag import RetrievalResult, RetrievedPassage
from schemas import SourceRef
from sessions import SourceCollector


class StubRetriever:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error
        self.queries: list[str] = []

    def retrieve(self, query):
        self.queries.append(query)
        if self.error is not None:
            raise self.error
        return self.result


RELEVANT = RetrievalResult(
    passages=[
        RetrievedPassage("Garantia de 12 meses.", "tratores.md", "Catalogo de Tratores", 0.2),
    ],
    sources=[SourceRef(file="tratores.md", title="Catalogo de Tratores")],
)


def test_retrieve_tool_registers_sources_and_returns_the_passages():
    collector = SourceCollector()
    retriever = StubRetriever(RELEVANT)
    tool = build_retrieve_tool(retriever, collector)

    output = tool("garantia dos tratores")

    assert retriever.queries == ["garantia dos tratores"]
    assert "Garantia de 12 meses." in output
    assert "Catalogo de Tratores" in output
    assert collector.snapshot() == RELEVANT.sources


def test_retrieve_tool_reports_when_nothing_is_relevant():
    collector = SourceCollector()
    tool = build_retrieve_tool(StubRetriever(RetrievalResult()), collector)

    assert tool("receita de bolo") == NO_RELEVANT_MESSAGE
    assert collector.snapshot() == []


def test_retrieve_tool_records_domain_errors_instead_of_raising():
    collector = SourceCollector()
    error = UpstreamError("falha")
    tool = build_retrieve_tool(StubRetriever(error=error), collector)

    assert tool("qualquer").startswith("ERROR")
    assert collector.error is error


def test_not_in_knowledge_base_tool_discards_the_sources_of_the_turn():
    collector = SourceCollector()
    collector.add(RELEVANT.sources)
    tool = build_not_in_kb_tool(collector)

    tool()

    assert collector.snapshot() == []


def test_format_passages_numbers_each_passage():
    text = format_passages(RELEVANT)
    assert text.startswith("Trechos relevantes da base interna:")
    assert "[1] Documento: Catalogo de Tratores" in text


def test_system_prompt_states_the_main_rules():
    assert "retrieve" in SYSTEM_PROMPT
    assert "not_in_knowledge_base" in SYSTEM_PROMPT
    assert "mesmo idioma" in SYSTEM_PROMPT
    assert "nao veio da base interna" in SYSTEM_PROMPT


def test_build_agent_registers_both_tools(monkeypatch):
    monkeypatch.setenv("AWS_BEARER_TOKEN_BEDROCK", "token-de-teste")
    collector = SourceCollector()
    retrieve = build_retrieve_tool(StubRetriever(RELEVANT), collector)
    not_in_kb = build_not_in_kb_tool(collector)

    agent = build_agent(Settings(), retrieve, not_in_kb)

    assert set(agent.tool_names) == {"retrieve", "not_in_knowledge_base"}
