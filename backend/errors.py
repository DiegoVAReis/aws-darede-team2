"""Erros de dominio com codigo estavel e mensagem segura (BC-02)."""

from __future__ import annotations


class AppError(Exception):
    """Base dos erros de dominio expostos pela API."""

    code = "INTERNAL_ERROR"
    status_code = 500

    def __init__(self, message: str, *, code: str | None = None, status_code: int | None = None):
        super().__init__(message)
        self.message = message
        if code is not None:
            self.code = code
        if status_code is not None:
            self.status_code = status_code


class ValidationAppError(AppError):
    """Texto vazio, so espacos, acima do tamanho maximo ou session_id invalido."""

    code = "VALIDATION_ERROR"
    status_code = 422


class KnowledgeBaseNotIndexedError(AppError):
    """A colecao do ChromaDB nao existe ou esta vazia."""

    code = "KB_NOT_INDEXED"
    status_code = 503


class UpstreamError(AppError):
    """Falha ao chamar o Amazon Bedrock."""

    code = "UPSTREAM_ERROR"
    status_code = 502


class InternalAppError(AppError):
    """Falha inesperada do proprio backend."""

    code = "INTERNAL_ERROR"
    status_code = 500


def to_error_body(error: AppError) -> dict:
    """Formato padrao de erro: {"error": {"code": ..., "message": ...}}."""
    return {"error": {"code": error.code, "message": error.message}}
