# Units of Work

Fontes: `unit-of-work-plan.md` (Parte E), `application-design.md`, `stories.md` e `requirements.md`.

**Tipo de decomposição:** aplicação local única (monolito modular) com duas unidades, construídas em sequência. Não há serviços implantáveis de forma independente. "Unidade" aqui significa um agrupamento lógico de histórias e componentes para as etapas de design e de geração de código.

## Resumo

| Unidade | Pasta | Linguagem e ferramentas | Componentes | Histórias | Ordem |
|---|---|---|---|---|---|
| Unidade 1: Backend | `backend/` | Python 3.11+, `uv`, FastAPI, Strands Agents, ChromaDB, pytest, Hypothesis, ruff | BC-01 a BC-13 | US-01 a US-10 | 1 |
| Unidade 2: Frontend | `frontend/` | TypeScript 5.x, React 18, Vite, `npm`, Vitest, React Testing Library | FC-01 a FC-10 | US-11 a US-15, US-16, US-17, mais o aviso de contexto reiniciado da US-10 | 2 |

## Unidade 1: Backend

**Propósito:** indexar a base de conhecimento, recuperar trechos com citação de fonte, conduzir conversas com memória por meio do agente Strands com Nova Pro e expor tudo pela API HTTP.

**Responsabilidades**
- Ingestão offline idempotente de `anyone_kb/` no ChromaDB (FR-01).
- Recuperação com limite de distância e fontes deduplicadas (FR-02).
- Agente com a tool `retrieve` e a tool `not_in_knowledge_base` (FR-03).
- Sessões em memória com janela de 20 mensagens, limite de sessões, trava por sessão e `session_reset` (FR-04).
- API `GET /health` e `POST /v1/ask`, erros padronizados e CORS para `http://localhost:5173` (FR-05).

**Componentes:** `config.py`, `errors.py`, `schemas.py`, `bedrock_client.py`, `chunking.py`, `knowledge_store.py`, `ingest.py`, `rag.py`, `agent.py`, `sessions.py`, `assistant_service.py`, `dependencies.py`, `main.py`.

**Histórias:** US-01, US-02, US-03 (Mantenedor); US-04, US-05, US-06, US-07 (perguntas e respostas); US-08, US-09, US-10 (conversa com memória, lado servidor).

**Etapas de construção:** Functional Design (com propriedades testáveis, PBT-01), NFR Requirements (mínimo; fecha limite de distância, limite de sessões, tamanho máximo do texto, versões fixas, framework de propriedades), Code Generation (código, testes e `ruff`).

**Entregáveis de código**
- Módulos listados acima, `backend/pyproject.toml` e `backend/tests/` (unitários, integração com Bedrock simulado e testes de propriedades para `chunking.py`, serialização dos modelos Pydantic e demais funções puras).
- Notas para o README raiz: pré-requisitos, variáveis do `.env` (só os nomes), comandos de ingestão, backend e testes.

**Critério de pronto:** critérios de aceitação de US-01 a US-10 atendidos, cobertura de 80% no backend, `ruff` sem erros.

## Unidade 2: Frontend

**Propósito:** interface de chat estilo ChatGPT que consome o contrato HTTP do Backend, mais a entrega e a documentação do projeto como um todo.

**Responsabilidades**
- Layout de chat com Markdown, estados de carregando e erro, e fontes com título e arquivo (FR-06).
- Barra lateral com várias conversas (criar, selecionar, renomear, excluir), persistência no `localStorage` e aviso de contexto reiniciado.
- Sugestões de perguntas na tela inicial.
- README raiz completo, sem segredos, e conferência de que o projeto sobe localmente (FR-07).

**Componentes:** `ApiClient`, `ConversationStorage`, `ConversationsStore`, `useChat`, `App`, `Sidebar`, `ChatWindow` (com `MessageList`, `MessageBubble`, `SourceList`, `Notice`, `LoadingIndicator`), `ChatInput`, `SuggestedQuestions`, `MarkdownContent`.

**Histórias:** US-11, US-12, US-13, US-14, US-15 (interface); o aviso de contexto reiniciado da US-10 (a parte da API é do Backend); US-16, US-17 (entrega e uso local, transversais).

**Etapas de construção:** Functional Design (store de conversas, regras de título padrão, persistência), NFR Requirements (mínimo; versões fixas e biblioteca de propriedades do front), Code Generation (código, testes de componentes e README raiz).

**Entregáveis de código:** `frontend/` (Vite + TypeScript), testes ao lado dos arquivos (`*.test.tsx` e `*.test.ts`), `README.md` na raiz.

**Critério de pronto:** critérios de aceitação de US-11 a US-17 atendidos, testes do front passando, README sem segredos.

## Estratégia de organização de código (greenfield)

Código de aplicação fica na raiz do workspace e a documentação em `aidlc-docs/`. A estrutura segue o Application Design (módulos planos no backend), e não o padrão genérico `{unidade}/src/`, por escolha explícita.

```
AWS-Darede-Kiro-Project/
  .env                        (fornecido pelo facilitador; fora do versionamento)
  .gitignore
  README.md                   (criado na Unidade 2)
  vision.md
  tech-env.md
  anyone_kb/                  (15 documentos .md, já existentes)
  backend/
    pyproject.toml
    main.py
    config.py
    errors.py
    schemas.py
    bedrock_client.py
    chunking.py
    knowledge_store.py
    ingest.py
    rag.py
    agent.py
    sessions.py
    assistant_service.py
    dependencies.py
    tests/
    chroma_store/             (gerada pela ingestão; fora do versionamento)
  frontend/
    package.json
    vite.config.ts
    index.html
    src/
      api/
      storage/
      state/
      hooks/
      components/
      types.ts
      App.tsx
      main.tsx
  aidlc-docs/                 (somente documentação)
```

**Comandos previstos (a partir de `backend/`):** `uv run uvicorn main:app --port 8000`, `uv run python ingest.py`, `uv run pytest`, `uv run ruff check .`.
**Comandos previstos (a partir de `frontend/`):** `npm install`, `npm run dev`, `npm test`.

O `.env` fica na raiz do projeto e o `config.py` o localiza a partir do próprio caminho, para funcionar com a execução a partir de `backend/`.

## Sequência de construção

| Passo | Unidade | Etapas |
|---|---|---|
| 1 | Backend | Functional Design, NFR Requirements, Code Generation |
| 2 | Frontend | Functional Design, NFR Requirements, Code Generation |
| 3 | Projeto | Build and Test (integração real Backend + Frontend, verificação de US-16 e US-17) |
