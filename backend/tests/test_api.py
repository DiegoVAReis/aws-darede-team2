"""Testes da API HTTP (BC-13) com o servico substituido por um falso."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import dependencies
from assistant_service import AskResult
from config import Settings
from errors import KnowledgeBaseNotIndexedError, UpstreamError, ValidationAppError
from main import create_app
from schemas import SourceRef

ORIGIN = "http://localhost:5173"


class FakeService:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error
        self.calls: list[tuple] = []

    def ask(self, text, session_id):
        self.calls.append((text, session_id))
        if self.error is not None:
            raise self.error
        return self.result


def make_client(service, raise_server_exceptions=True):
    app = create_app(Settings())
    app.dependency_overrides[dependencies.get_assistant_service] = lambda: service
    return TestClient(app, raise_server_exceptions=raise_server_exceptions)


def test_health():
    client = make_client(FakeService())
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ask_returns_the_contract_fields():
    result = AskResult(
        answer="Garantia de 12 meses.",
        sources=[SourceRef(file="tratores.md", title="Catalogo de Tratores")],
        session_id="sessao-1",
        session_reset=True,
    )
    service = FakeService(result)
    client = make_client(service)

    response = client.post("/v1/ask", json={"text": "garantia?", "session_id": "sessao-1"})

    assert response.status_code == 200
    assert response.json() == {
        "answer": "Garantia de 12 meses.",
        "sources": [{"file": "tratores.md", "title": "Catalogo de Tratores"}],
        "session_id": "sessao-1",
        "session_reset": True,
    }
    assert service.calls == [("garantia?", "sessao-1")]


def test_session_id_is_optional():
    result = AskResult("ok", [], "novo", False)
    service = FakeService(result)
    make_client(service).post("/v1/ask", json={"text": "oi"})
    assert service.calls == [("oi", None)]


@pytest.mark.parametrize(
    ("error", "status", "code"),
    [
        (ValidationAppError("texto invalido"), 422, "VALIDATION_ERROR"),
        (KnowledgeBaseNotIndexedError("sem base"), 503, "KB_NOT_INDEXED"),
        (UpstreamError("bedrock fora"), 502, "UPSTREAM_ERROR"),
    ],
)
def test_domain_errors_use_the_standard_error_format(error, status, code):
    client = make_client(FakeService(error=error))
    response = client.post("/v1/ask", json={"text": "oi"})
    assert response.status_code == status
    assert response.json() == {"error": {"code": code, "message": error.message}}


@pytest.mark.parametrize(
    "payload",
    [{}, {"session_id": "x"}, {"text": 123}, {"text": "oi", "session_id": 5}, []],
)
def test_malformed_bodies_return_validation_error(payload):
    service = FakeService(AskResult("ok", [], "s", False))
    client = make_client(service)
    response = client.post("/v1/ask", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert service.calls == []


def test_non_json_body_returns_validation_error():
    client = make_client(FakeService())
    response = client.post("/v1/ask", content="nao e json", headers={"Content-Type": "text/plain"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_unexpected_failure_returns_internal_error_without_details():
    client = make_client(FakeService(error=RuntimeError("detalhe-secreto")), False)
    response = client.post("/v1/ask", json={"text": "oi"})
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "INTERNAL_ERROR"
    assert "detalhe-secreto" not in response.text


def test_cors_allows_only_the_configured_origin():
    client = make_client(FakeService())
    headers = {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    }

    allowed = client.options("/v1/ask", headers={**headers, "Origin": ORIGIN})
    denied = client.options("/v1/ask", headers={**headers, "Origin": "http://outro.site"})

    assert allowed.headers.get("access-control-allow-origin") == ORIGIN
    assert "access-control-allow-origin" not in denied.headers
