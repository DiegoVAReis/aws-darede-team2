"""Encapsula o ChromaDB local (BC-06). Colecao com distancia de cosseno."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import chromadb


@dataclass(frozen=True)
class StoredChunk:
    id: str
    text: str
    embedding: list[float]
    source: str
    title: str


@dataclass(frozen=True)
class QueryHit:
    text: str
    source: str
    title: str
    distance: float


class KnowledgeStore:
    """Grava, remove e consulta chunks. Os vetores sempre vem do Titan (sem funcao padrao)."""

    def __init__(self, persist_dir: Path, collection_name: str, client: Any | None = None):
        self._name = collection_name
        self._client = (
            client if client is not None else chromadb.PersistentClient(path=str(persist_dir))
        )

    def _existing(self) -> Any | None:
        try:
            return self._client.get_collection(self._name, embedding_function=None)
        except Exception:  # a colecao ainda nao existe (o tipo da excecao varia por versao)
            return None

    def _for_write(self) -> Any:
        return self._client.get_or_create_collection(
            self._name,
            embedding_function=None,
            metadata={"hnsw:space": "cosine"},
        )

    def exists(self) -> bool:
        return self._existing() is not None

    def count(self) -> int:
        collection = self._existing()
        return 0 if collection is None else int(collection.count())

    def upsert_chunks(self, chunks: list[StoredChunk]) -> None:
        if not chunks:
            return
        self._for_write().upsert(
            ids=[c.id for c in chunks],
            embeddings=[c.embedding for c in chunks],
            documents=[c.text for c in chunks],
            metadatas=[{"source": c.source, "title": c.title} for c in chunks],
        )

    def remove_stale_chunks(self, source: str, keep_ids: set[str]) -> int:
        """Remove os chunks do documento cujo id nao esta em keep_ids. Devolve a quantidade."""
        collection = self._existing()
        if collection is None:
            return 0
        found = collection.get(where={"source": source}, include=[])
        stale = [chunk_id for chunk_id in found["ids"] if chunk_id not in keep_ids]
        if stale:
            collection.delete(ids=stale)
        return len(stale)

    def indexed_sources(self) -> set[str]:
        """Nomes de arquivo que possuem chunks na colecao."""
        collection = self._existing()
        if collection is None:
            return set()
        found = collection.get(include=["metadatas"])
        return {meta["source"] for meta in (found["metadatas"] or []) if meta and "source" in meta}

    def remove_source(self, source: str) -> int:
        """Remove todos os chunks de um arquivo. Devolve a quantidade removida."""
        collection = self._existing()
        if collection is None:
            return 0
        found = collection.get(where={"source": source}, include=[])
        ids = list(found["ids"])
        if ids:
            collection.delete(ids=ids)
        return len(ids)

    def query(self, embedding: list[float], top_k: int) -> list[QueryHit]:
        """Os top_k chunks mais proximos, do mais para o menos relevante."""
        collection = self._existing()
        if collection is None:
            return []
        total = int(collection.count())
        if total == 0 or top_k < 1:
            return []
        result = collection.query(
            query_embeddings=[embedding],
            n_results=min(top_k, total),
            include=["documents", "metadatas", "distances"],
        )
        documents = result["documents"][0]
        metadatas = result["metadatas"][0]
        distances = result["distances"][0]
        return [
            QueryHit(
                text=document,
                source=str(meta.get("source", "")),
                title=str(meta.get("title", "")),
                distance=float(distance),
            )
            for document, meta, distance in zip(documents, metadatas, distances, strict=True)
        ]
