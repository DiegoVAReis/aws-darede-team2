# Métodos dos Componentes

Assinaturas de alto nível. As regras de negócio detalhadas (valores padrão, algoritmos, casos de borda) são definidas no Functional Design. Nomes e parâmetros de bibliotecas externas (Strands Agents, ChromaDB, boto3) serão confirmados na geração de código.

## Unidade 1: Backend (Python)

### BC-01 Settings (`config.py`)

| Método | Assinatura | Propósito |
|---|---|---|
| `Settings` | dataclass ou modelo com os campos de configuração | Valores de configuração tipados |
| `get_settings` | `() -> Settings` | Lê o `.env` e o ambiente uma vez e devolve a configuração |
| `Settings.missing_required` | `() -> list[str]` | Nomes das variáveis obrigatórias ausentes, sem valores |

### BC-02 Errors (`errors.py`)

| Item | Assinatura | Propósito |
|---|---|---|
| `AppError` | `(code: str, message: str, status_code: int)` | Base dos erros de domínio |
| `ValidationAppError` | `AppError` com código `VALIDATION_ERROR` | Texto vazio, só espaços ou acima do tamanho máximo |
| `KnowledgeBaseNotIndexedError` | `AppError` com código `KB_NOT_INDEXED` | Coleção inexistente |
| `UpstreamError` | `AppError` com código `UPSTREAM_ERROR` | Falha ao chamar o Bedrock |
| `to_error_body` | `(error: AppError) -> dict` | Formato `{ "error": { "code", "message" } }` |

### BC-03 Schemas (`schemas.py`)

| Modelo | Campos |
|---|---|
| `AskRequest` | `text: str`, `session_id: str \| None` |
| `SourceRef` | `file: str`, `title: str` |
| `AskResponse` | `answer: str`, `sources: list[SourceRef]`, `session_id: str`, `session_reset: bool` |
| `ErrorDetail` | `code: str`, `message: str` |
| `ErrorResponse` | `error: ErrorDetail` |
| `HealthResponse` | `status: str` |

### BC-04 BedrockEmbeddingClient (`bedrock_client.py`)

| Método | Assinatura | Propósito |
|---|---|---|
| `build_bedrock_runtime_client` | `(settings: Settings) -> BedrockRuntimeClient` | Cria o cliente boto3 usando o Bearer token do ambiente |
| `BedrockEmbeddingClient.__init__` | `(settings: Settings, client: BedrockRuntimeClient \| None = None)` | Permite injetar um cliente falso nos testes |
| `BedrockEmbeddingClient.embed` | `(text: str) -> list[float]` | Embedding do texto; falhas viram `UpstreamError` |

### BC-05 Chunking (`chunking.py`)

| Função | Assinatura | Propósito |
|---|---|---|
| `count_tokens` | `(text: str) -> int` | Conta tokens com `tiktoken` |
| `split_into_chunks` | `(text: str, size: int = 500, overlap: int = 50) -> list[str]` | Divide por tokens com sobreposição |
| `extract_title` | `(markdown: str, fallback: str) -> str` | Título H1 ou o texto de fallback |
| `build_chunk_id` | `(source_stem: str, index: int) -> str` | Id determinístico `{arquivo}-{índice}` |

### BC-06 KnowledgeStore (`knowledge_store.py`)

| Método | Assinatura | Propósito |
|---|---|---|
| `__init__` | `(persist_dir: Path, collection_name: str)` | Abre o `PersistentClient` |
| `upsert_chunks` | `(chunks: list[StoredChunk]) -> None` | Grava ou atualiza chunks com `source` e `title` |
| `remove_stale_chunks` | `(source: str, keep_ids: set[str]) -> int` | Remove chunks do documento que não existem mais |
| `query` | `(embedding: list[float], top_k: int) -> list[QueryHit]` | Busca os chunks mais próximos, com distância |
| `exists` | `() -> bool` | Indica se a coleção existe |
| `count` | `() -> int` | Quantidade de chunks |

Tipos: `StoredChunk(id, text, embedding, source, title)` e `QueryHit(text, source, title, distance)`.

### BC-07 KnowledgeIngestor (`ingest.py`)

| Método | Assinatura | Propósito |
|---|---|---|
| `__init__` | `(settings, embedder, store)` | Recebe as dependências |
| `load_documents` | `(kb_dir: Path) -> list[KbDocument]` | Lê os `.md`; erro claro se não houver nenhum |
| `run` | `() -> IngestReport` | Executa a ingestão idempotente |
| `main` | `() -> int` | Ponto de entrada de linha de comando; devolve código de saída |

Tipos: `KbDocument(source, title, text)` e `IngestReport(documents, chunks_indexed, chunks_removed, total_chunks)`.

### BC-08 Retriever (`rag.py`)

| Método | Assinatura | Propósito |
|---|---|---|
| `__init__` | `(settings, embedder, store)` | Recebe as dependências |
| `retrieve` | `(question: str, top_k: int \| None = None) -> RetrievalResult` | Busca trechos relevantes e fontes deduplicadas |
| `ensure_ready` | `() -> None` | Lança `KnowledgeBaseNotIndexedError` se a coleção não existir |

Tipos: `RetrievedPassage(text, source, title, distance)` e `RetrievalResult(passages, sources: list[SourceRef], has_relevant: bool)`.

### BC-09 Agent (`agent.py`)

| Função | Assinatura | Propósito |
|---|---|---|
| `SYSTEM_PROMPT` | `str` | Instruções do agente |
| `build_retrieve_tool` | `(retriever: Retriever, collector: SourceCollector) -> Callable` | Tool `retrieve` que registra as fontes no coletor do turno |
| `build_not_in_kb_tool` | `(collector: SourceCollector) -> Callable` | Tool que o agente chama quando os trechos não respondem; descarta as fontes do turno |
| `build_agent` | `(settings: Settings, retrieve_tool: Callable, not_in_kb_tool: Callable) -> Agent` | Agente Strands com Nova Pro e janela de 20 mensagens |

### BC-10 Sessions (`sessions.py`)

| Item | Assinatura | Propósito |
|---|---|---|
| `SourceCollector.reset` | `() -> None` | Limpa antes de cada turno |
| `SourceCollector.add` | `(sources: list[SourceRef]) -> None` | Registra fontes consultadas |
| `SourceCollector.discard` | `() -> None` | Descarta as fontes do turno (agente concluiu que a base não responde) |
| `SourceCollector.record_error` | `(error: AppError) -> None` | Guarda falha ocorrida dentro de uma tool, para o serviço relançar |
| `SourceCollector.error` | `AppError \| None` | Falha registrada no turno |
| `SourceCollector.snapshot` | `() -> list[SourceRef]` | Fontes do turno, sem repetição |
| `SessionContext` | `(session_id, agent, collector, lock)` | Estado de uma sessão |
| `SessionManager.__init__` | `(agent_factory: Callable[[SourceCollector], Agent], max_sessions: int)` | Fábrica de agentes e limite de sessões |
| `SessionManager.acquire` | `(session_id: str \| None) -> SessionLease` | Devolve a sessão (criada se preciso) com `session_reset` e trava adquirida |
| `SessionLease` | context manager com `context: SessionContext` e `session_reset: bool` | Garante a liberação da trava |

### BC-11 AssistantService (`assistant_service.py`)

| Método | Assinatura | Propósito |
|---|---|---|
| `__init__` | `(session_manager: SessionManager, settings: Settings)` | Dependências |
| `ask` | `(text: str, session_id: str \| None) -> AskResult` | Executa um turno de conversa |

Tipo: `AskResult(answer, sources, session_id, session_reset)`.

### BC-12 Dependencies (`dependencies.py`)

| Função | Assinatura |
|---|---|
| `get_embedding_client` | `() -> BedrockEmbeddingClient` |
| `get_knowledge_store` | `() -> KnowledgeStore` |
| `get_retriever` | `() -> Retriever` |
| `get_session_manager` | `() -> SessionManager` (instância única do processo) |
| `get_assistant_service` | `() -> AssistantService` |

### BC-13 API (`main.py`)

| Item | Assinatura | Propósito |
|---|---|---|
| `create_app` | `() -> FastAPI` | Monta a aplicação, CORS e tratadores de erro |
| `health` | `GET /health -> HealthResponse` | Verificação de saúde |
| `ask` | `POST /v1/ask (AskRequest) -> AskResponse` | Pergunta e resposta |
| `handle_app_error` | `(request, exc: AppError) -> JSONResponse` | Resposta de erro padronizada |

## Unidade 2: Frontend (TypeScript)

### Tipos (`src/types.ts`)

`SourceRef { file: string; title: string }`, `Message { id: string; role: "user" | "assistant"; content: string; sources: SourceRef[]; createdAt: string; isError?: boolean }`, `Conversation { id: string; sessionId: string; title: string; messages: Message[]; createdAt: string; updatedAt: string; contextReset?: boolean }`, `AskResponse`, `ApiError`.

### FC-01 ApiClient

| Função | Assinatura |
|---|---|
| `askQuestion` | `(text: string, sessionId: string, signal?: AbortSignal) => Promise<AskResponse>` |
| `ApiRequestError` | `class extends Error { code: string; status?: number }` |

### FC-02 ConversationStorage

| Função | Assinatura |
|---|---|
| `loadConversations` | `() => PersistedState` (estado vazio se ilegível) |
| `saveConversations` | `(state: PersistedState) => void` |

### FC-03 ConversationsStore

| Item | Assinatura |
|---|---|
| `conversationsReducer` | `(state: ConversationsState, action: ConversationsAction) => ConversationsState` |
| Ações | `create`, `select`, `rename`, `delete`, `addMessage`, `setLoading`, `setContextReset` |
| `ConversationsProvider` | componente que injeta estado e `dispatch` e persiste as mudanças |
| `useConversations` | `() => { state, dispatch, activeConversation }` |

### FC-04 useChat

| Função | Assinatura |
|---|---|
| `useChat` | `() => { sendMessage: (text: string) => Promise<void>; isLoading: boolean }` |

### Componentes de interface

| Componente | Propriedades principais |
|---|---|
| `Sidebar` | conversas, id ativo, callbacks de criar, selecionar, renomear e excluir |
| `ChatWindow` | conversa ativa |
| `MessageList` / `MessageBubble` | mensagens / uma mensagem |
| `SourceList` | `sources: SourceRef[]` |
| `Notice` | tipo (`contextReset` ou `error`) e texto |
| `ChatInput` | `onSend`, `disabled` |
| `SuggestedQuestions` | `questions: string[]`, `onSelect` |
| `MarkdownContent` | `content: string` |
