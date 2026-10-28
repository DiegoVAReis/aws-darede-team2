# Decisões de Tecnologia: Backend

Versões consultadas no PyPI em 2026-10-28. Todas fixadas com `==` no `backend/pyproject.toml`, porque o `uv.lock` não é versionado (`.gitignore`).

## Dependências de execução

| Pacote | Versão | Uso | Licença |
|---|---|---|---|
| `strands-agents` | 1.62.0 | Agente com tools e memória por sessão | Apache 2.0 |
| `fastapi` | 0.162.0 | Camada HTTP | MIT |
| `uvicorn` | 0.54.0 | Servidor ASGI | BSD |
| `pydantic` | 2.14.1 | Contratos de requisição e resposta | MIT |
| `chromadb` | 1.5.9 | Vector store local persistente | Apache 2.0 |
| `boto3` | 1.43.120 | Cliente Bedrock Runtime (aceita `AWS_BEARER_TOKEN_BEDROCK`, exigido >= 1.39) | Apache 2.0 |
| `python-dotenv` | 1.2.4 | Carga do `.env` | BSD |
| `tiktoken` | 0.14.0 | Contagem real de tokens no chunking (`cl100k_base`) | MIT |

## Dependências de desenvolvimento

| Pacote | Versão | Uso | Licença |
|---|---|---|---|
| `pytest` | 9.2.0 | Testes | MIT |
| `pytest-cov` | 7.1.0 | Cobertura | MIT |
| `hypothesis` | 6.170.13 | Testes baseados em propriedades (PBT-09) | MPL 2.0 |
| `ruff` | 0.17.3 | Lint e formatação | MIT |
| `httpx` | 0.28.1 | Necessário ao `TestClient` do FastAPI | BSD |

A licença MPL 2.0 do Hypothesis é copyleft fraco por arquivo e vale só como ferramenta de teste, não distribuída com a aplicação. O `requirements.md` pede MIT, Apache ou BSD; registrada aqui como exceção justificada, e o framework é o recomendado pela regra PBT-09 para Python.

## Seleção do framework de PBT (PBT-09)

| Critério | Hypothesis |
|---|---|
| Geradores de domínio customizados | Sim (`strategies`, `composite`) |
| Shrinking automático | Sim, ligado por padrão |
| Reprodução por seed | Sim (`--hypothesis-seed`, `print_blob=True`) |
| Integração com o runner | Plugin nativo do `pytest` |

## Empacotamento e ambiente

- `pyproject.toml` com `setuptools` e `py-modules`, para instalar em modo editável com `pip install -e ".[dev]"`. O `uv` também lê o mesmo arquivo (`uv sync --extra dev`).
- Ambiente virtual em `backend/.venv` (ignorado pelo `.gitignore`).
- Python 3.11 ou superior.

## Escolhas de implementação com impacto de design

| Tema | Decisão |
|---|---|
| Distância | Coleção do ChromaDB criada com `hnsw:space = cosine` e `embedding_function = None` (os vetores vêm sempre do Titan) |
| Embeddings | Titan v2 com 1024 dimensões e `normalize = true` |
| Agente | `strands.Agent` com `BedrockModel`, `SlidingWindowConversationManager` e `callback_handler = None` |
| Concorrência | Rota `POST /v1/ask` síncrona (`def`), executada pelo pool de threads do FastAPI; trava por sessão com `threading.Lock` |
| Imports | Módulos planos em `backend/`, executados a partir dessa pasta |
