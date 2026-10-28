"""Testes de exemplo de assistant_service.py (BC-11)."""

from __future__ import annotations

import pytest

from assistant_service import AssistantService, validate_ask_input
from config import Settings
from errors import KnowledgeBaseNotIndexedError, UpstreamError, ValidationAppError
from fakes import FakeAgent, FakeRetriever
from schemas import SourceRef
from sessions import SessionManager

A = SourceRef(file="a.md", title="Titulo A")


def build_service(handler=None, retriever=None, max_text_chars=2000):
    """Servico com um FakeAgent por sessao; o handler recebe (prompt, collector)."""
    agents: list[FakeAgent] = []

    def factory(collector):
        agent = FakeAgent(lambda prompt: handler(prompt, collector) if handler else "resposta")
        agents.append(agent)
        return agent

    settings = Settings(max_text_chars=max_text_chars)
    retriever = retriever or FakeRetriever()
    service = AssistantService(SessionManager(factory, settings.max_sessions), settings, retriever)
    return service, agents, retriever


@pytest.mark.parametrize("text", ["", "   ", "\n\t "])
def test_blank_text_is_rejected_without_calling_the_agent(text):
    service, agents, retriever = build_service()
    with pytest.raises(ValidationAppError):
        service.ask(text, None)
    assert agents == []
    assert retriever.ensure_calls == 0


def test_text_over_the_limit_is_rejected():
    service, agents, _ = build_service(max_text_chars=10)
    with pytest.raises(ValidationAppError):
        service.ask("x" * 11, None)
    assert agents == []


def test_text_is_trimmed_before_the_limit_check_and_before_the_agent():
    service, agents, _ = build_service(max_text_chars=10)
    service.ask("   " + "x" * 10 + "   ", None)
    assert agents[0].prompts == ["x" * 10]


@pytest.mark.parametrize("session_id", ["", "tem espaco", "com/barra", "a" * 65, "acentuaçao"])
def test_invalid_session_id_is_rejected(session_id):
    service, agents, _ = build_service()
    with pytest.raises(ValidationAppError):
        service.ask("pergunta", session_id)
    assert agents == []


def test_knowledge_base_not_indexed_is_reported_before_the_agent_runs():
    retriever = FakeRetriever(KnowledgeBaseNotIndexedError("sem base"))
    service, agents, _ = build_service(retriever=retriever)
    with pytest.raises(KnowledgeBaseNotIndexedError):
        service.ask("pergunta", None)
    assert agents == []


def test_successful_turn_returns_answer_sources_and_a_new_session():
    def handler(prompt, collector):
        collector.add([A])
        return "  Garantia de 12 meses.  "

    service, _, _ = build_service(handler)
    result = service.ask("garantia?", None)

    assert result.answer == "Garantia de 12 meses."
    assert result.sources == [A]
    assert result.session_reset is False
    assert len(result.session_id) == 32


def test_follow_up_in_the_same_session_reuses_the_agent_and_keeps_the_id():
    service, agents, _ = build_service()
    first = service.ask("primeira", None)
    second = service.ask("segunda", first.session_id)

    assert second.session_id == first.session_id
    assert second.session_reset is False
    assert len(agents) == 1
    assert agents[0].prompts == ["primeira", "segunda"]


def test_unknown_session_id_creates_a_session_and_flags_the_reset():
    service, _, _ = build_service()
    result = service.ask("pergunta", "sessao-antiga")
    assert result.session_id == "sessao-antiga"
    assert result.session_reset is True


def test_sources_from_a_previous_turn_do_not_leak_into_the_next():
    def handler(prompt, collector):
        if "com fonte" in prompt:
            collector.add([A])
        return "ok"

    service, _, _ = build_service(handler)
    first = service.ask("pergunta com fonte", None)
    second = service.ask("pergunta sem fonte", first.session_id)

    assert first.sources == [A]
    assert second.sources == []


def test_discarded_sources_are_not_returned():
    def handler(prompt, collector):
        collector.add([A])
        collector.discard()
        return "Aviso: nao veio da base interna."

    service, _, _ = build_service(handler)
    assert service.ask("fora da base", None).sources == []


def test_unexpected_agent_failure_becomes_upstream_error_without_details():
    def handler(prompt, collector):
        raise RuntimeError("detalhe-interno-secreto")

    service, _, _ = build_service(handler)
    with pytest.raises(UpstreamError) as info:
        service.ask("pergunta", "sessao-1")
    assert "detalhe-interno-secreto" not in info.value.message

    # a trava da sessao foi liberada: uma nova chamada nao fica presa
    with pytest.raises(UpstreamError):
        service.ask("pergunta", "sessao-1")


def test_error_recorded_by_a_tool_is_raised_after_the_agent_returns():
    def handler(prompt, collector):
        collector.record_error(UpstreamError("falha dentro da tool"))
        return "resposta do modelo"

    service, _, _ = build_service(handler)
    with pytest.raises(UpstreamError) as info:
        service.ask("pergunta", None)
    assert info.value.message == "falha dentro da tool"


def test_empty_agent_answer_is_an_upstream_error():
    service, _, _ = build_service(lambda prompt, collector: "   ")
    with pytest.raises(UpstreamError):
        service.ask("pergunta", None)


def test_validate_ask_input_returns_trimmed_text_and_session():
    assert validate_ask_input("  oi  ", "abc_DEF-1", 10) == ("oi", "abc_DEF-1")
    assert validate_ask_input("oi", None, 10) == ("oi", None)
