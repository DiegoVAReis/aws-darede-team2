"""Provedores de dependencias do FastAPI (BC-12). Os testes os substituem por falsos."""

from __future__ import annotations

from functools import lru_cache

from agent import build_agent, build_not_in_kb_tool, build_retrieve_tool
from assistant_service import AssistantService
from bedrock_client import BedrockEmbeddingClient
from config import get_settings
from knowledge_store import KnowledgeStore
from rag import Retriever
from sessions import SessionManager, SourceCollector


@lru_cache(maxsize=1)
def get_embedding_client() -> BedrockEmbeddingClient:
    return BedrockEmbeddingClient(get_settings())


@lru_cache(maxsize=1)
def get_knowledge_store() -> KnowledgeStore:
    settings = get_settings()
    return KnowledgeStore(settings.chroma_dir, settings.collection_name)


@lru_cache(maxsize=1)
def get_retriever() -> Retriever:
    return Retriever(get_settings(), get_embedding_client(), get_knowledge_store())


@lru_cache(maxsize=1)
def get_session_manager() -> SessionManager:
    """Instancia unica por processo (o backend roda com 1 worker)."""
    settings = get_settings()
    retriever = get_retriever()

    def agent_factory(collector: SourceCollector):
        return build_agent(
            settings,
            build_retrieve_tool(retriever, collector),
            build_not_in_kb_tool(collector),
        )

    return SessionManager(agent_factory, settings.max_sessions)


@lru_cache(maxsize=1)
def get_assistant_service() -> AssistantService:
    return AssistantService(get_session_manager(), get_settings(), get_retriever())
