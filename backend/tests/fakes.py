"""Falsos usados nos testes. Nenhum teste automatico chama a AWS."""

from __future__ import annotations

import math
from collections.abc import Callable
from pathlib import Path

from errors import UpstreamError

TOPICS = ("trator", "credito", "seguro", "silo")


class FakeEmbedder:
    """Embedding deterministico por palavra-chave: topicos ortogonais, distancia de cosseno 1.0."""

    def __init__(self, fail_on: str | None = None):
        self.calls: list[str] = []
        self.fail_on = fail_on

    def embed(self, text: str) -> list[float]:
        self.calls.append(text)
        if self.fail_on and self.fail_on in text:
            raise UpstreamError("falha simulada")
        lowered = text.lower()
        vector = [1.0 if topic in lowered else 0.0 for topic in TOPICS]
        vector.append(0.0 if any(vector) else 1.0)
        norm = math.sqrt(sum(value * value for value in vector))
        return [value / norm for value in vector]


class FakeAgent:
    """Agente falso: devolve o que o handler retorna e registra os prompts."""

    def __init__(self, handler: Callable[[str], str] | None = None):
        self.handler = handler or (lambda prompt: "resposta")
        self.prompts: list[str] = []

    def __call__(self, prompt: str) -> str:
        self.prompts.append(prompt)
        return self.handler(prompt)


class FakeRetriever:
    """Retriever falso para o servico: so controla ensure_ready."""

    def __init__(self, error: Exception | None = None):
        self.error = error
        self.ensure_calls = 0

    def ensure_ready(self) -> None:
        self.ensure_calls += 1
        if self.error is not None:
            raise self.error


def write_kb(directory: Path, documents: dict[str, str]) -> Path:
    """Cria uma pasta de base de conhecimento com os documentos informados."""
    directory.mkdir(parents=True, exist_ok=True)
    for name, text in documents.items():
        (directory / name).write_text(text, encoding="utf-8")
    return directory
