# Serviços e Orquestração

## Backend

### SVC-01 AssistantService (serviço online)
- **Responsabilidade:** conduzir um turno de conversa do pedido HTTP até a resposta com fontes.
- **Colaboradores:** `SessionManager`, `Agent` (por sessão), `SourceCollector`, `Settings`.
- **Orquestração de `ask(text, session_id)`:**
  1. Validar `text` (não vazio, não só espaços, dentro do tamanho máximo). Falha: `VALIDATION_ERROR`, sem chamar o Bedrock. Em seguida, `Retriever.ensure_ready()` confirma que a coleção existe; se não, `KB_NOT_INDEXED`. A checagem fica no serviço, antes do agente, porque o Strands captura exceções lançadas dentro de tools e as entrega ao modelo em vez de propagá-las.
  2. Obter a sessão com `SessionManager.acquire(session_id)`; a trava da sessão fica adquirida até o fim do turno.
  3. Se o `session_id` era desconhecido, a sessão é criada com o mesmo id e `session_reset = true`. Sem `session_id`, é criado um novo (`session_reset = false`).
  4. Zerar o `SourceCollector` da sessão.
  5. Chamar o agente com o texto. Durante a chamada, a tool `retrieve` consulta o `Retriever` e registra as fontes no coletor. Se o agente concluir que os trechos não respondem, ele chama a tool `not_in_knowledge_base`, que descarta as fontes do coletor.
  6. Montar `AskResult` com a resposta do agente, as fontes do coletor (só as do turno) e `session_reset`.
  7. Liberar a trava. Falhas do agente ou do Bedrock viram `UPSTREAM_ERROR` sem expor segredos. Quando a falha ocorre dentro de uma tool, o coletor a registra (`SourceCollector.record_error`) e o serviço a converte em `UPSTREAM_ERROR` depois da chamada. Os detalhes ficam no Functional Design.
- **Histórias:** US-04 a US-10.

### SVC-02 SessionManager (estado em memória)
- **Responsabilidade:** guardar sessões, aplicar o limite de sessões ativas com descarte da mais antiga e serializar chamadas por sessão.
- **Padrão:** registro em dicionário ordenado por uso, com trava por sessão. O processo roda com 1 worker.
- **Histórias:** US-08, US-09, US-10.

### SVC-03 KnowledgeIngestor (serviço offline)
- **Responsabilidade:** indexar `anyone_kb/` de forma idempotente.
- **Orquestração de `run()`:**
  1. Carregar documentos `.md`. Sem documentos: erro claro e nenhuma alteração.
  2. Para cada documento: extrair título, dividir em chunks, gerar embeddings (`BedrockEmbeddingClient`), gravar com `upsert` e remover chunks obsoletos do mesmo documento.
  3. Devolver `IngestReport` e imprimir o total de chunks.
- **Histórias:** US-01, US-02, US-03.

### SVC-04 Retriever (serviço de leitura)
- **Responsabilidade:** transformar uma pergunta em trechos relevantes e fontes deduplicadas, aplicando o limite de distância.
- **Colaboradores:** `BedrockEmbeddingClient`, `KnowledgeStore`, `Settings`.
- **Histórias:** US-04, US-05, US-06.

### Fluxo de relevância (resumo)
O `Retriever` filtra pelo limite de distância e devolve `has_relevant`. A tool `retrieve` entrega ao modelo os trechos ou uma mensagem explícita de que não há trecho relevante. O agente decide por último se os trechos respondem à pergunta. Se não respondem, ele chama a tool `not_in_knowledge_base` (que descarta as fontes do turno) e responde com conhecimento geral e aviso explícito, com `sources` vazio. Quando o `Retriever` já devolve `has_relevant = false`, o coletor nem recebe fontes.

## Frontend

### SVC-05 ChatService (hook `useChat`)
- **Responsabilidade:** conduzir o envio de uma pergunta na conversa ativa.
- **Orquestração de `sendMessage(text)`:**
  1. Ignorar texto vazio ou enquanto já carrega.
  2. Adicionar a mensagem do usuário e marcar a conversa como carregando.
  3. Chamar `askQuestion(text, conversation.sessionId)`.
  4. Sucesso: adicionar a resposta com as fontes; se `session_reset` for verdadeiro, ativar o aviso de contexto reiniciado.
  5. Erro: adicionar uma mensagem de erro amigável a partir do código recebido.
  6. Persistir o estado no `localStorage` e liberar a entrada.
- **Histórias:** US-04, US-10, US-11.

### SVC-06 ConversationsStore (estado e persistência)
- **Responsabilidade:** única fonte de verdade das conversas no navegador, com persistência automática no `localStorage`.
- **Histórias:** US-14, US-15.
