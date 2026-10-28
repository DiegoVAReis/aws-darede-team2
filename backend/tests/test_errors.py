"""Testes de exemplo de errors.py (BC-02)."""

from __future__ import annotations

import pytest

from errors import (
    AppError,
    InternalAppError,
    KnowledgeBaseNotIndexedError,
    UpstreamError,
    ValidationAppError,
    to_error_body,
)


@pytest.mark.parametrize(
    ("error_class", "code", "status"),
    [
        (ValidationAppError, "VALIDATION_ERROR", 422),
        (KnowledgeBaseNotIndexedError, "KB_NOT_INDEXED", 503),
        (UpstreamError, "UPSTREAM_ERROR", 502),
        (InternalAppError, "INTERNAL_ERROR", 500),
    ],
)
def test_error_codes_and_http_status(error_class, code, status):
    error = error_class("mensagem")
    assert error.code == code
    assert error.status_code == status
    assert to_error_body(error) == {"error": {"code": code, "message": "mensagem"}}


def test_app_error_allows_overriding_code_and_status():
    error = AppError("x", code="CUSTOM", status_code=418)
    assert (error.code, error.status_code) == ("CUSTOM", 418)
