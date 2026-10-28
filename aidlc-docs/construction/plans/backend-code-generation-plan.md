# Plano de Code Generation: Unidade 1 Backend

Este plano é a fonte única de verdade da geração de código do Backend. Aprovado por delegação do usuário ("siga os próximos passos").

## Contexto da unidade

- **Histórias:** US-01 a US-10 (a parte de interface da US-10 é do Frontend).
- **Dependências de outras unidades:** nenhuma. O Frontend depende do contrato HTTP v1 definido em `unit-of-work-dependency.md`.
- **Código em:** `backend/` na raiz do workspace (`c:\Workshop\rag-agent-chatbot-v2`). Documentação em `aidlc-docs/construction/backend/code/`.
- **Entradas de design:** `functional-design/` (entidades, regras BR-*, fluxos, propriedades testáveis) e `nfr-requirements/` (valores fechados e versões).
- **Entidades de dados:** coleção `anyone` do ChromaDB (dona desta unidade). Não há migração de banco.
- **Interfaces expostas:** `GET /health`, `POST /v1/ask`, comando de ingestão `python ingest.py`.
- **Limite de verificação:** o assistente não executa Python no ambiente do usuário. Testes, `ruff` e cobertura são executados pelo usuário no Build and Test.

## Estrutura de arquivos

```
backend/
  pyproject.toml
  config.py            errors.py          schemas.py
  bedrock_client.py    chunking.py        knowledge_store.py
  ingest.py            rag.py             agent.py
  sessions.py          assistant_service.py
  dependencies.py      main.py
  tests/
    conftest.py        strategies.py
    test_config.py     test_errors.py     test_schemas_properties.py
    test_chunking.py   test_chunking_properties.py
    test_bedrock_client.py   test_knowledge_store.py
    test_ingest.py     test_rag.py        test_rag_properties.py
    test_sessions.py   test_sessions_properties.py
    test_agent.py      test_assistant_service.py
    test_assistant_service_properties.py
    test_api.py        test_integration_flow.py
```

## Passos

- [x] **Step 1: Estrutura do projeto.** Criar `backend/pyproject.toml` (dependências fixadas, ferramentas, `ruff`, `pytest`, cobertura) e ajustar o `.gitignore` (`.hypothesis/`, `*.egg-info/`). Histórias: todas (base).
- [x] **Step 2: Configuração, erros e contratos.** `config.py`, `errors.py`, `schemas.py`. Histórias: US-03, US-04, US-16.
- [x] **Step 3: Chunking.** `chunking.py` (contagem de tokens, divisão, título, ids). Histórias: US-01, US-02.
- [x] **Step 4: Cliente de embeddings.** `bedrock_client.py`. Histórias: US-01, US-04.
- [x] **Step 5: Vector store.** `knowledge_store.py`. Histórias: US-01, US-02, US-03, US-04.
- [x] **Step 6: Ingestão.** `ingest.py`. Histórias: US-01, US-02, US-03.
- [x] **Step 7: Recuperação.** `rag.py`. Histórias: US-04, US-05, US-06.
- [x] **Step 8: Sessões e coletor de fontes.** `sessions.py`. Histórias: US-05, US-08, US-09, US-10.
- [x] **Step 9: Agente.** `agent.py` (prompt, tools `retrieve` e `not_in_knowledge_base`, `build_agent`). Histórias: US-04, US-06, US-07, US-08.
- [x] **Step 10: Serviço do assistente.** `assistant_service.py` (validação, orquestração do turno). Histórias: US-04 a US-10.
- [x] **Step 11: Dependências e API.** `dependencies.py`, `main.py` (rotas, CORS, tratadores de erro, log de inicialização). Histórias: US-03, US-04, US-11, US-16.
- [x] **Step 12: Utilitários de teste.** `tests/conftest.py` (perfil do Hypothesis, falsos) e `tests/strategies.py` (geradores de domínio, PBT-07).
- [x] **Step 13: Testes de exemplo e de propriedades dos módulos dos Steps 2 a 10.** Inclui round-trips (PBT-02), invariantes (PBT-03), idempotência (PBT-04) e o modelo simples de sessões (PBT-06 orientativo). Exemplos para os critérios de aceitação (PBT-10).
- [x] **Step 14: Testes de API e de integração do fluxo** ingestão, recuperação e `/v1/ask` com Bedrock simulado.
- [x] **Step 15: Documentação.** Resumo em `aidlc-docs/construction/backend/code/code-summary.md`, com comandos, notas para o README raiz e pontos a validar.

## Rastreabilidade de histórias

| História | Passos |
|---|---|
| US-01 Indexar a base | 3, 4, 5, 6, 13 |
| US-02 Reindexar sem duplicar | 3, 5, 6, 13 |
| US-03 Saber se a base está indexada | 2, 5, 7, 10, 11 |
| US-04 Resposta fundamentada | 2, 7, 9, 10, 11 |
| US-05 Fontes da resposta | 7, 8, 10 |
| US-06 Aviso de fora da base | 7, 9, 10 |
| US-07 Idioma da pergunta | 9 |
| US-08 Perguntas de acompanhamento | 8, 9, 10 |
| US-09 Conversas independentes | 8, 10 |
| US-10 (API) contexto reiniciado | 8, 10, 11 |

## Conformidade PBT (modo Parcial: PBT-02, 03, 07, 08, 09 bloqueantes)

| Regra | Como será atendida |
|---|---|
| PBT-01 | Propriedades listadas em `business-logic-model.md` §5 e usadas neste plano (Step 13) |
| PBT-02 | Round-trip de `AskRequest`, `AskResponse`, `SourceRef`, `ErrorResponse` e do título H1 |
| PBT-03 | Invariantes de chunking, `dedupe_sources`, `filter_relevant`, validação de entrada, sessões, ids |
| PBT-07 | Geradores centralizados em `tests/strategies.py` (texto em português, títulos, ids de sessão, hits) |
| PBT-08 | Shrinking ligado; `print_blob=True`; seed reproduzível por `--hypothesis-seed` |
| PBT-09 | Hypothesis em `pyproject.toml` e em `tech-stack-decisions.md` |
