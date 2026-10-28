"""Testes de dependencies.py (BC-12): montagem real dos componentes, sem chamar a AWS."""

from __future__ import annotations

import pytest
from strands import Agent

import dependencies
from assistant_service import AssistantService

CACHED = (
    "get_embedding_client",
    "get_knowledge_store",
    "get_retriever",
    "get_session_manager",
    "get_assistant_service",
)


@pytest.fixture
def wired(monkeypatch, app_settings):
    monkeypatch.setenv("AWS_BEARER_TOKEN_BEDROCK", "token-de-teste")
    monkeypatch.setattr(dependencies, "get_settings", lambda: app_settings)
    for name in CACHED:
        getattr(dependencies, name).cache_clear()
    yield
    for name in CACHED:
        getattr(dependencies, name).cache_clear()


def test_providers_return_a_single_shared_service(wired):
    service = dependencies.get_assistant_service()
    assert isinstance(service, AssistantService)
    assert dependencies.get_assistant_service() is service


def test_each_new_session_receives_a_strands_agent_with_both_tools(wired):
    lease = dependencies.get_session_manager().acquire(None)
    agent = lease.context.agent
    assert isinstance(agent, Agent)
    assert set(agent.tool_names) == {"retrieve", "not_in_knowledge_base"}
