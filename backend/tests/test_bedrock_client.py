"""Testes de exemplo de bedrock_client.py (BC-04). O Bedrock e sempre simulado."""

from __future__ import annotations

import io
import json

import pytest
from botocore.exceptions import ClientError, EndpointConnectionError

from bedrock_client import BedrockEmbeddingClient, build_bedrock_runtime_client
from config import Settings
from errors import UpstreamError


class FakeRuntime:
    def __init__(self, payload=None, error=None):
        self.payload = payload
        self.error = error
        self.requests: list[dict] = []

    def invoke_model(self, **kwargs):
        self.requests.append(kwargs)
        if self.error is not None:
            raise self.error
        return {"body": io.BytesIO(json.dumps(self.payload).encode("utf-8"))}


def test_embed_returns_floats_and_sends_the_expected_request():
    runtime = FakeRuntime({"embedding": [1, 0.5, -0.25]})
    client = BedrockEmbeddingClient(Settings(), client=runtime)

    assert client.embed("garantia do trator") == [1.0, 0.5, -0.25]

    request = runtime.requests[0]
    assert request["modelId"] == "amazon.titan-embed-text-v2:0"
    body = json.loads(request["body"])
    assert body["inputText"] == "garantia do trator"
    assert body["normalize"] is True
    assert body["dimensions"] == 1024


def test_client_error_becomes_upstream_error_without_internal_details():
    error = ClientError(
        {"Error": {"Code": "AccessDeniedException", "Message": "token-secreto-xyz"}},
        "InvokeModel",
    )
    client = BedrockEmbeddingClient(Settings(), client=FakeRuntime(error=error))
    with pytest.raises(UpstreamError) as info:
        client.embed("texto")
    assert "token-secreto-xyz" not in info.value.message
    assert "AccessDenied" not in info.value.message


def test_connection_error_becomes_upstream_error():
    error = EndpointConnectionError(endpoint_url="https://exemplo.invalid")
    client = BedrockEmbeddingClient(Settings(), client=FakeRuntime(error=error))
    with pytest.raises(UpstreamError):
        client.embed("texto")


def test_unexpected_payload_becomes_upstream_error():
    client = BedrockEmbeddingClient(Settings(), client=FakeRuntime({"outro": []}))
    with pytest.raises(UpstreamError):
        client.embed("texto")


def test_blank_text_is_rejected_before_calling_bedrock():
    runtime = FakeRuntime({"embedding": [1.0]})
    client = BedrockEmbeddingClient(Settings(), client=runtime)
    with pytest.raises(UpstreamError):
        client.embed("   ")
    assert runtime.requests == []


def test_build_runtime_client_uses_the_configured_region(monkeypatch):
    monkeypatch.setenv("AWS_BEARER_TOKEN_BEDROCK", "token-de-teste")
    runtime = build_bedrock_runtime_client(Settings(aws_region="us-east-1"))
    assert runtime.meta.region_name == "us-east-1"
