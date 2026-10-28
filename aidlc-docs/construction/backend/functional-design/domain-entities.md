# Entidades de Domínio: Backend

Fontes: `components.md`, `component-methods.md`, `requirements.md` e as respostas do `backend-functional-design-plan.md`. Descrição independente de tecnologia de infraestrutura.

## Visão geral das relações

```
KbDocument 1 --- n Chunk (StoredChunk)        gravados na coleção "anyone"
Chunk      1 --- 1 embedding (vetor)
QueryHit   n --- 1 pergunta                   resultado de uma busca
RetrievalResult 1 --- n RetrievedPassage
RetrievalResult 1 --- n SourceRef             deduplicadas por arquivo
SessionContext 1 --- 1 agente
SessionContext 1 --- 1 SourceCollector
SessionManager 1 --- n SessionContext         ordenadas por uso recente
```

## Base de conhecimento

### KbDocument
| Campo | Tipo | Regra |
|---|---|---|
| `source` | texto | Nome do arquivo com extensão (ex.: `seguros_agricolas.md`). Chave de citação |
| `title` | texto | H1 do documento, ou o fallback derivado do nome (BR-ING-04) |
| `text` | texto | Conteúdo UTF-8 do arquivo |

### StoredChunk
| Campo | Tipo | Regra |
|---|---|---|
| `id` | texto | `{nome_do_arquivo_sem_extensão}-{índice}`; determinístico (BR-ING-02) |
| `text` | texto | Trecho do documento, sem prefixo de título |
| `embedding` | lista de números | Gerado sobre `"{title}\n\n{text}"` (BR-ING-03) |
| `source` | texto | Nome do arquivo de origem |
| `title` | texto | Título do documento |

### IngestReport
| Campo | Tipo |
|---|---|
| `documents` | quantidade de documentos lidos |
| `chunks_indexed` | chunks gravados nesta execução |
| `chunks_removed` | chunks removidos (obsoletos e de documentos apagados) |
| `total_chunks` | total na coleção ao final |
| `failed_sources` | lista de arquivos que falharam |

## Recuperação

### QueryHit
`text`, `source`, `title`, `distance` (distância de cosseno; menor é mais próximo).

### RetrievedPassage
`text`, `source`, `title`, `distance`. Mesmo conteúdo do `QueryHit` após o filtro de relevância.

### SourceRef
| Campo | Tipo | Regra |
|---|---|---|
| `file` | texto | Nome do arquivo |
| `title` | texto | Título H1 do documento |

Dois `SourceRef` são o mesmo quando o `file` é igual.

### RetrievalResult
| Campo | Tipo | Regra |
|---|---|---|
| `passages` | lista de `RetrievedPassage` | Só os trechos com distância dentro do limite, em ordem de relevância |
| `sources` | lista de `SourceRef` | Sem repetição por arquivo, na ordem de relevância |
| `has_relevant` | booleano | Verdadeiro quando `passages` não é vazia |

## Conversa

### SourceCollector (um por sessão)
Guarda as fontes consultadas no turno atual.
| Campo | Regra |
|---|---|
| `sources` | Sem repetição por arquivo; ordem de inserção |
| `error` | `AppError` ocorrido dentro de uma tool, ou ausente |

Estados do turno: vazio, com fontes, descartado (agente concluiu que a base não responde), com erro.

### SessionContext
`session_id`, `agent`, `collector`, `lock`. Uma por sessão.

### SessionManager
Registro ordenado por uso recente. Limite de 50 sessões ativas (BR-SES-03). Detecta `session_id` desconhecido (BR-SES-02).

### SessionLease
Resultado de `acquire`: o `context` da sessão e o indicador `session_reset`. A trava da sessão é liberada ao sair do bloco.

### AskResult
`answer` (Markdown), `sources` (lista de `SourceRef`), `session_id`, `session_reset`.

## Contratos da API

| Modelo | Campos |
|---|---|
| `AskRequest` | `text` (texto), `session_id` (texto, opcional) |
| `AskResponse` | `answer`, `sources` (lista de `SourceRef`), `session_id`, `session_reset` |
| `ErrorDetail` | `code`, `message` |
| `ErrorResponse` | `error` (`ErrorDetail`) |
| `HealthResponse` | `status` |

As regras de validação do `text` e do `session_id` ficam no serviço (BR-API-01 e BR-API-02), não no modelo, para que o modelo faça round-trip de qualquer valor.

## Erros de domínio

| Erro | Código | HTTP |
|---|---|---|
| `ValidationAppError` | `VALIDATION_ERROR` | 422 |
| `KnowledgeBaseNotIndexedError` | `KB_NOT_INDEXED` | 503 |
| `UpstreamError` | `UPSTREAM_ERROR` | 502 |
| `InternalAppError` | `INTERNAL_ERROR` | 500 |

## Configuração (Settings)

| Campo | Padrão | Variável de ambiente |
|---|---|---|
| Região | `us-east-1` | `AWS_REGION` |
| Modelo de texto | `amazon.nova-pro-v1:0` | `BEDROCK_MODEL_ID` |
| Modelo de embedding | `amazon.titan-embed-text-v2:0` | `BEDROCK_EMBED_MODEL_ID` |
| Token do Bedrock (obrigatório) | sem padrão | `AWS_BEARER_TOKEN_BEDROCK` |
| Pasta da base | `anyone_kb/` na raiz | `KB_DIR` |
| Pasta do ChromaDB | `backend/chroma_store/` | `CHROMA_DIR` |
| Coleção | `anyone` | `CHROMA_COLLECTION` |
| `top_k` | 3 | `RETRIEVAL_TOP_K` |
| Limite de distância | 0.6 | `RETRIEVAL_MAX_DISTANCE` |
| Tamanho do chunk / sobreposição | 500 / 50 tokens | `CHUNK_SIZE`, `CHUNK_OVERLAP` |
| Janela de mensagens | 20 | `SESSION_WINDOW` |
| Sessões ativas | 50 | `SESSION_MAX_COUNT` |
| Tamanho máximo do texto | 2000 caracteres | `ASK_MAX_TEXT_CHARS` |
| Tempo limite de leitura do Bedrock | 60 s | `BEDROCK_READ_TIMEOUT` |
| Origens permitidas (CORS) | `http://localhost:5173` | `CORS_ORIGINS` (separadas por vírgula) |

O valor do token nunca é exibido; só o nome da variável aparece nas mensagens.
