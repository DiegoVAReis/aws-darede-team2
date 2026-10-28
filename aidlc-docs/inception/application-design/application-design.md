# Application Design (consolidado)

Documento de resumo do design de alto nível. Detalhes em:
- `components.md`: componentes, responsabilidades e interfaces
- `component-methods.md`: assinaturas
- `services.md`: serviços e orquestração
- `component-dependency.md`: matriz de dependências, padrões de comunicação e fluxos de dados

Fontes: `requirements.md`, `stories.md`, `execution-plan.md` e as respostas do `application-design-plan.md`.

## 1. Visão geral

Duas unidades, em uma aplicação local:

- **Backend** (`backend/`, Python 3.11+): ingestão offline, recuperação com citação de fonte, agente Strands com Nova Pro, sessões em memória e API FastAPI.
- **Frontend** (`frontend/`, React 18 + Vite + TypeScript): interface estilo ChatGPT com barra lateral de conversas, consumindo o contrato HTTP do backend.

```
frontend/ (React)  --HTTP/JSON-->  backend/ (FastAPI)  --boto3-->  Amazon Bedrock
                                         |                          (Nova Pro e Titan v2)
                                         +--> ChromaDB local (backend/chroma_store/)
anyone_kb/ (md)  --ingest.py-->  ChromaDB local
```

## 2. Decisões de design

| # | Tema | Decisão | Motivo |
|---|---|---|---|
| 1 | Layout do backend | Módulos planos em `backend/` (`main.py`, `agent.py`, `rag.py`, `ingest.py`) mais `config.py`, `bedrock_client.py`, `chunking.py`, `knowledge_store.py`, `sessions.py`, `assistant_service.py`, `dependencies.py`, `schemas.py`, `errors.py`; testes em `backend/tests/` | Alinhado ao `tech-env.md`; execução com `uvicorn main:app` a partir de `backend/` |
| 2 | Acesso ao Bedrock | `bedrock_client.py` compartilhado, com `embed()` | Evita acoplar `rag.py` a `ingest.py` |
| 3 | Camada de serviço | `AssistantService.ask(text, session_id)` | Endpoint fino e regras de turno testáveis |
| 4 | Fontes por turno | `SourceCollector` por sessão, preenchido pela tool `retrieve` e zerado a cada turno | Fontes reais, não inventadas pelo modelo |
| 5 | Sessões | Um agente Strands por sessão com janela deslizante de 20 mensagens; `SessionManager` com limite de sessões e trava por sessão | Aproveita o gerenciador de conversa do Strands |
| 6 | Testabilidade | `Depends` do FastAPI para serviço, recuperador, cliente do Bedrock, store e gerenciador de sessões | Testes substituem o Bedrock e o ChromaDB sem `patch` global |
| 7 | Estado do front | `useReducer` + Context e persistência no `localStorage` | Sem dependência extra |
| 8 | Markdown | `react-markdown` + `remark-gfm` | Não renderiza HTML bruto por padrão; suporta tabelas |
| 9 | Estilo | CSS Modules com variáveis CSS | Sem dependência extra |
| 10 | HTTP no front | `fetch` nativo | Sem dependência extra |

### Refinamentos feitos durante o design (decididos pelo assistente, sujeitos à sua revisão)

| Refinamento | Motivo |
|---|---|
| Segunda tool `not_in_knowledge_base`, chamada pelo agente quando os trechos não respondem, que descarta as fontes do turno | Sem ela, a decisão final do agente (Clarificação 5 = C, US-06 critério 2) não chegaria ao serviço, e uma resposta com conhecimento geral poderia sair com fontes não usadas |
| `Retriever.ensure_ready()` chamado pelo serviço antes do agente | O Strands captura exceções lançadas dentro de tools e as entrega ao modelo; o erro `KB_NOT_INDEXED` precisa ser lançado fora das tools |
| `SourceCollector.record_error` | Pelo mesmo motivo, falhas do Bedrock dentro de uma tool são registradas e convertidas em `UPSTREAM_ERROR` pelo serviço |
| `knowledge_store.py` como módulo próprio | Evita que `ingest.py` e `rag.py` acessem o ChromaDB de formas diferentes |

## 3. Responsabilidade por requisito e história

| Requisito | Componentes responsáveis |
|---|---|
| FR-01 Ingestão | BC-05 Chunking, BC-06 KnowledgeStore, BC-07 KnowledgeIngestor, BC-04 BedrockEmbeddingClient |
| FR-02 Recuperação | BC-08 Retriever, BC-06, BC-04 |
| FR-03 Agente | BC-09 Agent, BC-08 |
| FR-04 Sessões | BC-10 Sessions, BC-11 AssistantService |
| FR-05 API | BC-13 API, BC-03 Schemas, BC-02 Errors, BC-12 Dependencies, BC-01 Settings |
| FR-06 Front-end | FC-01 a FC-10 |
| FR-07 Documentação | README (gerado na unidade de código, fora de componentes de runtime) |

| História | Componentes |
|---|---|
| US-01, US-02, US-03 | BC-07, BC-05, BC-06, BC-04, BC-13 (`KB_NOT_INDEXED` via BC-08 `ensure_ready`) |
| US-04, US-05 | BC-13, BC-11, BC-09, BC-08, BC-03 |
| US-06 | BC-08 (limite de distância), BC-09 (`not_in_knowledge_base`), BC-10 (`SourceCollector`), FC-07 |
| US-07 | BC-09 (`SYSTEM_PROMPT`) |
| US-08, US-09 | BC-10, BC-11, BC-09 |
| US-10 | BC-10, BC-11, FC-04, FC-03, FC-07 |
| US-11 | FC-05, FC-07, FC-08, FC-10, FC-01, BC-13 (CORS) |
| US-12 | FC-07 (`SourceList`) |
| US-13 | FC-09 |
| US-14 | FC-06, FC-03 |
| US-15 | FC-02, FC-03 |
| US-16 | BC-01, BC-13 (`/health`), README |
| US-17 | README, `.gitignore` |

## 4. Verificação de completude e consistência

- Todos os requisitos FR-01 a FR-07 e todas as histórias US-01 a US-17 têm componente responsável.
- Não há dependências circulares no backend.
- O contrato HTTP em `component-dependency.md` é a única ligação entre as unidades.
- Itens deixados para o Functional Design: algoritmos de chunking e de descarte de sessões, texto do prompt de sistema, formato exato das mensagens de erro, regras de título padrão das conversas e tratamento detalhado de erros dentro das tools.
- Itens deixados para o NFR Requirements: valor padrão do limite de distância (e métrica da coleção, por exemplo cosseno), limite de sessões ativas, tamanho máximo do texto, versões fixas e framework de testes de propriedades.
- Nomes e parâmetros de Strands Agents, ChromaDB e boto3 serão confirmados na geração de código.
