"""Contratos Pydantic da API HTTP v1 (BC-03)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    """Corpo de POST /v1/ask. A validacao de negocio fica no servico."""

    text: str
    session_id: str | None = None


class SourceRef(BaseModel):
    """Fonte citada: arquivo e titulo H1 do documento."""

    file: str
    title: str


class AskResponse(BaseModel):
    answer: str
    sources: list[SourceRef] = Field(default_factory=list)
    session_id: str
    session_reset: bool = False


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail


class HealthResponse(BaseModel):
    status: str
