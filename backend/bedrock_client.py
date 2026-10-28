"""Acesso ao Amazon Bedrock Runtime para embeddings (BC-04).

A autenticacao usa AWS_BEARER_TOKEN_BEDROCK, lido automaticamente pelo boto3 (>= 1.39).
O token nunca e lido, guardado nem registrado em log por este modulo.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from config import Settings
from errors import UpstreamError

logger = logging.getLogger("anyone.bedrock")

EMBEDDING_DIMENSIONS = 1024


def build_bedrock_runtime_client(settings: Settings) -> Any:
    """Cria o cliente bedrock-runtime com tempos limite configurados."""
    config = Config(
        read_timeout=settings.bedrock_read_timeout,
        connect_timeout=10,
        user_agent_extra="anyone-assistant",
    )
    return boto3.client("bedrock-runtime", region_name=settings.aws_region, config=config)


class BedrockEmbeddingClient:
    """Gera embeddings com o Titan Text Embeddings v2."""

    def __init__(self, settings: Settings, client: Any | None = None):
        self._model_id = settings.bedrock_embed_model_id
        self._client = client if client is not None else build_bedrock_runtime_client(settings)

    def embed(self, text: str) -> list[float]:
        """Embedding do texto. Qualquer falha vira UpstreamError sem detalhes internos."""
        if not text or not text.strip():
            raise UpstreamError("Nao foi possivel gerar o embedding de um texto vazio.")
        body = json.dumps(
            {
                "inputText": text,
                "dimensions": EMBEDDING_DIMENSIONS,
                "normalize": True,
            }
        )
        try:
            response = self._client.invoke_model(
                modelId=self._model_id,
                body=body,
                accept="application/json",
                contentType="application/json",
            )
            payload = json.loads(response["body"].read())
            embedding = payload["embedding"]
            return [float(value) for value in embedding]
        except (BotoCoreError, ClientError) as exc:
            logger.error("Falha ao chamar o Bedrock (embedding): %s", type(exc).__name__)
            raise UpstreamError(
                "Nao foi possivel consultar o servico de IA. Tente novamente em instantes."
            ) from None
        except (KeyError, TypeError, ValueError) as exc:
            logger.error("Resposta inesperada do Bedrock (embedding): %s", type(exc).__name__)
            raise UpstreamError(
                "O servico de IA devolveu uma resposta inesperada. Tente novamente."
            ) from None
