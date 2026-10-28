"""Recuperacao de trechos relevantes com citacao de fonte (BC-08)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from config import Settings
from errors import KnowledgeBaseNotIndexedError
from knowledge_store import KnowledgeStore, QueryHit
from schemas import SourceRef


class Embedder(Protocol):
    def embed(self, text: str) -> list[float]: ...


@dataclass(frozen=True)
class RetrievedPassage:
    text: str
    source: str
    title: str
    distance: float


@dataclass(frozen=True)
class RetrievalResult:
    passages: list[RetrievedPassage] = field(default_factory=list)
    sources: list[SourceRef] = field(default_factory=list)

    @property
    def has_relevant(self) -> bool:
        return bool(self.passages)


def filter_relevant(hits: list[QueryHit], max_distance: float) -> list[QueryHit]:
    """Mantem, na ordem original, os hits com distancia menor ou igual ao limite."""
    return [hit for hit in hits if hit.distance <= max_distance]


def dedupe_sources(hits: list[QueryHit]) -> list[SourceRef]:
    """Fontes sem repeticao por arquivo, na ordem da primeira aparicao."""
    seen: set[str] = set()
    sources: list[SourceRef] = []
    for hit in hits:
        if hit.source in seen:
            continue
        seen.add(hit.source)
        sources.append(SourceRef(file=hit.source, title=hit.title))
    return sources


class Retriever:
    def __init__(self, settings: Settings, embedder: Embedder, store: KnowledgeStore):
        self._settings = settings
        self._embedder = embedder
        self._store = store

    def ensure_ready(self) -> None:
        """Garante que a base esta indexada; caso contrario lanca KB_NOT_INDEXED."""
        if not self._store.exists() or self._store.count() == 0:
            raise KnowledgeBaseNotIndexedError(
                "A base de conhecimento ainda nao foi indexada. "
                "Execute a ingestao antes de fazer perguntas."
            )

    def retrieve(self, question: str, top_k: int | None = None) -> RetrievalResult:
        self.ensure_ready()
        limit = top_k if top_k is not None else self._settings.top_k
        hits = self._store.query(self._embedder.embed(question), limit)
        relevant = filter_relevant(hits, self._settings.max_distance)
        passages = [
            RetrievedPassage(
                text=hit.text, source=hit.source, title=hit.title, distance=hit.distance
            )
            for hit in relevant
        ]
        return RetrievalResult(passages=passages, sources=dedupe_sources(relevant))
