"""Orquestracao de um turno de conversa (BC-11)."""

from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass

from config import Settings
from errors import AppError, UpstreamError, ValidationAppError
from rag import Retriever
from schemas import SourceRef
from sessions import SessionManager

logger = logging.getLogger("anyone.service")

SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


@dataclass(frozen=True)
class AskResult:
    answer: str
    sources: list[SourceRef]
    session_id: str
    session_reset: bool


def validate_ask_input(
    text: str, session_id: str | None, max_text_chars: int
) -> tuple[str, str | None]:
    """Apara e valida a entrada. Devolve (texto_limpo, session_id) ou lanca VALIDATION_ERROR."""
    clean = text.strip()
    if not clean:
        raise ValidationAppError("A pergunta nao pode ser vazia.")
    if len(clean) > max_text_chars:
        raise ValidationAppError(f"A pergunta deve ter no maximo {max_text_chars} caracteres.")
    if session_id is not None and not SESSION_ID_PATTERN.fullmatch(session_id):
        raise ValidationAppError(
            "O identificador da sessao deve ter de 1 a 64 caracteres entre letras, "
            "numeros, '-' e '_'."
        )
    return clean, session_id


class AssistantService:
    def __init__(self, session_manager: SessionManager, settings: Settings, retriever: Retriever):
        self._sessions = session_manager
        self._settings = settings
        self._retriever = retriever

    def ask(self, text: str, session_id: str | None) -> AskResult:
        clean, sid = validate_ask_input(text, session_id, self._settings.max_text_chars)
        self._retriever.ensure_ready()

        started = time.monotonic()
        with self._sessions.acquire(sid) as lease:
            context = lease.context
            context.collector.reset()
            try:
                result = context.agent(clean)
            except AppError:
                raise
            except Exception as exc:
                logger.error("Falha no agente: %s", type(exc).__name__)
                raise UpstreamError(
                    "Nao foi possivel obter a resposta do assistente. Tente novamente."
                ) from None

            if context.collector.error is not None:
                raise context.collector.error

            answer = str(result).strip()
            if not answer:
                raise UpstreamError("O assistente nao devolveu uma resposta. Tente novamente.")

            sources = context.collector.snapshot()
            logger.info(
                "turno concluido sessao=%s duracao_ms=%d fontes=%d reset=%s",
                context.session_id[:8],
                int((time.monotonic() - started) * 1000),
                len(sources),
                lease.session_reset,
            )
            return AskResult(
                answer=answer,
                sources=sources,
                session_id=context.session_id,
                session_reset=lease.session_reset,
            )
