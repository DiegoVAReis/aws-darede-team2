# Componentes

Decisões de design aplicadas (respostas A do `application-design-plan.md`): layout plano em `backend/`, módulo Bedrock compartilhado, camada de serviço `AssistantService`, coletor de fontes por requisição, um agente Strands por sessão com janela deslizante, injeção de dependências do FastAPI, `useReducer` + Context no front, `react-markdown` + `remark-gfm` e CSS Modules.

As regras de negócio detalhadas de cada componente são definidas no Functional Design.

## Unidade 1: Backend (`backend/`, Python 3.11+)

### BC-01 Settings (`config.py`)
- **Propósito:** centralizar a configuração lida do `.env` e do ambiente.
- **Responsabilidades:**
  - Carregar o `.env` com `python-dotenv`.
  - Expor região, IDs dos modelos, caminhos (`anyone_kb/`, `backend/chroma_store/`), nome da coleção, `top_k`, tamanho e overlap de chunk, limite de distância, janela de sessão, limite de sessões, tamanho máximo do texto e origens permitidas no CORS.
  - Informar os **nomes** das variáveis obrigatórias que faltam, sem imprimir valores.
- **Interface:** `Settings`, `get_settings()`.
- **Histórias:** US-16, US-06 (limite de distância configurável).

### BC-02 Errors (`errors.py`)
- **Propósito:** erros de domínio com código estável e mensagem segura.
- **Responsabilidades:** `AppError` e subclasses `ValidationAppError`, `KnowledgeBaseNotIndexedError`, `UpstreamError`; converter em `{ "error": { "code", "message" } }`; nunca expor segredos ou detalhes internos.
- **Interface:** classes de erro e `to_error_body()`.
- **Histórias:** US-03, US-04.

### BC-03 Schemas (`schemas.py`)
- **Propósito:** contratos Pydantic 2.x da API.
- **Interface:** `AskRequest`, `SourceRef`, `AskResponse`, `ErrorDetail`, `ErrorResponse`, `HealthResponse`.
- **Histórias:** US-04, US-05, US-09, US-10.

### BC-04 BedrockEmbeddingClient (`bedrock_client.py`)
- **Propósito:** único ponto de acesso ao Bedrock Runtime para embeddings, com autenticação por `AWS_BEARER_TOKEN_BEDROCK`.
- **Responsabilidades:** criar o cliente `bedrock-runtime`, gerar o embedding de um texto com Titan Embeddings v2 e traduzir falhas para `UpstreamError` sem vazar o token.
- **Interface:** `BedrockEmbeddingClient.embed(text)`, `build_bedrock_runtime_client(settings)`.
- **Usado por:** `KnowledgeIngestor` e `Retriever`.
- **Histórias:** US-01, US-04.

### BC-05 Chunking (`chunking.py`)
- **Propósito:** funções puras de texto, sem I/O.
- **Responsabilidades:** contar tokens (`tiktoken`, `cl100k_base`), dividir em chunks de ~500 tokens com overlap de 50 e extrair o título H1 do Markdown.
- **Interface:** `count_tokens`, `split_into_chunks`, `extract_title`, `build_chunk_id`.
- **Observação:** principal alvo dos testes de propriedades (PBT-02, 03, 07).
- **Histórias:** US-01, US-02.

### BC-06 KnowledgeStore (`knowledge_store.py`)
- **Propósito:** encapsular o ChromaDB (`PersistentClient`, coleção `anyone`).
- **Responsabilidades:** gravar chunks com `upsert` e metadados `source` e `title`, remover chunks obsoletos de um documento, consultar por embedding e informar se a coleção existe e quantos chunks tem.
- **Interface:** `KnowledgeStore.upsert_chunks`, `remove_stale_chunks`, `query`, `count`, `exists`.
- **Histórias:** US-01, US-02, US-03, US-04.

### BC-07 KnowledgeIngestor (`ingest.py`)
- **Propósito:** pipeline offline de indexação (também executável por linha de comando).
- **Responsabilidades:** ler `anyone_kb/*.md`, extrair título, dividir em chunks, gerar embeddings, gravar de forma idempotente, remover chunks que sobraram e imprimir a quantidade de chunks.
- **Interface:** `KnowledgeIngestor.run() -> IngestReport`, `main()`.
- **Histórias:** US-01, US-02, US-03.

### BC-08 Retriever (`rag.py`)
- **Propósito:** recuperação com citação de fonte.
- **Responsabilidades:** gerar o embedding da pergunta, consultar o `KnowledgeStore` com `top_k`, descartar resultados acima do limite de distância, deduplicar fontes por arquivo preservando a ordem de relevância, sinalizar quando não há trecho relevante e confirmar (`ensure_ready`) que a base está indexada.
- **Interface:** `Retriever.retrieve(question, top_k) -> RetrievalResult`; tipos `RetrievedPassage`, `RetrievalResult`.
- **Histórias:** US-04, US-05, US-06.

### BC-09 Agent (`agent.py`)
- **Propósito:** montar o agente Strands com Nova Pro e a tool `retrieve`.
- **Responsabilidades:** definir o prompt de sistema (reescrever perguntas de acompanhamento, responder no idioma da pergunta, avisar quando a informação não veio da base), criar o `BedrockModel`, o gerenciador de conversa de janela deslizante (20 mensagens) e a tool `retrieve` ligada ao coletor da sessão.
- **Segunda tool `not_in_knowledge_base`:** o agente a chama quando os trechos recuperados não respondem à pergunta. Ela descarta as fontes do coletor do turno, para que `sources` venha vazio (US-06, critério 2). Sem ela, a decisão final do agente não chegaria ao serviço, e uma resposta com conhecimento geral poderia sair com fontes que não foram usadas.
- **Interface:** `build_agent(settings, retrieve_tool, not_in_kb_tool) -> Agent`, `build_retrieve_tool(retriever, collector)`, `build_not_in_kb_tool(collector)`, `SYSTEM_PROMPT`.
- **Histórias:** US-04, US-06, US-07, US-08.

### BC-10 Sessions (`sessions.py`)
- **Propósito:** estado em memória das conversas.
- **Componentes:**
  - `SourceCollector`: guarda as fontes consultadas no turno atual, permite descartá-las quando o agente conclui que a base não responde e registra falhas ocorridas dentro das tools.
  - `SessionContext`: `session_id`, agente, coletor e trava.
  - `SessionManager`: cria ou recupera sessões, aplica o limite de sessões ativas com descarte da mais antiga e detecta `session_id` desconhecido.
- **Interface:** `SessionManager.acquire(session_id) -> SessionLease`, `SourceCollector.add/reset/snapshot`.
- **Histórias:** US-08, US-09, US-10.

### BC-11 AssistantService (`assistant_service.py`)
- **Propósito:** orquestrar um turno de conversa.
- **Responsabilidades:** validar o texto, obter a sessão, zerar o coletor, chamar o agente, montar a resposta com fontes e `session_reset`, e traduzir falhas do agente em `UpstreamError`.
- **Interface:** `AssistantService.ask(text, session_id) -> AskResult`.
- **Histórias:** US-04 a US-10.

### BC-12 Dependencies (`dependencies.py`)
- **Propósito:** provedores de dependências do FastAPI (`Depends`) para serviço, recuperador, cliente do Bedrock, store e gerenciador de sessões.
- **Interface:** `get_assistant_service`, `get_session_manager`, `get_retriever`, `get_embedding_client`, `get_knowledge_store`.
- **Observação:** os testes substituem esses provedores por falsos.

### BC-13 API (`main.py`)
- **Propósito:** camada HTTP.
- **Responsabilidades:** criar a aplicação (`create_app`), registrar CORS só para `http://localhost:5173`, expor `GET /health` e `POST /v1/ask`, registrar os tratadores de erro e checar a configuração obrigatória na inicialização.
- **Interface:** `app`, `create_app()`, rotas `/health` e `/v1/ask`.
- **Histórias:** US-03, US-04, US-11, US-16.

## Unidade 2: Frontend (`frontend/`, React 18 + Vite + TypeScript)

### FC-01 ApiClient (`src/api/client.ts`)
- **Propósito:** único ponto de comunicação com a API (via `fetch`).
- **Responsabilidades:** enviar `POST /v1/ask`, converter a resposta para tipos TypeScript e erros no formato padrão em `ApiRequestError`.
- **Interface:** `askQuestion`, `ApiRequestError`.
- **Histórias:** US-04, US-11.

### FC-02 ConversationStorage (`src/storage/conversationStorage.ts`)
- **Propósito:** persistência no `localStorage`.
- **Responsabilidades:** carregar e salvar o estado das conversas, validar o formato e iniciar vazio se os dados estiverem ilegíveis.
- **Interface:** `loadConversations`, `saveConversations`.
- **Histórias:** US-14, US-15.

### FC-03 ConversationsStore (`src/state/`)
- **Propósito:** estado das conversas com `useReducer` + Context.
- **Responsabilidades:** criar, selecionar, renomear e excluir conversas, anexar mensagens, marcar carregando e erro e registrar o aviso de contexto reiniciado; sincronizar com o `ConversationStorage`.
- **Interface:** `conversationsReducer`, `ConversationsProvider`, `useConversations`.
- **Histórias:** US-10, US-14, US-15.

### FC-04 useChat (`src/hooks/useChat.ts`)
- **Propósito:** fluxo de enviar uma pergunta.
- **Responsabilidades:** adicionar a mensagem do usuário, chamar o `ApiClient`, anexar a resposta com fontes ou o erro e tratar `session_reset`.
- **Interface:** `useChat() -> { sendMessage, isLoading }`.
- **Histórias:** US-04, US-10, US-11.

### FC-05 App (`src/App.tsx`)
- **Propósito:** layout geral (barra lateral e janela do chat) e composição dos provedores.

### FC-06 Sidebar (`src/components/Sidebar/`)
- **Propósito:** lista de conversas com "Nova conversa", seleção, renomear e excluir.
- **Histórias:** US-14.

### FC-07 ChatWindow (`src/components/Chat/`)
- **Propósito:** exibir a conversa selecionada.
- **Subcomponentes:** `MessageList`, `MessageBubble`, `SourceList` (título H1 e arquivo em texto menor), `Notice` (aviso de contexto reiniciado e erros) e `LoadingIndicator`.
- **Histórias:** US-10, US-11, US-12.

### FC-08 ChatInput (`src/components/Chat/ChatInput.tsx`)
- **Propósito:** campo de entrada fixo no rodapé (Enter envia, Shift+Enter quebra linha), desabilitado enquanto carrega.
- **Histórias:** US-11.

### FC-09 SuggestedQuestions (`src/components/Chat/SuggestedQuestions.tsx`)
- **Propósito:** sugestões na tela inicial de uma conversa vazia.
- **Histórias:** US-13.

### FC-10 MarkdownContent (`src/components/Chat/MarkdownContent.tsx`)
- **Propósito:** renderizar Markdown das respostas com `react-markdown` + `remark-gfm` (listas, negrito, tabelas), sem HTML bruto.
- **Histórias:** US-11.
