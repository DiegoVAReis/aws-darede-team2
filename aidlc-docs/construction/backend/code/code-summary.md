# Resumo da Geração de Código: Unidade 1 Backend

Código de aplicação em `backend/` (raiz do workspace). Plano: `aidlc-docs/construction/plans/backend-code-generation-plan.md` (15 de 15 passos concluídos).

## Arquivos criados

### Aplicação (`backend/`)
| Arquivo | Componente | Papel |
|---|---|---|
| `pyproject.toml` | Estrutura | Dependências fixadas, `ruff`, `pytest`, cobertura (mínimo 80%) |
| `config.py` | BC-01 | `Settings.from_env`, `get_settings` (carrega `.env` da raiz), `missing_required` |
| `errors.py` | BC-02 | `AppError` e subclasses, `to_error_body` |
| `schemas.py` | BC-03 | Contratos Pydantic da API |
| `bedrock_client.py` | BC-04 | Embeddings Titan v2 com tempo limite e erros seguros |
| `chunking.py` | BC-05 | Contagem de tokens, divisão em janelas, título H1, ids |
| `knowledge_store.py` | BC-06 | ChromaDB com distância de cosseno |
| `ingest.py` | BC-07 | Ingestão idempotente, comando `python ingest.py` |
| `rag.py` | BC-08 | Filtro de relevância, fontes deduplicadas, `ensure_ready` |
| `agent.py` | BC-09 | Prompt, tools `retrieve` e `not_in_knowledge_base`, `build_agent` |
| `sessions.py` | BC-10 | `SourceCollector`, `SessionManager` (LRU, trava por sessão) |
| `assistant_service.py` | BC-11 | Validação e orquestração do turno |
| `dependencies.py` | BC-12 | Provedores `Depends` |
| `main.py` | BC-13 | `GET /health`, `POST /v1/ask`, CORS, tratadores de erro |

### Testes (`backend/tests/`)
| Arquivo | Tipo |
|---|---|
| `test_config.py`, `test_errors.py`, `test_chunking.py`, `test_bedrock_client.py`, `test_knowledge_store.py`, `test_ingest.py`, `test_rag.py`, `test_sessions.py`, `test_agent.py`, `test_assistant_service.py`, `test_api.py`, `test_dependencies.py` | Exemplo (PBT-10) |
| `test_config_properties.py`, `test_schemas_properties.py`, `test_chunking_properties.py`, `test_rag_properties.py`, `test_sessions_properties.py`, `test_assistant_service_properties.py` | Propriedades (Hypothesis) |
| `test_integration_flow.py` | Integração: ingestão, recuperação, tools reais, `/v1/ask` |
| `strategies.py`, `fakes.py`, `conftest.py` | Geradores de domínio (PBT-07), falsos e perfil do Hypothesis (PBT-08) |

## Como executar (PowerShell; entre antes em `backend/` com `cd backend`, pois o `pyproject.toml` fica lá)

Python 3.11 ou superior (o seu é o 3.13.5). Sem `uv`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"

.\.venv\Scripts\python.exe -m pytest --cov            # testes e cobertura (mínimo 80%)
.\.venv\Scripts\python.exe -m ruff format .           # formata (rode uma vez)
.\.venv\Scripts\python.exe -m ruff check .            # lint

.\.venv\Scripts\python.exe ingest.py                  # indexa anyone_kb/ (precisa do .env e de internet)
.\.venv\Scripts\python.exe -m uvicorn main:app --port 8000
```

Com `uv` (opcional, depois de `pip install uv`): `uv sync --extra dev`, `uv run pytest --cov`, `uv run python ingest.py`, `uv run uvicorn main:app --port 8000`.

Reprodução de uma falha de propriedade: `pytest --hypothesis-seed=<N>` (o Hypothesis imprime o blob e a seed da falha).

Verificação rápida da API, com o servidor no ar:
```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod -Method Post -Uri http://localhost:8000/v1/ask -ContentType "application/json" `
  -Body '{"text":"Qual a garantia padrão dos tratores?"}'
```

## Notas para o README raiz (Unidade 2)

- Pré-requisitos: Python 3.11+, Node.js, `npm`, `.env` na raiz do projeto com as 4 variáveis (`AWS_BEARER_TOKEN_BEDROCK`, `AWS_REGION`, `BEDROCK_MODEL_ID`, `BEDROCK_EMBED_MODEL_ID`).
- Ordem: instalar o backend, rodar a ingestão, subir o backend (1 worker), subir o front.
- Primeira execução precisa de internet (vocabulário do `tiktoken`).
- O `.env` e a API Key nunca vão para o repositório.

## Conformidade PBT (modo Parcial)

| Regra | Status | Evidência |
|---|---|---|
| PBT-01 | Compatível | Propriedades em `business-logic-model.md` §5, usadas no plano |
| PBT-02 | Compatível | `test_schemas_properties.py`, `test_chunking_properties.py` (título e id) |
| PBT-03 | Compatível | Invariantes de chunking, relevância, fontes, validação, sessões e configuração |
| PBT-04 | Compatível | Deduplicação e normalização de entrada idempotentes |
| PBT-05 | N/A | Não há implementação de referência |
| PBT-06 | Orientativo, atendido | Modelo LRU em `test_sessions_properties.py` |
| PBT-07 | Compatível | `tests/strategies.py` centraliza os geradores de domínio |
| PBT-08 | Compatível | Shrinking padrão, `print_blob=True`, `--hypothesis-seed` |
| PBT-09 | Compatível | Hypothesis em `pyproject.toml` e em `tech-stack-decisions.md` |
| PBT-10 | Compatível | Exemplos e propriedades em arquivos separados; cenários de aceitação em `test_integration_flow.py` |

## Pontos a validar na execução (o assistente não roda Python no seu ambiente)

1. **Instalação:** as versões fixas foram consultadas no PyPI, mas não instaladas juntas. Se o `pip` apontar conflito, ajustar a versão indicada.
2. **Chroma:** a criação da coleção usa `metadata={"hnsw:space": "cosine"}`. Se a versão 1.5.9 rejeitar esse formato, trocar por `configuration={"hnsw": {"space": "cosine"}}` em `KnowledgeStore._for_write`. Os testes de `test_knowledge_store.py` acusam isso logo.
3. **Strands:** `build_agent` usa `BedrockModel(..., boto_client_config=...)`, `SlidingWindowConversationManager` e `agent.tool_names`. `test_agent.py::test_build_agent_registers_both_tools` e `test_dependencies.py` confirmam a compatibilidade.
4. **Formatação:** rode `ruff format .` antes de `ruff check .`; o código foi escrito à mão e pode haver ajustes de estilo.
5. **Bedrock real:** a API Key do `.env` está válida (o comentário de validade no arquivo está desatualizado). Já dá para rodar `ingest.py` e testar o `/v1/ask`. A calibração do limite de distância (padrão 0.6) é feita nesse momento.
6. **Nova Pro:** se `amazon.nova-pro-v1:0` não aceitar chamada direta na sua conta, usar `BEDROCK_MODEL_ID=us.amazon.nova-pro-v1:0` no `.env`.
