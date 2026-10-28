"""Pipeline offline de indexacao da base de conhecimento (BC-07).

Uso, a partir de backend/:  python ingest.py
"""

from __future__ import annotations

import logging
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol

from chunking import build_chunk_id, extract_title, split_into_chunks, title_from_stem
from config import Settings, get_settings
from errors import AppError
from knowledge_store import KnowledgeStore, StoredChunk

logger = logging.getLogger("anyone.ingest")


class Embedder(Protocol):
    def embed(self, text: str) -> list[float]: ...


class IngestError(Exception):
    """Falha que impede a ingestao de comecar (pasta ou documentos ausentes)."""


@dataclass(frozen=True)
class KbDocument:
    source: str
    title: str
    text: str

    @property
    def stem(self) -> str:
        return Path(self.source).stem


@dataclass
class IngestReport:
    documents: int = 0
    chunks_indexed: int = 0
    chunks_removed: int = 0
    total_chunks: int = 0
    failed_sources: list[str] = field(default_factory=list)


class KnowledgeIngestor:
    def __init__(self, settings: Settings, embedder: Embedder, store: KnowledgeStore):
        self._settings = settings
        self._embedder = embedder
        self._store = store

    def load_documents(self, kb_dir: Path) -> list[KbDocument]:
        """Le os *.md em ordem alfabetica. Erro claro se a pasta nao existir ou estiver vazia."""
        if not kb_dir.is_dir():
            raise IngestError(f"A pasta da base de conhecimento nao existe: {kb_dir}")
        files = sorted(kb_dir.glob("*.md"))
        if not files:
            raise IngestError(f"Nenhum documento .md encontrado em: {kb_dir}")
        documents = []
        for path in files:
            text = path.read_text(encoding="utf-8")
            title = extract_title(text, title_from_stem(path.stem))
            documents.append(KbDocument(source=path.name, title=title, text=text))
        return documents

    def run(self) -> IngestReport:
        documents = self.load_documents(self._settings.kb_dir)
        report = IngestReport(documents=len(documents))

        for document in documents:
            try:
                chunks = self._build_chunks(document)
            except AppError as exc:
                logger.error("Falha ao indexar %s: %s", document.source, exc.code)
                report.failed_sources.append(document.source)
                continue
            self._store.upsert_chunks(chunks)
            report.chunks_indexed += len(chunks)
            keep_ids = {chunk.id for chunk in chunks}
            report.chunks_removed += self._store.remove_stale_chunks(document.source, keep_ids)

        current = {document.source for document in documents}
        for orphan in sorted(self._store.indexed_sources() - current):
            report.chunks_removed += self._store.remove_source(orphan)

        report.total_chunks = self._store.count()
        return report

    def _build_chunks(self, document: KbDocument) -> list[StoredChunk]:
        pieces = split_into_chunks(
            document.text, self._settings.chunk_size, self._settings.chunk_overlap
        )
        chunks = []
        for index, piece in enumerate(pieces):
            embedding = self._embedder.embed(f"{document.title}\n\n{piece}")
            chunks.append(
                StoredChunk(
                    id=build_chunk_id(document.stem, index),
                    text=piece,
                    embedding=embedding,
                    source=document.source,
                    title=document.title,
                )
            )
        return chunks


def main() -> int:
    """Ponto de entrada de linha de comando. Devolve o codigo de saida."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    settings = get_settings()
    missing = settings.missing_required()
    if missing:
        print("Variaveis obrigatorias ausentes no .env: " + ", ".join(missing))
        return 1

    from bedrock_client import BedrockEmbeddingClient

    embedder = BedrockEmbeddingClient(settings)
    store = KnowledgeStore(settings.chroma_dir, settings.collection_name)
    try:
        report = KnowledgeIngestor(settings, embedder, store).run()
    except IngestError as exc:
        print(f"Ingestao nao executada: {exc}")
        return 1

    print(
        f"Documentos lidos: {report.documents} | chunks gravados: {report.chunks_indexed} | "
        f"chunks removidos: {report.chunks_removed} | total na colecao: {report.total_chunks}"
    )
    if report.failed_sources:
        print("Documentos com falha (rode novamente): " + ", ".join(report.failed_sources))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
