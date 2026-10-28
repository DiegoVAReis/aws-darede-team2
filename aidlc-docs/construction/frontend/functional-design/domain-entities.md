# Entidades de Domínio: Frontend

Fontes: `frontend-functional-design-plan.md` (respostas Q1 a Q17 e regras P-01 a P-15), `component-methods.md` (tipos de `src/types.ts`) e contrato HTTP v1 (`unit-of-work-dependency.md`).

Os tipos abaixo são descritos em TypeScript apenas como notação. O design não depende de biblioteca.

## Constantes de domínio

| Constante | Valor | Origem |
|---|---|---|
| `MAX_TEXT_LENGTH` | 2000 caracteres (pontos de código Unicode, depois de aparar) | Q7, Backend BR-API-01 |
| `COUNTER_THRESHOLD` | 1800 caracteres: a partir daqui o contador "n/2000" aparece | Q7 |
| `MAX_TITLE_LENGTH` | 60 caracteres (pontos de código, depois de aparar) | Q4 |
| `AUTO_TITLE_LENGTH` | 40 caracteres, mais "…" quando cortado | Q1 |
| `DEFAULT_TITLE` | "Nova conversa" | Q1 |
| `REQUEST_TIMEOUT_MS` | 90000 | Q9 |
| `STORAGE_KEY` | `anyone-assistant:conversations` | P-02 |
| `STORAGE_VERSION` | 1 | P-02 |
| `SESSION_ID_PATTERN` | `^[A-Za-z0-9_-]{1,64}$` (regra de validação do Backend, BR-API-02) | P-01 |
| `SUGGESTED_QUESTIONS` | Lista fixa de 4 perguntas (ver abaixo) | Q14 |
| `API_BASE_URL` | `VITE_API_BASE_URL` ou `http://localhost:8000` | P-15 |

`SUGGESTED_QUESTIONS`: "Qual a garantia padrão dos tratores?", "Como funciona o crédito rural para cooperados?", "Quais seguros agrícolas estão disponíveis?" e "Quais são os primeiros passos de um novo colaborador?".

## Entidades

### SourceRef
Fonte de uma resposta. Espelha o contrato do Backend.

| Campo | Tipo | Regra |
|---|---|---|
| `file` | string | Nome do arquivo. Não vazio |
| `title` | string | Título H1 do documento. Pode ser vazio (exibe só o arquivo) |

### Message
Uma mensagem dentro de uma conversa.

| Campo | Tipo | Regra |
|---|---|---|
| `id` | string | Único dentro da conversa. Gerado no navegador (UUID) |
| `role` | `"user"` ou `"assistant"` | |
| `content` | string | Usuário: texto aparado. Assistente: Markdown devolvido em `answer`. Erro: texto fixo em português |
| `sources` | `SourceRef[]` | Só em respostas do assistente; vazia nos demais casos. Sem arquivos repetidos |
| `createdAt` | string (ISO 8601) | |
| `isError` | boolean, opcional | `true` na bolha de erro (sempre `role = "assistant"`, `sources` vazia) |
| `errorKind` | `ErrorKind`, opcional | Presente somente quando `isError = true` |
| `contextReset` | boolean, opcional | `true` quando a resposta veio com `session_reset: true`. Só em respostas do assistente que não são erro. Omitido quando falso |

Mudança em relação a `component-methods.md`: `errorKind` (para escolher o texto e o comportamento de "Tentar novamente") e `contextReset` no nível da mensagem (Q12), no lugar de `Conversation.contextReset`.

### Conversation

| Campo | Tipo | Regra |
|---|---|---|
| `id` | string | Único. UUID gerado no navegador |
| `sessionId` | string | UUID v4 gerado na criação. Casa com `SESSION_ID_PATTERN`. Único entre conversas. Nunca muda (P-01, P-10) |
| `title` | string | Aparado e não vazio. Padrão `DEFAULT_TITLE` |
| `titleIsCustom` | boolean | `true` depois que o usuário renomeia. Impede o título automático (Q1) |
| `messages` | `Message[]` | Em ordem cronológica |
| `createdAt` | string (ISO 8601) | |
| `updatedAt` | string (ISO 8601) | Atualizado a cada nova mensagem e a cada renomeação (P-04) |

Uma conversa **vazia** é a que não tem mensagens.

### ConversationsState (estado em memória)

| Campo | Tipo | Regra |
|---|---|---|
| `conversations` | `Conversation[]` | A ordem de exibição vem de `sortConversations` (P-04), não da ordem do vetor |
| `activeConversationId` | string | Sempre refere uma conversa existente (P-05, P-06) |
| `pending` | `Record<conversationId, true>` | Conversas aguardando resposta (Q8). **Nunca persistido** (P-03) |
| `storageWarning` | boolean | `true` quando a última gravação no `localStorage` falhou (Q6). Nunca persistido |

### PersistedState (formato gravado no `localStorage`)

| Campo | Tipo |
|---|---|
| `version` | number (`STORAGE_VERSION`) |
| `activeConversationId` | string |
| `conversations` | `Conversation[]` |

### AskResponse e erros da API

`AskResponse { answer: string; sources: SourceRef[]; session_id: string; session_reset: boolean }` (campos em `snake_case`, como o contrato).

`ApiErrorBody { error: { code: string; message: string } }`.

### ErrorKind
Classificação de tudo que pode dar errado em uma pergunta. Cada valor tem um texto fixo em português (Q11).

| Valor | Origem |
|---|---|
| `VALIDATION_ERROR` | Corpo da API, HTTP 422 |
| `KB_NOT_INDEXED` | Corpo da API, HTTP 503 |
| `UPSTREAM_ERROR` | Corpo da API, HTTP 502 |
| `INTERNAL_ERROR` | Corpo da API, HTTP 500, ou código desconhecido com corpo no formato de erro |
| `NETWORK` | `fetch` falhou antes de haver resposta (backend fora do ar, CORS, rede) |
| `TIMEOUT` | Passaram-se 90 s sem resposta |
| `UNEXPECTED_RESPONSE` | Resposta fora do formato esperado (corpo ilegível ou campos ausentes) |
| `NO_RESPONSE` | Conversa recuperada do armazenamento terminando em pergunta sem resposta (Q13) |

### ApiRequestError
Erro lançado pelo `ApiClient`. Campos: `kind: ErrorKind` (exceto `NO_RESPONSE`) e `status?: number`. Não carrega o `message` da API para a interface (Q11).

## Relacionamentos

- `ConversationsState` contém várias `Conversation`; exatamente uma é a ativa.
- `Conversation` contém várias `Message`, em ordem.
- `Message` (assistente) contém zero ou mais `SourceRef`.
- Cada `Conversation` corresponde a uma sessão do Backend, ligada pelo `sessionId`. O Backend guarda o contexto; o front guarda o histórico exibido.

## Invariantes

Válidas depois de qualquer ação do reducer e depois de carregar o armazenamento. São a base dos testes de propriedades.

| ID | Invariante |
|---|---|
| INV-01 | Os `id` das conversas são únicos |
| INV-02 | Os `sessionId` das conversas são únicos, casam com `SESSION_ID_PATTERN` e nunca mudam depois da criação |
| INV-03 | Sempre existe pelo menos uma conversa |
| INV-04 | `activeConversationId` refere uma conversa existente |
| INV-05 | Toda chave de `pending` refere uma conversa existente. Há no máximo uma pergunta em andamento por conversa |
| INV-06 | Todo título é aparado e não vazio. Título renomeado tem no máximo 60 caracteres. Título automático tem no máximo 40 caracteres mais "…" |
| INV-07 | Os `id` das mensagens são únicos dentro da conversa |
| INV-08 | Mensagem do usuário tem `sources` vazia e não tem `isError` nem `contextReset`. Bolha de erro é do assistente, com `errorKind`, `sources` vazia e sem `contextReset`. Resposta do assistente não repete arquivo em `sources` |
| INV-09 | A partir de um estado com no máximo uma conversa vazia, nenhuma ação cria uma segunda conversa vazia (Q2) |
