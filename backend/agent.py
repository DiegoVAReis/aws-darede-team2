"""Agente Strands com Amazon Nova Pro e as tools de recuperacao (BC-09)."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from botocore.config import Config
from strands import Agent, tool
from strands.agent.conversation_manager import SlidingWindowConversationManager
from strands.models import BedrockModel

from config import Settings
from errors import AppError
from rag import RetrievalResult, Retriever
from sessions import SourceCollector

logger = logging.getLogger("anyone.agent")

NO_RELEVANT_MESSAGE = (
    "NO_RELEVANT_PASSAGES: a base interna nao tem trechos relevantes para esta consulta. "
    "Chame a ferramenta not_in_knowledge_base e responda com conhecimento geral, avisando "
    "explicitamente no inicio da resposta que a informacao nao veio da base interna."
)

SYSTEM_PROMPT = """\
Voce e o Assistente de Conhecimento Interno da Anyone Agro Business, uma empresa que integra \
cooperativa de produtores, industria de proteina bovina, revenda de maquinas agricolas, \
industria de insumos e usina de bioenergia. Voce ajuda colaboradores e cooperados a tirar \
duvidas sobre procedimentos, normas, catalogos e politicas internas.

Regras:
1. Para toda pergunta sobre a empresa ou seus processos, chame a ferramenta `retrieve` antes \
de responder. Se a pergunta for de acompanhamento (por exemplo, "e a colheitadeira?"), reescreva \
a consulta de forma completa e autossuficiente usando o contexto da conversa.
2. Responda no mesmo idioma da pergunta do usuario.
3. Baseie a resposta apenas nos trechos devolvidos por `retrieve`. Nao invente informacoes. \
Se os trechos nao trazerem o detalhe pedido, diga isso com clareza.
4. Seja objetivo e direto. Use Markdown simples (listas e negrito quando ajudarem). \
Nao cite nomes de arquivos no texto; as fontes sao exibidas separadamente.
5. Se `retrieve` indicar que nao ha trechos relevantes, ou se os trechos nao responderem a \
pergunta, chame a ferramenta `not_in_knowledge_base` e responda com seu conhecimento geral. \
Nesse caso, comece a resposta avisando de forma explicita, no idioma da pergunta, que a \
informacao nao veio da base interna da empresa.
6. Perguntas que nao tem relacao com a empresa (conversa casual, por exemplo) podem ser \
respondidas brevemente, sem usar a base.
"""


def format_passages(result: RetrievalResult) -> str:
    """Texto entregue ao modelo com os trechos relevantes."""
    blocks = [
        f"[{index}] Documento: {passage.title}\n{passage.text}"
        for index, passage in enumerate(result.passages, start=1)
    ]
    return "Trechos relevantes da base interna:\n\n" + "\n\n".join(blocks)


def build_retrieve_tool(retriever: Retriever, collector: SourceCollector) -> Callable[..., str]:
    """Tool `retrieve` ligada ao coletor de fontes da sessao."""

    @tool
    def retrieve(query: str) -> str:
        """Busca na base de conhecimento interna da Anyone Agro Business.

        Args:
            query: Consulta completa e autossuficiente, no idioma do usuario.
        """
        try:
            result = retriever.retrieve(query)
        except AppError as exc:
            collector.record_error(exc)
            return "ERROR: a busca na base interna falhou."
        if not result.has_relevant:
            return NO_RELEVANT_MESSAGE
        collector.add(result.sources)
        return format_passages(result)

    return retrieve


def build_not_in_kb_tool(collector: SourceCollector) -> Callable[..., str]:
    """Tool que descarta as fontes do turno quando a base nao responde."""

    @tool
    def not_in_knowledge_base() -> str:
        """Indica que a base interna nao responde a pergunta atual.

        Chame esta ferramenta antes de responder com conhecimento geral.
        """
        collector.discard()
        return "OK: nenhuma fonte sera exibida. Avise que a resposta nao veio da base interna."

    return not_in_knowledge_base


def build_agent(
    settings: Settings,
    retrieve_tool: Callable[..., str],
    not_in_kb_tool: Callable[..., str],
) -> Any:
    """Agente Strands com Nova Pro e janela deslizante de mensagens."""
    model = BedrockModel(
        model_id=settings.bedrock_model_id,
        region_name=settings.aws_region,
        temperature=0.2,
        boto_client_config=Config(
            read_timeout=settings.bedrock_read_timeout,
            connect_timeout=10,
            user_agent_extra="anyone-assistant",
        ),
    )
    return Agent(
        model=model,
        system_prompt=SYSTEM_PROMPT,
        tools=[retrieve_tool, not_in_kb_tool],
        conversation_manager=SlidingWindowConversationManager(window_size=settings.session_window),
        callback_handler=None,
    )
